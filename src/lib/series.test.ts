import { describe, expect, it, beforeEach } from "vitest";
import { addTx, getState, setState, updateSeries } from "./store";

const base = { date: "2026-01-10", concept: "Renta", tagId: null, type: "expense" as const, projected: 1000, real: null, debt: 0, done: false, enabled: true, lineId: null, capital: null, cardId: null };
describe("updateSeries", () => {
  beforeEach(() => { setState(() => ({ txs: [] })); addTx({ ...base, recurring: true, months: 5 }); });
  const mid = () => getState().txs.sort((a, b) => a.date.localeCompare(b.date))[2]!;
  it("forward edits this and later, not earlier", () => {
    updateSeries(mid()!.id, { projected: 2000, date: "2026-03-20" }, "forward");
    const l = getState().txs.sort((a, b) => a.date.localeCompare(b.date));
    expect(l.map((x) => x.projected)).toEqual([1000, 1000, 2000, 2000, 2000]);
    expect(l[4]!.date).toBe("2026-05-20");
  });
  it("backward edits this and earlier", () => {
    updateSeries(mid()!.id, { projected: 500 }, "backward");
    expect(getState().txs.sort((a, b) => a.date.localeCompare(b.date)).map((x) => x.projected)).toEqual([500, 500, 500, 1000, 1000]);
  });
  it("done status stays on the edited one", () => {
    updateSeries(mid()!.id, { done: true, real: 900 }, "all");
    expect(getState().txs.filter((x) => x.done).length).toBe(1);
  });
});
