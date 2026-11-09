// Totalero central financial engine. Pure functions, integer cents only.

export type TxType = "income" | "expense";
export type TxKind = "simple" | "recurring" | "loan";

export interface Tag {
  id: string;
  name: string;
  color: string; // css color
}

export interface Tx {
  id: string;
  date: string; // YYYY-MM-DD
  concept: string;
  tagId: string | null;
  type: TxType;
  projected: number; // cents, positive
  real: number | null; // cents, positive
  debt: number; // cents, positive
  done: boolean;
  enabled: boolean;
  kind: TxKind;
  seriesId: string | null;
  loanId?: string | null; // installment / extra payment / deposit of a loan
  lineId?: string | null; // income = draw on the line, expense = payment to it
  capital?: number | null; // cents of the amount that reduces debt (rest is interest)
  installment?: number | null; // loan installment number; null for extras/deposits
  cardId?: string | null; // payment of a credit card
}

export const FIRST_YEAR = 2024;
export const LAST_YEAR = 2050;

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;
export const pad = (n: number) => String(n).padStart(2, "0");
export const makeDate = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(Math.min(d, daysInMonth(y, m)))}`;
export const parseDate = (s: string) => {
  const [y = 2024, m = 1, d = 1] = s.split("-").map(Number);
  return { y, m: m - 1, d };
};
export const quincenaOf = (date: string) => (parseDate(date).d <= 15 ? 1 : 2);

/** Add months to a date, clamping the day (handles leap years / short months). */
export function addMonths(date: string, n: number, keepDay?: number) {
  const { y, m, d } = parseDate(date);
  const total = y * 12 + m + n;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  return makeDate(ny, nm, keepDay ?? d);
}

/** Parse a user amount ("1,234.56" / "1234,56") into integer cents. */
export function toCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  let s = input.trim().replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const neg = s.startsWith("-");
  const [int, frac = ""] = s.replace("-", "").split(".");
  const cents = Number(int || "0") * 100 + Number((frac + "00").slice(0, 2));
  return neg ? -cents : cents;
}

/** Signed effect of a tx on the projected balance. */
export const txValue = (t: Tx) => {
  const abs = t.done && t.real !== null ? t.real : t.projected;
  return t.type === "income" ? abs : -abs;
};
/** Signed effect on the real (cash) balance: only completed movements. */
export const txRealValue = (t: Tx) => {
  if (!t.done) return 0;
  const abs = t.real ?? t.projected;
  return t.type === "income" ? abs : -abs;
};

export interface Row {
  tx: Tx;
  balance: number; // running projected balance after this row (or unchanged if disabled)
  remaining: number; // projected - real
}

export interface Half {
  income: number;
  expense: number;
  margin: number;
  closing: number;
}

export interface MonthResult {
  key: string;
  opening: number;
  openingReal: number;
  rows: Row[];
  q1: Half;
  q2: Half;
  income: number;
  expense: number;
  closing: number;
  closingReal: number;
  debt: number;
  count: number;
}

const sortTx = (a: Tx, b: Tx) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1);

/** Computes every month 2024-01..2050-12 in chronological cascade. */
export function computeAll(txs: Tx[], initialBalance: number): Map<string, MonthResult> {
  const byMonth = new Map<string, Tx[]>();
  for (const t of txs) {
    const k = t.date.slice(0, 7);
    const list = byMonth.get(k);
    if (list) list.push(t);
    else byMonth.set(k, [t]);
  }
  const out = new Map<string, MonthResult>();
  let bal = initialBalance;
  let realBal = initialBalance;
  let debt = 0;
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    for (let m = 0; m < 12; m++) {
      const key = monthKey(y, m);
      const list = (byMonth.get(key) ?? []).slice().sort(sortTx);
      const opening = bal;
      // The carried balance always counts as settled money in this month's real totals.
      realBal = bal;
      const openingReal = realBal;
      const q1: Half = { income: 0, expense: 0, margin: 0, closing: 0 };
      const q2: Half = { income: 0, expense: 0, margin: 0, closing: 0 };
      const rows: Row[] = [];
      for (const t of list) {
        const remaining = t.projected - (t.real ?? 0);
        if (t.enabled) {
          const v = txValue(t);
          bal += v;
          realBal += txRealValue(t);
          const h = quincenaOf(t.date) === 1 ? q1 : q2;
          if (v >= 0) h.income += v;
          else h.expense += -v;
          if (!t.done) debt += 0;
          debt += t.type === "expense" && !t.done ? t.debt : 0;
        }
        rows.push({ tx: t, balance: bal, remaining });
      }
      q1.margin = q1.income - q1.expense;
      q2.margin = q2.income - q2.expense;
      q1.closing = opening + q1.margin;
      q2.closing = q1.closing + q2.margin;
      out.set(key, {
        key,
        opening,
        openingReal,
        rows,
        q1,
        q2,
        income: q1.income + q2.income,
        expense: q1.expense + q2.expense,
        closing: bal,
        closingReal: realBal,
        debt,
        count: list.length,
      });
    }
  }
  return out;
}

export function formatMoney(cents: number, lang: "es" | "en" = "es") {
  const v = cents / 100;
  return new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  }).format(v);
}
export function formatNum(cents: number, lang: "es" | "en" = "es") {
  return new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/* ---------- Phase 2: loans & credit lines ---------- */
export type Frequency = "monthly" | "biweekly";

export interface Loan {
  id: string;
  institution: string;
  principal: number; // cents
  rate: number; // annual %, e.g. 18.5
  term: number; // number of payments
  startDate: string; // first payment date
  frequency: Frequency;
  payment: number; // cents, 0 = automatic (French annuity)
  tagId: string | null;
  direction?: LoanDirection; // payable (default) = I owe; receivable = owed to me
  payoff?: number | null; // cents needed to settle before the next installment
}

export type LoanDirection = "payable" | "receivable";
/** Cash-flow type of a loan's installments: I pay (expense) or I collect (income). */
export const installmentType = (l: Pick<Loan, "direction">): TxType => (l.direction === "receivable" ? "income" : "expense");

/** Periodic rate r such that annuity(P, r, n) = pay (bisection). 0 when pay*n <= P. */
export function solveRate(P: number, pay: number, n: number) {
  if (P <= 0 || n <= 0 || pay * n <= P) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const v = (P * mid) / (1 - Math.pow(1 + mid, -n));
    if (v > pay) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface LoanTermsInput { principal: number; term: number; frequency: Frequency; rate?: number | null; payment?: number | null; total?: number | null; payoff?: number | null }
export interface LoanTerms { rate: number; rateSource: "given" | "total" | "payoff" | "none"; payment: number; total: number; interest: number; payoff: number; saving: number; firstInterest: number }

/**
 * All automatic loan math. Rate priority: given rate > solved from installment/total >
 * implied by the payoff amount (payoff before installment 1 = principal + one period of interest).
 */
export function loanTerms(i: LoanTermsInput): LoanTerms {
  const P = i.principal, n = Math.max(1, i.term), ppy = i.frequency === "monthly" ? 12 : 24;
  const pay0 = i.payment && i.payment > 0 ? i.payment : i.total && i.total > 0 ? Math.round(i.total / n) : 0;
  let r: number, src: LoanTerms["rateSource"];
  if (i.rate && i.rate > 0) { r = i.rate / 100 / ppy; src = "given"; }
  else if (pay0) { r = solveRate(P, pay0, n); src = "total"; }
  else if (i.payoff && i.payoff > P && P > 0) { r = i.payoff / P - 1; src = "payoff"; }
  else { r = 0; src = "none"; }
  const payment = pay0 || annuity(P, r, n);
  const total = i.total && i.total > 0 && !(i.payment && i.payment > 0) ? i.total : payment * n;
  const firstInterest = Math.round(P * r);
  const payoff = i.payoff && i.payoff > 0 ? i.payoff : P + firstInterest;
  return { rate: Math.round(r * ppy * 100 * 100) / 100, rateSource: src, payment, total, interest: total - P, payoff, saving: Math.max(0, total - payoff), firstInterest };
}

/**
 * Infers the original principal when it is unknown: `payoff` is what closes the debt right
 * before installment `current` (balance after current-1 payments plus one period of interest).
 * Returns the principal in cents and the yearly rate (%), or null if it cannot be inferred.
 */
export function inferPrincipal(o: { payment: number; term: number; current: number; payoff: number; frequency: Frequency }) {
  const n = Math.max(1, o.term), rem = Math.max(1, n - Math.max(1, o.current) + 1);
  if (o.payment <= 0 || o.payoff <= 0 || o.payoff > o.payment * rem) return null;
  const af = (r: number, k: number) => (r === 0 ? k : (1 - Math.pow(1 + r, -k)) / r);
  const f = (r: number) => o.payment * (1 + r) * af(r, rem) - o.payoff; // decreasing in r
  let lo = 0, hi = 1;
  if (f(hi) > 0) return null;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  const r = (lo + hi) / 2, ppy = o.frequency === "monthly" ? 12 : 24;
  return { principal: Math.round(o.payment * af(r, n)), rate: r * ppy * 100 };
}

export interface CreditLine {
  id: string;
  name: string;
  limits: { from: string; limit: number }[]; // from = YYYY-MM; condition changes over time
}

export interface AmortRow {
  n: number;
  date: string;
  payment: number;
  interest: number;
  capital: number;
  extra: number;
  balance: number;
}

export const periodRate = (rate: number, f: Frequency) => rate / 100 / (f === "monthly" ? 12 : 24);
export const periodsPerMonth = (f: Frequency) => (f === "monthly" ? 1 : 2);

/** Fixed payment (French amortization) for P cents at rate r per period over n periods. */
export function annuity(P: number, r: number, n: number) {
  if (n <= 0) return P;
  if (r === 0) return Math.ceil(P / n);
  return Math.round((P * r) / (1 - Math.pow(1 + r, -n)));
}

export function nextDay(s: string) {
  const { y, m, d } = parseDate(s);
  return d < daysInMonth(y, m) ? makeDate(y, m, d + 1) : addMonths(makeDate(y, m, 1), 1, 1);
}

/** Date of the i-th payment (0-based) from a first date. Bi-weekly pays on day d and d+15. */
export function periodDate(first: string, f: Frequency, i: number) {
  const { d } = parseDate(first);
  if (f === "monthly") return addMonths(first, i, d);
  const base = addMonths(first, Math.floor(i / 2), d);
  if (i % 2 === 0) return base;
  const { y, m } = parseDate(base);
  return makeDate(y, m, Math.min(d + 15, daysInMonth(y, m)));
}

export function schedule(o: {
  balance: number; rate: number; frequency: Frequency; periods: number; first: string;
  payment?: number; startN?: number; extras?: Record<number, number> | undefined;
}): AmortRow[] {
  const r = periodRate(o.rate, o.frequency);
  const custom = !!o.payment && o.payment > 0;
  const pay = custom ? o.payment! : annuity(o.balance, r, o.periods);
  const startN = o.startN ?? 0;
  const rows: AmortRow[] = [];
  let bal = o.balance;
  for (let i = 0; bal > 0 && i < o.periods * 4 + 24; i++) {
    const interest = Math.round(bal * r);
    let capital = pay - interest;
    if (capital <= 0) break; // payment does not cover interest
    if (capital >= bal || (!custom && i === o.periods - 1)) capital = bal;
    const extra = Math.min(o.extras?.[startN + i] ?? 0, bal - capital);
    bal -= capital + extra;
    rows.push({ n: startN + i + 1, date: periodDate(o.first, o.frequency, i), payment: capital + interest, interest, capital, extra, balance: bal });
  }
  return rows;
}

export const amortize = (l: Loan, extras?: Record<number, number>) =>
  schedule({ balance: l.principal, rate: l.rate, frequency: l.frequency, periods: l.term, first: l.startDate, payment: l.payment, extras });

/** Original plan vs plan with extra payments (extras keyed by 0-based installment index). */
export function simulateExtra(l: Loan, extras: Record<number, number>) {
  const base = amortize(l);
  const sim = amortize(l, extras);
  const sum = (rs: AmortRow[]) => rs.reduce((a, r) => a + r.interest, 0);
  const idx = Math.min(...Object.keys(extras).map(Number), sim.length - 1);
  return {
    base, sim,
    monthsSaved: (base.length - sim.length) / periodsPerMonth(l.frequency),
    interestSaved: sum(base) - sum(sim),
    payoff: sim.at(-1)?.date ?? l.startDate,
    newBalance: sim[idx]?.balance ?? 0,
  };
}

export const lineLimit = (line: CreditLine, key: string) => {
  let lim: number | null = null;
  for (const c of [...line.limits].sort((a, b) => (a.from < b.from ? -1 : 1))) if (c.from <= key) lim = c.limit;
  return lim;
};

export interface LineMonth { id: string; name: string; limit: number; used: number; available: number; drawn: number; paid: number }
export interface CreditMonth { lines: LineMonth[]; lineAvailable: number; lineUsed: number; loanDebt: number; loanReceivable: number }

const absAmount = (t: Tx) => (t.done && t.real !== null ? t.real : t.projected);

/**
 * Per-month credit state 2024-01..2050-12. Each line keeps its own monthly balance:
 * draws (income) raise usage, payments (expense, capital part) lower it, and the effect
 * cascades forward. Loan debt = principal minus capital paid (done, or projected for
 * months after `todayKey`). Disabled movements never count. Credit is never added to cash.
 */
export function computeCredit(txs: Tx[], loans: Loan[], lines: CreditLine[], todayKey: string): Map<string, CreditMonth> {
  const lineMove = new Map<string, { drawn: number; paid: number }>(); // `${lineId}|${month}`
  const loanCap = new Map<string, number>(); // `${loanId}|${month}` done capital
  const loanCapAll = new Map<string, number>(); // including pending
  const instType = new Map<string, TxType>(loans.map((l) => [l.id, installmentType(l)]));
  for (const t of txs) {
    if (!t.enabled) continue;
    const k = t.date.slice(0, 7);
    if (t.lineId) {
      const mk = `${t.lineId}|${k}`;
      const cur = lineMove.get(mk) ?? { drawn: 0, paid: 0 };
      if (t.type === "income") cur.drawn += absAmount(t);
      else cur.paid += t.capital ?? absAmount(t);
      lineMove.set(mk, cur);
    }
    if (t.loanId && t.type === (instType.get(t.loanId) ?? "expense")) {
      const mk = `${t.loanId}|${k}`;
      const c = t.capital ?? 0;
      loanCapAll.set(mk, (loanCapAll.get(mk) ?? 0) + c);
      if (t.done) loanCap.set(mk, (loanCap.get(mk) ?? 0) + c);
    }
  }
  const loanFrom = new Map<string, string>(loans.map((l) => [l.id, l.startDate.slice(0, 7)]));
  for (const t of txs) if (t.loanId && t.date.slice(0, 7) < (loanFrom.get(t.loanId) ?? "")) loanFrom.set(t.loanId, t.date.slice(0, 7));
  const out = new Map<string, CreditMonth>();
  const used = new Map<string, number>(lines.map((l) => [l.id, 0]));
  const paidLoan = new Map<string, number>(loans.map((l) => [l.id, 0]));
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    for (let m = 0; m < 12; m++) {
      const key = monthKey(y, m);
      const future = key > todayKey;
      const lm: LineMonth[] = [];
      for (const l of lines) {
        const mv = lineMove.get(`${l.id}|${key}`) ?? { drawn: 0, paid: 0 };
        const u = Math.max(0, (used.get(l.id) ?? 0) + mv.drawn - mv.paid);
        used.set(l.id, u);
        const lim = lineLimit(l, key);
        if (lim === null) continue;
        lm.push({ id: l.id, name: l.name, limit: lim, used: u, available: Math.max(0, lim - u), drawn: mv.drawn, paid: mv.paid });
      }
      let loanDebt = 0;
      let loanReceivable = 0;
      for (const l of loans) {
        const p = (paidLoan.get(l.id) ?? 0) + ((future ? loanCapAll : loanCap).get(`${l.id}|${key}`) ?? 0);
        paidLoan.set(l.id, p);
        if (key < (loanFrom.get(l.id) ?? l.startDate.slice(0, 7))) continue;
        const left = Math.max(0, l.principal - p);
        if (l.direction === "receivable") loanReceivable += left;
        else loanDebt += left;
      }
      out.set(key, {
        lines: lm,
        lineAvailable: lm.reduce((a, x) => a + x.available, 0),
        lineUsed: lm.reduce((a, x) => a + x.used, 0),
        loanDebt,
        loanReceivable,
      });
    }
  }
  return out;
}

/**
 * Per-movement loan balances, derived from the movements themselves so deleting or editing
 * installments recalculates automatically. debt = loan balance before the movement,
 * left = balance after it. Disabled movements leave the balance unchanged.
 */
export function loanRowBalances(txs: Tx[], loans: Loan[]): Map<string, { debt: number; left: number }> {
  const out = new Map<string, { debt: number; left: number }>();
  for (const l of loans) {
    const ty = installmentType(l);
    let bal = l.principal;
    for (const t of txs.filter((x) => x.loanId === l.id).sort(sortTx)) {
      const before = bal;
      if (t.enabled && t.type === ty) bal = Math.max(0, bal - (t.capital ?? 0));
      out.set(t.id, { debt: before, left: bal });
    }
  }
  return out;
}

/* ---------- Credit cards ---------- */
export interface CreditCard {
  id: string;
  name: string;
  cutDay: number; // day of the month the statement closes
  payDay: number; // day of the month the payment is due
}
export type CardStatus = "paid" | "pending" | "none";
export interface CardMonth { card: CreditCard; cut: string; pay: string; amount: number; status: CardStatus; txs: Tx[] }

/** A card's statement for a month: due date in that month, cut date before it, amount = its linked payments. */
export function cardMonth(card: CreditCard, txs: Tx[], y: number, m: number): CardMonth {
  const pay = makeDate(y, m, card.payDay);
  const cutSame = makeDate(y, m, card.cutDay);
  const cut = card.cutDay < card.payDay ? cutSame : makeDate(...(m === 0 ? [y - 1, 11] as const : [y, m - 1] as const), card.cutDay);
  const key = monthKey(y, m);
  const mine = txs.filter((t) => t.cardId === card.id && t.enabled && t.date.startsWith(key));
  const amount = mine.reduce((a, t) => a + (t.done && t.real !== null ? t.real : t.projected) * (t.type === "expense" ? 1 : -1), 0);
  const status: CardStatus = mine.length === 0 ? "none" : mine.every((t) => t.done) ? "paid" : "pending";
  return { card, cut, pay, amount, status, txs: mine };
}

/* ---------- Annual summary ---------- */
export interface TagTotal { tagId: string | null; income: number; expense: number }
/** Income/expense per tag for a year (enabled movements, projected amounts). */
export function tagTotals(txs: Tx[], year: number): TagTotal[] {
  const map = new Map<string | null, TagTotal>();
  for (const t of txs) {
    if (!t.enabled || !t.date.startsWith(`${year}-`)) continue;
    const r = map.get(t.tagId) ?? { tagId: t.tagId, income: 0, expense: 0 };
    r[t.type] += t.projected;
    map.set(t.tagId, r);
  }
  return [...map.values()].sort((a, b) => b.expense + b.income - (a.expense + a.income));
}

/* ---------- Backups ---------- */
/** Checks a backup file before importing; returns an error key or null. */
export function validateBackup(o: unknown): string | null {
  if (!o || typeof o !== "object") return "notObject";
  const b = o as { app?: unknown; txs?: unknown; tags?: unknown };
  if (b.app !== "totalero") return "notTotalero";
  if (!Array.isArray(b.txs) || !Array.isArray(b.tags)) return "missing";
  for (const t of b.txs as Tx[]) {
    if (typeof t?.id !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(String(t.date)) || !Number.isInteger(t.projected) || (t.type !== "income" && t.type !== "expense")) return "badTx";
  }
  return null;
}
