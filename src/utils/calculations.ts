import { Transaction, MonthData, Language, LoanDetails, MAX_CATALOG_YEAR, BiweeklyBreakdown } from '../types/finance';
import { MONTH_SHORT } from './translations';

/**
 * Formatea un número a moneda estilo Totalero / Contabilidad
 * ej: 9513.88 -> "$ 9,513.88"
 *    -2895.00 -> "-$ 2,895.00"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

export function formatCompactCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  return `${isNegative ? '-' : ''}$${absVal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
}

/**
 * Genera la cadena de fecha ej: 15 y mes 8 (septiembre) -> "15-sep"
 */
export function getDateString(day: number, monthIndex: number, lang: Language = 'es'): string {
  const d = Math.max(1, Math.min(31, day));
  const dayStr = d < 10 ? `0${d}` : `${d}`;
  const shortMonth = MONTH_SHORT[lang][monthIndex] || MONTH_SHORT['es'][monthIndex];
  return `${dayStr}-${shortMonth}`;
}

/**
 * Calcula la mensualidad para una tasa de interés dada y plazo
 * Fórmula de cuota nivelada (método francés)
 */
export function calculateAmortizationMonthlyPayment(principal: number, annualRatePercent: number, months: number): number {
  if (months <= 0) return principal;
  if (annualRatePercent <= 0) return principal / months;
  const monthlyRate = (annualRatePercent / 100) / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return payment;
}

/**
 * Estima la tasa anual APR dado el principal, el total a pagar y el plazo
 */
export function estimateAPRFromTotal(principal: number, totalToPay: number, months: number): { apr: number; totalInterest: number; monthlyPayment: number } {
  if (months <= 0 || principal <= 0) {
    return { apr: 0, totalInterest: 0, monthlyPayment: 0 };
  }
  const monthlyPayment = totalToPay / months;
  const totalInterest = Math.max(0, totalToPay - principal);
  
  // Aproximación financiera de tasa anual
  // Constant Ratio Formula: APR = (2 * m * I) / (B * (n + 1))
  const apr = totalInterest > 0 
    ? ((2 * 12 * totalInterest) / (principal * (months + 1))) * 100 
    : 0;

  return {
    apr: Math.round(apr * 10) / 10,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100
  };
}

/**
 * Calcula la liquidación de contado y el ahorro de interés para una cuota específica:
 * - Liquidación: Capital insoluto restante necesario para liquidar ANTES de pagar la cuota del mes.
 *   Si estás en la cuota k de N (ej. cuota 2 de 12), faltan por pagar las cuotas k, k+1, ..., N.
 *   Es decir, (N - k + 1) cuotas pendientes (ej. 11 cuotas en cuota 2 de 12).
 * - Ahorro de Interés: Deuda inicial del mes MENOS el monto de liquidación del mes.
 *   (Refleja los intereses futuros no devengados que ya no pagarás si liquidas antes de dar la cuota).
 */
export function computePayoffAndSavings({
  originalPrincipal,
  totalToPay,
  totalTerm,
  currentTerm,
  initialDebt
}: {
  originalPrincipal: number;
  totalToPay: number;
  totalTerm: number;
  currentTerm: number;
  initialDebt?: number;
}): { payoffAmount: number; interestSaved: number } {
  const N = Math.max(1, totalTerm);
  const k = Math.max(1, currentTerm);

  // Si ya se superó el plazo total del crédito, no hay nada pendiente por liquidar
  if (k > N) {
    return { payoffAmount: 0, interestSaved: 0 };
  }

  // Cuotas pendientes de pago considerando ANTES del pago de la cuota k:
  // Si estamos en la cuota k de N, faltan por pagar las cuotas k, k+1, ..., N.
  // Es decir: (N - k + 1) cuotas.
  // Ejemplo: En cuota 2 de 12, faltan 11 cuotas (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12).
  // En cuota 1 de 12, faltan 12 cuotas.
  // En cuota 12 de 12, falta 1 cuota.
  const pendingInstallments = Math.max(0, N - k + 1);
  if (pendingInstallments === 0) {
    return { payoffAmount: 0, interestSaved: 0 };
  }

  const P = originalPrincipal > 0 ? originalPrincipal : (totalToPay > 0 ? totalToPay * 0.75 : 0);
  const T = totalToPay > 0 ? totalToPay : P;

  const monthlyPrincipal = P / N;
  const monthlyPayment = T / N;

  // Liquidación = Capital insoluto pendiente ANTES del pago del mes actual:
  const payoffAmount = Math.round(pendingInstallments * monthlyPrincipal * 100) / 100;

  // Deuda inicial / saldo total programado pendiente antes de este pago:
  // Si se proporciona la deuda inicial del mes actual, se toma directamente;
  // de lo contrario, se calcula como las cuotas pendientes por la cuota mensual programada.
  const effectiveInitialDebt = (initialDebt !== undefined && initialDebt > 0)
    ? initialDebt
    : (pendingInstallments * monthlyPayment);

  // Ahorro de interés = Deuda inicial de este mes MENOS la liquidación de este mes
  const interestSaved = Math.max(0, Math.round((effectiveInitialDebt - payoffAmount) * 100) / 100);

  return { payoffAmount, interestSaved };
}

/**
 * Deduce de forma inversa el monto real que se pidió (Capital original P) y el monto total
 * a pagar original (T) a partir del monto de liquidación inmediata, el número de cuota activa,
 * el plazo total y la deuda inicial del mes.
 */
export function deduceLoanFromPayoff({
  liquidationAmount,
  currentTerm,
  totalTerm,
  initialDebt,
  monthlyPayment
}: {
  liquidationAmount: number;
  currentTerm: number;
  totalTerm: number;
  initialDebt: number;
  monthlyPayment?: number;
}): { originalPrincipal: number; totalToPay: number } {
  const N = Math.max(1, totalTerm);
  const k = Math.max(1, Math.min(N, currentTerm));
  const pending = Math.max(1, N - k + 1);

  if (liquidationAmount <= 0) {
    return { originalPrincipal: 0, totalToPay: 0 };
  }

  // 1. Monto real que se pidió (Capital original P):
  // Dado que Liquidación = pending * (P / N), entonces:
  // P = Liquidación * N / pending
  const originalPrincipal = Math.round((liquidationAmount * N / pending) * 100) / 100;

  // 2. Monto que se va a pagar total original (T):
  // Si se conoce el abono mensual (o se ingresó en el importe del gasto):
  // T = initialDebt + (k - 1) * monthlyPayment
  // Si no se tiene cuota mensual, se deduce a partir del saldo inicial y cuotas pendientes:
  const effectiveMonthly = (monthlyPayment !== undefined && monthlyPayment > 0)
    ? monthlyPayment
    : (initialDebt > 0 ? (initialDebt / pending) : 0);

  const totalToPay = initialDebt > 0
    ? Math.round((initialDebt + (k - 1) * effectiveMonthly) * 100) / 100
    : Math.round((effectiveMonthly * N) * 100) / 100;

  return { originalPrincipal, totalToPay };
}

/**
 * Calcula de manera integral los datos de un préstamo considerando la cuota actual (que puede ser > 1)
 */
export interface ComprehensiveLoanCalculation {
  monthlyPayment: number;
  monthlyInterest: number;
  monthlyInterestRate: number;
  apr: number;
  totalInterest: number;
  originalPrincipal: number;
  totalToPay: number;
  currentInitialDebt: number;
  currentFinalDebt: number;
  payoffAmount: number;
  interestSaved: number;
  theoreticalInitialDebtForCurrentTerm: number;
  previousInstallmentsCount: number;
  remainingInstallmentsCount: number;
}

export function computeComprehensiveLoan({
  currentTerm,
  totalTerm,
  monthInitialDebt,
  calcMode,
  originalPrincipalInput,
  totalToPayInput,
  annualRateInput,
  userAmount
}: {
  currentTerm: number;
  totalTerm: number;
  monthInitialDebt: number;
  calcMode: 'totalPay' | 'interestRate';
  originalPrincipalInput?: number;
  totalToPayInput: number;
  annualRateInput: number;
  userAmount: number;
}): ComprehensiveLoanCalculation {
  const cTerm = Math.max(1, currentTerm);
  const tTerm = Math.max(1, totalTerm);
  const prevCount = cTerm - 1;
  const remainingCount = Math.max(0, tTerm - cTerm);

  let monthlyPayment = 0;
  let apr = 0;
  let totalInterest = 0;
  let originalPrincipal = originalPrincipalInput && originalPrincipalInput > 0 ? originalPrincipalInput : 0;
  let totalToPay = 0;

  if (calcMode === 'totalPay') {
    // Modo A: Monto del préstamo / deuda original y monto total que se va a pagar
    if (totalToPayInput > 0) {
      totalToPay = totalToPayInput;
      monthlyPayment = totalToPayInput / tTerm;

      // Si no se proporcionó un capital original / monto de deuda explícito
      if (!originalPrincipal || originalPrincipal <= 0) {
        if (monthInitialDebt > 0 && prevCount > 0) {
          originalPrincipal = Math.max(0, (monthInitialDebt + (prevCount * monthlyPayment)) * 0.85);
        } else {
          originalPrincipal = Math.max(0, totalToPay * 0.75);
        }
      }

      totalInterest = Math.max(0, totalToPay - originalPrincipal);
      const est = estimateAPRFromTotal(originalPrincipal, totalToPay, tTerm);
      apr = est.apr;
    } else {
      monthlyPayment = userAmount > 0 ? userAmount : (monthInitialDebt > 0 ? (monthInitialDebt / (remainingCount + 1)) : 0);
      totalToPay = monthlyPayment * tTerm;
      if (!originalPrincipal || originalPrincipal <= 0) {
        originalPrincipal = totalToPay * 0.8;
      }
      totalInterest = Math.max(0, totalToPay - originalPrincipal);
      apr = 0;
    }
  } else {
    // Modo B: Tasa de interés anual (%) ingresada
    apr = Math.max(0, annualRateInput);
    if (!originalPrincipal || originalPrincipal <= 0) {
      if (monthInitialDebt > 0) {
        originalPrincipal = monthInitialDebt;
      } else if (userAmount > 0) {
        originalPrincipal = userAmount * tTerm * 0.8;
      }
    }

    if (originalPrincipal > 0) {
      monthlyPayment = calculateAmortizationMonthlyPayment(originalPrincipal, apr, tTerm);
      totalToPay = monthlyPayment * tTerm;
      totalInterest = Math.max(0, totalToPay - originalPrincipal);
    } else {
      monthlyPayment = userAmount > 0 ? userAmount : 0;
      totalToPay = monthlyPayment * tTerm;
      totalInterest = 0;
    }
  }

  // Interés mensual ($) y Tasa mensual (%)
  const monthlyInterest = tTerm > 0 ? (totalInterest / tTerm) : 0;
  const monthlyInterestRate = (originalPrincipal > 0 && tTerm > 0)
    ? ((monthlyInterest / originalPrincipal) * 100)
    : (apr > 0 ? (apr / 12) : 0);

  // Deuda inicial matemática teórica para la cuota actual
  const startingCreditBalance = totalToPay > 0 ? totalToPay : (originalPrincipal + totalInterest);
  const theoreticalInitialDebtForCurrentTerm = Math.max(0, startingCreditBalance - (prevCount * monthlyPayment));

  // Saldo inicial a usar: si el usuario especificó uno manualmente > 0, respetarlo;
  // de lo contrario usar el teórico calculado según la cuota
  const effectiveInitialDebt = monthInitialDebt > 0 ? monthInitialDebt : theoreticalInitialDebtForCurrentTerm;
  
  // El pago del mes: priorizar el monto real ingresado por el usuario en Monto
  const paymentForMonth = userAmount > 0 ? userAmount : monthlyPayment;
  
  // Cálculo exacto del restante de deuda: Deuda Inicial - Pago del Mes
  const currentFinalDebt = Math.max(0, effectiveInitialDebt - paymentForMonth);

  // Cálculo de liquidación y ahorro de interés si se liquida ese mes ANTES del pago
  const { payoffAmount, interestSaved } = computePayoffAndSavings({
    originalPrincipal,
    totalToPay,
    totalTerm: tTerm,
    currentTerm: cTerm,
    initialDebt: effectiveInitialDebt
  });

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    monthlyInterest: Math.round(monthlyInterest * 100) / 100,
    monthlyInterestRate: Math.round(monthlyInterestRate * 100) / 100,
    apr: Math.round(apr * 10) / 10,
    totalInterest: Math.round(totalInterest * 100) / 100,
    originalPrincipal: Math.round(originalPrincipal * 100) / 100,
    totalToPay: Math.round(totalToPay * 100) / 100,
    currentInitialDebt: Math.round(effectiveInitialDebt * 100) / 100,
    currentFinalDebt: Math.round(currentFinalDebt * 100) / 100,
    payoffAmount,
    interestSaved,
    theoreticalInitialDebtForCurrentTerm: Math.round(theoreticalInitialDebtForCurrentTerm * 100) / 100,
    previousInstallmentsCount: prevCount,
    remainingInstallmentsCount: remainingCount
  };
}

/**
 * Calcula los totales financieros de un mes
 */
export interface MonthTotals {
  accumulated: number; // Monto de la primera fila "Acumulado"
  totalIncome: number; // Ingresos presupuestados (sin contar Acumulado)
  totalExpense: number; // Gastos presupuestados
  endOfMonthTotal: number; // Total fin de mes proyectado (Acumulado + Ingresos - Gastos)
  totalActual: number; // Dinero real al momento (solo transacciones con isDone = true)
  totalInitialDebt: number; // Suma de deuda inicial de préstamos
  totalFinalDebt: number; // Suma de deuda restante de préstamos
  doneCount: number;
  totalTransactionsCount: number;
}

export function computeMonthTotals(transactions: Transaction[]): MonthTotals {
  let accumulated = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  let totalActual = 0;
  let totalInitialDebt = 0;
  let totalFinalDebt = 0;
  let doneCount = 0;

  transactions.forEach((tx) => {
    if (tx.isAutoAccumulated) {
      accumulated = tx.amount;
      if (tx.isDone) {
        totalActual += (tx.actualAmount !== null ? tx.actualAmount : tx.amount);
        doneCount++;
      }
      return;
    }

    if (tx.isDone) {
      doneCount++;
      const val = (tx.actualAmount !== null ? tx.actualAmount : tx.amount);
      totalActual += val;
    }

    if (tx.amount >= 0) {
      totalIncome += tx.amount;
    } else {
      totalExpense += Math.abs(tx.amount);
    }

    if (tx.loanDetails) {
      totalInitialDebt += tx.loanDetails.initialDebt || 0;
      totalFinalDebt += tx.loanDetails.finalDebt || 0;
    }
  });

  const endOfMonthTotal = accumulated + totalIncome - totalExpense;

  return {
    accumulated,
    totalIncome,
    totalExpense,
    endOfMonthTotal,
    totalActual,
    totalInitialDebt,
    totalFinalDebt,
    doneCount,
    totalTransactionsCount: transactions.length
  };
}

/**
 * Calcula los totales y proyecciones quincenales (1ª Quincena: días 1-15, 2ª Quincena: días 16-fin de mes)
 */
export function computeQuincenaTotals(
  transactions: Transaction[],
  month: number,
  year: number
): BiweeklyBreakdown {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let accumulated = 0;
  let q1Income = 0;
  let q1Expense = 0;
  let q1Actual = 0;
  let q1DoneCount = 0;
  let q1TxCount = 0;
  let q1LoanDue = 0;

  let q2Income = 0;
  let q2Expense = 0;
  let q2Actual = 0;
  let q2DoneCount = 0;
  let q2TxCount = 0;
  let q2LoanDue = 0;

  transactions.forEach((tx) => {
    if (tx.isAutoAccumulated) {
      accumulated = tx.amount;
      if (tx.isDone) {
        const val = tx.actualAmount !== null ? tx.actualAmount : tx.amount;
        q1Actual += val;
        q1DoneCount++;
      }
      return;
    }

    const isQ1 = tx.day <= 15;
    const valActual = tx.actualAmount !== null ? tx.actualAmount : tx.amount;

    if (isQ1) {
      q1TxCount++;
      if (tx.amount >= 0) {
        q1Income += tx.amount;
      } else {
        q1Expense += Math.abs(tx.amount);
      }
      if (tx.loanDetails) {
        q1LoanDue += Math.abs(tx.amount);
      }
      if (tx.isDone) {
        q1Actual += valActual;
        q1DoneCount++;
      }
    } else {
      q2TxCount++;
      if (tx.amount >= 0) {
        q2Income += tx.amount;
      } else {
        q2Expense += Math.abs(tx.amount);
      }
      if (tx.loanDetails) {
        q2LoanDue += Math.abs(tx.amount);
      }
      if (tx.isDone) {
        q2Actual += valActual;
        q2DoneCount++;
      }
    }
  });

  // Saldo con el que arranca Q1 = Acumulado
  const q1Start = accumulated;
  // Saldo proyectado de Q1 al día 15 tras cubrir ingresos y gastos de días 1 al 15
  const q1ProjectedClose = q1Start + q1Income - q1Expense;
  const q1HasDeficit = q1ProjectedClose < 0;
  const q1DeficitAmount = q1HasDeficit ? Math.abs(q1ProjectedClose) : 0;

  // Q2 arranca con el saldo con el que cerró Q1
  const q2Start = q1ProjectedClose;
  // Saldo proyectado de Q2 al cierre de mes (equivale al Total Fin de Mes)
  const q2ProjectedClose = q2Start + q2Income - q2Expense;
  const q2HasDeficit = q2ProjectedClose < 0;
  const q2DeficitAmount = q2HasDeficit ? Math.abs(q2ProjectedClose) : 0;

  return {
    q1: {
      quincena: 1,
      dayRange: '1 - 15',
      startBalance: Math.round(q1Start * 100) / 100,
      totalIncome: Math.round(q1Income * 100) / 100,
      totalExpense: Math.round(q1Expense * 100) / 100,
      projectedClose: Math.round(q1ProjectedClose * 100) / 100,
      totalActual: Math.round(q1Actual * 100) / 100,
      doneCount: q1DoneCount,
      totalTransactionsCount: q1TxCount,
      hasDeficit: q1HasDeficit,
      deficitAmount: Math.round(q1DeficitAmount * 100) / 100,
      totalDueLoanPayments: Math.round(q1LoanDue * 100) / 100
    },
    q2: {
      quincena: 2,
      dayRange: `16 - ${daysInMonth}`,
      startBalance: Math.round(q2Start * 100) / 100,
      totalIncome: Math.round(q2Income * 100) / 100,
      totalExpense: Math.round(q2Expense * 100) / 100,
      projectedClose: Math.round(q2ProjectedClose * 100) / 100,
      totalActual: Math.round(q2Actual * 100) / 100,
      doneCount: q2DoneCount,
      totalTransactionsCount: q2TxCount,
      hasDeficit: q2HasDeficit,
      deficitAmount: Math.round(q2DeficitAmount * 100) / 100,
      totalDueLoanPayments: Math.round(q2LoanDue * 100) / 100
    }
  };
}

/**
 * Limpia y sanea de forma exhaustiva los meses para garantizar que:
 * 1. Cada mes tenga EXACTAMENTE UNA fila de "Acumulado" legítima para ese mes.
 * 2. Se elimine cualquier duplicado de "Acumulado" proveniente de otros meses (ej. 01-oct en agosto).
 * 3. Se preserven los valores personalizados del usuario (monto, actualAmount, isDone) en la fila legítima.
 * 4. El Acumulado nunca quede marcado como recurrente (isRecurring = false).
 */
export function sanitizeAndDeduplicateMonths(
  months: Record<string, MonthData>,
  language: Language = 'es'
): Record<string, MonthData> {
  const cleaned: Record<string, MonthData> = {};

  for (const [key, monthData] of Object.entries(months)) {
    if (!monthData) continue;
    const parts = key.split('-');
    const curYear = monthData.year ?? Number(parts[0]) ?? 2026;
    const curMonth = monthData.month ?? Number(parts[1]) ?? 0;

    const txs = Array.isArray(monthData.transactions) ? monthData.transactions : [];

    // Identificar candidatos de Acumulado
    const accCandidates: Transaction[] = [];
    const regularTxs: Transaction[] = [];

    for (const t of txs) {
      const isAcc = (
        t.isAutoAccumulated === true ||
        t.concept.trim().toLowerCase() === 'acumulado' ||
        t.id.startsWith('acc-') ||
        t.id.includes('-acc')
      );

      if (isAcc) {
        accCandidates.push(t);
      } else {
        regularTxs.push(t);
      }
    }

    // Extraer mejores valores si el usuario personalizó alguno de los acumulados
    let bestAmount = 0;
    let bestActual: number | null = null;
    let bestDone = false;
    let bestHasCustomActual = false;

    // Buscar si hay alguno que corresponda específicamente a este mes
    const nativeAcc = accCandidates.find(t => t.id === `acc-${curYear}-${curMonth}`);
    const otherAccs = accCandidates.filter(t => t.id !== `acc-${curYear}-${curMonth}`);

    if (nativeAcc) {
      bestAmount = nativeAcc.amount;
      bestActual = nativeAcc.actualAmount ?? null;
      bestDone = !!nativeAcc.isDone;
      bestHasCustomActual = !!nativeAcc.hasCustomActual;
    }

    // Si los otros candidatos tienen datos reales (ej. usuario editó un acumulado duplicado con actual real)
    for (const stray of otherAccs) {
      if (stray.hasCustomActual && stray.actualAmount !== null) {
        bestActual = stray.actualAmount;
        bestHasCustomActual = true;
        bestDone = true;
      } else if (bestActual === null && stray.actualAmount !== null) {
        bestActual = stray.actualAmount;
        bestDone = true;
      }
      if (bestAmount === 0 && stray.amount !== 0) {
        bestAmount = stray.amount;
      }
    }

    const singleAccumulated: Transaction = {
      id: `acc-${curYear}-${curMonth}`,
      label: 'Neto',
      concept: 'Acumulado',
      amount: bestAmount,
      day: 1,
      dateString: getDateString(1, curMonth, language),
      isRecurring: false, // El acumulado NUNCA debe ser recurrente
      isDone: bestDone,
      actualAmount: bestActual,
      hasCustomActual: bestHasCustomActual,
      highlight: 'none',
      isAutoAccumulated: true
    };

    cleaned[key] = {
      ...monthData,
      year: curYear,
      month: curMonth,
      transactions: [singleAccumulated, ...regularTxs]
    };
  }

  return cleaned;
}

/**
 * Recalcula en cascada el "Acumulado" para los meses y años existentes (hasta MAX_CATALOG_YEAR).
 * Ahora propaga TANTO el Monto Proyectado (endOfMonthTotal) COMO el Actual (Real) (totalActual)
 * del mes anterior automáticamente.
 */
export function cascadeAccumulatedBalances(
  months: Record<string, MonthData>,
  startYear: number,
  startMonth: number,
  language: Language = 'es'
): Record<string, MonthData> {
  // Primero saneamos y eliminamos cualquier duplicado o residuo
  const updated = sanitizeAndDeduplicateMonths(months, language);
  
  // Determinamos el balance final del mes actual
  let currentKey = `${startYear}-${startMonth}`;
  if (!updated[currentKey]) return updated;

  let currentTotals = computeMonthTotals(updated[currentKey].transactions);
  let carryOverProjected = currentTotals.endOfMonthTotal;
  let carryOverActual = currentTotals.totalActual;
  let carryOverDone = currentTotals.doneCount > 0 || currentTotals.totalActual !== 0;

  // Encontrar el año más alto existente en `updated`
  const existingYears = Object.keys(updated)
    .map(k => parseInt(k.split('-')[0], 10))
    .filter(y => !isNaN(y));
  const maxExistingYear = existingYears.length > 0 ? Math.max(...existingYears) : startYear;
  const maxYearToCascade = Math.min(Math.max(startYear, maxExistingYear), MAX_CATALOG_YEAR);

  let curY = startYear;
  let curM = startMonth + 1;

  while (curY <= maxYearToCascade) {
    if (curM >= 12) {
      curM = 0;
      curY += 1;
      if (curY > maxYearToCascade) break;
    }

    const nextKey = `${curY}-${curM}`;
    // Si el mes no existe en updated, solo lo inicializamos si hay años existentes por delante
    if (!updated[nextKey]) {
      if (curY > maxExistingYear) {
        break;
      }
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      updated[nextKey] = {
        year: curY,
        month: curM,
        title: `${monthNames[curM]} (${curY})`,
        transactions: [],
        creditCards: [],
        hasUserActivity: false
      };
    }

    const monthData = updated[nextKey];
    let txs = [...monthData.transactions];

    // Buscar la fila de acumulado
    let accIndex = txs.findIndex(t => t.isAutoAccumulated || t.concept.trim().toLowerCase() === 'acumulado');

    if (accIndex >= 0) {
      const existing = txs[accIndex];
      const hasCustom = existing.hasCustomActual === true;

      txs[accIndex] = {
        ...existing,
        id: `acc-${curY}-${curM}`,
        label: 'Neto',
        concept: 'Acumulado',
        amount: carryOverProjected,
        day: 1,
        dateString: getDateString(1, curM, language),
        isRecurring: false,
        isAutoAccumulated: true,
        // Si el usuario especificó manualmente su propio actual real, respetarlo.
        // Si no, autocompletar con el actual real del mes anterior.
        actualAmount: hasCustom ? existing.actualAmount : carryOverActual,
        isDone: hasCustom ? existing.isDone : carryOverDone,
        hasCustomActual: hasCustom
      };
    } else {
      // Insertamos Acumulado al inicio
      txs.unshift({
        id: `acc-${curY}-${curM}`,
        label: 'Neto',
        concept: 'Acumulado',
        amount: carryOverProjected,
        day: 1,
        dateString: getDateString(1, curM, language),
        isRecurring: false,
        isDone: carryOverDone,
        actualAmount: carryOverActual,
        hasCustomActual: false,
        highlight: 'none',
        isAutoAccumulated: true
      });
    }

    // Filtrar cualquier duplicado residual en caso de que existiera
    const singleAcc = txs.find(t => t.isAutoAccumulated)!;
    const cleanRegular = txs.filter(t => !t.isAutoAccumulated && t.concept.trim().toLowerCase() !== 'acumulado');
    const finalTxs = [singleAcc, ...cleanRegular];

    updated[nextKey] = {
      ...monthData,
      transactions: finalTxs
    };

    // Actualizamos los saldos para el siguiente mes en la cadena
    const nextTotals = computeMonthTotals(finalTxs);
    carryOverProjected = nextTotals.endOfMonthTotal;
    carryOverActual = nextTotals.totalActual;
    carryOverDone = nextTotals.doneCount > 0 || nextTotals.totalActual !== 0;
    curM += 1;
  }

  return updated;
}

/**
 * Obtiene los totales del mes anterior más cercano para consultar el real y proyectado
 */
export function getPreviousMonthTotals(
  months: Record<string, MonthData>,
  year: number,
  month: number
): { endOfMonthTotal: number; totalActual: number; hasData: boolean } | null {
  let prevM = month - 1;
  let prevY = year;
  if (prevM < 0) {
    prevM = 11;
    prevY = year - 1;
  }

  const prevKey = `${prevY}-${prevM}`;
  if (months[prevKey] && months[prevKey].transactions && months[prevKey].transactions.length > 0) {
    const totals = computeMonthTotals(months[prevKey].transactions);
    return {
      endOfMonthTotal: totals.endOfMonthTotal,
      totalActual: totals.totalActual,
      hasData: true
    };
  }

  // Si no está inmediatamente anterior, buscar el mes anterior poblado más cercano
  const allPreceding = Object.keys(months).filter(k => {
    const [y, m] = k.split('-').map(Number);
    return y < year || (y === year && m < month);
  });

  if (allPreceding.length > 0) {
    allPreceding.sort((a, b) => {
      const [yA, mA] = a.split('-').map(Number);
      const [yB, mB] = b.split('-').map(Number);
      return (yA * 12 + mA) - (yB * 12 + mB);
    });
    const closestKey = allPreceding[allPreceding.length - 1];
    if (months[closestKey] && months[closestKey].transactions.length > 0) {
      const totals = computeMonthTotals(months[closestKey].transactions);
      return {
        endOfMonthTotal: totals.endOfMonthTotal,
        totalActual: totals.totalActual,
        hasData: true
      };
    }
  }

  return null;
}

