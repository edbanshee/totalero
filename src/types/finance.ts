export const MIN_CATALOG_YEAR = 2024;
export const MAX_CATALOG_YEAR = 2050;

export type TransactionLabel = 'Ingreso' | 'Gasto' | 'Servicio' | 'Neto' | 'Préstamo' | 'Crédito' | 'Otro' | 'Coppel';

export type RowHighlight = 'none' | 'yellow' | 'blue' | 'green';

export interface LoanDetails {
  loanId?: string;
  institutionName: string;
  totalTermMonths: number;
  currentTermMonth: number;
  initialDebt: number; // Saldo de deuda inicial del mes
  finalDebt: number; // Saldo de deuda restante tras efectuar el pago
  originalPrincipal?: number; // Precio de contado / Capital inicial financiado
  annualInterestRate?: number; // Tasa de Interés Anual APR %
  totalToPay?: number; // Total a pagar a plazos
  totalInterest?: number; // Total de intereses acumulados del crédito
  payoffDiscount?: number; // Monto estimado de liquidación inmediata
  interestSaved?: number; // Ahorro en intereses
  mode: 'totalPay' | 'interestRate';
}

export interface Transaction {
  id: string;
  label: TransactionLabel;
  concept: string;
  amount: number; // Positivo para Ingreso, negativo para Gasto
  day: number; // 1 - 31
  dateString: string; // ej. "15-nov", "16-sep"
  isRecurring: boolean; // Si se proyecta a meses futuros
  isDone: boolean; // Estado [✓ Hecho]
  actualAmount: number | null; // Monto real en cuenta bancaria
  highlight: RowHighlight;
  isAutoAccumulated?: boolean; // Para la fila 1 "Acumulado"
  hasCustomActual?: boolean; // Si el usuario definió manualmente un actual real distinto al automático
  loanDetails?: LoanDetails;
}

export interface CreditCard {
  id: string;
  name: string;
  payDay: number; // Día del mes para pago (ej. 4)
  cutDay: number; // Día de corte (ej. 22)
  amount: number;
  isPaid: boolean;
  notes?: string;
}

export interface CreditLine {
  id: string;
  institution: string;
  availableAmount: number;
}

export interface MonthData {
  year: number;
  month: number; // 0 - 11 (0 = Enero)
  title?: string;
  transactions: Transaction[];
  creditCards: CreditCard[];
  hasUserActivity: boolean;
}

export type Language = 'es' | 'en';
export type ThemeMode = 'dark' | 'light';
export type FilterType = 'all' | 'q1' | 'q2' | 'done' | 'pending';
export type PeriodView = 'month' | 'q1' | 'q2';

export interface QuincenaSummary {
  quincena: 1 | 2;
  dayRange: string; // "1 - 15" o "16 - 30/31"
  startBalance: number;
  totalIncome: number;
  totalExpense: number;
  projectedClose: number;
  totalActual: number;
  doneCount: number;
  totalTransactionsCount: number;
  hasDeficit: boolean;
  deficitAmount: number;
  totalDueLoanPayments: number;
}

export interface BiweeklyBreakdown {
  q1: QuincenaSummary;
  q2: QuincenaSummary;
}

export interface UserSession {
  isLoggedIn: boolean;
  userMode: 'local' | 'cloud';
  email?: string;
  displayName?: string;
}
