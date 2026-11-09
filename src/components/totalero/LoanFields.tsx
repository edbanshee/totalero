import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FIRST_YEAR, formatMoney, LAST_YEAR, loanTerms, parseDate, periodRate, toCents, type Frequency, type Loan, type LoanDirection } from "@/lib/engine";
import { useT } from "@/lib/i18n";

export interface LoanForm {
  direction: LoanDirection;
  institution: string;
  principal: string;
  total: string;
  payment: string;
  rate: string;
  payoff: string;
  term: string;
  frequency: Frequency;
  startDate: string;
  tagId: string;
  deposit: boolean;
}

export const emptyLoanForm = (startDate: string): LoanForm => ({
  direction: "payable", institution: "", principal: "", total: "", payment: "", rate: "", payoff: "",
  term: "12", frequency: "monthly", startDate, tagId: "", deposit: true,
});

const opt = (s: string) => (s.trim() ? Math.abs(toCents(s)) : null);

/** Turns the form into a loan plus all automatic calculations. */
export function readLoanForm(f: LoanForm) {
  const principal = Math.abs(toCents(f.principal));
  const term = Math.max(1, Math.min(600, Number(f.term) || 1));
  const rateIn = Number(f.rate.replace(",", ".")) || null;
  const terms = loanTerms({ principal, term, frequency: f.frequency, rate: rateIn, payment: opt(f.payment), total: opt(f.total), payoff: opt(f.payoff) });
  const covers = terms.payment > Math.round(principal * periodRate(terms.rate, f.frequency));
  const { y } = parseDate(f.startDate);
  const valid = !!f.institution.trim() && principal > 0 && covers && y >= FIRST_YEAR && y <= LAST_YEAR;
  const loan: Omit<Loan, "id"> = {
    institution: f.institution.trim(), principal, rate: terms.rate, term, startDate: f.startDate, frequency: f.frequency,
    payment: terms.payment, tagId: f.tagId || null, direction: f.direction, payoff: opt(f.payoff),
  };
  return { loan, terms, covers, valid, principal };
}

export function LoanFields({ f, setF, tags, showDate = true }: { f: LoanForm; setF: (f: LoanForm) => void; tags: { id: string; name: string }[]; showDate?: boolean }) {
  const t = useT();
  const fm = (c: number) => formatMoney(c, t.lang);
  const set = (k: keyof LoanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const { terms, covers, principal } = readLoanForm(f);
  const sel = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
  const rateNote = { given: t.rateGiven, total: t.rateFromTotal, payoff: t.rateFromPayoff, none: t.rateHint }[terms.rateSource];
  const per = f.frequency === "monthly" ? t.monthlyF : t.biweeklyF;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 grid grid-cols-2 gap-2">
        {([["payable", ArrowDownRight, t.payable], ["receivable", ArrowUpRight, t.receivable]] as const).map(([d, I, l]) => (
          <button type="button" key={d} onClick={() => setF({ ...f, direction: d })} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${f.direction === d ? (d === "payable" ? "border-destructive bg-destructive/10 text-destructive" : "border-positive bg-positive/10 text-positive") : "text-muted-foreground"}`}>
            <I className="h-4 w-4" />{l}
          </button>
        ))}
      </div>
      <div className="col-span-2"><Label>{t.institution}</Label><Input value={f.institution} onChange={set("institution")} /></div>
      <div><Label>{t.principal}</Label><Input inputMode="decimal" value={f.principal} onChange={set("principal")} className="font-num" /></div>
      <div><Label>{t.totalToPay}</Label><Input inputMode="decimal" value={f.total} onChange={set("total")} placeholder={principal ? formatNumPlain(terms.total) : ""} className="font-num" /></div>
      <div><Label>{t.term}</Label><Input type="number" value={f.term} onChange={set("term")} className="font-num tabular-nums" /></div>
      <div><Label>{t.frequency}</Label>
        <select className={sel} value={f.frequency} onChange={set("frequency")}>
          <option value="monthly">{t.monthlyF}</option><option value="biweekly">{t.biweeklyF}</option>
        </select>
      </div>
      <div className="col-span-2"><Label>{t.payoffAmt}</Label><Input inputMode="decimal" value={f.payoff} onChange={set("payoff")} placeholder={principal ? formatNumPlain(terms.payoff) : ""} className="font-num" /><p className="mt-1 text-xs text-muted-foreground">{t.payoffHint}</p></div>
      <div><Label>{t.rate}</Label><Input inputMode="decimal" value={f.rate} onChange={set("rate")} placeholder={terms.rateSource === "none" ? "" : String(terms.rate)} className="font-num" /></div>
      <div><Label>{t.paymentAmt}</Label><Input inputMode="decimal" value={f.payment} onChange={set("payment")} placeholder={principal ? formatNumPlain(terms.payment) : ""} className="font-num" /></div>
      {showDate && <div><Label>{t.startDate}</Label><Input type="date" value={f.startDate} onChange={set("startDate")} min="2024-01-01" max="2050-12-31" className="font-num tabular-nums" /></div>}
      <div className={showDate ? "" : "col-span-2"}><Label>{t.tag}</Label>
        <select className={sel} value={f.tagId} onChange={set("tagId")}>
          <option value="">{t.none}</option>
          {tags.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {principal > 0 && (
        <div className="col-span-2 grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-3">
          <Stat label={`${t.calcPayment} (${per.toLowerCase()})`} value={fm(terms.payment)} />
          <Stat label={t.totalInterest} value={fm(terms.interest)} tone="neg" />
          <Stat label={t.estRate} value={`${terms.rate}%`} note={rateNote} />
          <Stat label={t.totalToPay} value={fm(terms.total)} />
          <Stat label={t.payoffNow} value={fm(terms.payoff)} />
          <Stat label={t.payoffSaving} value={fm(terms.saving)} tone="pos" />
        </div>
      )}
      <label className="col-span-2 flex items-center gap-2 text-sm"><Switch checked={f.deposit} onCheckedChange={(v) => setF({ ...f, deposit: v })} />{f.direction === "receivable" ? t.depositR : t.deposit}</label>
      {!covers && principal > 0 && <p className="col-span-2 text-sm text-destructive">{t.notCovering}</p>}
    </div>
  );
}

const formatNumPlain = (c: number) => (c / 100).toFixed(2);

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-md bg-card p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-num text-base font-medium tabular-nums ${tone === "pos" ? "text-positive" : tone === "neg" ? "text-destructive" : ""}`}>{value}</div>
      {note && <div className="text-[10px] text-muted-foreground">{note}</div>}
    </div>
  );
}
