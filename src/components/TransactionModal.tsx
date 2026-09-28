import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  HelpCircle, 
  Calculator, 
  Calendar, 
  Percent, 
  Building2, 
  Sparkles 
} from 'lucide-react';
import { 
  Transaction, 
  TransactionLabel, 
  RowHighlight, 
  Language, 
  LoanDetails 
} from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { 
  getDateString, 
  calculateAmortizationMonthlyPayment, 
  estimateAPRFromTotal, 
  computeComprehensiveLoan,
  computePayoffAndSavings,
  deduceLoanFromPayoff,
  formatCurrency 
} from '../utils/calculations';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>, loanTermAdjustment?: {
    loanId: string;
    oldTerm: number;
    newTerm: number;
    monthlyPayment: number;
    institution: string;
    day: number;
    startMonth: number;
    startYear: number;
  }) => void;
  initialData?: Transaction | null;
  selectedMonth: number;
  year: number;
  language: Language;
}

const LABELS: TransactionLabel[] = [
  'Ingreso', 'Gasto', 'Servicio', 'Neto', 'Coppel', 'Préstamo', 'Otro'
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  selectedMonth,
  year,
  language
}) => {
  const t = TRANSLATIONS[language];

  // Form states
  const [label, setLabel] = useState<TransactionLabel>('Gasto');
  const [concept, setConcept] = useState('');
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [sign, setSign] = useState<'income' | 'expense'>('expense');
  const [day, setDay] = useState<number>(15);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [actualAmountRaw, setActualAmountRaw] = useState<string>('');
  const [highlight, setHighlight] = useState<RowHighlight>('none');

  // Loan states
  const [hasLoan, setHasLoan] = useState<boolean>(false);
  const [loanInstitution, setLoanInstitution] = useState('');
  const [totalTerm, setTotalTerm] = useState<number>(12);
  const [currentTerm, setCurrentTerm] = useState<number>(1);
  const [originalPrincipal, setOriginalPrincipal] = useState<number>(0);
  const [initialDebt, setInitialDebt] = useState<number>(0);
  const [calcMode, setCalcMode] = useState<'totalPay' | 'interestRate'>('totalPay');
  const [totalToPay, setTotalToPay] = useState<number>(0);
  const [annualRate, setAnnualRate] = useState<number>(36);

  // Calculated loan metrics
  const [calcMonthly, setCalcMonthly] = useState<number>(0);
  const [calcMonthlyInterest, setCalcMonthlyInterest] = useState<number>(0);
  const [calcMonthlyInterestRate, setCalcMonthlyInterestRate] = useState<number>(0);
  const [calcAPR, setCalcAPR] = useState<number>(0);
  const [calcTotalInterest, setCalcTotalInterest] = useState<number>(0);
  const [calcFinalDebt, setCalcFinalDebt] = useState<number>(0);
  const [calcTheoreticalDebt, setCalcTheoreticalDebt] = useState<number>(0);
  const [calcPayoff, setCalcPayoff] = useState<number>(0);
  const [calcInterestSaved, setCalcInterestSaved] = useState<number>(0);
  const [payoffDiscountRaw, setPayoffDiscountRaw] = useState<string>('');

  // Pre-fill if editing
  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label);
      setConcept(initialData.concept);
      const isNegative = initialData.amount < 0;
      setSign(isNegative ? 'expense' : 'income');
      setAmountRaw(Math.abs(initialData.amount).toString());
      setDay(initialData.day || 15);
      setIsRecurring(initialData.isRecurring || false);
      setIsDone(initialData.isDone || false);
      setActualAmountRaw(initialData.actualAmount !== null && initialData.actualAmount !== undefined ? Math.abs(initialData.actualAmount).toString() : '');
      setHighlight(initialData.highlight || 'none');

      if (initialData.loanDetails) {
        setHasLoan(true);
        setLoanInstitution(initialData.loanDetails.institutionName);
        setTotalTerm(initialData.loanDetails.totalTermMonths || 12);
        setCurrentTerm(initialData.loanDetails.currentTermMonth || 1);
        setOriginalPrincipal(initialData.loanDetails.originalPrincipal || 0);
        setInitialDebt(initialData.loanDetails.initialDebt || 0);
        setCalcMode(initialData.loanDetails.mode || 'totalPay');
        setTotalToPay(initialData.loanDetails.totalToPay || 0);
        setAnnualRate(initialData.loanDetails.annualInterestRate || 36);
        setPayoffDiscountRaw(initialData.loanDetails.payoffDiscount ? initialData.loanDetails.payoffDiscount.toString() : '');
      } else {
        setHasLoan(false);
        setPayoffDiscountRaw('');
      }
    } else {
      // Default new transaction
      setLabel('Gasto');
      setConcept('');
      setAmountRaw('');
      setSign('expense');
      setDay(15);
      setIsRecurring(false);
      setIsDone(false);
      setActualAmountRaw('');
      setHighlight('none');
      setHasLoan(false);
      setLoanInstitution('');
      setTotalTerm(12);
      setCurrentTerm(1);
      setOriginalPrincipal(0);
      setInitialDebt(0);
      setTotalToPay(0);
      setAnnualRate(36);
      setPayoffDiscountRaw('');
    }
  }, [initialData, isOpen]);

  // Recalcular métricas de préstamo en tiempo real
  useEffect(() => {
    if (!hasLoan) return;

    const userPayment = Math.abs(parseFloat(amountRaw) || 0);

    const res = computeComprehensiveLoan({
      currentTerm,
      totalTerm,
      monthInitialDebt: initialDebt,
      calcMode,
      originalPrincipalInput: originalPrincipal,
      totalToPayInput: totalToPay,
      annualRateInput: annualRate,
      userAmount: userPayment
    });

    setCalcAPR(res.apr);
    setCalcTotalInterest(res.totalInterest);
    setCalcMonthly(res.monthlyPayment);
    setCalcMonthlyInterest(res.monthlyInterest);
    setCalcMonthlyInterestRate(res.monthlyInterestRate);
    setCalcTheoreticalDebt(res.theoreticalInitialDebtForCurrentTerm);
    setCalcPayoff(res.payoffAmount);
    setCalcInterestSaved(res.interestSaved);

    // Cálculo EXACTO de restante de deuda: Deuda Inicial - Monto a Pagar
    const activeInitial = initialDebt > 0 ? initialDebt : res.theoreticalInitialDebtForCurrentTerm;
    const activePayment = userPayment > 0 ? userPayment : res.monthlyPayment;
    const exactRemaining = Math.max(0, activeInitial - activePayment);
    setCalcFinalDebt(Math.round(exactRemaining * 100) / 100);

    // Si el usuario aún no ha puesto deuda inicial manual (está en 0), sincronizar con el teórico de la cuota
    if (initialDebt === 0 && res.theoreticalInitialDebtForCurrentTerm > 0) {
      setInitialDebt(res.theoreticalInitialDebtForCurrentTerm);
    }
  }, [hasLoan, calcMode, originalPrincipal, totalToPay, annualRate, totalTerm, currentTerm, amountRaw, initialDebt]);

  // Deducción inversa: Al introducir un monto de liquidación inmediata diferente al calculado,
  // se calcula automáticamente el monto real que se pidió (originalPrincipal) y el monto total
  // a pagar original (totalToPay) utilizando la cuota actual, el saldo inicial y la liquidación.
  const handlePayoffDiscountChange = (val: string) => {
    setPayoffDiscountRaw(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && hasLoan) {
      const activeInitial = initialDebt > 0 ? initialDebt : calcTheoreticalDebt;
      const userPayment = Math.abs(parseFloat(amountRaw) || 0);
      const deduced = deduceLoanFromPayoff({
        liquidationAmount: num,
        currentTerm,
        totalTerm,
        initialDebt: activeInitial,
        monthlyPayment: userPayment
      });

      if (deduced.originalPrincipal > 0) {
        setOriginalPrincipal(deduced.originalPrincipal);
      }
      if (deduced.totalToPay > 0 && calcMode === 'totalPay') {
        setTotalToPay(deduced.totalToPay);
      }
    }
  };

  const handleInitialDebtChange = (newDebt: number) => {
    setInitialDebt(newDebt);
    const num = parseFloat(payoffDiscountRaw);
    if (!isNaN(num) && num > 0 && hasLoan) {
      const userPayment = Math.abs(parseFloat(amountRaw) || 0);
      const deduced = deduceLoanFromPayoff({
        liquidationAmount: num,
        currentTerm,
        totalTerm,
        initialDebt: newDebt,
        monthlyPayment: userPayment
      });

      if (deduced.originalPrincipal > 0) {
        setOriginalPrincipal(deduced.originalPrincipal);
      }
      if (deduced.totalToPay > 0 && calcMode === 'totalPay') {
        setTotalToPay(deduced.totalToPay);
      }
    }
  };

  // Auto-fill concept for loans if user enters institution & terms
  const handleInstitutionBlur = () => {
    if (hasLoan && loanInstitution && !concept) {
      setConcept(`${loanInstitution} ${currentTerm} de ${totalTerm}`);
    }
  };

  const handleApplyCalculatedMonthly = () => {
    if (calcMonthly > 0) {
      setAmountRaw(calcMonthly.toFixed(2));
    }
  };

  const enteredPayoffNum = parseFloat(payoffDiscountRaw) || 0;
  const isCustomPayoffDifferent = enteredPayoffNum > 0 && Math.abs(enteredPayoffNum - calcPayoff) > 0.05;
  const deducedInfo = enteredPayoffNum > 0 && hasLoan
    ? deduceLoanFromPayoff({
        liquidationAmount: enteredPayoffNum,
        currentTerm,
        totalTerm,
        initialDebt: initialDebt > 0 ? initialDebt : calcTheoreticalDebt,
        monthlyPayment: Math.abs(parseFloat(amountRaw) || 0)
      })
    : null;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.abs(parseFloat(amountRaw) || 0);
    const finalAmount = sign === 'income' ? parsedAmount : -parsedAmount;

    let parsedActual: number | null = null;
    if (isDone && actualAmountRaw.trim() !== '') {
      const absActual = Math.abs(parseFloat(actualAmountRaw) || 0);
      parsedActual = sign === 'income' ? absActual : -absActual;
    }

    const dateStr = getDateString(day, selectedMonth, language);

    let loanDetailsObj: LoanDetails | undefined = undefined;
    if (hasLoan && loanInstitution) {
      const finalInitialDebt = initialDebt > 0 ? initialDebt : calcTheoreticalDebt;
      // Cálculo exacto del restante: Deuda Inicial - Monto a pagar
      const exactFinalDebt = Math.max(0, Math.round((finalInitialDebt - parsedAmount) * 100) / 100);
      const parsedPayoff = payoffDiscountRaw.trim() !== '' ? Math.abs(parseFloat(payoffDiscountRaw) || 0) : undefined;

      let effectivePrincipal = originalPrincipal > 0 ? originalPrincipal : 0;
      let effectiveTotalToPay = totalToPay > 0 ? totalToPay : 0;

      // Si el usuario ingresó una liquidación específica y faltaba el capital o total original, deducirlos
      if (parsedPayoff && parsedPayoff > 0 && (effectivePrincipal <= 0 || effectiveTotalToPay <= 0)) {
        const deduced = deduceLoanFromPayoff({
          liquidationAmount: parsedPayoff,
          currentTerm,
          totalTerm,
          initialDebt: finalInitialDebt,
          monthlyPayment: parsedAmount
        });
        if (effectivePrincipal <= 0) effectivePrincipal = deduced.originalPrincipal;
        if (effectiveTotalToPay <= 0) effectiveTotalToPay = deduced.totalToPay;
      }

      if (effectivePrincipal <= 0) {
        effectivePrincipal = calcMode === 'totalPay' ? Math.max(0, effectiveTotalToPay * 0.75) : 0;
      }
      if (effectiveTotalToPay <= 0) {
        effectiveTotalToPay = calcMonthly * totalTerm;
      }

      // Cálculo automático de liquidación de contado y ahorro de interés según la tasa
      const { payoffAmount: autoPayoff, interestSaved: autoSavings } = computePayoffAndSavings({
        originalPrincipal: effectivePrincipal,
        totalToPay: effectiveTotalToPay,
        totalTerm,
        currentTerm,
        initialDebt: finalInitialDebt
      });

      const finalPayoff = parsedPayoff && parsedPayoff > 0 ? parsedPayoff : (autoPayoff > 0 ? autoPayoff : (calcPayoff > 0 ? calcPayoff : undefined));
      const finalInterestSaved = (parsedPayoff && parsedPayoff > 0)
        ? Math.max(0, Math.round((finalInitialDebt - parsedPayoff) * 100) / 100)
        : (autoSavings > 0 ? autoSavings : (calcInterestSaved > 0 ? calcInterestSaved : (initialData?.loanDetails?.interestSaved || undefined)));

      loanDetailsObj = {
        loanId: initialData?.loanDetails?.loanId || `loan-${Date.now()}`,
        institutionName: loanInstitution.trim(),
        totalTermMonths: totalTerm,
        currentTermMonth: currentTerm,
        originalPrincipal: effectivePrincipal,
        initialDebt: finalInitialDebt,
        finalDebt: exactFinalDebt,
        annualInterestRate: calcAPR,
        totalToPay: effectiveTotalToPay,
        totalInterest: calcTotalInterest,
        payoffDiscount: finalPayoff,
        interestSaved: finalInterestSaved,
        mode: calcMode
      };
    }

    // Check if loan term changed for multi-month propagation
    let termAdjustment = undefined;
    if (hasLoan && initialData?.loanDetails && initialData.loanDetails.totalTermMonths !== totalTerm) {
      termAdjustment = {
        loanId: initialData.loanDetails.loanId || 'loan-auto',
        oldTerm: initialData.loanDetails.totalTermMonths,
        newTerm: totalTerm,
        monthlyPayment: Math.abs(finalAmount),
        institution: loanInstitution,
        day,
        startMonth: selectedMonth,
        startYear: year
      };
    }

    onSave({
      label,
      concept: concept.trim() || (hasLoan ? `${loanInstitution} ${currentTerm} de ${totalTerm}` : 'Transacción'),
      amount: finalAmount,
      day,
      dateString: dateStr,
      isRecurring,
      isDone,
      actualAmount: parsedActual,
      highlight,
      loanDetails: loanDetailsObj
    }, termAdjustment);

    onClose();
  };

  const computedDatePreview = getDateString(day, selectedMonth, language);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {initialData ? t.modalEditTitle : t.modalAddTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 text-xs">
          
          {/* 1. Etiqueta / Tipo (Chips) */}
          <div>
            <label className="text-neutral-300 font-semibold mb-1.5 block">
              {t.fieldLabel}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LABELS.map(lbl => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setLabel(lbl)}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all border ${
                    label === lbl
                      ? 'bg-emerald-500 text-neutral-950 font-bold border-emerald-400 shadow-sm'
                      : 'bg-neutral-950/80 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Concepto & 3. Monto con Signo */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="text-neutral-300 font-semibold mb-1 block">
                {t.fieldConcept}
              </label>
              <input
                type="text"
                required
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder={t.fieldConceptPlaceholder}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="text-neutral-300 font-semibold mb-1 block">
                {t.fieldAmount}
              </label>
              <div className="flex items-center gap-1.5">
                {/* Selector de signo */}
                <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSign('expense')}
                    className={`px-2 py-1.5 rounded text-[11px] font-bold transition-all ${
                      sign === 'expense'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setSign('income')}
                    className={`px-2 py-1.5 rounded text-[11px] font-bold transition-all ${
                      sign === 'income'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    +
                  </button>
                </div>

                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountRaw}
                  onChange={e => setAmountRaw(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Fecha y 5. Recurrente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
            <div>
              <label className="text-neutral-300 font-semibold mb-1 flex items-center justify-between">
                <span>{t.fieldDay}</span>
                <span className="font-mono text-emerald-400 text-[11px]">
                  {t.fieldDateComputed}: <strong>{computedDatePreview}</strong>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={day}
                  onChange={e => setDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                  className="w-24 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                />
                <span className="text-[11px] text-neutral-400">
                  (del mes activo)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 sm:pt-0">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
              />
              <label htmlFor="isRecurring" className="text-neutral-300 select-none cursor-pointer">
                <span className="font-semibold block">{t.fieldRecurring}</span>
                <span className="text-[10px] text-neutral-400 block">{t.fieldRecurringHelp}</span>
              </label>
            </div>
          </div>

          {/* 6. ¿Vincular a Préstamo / Deuda a Plazos? */}
          <div className="border border-neutral-800 rounded-xl bg-neutral-950/40">
            <button
              type="button"
              onClick={() => setHasLoan(!hasLoan)}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors text-left rounded-t-xl"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-xs">
                  {t.fieldLinkLoan}
                </span>
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-semibold ${
                hasLoan 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'bg-neutral-800 text-neutral-400'
              }`}>
                {hasLoan ? 'ACTIVO' : 'NO'}
              </span>
            </button>

            {hasLoan && (
              <div className="p-4 sm:p-5 flex flex-col gap-4 bg-neutral-950/80 border-t border-neutral-800">
                
                {/* Banner informativo cuando la cuota actual es mayor a 1 */}
                {currentTerm > 1 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-2">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm">
                          {language === 'es' 
                            ? `Registro desde la cuota ${currentTerm} de ${totalTerm}` 
                            : `Registering from installment ${currentTerm} of ${totalTerm}`}
                        </span>
                        <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                          {language === 'es'
                            ? `Totalero creará automáticamente las ${currentTerm - 1} cuota(s) previa(s) en los meses anteriores (con sus saldos de deuda y pagos correspondientes calculados en reversa y marcadas como pagadas), además de proyectar las ${totalTerm - currentTerm} cuotas futuras restantes.`
                            : `Totalero will automatically backfill the ${currentTerm - 1} previous installment(s) in earlier months (with retroactive balances and marked as paid), plus project the remaining ${totalTerm - currentTerm} installments forward.`}
                        </p>
                      </div>
                    </div>

                    {/* Timeline pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono border-t border-amber-500/20">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40">
                        {language === 'es' ? `← Meses previos: Cuotas 1 a ${currentTerm - 1}` : `← Prior months: 1 to ${currentTerm - 1}`}
                      </span>
                      <span className="text-neutral-500">→</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        {language === 'es' ? `Mes activo: Cuota ${currentTerm}` : `Active month: ${currentTerm}`}
                      </span>
                      <span className="text-neutral-500">→</span>
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {language === 'es' ? `Futuro: Cuotas ${currentTerm + 1} a ${totalTerm}` : `Future: ${currentTerm + 1} to ${totalTerm}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Institución, Plazo y Cuota */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-neutral-300 font-semibold mb-1 block">
                      {t.fieldLoanInstitution}
                    </label>
                    <input
                      type="text"
                      required={hasLoan}
                      value={loanInstitution}
                      onChange={e => setLoanInstitution(e.target.value)}
                      onBlur={handleInstitutionBlur}
                      placeholder="ej. BanCoppel, Coppel, Nu"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-300 font-semibold mb-1 block">
                      {t.fieldTotalTerm}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={totalTerm}
                      onChange={e => setTotalTerm(parseInt(e.target.value) || 12)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-300 font-semibold mb-1 block">
                      {t.fieldCurrentTerm}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalTerm}
                      value={currentTerm}
                      onChange={e => setCurrentTerm(parseInt(e.target.value) || 1)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Calculadora de Intereses con 2 modos (Completa, sin recortes) */}
                <div className="bg-neutral-900 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-800 gap-2">
                    <div>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-amber-400" />
                        {t.calculatorModeTitle}
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {language === 'es'
                          ? 'Calcula la tasa de interés anual (APR), interés total y mensualidad sin cortes'
                          : 'Compute APR, total interest charges, and monthly payments'}
                      </p>
                    </div>

                    {/* Selector de modo */}
                    <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCalcMode('totalPay')}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                          calcMode === 'totalPay'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {t.modeA}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcMode('interestRate')}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                          calcMode === 'interestRate'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {t.modeB}
                      </button>
                    </div>
                  </div>

                  {calcMode === 'totalPay' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">{t.fieldOriginalPrincipal}</span>
                          {isCustomPayoffDifferent && deducedInfo && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-mono">
                              ⚡ {language === 'es' ? 'Deducido' : 'Deduced'}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={originalPrincipal || ''}
                          onChange={e => setOriginalPrincipal(parseFloat(e.target.value) || 0)}
                          placeholder="ej. 10000.00"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          {t.fieldOriginalPrincipalHelp}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">{t.totalToPayInput}</span>
                          {isCustomPayoffDifferent && deducedInfo && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-mono">
                              ⚡ {language === 'es' ? 'Deducido' : 'Deduced'}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={totalToPay || ''}
                          onChange={e => setTotalToPay(parseFloat(e.target.value) || 0)}
                          placeholder="ej. 14000.00"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          {t.totalToPayHelp}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">{t.fieldOriginalPrincipal}</span>
                          {isCustomPayoffDifferent && deducedInfo && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-mono">
                              ⚡ {language === 'es' ? 'Deducido' : 'Deduced'}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={originalPrincipal || ''}
                          onChange={e => setOriginalPrincipal(parseFloat(e.target.value) || 0)}
                          placeholder="ej. 10000.00"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          {t.fieldOriginalPrincipalHelp}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">{t.annualRateInput}</span>
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={annualRate || ''}
                          onChange={e => setAnnualRate(parseFloat(e.target.value) || 0)}
                          placeholder="ej. 36.0"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          {t.annualRateHelp}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Resultados Calculados en tiempo real */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-neutral-300">
                    {/* 1. Mensualidad */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                      <span className="text-[10px] text-neutral-400 block font-medium">{t.calcResultMonthly}</span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-white text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcMonthly)}
                        </span>
                        <button
                          type="button"
                          onClick={handleApplyCalculatedMonthly}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 transition-colors"
                          title="Usar esta mensualidad en el Monto de la transacción"
                        >
                          Usar en Monto
                        </button>
                      </div>
                    </div>

                    {/* 2. Interés Mensual ($) y Tasa Mensual (%) */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                      <span className="text-[10px] text-neutral-400 block font-medium">{t.calcResultMonthlyInterest}</span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-rose-400 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcMonthlyInterest)} / mes
                        </span>
                        <span className="text-[9px] text-neutral-400 block mt-0.5 font-mono">
                          Tasa: {calcMonthlyInterestRate.toFixed(2)}% mensual
                        </span>
                      </div>
                    </div>

                    {/* 3. Interés Total del Crédito */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                      <span className="text-[10px] text-neutral-400 block font-medium">{t.calcResultTotalInterest}</span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-rose-400 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcTotalInterest)}
                        </span>
                        <span className="text-[9px] text-neutral-500 block mt-0.5">
                          Total pagar - Préstamo
                        </span>
                      </div>
                    </div>

                    {/* 4. Tasa Anual (APR) */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                      <span className="text-[10px] text-neutral-400 block font-medium">{t.calcResultAPR}</span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm tabular-nums block">
                          {calcAPR.toFixed(1)}% anual
                        </span>
                        <span className="text-[9px] text-neutral-500 block mt-0.5">
                          Tasa Anual Efectiva
                        </span>
                      </div>
                    </div>

                    {/* 5. Deuda Inicial del Mes Activo */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                      <span className="text-[10px] text-neutral-400 block font-medium">Deuda Inicial de este Mes</span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(initialDebt > 0 ? initialDebt : calcTheoreticalDebt)}
                        </span>
                        <span className="text-[9px] text-neutral-500 block mt-0.5">
                          Al inicio de cuota {currentTerm} de {totalTerm}
                        </span>
                      </div>
                    </div>

                    {/* 6. Restante de Deuda Tras Pago (Cálculo Exacto) */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                      <span className="text-[10px] text-emerald-400 block font-medium">{t.calcResultFinalDebt}</span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcFinalDebt)}
                        </span>
                        <span className="text-[9px] text-neutral-400 block mt-0.5">
                          Deuda Inicial - Pago de este mes
                        </span>
                      </div>
                    </div>

                    {/* 7. Monto para Liquidar este Mes (Antes de la cuota) */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-amber-500/30 flex flex-col justify-between">
                      <span className="text-[10px] text-amber-300 block font-medium">
                        {language === 'es' ? `Liquidación antes de Cuota ${currentTerm}` : `Payoff before Cuota ${currentTerm}`}
                      </span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcPayoff)}
                        </span>
                        <span className="text-[9px] text-neutral-400 block mt-0.5">
                          {language === 'es' ? 'Capital insoluto para finiquitar' : 'Remaining principal to settle'}
                        </span>
                      </div>
                    </div>

                    {/* 8. Ahorro de Interés si se Liquida este Mes */}
                    <div className="bg-neutral-950 p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
                      <span className="text-[10px] text-emerald-400 block font-medium">
                        {language === 'es' ? 'Ahorro al Liquidar' : 'Interest Saved on Payoff'}
                      </span>
                      <div className="mt-1">
                        <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcInterestSaved)}
                        </span>
                        <span className="text-[9px] text-neutral-400 block mt-0.5">
                          {language === 'es' 
                            ? `Deuda inicial (${formatCurrency(initialDebt || calcTheoreticalDebt)}) - Liquidación`
                            : `Initial debt (${formatCurrency(initialDebt || calcTheoreticalDebt)}) - Payoff`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Saldo de Deuda Inicial del Mes (con auto-cálculo y opción manual) */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <label className="text-neutral-300 font-semibold block text-xs">
                      {t.fieldInitialDebt}
                    </label>
                    <button
                      type="button"
                      onClick={() => setInitialDebt(calcTheoreticalDebt)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-mono font-medium underline flex items-center gap-1 self-start sm:self-auto"
                      title="Restaurar al saldo matemático calculado según la cuota actual"
                    >
                      {t.recalcBalanceBtn}: {formatCurrency(calcTheoreticalDebt)}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={initialDebt || ''}
                    onChange={e => handleInitialDebtChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-neutral-400">
                    {language === 'es' 
                      ? `Saldo pendiente antes del pago del mes activo (cuota ${currentTerm} de ${totalTerm}). Si difiere de tu estado de cuenta, puedes editarlo libremente.`
                      : `Pending balance before the active month payment (installment ${currentTerm} of ${totalTerm}). Editable if your statement differs.`}
                  </p>
                </div>

                {/* Monto de Liquidación Inmediata de Contado */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <label className="text-neutral-300 font-semibold block text-xs">
                      {language === 'es' ? 'Monto de Liquidación Inmediata ($)' : 'Immediate Early Settlement Amount ($)'}
                    </label>
                    <div className="flex items-center gap-2">
                      {calcPayoff > 0 && payoffDiscountRaw !== '' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayoffDiscountRaw('');
                          }}
                          className="text-[11px] text-neutral-400 hover:text-white font-mono underline"
                          title="Restaurar al cálculo automático de la tasa"
                        >
                          {language === 'es' ? 'Limpiar personalización' : 'Clear custom'}
                        </button>
                      )}
                      {calcPayoff > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePayoffDiscountChange(calcPayoff.toFixed(2))}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-mono font-medium underline flex items-center gap-1 self-start sm:self-auto"
                          title="Usar monto calculado automáticamente"
                        >
                          ⚡ {language === 'es' ? `Usar calculado (${formatCurrency(calcPayoff)})` : `Use calculated (${formatCurrency(calcPayoff)})`}
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={payoffDiscountRaw}
                    onChange={e => handlePayoffDiscountChange(e.target.value)}
                    placeholder={calcPayoff > 0 ? `Calculado automático: ${calcPayoff.toFixed(2)}` : '0.00'}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-neutral-400">
                    {language === 'es'
                      ? `* Liquidación antes de la cuota ${currentTerm}: ${formatCurrency(calcPayoff)}. Ahorras ${formatCurrency(calcInterestSaved)} de interés (Deuda inicial ${formatCurrency(initialDebt || calcTheoreticalDebt)} menos liquidación). Si tu institución te ofrece una cantidad o quita especial, puedes escribirla aquí.`
                      : `* Payoff before installment ${currentTerm}: ${formatCurrency(calcPayoff)}. You save ${formatCurrency(calcInterestSaved)} in interest (Initial debt ${formatCurrency(initialDebt || calcTheoreticalDebt)} minus payoff). If your lender gave you a special settlement offer, type it here.`}
                  </p>

                  {/* Banner de Deducción Inversa Automática de Préstamo y Total a Pagar */}
                  {deducedInfo && enteredPayoffNum > 0 && (
                    <div className="mt-1 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          {language === 'es' ? 'Cálculo inverso activado por liquidación:' : 'Reverse loan calculation from payoff:'}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          Cuota {currentTerm} de {totalTerm}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-0.5">
                        <div className="bg-neutral-950/80 p-2 rounded-md border border-neutral-800 flex flex-col justify-between">
                          <span className="text-neutral-400 block text-[10px]">
                            {language === 'es' ? 'Monto real que se pidió (Capital):' : 'Original loan requested:'}
                          </span>
                          <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm tabular-nums mt-0.5">
                            {formatCurrency(deducedInfo.originalPrincipal)}
                          </span>
                        </div>
                        <div className="bg-neutral-950/80 p-2 rounded-md border border-neutral-800 flex flex-col justify-between">
                          <span className="text-neutral-400 block text-[10px]">
                            {language === 'es' ? 'Monto total a pagar original:' : 'Original total to pay:'}
                          </span>
                          <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm tabular-nums mt-0.5">
                            {formatCurrency(deducedInfo.totalToPay)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        {language === 'es'
                          ? `* Se calcularon el préstamo original (${formatCurrency(deducedInfo.originalPrincipal)}) y el total a pagar (${formatCurrency(deducedInfo.totalToPay)}) a partir de tu saldo inicial de ${formatCurrency(initialDebt || calcTheoreticalDebt)} y la liquidación ingresada de ${formatCurrency(enteredPayoffNum)}.`
                          : `* Deduced original loan (${formatCurrency(deducedInfo.originalPrincipal)}) and total to pay (${formatCurrency(deducedInfo.totalToPay)}) from your initial balance of ${formatCurrency(initialDebt || calcTheoreticalDebt)} and entered payoff of ${formatCurrency(enteredPayoffNum)}.`}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* 7. Estado [✓ Hecho] y Monto Real */}
          <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isDone"
                checked={isDone}
                onChange={e => setIsDone(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
              />
              <label htmlFor="isDone" className="text-neutral-300 font-semibold cursor-pointer select-none">
                {t.fieldDoneStatus}
              </label>
            </div>

            {isDone && (
              <div className="pl-6">
                <label className="text-neutral-400 text-[11px] mb-1 block">
                  {t.fieldActualAmount}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={actualAmountRaw}
                  onChange={e => setActualAmountRaw(e.target.value)}
                  placeholder={t.fieldActualAmountPlaceholder}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* 8. Resaltado Visual */}
          <div>
            <label className="text-neutral-300 font-semibold mb-1.5 block">
              {t.fieldHighlight}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHighlight('none')}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  highlight === 'none'
                    ? 'bg-neutral-800 text-white border-neutral-600'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {t.highlightNone}
              </button>
              <button
                type="button"
                onClick={() => setHighlight('yellow')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  highlight === 'yellow'
                    ? 'bg-yellow-500/30 text-yellow-300 border-yellow-400'
                    : 'bg-neutral-950 text-yellow-400/70 border-neutral-800 hover:border-yellow-500/40'
                }`}
              >
                {t.highlightYellow}
              </button>
              <button
                type="button"
                onClick={() => setHighlight('blue')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  highlight === 'blue'
                    ? 'bg-blue-500/30 text-blue-300 border-blue-400'
                    : 'bg-neutral-950 text-blue-400/70 border-neutral-800 hover:border-blue-500/40'
                }`}
              >
                {t.highlightBlue}
              </button>
              <button
                type="button"
                onClick={() => setHighlight('green')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  highlight === 'green'
                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400'
                    : 'bg-neutral-950 text-emerald-400/70 border-neutral-800 hover:border-emerald-500/40'
                }`}
              >
                {t.highlightGreen}
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {initialData ? t.btnUpdate : t.btnSave}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
