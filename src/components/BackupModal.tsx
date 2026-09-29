import React, { useRef, useState } from 'react';
import { X, Download, Upload, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Language, MonthData, CreditLine } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';

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

  if (!isOpen) return null;

  const handleExport = () => {
    const exportPayload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      months: monthsData,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <h3 className="text-base font-bold text-white tracking-tight">
            {t.backupModalTitle}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          
          {/* Feedback banner */}
          {feedback && (
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 animate-in fade-in duration-150 ${
              feedback.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="text-xs font-semibold">{feedback.message}</span>
            </div>
          )}

          {/* Exportar */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              {t.backupExport}
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {t.exportNotice}
            </p>
            <button
              onClick={handleExport}
              className="mt-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadJson}</span>
            </button>
          </div>

          {/* Importar */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-sky-400" />
              {t.backupImport}
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
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
              className="mt-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.uploadJson}</span>
            </button>
          </div>

          {/* Restablecer fábrica */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">¿Deseas reiniciar la aplicación?</span>
            <button
              onClick={() => {
                if (window.confirm(language === 'es' ? '¿Restablecer datos de ejemplo iniciales?' : 'Reset to initial sample data?')) {
                  onResetFactoryData();
                  onClose();
                }
              }}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t.resetData}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
