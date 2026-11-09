import { describe, it, expect } from "vitest";
import { emptyLoanForm, readLoanForm } from "@/components/totalero/LoanFields";
describe("loan from an intermediate installment", () => {
  it("installment 3 on 2026-03-10 puts installment 1 on 2026-01-10", () => {
    const r = readLoanForm({ ...emptyLoanForm("2026-03-10"), institution: "B", principal: "12000", term: "12", current: "3" });
    expect(r.loan.startDate).toBe("2026-01-10");
  });
});

import { addLoan, updateLoan, getState } from "./store";
describe("editing a loan", () => {
  it("changing the term from 12 to 6 regenerates pending installments", () => {
    const id = addLoan({ institution: "E", principal: 600000, rate: 0, term: 12, startDate: "2026-01-10", frequency: "monthly", payment: 0, tagId: null, direction: "payable" }, false);
    const l = getState().loans.find((x) => x.id === id)!;
    updateLoan(id, { ...l, term: 6 });
    const inst = getState().txs.filter((t) => t.loanId === id && t.installment != null);
    expect(inst).toHaveLength(6);
    expect(inst[0].projected).toBe(100000);
  });
});
