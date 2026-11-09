import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { addMonths, FIRST_YEAR, formatMoney, inferPrincipal, LAST_YEAR, loanTerms, parseDate, periodRate, toCents, type Frequency, type Loan, type LoanDirection } from "@/lib/engine";
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
  current: string;
  deposit: boolean;
  /** Whether "total" is the full contract or what is left from the current installment. */
  totalMode?: "contract" | "remaining";
}

export const emptyLoanForm = (startDate: string): LoanForm => ({
  direction: "payable", institution: "", principal: "", total: "", payment: "", rate: "", payoff: "",
  term: "12", frequency: "monthly", startDate, tagId: "", current: "1", deposit: true,
});

const opt = (s: string) => (s.trim() ? Math.abs(toCents(s)) : null);

/** Turns the form into a loan plus all automatic calculations. */
export function readLoanForm(f: LoanForm) {
  const term = Math.max(1, Math.min(600, Number(f.term) || 1));
  const current = Math.max(1, Math.min(term, Number(f.current) || 1));
  let principal = f.principal.trim() ? Math.abs(toCents(f.principal)) : 0;
  let rateIn = Number(f.rate.replace(",", ".")) || null;
  const rem = term - current + 1;
  // "Remaining" mode: the typed total covers installments current..term; convert to the contract total.
  const remaining = (f.totalMode ?? "remaining") === "remaining" && current > 1;
  const typed = opt(f.total);
  let total = typed && remaining ? Math.round((typed / rem) * term) : typed;
  let inferred = false;
  if (!principal) {
    const pay = opt(f.payment) ?? (total ? Math.round(total / term) : 0);
    const inf = inferPrincipal({ payment: pay, term, current, payoff: opt(f.payoff) ?? 0, frequency: f.frequency });
    if (inf) { principal = inf.principal; rateIn = rateIn ?? inf.rate; inferred = true; total = pay * term; }
  }
  const terms = loanTerms({ principal, term, frequency: f.frequency, rate: rateIn, payment: opt(f.payment) ?? (inferred && total ? Math.round(total / term) : null), total, payoff: inferred ? null : opt(f.payoff) });
  if (inferred) { terms.payoff = opt(f.payoff)!; terms.saving = Math.max(0, terms.payment * (term - current + 1) - terms.payoff); terms.rateSource = "payoff"; }
  const covers = terms.payment > Math.round(principal * periodRate(terms.rate, f.frequency));
  const startDate = firstPaymentDate(f.startDate, f.frequency, current - 1);
  const { y } = parseDate(startDate);
  const valid = !!f.institution.trim() && principal > 0 && covers && y >= FIRST_YEAR && y <= LAST_YEAR;
  const loan: Omit<Loan, "id"> = {
    institution: f.institution.trim(), principal, rate: terms.rate, term, startDate, frequency: f.frequency,
    payment: terms.payment, tagId: f.tagId || null, direction: f.direction, payoff: opt(f.payoff),
  };
  return { loan, terms, covers, valid, principal, current, inferred };
}

export function LoanFields({ f, setF, tags, showDate = true }: { f: LoanForm; setF: (f: LoanForm) => void; tags: { id: string; name: string }[]; showDate?: boolean }) {
  const t = useT();
  const fm = (c: number) => formatMoney(c, t.lang);
  const set = (k: keyof LoanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const { terms, covers, principal, current, inferred } = readLoanForm(f);
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
      <div><Label>{t.principal}</Label><Input inputMode="decimal" value={f.principal} onChange={set("principal")} placeholder={inferred ? formatNumPlain(principal) : ""} className="font-num" /></div>
      <div>
        {current > 1 ? (
          <div className="mb-1 grid grid-cols-2 gap-1 rounded-md bg-muted p-0.5 text-[11px]">
            {(["contract", "remaining"] as const).map((m) => (
              <button type="button" key={m} onClick={() => setF({ ...f, totalMode: m })} className={`rounded px-1.5 py-1 font-medium ${(f.totalMode ?? "remaining") === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                {m === "contract" ? t.totalContract : t.totalRemaining}
              </button>
            ))}
          </div>
        ) : <Label>{t.totalToPay}</Label>}
        <Input inputMode="decimal" value={f.total} onChange={set("total")} placeholder={principal ? formatNumPlain(current > 1 && (f.totalMode ?? "remaining") === "remaining" ? Math.round(terms.total / (Number(f.term) || 1) * ((Number(f.term) || 1) - current + 1)) : terms.total) : ""} className="font-num" />
      </div>
      <div><Label>{t.term}</Label><Input type="number" value={f.term} onChange={set("term")} className="font-num tabular-nums" /></div>
      <div><Label>{t.currentInst}</Label><Input type="number" min={1} value={f.current} onChange={set("current")} className="font-num tabular-nums" /></div>
      <div><Label>{t.frequency}</Label>
        <select className={sel} value={f.frequency} onChange={set("frequency")}>
          <option value="monthly">{t.monthlyF}</option><option value="biweekly">{t.biweeklyF}</option>
        </select>
      </div>
      <div className="col-span-2"><Label>{t.payoffAmt}</Label><Input inputMode="decimal" value={f.payoff} onChange={set("payoff")} placeholder={principal ? formatNumPlain(terms.payoff) : ""} className="font-num" /><p className="mt-1 text-xs text-muted-foreground">{t.payoffHint}</p></div>
      <div><Label>{t.rate}</Label><Input inputMode="decimal" value={f.rate} onChange={set("rate")} placeholder={terms.rateSource === "none" ? "" : String(terms.rate)} className="font-num" /></div>
      <div><Label>{t.paymentAmt}</Label><Input inputMode="decimal" value={f.payment} onChange={set("payment")} placeholder={principal ? formatNumPlain(terms.payment) : ""} className="font-num" /></div>
      {current > 1 && <p className="col-span-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground"><span className="font-num">{t.fromInstallment(current, Number(f.term) || current)}</span></p>}
      {showDate && <div><Label>{current > 1 ? t.currentInstDate : t.startDate}</Label><Input type="date" value={f.startDate} onChange={set("startDate")} min="2024-01-01" max="2050-12-31" className="font-num tabular-nums" /></div>}
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

/** Date of installment 1 when `date` is the date of installment k+1 (earlier ones get projected). */
export function firstPaymentDate(date: string, f: Frequency, k: number) {
  if (k <= 0) return date;
  if (f === "monthly") return addMonths(date, -k);
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 15 * k);
  return d.toISOString().slice(0, 10);
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
