import React from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Calendar,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Transaction, TransactionLabel, Language } from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES } from '../utils/translations';
import { formatCurrency } from '../utils/calculations';

interface SingleDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  selectedMonth: number;
  year: number;
  language: Language;
  onConfirm: (tx: Transaction) => void;
}

const CATEGORY_COLORS: Record<TransactionLabel, { bg: string; text: string; border: string }> = {
  Ingreso: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-500/30'
  },
  Gasto: {
    bg: 'bg-rose-100 dark:bg-rose-500/20',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-500/30'
  },
  Suscripción: {
    bg: 'bg-blue-100 dark:bg-blue-500/20',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-500/30'
  },
  Servicio: {
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-500/30'
  },
  Préstamo: {
    bg: 'bg-purple-100 dark:bg-purple-500/20',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-500/30'
  },
  Crédito: {
    bg: 'bg-indigo-100 dark:bg-indigo-500/20',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-500/30'
  },
  Neto: {
    bg: 'bg-teal-100 dark:bg-teal-500/20',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-300 dark:border-teal-500/30'
  },
  Coppel: {
    bg: 'bg-yellow-100 dark:bg-yellow-500/20',
    text: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-500/30'
  },
  Otro: {
    bg: 'bg-slate-100 dark:bg-neutral-800',
    text: 'text-slate-800 dark:text-neutral-300',
    border: 'border-slate-300 dark:border-neutral-700'
  }
};

export const SingleDeleteModal: React.FC<SingleDeleteModalProps> = ({
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
  const catStyle = CATEGORY_COLORS[transaction.label] || CATEGORY_COLORS.Otro;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-neutral-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t.singleDeleteTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {t.singleDeleteSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la transacción seleccionada */}
        <div className="p-4 bg-slate-50/70 dark:bg-neutral-950/50 border-b border-slate-200 dark:border-neutral-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
              <Tag className="w-3 h-3 stroke-[2.5]" />
              <span>{transaction.label}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white block text-sm truncate">
                  {transaction.concept}
                </span>
                {transaction.isDone && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-500/30 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    {language === 'es' ? 'Hecho' : 'Done'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
                {monthName} {year} · {language === 'es' ? 'Día' : 'Day'} {transaction.day}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">
              {language === 'es' ? 'Monto registrado' : 'Recorded amount'}
            </span>
            <span className={`font-black text-sm tabular-nums ${
              isIncome 
                ? 'text-emerald-700 dark:text-emerald-400' 
                : isZero 
                  ? 'text-slate-500 dark:text-neutral-400' 
                  : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(transaction.amount)}
            </span>
            {transaction.actualAmount !== null && (
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 block tabular-nums">
                {language === 'es' ? 'Real:' : 'Actual:'} {formatCurrency(transaction.actualAmount)}
              </span>
            )}
          </div>
        </div>

        {/* Mensaje de confirmación & Recálculo */}
        <div className="p-5 flex flex-col gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px]">
              <p className="font-semibold text-amber-950 dark:text-amber-200 mb-1">
                {language === 'es' 
                  ? `Se eliminará únicamente del mes de ${monthName} (${year})`
                  : `Will be removed only from ${monthName} (${year})`}
              </p>
              <p className="text-amber-800 dark:text-amber-300/90">
                {t.singleDeleteRecalculateNotice}
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-slate-50 dark:bg-neutral-950/70 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            {t.singleDeleteCancelBtn}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(transaction);
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.singleDeleteConfirmBtn}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
