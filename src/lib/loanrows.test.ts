import { describe, it, expect } from "vitest";
import { loanRowBalances, type Loan, type Tx } from "./engine";
const loan: Loan = { id: "L", institution: "B", principal: 300000, rate: 0, term: 3, startDate: "2026-01-10", frequency: "monthly", payment: 0, tagId: null };
const tx = (id: string, date: string, extra: Partial<Tx> = {}): Tx => ({ id, date, concept: id, tagId: null, type: "expense", projected: 100000, real: null, debt: 0, done: false, enabled: true, kind: "loan", seriesId: "L", loanId: "L", capital: 100000, installment: 1, ...extra });
describe("loanRowBalances", () => {
  it("deuda/restante por cuota", () => {
    const m = loanRowBalances([tx("a", "2026-01-10"), tx("b", "2026-02-10"), tx("c", "2026-03-10")], [loan]);
    expect(m.get("b")).toEqual({ debt: 200000, left: 100000 });
    expect(m.get("c")!.left).toBe(0);
  });
  it("recalcula al borrar o deshabilitar una cuota", () => {
    const m = loanRowBalances([tx("a", "2026-01-10", { enabled: false }), tx("c", "2026-03-10")], [loan]);
    expect(m.get("c")).toEqual({ debt: 300000, left: 200000 });
  });
});

describe("deuda incluye intereses", () => {
  it("12 cuotas de 6,262: la cuota 1 debe 75,144 y la cuota 4 debe 56,358", () => {
    const l: Loan = { ...loan, principal: 5543351, term: 12 };
    const rows = Array.from({ length: 12 }, (_, i) => tx(`i${i}`, `2026-${String(i + 1).padStart(2, "0")}-10`, { projected: 626200, capital: 400000, installment: i + 1 }));
    const m = loanRowBalances(rows, [l]);
    expect(m.get("i0")!.debt).toBe(7514400);
    expect(m.get("i3")!.debt).toBe(5635800);
    expect(m.get("i11")!.left).toBe(0);
  });
});
