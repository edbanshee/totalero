import { describe, it, expect } from "vitest";
import { emptyLoanForm, readLoanForm } from "@/components/totalero/LoanFields";
import { computeAll, type Tx } from "./engine";

describe("principal inferred from installment, payment and payoff", () => {
  it("Coppel: cuota 4 of 12, payment 6262, payoff 46611", () => {
    const r = readLoanForm({ ...emptyLoanForm("2026-11-01"), institution: "Coppel", principal: "", total: "56168", payment: "6262", term: "12", current: "4", payoff: "46611" });
    expect(r.inferred).toBe(true);
    expect(r.valid).toBe(true);
    expect(r.principal).toBeGreaterThan(4661100);
    expect(r.principal).toBeLessThan(6262 * 12 * 100);
  });
});

describe("carried balance counts in real totals", () => {
  it("next month's real opening equals last month's projected closing", () => {
    const tx: Tx = { id: "a", date: "2026-10-05", concept: "x", tagId: null, type: "income", projected: 100000, real: null, debt: 0, done: false, enabled: true, kind: "simple", seriesId: null };
    const m = computeAll([tx], 0).get("2026-11")!;
    expect(m.openingReal).toBe(100000);
    expect(m.closingReal).toBe(100000);
  });
});
