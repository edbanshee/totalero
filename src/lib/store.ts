import { useSyncExternalStore } from "react";
import { addMonths, makeDate, parseDate, type Tag, type Tx } from "./engine";

export type Lang = "es" | "en";
export interface AppState {
  txs: Tx[];
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

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------- Actions ---------- */
export type TxInput = Omit<Tx, "id" | "seriesId" | "kind"> & { recurring?: boolean; months?: number };

export function addTx(input: TxInput) {
  const { recurring, months = 12, ...base } = input;
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
      date: addMonths(base.date, i, day),
      done: i === 0 ? base.done : false,
      real: i === 0 ? base.real : null,
      kind: "recurring",
      seriesId,
    }));
    setState((s) => ({ txs: [...s.txs, ...list] }));
  } else {
    setState((s) => ({ txs: [...s.txs, { ...base, id: uid(), kind: "simple", seriesId: null }] }));
  }
  return true;
}

export const updateTx = (id: string, patch: Partial<Tx>) =>
  setState((s) => ({ txs: s.txs.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

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
}

export const saveTags = (tags: Tag[]) => setState(() => ({ tags }));
