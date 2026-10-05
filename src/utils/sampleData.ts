import { MonthData, CreditLine, Transaction, CreditCard } from '../types/finance';
import { getDateString, clampDayToMonth, computePayoffAndSavings } from './calculations';

export const DEFAULT_CREDIT_LINES: CreditLine[] = [
  { id: 'cl-1', institution: 'Línea de Crédito Bancaria Principal', availableAmount: 25000 },
  { id: 'cl-2', institution: 'Línea Digital Revolvente', availableAmount: 12000 },
  { id: 'cl-3', institution: 'Fondo de Emergencia / Reserva', availableAmount: 18000 },
];

export function createDefaultCreditCards(monthIndex: number): CreditCard[] {
  return [
    { id: 'cc-1', name: 'Tarjeta Oro Principal', payDay: 5, cutDay: 20, amount: 4250.00, isPaid: false },
    { id: 'cc-2', name: 'Tarjeta Digital Cashback', payDay: 15, cutDay: 28, amount: 2180.50, isPaid: false },
    { id: 'cc-3', name: 'Tarjeta Departamental', payDay: 22, cutDay: 7, amount: 1350.00, isPaid: false },
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
      amount: 12500.00,
      day: 1,
      dateString: getDateString(1, 0, 'es'),
      isRecurring: false,
      isDone: true,
      actualAmount: 12500.00,
      highlight: 'none',
      isAutoAccumulated: true
    },
    {
      id: `tx-1`,
      label: 'Ingreso',
      concept: 'Sueldo / Nómina Quincenal',
      amount: 15000.00,
      day: 15,
      dateString: getDateString(15, 0, 'es'),
      isRecurring: true,
      isDone: true,
      actualAmount: 15000.00,
      highlight: 'none'
    },
    {
      id: `tx-2`,
      label: 'Gasto',
      concept: 'Renta / Vivienda',
      amount: -5500.00,
      day: 5,
      dateString: getDateString(5, 0, 'es'),
      isRecurring: true,
      isDone: true,
      actualAmount: -5500.00,
      highlight: 'none'
    },
    {
      id: `tx-3`,
      label: 'Servicio',
      concept: 'Servicios Básicos (Luz, Agua, Gas)',
      amount: -850.00,
      day: 8,
      dateString: getDateString(8, 0, 'es'),
      isRecurring: true,
      isDone: true,
      actualAmount: -850.00,
      highlight: 'none'
    },
    {
      id: `tx-4`,
      label: 'Servicio',
      concept: 'Telefonía Móvil e Internet Fibra',
      amount: -699.00,
      day: 10,
      dateString: getDateString(10, 0, 'es'),
      isRecurring: true,
      isDone: true,
      actualAmount: -699.00,
      highlight: 'none'
    },
    {
      id: `tx-5`,
      label: 'Gasto',
      concept: 'Supermercado y Despensa Familiar',
      amount: -3400.00,
      day: 14,
      dateString: getDateString(14, 0, 'es'),
      isRecurring: true,
      isDone: true,
      actualAmount: -3400.00,
      highlight: 'none'
    },
    {
      id: `tx-6`,
      label: 'Préstamo',
      concept: 'Préstamo Personal Cuota 2 de 12',
      amount: -2150.00,
      day: 16,
      dateString: getDateString(16, 0, 'es'),
      isRecurring: true,
      isDone: false,
      actualAmount: null,
      highlight: 'yellow',
      loanDetails: {
        loanId: 'loan-personal',
        institutionName: 'Banco Principal',
        totalTermMonths: 12,
        currentTermMonth: 2,
        initialDebt: 21500.00,
        finalDebt: 19350.00,
        originalPrincipal: 22000.00,
        annualInterestRate: 22.5,
        totalToPay: 25800.00,
        totalInterest: 3800.00,
        payoffDiscount: 18500.00,
        interestSaved: 2950.00,
        mode: 'totalPay'
      }
    },
    {
      id: `tx-7`,
      label: 'Servicio',
      concept: 'Suscripción Streaming y Nube',
      amount: -250.00,
      day: 20,
      dateString: getDateString(20, 0, 'es'),
      isRecurring: true,
      recurringGroupId: 'tx-7',
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-8`,
      label: 'Préstamo',
      concept: 'Crédito Automotriz Cuota 4 de 24',
      amount: -3800.00,
      day: 22,
      dateString: getDateString(22, 0, 'es'),
      isRecurring: true,
      isDone: false,
      actualAmount: null,
      highlight: 'yellow',
      loanDetails: {
        loanId: 'loan-auto',
        institutionName: 'Crédito Automotriz',
        totalTermMonths: 24,
        currentTermMonth: 4,
        initialDebt: 76000.00,
        finalDebt: 72200.00,
        originalPrincipal: 75000.00,
        annualInterestRate: 15.5,
        totalToPay: 91200.00,
        totalInterest: 16200.00,
        payoffDiscount: 67500.00,
        interestSaved: 7300.00,
        mode: 'totalPay'
      }
    },
    {
      id: `tx-9`,
      label: 'Gasto',
      concept: 'Combustible y Mantenimiento Vehicular',
      amount: -1200.00,
      day: 25,
      dateString: getDateString(25, 0, 'es'),
      isRecurring: true,
      recurringGroupId: 'tx-9',
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-10`,
      label: 'Ingreso',
      concept: 'Segunda Quincena Nómina',
      amount: 15000.00,
      day: 30,
      dateString: getDateString(30, 0, 'es', year),
      isRecurring: true,
      recurringGroupId: 'tx-10',
      recurringOriginalDay: 30,
      isDone: false,
      actualAmount: null,
      highlight: 'none'
    },
    {
      id: `tx-11`,
      label: 'Ingreso',
      concept: 'Rendimiento de Inversiones / Proyecto',
      amount: 1800.00,
      day: 28,
      dateString: getDateString(28, 0, 'es'),
      isRecurring: false,
      isDone: false,
      actualAmount: null,
      highlight: 'green'
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

          const baseLoanDay = oldTx.recurringOriginalDay || oldTx.day;
          const clampedLoanDay = clampDayToMonth(baseLoanDay, year, m);
          newTxs.push({
            id: `tx-loan-${m}-${oldTx.id}`,
            label: oldTx.label,
            concept: `${oldTx.loanDetails.institutionName} Cuota ${nextInstallment} de ${oldTx.loanDetails.totalTermMonths}`,
            amount: oldTx.amount,
            day: clampedLoanDay,
            recurringOriginalDay: baseLoanDay,
            dateString: getDateString(clampedLoanDay, m, 'es', year),
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
        const baseRecDay = oldTx.recurringOriginalDay || oldTx.day;
        const clampedRecDay = clampDayToMonth(baseRecDay, year, m);
        newTxs.push({
          id: `tx-rec-${m}-${oldTx.id}`,
          recurringGroupId: oldTx.recurringGroupId || oldTx.id,
          recurringOriginalDay: baseRecDay,
          label: oldTx.label,
          concept: oldTx.concept,
          amount: oldTx.amount,
          day: clampedRecDay,
          dateString: getDateString(clampedRecDay, m, 'es', year),
          isRecurring: true,
          isDone: false,
          actualAmount: null,
          highlight: oldTx.highlight
        });
      }
    });

    const hasRealActivity = m <= 3;

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
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  for (let m = 0; m < 12; m++) {
    months[`${year}-${m}`] = {
      year,
      month: m,
      title: `${monthNames[m]} (${year})`,
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
