import { describe, it, expect } from "vitest";
import { computeAll, toCents, addMonths, quincenaOf, type Tx } from "./engine";

const tx = (p: Partial<Tx>): Tx => ({
  id: Math.random().toString(36), date: "2026-10-01", concept: "x", category: "", tagId: null,
  type: "expense", projected: 0, real: null, debt: 0, done: false, enabled: true, kind: "simple", seriesId: null, ...p,
});

describe("engine", () => {
  it("parses amounts to cents", () => {
    expect(toCents("1,234.56")).toBe(123456);
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("0.1")).toBe(10);
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
