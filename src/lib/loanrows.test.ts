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
