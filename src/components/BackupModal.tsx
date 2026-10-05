import React, { useRef, useState } from 'react';
import { X, Download, Upload, RefreshCw, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Language, MonthData, CreditLine } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { sanitizeAndDeduplicateMonths } from '../utils/calculations';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthsData: Record<string, MonthData>;
  creditLines: CreditLine[];
  onImportData: (months: Record<string, MonthData>, lines: CreditLine[]) => void;
  onResetFactoryData: () => void;
  language: Language;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  monthsData,
  creditLines,
  onImportData,
  onResetFactoryData,
  language
}) => {
  const t = TRANSLATIONS[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [resetConfirmWord, setResetConfirmWord] = useState('');

  if (!isOpen) return null;

  const isEs = language === 'es';
  const targetResetConfirmation = isEs ? 'RESTAURAR' : 'RESTORE';
  const canReset = resetConfirmWord.trim().toUpperCase() === targetResetConfirmation;

  const handleExport = () => {
    const cleanMonths = sanitizeAndDeduplicateMonths(monthsData, language);
    const exportPayload = {
      app: 'Totalero',
      version: '2.1',
      exportedAt: new Date().toISOString(),
      months: cleanMonths,
      creditLines: creditLines
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `totalero_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedback(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = event.target?.result as string;
        const json = JSON.parse(rawContent);

        let parsedMonths: Record<string, MonthData> | null = null;
        let parsedLines: CreditLine[] = [];

        if (json && typeof json === 'object') {
          if (json.months && typeof json.months === 'object') {
            parsedMonths = json.months;
            parsedLines = Array.isArray(json.creditLines) ? json.creditLines : [];
          } else if (json.data && typeof json.data === 'object') {
            parsedMonths = json.data.months || json.data;
            parsedLines = Array.isArray(json.data.creditLines) ? json.data.creditLines : [];
          } else {
            // Check if root object keys match MonthData (e.g., '2026-0', etc.)
            const keys = Object.keys(json);
            const hasMonthKeys = keys.some(k => k.includes('-'));
            if (hasMonthKeys) {
              parsedMonths = json as Record<string, MonthData>;
              parsedLines = [];
            }
          }
        }

        if (parsedMonths && Object.keys(parsedMonths).length > 0) {
          onImportData(parsedMonths, parsedLines);
          setFeedback({
            type: 'success',
            message: language === 'es' ? '¡Datos importados y guardados con éxito!' : 'Data successfully imported and saved!'
          });
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setFeedback({
            type: 'error',
            message: language === 'es' ? 'Archivo no compatible. Debe ser un respaldo JSON válido de Totalero.' : 'Invalid file format. Must be a valid Totalero JSON backup.'
          });
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          message: language === 'es' ? 'Error al leer el archivo JSON.' : 'Error reading JSON file.'
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-xs text-slate-900 dark:text-neutral-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            {t.backupModalTitle}
          </h3>
          <button onClick={onClose} className="text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          
          {/* Feedback banner */}
          {feedback && (
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 animate-in fade-in duration-150 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span className="text-xs font-semibold">{feedback.message}</span>
            </div>
          )}

          {/* Exportar */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex flex-col gap-2">
            <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t.backupExport}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              {t.exportNotice}
            </p>
            <button
              onClick={handleExport}
              className="mt-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadJson}</span>
            </button>
          </div>

          {/* Importar */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 flex flex-col gap-2">
            <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {t.backupImport}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              {t.importNotice}
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.uploadJson}</span>
            </button>
          </div>

          {/* Restablecer fábrica con confirmación por palabra clave */}
          <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex flex-col gap-2">
            {!isConfirmingReset ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-neutral-500">¿Deseas reiniciar la aplicación?</span>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(true)}
                  className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t.resetData}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex flex-col gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-bold text-xs">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Confirmar Restablecimiento' : 'Confirm Reset'}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                  {isEs 
                    ? 'Esta acción sobrescribirá todos tus datos con la plantilla de ejemplo. Escribe '
                    : 'This will overwrite your data with sample data. Type '}
                  <strong className="text-amber-700 dark:text-amber-400">{targetResetConfirmation}</strong>
                  {isEs ? ' para continuar:' : ' to proceed:'}
                </p>
                <input
                  type="text"
                  value={resetConfirmWord}
                  onChange={e => setResetConfirmWord(e.target.value)}
                  placeholder={targetResetConfirmation}
                  className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingReset(false);
                      setResetConfirmWord('');
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 text-[11px] font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                  >
                    {isEs ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={!canReset}
                    onClick={() => {
                      if (!canReset) return;
                      onResetFactoryData();
                      setIsConfirmingReset(false);
                      setResetConfirmWord('');
                      onClose();
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white font-bold text-[11px] transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isEs ? 'Restablecer Plantilla' : 'Reset Template'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
