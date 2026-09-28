import { MonthData, CreditLine, Transaction, CreditCard } from '../types/finance';
import { getDateString, computePayoffAndSavings } from './calculations';

export const DEFAULT_CREDIT_LINES: CreditLine[] = [
  { id: 'cl-1', institution: 'MercadoPago', availableAmount: 4357 },
  { id: 'cl-2', institution: 'BanCoppel', availableAmount: 4000 },
  { id: 'cl-3', institution: 'DiDi', availableAmount: 0 },
  { id: 'cl-4', institution: 'DiDi M', availableAmount: 1000 },
  { id: 'cl-5', institution: 'Nu', availableAmount: 0 },
  { id: 'cl-6', institution: 'Coppel', availableAmount: 0 },
  { id: 'cl-7', institution: 'Coppel M', availableAmount: 0 },
];

export function createDefaultCreditCards(monthIndex: number): CreditCard[] {
  return [
    { id: 'cc-1', name: 'Nu M', payDay: 4, cutDay: 22, amount: 3700.68, isPaid: false },
    { id: 'cc-2', name: 'Stori', payDay: 2, cutDay: 12, amount: 7979.71, isPaid: false },
    { id: 'cc-3', name: 'Uala', payDay: 15, cutDay: 30, amount: 0, isPaid: false },
    { id: 'cc-4', name: 'Merca (MercadoCrédito)', payDay: 17, cutDay: 7, amount: 0, isPaid: false },
    { id: 'cc-5', name: 'Vexi', payDay: 18, cutDay: 17, amount: 643.54, isPaid: false },
    { id: 'cc-6', name: 'Stori M', payDay: 19, cutDay: 27, amount: 0, isPaid: false },
    { id: 'cc-7', name: 'Klar M', payDay: 21, cutDay: 28, amount: 0, isPaid: false },
  ];
}

export function createInitialSampleMonths(year: number = 2026): Record<string, MonthData> {
  const months: Record<string, MonthData> = {};

  // Mes 0: Enero
  const month0Transactions: Transaction[] = [
    {
      id: `acc-${year}-0`,
      label: 'Neto',
      concept: 'Acumulado',
      amount: 9513.88,
      day: 1,
      dateString: getDateString(1, 0, 'es'),
      isRecurring: false,
      isDone: true,
      actualAmount: 9513.88,
      highlight: 'none',
      isAutoAccumulated: true
    },
    {
      id: `tx-1`,
      label: 'Ingreso',
      concept: 'Quincena (-RM 3 de 12)',
      amount: 5925.43,
      day: 15,
      dateString: getDateString(15, 0, 'es'),
      isRecurring: true,
      isDone: true,
      actualAmount: 5925.43,
      highlight: 'none'
    },
    {
      id: `tx-2`,
      label: 'Gasto',
      concept: 'Recarga Telcel',
      amount: -200.00,
      day: 15,
      dateString: getDateString(15, 0, 'es'),
      isRecurring: true,
      isDone: true,
      actualAmount: -200.00,
      highlight: 'none'
    },
    {
      id: `tx-3`,
      label: 'Gasto',
      concept: 'Cámara Ken',
      amount: -2900.00,
      day: 15,
      dateString: getDateString(15, 0, 'es'),
      isRecurring: false,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-4`,
      label: 'Gasto',
      concept: 'Audifonos HiFi',
      amount: -1555.00,
      day: 15,
      dateString: getDateString(15, 0, 'es'),
      isRecurring: false,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-5`,
      label: 'Gasto',
      concept: 'Canasta Tacos',
      amount: -1700.00,
      day: 15,
      dateString: getDateString(15, 0, 'es'),
      isRecurring: false,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-6`,
      label: 'Gasto',
      concept: 'Prestamo BanCoppel 2 de 12',
      amount: -2895.00,
      day: 16,
      dateString: getDateString(16, 0, 'es'),
      isRecurring: true,
      isDone: false,
      actualAmount: null,
      highlight: 'yellow',
      loanDetails: {
        loanId: 'loan-bancoppel',
        institutionName: 'BanCoppel',
        totalTermMonths: 12,
        currentTermMonth: 2,
        initialDebt: 31471.30,
        finalDebt: 28576.30,
        originalPrincipal: 25000.00,
        annualInterestRate: 38.5,
        totalToPay: 34366.30,
        totalInterest: 9366.30,
        payoffDiscount: 22916.67,
        interestSaved: 8554.63,
        mode: 'totalPay'
      }
    },
    {
      id: `tx-7`,
      label: 'Gasto',
      concept: 'PrestamoCoppel 2 de 12',
      amount: -6262.00,
      day: 22,
      dateString: getDateString(22, 0, 'es'),
      isRecurring: true,
      isDone: false,
      actualAmount: null,
      highlight: 'yellow',
      loanDetails: {
        loanId: 'loan-coppel',
        institutionName: 'Coppel',
        totalTermMonths: 12,
        currentTermMonth: 2,
        initialDebt: 68870.00,
        finalDebt: 62608.00,
        originalPrincipal: 52000.00,
        annualInterestRate: 42.0,
        totalToPay: 75144.00,
        totalInterest: 23144.00,
        payoffDiscount: 47666.67,
        interestSaved: 21203.33,
        mode: 'totalPay'
      }
    },
    {
      id: `tx-8`,
      label: 'Coppel',
      concept: 'MyArcade',
      amount: -3686.00,
      day: 25,
      dateString: getDateString(25, 0, 'es'),
      isRecurring: false,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-9`,
      label: 'Servicio',
      concept: 'Bebbia Purificador',
      amount: -369.00,
      day: 28,
      dateString: getDateString(28, 0, 'es'),
      isRecurring: true,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-10`,
      label: 'Ingreso',
      concept: 'Bebbia Familia',
      amount: 100.00,
      day: 28,
      dateString: getDateString(28, 0, 'es'),
      isRecurring: true,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-11`,
      label: 'Servicio',
      concept: 'Google One 2TB',
      amount: -100.00,
      day: 29,
      dateString: getDateString(29, 0, 'es'),
      isRecurring: true,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-12`,
      label: 'Ingreso',
      concept: 'PS5 Martin Abono',
      amount: 3500.00,
      day: 30,
      dateString: getDateString(30, 0, 'es'),
      isRecurring: false,
      isDone: false,
      actualAmount: null,
      highlight: 'green',
      loanDetails: {
        loanId: 'loan-ps5',
        institutionName: 'PS5 Martin',
        totalTermMonths: 3,
        currentTermMonth: 1,
        initialDebt: 10000.00,
        finalDebt: 6500.00,
        mode: 'totalPay'
      }
    }
  ];

  months[`${year}-0`] = {
    year,
    month: 0,
    title: `Enero (${year})`,
    transactions: month0Transactions,
    creditCards: createDefaultCreditCards(0),
    hasUserActivity: true
  };

  // Pre-generar los meses 1 al 11 avanzando las deudas y recurrentes
  let previousMonthTxs = month0Transactions;
  for (let m = 1; m < 12; m++) {
    // Calculamos carryOver
    let accVal = 0;
    let net = 0;
    previousMonthTxs.forEach(t => {
      if (t.isAutoAccumulated) accVal = t.amount;
      else net += t.amount;
    });
    const carryOver = accVal + net;

    const newTxs: Transaction[] = [
      {
        id: `acc-${year}-${m}`,
        label: 'Neto',
        concept: 'Acumulado',
        amount: carryOver,
        day: 1,
        dateString: getDateString(1, m, 'es'),
        isRecurring: false,
        isDone: false,
        actualAmount: null,
        highlight: 'none',
        isAutoAccumulated: true
      }
    ];

    // Avanzamos recurrentes y préstamos
    previousMonthTxs.forEach(oldTx => {
      if (oldTx.isAutoAccumulated) return;

      if (oldTx.loanDetails) {
        const nextInstallment = oldTx.loanDetails.currentTermMonth + 1;
        if (nextInstallment <= oldTx.loanDetails.totalTermMonths && oldTx.loanDetails.finalDebt > 0) {
          const nextInitial = oldTx.loanDetails.finalDebt;
          const monthlyPay = Math.abs(oldTx.amount);
          const nextFinal = Math.max(0, nextInitial - monthlyPay);

          const { payoffAmount: nextPayoff, interestSaved: nextSavings } = computePayoffAndSavings({
            originalPrincipal: oldTx.loanDetails.originalPrincipal || 0,
            totalToPay: oldTx.loanDetails.totalToPay || (monthlyPay * oldTx.loanDetails.totalTermMonths),
            totalTerm: oldTx.loanDetails.totalTermMonths,
            currentTerm: nextInstallment,
            initialDebt: nextInitial
          });

          newTxs.push({
            id: `tx-loan-${m}-${oldTx.id}`,
            label: oldTx.label,
            concept: `${oldTx.loanDetails.institutionName} ${nextInstallment} de ${oldTx.loanDetails.totalTermMonths}`,
            amount: oldTx.amount,
            day: oldTx.day,
            dateString: getDateString(oldTx.day, m, 'es'),
            isRecurring: true,
            isDone: false,
            actualAmount: null,
            highlight: oldTx.highlight,
            loanDetails: {
              ...oldTx.loanDetails,
              currentTermMonth: nextInstallment,
              initialDebt: nextInitial,
              finalDebt: nextFinal,
              payoffDiscount: nextPayoff > 0 ? nextPayoff : undefined,
              interestSaved: nextSavings > 0 ? nextSavings : undefined
            }
          });
        }
      } else if (oldTx.isRecurring) {
        newTxs.push({
          id: `tx-rec-${m}-${oldTx.id}`,
          label: oldTx.label,
          concept: oldTx.concept,
          amount: oldTx.amount,
          day: oldTx.day,
          dateString: getDateString(oldTx.day, m, 'es'),
          isRecurring: true,
          isDone: false,
          actualAmount: null,
          highlight: oldTx.highlight
        });
      }
    });

    const hasRealActivity = m <= 3; // Enero a Abril con actividad inicial proyectada

    months[`${year}-${m}`] = {
      year,
      month: m,
      title: `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][m]} (${year})`,
      transactions: newTxs,
      creditCards: createDefaultCreditCards(m),
      hasUserActivity: hasRealActivity
    };

    previousMonthTxs = newTxs;
  }

  return months;
}

export function createEmptyMonths(year: number = 2026): Record<string, MonthData> {
  const months: Record<string, MonthData> = {};
  for (let m = 0; m < 12; m++) {
    months[`${year}-${m}`] = {
      year,
      month: m,
      transactions: [
        {
          id: `acc-${year}-${m}`,
          label: 'Neto',
          concept: 'Acumulado',
          amount: 0,
          day: 1,
          dateString: getDateString(1, m, 'es'),
          isRecurring: false,
          isDone: false,
          actualAmount: null,
          highlight: 'none',
          isAutoAccumulated: true
        }
      ],
      creditCards: [],
      hasUserActivity: false
    };
  }
  return months;
}

export function countDataStats(months: Record<string, MonthData>, creditLines: CreditLine[] = []) {
  let totalTransactions = 0;
  let totalLoans = 0;
  let totalCards = 0;

  Object.values(months).forEach(m => {
    (m.transactions || []).forEach(tx => {
      if (!tx.isAutoAccumulated) {
        totalTransactions++;
        if (tx.loanDetails) totalLoans++;
      }
    });
    totalCards += (m.creditCards || []).length;
  });

  return {
    transactions: totalTransactions,
    loans: totalLoans,
    cards: totalCards,
    creditLines: creditLines.length
  };
}

