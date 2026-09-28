import React from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Building2, 
  CreditCard, 
  AlertCircle 
} from 'lucide-react';
import { Language } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { MonthTotals, formatCurrency } from '../utils/calculations';

interface MetricCardsProps {
  totals: MonthTotals;
  totalLiquidity: number;
  language: Language;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totals,
  totalLiquidity,
  language
}) => {
  const t = TRANSLATIONS[language];

  const totalWithLoans = totals.endOfMonthTotal + totalLiquidity;
  const projectedDifference = totals.endOfMonthTotal - totals.totalActual;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
      {/* 1. Total Actual (Real money now) */}
      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-sm">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-neutral-300">{t.totalActual}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-semibold border border-emerald-500/20">
            {totals.doneCount} / {totals.totalTransactionsCount}
          </span>
        </div>
        
        <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight my-1 tabular-nums">
          {formatCurrency(totals.totalActual)}
        </div>
        
        <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
          <span>{t.realMoneyNow}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </div>
      </div>

      {/* 2. Total Fin de Mes (Projected end of month) */}
      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-sm">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-neutral-300">{t.totalEndOfMonth}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono text-[11px] font-semibold border border-sky-500/20">
            100% Proj
          </span>
        </div>

        <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight my-1 tabular-nums">
          {formatCurrency(totals.endOfMonthTotal)}
        </div>

        <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
          <span>{t.projDifference}:</span>
          <span className="font-mono text-neutral-300 font-medium tabular-nums">
            {formatCurrency(projectedDifference)}
          </span>
        </div>
      </div>

      {/* 3. Total con Préstamos (End of month + Liquidity Pool) */}
      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-sm">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-neutral-300">{t.totalWithLoans}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-semibold border border-emerald-500/20">
            {t.finPlusLiquidity}
          </span>
        </div>

        <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight my-1 tabular-nums">
          {formatCurrency(totalWithLoans)}
        </div>

        <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
          <span>{t.capitalAvailable}:</span>
          <span className="font-mono text-emerald-400 font-semibold tabular-nums">
            +{formatCurrency(totalLiquidity)}
          </span>
        </div>
      </div>

      {/* 4. Línea de Préstamos (Available credit lines pool) */}
      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-sm">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-neutral-300">{t.loanLine}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[11px] font-semibold border border-amber-500/20">
            Líneas
          </span>
        </div>

        <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight my-1 tabular-nums">
          {formatCurrency(totalLiquidity)}
        </div>

        <div className="text-[11px] text-neutral-400 mt-1 truncate" title={t.availableInCredit}>
          {t.availableInCredit}
        </div>
      </div>

      {/* 5. Deuda Activa en Mes */}
      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-sm">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-neutral-300">{t.activeDebt}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono text-[11px] font-semibold border border-rose-500/20">
            {t.balances}
          </span>
        </div>

        <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight my-1 tabular-nums">
          {formatCurrency(totals.totalFinalDebt)}
        </div>

        <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
          <span>{t.initialDebtLabel}:</span>
          <span className="font-mono text-neutral-300 tabular-nums">
            {formatCurrency(totals.totalInitialDebt)}
          </span>
        </div>
      </div>
    </div>
  );
};
