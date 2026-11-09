import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HandCoins, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CloudUpload, CornerDownRight, Eye, EyeOff, LayoutGrid, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2, Wallet, BadgeDollarSign, CircleDollarSign, Check } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Logo, TopIcons } from "@/components/totalero/common";
import { Num } from "@/components/totalero/Num";
import { TxDialog } from "@/components/totalero/TxDialog";
import { LinesSection, LoansSection } from "@/components/totalero/Credits";
import { DeleteDialog, TagsDialog } from "@/components/totalero/Dialogs";
import { CardsSection } from "@/components/totalero/Cards";
import { BackupDialog, HistoryDialog } from "@/components/totalero/Backup";
import { computeAll, computeCredit, loanRowBalances, type CreditMonth, daysInMonth, FIRST_YEAR, formatMoney, formatNum, LAST_YEAR, tagTotals, type Tag, makeDate, monthKey, parseDate, quincenaOf, type Half, type Tx } from "@/lib/engine";
import { duplicateTx, moveNextMonth, moveOtherHalf, setState, updateTx, useApp, useLoaded } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Totalero — Flujo mensual" },
      { name: "description", content: "Tu flujo de caja quincenal, saldos y proyecciones." },
      { property: "og:title", content: "Totalero — Flujo mensual" },
      { property: "og:description", content: "Tu flujo de caja quincenal, saldos y proyecciones." },
    ],
  }),
  component: AppPage,
});

type Filter = "all" | "pending" | "income" | "expense" | "recurring" | "loan";

function AppPage() {
  const s = useApp();
  const loaded = useLoaded();
  const t = useT();
  const nav = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(Math.min(Math.max(now.getFullYear(), FIRST_YEAR), LAST_YEAR));
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<"monthly" | "annual">("monthly");
  const [horizon, setHorizon] = useState<0 | 1 | 2>(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ open: boolean; tx: Tx | null }>({ open: false, tx: null });
  const [del, setDel] = useState<Tx | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const all = useMemo(() => computeAll(s.txs, s.initialBalance), [s.txs, s.initialBalance]);
  const todayKey = monthKey(now.getFullYear(), now.getMonth());
  const loanBal = useMemo(() => loanRowBalances(s.txs, s.loans), [s.txs, s.loans]);
  const credit = useMemo(() => computeCredit(s.txs, s.loans, s.lines, todayKey), [s.txs, s.loans, s.lines, todayKey]);
  const key = monthKey(year, month);
  const cm = credit.get(key)!;
  const mr = all.get(key)!;
  const prevName = (t.months[(month + 11) % 12] ?? "").toLowerCase();
  const tagMap = new Map(s.tags.map((g) => [g.id, g]));

  useEffect(() => {
    if (loaded && !s.session) nav({ to: "/" });
  }, [loaded, s.session, nav]);

  const rows = mr.rows.filter(({ tx }) => {
    if (horizon && quincenaOf(tx.date) !== horizon) return false;
    if (filter === "pending" && tx.done) return false;
    if (filter === "income" && tx.type !== "income") return false;
    if (filter === "expense" && tx.type !== "expense") return false;
    if (filter === "recurring" && tx.kind !== "recurring") return false;
    if (filter === "loan" && tx.kind !== "loan" && !tx.lineId) return false;
    if (q && !(tx.concept.toLowerCase().includes(q.toLowerCase()) || formatNum(tx.projected, "en").includes(q))) return false;
    return true;
  });
  const counts = {
    all: mr.rows.length,
    pending: mr.rows.filter((r) => !r.tx.done).length,
    income: mr.rows.filter((r) => r.tx.type === "income").length,
    expense: mr.rows.filter((r) => r.tx.type === "expense").length,
    recurring: mr.rows.filter((r) => r.tx.kind === "recurring").length,
    loan: mr.rows.filter((r) => r.tx.kind === "loan" || !!r.tx.lineId).length,
  };
  const done = mr.rows.length - counts.pending;
  const lastDay = daysInMonth(year, month);
  const ms = t.monthsShort[month];
  const lineAvail = cm.lineAvailable;
  const fm = (c: number) => formatMoney(c, t.lang);
  const fn = (c: number) => formatNum(c, t.lang);

  const go = (d: number) => {
    let m = month + d, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    if (y < FIRST_YEAR || y > LAST_YEAR) return;
    setYear(y); setMonth(m);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="truncate text-2xl font-semibold">Totalero</span>
        </div>
        <div className="flex items-center gap-2">
          <TopIcons />
          <button aria-label="Cloud" className="grid h-8 w-8 place-items-center rounded-md text-primary hover:bg-accent" onClick={() => toast(t.googleSoon)}>
            <CloudUpload className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-2 flex items-center gap-2 border-l pl-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{(s.userName ?? t.guestUser)[0]}</div>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-medium">{s.userName ?? t.guestUser}</div>
                <div className="text-[10px] text-primary">{t.local}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-primary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTagsOpen(true)}>{t.tags}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBackupOpen(true)}>{t.backup}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHistoryOpen(true)}>{t.history}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setState(() => ({ session: null })); nav({ to: "/" }); }}>{t.logout}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Toolbar */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-3 border-b bg-card px-4 py-3 sm:px-7 md:grid-cols-[1fr_auto_1fr]">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 w-28 rounded-md border bg-card px-3 font-num text-sm">
          {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i).map((y) => <option key={y}>{y}</option>)}
        </select>
        <div className="flex justify-self-end rounded-md bg-muted p-1 md:justify-self-center">
          {([["monthly", LayoutGrid, t.monthly], ["annual", BarChart3, t.annual]] as const).map(([v, I, l]) => (
            <button key={v} onClick={() => setView(v)} className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${view === v ? "bg-card font-medium shadow-sm" : "text-subtle"}`}>
              <I className={`h-4 w-4 ${view === v ? "text-primary" : ""}`} />{l}
            </button>
          ))}
        </div>
      </div>

      {/* Months */}
      <nav className="flex items-center gap-1 border-b bg-card px-3 sm:px-7">
        <button aria-label="prev" onClick={() => go(-1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ChevronLeft className="h-4 w-4" /></button>
        <div className="flex flex-1 overflow-x-auto">
          {t.months.map((name, i) => {
            const has = (all.get(monthKey(year, i))?.count ?? 0) > 0;
            const active = i === month;
            return (
              <button key={name} onClick={() => setMonth(i)} className={`relative min-w-24 flex-1 py-3 text-sm ${active ? "border-b-2 border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {name}
                {has && <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-positive" />}
              </button>
            );
          })}
        </div>
        <button aria-label="next" onClick={() => go(1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ChevronRight className="h-4 w-4" /></button>
      </nav>

      <main className="space-y-4 px-4 py-5 sm:px-7">
        {view === "annual" ? (
          <Annual all={all} credit={credit} year={year} txs={s.txs} tags={s.tags} onPick={(m) => { setMonth(m); setView("monthly"); }} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-medium"><Num>{t.lang === "es" ? `${t.months[month]} de ${year}` : `${t.months[month]} ${year}`}</Num></h2>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-subtle sm:inline">{t.horizon}</span>
                <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value) as 0 | 1 | 2)} className="h-9 rounded-md border bg-card px-3 text-sm">
                  <option value={0}>{t.fullMonth}</option><option value={1}>{t.q1Only}</option><option value={2}>{t.q2Only}</option>
                </select>
                <button onClick={() => setEdit({ open: true, tx: null })} className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Plus className="h-4 w-4" />{t.newTx}
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi icon={<Wallet className="h-5 w-5 text-primary" />} label={t.kCurrent} value={fm(mr.closingReal)} sub={t.kCurrentSub} tone={mr.closingReal < 0 ? "neg" : "pos"} />
              <Kpi icon={<CalendarDays className="h-5 w-5 text-primary" />} label={t.kEnd} value={fm(mr.closing)} sub={t.kEndSub} tone={mr.closing < 0 ? "neg" : "pos"} />
              <Kpi icon={<CircleDollarSign className="h-5 w-5 text-positive" />} label={t.kPlus} value={fm(mr.closingReal + lineAvail)} sub={t.kPlusSub} />
              <Kpi icon={<HandCoins className="h-5 w-5 text-positive" />} label={t.kLine} value={fm(lineAvail)} sub={t.kLineSub} />
              <Kpi icon={<BadgeDollarSign className="h-5 w-5 text-destructive" />} label={t.kDebt} value={fm(mr.debt + cm.loanDebt + cm.lineUsed)} tone="neg" />
            </div>

            {/* Halves */}
            <div className="grid gap-3 lg:grid-cols-2">
              <HalfCard title={`${t.half1} · 01–15 ${ms}`} h={mr.q1} fn={fn} />
              <HalfCard title={`${t.half2} · 16–${lastDay} ${ms}`} h={mr.q2} fn={fn} />
            </div>

            {/* Table */}
            <section className="rounded-lg border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold">{t.cashflow}</h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"><Num>{`${mr.rows.length} ${t.movements}`}</Num></span>
                  <span className="text-xs text-muted-foreground"><Num>{`${done} ${t.reconciled} · ${counts.pending} ${t.pending}`}</Num></span>
                </div>
                <div className="flex gap-2">
                  <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-40 bg-transparent outline-none placeholder:text-muted-foreground" />
                  </label>
                  <button onClick={() => setTagsOpen(true)} className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" />{t.tags}</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
                {([["all", t.all, "bg-accent text-accent-foreground"], ["pending", t.pendingF, "bg-muted text-muted-foreground"], ["income", t.incomeF, "bg-positive/10 text-positive"], ["expense", t.expenseF, "bg-destructive/10 text-destructive"], ["recurring", t.recurringF, "bg-primary/10 text-accent-foreground"], ["loan", t.loansF, "bg-success/10 text-success"]] as const).map(([k, l, c]) => (
                  <button key={k} onClick={() => setFilter(k)} className={`rounded px-2 py-1 ${c} ${filter === k ? "ring-1 ring-current" : ""}`}><Num>{`${l} · ${counts[k]}`}</Num></button>
                ))}
                <span className="text-muted-foreground">{t.sortedDay} ↑</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="border-y bg-muted/60 text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">{t.done}</th>
                      <th className="px-2 text-left font-medium">{t.day}</th>
                      <th className="px-2 text-left font-medium">{t.tag}</th>
                      <th className="px-2 text-left font-medium">{t.concept}</th>
                      <th className="px-2 text-right font-medium">{t.projected}</th>
                      <th className="px-2 text-right font-medium">{t.real}</th>
                      <th className="px-2 text-right font-medium">{t.debt}</th>
                      <th className="px-2 text-right font-medium">{t.remaining}</th>
                      <th className="px-2 text-right font-medium">{t.balance}</th>
                      <th className="px-4 text-right font-medium">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="font-num text-[13px] tabular-nums">
                    <tr className="border-b bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground"><CornerDownRight className="h-4 w-4" /></td>
                      <td className="px-2 text-muted-foreground">—</td>
                      <td className="px-2 font-sans text-xs text-muted-foreground">{t.initial}</td>
                      <td className="px-2 font-sans font-medium">{t.carried} {prevName}</td>
                      <td className="px-2 text-right">{fn(mr.opening)}</td>
                      <td className="px-2 text-right">{fn(mr.openingReal)}</td>
                      <td className="px-2 text-right text-muted-foreground">—</td>
                      <td className="px-2 text-right text-muted-foreground">—</td>
                      <td className="px-2 text-right font-medium">{fn(mr.opening)}</td>
                      <td />
                    </tr>
                    {rows.length === 0 && (
                      <tr><td colSpan={10} className="py-10 text-center font-sans text-muted-foreground">{t.empty}</td></tr>
                    )}
                    {rows.map(({ tx, balance, remaining }) => {
                      const tag = tx.tagId ? tagMap.get(tx.tagId) : null;
                      const sign = tx.type === "income" ? 1 : -1;
                      const lb = loanBal.get(tx.id);
                      return (
                        <tr key={tx.id} className={`border-b transition ${tx.enabled ? "" : "opacity-40"}`}>
                          <td className="px-4 py-2.5">
                            <button aria-label={t.done} onClick={() => updateTx(tx.id, !tx.done && tx.real === null ? { done: true, real: tx.projected } : { done: !tx.done })} className={`grid h-4 w-4 place-items-center rounded border ${tx.done ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                              {tx.done && <Check className="h-3 w-3" strokeWidth={3} />}
                            </button>
                          </td>
                          <td className="px-2 text-muted-foreground">{String(parseDate(tx.date).d).padStart(2, "0")}</td>
                          <td className="px-2">
                            {tag && <span className="rounded px-2 py-0.5 font-sans text-xs" style={{ color: tag.color, backgroundColor: `color-mix(in oklab, ${tag.color} 14%, transparent)` }}>{tag.name}</span>}
                          </td>
                          <td className="px-2 font-sans">
                            <div className={`font-medium ${tx.enabled ? "" : "line-through"}`}><Num>{tx.concept}</Num></div>
                          </td>
                          <td className={`px-2 text-right ${sign > 0 ? "text-positive" : ""}`}>{fn(sign * tx.projected)}</td>
                          <td className={`px-2 text-right ${sign > 0 ? "text-positive" : ""}`}>{tx.done && tx.real !== null ? fn(sign * tx.real) : tx.done ? fn(sign * tx.projected) : "—"}</td>
                          <td className="px-2 text-right text-destructive">{lb ? fn(lb.debt) : tx.debt ? fn(tx.debt) : "—"}</td>
                          <td className={`px-2 text-right ${lb ? "text-destructive" : tx.real !== null && remaining !== 0 ? (remaining > 0 ? "text-positive" : "text-destructive") : "text-muted-foreground"}`}>{lb ? fn(lb.left) : tx.real !== null ? fn(remaining) : "—"}</td>
                          <td className={`px-2 text-right font-medium ${balance < 0 ? "text-destructive" : ""}`}>{fn(balance)}</td>
                          <td className="px-4">
                            <div className="flex items-center justify-end gap-1 text-muted-foreground">
                              <button aria-label={tx.enabled ? t.disable : t.enable} title={tx.enabled ? t.disable : t.enable} onClick={() => updateTx(tx.id, { enabled: !tx.enabled })} className={`rounded p-1 hover:bg-muted ${tx.enabled ? "text-primary" : ""}`}>
                                {tx.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                              <button aria-label={t.edit} onClick={() => setEdit({ open: true, tx })} className="rounded p-1 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                              <button aria-label={t.del} onClick={() => setDel(tx)} className="rounded p-1 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                              <DropdownMenu>
                                <DropdownMenuTrigger aria-label="more" className="rounded p-1 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEdit({ open: true, tx })}>{t.edit}</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateTx(tx.id)}>{t.duplicate}</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => moveOtherHalf(tx.id)}>{t.otherHalf}</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => moveNextMonth(tx.id)}>{t.nextMonth}</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDel(tx)}>{t.del}</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <CardsSection year={year} month={month} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <LoansSection defaultDate={makeDate(year, month, 15)} />
              <LinesSection cm={cm} monthLabel={`${t.months[month]} ${year}`} />
            </div>
          </>
        )}
      </main>

      <TxDialog open={edit.open} tx={edit.tx} onOpenChange={(o) => setEdit({ open: o, tx: o ? edit.tx : null })} defaultDate={makeDate(year, month, year === now.getFullYear() && month === now.getMonth() ? now.getDate() : 1)} />
      <DeleteDialog tx={del} onClose={() => setDel(null)} />
      <TagsDialog open={tagsOpen} onOpenChange={setTagsOpen} />
      <BackupDialog open={backupOpen} onOpenChange={setBackupOpen} monthKey={key} monthLabel={`${t.months[month]} ${year}`} />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-5 py-5">
      <div className="flex items-center gap-2 text-sm">{icon}{label}</div>
      <div className={`mt-3 truncate font-num text-2xl font-medium tabular-nums ${tone === "pos" ? "text-positive" : tone === "neg" ? "text-destructive" : ""}`}>{value}</div>
      {sub && <div className="mt-2 text-[11px] text-subtle">{sub}</div>}
    </div>
  );
}

function HalfCard({ title, h, fn }: { title: string; h: Half; fn: (c: number) => string }) {
  const t = useT();
  const ok = h.closing >= 0 && h.margin >= 0;
  return (
    <div className="rounded-lg border bg-card px-4 py-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium"><Num>{title}</Num></h4>
        <span className={`rounded px-2 py-0.5 text-xs ${ok ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive"}`}>{ok ? t.solvent : t.deficit}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[[t.income, h.income, "text-positive"], [t.expense, h.expense, ""], [t.margin, h.margin, h.margin < 0 ? "text-destructive" : "text-positive"], [t.closing, h.closing, h.closing < 0 ? "text-destructive" : ""]].map(([l, v, c]) => (
          <div key={l as string}>
            <div className="text-[11px] text-muted-foreground">{l}</div>
            <div className={`mt-1 font-num text-base tabular-nums ${c}`}>{(l === t.margin && (v as number) > 0 ? "+" : "") + fn(v as number)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Annual({ all, credit, year, txs, tags, onPick }: { all: ReturnType<typeof computeAll>; credit: Map<string, CreditMonth>; year: number; txs: Tx[]; tags: Tag[]; onPick: (m: number) => void }) {
  const t = useT();
  const fn = (c: number) => formatNum(c, t.lang);
  const fm = (c: number) => formatMoney(c, t.lang);
  const months = t.months.map((_, i) => all.get(monthKey(year, i))!);
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));
  const inc = months.reduce((a, m) => a + m.income, 0);
  const exp = months.reduce((a, m) => a + m.expense, 0);
  const end = months[11]!.closing;
  const byTag = tagTotals(txs, year);
  const tagMap = new Map(tags.map((g) => [g.id, g]));
  const closings = months.map((m) => m.closing);
  const lo = Math.min(0, ...closings), hi = Math.max(1, ...closings);
  const pt = (v: number, i: number) => `${(i / 11) * 100},${100 - ((v - lo) / (hi - lo || 1)) * 100}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<CircleDollarSign className="h-4 w-4 text-positive" />} label={t.yearIncome} value={fm(inc)} tone="pos" />
        <Kpi icon={<Wallet className="h-4 w-4 text-destructive" />} label={t.yearExpense} value={fm(exp)} />
        <Kpi icon={<BadgeDollarSign className="h-4 w-4 text-primary" />} label={t.yearSavings} value={fm(inc - exp)} tone={inc - exp < 0 ? "neg" : "pos"} />
        <Kpi icon={<CalendarDays className="h-4 w-4 text-primary" />} label={t.yearEnd} value={fm(end)} {...(end < 0 ? { tone: "neg" as const } : {})} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{t.balanceTrend}</h3>
          <svg viewBox="-2 -4 104 108" preserveAspectRatio="none" className="h-40 w-full">
            {lo < 0 && <line x1="0" x2="100" y1={100 - ((0 - lo) / (hi - lo)) * 100} y2={100 - ((0 - lo) / (hi - lo)) * 100} className="stroke-border" strokeWidth="0.5" strokeDasharray="2 2" />}
            <polyline points={closings.map(pt).join(" ")} fill="none" className="stroke-primary" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            {closings.map((v, i) => { const [x, y] = pt(v, i).split(","); return <circle key={i} cx={x} cy={y} r="1.6" className={v < 0 ? "fill-destructive" : "fill-primary"} />; })}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">{t.monthsShort.map((m) => <span key={m}>{m}</span>)}</div>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{t.byTag}</h3>
          {byTag.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t.empty}</p> : (
            <ul className="space-y-2 text-sm">
              {byTag.map((r) => {
                const g = r.tagId ? tagMap.get(r.tagId) : null;
                return (
                  <li key={r.tagId ?? "none"}>
                    <div className="flex justify-between gap-2">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" style={g ? { backgroundColor: g.color } : undefined} />{g?.name ?? t.noTag}</span>
                      <span className="font-num tabular-nums">{r.income > 0 && <span className="mr-3 text-positive">+{fn(r.income)}</span>}{r.expense > 0 && <span>−{fn(r.expense)}</span>}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-destructive/70" style={{ width: `${exp ? (r.expense / exp) * 100 : 0}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <section className="rounded-lg border bg-card p-4">
        <div className="flex h-48 items-end gap-2">
          {months.map((m, i) => (
            <button key={m.key} onClick={() => onPick(i)} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-40 w-full items-end justify-center gap-0.5">
                <div className="w-1/3 rounded-t bg-positive" style={{ height: `${(m.income / max) * 100}%` }} />
                <div className="w-1/3 rounded-t bg-destructive" style={{ height: `${(m.expense / max) * 100}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground">{t.monthsShort[i]}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/60 text-[11px] uppercase text-muted-foreground">
            <tr>{[t.month, t.openingCol, t.income, t.expense, t.savings, t.finalProj, t.debt].map((h, i) => <th key={h} className={`px-4 py-2 font-medium ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="font-num text-[13px] tabular-nums">
            {months.map((m, i) => (
              <tr key={m.key} onClick={() => onPick(i)} className="cursor-pointer border-b hover:bg-muted/40">
                <td className="px-4 py-2.5 font-sans">{t.months[i]}</td>
                <td className="px-4 text-right">{fn(m.opening)}</td>
                <td className="px-4 text-right text-positive">{fn(m.income)}</td>
                <td className="px-4 text-right">{fn(m.expense)}</td>
                <td className={`px-4 text-right ${m.income - m.expense < 0 ? "text-destructive" : "text-positive"}`}>{fn(m.income - m.expense)}</td>
                <td className={`px-4 text-right font-medium ${m.closing < 0 ? "text-destructive" : ""}`}>{fn(m.closing)}</td>
                <td className="px-4 text-right text-destructive">{fn(m.debt + (credit.get(m.key)?.loanDebt ?? 0) + (credit.get(m.key)?.lineUsed ?? 0))}</td>
              </tr>
            ))}
            <tr className="bg-muted/40 font-medium">
              <td className="px-4 py-2.5 font-sans">{t.total}</td>
              <td className="px-4 text-right">{fn(months[0]!.opening)}</td>
              <td className="px-4 text-right text-positive">{fn(inc)}</td>
              <td className="px-4 text-right">{fn(exp)}</td>
              <td className={`px-4 text-right ${inc - exp < 0 ? "text-destructive" : "text-positive"}`}>{fn(inc - exp)}</td>
              <td className={`px-4 text-right ${end < 0 ? "text-destructive" : ""}`}>{fn(end)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
