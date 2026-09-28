import React from 'react';
import { 
  X, 
  Trash2, 
  FastForward, 
  Rewind, 
  SkipForward, 
  Building2, 
  AlertTriangle, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { Transaction, Language } from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES } from '../utils/translations';
import { formatCurrency } from '../utils/calculations';

export type LoanDeleteAction = 'single' | 'forward' | 'backward' | 'skip_and_double' | 'all';

interface LoanDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  selectedMonth: number;
  year: number;
  language: Language;
  onConfirm: (action: LoanDeleteAction, tx: Transaction) => void;
}

export const LoanDeleteModal: React.FC<LoanDeleteModalProps> = ({
  isOpen,
  onClose,
  transaction,
  selectedMonth,
  year,
  language,
  onConfirm
}) => {
  const t = TRANSLATIONS[language];

  if (!isOpen || !transaction || !transaction.loanDetails) return null;

  const loan = transaction.loanDetails;
  const monthName = MONTH_NAMES[language][selectedMonth];
  const monthlyAmount = Math.abs(transaction.amount);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {t.loanDeleteTitle}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {t.loanDeleteSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la cuota seleccionada */}
        <div className="p-4 bg-neutral-950/50 border-b border-neutral-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-amber-300 font-mono font-bold text-xs">
              {loan.currentTermMonth} / {loan.totalTermMonths}
            </div>
            <div>
              <span className="font-bold text-white block">
                {transaction.concept}
              </span>
              <span className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5 font-mono">
                <Calendar className="w-3 h-3 text-neutral-500" />
                {monthName} {year} · Día {transaction.day}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block font-medium">Pago del mes</span>
            <span className="font-mono font-bold text-white text-sm tabular-nums">
              {formatCurrency(monthlyAmount)}
            </span>
          </div>
        </div>

        {/* Opciones interactivas */}
        <div className="p-5 flex flex-col gap-3 text-xs">
          
          {/* Opción Destacada: SALTAR ESTE MES Y PAGAR DOBLE EL SIGUIENTE */}
          <button
            type="button"
            onClick={() => onConfirm('skip_and_double', transaction)}
            className="group flex items-start gap-3.5 p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-left transition-all hover:scale-[1.01]"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 group-hover:bg-indigo-500/30">
              <SkipForward className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white group-hover:text-indigo-200">
                  {t.optSkipMonth}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  {language === 'es' ? 'FLEXIBILIDAD' : 'FLEXIBILITY'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                {t.optSkipMonthDesc}
              </p>
              <div className="mt-2 text-[10px] font-mono text-indigo-300 flex items-center gap-2">
                <span>{monthName}: <strong>$ 0.00</strong></span>
                <span>→</span>
                <span>{language === 'es' ? 'Próximo mes' : 'Next month'}: <strong>{formatCurrency(monthlyAmount * 2)}</strong></span>
              </div>
            </div>
          </button>

          {/* Opción 1: Borrar solo esta cuota */}
          <button
            type="button"
            onClick={() => onConfirm('single', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-950/60 hover:bg-neutral-800/40 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5 group-hover:text-white">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white block">
                {t.optDeleteSingle}
              </span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {t.optDeleteSingleDesc}
              </p>
            </div>
          </button>

          {/* Opción 2: Borrar esta cuota y todas las siguientes (Futuras) */}
          <button
            type="button"
            onClick={() => onConfirm('forward', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <FastForward className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white block">
                {t.optDeleteForward}
              </span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {t.optDeleteForwardDesc}
              </p>
            </div>
          </button>

          {/* Opción 3: Borrar esta cuota y todas las anteriores (Pasadas) */}
          <button
            type="button"
            onClick={() => onConfirm('backward', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-950/60 hover:bg-neutral-800/40 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0 mt-0.5 group-hover:text-white">
              <Rewind className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white block">
                {t.optDeleteBackward}
              </span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {t.optDeleteBackwardDesc}
              </p>
            </div>
          </button>

          {/* Opción 4: Borrar todo el crédito completo */}
          <button
            type="button"
            onClick={() => onConfirm('all', transaction)}
            className="group flex items-start gap-3.5 p-3 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-left transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-rose-300 block">
                {t.optDeleteAll}
              </span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {t.optDeleteAllDesc}
              </p>
            </div>
          </button>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
          >
            {t.btnCancel}
          </button>
        </div>

      </div>
    </div>
  );
};
