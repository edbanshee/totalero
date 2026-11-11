import { describe, it, expect } from "vitest";
import { computeAll, toCents, addMonths, quincenaOf, type Tx } from "./engine";

const tx = (p: Partial<Tx>): Tx => ({
  id: Math.random().toString(36), date: "2026-10-01", concept: "x", tagId: null,
  type: "expense", projected: 0, real: null, debt: 0, done: false, enabled: true, kind: "simple", seriesId: null, ...p,
});

describe("engine", () => {
  it("parses amounts to cents", () => {
    expect(toCents("1,234.56")).toBe(123456);
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("0.1")).toBe(10);
  });
  it("stores no category on a movement; the tag is the classification", () => {
    const t = tx({ tagId: "t-hogar" });
    expect(t).not.toHaveProperty("category");
    expect(t.tagId).toBe("t-hogar");
  });
  it("splits quincenas at day 15/16", () => {
    expect(quincenaOf("2026-10-15")).toBe(1);
    expect(quincenaOf("2026-10-16")).toBe(2);
  });
  it("clamps leap-year dates when moving months", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
  });
  it("cascades closing into next month opening", () => {
    const r = computeAll([tx({ type: "income", projected: 300000, date: "2026-09-05" })], 0);
    expect(r.get("2026-10")!.opening).toBe(300000);
  });
  it("disabled movements are excluded from all balances", () => {
    const r = computeAll([tx({ projected: 50000, enabled: false })], 100000);
    expect(r.get("2026-10")!.closing).toBe(100000);
    expect(r.get("2026-11")!.opening).toBe(100000);
  });
  it("real balance only counts completed movements", () => {
    const r = computeAll([tx({ type: "income", projected: 100000 }), tx({ projected: 20000, real: 25000, done: true })], 0);
    const m = r.get("2026-10")!;
    expect(m.closingReal).toBe(-25000);
    expect(m.closing).toBe(75000);
  });
});

import { amortize, annuity, computeCredit, simulateExtra, type Loan, type CreditLine } from "./engine";

const loan: Loan = { id: "L", institution: "Banco", principal: 1000000, rate: 12, term: 12, startDate: "2026-01-15", frequency: "monthly", payment: 0, tagId: null };

describe("loans", () => {
  it("French payment: $10,000 at 12% over 12 months is $888.49", () => {
    expect(annuity(1000000, 0.01, 12)).toBe(88849);
  });
  it("amortization repays exactly the principal", () => {
    const rows = amortize(loan);
    expect(rows).toHaveLength(12);
    expect(rows.reduce((a, r) => a + r.capital, 0)).toBe(1000000);
    expect(rows.at(-1)!.balance).toBe(0);
  });
  it("extra payment saves months and interest", () => {
    const r = simulateExtra(loan, { 0: 500000 });
    expect(r.monthsSaved).toBeGreaterThan(0);
    expect(r.interestSaved).toBeGreaterThan(0);
  });
  it("loan debt drops only by capital of completed installments", () => {
    const inst = tx({ loanId: "L", date: "2026-01-15", projected: 88849, capital: 78849, done: true, installment: 1, kind: "loan" });
    const c = computeCredit([inst], [loan], [], "2026-12");
    expect(c.get("2026-01")!.loanDebt).toBe(1000000 - 78849);
  });
});

describe("credit lines", () => {
  const line: CreditLine = { id: "C", name: "Personal", limits: [{ from: "2026-01", limit: 1000000 }] };
  it("each month keeps its own available balance (10k line, 8k drawn, 2k paid per month)", () => {
    const txs = [
      tx({ lineId: "C", type: "income", projected: 800000, date: "2026-01-05" }),
      tx({ lineId: "C", type: "expense", projected: 200000, date: "2026-02-05" }),
      tx({ lineId: "C", type: "expense", projected: 200000, date: "2026-03-05" }),
    ];
    const c = computeCredit(txs, [], [line], "2026-12");
    expect(c.get("2026-01")!.lineAvailable).toBe(200000);
    expect(c.get("2026-02")!.lineAvailable).toBe(400000);
    expect(c.get("2026-03")!.lineAvailable).toBe(600000);
  });
  it("disabled draws do not use credit", () => {
    const c = computeCredit([tx({ lineId: "C", type: "income", projected: 800000, date: "2026-01-05", enabled: false })], [], [line], "2026-12");
    expect(c.get("2026-01")!.lineAvailable).toBe(1000000);
  });
});

import { loanTerms } from "./engine";
describe("automatic loan terms", () => {
  it("15,000 paid as 18,000 in 12 months: 1,500 installment and rate solved from the total", () => {
    const r = loanTerms({ principal: 1500000, term: 12, frequency: "monthly", total: 1800000, payoff: 1550000 });
    expect(r.payment).toBe(150000);
    expect(r.rateSource).toBe("total");
    expect(r.rate).toBeCloseTo(35.07, 1);
    expect(r.saving).toBe(250000);
  });
  it("without total or rate, the payoff amount implies the rate (15,500 on 15,000 = 40% annual)", () => {
    const r = loanTerms({ principal: 1500000, term: 12, frequency: "monthly", payoff: 1550000 });
    expect(r.rateSource).toBe("payoff");
    expect(r.rate).toBeCloseTo(40, 1);
  });
  it("receivable loans count as owed to me, not as my debt", () => {
    const rec = { ...loan, id: "R", direction: "receivable" as const };
    const c = computeCredit([], [rec], [], "2026-12");
    expect(c.get("2026-03")!.loanDebt).toBe(0);
    expect(c.get("2026-03")!.loanReceivable).toBe(1000000);
  });
});

describe("revolving loans", () => {
  const rl: Loan = { id: "B", institution: "BanCoppel", principal: 2500000, rate: 0, term: 10, startDate: "2026-12-10", frequency: "monthly", payment: 0, tagId: null, revolving: true };
  it("capital repaid in December (2,300) becomes available that month and can be drawn again", () => {
    const pay = tx({ loanId: "B", date: "2026-12-10", projected: 250000, capital: 230000, done: true, installment: 1, kind: "loan" });
    const draw = tx({ lineId: "B", type: "income", projected: 100000, date: "2027-01-05" });
    const c = computeCredit([pay, draw], [rl], [], "2026-12");
    expect(c.get("2026-12")!.lineAvailable).toBe(230000);
    expect(c.get("2027-01")!.lineAvailable).toBe(130000);
  });
});

import { maxPeriods as mp } from "./engine";
describe("recurring calendar limits", () => {
  it("monthly from Nov 2026 fits 290 months until Dec 2050", () => expect(mp("2026-11-10", "monthly")).toBe(290));
  it("yearly from 2026 fits 25 years until 2050", () => expect(mp("2026-11-10", "yearly")).toBe(25));
});
