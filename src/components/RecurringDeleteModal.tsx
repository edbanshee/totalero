import React from 'react';
import { 
  X, 
  Trash2, 
  FastForward, 
  Rewind, 
  AlertTriangle, 
  Repeat,
  Calendar
} from 'lucide-react';
import { Transaction, Language } from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES } from '../utils/translations';
import { formatCurrency } from '../utils/calculations';

export type RecurringDeleteAction = 'single' | 'forward' | 'backward' | 'all';

interface RecurringDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  selectedMonth: number;
  year: number;
  language: Language;
  onConfirm: (action: RecurringDeleteAction, tx: Transaction) => void;
}

export const RecurringDeleteModal: React.FC<RecurringDeleteModalProps> = ({
  isOpen,
  onClose,
  transaction,
  selectedMonth,
  year,
  language,
  onConfirm
}) => {
  const t = TRANSLATIONS[language];

  if (!isOpen || !transaction) return null;

  const monthName = MONTH_NAMES[language][selectedMonth];
  const isIncome = transaction.amount > 0;
  const isZero = transaction.amount === 0;
  const isAnnual = transaction.recurrenceFrequency === 'annual';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-neutral-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Repeat className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {isAnnual ? t.recurringDeleteAnnualTitle : t.recurringDeleteTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {isAnnual ? t.recurringDeleteAnnualSubtitle : t.recurringDeleteSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen del pago seleccionado */}
        <div className="p-4 bg-slate-50 dark:bg-neutral-950/50 border-b border-slate-200 dark:border-neutral-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-bold text-xs shadow-xs flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">↻</span>
              <span>{isAnnual ? (language === 'es' ? 'Servicio Anual' : 'Annual Service') : transaction.label}</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-sm">
                {transaction.concept}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
                {monthName} {year} · Día {transaction.day}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">
              {isAnnual 
                ? (language === 'es' ? 'Monto anual' : 'Annual amount') 
                : (language === 'es' ? 'Monto recurrente' : 'Recurring amount')}
            </span>
            <span className={`font-black text-sm tabular-nums ${
              isIncome 
                ? 'text-emerald-700 dark:text-emerald-400' 
                : isZero 
                  ? 'text-slate-500 dark:text-neutral-400' 
                  : 'text-slate-900 dark:text-white'
            }`}>
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>

        {/* Opciones interactivas de eliminación */}
        <div className="p-5 flex flex-col gap-3 text-xs">
          
          {/* Opción 1: Borrar solo este mes / año */}
          <button
            type="button"
            onClick={() => onConfirm('single', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50 dark:bg-neutral-950/60 hover:bg-slate-100 dark:hover:bg-neutral-800/40 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 shrink-0 mt-0.5 group-hover:text-slate-900 dark:group-hover:text-white">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  {isAnnual 
                    ? `${t.optRecDeleteAnnualSingle} (${year})` 
                    : `${t.optRecDeleteSingle} (${monthName} ${year})`}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold uppercase tracking-wider">
                  {isAnnual ? (language === 'es' ? '1 AÑO' : '1 YEAR') : (language === 'es' ? '1 MES' : '1 MONTH')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {isAnnual ? t.optRecDeleteAnnualSingleDesc : t.optRecDeleteSingleDesc}
              </p>
            </div>
          </button>

          {/* Opción 2: Borrar de aquí en adelante (Hacia adelante / Futuros) */}
          <button
            type="button"
            onClick={() => onConfirm('forward', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-amber-300 dark:border-amber-500/20 hover:border-amber-400 dark:hover:border-amber-500/40 bg-amber-50/70 dark:bg-amber-500/5 hover:bg-amber-100/70 dark:hover:bg-amber-500/10 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
              <FastForward className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  {isAnnual ? t.optRecDeleteAnnualForward : t.optRecDeleteForward}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-bold uppercase tracking-wider">
                  {isAnnual ? (language === 'es' ? 'AÑOS FUTUROS' : 'FUTURE YEARS') : (language === 'es' ? 'FUTUROS' : 'FUTURE')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {isAnnual ? t.optRecDeleteAnnualForwardDesc : t.optRecDeleteForwardDesc}
              </p>
            </div>
          </button>

          {/* Opción 3: Borrar este y anteriores (Hacia atrás / Pasados) */}
          <button
            type="button"
            onClick={() => onConfirm('backward', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50 dark:bg-neutral-950/60 hover:bg-slate-100 dark:hover:bg-neutral-800/40 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-400 shrink-0 mt-0.5 group-hover:text-slate-900 dark:group-hover:text-white">
              <Rewind className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white block">
                  {isAnnual ? t.optRecDeleteAnnualBackward : t.optRecDeleteBackward}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold uppercase tracking-wider">
                  {isAnnual ? (language === 'es' ? 'AÑOS PASADOS' : 'PAST YEARS') : (language === 'es' ? 'PASADOS' : 'PAST')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {isAnnual ? t.optRecDeleteAnnualBackwardDesc : t.optRecDeleteBackwardDesc}
              </p>
            </div>
          </button>

          {/* Opción 4: Borrar en todo el catálogo (Completo) */}
          <button
            type="button"
            onClick={() => onConfirm('all', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-rose-300 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/40 bg-rose-50/70 dark:bg-rose-500/5 hover:bg-rose-100/70 dark:hover:bg-rose-500/10 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-800 dark:text-rose-300 block">
                  {isAnnual ? t.optRecDeleteAnnualAll : t.optRecDeleteAll}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 font-bold uppercase tracking-wider">
                  {isAnnual ? (language === 'es' ? 'TODOS LOS AÑOS' : 'ALL YEARS') : (language === 'es' ? 'TODO' : 'ALL')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {isAnnual ? t.optRecDeleteAnnualAllDesc : t.optRecDeleteAllDesc}
              </p>
            </div>
          </button>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {t.btnCancel}
          </button>
        </div>

      </div>
    </div>
  );
};
