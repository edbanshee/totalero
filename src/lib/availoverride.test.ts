import { describe, expect, it } from "vitest";
import { computeCredit, type CreditLine, type Tx } from "./engine";

const tx = (p: Partial<Tx>): Tx => ({ id: Math.random().toString(), date: "2026-01-05", concept: "x", type: "expense", projected: 0, real: null, done: false, enabled: true, tagId: null, ...p } as Tx);

describe("manual available override", () => {
  it("anchors that month and later months keep cascading from it", () => {
    const line: CreditLine = { id: "C", name: "L", limits: [{ from: "2026-01", limit: 100000 }], availOverrides: { "2026-01": 71000 } };
    const txs = [tx({ lineId: "C", type: "income", projected: 28282, date: "2026-01-05" }), tx({ lineId: "C", type: "expense", projected: 15000, date: "2026-02-05" })];
    const c = computeCredit(txs, [], [line], "2026-12");
    expect(c.get("2026-01")!.lineAvailable).toBe(71000);
    expect(c.get("2026-02")!.lineAvailable).toBe(86000);
  });
});
