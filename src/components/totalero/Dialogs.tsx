import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, toCents, formatNum, txValue, type Tag, type Tx } from "@/lib/engine";
import { deleteTx, saveTags, setState, uid, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function DeleteDialog({ tx, onClose }: { tx: Tx | null; onClose: () => void }) {
  const t = useT();
  if (!tx) return null;
  const effect = tx.enabled ? -txValue(tx) : 0;
  const run = (m: "one" | "forward" | "series") => { deleteTx(tx.id, m); onClose(); };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t.delTitle}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{tx.concept}</span> · {tx.seriesId ? t.delRecurring : `${t.delSimple} `}
          {!tx.seriesId && <span className={`font-num font-medium ${effect >= 0 ? "text-positive" : "text-destructive"}`}>{effect >= 0 ? "+" : ""}{formatMoney(effect, t.lang)}</span>}
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {tx.seriesId ? (
            <>
              <Button variant="outline" onClick={() => run("one")}>{t.delOne}</Button>
              <Button variant="outline" onClick={() => run("forward")}>{t.delForward}</Button>
              <Button variant="destructive" onClick={() => run("series")}>{t.delSeries}</Button>
            </>
          ) : (
            <Button variant="destructive" onClick={() => run("one")}>{t.del}</Button>
          )}
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TagsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const { tags, initialBalance } = useApp();
  const [list, setList] = useState<Tag[]>(tags);
  const [init, setInit] = useState("");
  useEffect(() => { if (open) { setList(tags); setInit(formatNum(initialBalance, "en").replace(/,/g, "")); } }, [open, tags, initialBalance]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t.tags}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {list.map((g, i) => (
            <div key={g.id} className="flex items-center gap-2">
              <input type="color" value={g.color} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} className="h-9 w-10 cursor-pointer rounded border bg-transparent" />
              <Input value={g.name} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Button variant="ghost" size="icon" onClick={() => setList(list.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setList([...list, { id: uid(), name: "", color: "#3FD0D9" }])}>{t.addTag}</Button>
          <div className="pt-3"><Label>{t.initialBal}</Label><Input className="font-num" value={init} onChange={(e) => setInit(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={() => { saveTags(list.filter((g) => g.name.trim())); setState(() => ({ initialBalance: toCents(init) })); onOpenChange(false); }}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
