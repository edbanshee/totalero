import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatNum, toCents, type Tx, type TxType } from "@/lib/engine";
import { addLoan, addTx, updateTx, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Num } from "@/components/totalero/Num";
import { emptyLoanForm, LoanFields, readLoanForm } from "@/components/totalero/LoanFields";

export function TxDialog({ open, onOpenChange, tx, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; tx: Tx | null; defaultDate: string }) {
  const t = useT();
  const { tags, lines, cards } = useApp();
  const [f, setF] = useState({ date: defaultDate, concept: "", tagId: "", type: "expense" as TxType, projected: "", real: "", debt: "", done: false, recurring: false, months: "12", every: "monthly" as "monthly" | "yearly", lineId: "", cardId: "", capital: "" });

  useEffect(() => {
    if (!open) return;
    setF(
      tx
        ? { date: tx.date, concept: tx.concept, tagId: tx.tagId ?? "", type: tx.type, projected: formatNum(tx.projected, "en").replace(/,/g, ""), real: tx.real === null ? "" : formatNum(tx.real, "en").replace(/,/g, ""), debt: tx.debt ? formatNum(tx.debt, "en").replace(/,/g, "") : "", done: tx.done, recurring: false, months: "12", every: "monthly" as "monthly" | "yearly", lineId: tx.lineId ?? "", cardId: tx.cardId ?? "", capital: tx.lineId && tx.capital != null ? formatNum(tx.capital, "en").replace(/,/g, "") : "" }
        : { date: defaultDate, concept: "", tagId: "", type: "expense", projected: "", real: "", debt: "", done: false, recurring: false, months: "12", every: "monthly" as "monthly" | "yearly", lineId: "", cardId: "", capital: "" },
    );
  }, [open, tx, defaultDate]);

  const [linkLoan, setLinkLoan] = useState(false);
  const [lf, setLf] = useState(emptyLoanForm(defaultDate));
  useEffect(() => { if (open) { setLinkLoan(false); setLf(emptyLoanForm(defaultDate)); } }, [open, defaultDate]);

  const save = () => {
    if (linkLoan && !tx) {
      const r = readLoanForm({ ...lf, institution: lf.institution || f.concept, startDate: f.date, tagId: lf.tagId || f.tagId });
      if (!r.valid) return;
      addLoan(r.loan, lf.deposit);
      onOpenChange(false);
      return;
    }
    if (!f.concept.trim() || !f.date) return;
    const data = {
      date: f.date,
      concept: f.concept.trim(),
      tagId: f.tagId || null,
      type: f.type,
      projected: Math.abs(toCents(f.projected)),
      real: f.real === "" ? null : Math.abs(toCents(f.real)),
      debt: Math.abs(toCents(f.debt)),
      done: f.done,
      cardId: f.type === "expense" && f.cardId ? f.cardId : null,
      ...(tx?.loanId ? {} : {
        lineId: f.lineId || null,
        capital: f.lineId && f.type === "expense" && f.capital.trim() !== "" ? Math.abs(toCents(f.capital)) : null,
      }),
    };
    if (tx) updateTx(tx.id, data);
    else if (!addTx({ ...data, enabled: true, recurring: f.recurring, every: f.every, months: Math.max(1, Math.min(120, Number(f.months) || 12)) })) {
      toast.error(t.duplicateWarn);
      return;
    }
    onOpenChange(false);
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const sel = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
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
          <div className="col-span-2"><Label>{t.date}</Label><Input type="date" value={f.date} onChange={set("date")} min="2024-01-01" max="2050-12-31" className="font-num tabular-nums" /></div>
          <div className="col-span-2">
            <Label>{t.tag}</Label>
            <select className={sel} value={f.tagId} onChange={set("tagId")}>
              <option value="">{t.none}</option>
              {tags.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {!tx && (
            <div className="col-span-2 rounded-lg border bg-muted/30 p-3">
              <label className="flex items-center justify-between gap-2 text-sm font-medium">
                <span>{t.linkLoan}</span>
                <Switch checked={linkLoan} onCheckedChange={setLinkLoan} />
              </label>
              {linkLoan && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">{t.linkLoanHint}</p>
                  <LoanFields f={{ ...lf, institution: lf.institution || f.concept, startDate: f.date }} setF={setLf} tags={tags} showDate={false} />
                </div>
              )}
            </div>
          )}
          {!linkLoan && !tx?.loanId && lines.length > 0 && (
            <div className="col-span-2">
              <Label>{t.creditLine}</Label>
              <select className={sel} value={f.lineId} onChange={set("lineId")}>
                <option value="">{t.noLine}</option>
                {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {f.lineId && <p className="mt-1 text-xs text-muted-foreground">{f.type === "income" ? t.lineHintIn : t.lineHintOut}</p>}
            </div>
          )}
          {!linkLoan && !tx?.loanId && f.type === "expense" && cards.length > 0 && (
            <div className="col-span-2">
              <Label>{t.cardPay}</Label>
              <select className={sel} value={f.cardId} onChange={set("cardId")}>
                <option value="">{t.noCard}</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {f.cardId && <p className="mt-1 text-xs text-muted-foreground">{t.cardHint}</p>}
            </div>
          )}
          {!linkLoan && (<>
          {([["projected", t.projected], ["real", t.real]] as const).map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <div className="relative">
                <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-num text-sm font-semibold ${f.type === "income" ? "text-positive" : "text-destructive"}`}>{f.type === "income" ? "+" : "−"}</span>
                <Input inputMode="decimal" value={f[k]} onChange={set(k)} className="pl-7 font-num" />
              </div>
            </div>
          ))}
          {f.lineId && f.type === "expense" && <div className="col-span-2"><Label>{t.capitalPart}</Label><Input inputMode="decimal" value={f.capital} onChange={set("capital")} placeholder={f.projected} className="font-num" /></div>}
          <div><Label>{t.debt}</Label><Input inputMode="decimal" value={f.debt} onChange={set("debt")} className="font-num" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><Switch checked={f.done} onCheckedChange={(v) => setF({ ...f, done: v, real: v && f.real.trim() === "" ? f.projected : f.real })} />{t.done}</label>
          {!tx && (
            <>
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.recurring} onCheckedChange={(v) => setF({ ...f, recurring: v })} />{t.recurring}</label>
              {f.recurring && <div><Label>{t.type}</Label><select className={sel} value={f.every} onChange={(e) => setF({ ...f, every: e.target.value as "monthly" | "yearly", months: e.target.value === "yearly" ? "5" : "12" })}><option value="monthly">{t.everyMonth}</option><option value="yearly">{t.everyYear}</option></select></div>}
              {f.recurring && <div><Label><Num>{f.every === "yearly" ? t.yearsCount : t.monthsCount}</Num></Label><Input type="number" value={f.months} onChange={set("months")} className="font-num tabular-nums" /></div>}
            </>
          )}
          </>)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={save}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
