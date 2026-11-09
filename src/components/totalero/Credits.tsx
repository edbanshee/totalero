import { useEffect, useMemo, useState } from "react";
import { Landmark, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Num } from "@/components/totalero/Num";
import { emptyLoanForm, LoanFields, readLoanForm } from "@/components/totalero/LoanFields";
import { formatMoney, formatNum, installmentType, monthKey, periodRate, simulateExtra, toCents, type CreditMonth, type Loan } from "@/lib/engine";
import { addLine, addLoan, applyExtra, updateLoan, deleteLine, deleteLoan, setLineLimit, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";

/* ---------------- Loans ---------------- */
export function LoansSection({ defaultDate }: { defaultDate: string }) {
  const s = useApp();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const loan = s.loans.find((l) => l.id === sel) ?? s.loans[0] ?? null;
  const fm = (c: number) => formatMoney(c, t.lang);
  const paidOf = (l: Loan) => s.txs.filter((x) => x.loanId === l.id && x.type === installmentType(l) && x.done && x.enabled).reduce((a, x) => a + (x.capital ?? 0), 0);

  return (
    <section className="min-w-0 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Landmark className="h-5 w-5" /></div>
          <h3 className="text-base font-semibold">{t.loansTab}</h3>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.newLoan}</Button>
      </div>
      {s.loans.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{t.noLoans}</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {s.loans.map((l) => {
            const rec = l.direction === "receivable";
            const pending = s.txs.filter((x) => x.loanId === l.id && x.installment != null && !x.done).length;
            return (
              <button key={l.id} onClick={() => setSel(l.id)} className={`rounded-lg border p-4 text-left ${loan?.id === l.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{l.institution}</span>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] ${rec ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive"}`}>{rec ? t.receivableShort : t.payableShort}</span>
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">{t.pendingBal}</div>
                <div className={`font-num text-xl font-medium tabular-nums ${rec ? "text-positive" : "text-destructive"}`}>{fm(Math.max(0, l.principal - paidOf(l)))}</div>
                <div className="mt-1 text-xs text-muted-foreground"><Num>{`${fm(l.principal)} · ${l.rate}% · ${pending} ${t.paymentsLeft}`}</Num></div>
              </button>
            );
          })}
        </div>
      )}
      {loan && <LoanDetail key={loan.id} loan={loan} />}
      <LoanDialog open={open} onOpenChange={setOpen} onCreated={setSel} defaultDate={defaultDate} />
    </section>
  );
}

function LoanDetail({ loan }: { loan: Loan }) {
  const s = useApp();
  const t = useT();
  const fn = (c: number) => formatNum(c, t.lang);
  const fm = (c: number) => formatMoney(c, t.lang);
  const [extra, setExtra] = useState("");
  const [at, setAt] = useState("1");
  const [editing, setEditing] = useState(false);
  const ty = installmentType(loan);

  const inst = s.txs.filter((x) => x.loanId === loan.id && x.type === ty).sort((a, b) => (a.date < b.date ? -1 : 1));
  let bal = loan.principal;
  const rows = inst.map((x) => {
    const capital = x.capital ?? 0;
    const before = bal;
    bal -= capital;
    return { x, capital, before, interest: Math.max(0, x.projected - capital), balance: Math.max(0, bal) };
  });
  const next = rows.find((r) => !r.x.done && r.x.enabled);
  const r = periodRate(loan.rate, loan.frequency);
  const payoffNow = next ? (next.x.installment === 1 && loan.payoff ? loan.payoff : next.before + Math.round(next.before * r)) : 0;
  const leftToPay = rows.filter((x) => !x.x.done && x.x.enabled).reduce((a, x) => a + x.x.projected, 0);

  const amt = Math.abs(toCents(extra));
  const idx = Math.max(0, Math.min(loan.term - 1, (Number(at) || 1) - 1));
  const sim = useMemo(() => simulateExtra(loan, amt > 0 ? { [idx]: amt } : {}), [loan, amt, idx]);
  const extraDate = sim.base[idx]?.date;

  return (
    <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-lg border">
        <div className="flex items-center justify-between px-4 pt-3">
          <h4 className="font-semibold">{t.amort} · {loan.institution}</h4>
          <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />{t.editLoan}</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => window.confirm(t.deleteLoanConfirm) && deleteLoan(loan.id)}><Trash2 className="h-4 w-4" />{t.deleteLoan}</Button>
          </div>
        </div>
        <LoanDialog open={editing} onOpenChange={setEditing} onCreated={() => {}} defaultDate={loan.startDate} edit={loan} />
        <div className="mt-2 max-h-[420px] overflow-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="sticky top-0 border-y bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>{[t.installmentN, t.date, t.capital, t.interest, t.totalPay, t.balanceLeft, t.done].map((h, i) => <th key={h} className={`px-3 py-2 font-medium ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="font-num text-[13px] tabular-nums">
              {rows.map(({ x, capital, interest, balance }) => (
                <tr key={x.id} className={`border-b ${x.enabled ? "" : "opacity-40"}`}>
                  <td className="px-3 py-2">{x.installment ?? <span className="font-sans text-xs text-primary">{t.extraAmt}</span>}</td>
                  <td className="px-3">{x.date}</td>
                  <td className="px-3 text-right">{fn(capital)}</td>
                  <td className="px-3 text-right text-muted-foreground">{fn(interest)}</td>
                  <td className="px-3 text-right font-medium">{fn(x.projected)}</td>
                  <td className={`px-3 text-right ${ty === "income" ? "text-positive" : "text-destructive"}`}>{fn(balance)}</td>
                  <td className="px-3 text-right font-sans text-xs">{x.done ? "✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-fit space-y-3">
        {next && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
              <div className="text-[11px] text-muted-foreground"><Num>{`${t.payoffNow} ${next.x.installment ?? ""}`}</Num></div>
              <div className="font-num text-lg font-medium tabular-nums">{fm(payoffNow)}</div>
            </div>
            <div className="rounded-md border border-positive/40 bg-positive/5 p-3">
              <div className="text-[11px] text-muted-foreground">{t.payoffSaving}</div>
              <div className="font-num text-lg font-medium tabular-nums text-positive">{fm(Math.max(0, leftToPay - payoffNow))}</div>
            </div>
          </div>
        )}
        <div className="space-y-3 rounded-lg border p-4">
          <h4 className="font-semibold">{t.simulator}</h4>
          <p className="text-xs text-muted-foreground">{t.vsOriginal}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t.extraAmt}</Label><Input inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} className="font-num" /></div>
            <div><Label>{t.atInstallment}</Label><Input type="number" min={1} max={loan.term} value={at} onChange={(e) => setAt(e.target.value)} className="font-num tabular-nums" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([[t.monthsSaved, <Num key="m">{String(Math.round(sim.monthsSaved * 10) / 10)}</Num>], [t.interestSaved, fm(sim.interestSaved)], [t.newPayoff, sim.payoff], [t.newBalance, fm(sim.newBalance)]] as const).map(([l, v]) => (
              <div key={l} className="rounded-md bg-muted/60 p-2.5">
                <div className="text-[11px] text-muted-foreground">{l}</div>
                <div className="mt-0.5 font-num text-base font-medium tabular-nums text-positive">{v}</div>
              </div>
            ))}
          </div>
          <Button className="w-full" disabled={!amt || !extraDate} onClick={() => { applyExtra(loan.id, extraDate!, amt); setExtra(""); toast.success(t.extraApplied); }}>{t.applyExtra}</Button>
        </div>
      </div>
    </div>
  );
}

const loanToForm = (l: Loan) => ({
  ...emptyLoanForm(l.startDate), direction: l.direction ?? "payable", institution: l.institution, principal: (l.principal / 100).toFixed(2),
  payment: l.payment ? (l.payment / 100).toFixed(2) : "", rate: String(l.rate), payoff: l.payoff ? (l.payoff / 100).toFixed(2) : "",
  term: String(l.term), frequency: l.frequency, tagId: l.tagId ?? "", deposit: false,
});

function LoanDialog({ open, onOpenChange, onCreated, defaultDate, edit }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void; defaultDate: string; edit?: Loan }) {
  const t = useT();
  const { tags } = useApp();
  const [f, setF] = useState(emptyLoanForm(defaultDate));
  useEffect(() => { if (open) setF(edit ? loanToForm(edit) : emptyLoanForm(defaultDate)); }, [open, defaultDate, edit]);
  const { loan, valid } = readLoanForm(f);
  const save = () => {
    if (!valid) return;
    if (edit) updateLoan(edit.id, loan);
    else onCreated(addLoan(loan, f.deposit));
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{edit ? t.editLoan : t.newLoan}</DialogTitle></DialogHeader>
        <LoanFields f={f} setF={setF} tags={tags} showDeposit={!edit} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button disabled={!valid} onClick={save}>{edit ? t.save : t.create}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Credit lines ---------------- */
export function LinesSection({ cm, monthLabel }: { cm: CreditMonth; monthLabel: string }) {
  const s = useApp();
  const t = useT();
  const [dlg, setDlg] = useState<null | { lineId: string | null }>(null);
  const fm = (c: number) => formatMoney(c, t.lang);
  const fn = (c: number) => formatNum(c, t.lang);

  return (
    <section className="h-fit rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><WalletCards className="h-5 w-5" /></div>
          <div>
            <h3 className="text-base font-semibold">{t.linesTab}</h3>
            <div className="text-xs text-muted-foreground"><Num>{monthLabel}</Num></div>
          </div>
        </div>
        <Button size="sm" onClick={() => setDlg({ lineId: null })}><Plus className="h-4 w-4" />{t.newLine}</Button>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
        <span className="text-sm font-medium">{t.totalAvail}</span>
        <span className="font-num text-xl font-semibold tabular-nums text-positive">{fm(cm.lineAvailable)}</span>
      </div>
      {s.lines.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t.noLines}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="border-b text-[11px] uppercase text-muted-foreground">
            <tr>{[t.lineName, t.used, t.available, ""].map((h, i) => <th key={i} className={`py-2 font-medium ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {s.lines.map((line) => {
              const lm = cm.lines.find((x) => x.id === line.id);
              return (
                <tr key={line.id} className="border-b">
                  <td className="py-2.5 pr-2">
                    <button className="text-left font-medium hover:underline" onClick={() => setDlg({ lineId: line.id })} title={t.changeLimit}>{line.name}</button>
                    {lm && <div className="font-num text-[11px] text-muted-foreground tabular-nums">{t.limit}: {fn(lm.limit)}</div>}
                  </td>
                  <td className="text-right font-num tabular-nums text-destructive">{lm ? fn(lm.used) : "—"}</td>
                  <td className="text-right font-num font-medium tabular-nums text-positive">{lm ? fn(lm.available) : "—"}</td>
                  <td className="w-8 text-right">
                    <button aria-label={t.deleteLine} onClick={() => deleteLine(line.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <LineDialog state={dlg} onClose={() => setDlg(null)} />
    </section>
  );
}

function LineDialog({ state, onClose }: { state: null | { lineId: string | null }; onClose: () => void }) {
  const t = useT();
  const { lines } = useApp();
  const now = new Date();
  const line = state?.lineId ? lines.find((l) => l.id === state.lineId) : null;
  const [f, setF] = useState({ name: "", limit: "", from: monthKey(now.getFullYear(), now.getMonth()) });
  useEffect(() => { if (state) setF({ name: line?.name ?? "", limit: "", from: monthKey(now.getFullYear(), now.getMonth()) }); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const lim = Math.abs(toCents(f.limit));
  const save = () => {
    if (!lim || !/^\d{4}-\d{2}$/.test(f.from)) return;
    if (line) setLineLimit(line.id, f.from, lim);
    else if (f.name.trim()) addLine(f.name.trim(), lim, f.from);
    else return;
    onClose();
  };
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{line ? `${t.changeLimit} · ${line.name}` : t.newLine}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          {!line && <div><Label>{t.lineName}</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>}
          <div><Label>{t.limit}</Label><Input inputMode="decimal" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} className="font-num" /></div>
          <div><Label>{t.fromMonth}</Label><Input type="month" min="2024-01" max="2050-12" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="font-num tabular-nums" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button onClick={save}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
