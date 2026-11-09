import { useRef } from "react";
import { Cloud, CloudDownload, Download, Eraser, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Num } from "@/components/totalero/Num";
import { clearMonth, exportBackup, importBackup, resetAll, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cloudLoad, cloudSave, firebaseConfigured } from "@/lib/firebase";

export function BackupDialog({ open, onOpenChange, monthKey, monthLabel }: { open: boolean; onOpenChange: (o: boolean) => void; monthKey: string; monthLabel: string }) {
  const t = useT();
  const file = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `totalero-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t.exported);
  };
  const doImport = async (f: File | undefined) => {
    if (!f) return;
    if (!confirm(t.importWarn)) return;
    const err = importBackup(await f.text());
    if (err) toast.error(t.backupErr[err] ?? err);
    else { toast.success(t.imported); onOpenChange(false); }
    if (file.current) file.current.value = "";
  };

  const cloud = async (fn: () => Promise<string | null | void>, ok: string) => {
    if (!firebaseConfigured) { toast(t.googleSoon); return; }
    if (fn === cloudLoad && !confirm(t.importWarn)) return;
    try { const err = await fn(); if (err) toast.error(err === "empty" ? t.cloudEmpty : t.backupErr[err] ?? err); else toast.success(ok); }
    catch { toast.error(t.cloudErr); }
  };
  const row = "w-full justify-start gap-2";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t.backup}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Button variant="outline" className={row} onClick={doExport}><Download className="h-4 w-4" />{t.exportJson}</Button>
          <Button variant="outline" className={row} onClick={() => file.current?.click()}><Upload className="h-4 w-4" />{t.importJson}</Button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
          <p className="text-xs text-muted-foreground">{t.importWarn}</p>
          <Button variant="outline" className={row} onClick={() => cloud(cloudSave, t.cloudSaved)}><Cloud className="h-4 w-4" />{t.cloudSave}</Button>
          <Button variant="outline" className={row} onClick={() => cloud(cloudLoad, t.cloudLoaded)}><CloudDownload className="h-4 w-4" />{t.cloudLoad}</Button>
          <div className="border-t pt-2" />
          <Button variant="outline" className={row} onClick={() => confirm(t.clearMonthConfirm) && clearMonth(monthKey)}><Eraser className="h-4 w-4" /><Num>{`${t.clearMonth} · ${monthLabel}`}</Num></Button>
          <Button variant="outline" className={`${row} text-destructive`} onClick={() => { if (confirm(t.resetConfirm)) { resetAll(); onOpenChange(false); } }}><RotateCcw className="h-4 w-4" />{t.resetAll}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const { history } = useApp();
  const fmt = new Intl.DateTimeFormat(t.lang === "es" ? "es-MX" : "en-US", { dateStyle: "short", timeStyle: "short" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{t.history}</DialogTitle></DialogHeader>
        {history.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t.noHistory}</p> : (
          <ul className="divide-y text-sm">
            {history.map((h, i) => (
              <li key={i} className="flex gap-3 py-2">
                <span className="w-32 shrink-0 font-num text-xs tabular-nums text-muted-foreground">{fmt.format(new Date(h.at))}</span>
                <span><Num>{h.msg}</Num></span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
