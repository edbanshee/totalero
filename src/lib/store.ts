import { useSyncExternalStore } from "react";
import { addMonths, annuity, installmentType, makeDate, nextDay, parseDate, periodDate, periodRate, periodsPerMonth, schedule, type CreditCard, type CreditLine, type Loan, validateBackup, type Tag, type Tx } from "./engine";

export type Lang = "es" | "en";
export interface AppState {
  txs: Tx[];
  loans: Loan[];
  lines: CreditLine[];
  cards: CreditCard[];
  history: { at: string; msg: string }[];
  tags: Tag[];
  initialBalance: number;
  lang: Lang;
  theme: "light" | "dark";
  session: null | "guest" | "google";
  userName: string | null;
}

const KEY = "totalero:v1";
const defaults: AppState = {
  txs: [],
  loans: [],
  lines: [],
  cards: [],
  history: [],
  tags: [
    { id: "t-hogar", name: "Hogar", color: "#3FD0D9" },
    { id: "t-servicios", name: "Servicios", color: "#05AD98" },
    { id: "t-nomina", name: "Nómina", color: "#699249" },
    { id: "t-ocio", name: "Ocio", color: "#BD0404" },
  ],
  initialBalance: 0,
  lang: "es",
  theme: "light",
  session: null,
  userName: null,
};

let state: AppState = defaults;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.documentElement.lang = state.lang;
  }
  listeners.forEach((l) => l());
}

export function loadStore() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* corrupt storage: keep defaults */
  }
  emit();
}
export const isLoaded = () => loaded;

export function setState(fn: (s: AppState) => Partial<AppState>) {
  state = { ...state, ...fn(state) };
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => defaults);
}
export function useLoaded() {
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}

/** Appends an entry to the operations history (newest first, capped). */
export function log(msg: string) {
  state = { ...state, history: [{ at: new Date().toISOString(), msg }, ...state.history].slice(0, 300) };
  emit();
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------- Actions ---------- */
export type TxInput = Omit<Tx, "id" | "seriesId" | "kind"> & { recurring?: boolean; months?: number; every?: "monthly" | "yearly" };

export function addTx(input: TxInput) {
  const { recurring, months = 12, every = "monthly", ...base } = input;
  const dup = state.txs.find(
    (t) => t.date === base.date && t.concept === base.concept && t.projected === base.projected && t.type === base.type,
  );
  if (dup && !recurring) return false;
  const day = parseDate(base.date).d;
  if (recurring) {
    const seriesId = uid();
    const list: Tx[] = Array.from({ length: months }, (_, i) => ({
      ...base,
      id: uid(),
      date: addMonths(base.date, every === "yearly" ? i * 12 : i, day),
      done: i === 0 ? base.done : false,
      real: i === 0 ? base.real : null,
      kind: "recurring" as const,
      seriesId,
    })).filter((t) => t.date <= "2050-12-31");
    setState((s) => ({ txs: [...s.txs, ...list] }));
    log(`Alta recurrente: ${base.concept} (${list.length})`);
  } else {
    setState((s) => ({ txs: [...s.txs, { ...base, id: uid(), kind: "simple", seriesId: null }] }));
    log(`Alta: ${base.concept}`);
  }
  return true;
}

export function updateTx(id: string, patch: Partial<Tx>) {
  const t = state.txs.find((x) => x.id === id);
  setState((s) => ({ txs: s.txs.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  if (t) log(`Edición: ${t.concept}${"done" in patch ? (patch.done ? " · hecho" : " · pendiente") : "enabled" in patch ? (patch.enabled ? " · habilitado" : " · deshabilitado") : ""}`);
}

export const duplicateTx = (id: string) =>
  setState((s) => {
    const t = s.txs.find((x) => x.id === id);
    if (!t) return {};
    return { txs: [...s.txs, { ...t, id: uid(), kind: "simple", seriesId: null, done: false, real: null, concept: t.concept + " (copia)" }] };
  });

export function moveOtherHalf(id: string) {
  const t = state.txs.find((x) => x.id === id);
  if (!t) return;
  const { y, m, d } = parseDate(t.date);
  updateTx(id, { date: makeDate(y, m, d <= 15 ? 16 : 1) });
}
export function moveNextMonth(id: string) {
  const t = state.txs.find((x) => x.id === id);
  if (t) updateTx(id, { date: addMonths(t.date, 1) });
}

export type DeleteMode = "one" | "forward" | "series";
export function deleteTx(id: string, mode: DeleteMode = "one") {
  const t = state.txs.find((x) => x.id === id);
  if (!t) return;
  setState((s) => ({
    txs: s.txs.filter((x) => {
      if (mode === "one" || !t.seriesId) return x.id !== id;
      if (x.seriesId !== t.seriesId) return true;
      if (mode === "forward") return x.date < t.date;
      return false;
    }),
  }));
  log(`Borrado: ${t.concept}${mode === "one" ? "" : mode === "forward" ? " (en adelante)" : " (serie)"}`);
}

export const saveTags = (tags: Tag[]) => setState(() => ({ tags }));

/* ---------- Loans ---------- */
const isInst = (t: Tx) => t.installment !== null && t.installment !== undefined;

/**
 * Rebuilds a loan's pending installments from `cutoff` on. History (installments before
 * the cutoff and any completed one) is never touched; pending ones are regenerated from
 * the outstanding balance. Grace capitalizes interest and spreads it over the remaining term.
 */
function rebuildLoan(loanId: string, cutoff: string, opts: { grace?: number; liquidateOn?: string } = {}) {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) return;
  const ty = installmentType(loan);
  const mine = state.txs.filter((t) => t.loanId === loanId && t.type === ty);
  const keep = mine.filter((t) => isInst(t) && (t.date < cutoff || t.done));
  const drop = new Set(mine.filter((t) => isInst(t) && !(t.date < cutoff || t.done)).map((t) => t.id));
  const paid = mine.filter((t) => keep.includes(t) || (!isInst(t) && t.enabled)).reduce((a, t) => a + (t.capital ?? 0), 0);
  let bal = loan.principal - paid;
  const r = periodRate(loan.rate, loan.frequency);
  const k = keep.length;
  const mk = (row: { n: number; date: string; payment: number; capital: number }): Tx => ({
    id: uid(), date: row.date, concept: `${loan.institution} · ${ty === "income" ? "cobro" : "cuota"} ${row.n}`, tagId: loan.tagId, type: ty,
    projected: row.payment, real: null, debt: 0, done: false, enabled: true, kind: "loan", seriesId: loanId,
    loanId, lineId: null, capital: row.capital, installment: row.n,
  });
  let fresh: Tx[] = [];
  if (bal > 0 && opts.liquidateOn) {
    const interest = Math.round(bal * r);
    fresh = [{ ...mk({ n: k + 1, date: opts.liquidateOn, payment: bal + interest, capital: bal }), concept: `${loan.institution} · liquidación total` }];
  } else if (bal > 0) {
    const grace = opts.grace ?? 0;
    let first = periodDate(loan.startDate, loan.frequency, k);
    if (first < cutoff) first = cutoff;
    if (grace > 0) {
      first = addMonths(first, grace);
      bal = Math.round(bal * Math.pow(1 + r, grace * periodsPerMonth(loan.frequency)));
    }
    const periods = Math.max(1, loan.term - k);
    const payment = grace > 0 ? 0 : loan.payment || annuity(loan.principal, r, loan.term);
    fresh = schedule({ balance: bal, rate: loan.rate, frequency: loan.frequency, periods, first, payment, startN: k })
      .filter((x) => x.date <= "2050-12-31")
      .map(mk);
  }
  setState((s) => ({ txs: [...s.txs.filter((t) => !drop.has(t.id)), ...fresh] }));
}

export function addLoan(loan: Omit<Loan, "id">, deposit: boolean) {
  const id = uid();
  const l: Loan = { ...loan, id };
  setState((s) => ({
    loans: [...s.loans, l],
    txs: deposit
      ? [...s.txs, { id: uid(), date: addMonths(l.startDate, -1), concept: `${l.institution} · ${l.direction === "receivable" ? "dinero prestado" : "depósito del préstamo"}`, tagId: l.tagId, type: installmentType(l) === "income" ? "expense" : "income", projected: l.principal, real: null, debt: 0, done: false, enabled: true, kind: "loan", seriesId: id, loanId: id, lineId: null, capital: 0, installment: null }]
      : s.txs,
  }));
  rebuildLoan(id, "0000-00-00");
  log(`Préstamo creado: ${l.institution}`);
  return id;
}

export function deleteLoan(id: string) {
  log(`Préstamo eliminado: ${state.loans.find((l) => l.id === id)?.institution ?? ""}`);
  setState((s) => ({ loans: s.loans.filter((l) => l.id !== id), txs: s.txs.filter((t) => t.loanId !== id) }));
}

/** Adds an extra capital payment and shortens the plan after it. */
export function applyExtra(loanId: string, date: string, amount: number) {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan || amount <= 0) return;
  setState((s) => ({ txs: [...s.txs, { id: uid(), date, concept: `${loan.institution} · pago extraordinario`, tagId: loan.tagId, type: installmentType(loan), projected: amount, real: null, debt: 0, done: false, enabled: true, kind: "loan", seriesId: loanId, loanId, lineId: null, capital: amount, installment: null }] }));
  rebuildLoan(loanId, nextDay(date));
}

export type LoanAction = "one" | "endForward" | "cleanHistory" | "liquidate" | "grace";
export function loanAction(txId: string, action: LoanAction, graceMonths = 1) {
  const t = state.txs.find((x) => x.id === txId);
  if (!t?.loanId) return;
  const loanId = t.loanId;
  const ty = installmentType(state.loans.find((l) => l.id === loanId) ?? {});
  if (action === "one") deleteTx(txId, "one");
  else if (action === "endForward")
    setState((s) => ({ txs: s.txs.filter((x) => !(x.loanId === loanId && x.type === ty && !x.done && x.date >= t.date)) }));
  else if (action === "cleanHistory")
    setState((s) => ({ txs: s.txs.filter((x) => !(x.loanId === loanId && x.type === ty && x.done && x.date <= t.date)) }));
  else if (action === "liquidate") rebuildLoan(loanId, t.date, { liquidateOn: t.date });
  else rebuildLoan(loanId, t.date, { grace: Math.max(1, graceMonths) });
}

/* ---------- Credit lines ---------- */
export const addLine = (name: string, limit: number, from: string) =>
  setState((s) => ({ lines: [...s.lines, { id: uid(), name, limits: [{ from, limit }] }] }));
export const setLineLimit = (id: string, from: string, limit: number) =>
  setState((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, limits: [...l.limits.filter((c) => c.from !== from), { from, limit }] } : l)) }));
export const deleteLine = (id: string) =>
  setState((s) => ({ lines: s.lines.filter((l) => l.id !== id), txs: s.txs.map((t) => (t.lineId === id ? { ...t, lineId: null } : t)) }));

/* ---------- Credit cards ---------- */
export function addCard(name: string, cutDay: number, payDay: number) {
  setState((s) => ({ cards: [...s.cards, { id: uid(), name, cutDay, payDay }] }));
  log(`Tarjeta creada: ${name}`);
}
export function deleteCard(id: string) {
  const c = state.cards.find((x) => x.id === id);
  setState((s) => ({ cards: s.cards.filter((x) => x.id !== id), txs: s.txs.map((t) => (t.cardId === id ? { ...t, cardId: null } : t)) }));
  if (c) log(`Tarjeta eliminada: ${c.name}`);
}

/* ---------- Backups ---------- */
const DATA_KEYS = ["txs", "loans", "lines", "cards", "tags", "initialBalance"] as const;
export function exportBackup(): string {
  const data: Record<string, unknown> = { app: "totalero", version: 1, exportedAt: new Date().toISOString() };
  for (const k of DATA_KEYS) data[k] = state[k];
  return JSON.stringify(data, null, 2);
}
/** Replaces all data with a validated backup. Returns an error key or null. */
export function importBackup(text: string): string | null {
  let o: unknown;
  try { o = JSON.parse(text); } catch { return "badJson"; }
  const err = validateBackup(o);
  if (err) return err;
  const b = o as Partial<AppState>;
  setState(() => ({ txs: b.txs ?? [], loans: b.loans ?? [], lines: b.lines ?? [], cards: b.cards ?? [], tags: b.tags ?? defaults.tags, initialBalance: Number(b.initialBalance) || 0 }));
  log(`Respaldo importado (${(b.txs ?? []).length} movimientos)`);
  return null;
}
/** Deletes every movement of a month (YYYY-MM). */
export function clearMonth(key: string) {
  const n = state.txs.filter((t) => t.date.startsWith(key)).length;
  setState((s) => ({ txs: s.txs.filter((t) => !t.date.startsWith(key)) }));
  log(`Mes ${key} borrado (${n} movimientos)`);
}
export function resetAll() {
  setState((s) => ({ txs: [], loans: [], lines: [], cards: [], tags: defaults.tags, initialBalance: 0, history: [], session: s.session }));
  log("Datos reiniciados");
}

/** Edits a loan's terms: completed installments stay, pending ones are regenerated. */
export function updateLoan(id: string, patch: Omit<Loan, "id">) {
  const old = state.loans.find((l) => l.id === id);
  if (!old) return;
  const l: Loan = { ...patch, id };
  setState((s) => ({
    loans: s.loans.map((x) => (x.id === id ? l : x)),
    txs: s.txs.map((t) => (t.loanId === id && (t.installment === null || t.installment === undefined) && t.capital === 0 && !t.done
      ? { ...t, projected: l.principal, date: addMonths(l.startDate, -1), tagId: l.tagId, type: installmentType(l) === "income" ? "expense" : "income" }
      : t.loanId === id && t.installment != null && t.done ? { ...t, type: installmentType(l) } : t)),
  }));
  rebuildLoan(id, "0000-00-00");
  log(`Préstamo editado: ${l.institution}`);
}
export const getState = () => state;

/** Hides/shows a loan in the panel; its movements are untouched. */
export function setLoanHidden(id: string, hidden: boolean) {
  setState((s) => ({ loans: s.loans.map((l) => (l.id === id ? { ...l, hidden } : l)) }));
}
