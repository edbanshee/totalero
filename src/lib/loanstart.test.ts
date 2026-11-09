import { describe, it, expect } from "vitest";
import { emptyLoanForm, readLoanForm } from "@/components/totalero/LoanFields";
describe("loan from an intermediate installment", () => {
  it("installment 3 on 2026-03-10 puts installment 1 on 2026-01-10", () => {
    const r = readLoanForm({ ...emptyLoanForm("2026-03-10"), institution: "B", principal: "12000", term: "12", current: "3" });
    expect(r.loan.startDate).toBe("2026-01-10");
  });
});
