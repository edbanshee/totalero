import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  HelpCircle, 
  Calculator, 
  Calendar, 
  Percent, 
  Building2, 
  Sparkles,
  DollarSign,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  HandCoins
} from 'lucide-react';
import { 
  Transaction, 
  TransactionLabel, 
  RowHighlight, 
  Language, 
  LoanDetails,
  LoanType
} from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { 
  getDateString, 
  clampDayToMonth,
  getDaysInMonth,
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
  prevMonthTotals?: { endOfMonthTotal: number; totalActual: number; hasData: boolean } | null;
}

const LABELS: TransactionLabel[] = [
  'Ingreso', 'Gasto', 'Servicio', 'Suscripción', 'Neto', 'Préstamo', 'Crédito', 'Otro'
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  selectedMonth,
  year,
  language,
  prevMonthTotals
}) => {
  const t = TRANSLATIONS[language];

  const isAccumulatedTx = !!(
    initialData?.isAutoAccumulated || 
    initialData?.concept?.trim().toLowerCase() === 'acumulado' || 
    initialData?.id?.startsWith('acc-')
  );

  // Form states
  const [label, setLabel] = useState<TransactionLabel>('Gasto');
  const [concept, setConcept] = useState('');
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [sign, setSign] = useState<'income' | 'expense'>('expense');
  const [day, setDay] = useState<number>(15);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'monthly' | 'annual'>('monthly');
  const [isDone, setIsDone] = useState<boolean>(false);
  const [actualAmountRaw, setActualAmountRaw] = useState<string>('');
  const [highlight, setHighlight] = useState<RowHighlight>('none');

  // Loan states
  const [hasLoan, setHasLoan] = useState<boolean>(false);
  const [loanType, setLoanType] = useState<LoanType>('payable');
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

  // Lifecycle protection refs to prevent involuntary resetting when options or props change
  const hasInitializedRef = useRef<boolean>(false);
  const lastEditIdRef = useRef<string | null>(null);

  // Pre-fill if editing with lifecycle guard
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      lastEditIdRef.current = null;
      return;
    }

    const currentEditId = initialData?.id || 'new';
    if (hasInitializedRef.current && lastEditIdRef.current === currentEditId) {
      // Form already initialized in this session: DO NOT reset user typed fields
      return;
    }

    hasInitializedRef.current = true;
    lastEditIdRef.current = currentEditId;

    if (initialData) {
      if (isAccumulatedTx) {
        setLabel('Neto');
        setConcept('Acumulado');
        setSign('income');
        setAmountRaw(Math.abs(initialData.amount).toString());
        setDay(1);
        setIsRecurring(false);
        setRecurrenceFrequency('monthly');
        setHasLoan(false);
        setHighlight('none');
        if (initialData.actualAmount !== null && initialData.actualAmount !== undefined) {
          setIsDone(!!initialData.isDone);
          setActualAmountRaw(Math.abs(initialData.actualAmount).toString());
        } else if (prevMonthTotals && prevMonthTotals.hasData && (prevMonthTotals.totalActual !== 0)) {
          setIsDone(true);
          setActualAmountRaw(Math.abs(prevMonthTotals.totalActual).toString());
        } else {
          setIsDone(!!initialData.isDone);
          setActualAmountRaw('');
        }
      } else {
        setLabel(initialData.label);
        setConcept(initialData.concept);
        const isNegative = initialData.amount < 0;
        setSign(isNegative ? 'expense' : 'income');
        setAmountRaw(Math.abs(initialData.amount).toString());
        setDay(clampDayToMonth(initialData.recurringOriginalDay || initialData.day || 15, year, selectedMonth));
        setIsRecurring(initialData.isRecurring || false);
        setRecurrenceFrequency(initialData.recurrenceFrequency || 'monthly');
        setIsDone(initialData.isDone || false);
        setActualAmountRaw(initialData.actualAmount !== null && initialData.actualAmount !== undefined ? Math.abs(initialData.actualAmount).toString() : '');
        setHighlight(initialData.highlight || 'none');

        if (initialData.loanDetails) {
          setHasLoan(true);
          const detectedType: LoanType = initialData.loanDetails.loanType 
            ? initialData.loanDetails.loanType 
            : (initialData.amount > 0 || initialData.label === 'Ingreso' ? 'receivable' : 'payable');
          setLoanType(detectedType);
          setLoanInstitution(initialData.loanDetails.institutionName);
          setTotalTerm(initialData.loanDetails.totalTermMonths || 12);
          setCurrentTerm(initialData.loanDetails.currentTermMonth || 1);
          setOriginalPrincipal(Math.abs(initialData.loanDetails.originalPrincipal || 0));
          setInitialDebt(Math.abs(initialData.loanDetails.initialDebt || 0));
          setCalcMode(initialData.loanDetails.mode || 'totalPay');
          setTotalToPay(Math.abs(initialData.loanDetails.totalToPay || 0));
          setAnnualRate(Math.abs(initialData.loanDetails.annualInterestRate || 36));
          setPayoffDiscountRaw(initialData.loanDetails.payoffDiscount ? Math.abs(initialData.loanDetails.payoffDiscount).toString() : '');
        } else {
          setHasLoan(false);
          setLoanType(initialData.amount > 0 || initialData.label === 'Ingreso' ? 'receivable' : 'payable');
          setPayoffDiscountRaw('');
        }
      }
    } else {
      // Default new transaction
      setLabel('Gasto');
      setConcept('');
      setAmountRaw('');
      setSign('expense');
      setDay(15);
      setIsRecurring(false);
      setRecurrenceFrequency('monthly');
      setIsDone(false);
      setActualAmountRaw('');
      setHighlight('none');
      setHasLoan(false);
      setLoanType('payable');
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
    const num = Math.abs(parseFloat(val) || 0);
    if (!isNaN(num) && num > 0 && hasLoan) {
      const activeInitial = Math.abs(initialDebt > 0 ? initialDebt : calcTheoreticalDebt);
      const userPayment = Math.abs(parseFloat(amountRaw) || 0);
      const deduced = deduceLoanFromPayoff({
        liquidationAmount: num,
        currentTerm,
        totalTerm,
        initialDebt: activeInitial,
        monthlyPayment: userPayment
      });

      if (deduced.originalPrincipal > 0) {
        setOriginalPrincipal(Math.abs(deduced.originalPrincipal));
      }
      if (deduced.totalToPay > 0 && calcMode === 'totalPay') {
        setTotalToPay(Math.abs(deduced.totalToPay));
      }
    }
  };

  const handleInitialDebtChange = (newDebt: number) => {
    const absDebt = Math.abs(newDebt);
    setInitialDebt(absDebt);
    const num = Math.abs(parseFloat(payoffDiscountRaw) || 0);
    if (!isNaN(num) && num > 0 && hasLoan) {
      const userPayment = Math.abs(parseFloat(amountRaw) || 0);
      const deduced = deduceLoanFromPayoff({
        liquidationAmount: num,
        currentTerm,
        totalTerm,
        initialDebt: absDebt,
        monthlyPayment: userPayment
      });

      if (deduced.originalPrincipal > 0) {
        setOriginalPrincipal(Math.abs(deduced.originalPrincipal));
      }
      if (deduced.totalToPay > 0 && calcMode === 'totalPay') {
        setTotalToPay(Math.abs(deduced.totalToPay));
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
      if (loanType === 'receivable') {
        setSign('income');
      } else {
        setSign('expense');
      }
    }
  };

  const enteredPayoffNum = Math.abs(parseFloat(payoffDiscountRaw) || 0);
  const isCustomPayoffDifferent = enteredPayoffNum > 0 && Math.abs(enteredPayoffNum - calcPayoff) > 0.05;
  const deducedInfo = enteredPayoffNum > 0 && hasLoan
    ? deduceLoanFromPayoff({
        liquidationAmount: enteredPayoffNum,
        currentTerm,
        totalTerm,
        initialDebt: Math.abs(initialDebt > 0 ? initialDebt : calcTheoreticalDebt),
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

    const validDay = isAccumulatedTx ? 1 : clampDayToMonth(day, year, selectedMonth);
    const dateStr = getDateString(validDay, selectedMonth, language, year);

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
        loanType: loanType,
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
      label: isAccumulatedTx ? 'Neto' : label,
      concept: isAccumulatedTx ? 'Acumulado' : (concept.trim() || (hasLoan ? `${loanInstitution} ${currentTerm} de ${totalTerm}` : 'Transacción')),
      amount: isAccumulatedTx ? Math.abs(finalAmount) : finalAmount,
      day: validDay,
      recurringOriginalDay: (isRecurring || hasLoan) ? (initialData?.recurringOriginalDay || validDay) : undefined,
      dateString: isAccumulatedTx ? getDateString(1, selectedMonth, language, year) : dateStr,
      isRecurring: isAccumulatedTx ? false : isRecurring,
      recurrenceFrequency: (isAccumulatedTx || !isRecurring) ? undefined : recurrenceFrequency,
      isDone,
      actualAmount: parsedActual,
      highlight,
      isAutoAccumulated: isAccumulatedTx ? true : undefined,
      hasCustomActual: isAccumulatedTx ? (parsedActual !== null) : undefined,
      loanDetails: isAccumulatedTx ? undefined : loanDetailsObj
    }, termAdjustment);

    onClose();
  };

  const maxDaysInActiveMonth = getDaysInMonth(year, selectedMonth);
  const computedDatePreview = getDateString(day, selectedMonth, language, year);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col text-slate-900 dark:text-neutral-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {initialData ? t.modalEditTitle : t.modalAddTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 pb-16 flex-1 overflow-y-auto flex flex-col gap-4 text-xs scroll-smooth">
          
          {/* 1. Etiqueta / Tipo (Chips) */}
          <div>
            <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1.5 block">
              {t.fieldLabel}
            </label>
            {isAccumulatedTx ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 border border-emerald-600 dark:border-emerald-400 shadow-xs">
                  Neto
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {LABELS.map(lbl => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setLabel(lbl)}
                    className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all border ${
                      label === lbl
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 font-bold border-emerald-600 dark:border-emerald-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-neutral-950/80 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Concepto & 3. Monto con Signo */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 block">
                {t.fieldConcept}
              </label>
              <input
                type="text"
                required
                readOnly={isAccumulatedTx}
                value={concept}
                onChange={e => !isAccumulatedTx && setConcept(e.target.value)}
                placeholder={t.fieldConceptPlaceholder}
                className={`w-full border rounded-lg px-3 py-2 text-xs transition-colors ${
                  isAccumulatedTx
                    ? 'bg-slate-100 dark:bg-neutral-900 border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-bold cursor-not-allowed'
                    : 'bg-slate-50 dark:bg-neutral-950 border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900'
                }`}
              />
              {isAccumulatedTx && prevMonthTotals?.hasData && (
                <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">
                  {language === 'es' ? 'Saldo final proyectado del mes anterior:' : 'Projected end balance from previous month:'}{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                    {formatCurrency(prevMonthTotals.endOfMonthTotal)}
                  </strong>
                </p>
              )}
            </div>

            <div className="sm:col-span-5">
              <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 block">
                {t.fieldAmount}
              </label>
              <div className="flex items-center gap-1.5">
                {/* Selector de signo */}
                <div className="flex bg-slate-100 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={isAccumulatedTx}
                    onClick={() => {
                      setSign('expense');
                      if (hasLoan) setLoanType('payable');
                    }}
                    className={`px-2 py-1.5 rounded text-[11px] font-bold transition-all ${
                      sign === 'expense'
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40 font-bold'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    disabled={isAccumulatedTx}
                    onClick={() => {
                      setSign('income');
                      if (hasLoan) setLoanType('receivable');
                    }}
                    className={`px-2 py-1.5 rounded text-[11px] font-bold transition-all ${
                      sign === 'income'
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 font-bold'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
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
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 4. Fecha y 5. Recurrente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-50 dark:bg-neutral-950/60 p-3 rounded-xl border border-slate-200 dark:border-neutral-800/80">
            <div>
              <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 flex items-center justify-between">
                <span>{t.fieldDay}</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                  {t.fieldDateComputed}: <strong>{computedDatePreview}</strong>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={maxDaysInActiveMonth}
                  required
                  disabled={isAccumulatedTx}
                  value={isAccumulatedTx ? 1 : Math.min(day, maxDaysInActiveMonth)}
                  onChange={e => !isAccumulatedTx && setDay(Math.max(1, Math.min(maxDaysInActiveMonth, parseInt(e.target.value) || 1)))}
                  className={`w-24 border rounded-lg px-3 py-1.5 tabular-nums text-xs ${
                    isAccumulatedTx
                      ? 'bg-slate-100 dark:bg-neutral-900 border-slate-300 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 cursor-not-allowed'
                      : 'bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500'
                  }`}
                />
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  {isAccumulatedTx ? (language === 'es' ? '(Día 1 de inicio)' : '(Day 1 start)') : '(del mes activo)'}
                </span>
              </div>
            </div>

            {!isAccumulatedTx && (
              <div className="flex flex-col gap-2.5 pt-2 sm:pt-0">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="isRecurringMonthly"
                    checked={isRecurring && recurrenceFrequency === 'monthly'}
                    onChange={e => {
                      if (e.target.checked) {
                        setIsRecurring(true);
                        setRecurrenceFrequency('monthly');
                      } else {
                        setIsRecurring(false);
                      }
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                  />
                  <label htmlFor="isRecurringMonthly" className="text-slate-700 dark:text-neutral-300 select-none cursor-pointer">
                    <span className="font-semibold block text-slate-900 dark:text-neutral-100 text-xs">{t.fieldRecurring}</span>
                    <span className="text-[10px] text-slate-500 dark:text-neutral-400 block leading-tight">{t.fieldRecurringHelp}</span>
                  </label>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60 dark:border-neutral-800/60">
                  <input
                    type="checkbox"
                    id="isRecurringAnnual"
                    checked={isRecurring && recurrenceFrequency === 'annual'}
                    onChange={e => {
                      if (e.target.checked) {
                        setIsRecurring(true);
                        setRecurrenceFrequency('annual');
                      } else {
                        setIsRecurring(false);
                      }
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                  />
                  <label htmlFor="isRecurringAnnual" className="text-slate-700 dark:text-neutral-300 select-none cursor-pointer">
                    <span className="font-semibold block text-slate-900 dark:text-neutral-100 text-xs">{t.fieldRecurringAnnual}</span>
                    <span className="text-[10px] text-slate-500 dark:text-neutral-400 block leading-tight">{t.fieldRecurringAnnualHelp}</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 6. ¿Vincular a Préstamo / Deuda a Plazos? (Solo transacciones regulares) */}
          {!isAccumulatedTx && (
            <div className="border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50/50 dark:bg-neutral-950/40 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setHasLoan(!hasLoan)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-100/90 dark:bg-neutral-900/80 hover:bg-slate-200/80 dark:hover:bg-neutral-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {t.fieldLinkLoan}
                </span>
                {hasLoan && (
                  <span className="hidden sm:inline text-[10px] text-amber-700/80 dark:text-amber-400/80 font-normal">
                    · {language === 'es' ? 'Desplazamiento interno' : 'Internal scroll'}
                  </span>
                )}
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold ${
                hasLoan 
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30' 
                  : 'bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-400'
              }`}>
                {hasLoan ? 'ACTIVO' : 'NO'}
              </span>
            </button>

            {hasLoan && (
              <div className="p-4 sm:p-5 pb-14 sm:pb-20 flex flex-col gap-4 bg-white dark:bg-neutral-950/80 border-t border-slate-200 dark:border-neutral-800 max-h-[60vh] sm:max-h-[560px] overflow-y-auto pr-2.5 sm:pr-3 scroll-smooth">
                
                {/* 1. Selector de Modalidad de Préstamo (Deuda por pagar vs Préstamo inverso que me deben) */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex flex-col gap-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {t.loanTypeSectionTitle}
                    </label>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${
                      loanType === 'receivable'
                        ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                    }`}>
                      {loanType === 'receivable' 
                        ? (language === 'es' ? '↗ Cobro mensual (Ingreso)' : '↗ Monthly Income')
                        : (language === 'es' ? '↘ Pago mensual (Gasto)' : '↘ Monthly Expense')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Botón: Deuda por pagar */}
                    <button
                      type="button"
                      onClick={() => {
                        setLoanType('payable');
                        setSign('expense');
                        if (label === 'Ingreso') {
                          setLabel('Préstamo');
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        loanType === 'payable'
                          ? 'bg-white dark:bg-neutral-800 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white/60 dark:bg-neutral-950/40 border-slate-200 dark:border-neutral-800/80 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        loanType === 'payable'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                      }`}>
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-xs ${loanType === 'payable' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-neutral-300'}`}>
                          {t.loanTypePayable}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-snug">
                          {t.loanTypePayableDesc}
                        </p>
                      </div>
                    </button>

                    {/* Botón: Préstamo inverso (Me deben a mí) */}
                    <button
                      type="button"
                      onClick={() => {
                        setLoanType('receivable');
                        setSign('income');
                        if (label === 'Gasto' || label === 'Servicio' || label === 'Suscripción') {
                          setLabel('Préstamo');
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        loanType === 'receivable'
                          ? 'bg-white dark:bg-neutral-800 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-white/60 dark:bg-neutral-950/40 border-slate-200 dark:border-neutral-800/80 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        loanType === 'receivable'
                          ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                      }`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-xs ${loanType === 'receivable' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-neutral-300'}`}>
                          {t.loanTypeReceivable}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-snug">
                          {t.loanTypeReceivableDesc}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Banner informativo cuando la cuota actual es mayor a 1 */}
                {currentTerm > 1 && (
                  <div className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                    loanType === 'receivable'
                      ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-300 dark:border-teal-500/30 text-teal-900 dark:text-teal-300'
                      : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${loanType === 'receivable' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`} />
                      <div>
                        <span className="font-bold block text-sm text-slate-900 dark:text-white">
                          {loanType === 'receivable'
                            ? (language === 'es' 
                                ? `Registro desde el cobro ${currentTerm} de ${totalTerm}` 
                                : `Registering from collection ${currentTerm} of ${totalTerm}`)
                            : (language === 'es' 
                                ? `Registro desde la cuota ${currentTerm} de ${totalTerm}` 
                                : `Registering from installment ${currentTerm} of ${totalTerm}`)}
                        </span>
                        <p className="text-[11px] text-slate-700 dark:text-neutral-300 mt-0.5 leading-relaxed">
                          {loanType === 'receivable'
                            ? (language === 'es'
                                ? `Totalero creará automáticamente los ${currentTerm - 1} cobro(s) previo(s) en los meses anteriores (con sus saldos por cobrar calculados en reversa y marcados como cobrados en tus ingresos), además de proyectar los ${totalTerm - currentTerm} cobros mensuales futuros restantes.`
                                : `Totalero will automatically backfill the ${currentTerm - 1} previous collection(s) in earlier months (with retroactive balances and marked as collected income), plus project the remaining ${totalTerm - currentTerm} future collections.`)
                            : (language === 'es'
                                ? `Totalero creará automáticamente las ${currentTerm - 1} cuota(s) previa(s) en los meses anteriores (con sus saldos de deuda y pagos correspondientes calculados en reversa y marcadas como pagadas), además de proyectar las ${totalTerm - currentTerm} cuotas futuras restantes.`
                                : `Totalero will automatically backfill the ${currentTerm - 1} previous installment(s) in earlier months (with retroactive balances and marked as paid), plus project the remaining ${totalTerm - currentTerm} installments forward.`)}
                        </p>
                      </div>
                    </div>

                    {/* Timeline pills */}
                    <div className={`flex flex-wrap items-center gap-1.5 pt-1 text-[10px] border-t ${
                      loanType === 'receivable' ? 'border-teal-300/60 dark:border-teal-500/20' : 'border-amber-300/60 dark:border-amber-500/20'
                    }`}>
                      <span className={`px-2 py-0.5 rounded border font-semibold ${
                        loanType === 'receivable'
                          ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-500/40'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40'
                      }`}>
                        {language === 'es' ? `← Meses previos: 1 a ${currentTerm - 1}` : `← Prior months: 1 to ${currentTerm - 1}`}
                      </span>
                      <span className="text-slate-400 dark:text-neutral-500">→</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-bold">
                        {language === 'es' 
                          ? (loanType === 'receivable' ? `Mes activo: Cobro ${currentTerm}` : `Mes activo: Cuota ${currentTerm}`)
                          : (loanType === 'receivable' ? `Active month: Collection ${currentTerm}` : `Active month: Installment ${currentTerm}`)}
                      </span>
                      <span className="text-slate-400 dark:text-neutral-500">→</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700">
                        {language === 'es' ? `Futuro: ${currentTerm + 1} a ${totalTerm}` : `Future: ${currentTerm + 1} to ${totalTerm}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Institución / Deudor, Plazo y Cuota */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 block">
                      {loanType === 'receivable'
                        ? (language === 'es' ? 'Deudor / Persona que te debe' : 'Borrower / Person who owes you')
                        : t.fieldLoanInstitution}
                    </label>
                    <input
                      type="text"
                      required={hasLoan}
                      value={loanInstitution}
                      onChange={e => setLoanInstitution(e.target.value)}
                      onBlur={handleInstitutionBlur}
                      placeholder={loanType === 'receivable'
                        ? (language === 'es' ? 'ej. Juan Pérez, Préstamo a familiar' : 'e.g. John Doe, Family loan')
                        : 'ej. Banco Principal, Financiera, Tarjeta Oro'}
                      className="w-full bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 block">
                      {t.fieldTotalTerm}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={totalTerm}
                      onChange={e => setTotalTerm(parseInt(e.target.value) || 12)}
                      className="w-full bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 block">
                      {t.fieldCurrentTerm}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalTerm}
                      value={currentTerm}
                      onChange={e => setCurrentTerm(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-neutral-900"
                    />
                  </div>
                </div>

                {/* Calculadora de Intereses con 2 modos (Completa, sin recortes) */}
                <div className="bg-slate-50 dark:bg-neutral-900 border border-amber-300 dark:border-amber-500/30 rounded-xl p-4 flex flex-col gap-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800 gap-2">
                    <div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        {t.calculatorModeTitle}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                        {language === 'es'
                          ? 'Calcula la tasa de interés anual (APR), interés total y mensualidad sin cortes'
                          : 'Compute APR, total interest charges, and monthly payments'}
                      </p>
                    </div>

                    {/* Selector de modo */}
                    <div className="flex bg-slate-200/80 dark:bg-neutral-950 p-0.5 rounded-lg border border-slate-300 dark:border-neutral-800 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCalcMode('totalPay')}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                          calcMode === 'totalPay'
                            ? 'bg-white dark:bg-amber-500/20 text-slate-900 dark:text-amber-300 border border-slate-300 dark:border-amber-500/30 font-bold shadow-xs'
                            : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {t.modeA}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcMode('interestRate')}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                          calcMode === 'interestRate'
                            ? 'bg-white dark:bg-amber-500/20 text-slate-900 dark:text-amber-300 border border-slate-300 dark:border-amber-500/30 font-bold shadow-xs'
                            : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {t.modeB}
                      </button>
                    </div>
                  </div>

                  {calcMode === 'totalPay' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">
                            {loanType === 'receivable'
                              ? (language === 'es' ? 'Capital prestado original ($)' : 'Original principal lent ($)')
                              : t.fieldOriginalPrincipal}
                          </span>
                          {isCustomPayoffDifferent && deducedInfo && (
                            <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-500/30 flex items-center gap-1 font-bold">
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
                          className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? 'Monto inicial que prestaste sin intereses' : 'Initial capital originally lent')
                            : t.fieldOriginalPrincipalHelp}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">
                            {loanType === 'receivable'
                              ? (language === 'es' ? 'Monto total a cobrar ($)' : 'Total amount to collect ($)')
                              : t.totalToPayInput}
                          </span>
                          {isCustomPayoffDifferent && deducedInfo && (
                            <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-500/30 flex items-center gap-1 font-bold">
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
                          className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? 'Total que te pagarán a plazos sumando intereses ganados' : 'Total you will collect including interest')
                            : t.totalToPayHelp}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">
                            {loanType === 'receivable'
                              ? (language === 'es' ? 'Capital prestado original ($)' : 'Original principal lent ($)')
                              : t.fieldOriginalPrincipal}
                          </span>
                          {isCustomPayoffDifferent && deducedInfo && (
                            <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-500/30 flex items-center gap-1 font-bold">
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
                          className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? 'Monto inicial que prestaste sin intereses' : 'Initial capital originally lent')
                            : t.fieldOriginalPrincipalHelp}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-slate-700 dark:text-neutral-300 text-[11px] mb-1">
                          <span className="font-semibold">
                            {loanType === 'receivable'
                              ? (language === 'es' ? 'Tasa de Interés Cobrada (APR %)' : 'Interest Rate Charged (APR %)')
                              : t.annualRateInput}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={annualRate || ''}
                          onChange={e => setAnnualRate(parseFloat(e.target.value) || 0)}
                          placeholder="ej. 36.0"
                          className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? 'Tasa pactada con el deudor (0% si prestaste sin intereses)' : 'Interest rate agreed upon (0% if interest-free)')
                            : t.annualRateHelp}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Resultados Calculados en tiempo real */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-slate-700 dark:text-neutral-300">
                    {/* 1. Mensualidad */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">
                        {loanType === 'receivable'
                          ? (language === 'es' ? 'Mensualidad a cobrar' : 'Monthly to collect')
                          : t.calcResultMonthly}
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcMonthly)}
                        </span>
                        <button
                          type="button"
                          onClick={handleApplyCalculatedMonthly}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold bg-amber-100/80 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/30 transition-colors"
                          title="Usar esta mensualidad en el Monto de la transacción"
                        >
                          Usar en Monto
                        </button>
                      </div>
                    </div>

                    {/* 2. Interés Mensual ($) y Tasa Mensual (%) */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">
                        {loanType === 'receivable'
                          ? (language === 'es' ? 'Interés ganado / mes' : 'Earned interest / mo')
                          : t.calcResultMonthlyInterest}
                      </span>
                      <div className="mt-1">
                        <span className={`font-bold text-xs sm:text-sm tabular-nums block ${
                          loanType === 'receivable' ? 'text-teal-700 dark:text-teal-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {formatCurrency(calcMonthlyInterest)} / mes
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-neutral-400 block mt-0.5 tabular-nums">
                          Tasa: {calcMonthlyInterestRate.toFixed(2)}% mensual
                        </span>
                      </div>
                    </div>

                    {/* 3. Interés Total del Crédito */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">
                        {loanType === 'receivable'
                          ? (language === 'es' ? 'Interés total a ganar' : 'Total interest to earn')
                          : t.calcResultTotalInterest}
                      </span>
                      <div className="mt-1">
                        <span className={`font-bold text-xs sm:text-sm tabular-nums block ${
                          loanType === 'receivable' ? 'text-teal-700 dark:text-teal-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {formatCurrency(calcTotalInterest)}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-neutral-500 block mt-0.5">
                          {loanType === 'receivable' 
                            ? (language === 'es' ? 'Total cobro - Capital' : 'Total - Capital')
                            : 'Total pagar - Préstamo'}
                        </span>
                      </div>
                    </div>

                    {/* 4. Tasa Anual (APR) */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">{t.calcResultAPR}</span>
                      <div className="mt-1">
                        <span className="font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm tabular-nums block">
                          {calcAPR.toFixed(1)}% anual
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-neutral-500 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? 'Rendimiento anual' : 'Annual return')
                            : 'Tasa Anual Efectiva'}
                        </span>
                      </div>
                    </div>

                    {/* 5. Deuda / Saldo por Cobrar Inicial del Mes Activo */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-medium">
                        {loanType === 'receivable'
                          ? (language === 'es' ? 'Saldo por cobrar inicial' : 'Initial to collect')
                          : (language === 'es' ? 'Deuda Inicial de este Mes' : 'Initial Debt Balance')}
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-amber-700 dark:text-amber-300 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(initialDebt > 0 ? initialDebt : calcTheoreticalDebt)}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-neutral-500 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? `Al inicio del cobro ${currentTerm} de ${totalTerm}` : `Start of collection ${currentTerm} of ${totalTerm}`)
                            : `Al inicio de cuota ${currentTerm} de ${totalTerm}`}
                        </span>
                      </div>
                    </div>

                    {/* 6. Restante Tras Cobro/Pago (Cálculo Exacto) */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">
                        {loanType === 'receivable'
                          ? (language === 'es' ? 'Restante por cobrar' : 'Remaining to collect')
                          : t.calcResultFinalDebt}
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcFinalDebt)}
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? 'Saldo Inicial - Cobro de este mes' : 'Initial - This month collection')
                            : (language === 'es' ? 'Deuda Inicial - Pago de este mes' : 'Initial - This month payment')}
                        </span>
                      </div>
                    </div>

                    {/* 7. Monto para Liquidar este Mes */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-amber-300 dark:border-amber-500/30 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 block font-medium">
                        {loanType === 'receivable'
                          ? (language === 'es' ? `Liquidación de contado hoy` : `Full payoff today`)
                          : (language === 'es' ? `Liquidación antes de Cuota ${currentTerm}` : `Payoff before Cuota ${currentTerm}`)}
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-amber-800 dark:text-amber-300 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcPayoff)}
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                          {loanType === 'receivable'
                            ? (language === 'es' ? 'Capital insoluto si te liquidan hoy' : 'Remaining principal if settled today')
                            : (language === 'es' ? 'Capital insoluto para finiquitar' : 'Remaining principal to settle')}
                        </span>
                      </div>
                    </div>

                    {/* 8. Ahorro / Descuento si se Liquida este Mes */}
                    <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-emerald-300 dark:border-emerald-500/30 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">
                        {loanType === 'receivable'
                          ? (language === 'es' ? 'Descuento por pronto pago' : 'Early payoff discount')
                          : (language === 'es' ? 'Ahorro al Liquidar' : 'Interest Saved on Payoff')}
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm tabular-nums block">
                          {formatCurrency(calcInterestSaved)}
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                          {language === 'es' 
                            ? `Saldo inicial (${formatCurrency(initialDebt || calcTheoreticalDebt)}) - Liquidación`
                            : `Initial balance (${formatCurrency(initialDebt || calcTheoreticalDebt)}) - Payoff`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Saldo Inicial del Mes (con auto-cálculo y opción manual) */}
                <div className="bg-slate-50 dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 flex flex-col gap-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <label className="text-slate-700 dark:text-neutral-300 font-semibold block text-xs">
                      {loanType === 'receivable'
                        ? (language === 'es' ? 'Saldo pendiente por cobrar al inicio del mes ($)' : 'Initial balance to collect ($)')
                        : t.fieldInitialDebt}
                    </label>
                    <button
                      type="button"
                      onClick={() => setInitialDebt(calcTheoreticalDebt)}
                      className="text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium underline flex items-center gap-1 self-start sm:self-auto tabular-nums"
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
                    className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {loanType === 'receivable'
                      ? (language === 'es'
                          ? `Saldo que te debe la persona antes del cobro de este mes (cobro ${currentTerm} de ${totalTerm}). Si difiere del acuerdo, puedes editarlo libremente.`
                          : `Balance owed to you before this month collection (${currentTerm} of ${totalTerm}). Editable if needed.`)
                      : (language === 'es' 
                          ? `Saldo pendiente antes del pago del mes activo (cuota ${currentTerm} de ${totalTerm}). Si difiere de tu estado de cuenta, puedes editarlo libremente.`
                          : `Pending balance before the active month payment (installment ${currentTerm} of ${totalTerm}). Editable if your statement differs.`)}
                  </p>
                </div>

                {/* Monto de Liquidación Inmediata de Contado */}
                <div className="bg-slate-50 dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 flex flex-col gap-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <label className="text-slate-700 dark:text-neutral-300 font-semibold block text-xs">
                      {loanType === 'receivable'
                        ? (language === 'es' ? 'Monto de Liquidación Anticipada de Contado ($) (Si liquidan hoy)' : 'Immediate Early Settlement Amount ($)')
                        : (language === 'es' ? 'Monto de Liquidación Inmediata ($)' : 'Immediate Early Settlement Amount ($)')}
                    </label>
                    <div className="flex items-center gap-2">
                      {calcPayoff > 0 && payoffDiscountRaw !== '' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayoffDiscountRaw('');
                          }}
                          className="text-[11px] text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white underline"
                          title="Restaurar al cálculo automático de la tasa"
                        >
                          {language === 'es' ? 'Limpiar personalización' : 'Clear custom'}
                        </button>
                      )}
                      {calcPayoff > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePayoffDiscountChange(calcPayoff.toFixed(2))}
                          className="text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium underline flex items-center gap-1 self-start sm:self-auto tabular-nums"
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
                    className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {loanType === 'receivable'
                      ? (language === 'es'
                          ? `* Liquidación si te pagan todo de contado antes del cobro ${currentTerm}: ${formatCurrency(calcPayoff)}. Descuento por liquidar anticipado: ${formatCurrency(calcInterestSaved)}.`
                          : `* Early settlement if paid in full before collection ${currentTerm}: ${formatCurrency(calcPayoff)}. Early settlement discount: ${formatCurrency(calcInterestSaved)}.`)
                      : (language === 'es'
                          ? `* Liquidación antes de la cuota ${currentTerm}: ${formatCurrency(calcPayoff)}. Ahorras ${formatCurrency(calcInterestSaved)} de interés (Deuda inicial ${formatCurrency(initialDebt || calcTheoreticalDebt)} menos liquidación). Si tu institución te ofrece una cantidad o quita especial, puedes escribirla aquí.`
                          : `* Payoff before installment ${currentTerm}: ${formatCurrency(calcPayoff)}. You save ${formatCurrency(calcInterestSaved)} in interest (Initial debt ${formatCurrency(initialDebt || calcTheoreticalDebt)} minus payoff). If your lender gave you a special settlement offer, type it here.`)}
                  </p>

                  {/* Banner de Deducción Inversa Automática de Préstamo y Total a Pagar */}
                  {deducedInfo && enteredPayoffNum > 0 && (
                    <div className="mt-1 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          {language === 'es' ? 'Cálculo inverso activado por liquidación:' : 'Reverse loan calculation from payoff:'}
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold tabular-nums">
                          Cuota {currentTerm} de {totalTerm}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-0.5">
                        <div className="bg-white dark:bg-neutral-950/80 p-2 rounded-md border border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
                          <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                            {language === 'es' ? 'Monto real que se pidió (Capital):' : 'Original loan requested:'}
                          </span>
                          <span className="font-bold text-amber-800 dark:text-amber-300 text-xs sm:text-sm tabular-nums mt-0.5">
                            {formatCurrency(deducedInfo.originalPrincipal)}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-neutral-950/80 p-2 rounded-md border border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
                          <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                            {language === 'es' ? 'Monto total a pagar original:' : 'Original total to pay:'}
                          </span>
                          <span className="font-bold text-amber-800 dark:text-amber-300 text-xs sm:text-sm tabular-nums mt-0.5">
                            {formatCurrency(deducedInfo.totalToPay)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-neutral-400">
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
        )}

          {/* 7. Estado [✓ Hecho] y Monto Real */}
          <div className="bg-slate-50 dark:bg-neutral-950/60 p-3 rounded-xl border border-slate-200 dark:border-neutral-800/80 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isDone"
                checked={isDone}
                onChange={e => setIsDone(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <label htmlFor="isDone" className="text-slate-900 dark:text-neutral-300 font-semibold cursor-pointer select-none">
                {t.fieldDoneStatus}
              </label>
            </div>

            {isDone && (
              <div className="pl-6 flex flex-col gap-2">
                {isAccumulatedTx && prevMonthTotals?.hasData && (
                  <div className="flex flex-col gap-1 bg-emerald-50/80 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-500/30">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {language === 'es' ? 'Actual Real del mes anterior:' : 'Previous month real actual:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActualAmountRaw(Math.abs(prevMonthTotals.totalActual).toString());
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors shadow-xs"
                      >
                        {language === 'es' ? 'Copiar este monto' : 'Copy this amount'} ({formatCurrency(prevMonthTotals.totalActual)})
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-slate-600 dark:text-neutral-400 text-[11px] mb-1 block font-medium">
                    {t.fieldActualAmount}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualAmountRaw}
                    onChange={e => setActualAmountRaw(e.target.value)}
                    placeholder={t.fieldActualAmountPlaceholder}
                    className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white tabular-nums text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2.5 pt-3 pb-1 border-t border-slate-200 dark:border-neutral-800 mt-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {initialData ? t.btnUpdate : t.btnSave}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
