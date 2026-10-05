import React, { useMemo, useState } from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Building2, 
  CreditCard, 
  AlertCircle,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Calendar
} from 'lucide-react';
import { Language, Transaction, PeriodView } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { MonthTotals, formatCurrency, computeQuincenaTotals } from '../utils/calculations';

interface MetricCardsProps {
  totals: MonthTotals;
  totalLiquidity: number;
  transactions: Transaction[];
  month: number;
  year: number;
  language: Language;
  periodView: PeriodView;
  onPeriodViewChange: (view: PeriodView) => void;
  onFilterTableQuincena?: (quincena: 1 | 2) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totals,
  totalLiquidity,
  transactions,
  month,
  year,
  language,
  periodView,
  onPeriodViewChange,
  onFilterTableQuincena
}) => {
  const t = TRANSLATIONS[language];

  // Cálculos Quincenales Dinámicos (1-15 y 16-fin)
  const biweekly = useMemo(() => {
    return computeQuincenaTotals(transactions, month, year);
  }, [transactions, month, year]);

  // Base para el Total con Préstamos: 'actual' (Total Actual + Préstamos) vs 'projected' (Total Fin de Mes/Quincena + Préstamos)
  const [loanTotalBasis, setLoanTotalBasis] = useState<'actual' | 'projected'>(() => {
    try {
      const saved = localStorage.getItem('totalero_loan_total_basis');
      if (saved === 'actual' || saved === 'projected') return saved;
    } catch {}
    return 'actual';
  });

  const handleSetLoanTotalBasis = (basis: 'actual' | 'projected') => {
    setLoanTotalBasis(basis);
    try {
      localStorage.setItem('totalero_loan_total_basis', basis);
    } catch {}
  };

  // Valores base para el cálculo de Total con Préstamos según el periodo activo:
  const currentActualBase = periodView === 'q1' 
    ? biweekly.q1.totalActual 
    : (periodView === 'q2' ? biweekly.q2.totalActual : totals.totalActual);

  const currentProjectedBase = periodView === 'q1'
    ? biweekly.q1.projectedClose
    : (periodView === 'q2' ? biweekly.q2.projectedClose : totals.endOfMonthTotal);

  const actualTotalWithLoans = currentActualBase + totalLiquidity;
  const projectedTotalWithLoans = currentProjectedBase + totalLiquidity;

  // Selección de datos según el periodo activo (Mes Completo, 1ª Q, 2ª Q)
  let card1Title = t.totalActual;
  let card1Value = totals.totalActual;
  let card1Badge = `${totals.doneCount} / ${totals.totalTransactionsCount}`;
  let card1Foot = t.realMoneyNow;

  let card2Title = t.totalEndOfMonth;
  let card2Value = totals.endOfMonthTotal;
  let card2Badge = '100% Proj';
  let card2FootLabel = `${t.projDifference}:`;
  let card2FootVal = formatCurrency(totals.endOfMonthTotal - totals.totalActual);
  let card2Positive = totals.endOfMonthTotal >= 0;

  let card3Title = loanTotalBasis === 'actual' ? t.totalActualWithLoans : t.totalEndWithLoans;
  let card3Value = loanTotalBasis === 'actual' ? actualTotalWithLoans : projectedTotalWithLoans;
  let card3Badge = loanTotalBasis === 'actual' 
    ? (language === 'es' ? 'Total Real + Préstamos' : 'Real Cash + Loans') 
    : (language === 'es' ? 'Fin de Mes + Préstamos' : 'Month End + Loans');
  let card3FootLabel = `${t.capitalAvailable}:`;
  let card3FootVal = `+${formatCurrency(totalLiquidity)}`;

  let card4Title = t.loanLine;
  let card4Value = totalLiquidity;
  let card4Badge = 'Líneas';
  let card4Foot = t.availableInCredit;

  let card5Title = t.activeDebt;
  let card5Value = totals.totalFinalDebt;
  let card5Badge = t.balances;
  let card5FootLabel = `${t.initialDebtLabel}:`;
  let card5FootVal = formatCurrency(totals.totalInitialDebt);

  if (periodView === 'q1') {
    card1Title = language === 'es' ? 'Total Actual (1ª Q)' : 'Current Actual (1st Bw)';
    card1Value = biweekly.q1.totalActual;
    card1Badge = `${biweekly.q1.doneCount} / ${biweekly.q1.totalTransactionsCount}`;
    card1Foot = language === 'es' ? 'Dinero real al 15 de mes' : 'Real cash up to day 15';

    card2Title = language === 'es' ? 'Saldo al 15 de Mes' : 'Balance by Day 15';
    card2Value = biweekly.q1.projectedClose;
    card2Badge = biweekly.q1.hasDeficit ? '⚠️ Déficit Q1' : '✓ Superávit Q1';
    card2FootLabel = biweekly.q1.hasDeficit ? 'Faltante:' : 'Margen libre:';
    card2FootVal = biweekly.q1.hasDeficit 
      ? `-${formatCurrency(biweekly.q1.deficitAmount)}` 
      : formatCurrency(biweekly.q1.projectedClose);
    card2Positive = !biweekly.q1.hasDeficit;

    card3Title = loanTotalBasis === 'actual' 
      ? (language === 'es' ? 'Total Actual + Préstamos (1ª Q)' : 'Current Actual + Loans (1st Q)')
      : (language === 'es' ? 'Total al 15 + Préstamos' : 'Total Day 15 + Loans');
    card3Badge = loanTotalBasis === 'actual' 
      ? (language === 'es' ? 'Actual Q1 + Préstamos' : 'Actual Q1 + Loans') 
      : (language === 'es' ? 'Saldo al 15 + Préstamos' : 'Day 15 + Loans');
    card3FootLabel = 'Líneas disponibles:';
    card3FootVal = `+${formatCurrency(totalLiquidity)}`;

    card5Title = language === 'es' ? 'Pagos de Deuda (1ª Q)' : 'Debt Due (1st Bw)';
    card5Value = biweekly.q1.totalDueLoanPayments;
    card5Badge = 'Días 1 - 15';
    card5FootLabel = 'Vencimiento:';
    card5FootVal = 'Antes del 16';
  } else if (periodView === 'q2') {
    card1Title = language === 'es' ? 'Total Actual (2ª Q)' : 'Current Actual (2nd Bw)';
    card1Value = biweekly.q2.totalActual;
    card1Badge = `${biweekly.q2.doneCount} / ${biweekly.q2.totalTransactionsCount}`;
    card1Foot = language === 'es' ? 'Dinero real del 16 al cierre' : 'Real cash from day 16';

    card2Title = language === 'es' ? 'Saldo a Fin de Mes' : 'Month End Balance';
    card2Value = biweekly.q2.projectedClose;
    card2Badge = biweekly.q2.hasDeficit ? '⚠️ Déficit Q2' : '✓ Superávit Q2';
    card2FootLabel = biweekly.q2.hasDeficit ? 'Faltante:' : 'Cierre proyectado:';
    card2FootVal = formatCurrency(biweekly.q2.projectedClose);
    card2Positive = !biweekly.q2.hasDeficit;

    card3Title = loanTotalBasis === 'actual' 
      ? (language === 'es' ? 'Total Actual + Préstamos (2ª Q)' : 'Current Actual + Loans (2nd Q)')
      : (language === 'es' ? 'Total Fin de Mes + Préstamos' : 'Total Month End + Loans');
    card3Badge = loanTotalBasis === 'actual' 
      ? (language === 'es' ? 'Actual Q2 + Préstamos' : 'Actual Q2 + Loans') 
      : (language === 'es' ? 'Fin de Mes + Préstamos' : 'Month End + Loans');
    card3FootLabel = 'Líneas disponibles:';
    card3FootVal = `+${formatCurrency(totalLiquidity)}`;

    card5Title = language === 'es' ? 'Pagos de Deuda (2ª Q)' : 'Debt Due (2nd Bw)';
    card5Value = biweekly.q2.totalDueLoanPayments;
    card5Badge = `Días ${biweekly.q2.dayRange}`;
    card5FootLabel = 'Vencimiento:';
    card5FootVal = 'Hasta fin de mes';
  }

  return (
    <div className="w-full flex flex-col gap-3">
      
      {/* Selector de Periodo (Mes Completo | 1ª Quincena | 2ª Quincena) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {language === 'es' ? 'Horizonte Financiero' : 'Financial Horizon'}
          </span>
        </div>

        {/* Toggle Pills - Clean Light & Dark Mode */}
        <div className="flex items-center bg-slate-200/80 dark:bg-neutral-900 border border-slate-300/80 dark:border-neutral-800 p-0.5 rounded-xl text-xs font-semibold shadow-xs">
          <button
            type="button"
            onClick={() => onPeriodViewChange('month')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              periodView === 'month'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
            }`}
          >
            <span>📅</span>
            <span>{t.periodAllMonth}</span>
          </button>
          
          <button
            type="button"
            onClick={() => onPeriodViewChange('q1')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              periodView === 'q1'
                ? 'bg-white text-teal-800 font-bold shadow-xs border border-slate-200/80 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
            }`}
          >
            <span>🌓</span>
            <span>{t.periodQ1}</span>
          </button>

          <button
            type="button"
            onClick={() => onPeriodViewChange('q2')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              periodView === 'q2'
                ? 'bg-white text-sky-800 font-bold shadow-xs border border-slate-200/80 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50'
            }`}
          >
            <span>🌔</span>
            <span>{t.periodQ2}</span>
          </button>
        </div>
      </div>

      {/* 5 Tarjetas de Métricas Principales (Estilo EdgesPay: Limpio, Aireado, Alto Contraste) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
        {/* 1. Total Actual */}
        <div className="bg-white dark:bg-neutral-900/90 border border-slate-200/90 dark:border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-slate-800 dark:text-neutral-200">{card1Title}</span>
            </div>
          </div>
          
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight my-1 tabular-nums">
            {formatCurrency(card1Value)}
          </div>
          
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
            <span>{card1Foot}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
        </div>

        {/* 2. Saldo Proyectado / Total Fin de Mes */}
        <div className={`rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all border ${
          card2Positive 
            ? 'bg-white dark:bg-neutral-900/90 border-slate-200/90 dark:border-neutral-800/90' 
            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className={`w-3.5 h-3.5 ${card2Positive ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`} />
              <span className="font-bold text-slate-800 dark:text-neutral-200">{card2Title}</span>
            </div>
          </div>

          <div className={`text-xl sm:text-2xl font-black tracking-tight my-1 tabular-nums ${
            card2Positive ? 'text-slate-900 dark:text-white' : 'text-rose-700 dark:text-rose-400'
          }`}>
            {formatCurrency(card2Value)}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 flex items-center justify-between">
            <span>{card2FootLabel}</span>
            <span className="text-slate-800 dark:text-neutral-300 font-bold tabular-nums">
              {card2FootVal}
            </span>
          </div>
        </div>

        {/* 3. Total con Préstamos */}
        <div className="bg-white dark:bg-neutral-900/90 border border-slate-200/90 dark:border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1.5 gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-neutral-200">{card3Title}</span>
            </div>
            
            {/* Selector Interactivo: Base Actual vs Base Proyectada Fin de Mes/Quincena */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => handleSetLoanTotalBasis('actual')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  loanTotalBasis === 'actual'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30 shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
                title={language === 'es' ? 'Mostrar Total Actual + Préstamos' : 'Show Current Actual + Loans'}
              >
                <Zap className="w-3 h-3" />
                <span>{language === 'es' ? 'Total Actual' : 'Current Actual'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetLoanTotalBasis('projected')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  loanTotalBasis === 'projected'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30 shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
                title={language === 'es' 
                  ? (periodView === 'q1' ? 'Mostrar Saldo al 15 + Préstamos' : 'Mostrar Fin de Mes + Préstamos')
                  : (periodView === 'q1' ? 'Show Day 15 close + Loans' : 'Show Month End + Loans')}
              >
                <Calendar className="w-3 h-3" />
                <span>
                  {periodView === 'q1' 
                    ? (language === 'es' ? 'Al 15' : 'Day 15')
                    : (language === 'es' ? 'Fin de Mes' : 'Month End')}
                </span>
              </button>
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight my-1 tabular-nums">
            {formatCurrency(card3Value)}
          </div>

          {/* Breakdown detallado */}
          <div className="flex flex-col gap-1.5 mt-1 pt-1.5 border-t border-slate-100 dark:border-neutral-800/80 text-[11px]">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <span>{loanTotalBasis === 'actual' ? (language === 'es' ? 'Base real:' : 'Real base:') : (language === 'es' ? 'Base proyectada:' : 'Projected base:')}</span>
                <span className="font-semibold text-slate-700 dark:text-neutral-300 tabular-nums">
                  {formatCurrency(loanTotalBasis === 'actual' ? currentActualBase : currentProjectedBase)}
                </span>
                <span>+</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums" title={t.loanLine}>
                  {formatCurrency(totalLiquidity)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 4. Línea de Préstamos */}
        <div className="bg-white dark:bg-neutral-900/90 border border-slate-200/90 dark:border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1.5">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-slate-800 dark:text-neutral-200">{card4Title}</span>
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight my-1 tabular-nums">
            {formatCurrency(card4Value)}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 truncate" title={card4Foot}>
            {card4Foot}
          </div>
        </div>

        {/* 5. Deuda Activa en Mes */}
        <div className="bg-white dark:bg-neutral-900/90 border border-slate-200/90 dark:border-neutral-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1.5">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="font-bold text-slate-800 dark:text-neutral-200">{card5Title}</span>
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 tracking-tight my-1 tabular-nums">
            {formatCurrency(card5Value)}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 flex items-center justify-between">
            <span>{card5FootLabel}</span>
            <span className="text-slate-700 dark:text-neutral-300 font-bold tabular-nums">
              {card5FootVal}
            </span>
          </div>

          {totals.totalFinalReceivable > 0 && periodView === 'month' && (
            <div className="text-[10px] text-teal-700 dark:text-teal-400 pt-1.5 mt-1.5 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between font-semibold">
              <span>{language === 'es' ? '↗ Préstamos por cobrar:' : '↗ Receivable loans:'}</span>
              <span className="tabular-nums font-bold">+{formatCurrency(totals.totalFinalReceivable)}</span>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DE DIAGNÓSTICO QUINCENAL (Flujo de Liquidez Q1 vs Q2) */}
      <div className="bg-white dark:bg-neutral-950/70 border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
        
        {/* Encabezado del Panel */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 dark:border-neutral-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t.biweeklyDiagnosticTitle}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                  Días 1 - 15 vs 16 - {biweekly.q2.dayRange.split('-')[1]?.trim() || 'Fin'}
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {t.biweeklyDiagnosticSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-neutral-400 text-[11px] hidden md:inline">
              {language === 'es' ? 'Previsión de caja en dos fases' : 'Two-phase cash forecast'}
            </span>
          </div>
        </div>

        {/* Las dos columnas: 1ª Quincena y 2ª Quincena */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* Columna 1: 1ª Quincena (1 al 15) */}
          <div className={`rounded-xl p-4 border flex flex-col justify-between gap-3 transition-all ${
            biweekly.q1.hasDeficit 
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 shadow-xs' 
              : 'bg-slate-50/80 dark:bg-neutral-900/60 border-slate-200 dark:border-neutral-800 hover:border-teal-500/40 shadow-xs'
          }`}>
            <div>
              {/* Header Q1 */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌓</span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {t.q1Label} (Días {biweekly.q1.dayRange})
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                      {language === 'es' ? 'Fase inicial del mes' : 'Initial month phase'}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  biweekly.q1.hasDeficit 
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40' 
                    : 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/40'
                }`}>
                  {biweekly.q1.hasDeficit ? '⚠️ DÉFICIT' : '✓ CUBIERTO'}
                </span>
              </div>

              {/* Métricas de Flujo Q1 */}
              <div className="grid grid-cols-3 gap-2 bg-white dark:bg-neutral-950/80 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 text-[11px] mb-3 shadow-xs">
                <div>
                  <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">{t.startBalanceLabel}</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(biweekly.q1.startBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] font-bold">{t.incomeLabel} (+)</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    +{formatCurrency(biweekly.q1.totalIncome)}
                  </span>
                </div>
                <div>
                  <span className="text-rose-700 dark:text-rose-400 block text-[10px] font-bold">{t.expenseLabel} (-)</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                    -{formatCurrency(biweekly.q1.totalExpense)}
                  </span>
                </div>
              </div>

              {/* Saldo Proyectado al día 15 */}
              <div className="flex items-baseline justify-between border-t border-slate-200 dark:border-neutral-800/80 pt-2 mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    {t.projectedCloseLabel}:
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' ? 'Dinero estimado la noche del 15' : 'Estimated cash on the 15th'}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                    biweekly.q1.hasDeficit ? 'text-rose-700 dark:text-rose-400' : 'text-teal-700 dark:text-teal-400'
                  }`}>
                    {formatCurrency(biweekly.q1.projectedClose)}
                  </span>
                </div>
              </div>
            </div>

            {/* Alerta / Recomendación Q1 */}
            <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
              biweekly.q1.hasDeficit 
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200' 
                : 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-500/30 text-teal-900 dark:text-teal-200'
            }`}>
              {biweekly.q1.hasDeficit ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-[11px] leading-tight font-medium">
                  {biweekly.q1.hasDeficit 
                    ? `${t.q1Deficit} (Faltante: ${formatCurrency(biweekly.q1.deficitAmount)})`
                    : `${t.q1Solvent} (Margen libre: ${formatCurrency(biweekly.q1.projectedClose)})`}
                </p>
                {biweekly.q1.totalDueLoanPayments > 0 && (
                  <span className="text-[10px] text-slate-700 dark:text-neutral-300 block mt-1 font-semibold tabular-nums">
                    💳 {t.dueLoanPayments}: {formatCurrency(biweekly.q1.totalDueLoanPayments)}
                  </span>
                )}
              </div>
              {onFilterTableQuincena && (
                <button
                  type="button"
                  onClick={() => onFilterTableQuincena(1)}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 text-[10px] font-bold transition-colors whitespace-nowrap shrink-0 shadow-xs"
                >
                  {language === 'es' ? 'Ver Q1' : 'View Q1'}
                </button>
              )}
            </div>
          </div>

          {/* Columna 2: 2ª Quincena (16 al Fin de Mes) */}
          <div className={`rounded-xl p-4 border flex flex-col justify-between gap-3 transition-all ${
            biweekly.q2.hasDeficit 
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 shadow-xs' 
              : 'bg-slate-50/80 dark:bg-neutral-900/60 border-slate-200 dark:border-neutral-800 hover:border-sky-500/40 shadow-xs'
          }`}>
            <div>
              {/* Header Q2 */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌔</span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {t.q2Label} (Días {biweekly.q2.dayRange})
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                      {language === 'es' ? 'Cierre del mes' : 'Month closing phase'}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  biweekly.q2.hasDeficit 
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40' 
                    : 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/40'
                }`}>
                  {biweekly.q2.hasDeficit ? '⚠️ DÉFICIT' : '✓ CUBIERTO'}
                </span>
              </div>

              {/* Métricas de Flujo Q2 */}
              <div className="grid grid-cols-3 gap-2 bg-white dark:bg-neutral-950/80 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 text-[11px] mb-3 shadow-xs">
                <div>
                  <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                    {language === 'es' ? 'Saldo Inicial (15)' : 'Start Balance (15th)'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(biweekly.q2.startBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] font-bold">{t.incomeLabel} (+)</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    +{formatCurrency(biweekly.q2.totalIncome)}
                  </span>
                </div>
                <div>
                  <span className="text-rose-700 dark:text-rose-400 block text-[10px] font-bold">{t.expenseLabel} (-)</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                    -{formatCurrency(biweekly.q2.totalExpense)}
                  </span>
                </div>
              </div>

              {/* Saldo Proyectado a Fin de Mes */}
              <div className="flex items-baseline justify-between border-t border-slate-200 dark:border-neutral-800/80 pt-2 mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                    {t.projectedCloseLabelQ2}:
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' ? 'Balance final con que terminarás el mes' : 'Final closing balance'}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                    biweekly.q2.hasDeficit ? 'text-rose-700 dark:text-rose-400' : 'text-sky-700 dark:text-sky-400'
                  }`}>
                    {formatCurrency(biweekly.q2.projectedClose)}
                  </span>
                </div>
              </div>
            </div>

            {/* Alerta / Recomendación Q2 */}
            <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
              biweekly.q2.hasDeficit 
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200' 
                : 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-500/30 text-sky-900 dark:text-sky-200'
            }`}>
              {biweekly.q2.hasDeficit ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-[11px] leading-tight font-medium">
                  {biweekly.q2.hasDeficit 
                    ? `${t.q2Deficit} (Déficit: ${formatCurrency(biweekly.q2.deficitAmount)})`
                    : `${t.q2Solvent} (Saldo libre: ${formatCurrency(biweekly.q2.projectedClose)})`}
                </p>
                {biweekly.q2.totalDueLoanPayments > 0 && (
                  <span className="text-[10px] text-slate-700 dark:text-neutral-300 block mt-1 font-semibold tabular-nums">
                    💳 {t.dueLoanPayments}: {formatCurrency(biweekly.q2.totalDueLoanPayments)}
                  </span>
                )}
              </div>
              {onFilterTableQuincena && (
                <button
                  type="button"
                  onClick={() => onFilterTableQuincena(2)}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 text-[10px] font-bold transition-colors whitespace-nowrap shrink-0 shadow-xs"
                >
                  {language === 'es' ? 'Ver Q2' : 'View Q2'}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
