import { useState } from "react";
import { CreditCard as CardIcon, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cardMonth, formatMoney, parseDate, quincenaOf, type CardMonth } from "@/lib/engine";
import { addCard, addTx, deleteCard, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function CardsSection({ year, month }: { year: number; month: number }) {
  const s = useApp();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", cut: "5", pay: "25" });
  const rows = s.cards.map((c) => cardMonth(c, s.txs, year, month));
  const fm = (c: number) => formatMoney(c, t.lang);
  const day = (d: string) => `${String(parseDate(d).d).padStart(2, "0")} ${t.monthsShort[parseDate(d).m]}`;
  const clampDay = (v: string) => Math.max(1, Math.min(31, Number(v) || 1));

  const save = () => {
    if (!f.name.trim()) return;
    addCard(f.name.trim(), clampDay(f.cut), clampDay(f.pay));
    setF({ name: "", cut: "5", pay: "25" });
    setOpen(false);
  };
  const quickPay = (r: CardMonth) =>
    addTx({ date: r.pay, concept: `${t.cardPay} · ${r.card.name}`, tagId: null, type: "expense", projected: 0, real: null, debt: 0, done: false, enabled: true, cardId: r.card.id });

  const Table = ({ half }: { half: 1 | 2 }) => {
    const list = rows.filter((r) => quincenaOf(r.pay) === half);
    return (
      <div className="min-w-0 overflow-x-auto rounded-md border">
        <div className="border-b bg-muted/60 px-3 py-2 text-xs font-medium">{half === 1 ? t.half1 : t.half2}</div>
        <table className="w-full min-w-[460px] text-sm">
          <thead className="text-[11px] uppercase text-muted-foreground">
            <tr>{[t.cardName, t.payDate, t.cutDate, t.amountToPay, t.status, ""].map((h, i) => <th key={i} className={`px-3 py-2 font-medium ${i === 3 ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="font-num tabular-nums">
            {list.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center font-sans text-xs text-muted-foreground">—</td></tr>}
            {list.map((r) => (
              <tr key={r.card.id} className="border-t">
                <td className="px-3 py-2 font-sans font-medium">{r.card.name}</td>
                <td className="px-3">{day(r.pay)}</td>
                <td className="px-3 text-muted-foreground">{day(r.cut)}</td>
                <td className="px-3 text-right">{r.status === "none" ? "—" : fm(r.amount)}</td>
                <td className="px-3 font-sans">
                  {r.status === "none" ? (
                    <button onClick={() => quickPay(r)} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" />{t.addPayment}</button>
                  ) : (
                    <span className={`rounded px-2 py-0.5 text-xs ${r.status === "paid" ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive"}`}>{r.status === "paid" ? t.paid : t.pendingS}</span>
                  )}
                </td>
                <td className="px-2 text-right">
                  <button aria-label={t.deleteCard} onClick={() => deleteCard(r.card.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
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
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.newCard}</Button>
      </div>
      {s.cards.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t.noCards}</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2"><Table half={1} /><Table half={2} /></div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.newCard}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>{t.cardName}</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>{t.cutDay}</Label><Input type="number" min={1} max={31} value={f.cut} onChange={(e) => setF({ ...f, cut: e.target.value })} className="font-num tabular-nums" /></div>
            <div><Label>{t.payDay}</Label><Input type="number" min={1} max={31} value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })} className="font-num tabular-nums" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button onClick={save}>{t.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
