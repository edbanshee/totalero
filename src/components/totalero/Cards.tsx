import { useState } from "react";
import { CreditCard as CardIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cardMonth, formatMoney, monthKey, parseDate, quincenaOf, toCents, type CreditCard } from "@/lib/engine";
import { addCard, deleteCard, getState, setCardStatement, updateCard, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";

const emptyForm = { name: "", cut: "5", pay: "25", limit: "", amount: "", paid: false };

export function CardsSection({ year, month }: { year: number; month: number }) {
  const s = useApp();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState(emptyForm);
  const key = monthKey(year, month);
  const rows = s.cards.map((c) => cardMonth(c, s.txs, year, month));
  const fm = (c: number) => formatMoney(c, t.lang);
  const day = (d: string) => `${String(parseDate(d).d).padStart(2, "0")} ${t.monthsShort[parseDate(d).m]}`;
  const clampDay = (v: string) => Math.max(1, Math.min(31, Number(v) || 1));

  const edit = (card: CreditCard) => {
    const r = cardMonth(card, s.txs, year, month);
    setEditing(card.id);
    setF({ name: card.name, cut: String(card.cutDay), pay: String(card.payDay), limit: card.limit == null ? "" : String(card.limit / 100), amount: r.amount == null ? "" : String(r.amount / 100), paid: r.status === "paid" });
    setOpen(true);
  };
  const save = () => {
    if (!f.name.trim()) return;
    const data = { name: f.name.trim(), cutDay: clampDay(f.cut), payDay: clampDay(f.pay), limit: f.limit.trim() === "" ? null : Math.abs(toCents(f.limit)) };
    let id = editing;
    if (id) updateCard(id, data);
    else {
      addCard(data.name, data.cutDay, data.payDay, data.limit);
      id = getState().cards.at(-1)?.id ?? null;
    }
    if (id) setCardStatement(id, key, f.amount.trim() === "" ? null : Math.abs(toCents(f.amount)), f.paid);
    setOpen(false);
  };

  const table = (half: 1 | 2) => {
    const list = rows.filter((r) => quincenaOf(r.pay) === half);
    return (
      <div className="min-w-0 overflow-x-auto rounded-md border">
        <div className="border-b bg-muted/60 px-3 py-2 text-xs font-medium">{half === 1 ? t.half1 : t.half2}</div>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-[11px] uppercase text-muted-foreground">
            <tr>{[t.cardName, t.payDate, t.cutDate, t.cardLimit, t.cardMonthAmount, t.status, t.actions].map((h, i) => <th key={i} className={`px-3 py-2 font-medium ${i === 3 || i === 4 ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="font-num tabular-nums">
            {list.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center font-sans text-xs text-muted-foreground">—</td></tr>}
            {list.map((r) => (
              <tr key={r.card.id} className={`border-t ${r.status === "paid" ? "bg-muted opacity-50" : ""}`}>
                <td className="px-3 py-2 font-sans font-medium">{r.card.name}</td>
                <td className="px-3 whitespace-nowrap">{day(r.pay)}</td>
                <td className="px-3 whitespace-nowrap text-muted-foreground">{day(r.cut)}</td>
                <td className="px-3 text-right text-muted-foreground">{r.card.limit == null ? "—" : fm(r.card.limit)}</td>
                <td className="px-3 text-right">{r.amount == null ? "—" : fm(r.amount)}</td>
                <td className="px-3 font-sans">
                  <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs">
                    <Checkbox checked={r.status === "paid"} aria-label={`${t.cardPaidMonth} · ${r.card.name}`} onCheckedChange={(checked) => setCardStatement(r.card.id, key, r.amount, checked === true)} />
                    {r.status === "paid" ? t.paid : t.pendingS}
                  </label>
                </td>
                <td className="px-2">
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" aria-label={`${t.editCard} · ${r.card.name}`} title={t.editCard} onClick={() => edit(r.card)}><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label={`${t.deleteCard} · ${r.card.name}`} title={t.deleteCard} onClick={() => deleteCard(r.card.id)} className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><CardIcon className="h-5 w-5" /></div>
          <h3 className="text-base font-semibold">{t.cardsTitle}</h3>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setF(emptyForm); setOpen(true); }}><Plus className="h-4 w-4" />{t.newCard}</Button>
      </div>
      {s.cards.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t.noCards}</p> : <div className="mt-4 grid gap-3 xl:grid-cols-2">{table(1)}{table(2)}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t.editCard : t.newCard}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label htmlFor="card-name">{t.cardName}</Label><Input id="card-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><Label htmlFor="card-cut">{t.cutDay}</Label><Input id="card-cut" type="number" min={1} max={31} required value={f.cut} onChange={(e) => setF({ ...f, cut: e.target.value })} className="font-num tabular-nums" /></div>
              <div><Label htmlFor="card-pay">{t.payDay}</Label><Input id="card-pay" type="number" min={1} max={31} required value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })} className="font-num tabular-nums" /></div>
              <div className="col-span-2"><Label htmlFor="card-limit">{t.cardLimit}</Label><Input id="card-limit" inputMode="decimal" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} className="font-num tabular-nums" /></div>
              <fieldset className="col-span-2 grid gap-3 border-t pt-3">
                <legend className="px-1 text-sm font-medium">{t.months[month]} {year}</legend>
                <div><Label htmlFor="card-amount">{t.cardMonthAmount}</Label><Input id="card-amount" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="font-num tabular-nums" /></div>
                <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={f.paid} onCheckedChange={(checked) => setF({ ...f, paid: checked === true })} />{t.cardPaidMonth}</label>
              </fieldset>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button><Button type="submit">{editing ? t.save : t.create}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
