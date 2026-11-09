import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatNum, toCents, type Tx, type TxType } from "@/lib/engine";
import { addTx, updateTx, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Num } from "@/components/totalero/Num";

export function TxDialog({ open, onOpenChange, tx, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; tx: Tx | null; defaultDate: string }) {
  const t = useT();
  const { tags } = useApp();
  const [f, setF] = useState({ date: defaultDate, concept: "", category: "", tagId: "", type: "expense" as TxType, projected: "", real: "", debt: "", done: false, recurring: false, months: "12" });

  useEffect(() => {
    if (!open) return;
    setF(
      tx
        ? { date: tx.date, concept: tx.concept, category: tx.category, tagId: tx.tagId ?? "", type: tx.type, projected: formatNum(tx.projected, "en").replace(/,/g, ""), real: tx.real === null ? "" : formatNum(tx.real, "en").replace(/,/g, ""), debt: tx.debt ? formatNum(tx.debt, "en").replace(/,/g, "") : "", done: tx.done, recurring: false, months: "12" }
        : { date: defaultDate, concept: "", category: "", tagId: "", type: "expense", projected: "", real: "", debt: "", done: false, recurring: false, months: "12" },
    );
  }, [open, tx, defaultDate]);

  const save = () => {
    if (!f.concept.trim() || !f.date) return;
    const data = {
      date: f.date,
      concept: f.concept.trim(),
      category: f.category.trim(),
      tagId: f.tagId || null,
      type: f.type,
      projected: Math.abs(toCents(f.projected)),
      real: f.real === "" ? null : Math.abs(toCents(f.real)),
      debt: Math.abs(toCents(f.debt)),
      done: f.done,
    };
    if (tx) updateTx(tx.id, data);
    else if (!addTx({ ...data, enabled: true, recurring: f.recurring, months: Math.max(1, Math.min(120, Number(f.months) || 12)) })) {
      toast.error(t.duplicateWarn);
      return;
    }
    onOpenChange(false);
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const sel = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx ? t.editTx : t.newTx}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex gap-2">
            {(["expense", "income"] as const).map((ty) => (
              <button key={ty} onClick={() => setF({ ...f, type: ty })} className={`flex-1 rounded-md border py-2 text-sm font-medium ${f.type === ty ? (ty === "income" ? "border-positive bg-positive/10 text-positive" : "border-destructive bg-destructive/10 text-destructive") : "text-muted-foreground"}`}>
                {ty === "income" ? t.incomeF : t.expenseF}
              </button>
            ))}
          </div>
          <div className="col-span-2"><Label>{t.concept}</Label><Input value={f.concept} onChange={set("concept")} /></div>
          <div><Label>{t.date}</Label><Input type="date" value={f.date} onChange={set("date")} min="2024-01-01" max="2050-12-31" className="font-num tabular-nums" /></div>
          <div><Label>{t.category}</Label><Input value={f.category} onChange={set("category")} /></div>
          <div className="col-span-2">
            <Label>{t.tag}</Label>
            <select className={sel} value={f.tagId} onChange={set("tagId")}>
              <option value="">{t.none}</option>
              {tags.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div><Label>{t.projected}</Label><Input inputMode="decimal" value={f.projected} onChange={set("projected")} className="font-num" /></div>
          <div><Label>{t.real}</Label><Input inputMode="decimal" value={f.real} onChange={set("real")} className="font-num" /></div>
          <div><Label>{t.debt}</Label><Input inputMode="decimal" value={f.debt} onChange={set("debt")} className="font-num" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><Switch checked={f.done} onCheckedChange={(v) => setF({ ...f, done: v })} />{t.done}</label>
          {!tx && (
            <>
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.recurring} onCheckedChange={(v) => setF({ ...f, recurring: v })} />{t.recurringMonthly}</label>
              {f.recurring && <div><Label><Num>{t.monthsCount}</Num></Label><Input type="number" value={f.months} onChange={set("months")} className="font-num tabular-nums" /></div>}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={save}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
