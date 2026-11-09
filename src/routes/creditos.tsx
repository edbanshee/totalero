import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Landmark, Plus, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Logo, TopIcons } from "@/components/totalero/common";
import { Num } from "@/components/totalero/Num";
import { annuity, computeCredit, FIRST_YEAR, formatMoney, formatNum, LAST_YEAR, monthKey, parseDate, periodRate, simulateExtra, toCents, type Frequency, type Loan } from "@/lib/engine";
import { addLine, addLoan, applyExtra, deleteLine, deleteLoan, setLineLimit, useApp, useLoaded } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/creditos")({
  head: () => ({
    meta: [
      { title: "Totalero — Préstamos y líneas de crédito" },
      { name: "description", content: "Tablas de amortización, simulador de pagos extraordinarios y saldo mensual de tus líneas de crédito." },
      { property: "og:title", content: "Totalero — Préstamos y líneas de crédito" },
      { property: "og:description", content: "Amortización, pagos extraordinarios y crédito disponible por mes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  const s = useApp();
  const loaded = useLoaded();
  const t = useT();
  const nav = useNavigate();
  const [tab, setTab] = useState<"loans" | "lines">("loans");
  useEffect(() => {
    if (loaded && !s.session) nav({ to: "/" });
  }, [loaded, s.session, nav]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="truncate text-2xl font-semibold">Totalero</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app" className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
          <TopIcons />
        </div>
      </header>
      <div className="flex justify-center border-b bg-card px-4 py-3">
        <div className="flex rounded-md bg-muted p-1">
          {([["loans", Landmark, t.loansTab], ["lines", WalletCards, t.linesTab]] as const).map(([v, I, l]) => (
            <button key={v} onClick={() => setTab(v)} className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${tab === v ? "bg-card font-medium shadow-sm" : "text-subtle"}`}>
              <I className={`h-4 w-4 ${tab === v ? "text-primary" : ""}`} />{l}
            </button>
          ))}
        </div>
      </div>
      <main className="space-y-4 px-4 py-5 sm:px-7">{tab === "loans" ? <Loans /> : <Lines />}</main>
    </div>
  );
}

/* ---------------- Loans ---------------- */
function Loans() {
  const s = useApp();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const loan = s.loans.find((l) => l.id === sel) ?? s.loans[0] ?? null;
  const fm = (c: number) => formatMoney(c, t.lang);

  const paidOf = (l: Loan) => s.txs.filter((x) => x.loanId === l.id && x.type === "expense" && x.done && x.enabled).reduce((a, x) => a + (x.capital ?? 0), 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">{t.loansTab}</h2>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.newLoan}</Button>
      </div>
      {s.loans.length === 0 ? (
        <p className="rounded-lg border bg-card p-10 text-center text-muted-foreground">{t.noLoans}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.loans.map((l) => {
            const pending = s.txs.filter((x) => x.loanId === l.id && x.installment != null && !x.done).length;
            return (
              <button key={l.id} onClick={() => setSel(l.id)} className={`rounded-lg border bg-card p-4 text-left ${loan?.id === l.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{l.institution}</span>
                  <span className="font-num text-xs text-muted-foreground tabular-nums">{l.rate}%</span>
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">{t.pendingBal}</div>
                <div className="font-num text-xl font-medium text-destructive tabular-nums">{fm(Math.max(0, l.principal - paidOf(l)))}</div>
                <div className="mt-1 text-xs text-muted-foreground"><Num>{`${fm(l.principal)} · ${pending} ${t.paymentsLeft}`}</Num></div>
              </button>
            );
          })}
        </div>
      )}
      {loan && <LoanDetail key={loan.id} loan={loan} />}
      <LoanDialog open={open} onOpenChange={setOpen} onCreated={setSel} />
    </>
  );
}

function LoanDetail({ loan }: { loan: Loan }) {
  const s = useApp();
  const t = useT();
  const fn = (c: number) => formatNum(c, t.lang);
  const fm = (c: number) => formatMoney(c, t.lang);
  const [extra, setExtra] = useState("");
  const [at, setAt] = useState("1");

  const inst = s.txs.filter((x) => x.loanId === loan.id && x.type === "expense").sort((a, b) => (a.date < b.date ? -1 : 1));
  let bal = loan.principal;
  const rows = inst.map((x) => {
    const capital = x.capital ?? 0;
    bal -= capital;
    return { x, capital, interest: Math.max(0, x.projected - capital), balance: Math.max(0, bal) };
  });

  const amt = Math.abs(toCents(extra));
  const idx = Math.max(0, Math.min(loan.term - 1, (Number(at) || 1) - 1));
  const sim = useMemo(() => simulateExtra(loan, amt > 0 ? { [idx]: amt } : {}), [loan, amt, idx]);
  const extraDate = sim.base[idx]?.date;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="font-semibold">{t.amort} · {loan.institution}</h3>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => window.confirm(t.deleteLoanConfirm) && deleteLoan(loan.id)}><Trash2 className="h-4 w-4" />{t.deleteLoan}</Button>
        </div>
        <div className="mt-3 max-h-[560px] overflow-auto">
          <table className="w-full min-w-[640px] text-sm">
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
                  <td className="px-3 text-right text-destructive">{fn(balance)}</td>
                  <td className="px-3 text-right font-sans text-xs">{x.done ? "✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="h-fit space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">{t.simulator}</h3>
        <p className="text-xs text-muted-foreground">{t.vsOriginal}</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{t.extraAmt}</Label><Input inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} className="font-num" /></div>
          <div><Label>{t.atInstallment}</Label><Input type="number" min={1} max={loan.term} value={at} onChange={(e) => setAt(e.target.value)} className="font-num tabular-nums" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {([[t.monthsSaved, <Num key="m">{String(Math.round(sim.monthsSaved * 10) / 10)}</Num>], [t.interestSaved, fm(sim.interestSaved)], [t.newPayoff, sim.payoff], [t.newBalance, fm(sim.newBalance)]] as const).map(([l, v]) => (
            <div key={l} className="rounded-md bg-muted/60 p-3">
              <div className="text-[11px] text-muted-foreground">{l}</div>
              <div className="mt-1 font-num text-lg font-medium tabular-nums text-positive">{v}</div>
            </div>
          ))}
        </div>
        <Button className="w-full" disabled={!amt || !extraDate} onClick={() => { applyExtra(loan.id, extraDate!, amt); setExtra(""); toast.success(t.extraApplied); }}>{t.applyExtra}</Button>
      </section>
    </div>
  );
}

function LoanDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const t = useT();
  const { tags } = useApp();
  const today = new Date();
  const empty = { institution: "", principal: "", rate: "", term: "12", startDate: `${today.getFullYear()}-${String(today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2).padStart(2, "0")}-01`, frequency: "monthly" as Frequency, payment: "", tagId: "", deposit: true };
  const [f, setF] = useState(empty);
  useEffect(() => { if (open) setF(empty); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const P = Math.abs(toCents(f.principal));
  const n = Math.max(1, Math.min(600, Number(f.term) || 1));
  const rate = Number(f.rate.replace(",", ".")) || 0;
  const auto = annuity(P, periodRate(rate, f.frequency), n);
  const pay = f.payment.trim() ? Math.abs(toCents(f.payment)) : 0;
  const covers = (pay || auto) > Math.round(P * periodRate(rate, f.frequency));
  const sel = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
  const { y } = parseDate(f.startDate);
  const valid = f.institution.trim() && P > 0 && covers && y >= FIRST_YEAR && y <= LAST_YEAR;

  const save = () => {
    if (!valid) return;
    const id = addLoan({ institution: f.institution.trim(), principal: P, rate, term: n, startDate: f.startDate, frequency: f.frequency, payment: pay, tagId: f.tagId || null }, f.deposit);
    onCreated(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t.newLoan}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>{t.institution}</Label><Input value={f.institution} onChange={set("institution")} /></div>
          <div><Label>{t.principal}</Label><Input inputMode="decimal" value={f.principal} onChange={set("principal")} className="font-num" /></div>
          <div><Label>{t.rate}</Label><Input inputMode="decimal" value={f.rate} onChange={set("rate")} className="font-num" /></div>
          <div><Label>{t.term}</Label><Input type="number" value={f.term} onChange={set("term")} className="font-num tabular-nums" /></div>
          <div><Label>{t.frequency}</Label>
            <select className={sel} value={f.frequency} onChange={set("frequency")}>
              <option value="monthly">{t.monthlyF}</option><option value="biweekly">{t.biweeklyF}</option>
            </select>
          </div>
          <div><Label>{t.startDate}</Label><Input type="date" value={f.startDate} onChange={set("startDate")} min="2024-01-01" max="2050-12-31" className="font-num tabular-nums" /></div>
          <div><Label>{t.paymentAmt}</Label><Input inputMode="decimal" value={f.payment} onChange={set("payment")} placeholder={`${t.auto}: ${formatNum(auto, "en")}`} className="font-num" /></div>
          <div className="col-span-2"><Label>{t.tag}</Label>
            <select className={sel} value={f.tagId} onChange={set("tagId")}>
              <option value="">{t.none}</option>
              {tags.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm"><Switch checked={f.deposit} onCheckedChange={(v) => setF({ ...f, deposit: v })} />{t.deposit}</label>
          {!covers && P > 0 && <p className="col-span-2 text-sm text-destructive">{t.notCovering}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button disabled={!valid} onClick={save}>{t.create}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Credit lines ---------------- */
function Lines() {
  const s = useApp();
  const t = useT();
  const now = new Date();
  const [year, setYear] = useState(Math.min(Math.max(now.getFullYear(), FIRST_YEAR), LAST_YEAR));
  const [dlg, setDlg] = useState<null | { lineId: string | null }>(null);
  const todayKey = monthKey(now.getFullYear(), now.getMonth());
  const credit = useMemo(() => computeCredit(s.txs, s.loans, s.lines, todayKey), [s.txs, s.loans, s.lines, todayKey]);
  const fn = (c: number) => formatNum(c, t.lang);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium">{t.linesTab}</h2>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 w-28 rounded-md border bg-card px-3 font-num text-sm">
            {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i).map((y) => <option key={y}>{y}</option>)}
          </select>
          <Button onClick={() => setDlg({ lineId: null })}><Plus className="h-4 w-4" />{t.newLine}</Button>
        </div>
      </div>
      {s.lines.length === 0 && <p className="rounded-lg border bg-card p-10 text-center text-muted-foreground">{t.noLines}</p>}
      {s.lines.map((line) => (
        <section key={line.id} className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
            <h3 className="font-semibold">{line.name} <span className="ml-2 text-xs font-normal text-muted-foreground">{t.lineMonthly}</span></h3>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setDlg({ lineId: line.id })}>{t.changeLimit}</Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteLine(line.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-y bg-muted/60 text-[11px] uppercase text-muted-foreground">
                <tr>{[t.month, t.limit, t.drawn, t.paidCap, t.used, t.available].map((h, i) => <th key={h} className={`px-4 py-2 font-medium ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="font-num text-[13px] tabular-nums">
                {t.months.map((name, m) => {
                  const lm = credit.get(monthKey(year, m))?.lines.find((x) => x.id === line.id);
                  return (
                    <tr key={name} className="border-b">
                      <td className="px-4 py-2 font-sans">{name}</td>
                      {lm ? (
                        <>
                          <td className="px-4 text-right">{fn(lm.limit)}</td>
                          <td className="px-4 text-right">{lm.drawn ? fn(lm.drawn) : "—"}</td>
                          <td className="px-4 text-right text-positive">{lm.paid ? fn(lm.paid) : "—"}</td>
                          <td className="px-4 text-right text-destructive">{fn(lm.used)}</td>
                          <td className="px-4 text-right font-medium text-positive">{fn(lm.available)}</td>
                        </>
                      ) : <td colSpan={5} className="px-4 text-right text-muted-foreground">—</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <LineDialog state={dlg} onClose={() => setDlg(null)} />
    </>
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
