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
  computePayoffAndSavings
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

  const currentDebt = loan.initialDebt || Math.abs(transaction.amount);
  const currentMonthly = Math.abs(transaction.amount);
  const totalMonths = loan.totalTermMonths || 12;
  const currentMonthIndex = loan.currentTermMonth || 1;
  const remainingMonths = Math.max(1, totalMonths - currentMonthIndex + 1);
  const annualRate = loan.annualInterestRate || 36;

  // Simulator 1: Term reduction
  const [targetMonths, setTargetMonths] = useState<number>(Math.max(1, Math.floor(remainingMonths / 2)));
  
  // Simulator 2: Lump-sum payment
  const [lumpSum, setLumpSum] = useState<number>(0);

  // Calculations for Term Reduction:
  // Current plan remaining cost:
  const currentRemainingTotalCost = currentMonthly * remainingMonths;
  const currentRemainingInterest = Math.max(0, currentRemainingTotalCost - currentDebt);

  // New plan with fewer months:
  const newMonthlyRequired = calculateAmortizationMonthlyPayment(
    currentDebt,
    annualRate,
    targetMonths
  );
  const newPlanTotalCost = newMonthlyRequired * targetMonths;
  const newPlanInterest = Math.max(0, newPlanTotalCost - currentDebt);
  const totalInterestSaved = Math.max(0, currentRemainingTotalCost - newPlanTotalCost);

  // Calculations for Lump-sum & Immediate Payoff:
  const debtAfterLumpSum = Math.max(0, currentDebt - lumpSum);
  const autoPayoff = computePayoffAndSavings({
    originalPrincipal: loan.originalPrincipal || 0,
    totalToPay: loan.totalToPay || (currentMonthly * totalMonths),
    totalTerm: totalMonths,
    currentTerm: currentMonthIndex,
    initialDebt: currentDebt
  });
  const immediateLiquidationDiscount = autoPayoff.payoffAmount > 0 
    ? autoPayoff.payoffAmount 
    : (loan.payoffDiscount || Math.round(currentDebt * 0.85));
  const immediateLiquidationSavings = autoPayoff.interestSaved > 0
    ? autoPayoff.interestSaved
    : (loan.interestSaved || Math.max(0, currentRemainingTotalCost - immediateLiquidationDiscount));

  // Action: Apply new monthly to current row
  const handleApplyTermReduction = () => {
    const updated: Transaction = {
      ...transaction,
      amount: -Math.round(newMonthlyRequired * 100) / 100,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {t.simulatorTitle}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {loan.institutionName} · Cuota {currentMonthIndex} de {totalMonths}
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

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 text-xs">
          
          {/* Tarjetas de Diagnóstico Actual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block mb-1">{t.currentBalance}</span>
              <span className="text-sm sm:text-base font-extrabold font-mono text-white tabular-nums">
                {formatCurrency(currentDebt)}
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block mb-1">{t.currentMonthly}</span>
              <span className="text-sm sm:text-base font-extrabold font-mono text-neutral-200 tabular-nums">
                {formatCurrency(currentMonthly)}
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block mb-1">{t.remainingTerms}</span>
              <span className="text-sm sm:text-base font-extrabold font-mono text-amber-400 tabular-nums">
                {remainingMonths} {t.monthsUnit}
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block mb-1">Tasa Anual (APR)</span>
              <span className="text-sm sm:text-base font-extrabold font-mono text-sky-400 tabular-nums">
                {annualRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* SIMULADOR 1: ¿Cuánto te ahorras pagando en menos meses? */}
          <div className="bg-neutral-950/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {t.simulatorSection1}
              </h4>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-neutral-300">
                <span>{t.newTermLabel} <strong>{targetMonths} {t.monthsUnit}</strong> (en vez de {remainingMonths})</span>
                <span className="font-mono text-xs text-neutral-400">
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
                className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>1 mes (Ultra rápido)</span>
                <span>{Math.max(1, remainingMonths - 1)} meses</span>
              </div>
            </div>

            {/* Impacto Financiero Calculado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-900/90 p-3 rounded-xl border border-neutral-800 mt-1">
              <div>
                <span className="text-[10px] text-neutral-400 block">{t.newMonthlyReq}:</span>
                <span className="text-base font-extrabold font-mono text-white tabular-nums">
                  {formatCurrency(newMonthlyRequired)}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5 font-mono">
                  +{formatCurrency(newMonthlyRequired - currentMonthly)} / mes
                </span>
              </div>

              <div className="border-l sm:border-neutral-800 sm:pl-3">
                <span className="text-[10px] text-emerald-400 block font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {t.moneySaved}:
                </span>
                <span className="text-lg font-black font-mono text-emerald-400 tabular-nums">
                  {formatCurrency(totalInterestSaved)}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  Dinero que no pagarás al banco
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyTermReduction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.applyToTable}</span>
              </button>
            </div>
          </div>

          {/* SIMULADOR 2: Abono Extraordinario a Capital & Liquidación */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {t.simulatorSection2}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-neutral-400 text-[11px] mb-1 block">
                  {t.lumpSumAmount}
                </label>
                <input
                  type="number"
                  step="100"
                  value={lumpSum || ''}
                  onChange={e => setLumpSum(parseFloat(e.target.value) || 0)}
                  placeholder="ej. 5000.00"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleApplyLumpSum}
                  disabled={lumpSum <= 0}
                  className="w-full px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-neutral-950 font-bold text-xs transition-colors"
                >
                  Aplicar Abono a Capital
                </button>
              </div>
            </div>

            {/* Liquidación Inmediata de Contado según la tasa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs mt-1 gap-2">
              <div>
                <span className="text-neutral-400 block text-[10px]">{t.immediatePayoff}</span>
                <span className="text-xs text-neutral-300 font-medium">
                  {language === 'es' 
                    ? `Finiquito de capital insoluto (ahorro de ${formatCurrency(immediateLiquidationSavings)} en intereses)` 
                    : `Settlement balance (saves ${formatCurrency(immediateLiquidationSavings)} in interest charges)`}
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold font-mono text-base text-amber-300 tabular-nums block">
                  {formatCurrency(immediateLiquidationDiscount)}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {language === 'es' ? 'Ahorro: ' : 'Saved: '}{formatCurrency(immediateLiquidationSavings)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs"
          >
            {t.btnCancel}
          </button>
        </div>

      </div>
    </div>
  );
};
