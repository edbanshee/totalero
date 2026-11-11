import { describe, expect, it } from "vitest";
import { amortize, periodDate, type Loan } from "./engine";
import { emptyLoanForm, readLoanForm } from "@/components/totalero/LoanFields";
import { addLoan, getState, updateLoan } from "./store";

const example: Omit<Loan, "id"> = {
  institution: "Didi Prestamo 3", principal: 70000, rate: 208.26,
  term: 4, startDate: "2026-11-30", frequency: "biweekly",
  payment: 21454, tagId: null,
};
const dates = ["2026-11-30", "2026-12-15", "2026-12-30", "2027-01-15"];

describe("semi-monthly loan dates", () => {
  it("schedules the four Didi installments starting November 30 without duplicates", () => {
    expect(amortize({ ...example, id: "D" }).map((r) => r.date)).toEqual(dates);
  });
  it("keeps the 15/30 anchors across February", () => {
    expect(Array.from({ length: 5 }, (_, i) => periodDate("2027-01-30", "biweekly", i)))
      .toEqual(["2027-01-30", "2027-02-15", "2027-02-28", "2027-03-15", "2027-03-30"]);
  });
  it("clamps the second February payment in leap years", () => {
    expect(periodDate("2028-02-15", "biweekly", 1)).toBe("2028-02-29");
  });
  it("preserves other pairs of payment days when starting in the second half", () => {
    expect(Array.from({ length: 4 }, (_, i) => periodDate("2026-11-25", "biweekly", i)))
      .toEqual(["2026-11-25", "2026-12-10", "2026-12-25", "2027-01-10"]);
  });
  it("derives installment one consistently from an intermediate installment", () => {
    const result = readLoanForm({ ...emptyLoanForm("2027-01-15"), institution: "Didi",
      principal: "700", total: "858.14", term: "4", current: "4", frequency: "biweekly", totalMode: "contract" });
    expect(result.loan.startDate).toBe("2026-11-30");
    expect(periodDate(result.loan.startDate, "biweekly", 3)).toBe("2027-01-15");
  });
  it("stores the correct dates when creating and editing the example loan", () => {
    const id = addLoan(example, false);
    const storedDates = () => getState().txs.filter((t) => t.loanId === id && t.installment != null)
      .sort((a, b) => (a.installment ?? 0) - (b.installment ?? 0)).map((t) => t.date);
    expect(storedDates()).toEqual(dates);
    updateLoan(id, example);
    expect(storedDates()).toEqual(dates);
  });
});