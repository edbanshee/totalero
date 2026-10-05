import React, { useState } from 'react';
import { 
  X, 
  Calculator, 
  TrendingDown, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  DollarSign,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Transaction, Language } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { 
  formatCurrency, 
  calculateAmortizationMonthlyPayment,
  computePayoffAndSavings,
  estimateAPRFromTotal
} from '../utils/calculations';

interface AmortizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  language: Language;
  onApplyAdjustment: (updatedTx: Transaction) => void;
}

export const AmortizationModal: React.FC<AmortizationModalProps> = ({
  isOpen,
  onClose,
  transaction,
  language,
  onApplyAdjustment
}) => {
  const t = TRANSLATIONS[language];
  const loan = transaction.loanDetails;

  if (!isOpen || !loan) return null;

  const currentDebt = (loan.initialDebt && loan.initialDebt > 0)
    ? loan.initialDebt
    : Math.abs(transaction.amount) * Math.max(1, (loan.totalTermMonths || 12) - (loan.currentTermMonth || 1) + 1);
  const currentMonthly = Math.abs(transaction.amount);
  const totalMonths = loan.totalTermMonths || 12;
  const currentMonthIndex = loan.currentTermMonth || 1;
  const remainingMonths = Math.max(1, totalMonths - currentMonthIndex + 1);

  // Determinar la tasa anual real o estimada del crédito
  let annualRate = loan.annualInterestRate || 0;
  if (!annualRate || annualRate <= 0) {
    if (loan.originalPrincipal && loan.totalToPay && loan.totalTermMonths) {
      const estimated = estimateAPRFromTotal(loan.originalPrincipal, loan.totalToPay, loan.totalTermMonths);
      annualRate = estimated.apr;
    } else {
      annualRate = 36;
    }
  }

  // Simulator 1: Term reduction
  const [targetMonths, setTargetMonths] = useState<number>(Math.max(1, Math.floor(remainingMonths / 2)));
  
  // Simulator 2: Lump-sum payment
  const [lumpSum, setLumpSum] = useState<number>(0);

  // 1. Cálculos de Liquidación Inmediata y Capital Insoluto
  const autoPayoff = computePayoffAndSavings({
    originalPrincipal: loan.originalPrincipal || 0,
    totalToPay: loan.totalToPay || (currentMonthly * totalMonths),
    totalTerm: totalMonths,
    currentTerm: currentMonthIndex,
    initialDebt: currentDebt
  });

  const currentRemainingTotalCost = currentMonthly * remainingMonths;

  const immediateLiquidationDiscount = autoPayoff.payoffAmount > 0 
    ? autoPayoff.payoffAmount 
    : (loan.payoffDiscount || Math.round(currentDebt * 0.85));

  const immediateLiquidationSavings = autoPayoff.interestSaved > 0
    ? autoPayoff.interestSaved
    : (loan.interestSaved || Math.max(0, Math.round((currentRemainingTotalCost - immediateLiquidationDiscount) * 100) / 100));

  // Capital insoluto pendiente (Principal real a amortizar en el nuevo plazo reducido)
  const remainingPrincipal = autoPayoff.payoffAmount > 0
    ? autoPayoff.payoffAmount
    : (loan.payoffDiscount && loan.payoffDiscount > 0
        ? loan.payoffDiscount
        : (loan.originalPrincipal && loan.originalPrincipal > 0
            ? Math.round((remainingMonths / totalMonths) * loan.originalPrincipal * 100) / 100
            : Math.round(currentDebt * 0.75 * 100) / 100));

  // 2. Cálculos para Reducción de Plazo:
  let newMonthlyRequired = currentMonthly;
  let newPlanTotalCost = currentRemainingTotalCost;
  let totalInterestSaved = 0;

  if (targetMonths >= remainingMonths) {
    newMonthlyRequired = currentMonthly;
    newPlanTotalCost = currentRemainingTotalCost;
    totalInterestSaved = 0;
  } else {
    // Se amortiza el capital insoluto pendiente en el nuevo número de meses con la tasa de interés del crédito
    newMonthlyRequired = calculateAmortizationMonthlyPayment(
      remainingPrincipal,
      annualRate,
      targetMonths
    );

    // Aseguramos que la mensualidad mínima cubra el capital dividido
    if (newMonthlyRequired < remainingPrincipal / targetMonths) {
      newMonthlyRequired = remainingPrincipal / targetMonths;
    }

    newPlanTotalCost = newMonthlyRequired * targetMonths;
    totalInterestSaved = Math.max(0, Math.round((currentRemainingTotalCost - newPlanTotalCost) * 100) / 100);
  }

  // 3. Cálculos para Abono Extraordinario a Capital:
  const debtAfterLumpSum = Math.max(0, currentDebt - lumpSum);

  // Action: Apply new monthly to current row
  const handleApplyTermReduction = () => {
    const isRec = loan.loanType === 'receivable' || transaction.amount > 0 || transaction.label === 'Ingreso';
    const finalAmount = isRec 
      ? Math.round(newMonthlyRequired * 100) / 100 
      : -Math.round(newMonthlyRequired * 100) / 100;

    const updated: Transaction = {
      ...transaction,
      amount: finalAmount,
      loanDetails: {
        ...loan,
        totalTermMonths: currentMonthIndex + targetMonths - 1,
        interestSaved: Math.round(totalInterestSaved),
        payoffDiscount: immediateLiquidationDiscount
      }
    };
    onApplyAdjustment(updated);
    onClose();
  };

  const handleApplyLumpSum = () => {
    if (lumpSum <= 0) return;
    const updated: Transaction = {
      ...transaction,
      loanDetails: {
        ...loan,
        initialDebt: debtAfterLumpSum,
        finalDebt: Math.max(0, debtAfterLumpSum - currentMonthly),
        interestSaved: (loan.interestSaved || 0) + Math.round(lumpSum * 0.15)
      }
    };
    onApplyAdjustment(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-slate-900 dark:text-neutral-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {t.simulatorTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {loan.institutionName} · Cuota {currentMonthIndex} de {totalMonths}
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

        {/* Content */}
        <div className="p-5 flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 text-xs scrollbar-thin">
          
          {/* Tarjetas de Diagnóstico Actual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-1 font-medium">{t.currentBalance}</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(currentDebt)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-1 font-medium">{t.currentMonthly}</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-neutral-200 tabular-nums">
                {formatCurrency(currentMonthly)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-1 font-medium">{t.remainingTerms}</span>
              <span className="text-sm sm:text-base font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                {remainingMonths} {t.monthsUnit}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-1 font-medium">Tasa Anual (APR)</span>
              <span className="text-sm sm:text-base font-extrabold text-sky-700 dark:text-sky-400 tabular-nums">
                {annualRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* SIMULADOR 1: ¿Cuánto te ahorras pagando en menos meses? */}
          <div className="bg-slate-50/70 dark:bg-neutral-950/80 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t.simulatorSection1}
              </h4>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300">
                <span>{t.newTermLabel} <strong className="text-slate-900 dark:text-white font-bold">{targetMonths} {t.monthsUnit}</strong> (en vez de {remainingMonths})</span>
                <span className="text-xs text-slate-500 dark:text-neutral-400 font-semibold tabular-nums">
                  -{remainingMonths - targetMonths} meses
                </span>
              </div>

              {/* Slider interactivo */}
              <input
                type="range"
                min={1}
                max={Math.max(1, remainingMonths - 1)}
                value={targetMonths}
                onChange={e => setTargetMonths(Number(e.target.value))}
                className="w-full accent-emerald-600 dark:accent-emerald-500 h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-500 dark:text-neutral-500">
                <span>1 mes (Ultra rápido)</span>
                <span>{Math.max(1, remainingMonths - 1)} meses</span>
              </div>
            </div>

            {/* Impacto Financiero Calculado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-neutral-900/90 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 mt-1 shadow-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">{t.newMonthlyReq}:</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(newMonthlyRequired)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-500 block mt-0.5 tabular-nums">
                  +{formatCurrency(newMonthlyRequired - currentMonthly)} / mes
                </span>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-neutral-800 pt-2 sm:pt-0 sm:pl-3">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {t.moneySaved}:
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(totalInterestSaved)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                  Dinero que no pagarás al banco
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyTermReduction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.applyToTable}</span>
              </button>
            </div>
          </div>

          {/* SIMULADOR 2: Abono Extraordinario a Capital & Liquidación */}
          <div className="bg-slate-50/70 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t.simulatorSection2}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-slate-700 dark:text-neutral-400 text-[11px] mb-1 block font-semibold">
                  {t.lumpSumAmount}
                </label>
                <input
                  type="number"
                  step="100"
                  value={lumpSum || ''}
                  onChange={e => setLumpSum(parseFloat(e.target.value) || 0)}
                  placeholder="ej. 5000.00"
                  className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleApplyLumpSum}
                  disabled={lumpSum <= 0}
                  className="w-full px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors shadow-xs"
                >
                  Aplicar Abono a Capital
                </button>
              </div>
            </div>

            {/* Liquidación Inmediata de Contado según la tasa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-xs mt-1 gap-2 shadow-xs">
              <div>
                <span className="text-slate-500 dark:text-neutral-400 block text-[10px] font-medium">{t.immediatePayoff}</span>
                <span className="text-xs text-slate-700 dark:text-neutral-300 font-medium">
                  {language === 'es' 
                    ? `Finiquito de capital insoluto (ahorro de ${formatCurrency(immediateLiquidationSavings)} en intereses)` 
                    : `Settlement balance (saves ${formatCurrency(immediateLiquidationSavings)} in interest charges)`}
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-base text-amber-800 dark:text-amber-300 tabular-nums block">
                  {formatCurrency(immediateLiquidationDiscount)}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                  {language === 'es' ? 'Ahorro: ' : 'Saved: '}{formatCurrency(immediateLiquidationSavings)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {t.btnCancel}
          </button>
        </div>

      </div>
    </div>
  );
};
