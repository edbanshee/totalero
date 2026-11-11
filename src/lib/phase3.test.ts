import { describe, it, expect } from "vitest";
import { cardMonth, tagTotals, validateBackup, type Tx } from "./engine";
const tx = (p: Partial<Tx>): Tx => ({ id: Math.random().toString(36), date: "2026-10-25", concept: "x", tagId: null, type: "expense", projected: 0, real: null, debt: 0, done: false, enabled: true, kind: "simple", seriesId: null, ...p });
const card = { id: "K", name: "Visa", cutDay: 5, payDay: 25 };
describe("phase 3", () => {
  it("card statement: cut 5, due 25, amount from its linked payments", () => {
    const r = cardMonth(card, [tx({ cardId: "K", projected: 120000 }), tx({ cardId: "K", projected: 30000, enabled: false })], 2026, 9);
    expect(r.pay).toBe("2026-10-25");
    expect(r.cut).toBe("2026-10-05");
    expect(r.amount).toBe(120000);
    expect(r.status).toBe("pending");
  });
  it("cut day after due day falls in the previous month", () => {
    expect(cardMonth({ ...card, cutDay: 28, payDay: 15 }, [], 2026, 0).cut).toBe("2025-12-28");
  });
  it("card limit is stored but never affects the statement amount", () => {
    const withLimit = { ...card, limit: 3500000 };
    const r = cardMonth(withLimit, [tx({ cardId: "K", projected: 120000 })], 2026, 9);
    expect(r.card.limit).toBe(3500000);
    expect(r.amount).toBe(120000);
  });
  it("tag totals per year", () => {
    const r = tagTotals([tx({ tagId: "a", projected: 500 }), tx({ tagId: "a", type: "income", projected: 200 }), tx({ date: "2025-01-01", tagId: "a", projected: 9 })], 2026);
    expect(r[0]).toEqual({ tagId: "a", income: 200, expense: 500 });
  });
  it("rejects backups that are not Totalero", () => {
    expect(validateBackup({ txs: [], tags: [] })).toBe("notTotalero");
    expect(validateBackup({ app: "totalero", txs: [tx({ projected: 1.5 })], tags: [] })).toBe("badTx");
    expect(validateBackup({ app: "totalero", txs: [tx({})], tags: [] })).toBeNull();
  });
});
