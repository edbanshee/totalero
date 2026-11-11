import { describe, expect, it } from "vitest";
import { computeAll, reorderInDay, type Tx } from "./engine";
const tx = (id: string, type: "income" | "expense", projected: number, sortOrder: number | null = null): Tx => ({ id, date: "2026-11-30", concept: id, tagId: null, type, projected, real: null, debt: 0, done: false, enabled: true, kind: "single", seriesId: null, sortOrder } as Tx);
describe("orden dentro del día", () => {
  it("el sueldo entra antes que los pagos del mismo día", () => {
    const rows = computeAll([tx("a", "expense", 500), tx("z", "income", 1000)], 0).get("2026-11")!.rows;
    expect(rows.map((r) => r.tx.id)).toEqual(["z", "a"]);
    expect(rows[0]!.balance).toBe(1000);
  });
  it("subir un pago lo pone antes del sueldo", () => {
    const txs = [tx("a", "expense", 500), tx("z", "income", 1000)];
    const m = reorderInDay(txs, "a", -1)!;
    const moved = txs.map((t) => ({ ...t, sortOrder: m.get(t.id) ?? null }));
    expect(computeAll(moved, 0).get("2026-11")!.rows.map((r) => r.tx.id)).toEqual(["a", "z"]);
    expect(reorderInDay(moved, "a", -1)).toBeNull();
  });
});
