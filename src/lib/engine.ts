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
