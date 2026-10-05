import React from 'react';
import { 
  Search, 
  Plus, 
  Pin, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  Calculator,
  ChevronDown
} from 'lucide-react';
import { 
  Transaction, 
  TransactionLabel, 
  Language, 
  FilterType 
} from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES } from '../utils/translations';
import { 
  MonthTotals, 
  formatCurrency, 
  computePayoffAndSavings, 
  computeQuincenaTotals,
  getDateString,
  clampDayToMonth
} from '../utils/calculations';

interface CashFlowTableProps {
  transactions: Transaction[];
  totals: MonthTotals;
  totalLiquidity: number;
  selectedMonth: number;
  year: number;
  language: Language;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pinAccumulated: boolean;
  onTogglePinAccumulated: () => void;
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
  onMoveTransaction?: (id: string, direction: 'up' | 'down') => void;
  onToggleDone: (id: string) => void;
  onOpenAmortizationModal: (tx: Transaction) => void;
}

// Estilos automáticos por ETIQUETA
const LABEL_ROW_STYLES: Record<TransactionLabel, {
  rowClass: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  Ingreso: {
    rowClass: 'bg-emerald-100/90 hover:bg-emerald-200/75 dark:bg-emerald-900/45 dark:hover:bg-emerald-900/65 border-l-4 border-l-emerald-500',
    badgeBg: 'bg-emerald-200/90 dark:bg-emerald-500/30',
    badgeText: 'text-emerald-950 dark:text-emerald-100 font-bold',
    badgeBorder: 'border-emerald-400 dark:border-emerald-400/60'
  },
  Gasto: {
    rowClass: 'bg-rose-100/90 hover:bg-rose-200/75 dark:bg-rose-900/45 dark:hover:bg-rose-900/65 border-l-4 border-l-rose-500',
    badgeBg: 'bg-rose-200/90 dark:bg-rose-500/30',
    badgeText: 'text-rose-950 dark:text-rose-100 font-bold',
    badgeBorder: 'border-rose-400 dark:border-rose-400/60'
  },
  Préstamo: {
    rowClass: 'bg-purple-100/90 hover:bg-purple-200/75 dark:bg-purple-900/45 dark:hover:bg-purple-900/65 border-l-4 border-l-purple-500',
    badgeBg: 'bg-purple-200/90 dark:bg-purple-500/30',
    badgeText: 'text-purple-950 dark:text-purple-100 font-bold',
    badgeBorder: 'border-purple-400 dark:border-purple-400/60'
  },
  Servicio: {
    rowClass: 'bg-amber-100/90 hover:bg-amber-200/75 dark:bg-amber-900/45 dark:hover:bg-amber-900/65 border-l-4 border-l-amber-500',
    badgeBg: 'bg-amber-200/90 dark:bg-amber-500/30',
    badgeText: 'text-amber-950 dark:text-amber-100 font-bold',
    badgeBorder: 'border-amber-400 dark:border-amber-400/60'
  },
  Suscripción: {
    rowClass: 'bg-blue-100/90 hover:bg-blue-200/75 dark:bg-blue-950/45 dark:hover:bg-blue-900/60 border-l-4 border-l-blue-500',
    badgeBg: 'bg-blue-200/90 dark:bg-blue-500/30',
    badgeText: 'text-blue-950 dark:text-blue-100 font-bold',
    badgeBorder: 'border-blue-400 dark:border-blue-400/60'
  },
  Crédito: {
    rowClass: 'bg-indigo-100/90 hover:bg-indigo-200/75 dark:bg-indigo-900/45 dark:hover:bg-indigo-900/65 border-l-4 border-l-indigo-500',
    badgeBg: 'bg-indigo-200/90 dark:bg-indigo-500/30',
    badgeText: 'text-indigo-950 dark:text-indigo-100 font-bold',
    badgeBorder: 'border-indigo-400 dark:border-indigo-400/60'
  },
  Neto: {
    rowClass: 'bg-teal-100/90 hover:bg-teal-200/75 dark:bg-teal-900/45 dark:hover:bg-teal-900/65 border-l-4 border-l-teal-500 font-semibold',
    badgeBg: 'bg-teal-200/90 dark:bg-teal-500/30',
    badgeText: 'text-teal-950 dark:text-teal-100 font-bold',
    badgeBorder: 'border-teal-400 dark:border-teal-400/60'
  },
  Coppel: {
    rowClass: 'bg-yellow-100/95 hover:bg-yellow-200/85 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 border-l-4 border-l-yellow-500',
    badgeBg: 'bg-yellow-200/95 dark:bg-yellow-500/35',
    badgeText: 'text-yellow-950 dark:text-yellow-100 font-bold',
    badgeBorder: 'border-yellow-400 dark:border-yellow-500/60'
  },
  Otro: {
    rowClass: 'bg-slate-200/75 hover:bg-slate-200/95 dark:bg-neutral-800/60 dark:hover:bg-neutral-800/80 border-l-4 border-l-slate-400',
    badgeBg: 'bg-slate-300/80 dark:bg-neutral-700/80',
    badgeText: 'text-slate-950 dark:text-neutral-100 font-bold',
    badgeBorder: 'border-slate-400 dark:border-neutral-600/60'
  }
};

export const CashFlowTable: React.FC<CashFlowTableProps> = ({
  transactions,
  totals,
  selectedMonth,
  year,
  language,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  pinAccumulated,
  onTogglePinAccumulated,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  onDuplicateTransaction,
  onToggleDone,
  onOpenAmortizationModal
}) => {
  const t = TRANSLATIONS[language];
  const monthName = MONTH_NAMES[language][selectedMonth];

  // Separar Acumulado si está fijado arriba
  const accumulatedRow = transactions.find(tx => tx.isAutoAccumulated || tx.concept.trim().toLowerCase() === 'acumulado');

  // ORDENADO AUTOMÁTICO POR FECHA (Día 1 al 31)
  const regularRows = [...transactions]
    .filter(tx => tx.id !== accumulatedRow?.id)
    .sort((a, b) => (Number(a.day) || 0) - (Number(b.day) || 0) || a.concept.localeCompare(b.concept));

  // Totales quincenales para subtotales de tabla
  const biweekly = computeQuincenaTotals(transactions, selectedMonth, year);

  // Filtrado y búsqueda
  const filteredRows = regularRows.filter(tx => {
    // Filtro por quincena
    if (filter === 'q1' && tx.day > 15) return false;
    if (filter === 'q2' && tx.day <= 15) return false;

    // Filtro por estado
    if (filter === 'done' && !tx.isDone) return false;
    if (filter === 'pending' && tx.isDone) return false;

    // Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchConcept = tx.concept.toLowerCase().includes(q);
      const matchLabel = tx.label.toLowerCase().includes(q);
      const matchDate = tx.dateString.toLowerCase().includes(q);
      return matchConcept || matchLabel || matchDate;
    }

    return true;
  });

  const isQ2Filter = (filter as FilterType) === 'q2';
  const shouldIncludeAccumulated = accumulatedRow && !isQ2Filter && (
    filter === 'all' || 
    filter === 'q1' || 
    (filter === 'done' && accumulatedRow.isDone) || 
    (filter === 'pending' && !accumulatedRow.isDone)
  );

  const displayRows = pinAccumulated && accumulatedRow && !isQ2Filter
    ? [accumulatedRow, ...filteredRows]
    : (shouldIncludeAccumulated
        ? [accumulatedRow, ...filteredRows]
        : filteredRows);

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3">

      {/* Toolbar: Búsqueda, Filtros y Acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-neutral-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-2xs">
        
        {/* Barra de búsqueda */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-8 pr-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Filtros: Mobile Dropdown (< sm) vs Desktop Pills (sm:) */}
        <div className="flex items-center gap-1.5 justify-between sm:justify-start">
          {/* Mobile Filter Selector */}
          <div className="flex sm:hidden relative flex-1 items-center">
            <select
              value={filter}
              onChange={(e) => onFilterChange(e.target.value as FilterType)}
              className="w-full appearance-none bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-[11px] font-bold text-slate-800 dark:text-neutral-200 rounded-lg pl-2.5 pr-6 py-1 focus:outline-none cursor-pointer"
              aria-label="Filtrar movimientos"
            >
              <option value="all">📋 {t.allRows}</option>
              <option value="q1">🌓 {t.filterQ1}</option>
              <option value="q2">🌔 {t.filterQ2}</option>
              <option value="done">✓ {t.onlyDone}</option>
              <option value="pending">⏳ {t.onlyPending}</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2" />
          </div>

          {/* Desktop Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-neutral-950/80 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex-wrap">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-neutral-800 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.allRows}
            </button>
            
            <button
              onClick={() => onFilterChange('q1')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
                filter === 'q1'
                  ? 'bg-teal-600 text-white dark:bg-teal-500/20 dark:text-teal-300 shadow-2xs dark:border dark:border-teal-500/30'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🌓</span>
              <span>{t.filterQ1}</span>
            </button>

            <button
              onClick={() => onFilterChange('q2')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
                filter === 'q2'
                  ? 'bg-sky-600 text-white dark:bg-sky-500/20 dark:text-sky-300 shadow-2xs dark:border dark:border-sky-500/30'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🌔</span>
              <span>{t.filterQ2}</span>
            </button>

            <button
              onClick={() => onFilterChange('done')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'done'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300 shadow-2xs dark:border dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.onlyDone}
            </button>

            <button
              onClick={() => onFilterChange('pending')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white dark:bg-amber-500/20 dark:text-amber-300 shadow-2xs dark:border dark:border-amber-500/30'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.onlyPending}
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onTogglePinAccumulated}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                pinAccumulated
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400'
                  : 'bg-white dark:bg-neutral-950/80 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Mantiene la fila de Acumulado siempre en la primera posición"
            >
              <Pin className={`w-3 h-3 ${pinAccumulated ? 'fill-current text-emerald-600 dark:text-emerald-400' : ''}`} />
              <span className="hidden md:inline">
                {pinAccumulated ? t.unpinAccumulated : t.pinAccumulated}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] sm:text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{language === 'es' ? 'Movimiento' : 'Transaction'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de estado y conteo de filas */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400 px-1 font-medium">
        <span className="font-semibold text-slate-800 dark:text-neutral-200">
          {monthName} {year}
        </span>
        <span className="font-semibold text-slate-700 dark:text-neutral-300 tabular-nums">
          {displayRows.length} / {transactions.length} {t.itemsCount}
        </span>
      </div>

      {/* Tabla Principal con Scroll Horizontal */}
      <div className="w-full overflow-x-auto rounded-xl sm:rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/90 shadow-2xs scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-300 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900/90 text-slate-700 dark:text-neutral-400 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
              <th className="py-2 px-2.5 w-9 text-center">{t.colNumber}</th>
              <th className="py-2 px-2.5 w-24">{t.colLabel}</th>
              <th className="py-2 px-2.5 w-24">{t.colDate}</th>
              <th className="py-2 px-2.5 min-w-[180px]">{t.colConcept}</th>
              <th className="py-2 px-2.5 w-28 text-right">{t.colAmount}</th>
              <th className="py-2 px-2.5 w-28 text-right">{t.colInitialDebt}</th>
              <th className="py-2 px-2.5 w-28 text-right">{t.colFinalDebt}</th>
              <th className="py-2 px-2.5 w-28 text-right">{t.colPayoff}</th>
              <th className="py-2 px-2.5 w-28 text-right">{t.colInterestSaved}</th>
              <th className="py-2 px-2.5 w-28 text-right">{t.colActualAmount}</th>
              <th className="py-2 px-2.5 w-14 text-center">{t.colDone}</th>
              <th className="py-2 px-2.5 w-20 text-center">{t.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-neutral-800/60 text-xs">
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-slate-500 dark:text-neutral-500 text-xs">
                  {language === 'es' 
                    ? 'No hay movimientos con los filtros seleccionados.' 
                    : 'No entries matching filters.'}
                </td>
              </tr>
            ) : (
              displayRows.map((tx, idx) => {
                const style = LABEL_ROW_STYLES[tx.label] || LABEL_ROW_STYLES['Otro'];
                const isPrimaryAccumulated = accumulatedRow && tx.id === accumulatedRow.id;
                const isAccumulated = isPrimaryAccumulated || tx.isAutoAccumulated;

                return (
                  <tr 
                    key={tx.id}
                    className={`transition-colors duration-150 ${style.rowClass}`}
                  >
                    {/* 1. Row Number */}
                    <td className="py-2 px-2.5 text-center text-slate-400 dark:text-neutral-500 font-medium tabular-nums text-[11px]">
                      {idx + 1}
                    </td>

                    {/* 2. Etiqueta / Tipo */}
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                        {tx.label}
                      </span>
                    </td>

                    {/* 3. Fecha */}
                    <td className="py-2 px-2.5 text-slate-700 dark:text-neutral-300 whitespace-nowrap font-medium text-xs tabular-nums">
                      {(() => {
                        const targetDay = tx.recurringOriginalDay || tx.day;
                        const validDay = isAccumulated ? 1 : clampDayToMonth(targetDay, year, selectedMonth);
                        const safeDateString = getDateString(validDay, selectedMonth, language, year);
                        return (
                          <div className="flex items-center gap-1">
                            <span>{safeDateString}</span>
                            {!isAccumulated && (
                              <span className={`text-[9px] px-1 py-0.2 rounded font-bold border ${
                                validDay <= 15 
                                  ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30' 
                                  : 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/30'
                              }`}>
                                {validDay <= 15 ? '1ªQ' : '2ªQ'}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* 4. Concepto */}
                    <td className="py-2 px-2.5 text-slate-900 dark:text-white font-medium text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{tx.concept}</span>
                        {isAccumulated && (
                          <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-[9px] border border-teal-300 dark:border-teal-500/30 font-bold uppercase">
                            {t.autoBadge}
                          </span>
                        )}
                        {tx.isRecurring && !isAccumulated && (
                          <span 
                            className="px-1 py-0.2 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[9px] font-bold" 
                            title={tx.recurrenceFrequency === 'annual' ? (language === 'es' ? 'Recurrente anual' : 'Annual recurring') : (language === 'es' ? 'Recurrente mensual' : 'Monthly recurring')}
                          >
                            {tx.recurrenceFrequency === 'annual' ? (language === 'es' ? '↻ Anual' : '↻ Annual') : '↻'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Monto */}
                    <td className={`py-2 px-2.5 text-right font-semibold whitespace-nowrap tabular-nums text-xs sm:text-sm ${
                      tx.amount > 0 
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold' 
                        : tx.amount < 0 
                          ? 'text-slate-900 dark:text-neutral-100' 
                          : 'text-slate-500 dark:text-neutral-400'
                    }`}>
                      {formatCurrency(tx.amount)}
                    </td>

                    {/* 6. Deuda (Inicial) */}
                    <td className={`py-2 px-2.5 text-right font-semibold whitespace-nowrap tabular-nums text-[11px] sm:text-xs ${
                      (tx.loanDetails?.loanType === 'receivable' || tx.amount > 0)
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {tx.loanDetails?.initialDebt ? formatCurrency(tx.loanDetails.initialDebt) : '-'}
                    </td>

                    {/* 7. Final (Restante) */}
                    <td className="py-2 px-2.5 text-right text-slate-700 dark:text-neutral-300 font-semibold whitespace-nowrap tabular-nums text-[11px] sm:text-xs">
                      {tx.loanDetails?.finalDebt ? formatCurrency(tx.loanDetails.finalDebt) : '-'}
                    </td>

                    {/* 8. Liquidación */}
                    <td className="py-2 px-2.5 text-right text-amber-800 dark:text-amber-300 font-semibold whitespace-nowrap tabular-nums text-[11px] sm:text-xs">
                      {(() => {
                        if (!tx.loanDetails) return '-';
                        const auto = computePayoffAndSavings({
                          originalPrincipal: tx.loanDetails.originalPrincipal || 0,
                          totalToPay: tx.loanDetails.totalToPay || (Math.abs(tx.amount) * tx.loanDetails.totalTermMonths),
                          totalTerm: tx.loanDetails.totalTermMonths,
                          currentTerm: tx.loanDetails.currentTermMonth,
                          initialDebt: tx.loanDetails.initialDebt
                        });
                        if (auto.payoffAmount > 0) {
                          return formatCurrency(auto.payoffAmount);
                        }
                        return tx.loanDetails.payoffDiscount ? formatCurrency(tx.loanDetails.payoffDiscount) : '-';
                      })()}
                    </td>

                    {/* 9. Ahorro Interés */}
                    <td className="py-2 px-2.5 text-right text-emerald-800 dark:text-emerald-400 font-semibold whitespace-nowrap tabular-nums text-[11px] sm:text-xs">
                      {(() => {
                        if (!tx.loanDetails) return '-';
                        const auto = computePayoffAndSavings({
                          originalPrincipal: tx.loanDetails.originalPrincipal || 0,
                          totalToPay: tx.loanDetails.totalToPay || (Math.abs(tx.amount) * tx.loanDetails.totalTermMonths),
                          totalTerm: tx.loanDetails.totalTermMonths,
                          currentTerm: tx.loanDetails.currentTermMonth,
                          initialDebt: tx.loanDetails.initialDebt
                        });
                        if (auto.interestSaved > 0) {
                          return formatCurrency(auto.interestSaved);
                        }
                        return tx.loanDetails.interestSaved ? formatCurrency(tx.loanDetails.interestSaved) : '-';
                      })()}
                    </td>

                    {/* 10. Actual (Real) */}
                    <td className="py-2 px-2.5 text-right font-semibold whitespace-nowrap tabular-nums text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                      {tx.isDone 
                        ? formatCurrency(tx.actualAmount !== null ? tx.actualAmount : tx.amount)
                        : <span className="text-slate-400 dark:text-neutral-500 font-normal">-</span>
                      }
                    </td>

                    {/* 11. Hecho (Checkbox) */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleDone(tx.id)}
                        className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all cursor-pointer ${
                          tx.isDone
                            ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-transparent hover:border-slate-500 dark:hover:border-neutral-500'
                        }`}
                        title={tx.isDone ? 'Marcado como hecho' : 'Marcar como hecho'}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>
                    </td>

                    {/* 12. Acciones */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-0.5 text-slate-500 dark:text-neutral-400">
                        {/* Botón Amortización */}
                        {tx.loanDetails && (
                          <button
                            type="button"
                            onClick={() => onOpenAmortizationModal(tx)}
                            className="p-1 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Amortización y ahorro"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          className="p-1 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicar */}
                        {!isPrimaryAccumulated && (
                          <button
                            type="button"
                            onClick={() => onDuplicateTransaction(tx)}
                            className="p-1 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Eliminar */}
                        {!isPrimaryAccumulated && (
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx)}
                            className="p-1 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Fila Inferior de Totales */}
          <tfoot>
            <tr className="border-t-2 border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 font-bold text-slate-900 dark:text-white text-xs">
              <td className="py-2.5 px-2.5 text-center text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-extrabold text-[11px]" colSpan={4}>
                {filter === 'q1' 
                  ? (language === 'es' ? 'SUBTOTAL 1ª QUINCENA' : 'SUBTOTAL 1ST BIWEEK')
                  : filter === 'q2'
                    ? (language === 'es' ? 'SUBTOTAL 2ª QUINCENA' : 'SUBTOTAL 2ND BIWEEK')
                    : t.totals}
              </td>
              {/* Total Fin de Mes / Quincena */}
              <td className="py-2.5 px-2.5 text-right text-emerald-700 dark:text-emerald-400 tabular-nums text-xs sm:text-sm font-bold">
                <div>
                  {formatCurrency(
                    filter === 'q1'
                      ? biweekly.q1.projectedClose
                      : filter === 'q2'
                        ? biweekly.q2.projectedClose
                        : totals.endOfMonthTotal
                  )}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-neutral-400 font-normal">
                  {filter === 'q1'
                    ? (language === 'es' ? 'al 15' : 'by day 15')
                    : filter === 'q2'
                      ? (language === 'es' ? 'fin de mes' : 'month end')
                      : t.totalEndOfMonthFoot}
                </div>
              </td>
              {/* Total Deuda Inicial */}
              <td className="py-2.5 px-2.5 text-right text-rose-700 dark:text-rose-400 tabular-nums font-semibold text-[11px] sm:text-xs">
                {formatCurrency(
                  (filter === 'all' && !searchQuery.trim())
                    ? (totals.totalInitialDebt + totals.totalInitialReceivable)
                    : displayRows.reduce((sum, tx) => sum + (tx.loanDetails?.initialDebt || 0), 0)
                )}
              </td>
              {/* Total Deuda Final */}
              <td className="py-2.5 px-2.5 text-right text-slate-700 dark:text-neutral-300 tabular-nums font-semibold text-[11px] sm:text-xs">
                {formatCurrency(
                  (filter === 'all' && !searchQuery.trim())
                    ? (totals.totalFinalDebt + totals.totalFinalReceivable)
                    : displayRows.reduce((sum, tx) => sum + (tx.loanDetails?.finalDebt || 0), 0)
                )}
              </td>
              <td className="py-2.5 px-2.5 text-right text-slate-400 dark:text-neutral-500 tabular-nums text-xs">
                -
              </td>
              <td className="py-2.5 px-2.5 text-right text-slate-400 dark:text-neutral-500 tabular-nums text-xs">
                -
              </td>
              {/* Total Actual */}
              <td className="py-2.5 px-2.5 text-right text-emerald-700 dark:text-emerald-300 tabular-nums text-xs sm:text-sm font-bold">
                <div>
                  {formatCurrency(
                    filter === 'q1'
                      ? biweekly.q1.totalActual
                      : filter === 'q2'
                        ? biweekly.q2.totalActual
                        : totals.totalActual
                  )}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-neutral-400 font-normal">{t.totalActualFoot}</div>
              </td>
              {/* Items Hechos */}
              <td className="py-2.5 px-2 text-center text-slate-800 dark:text-neutral-300 text-xs font-semibold tabular-nums">
                {filter === 'q1' ? biweekly.q1.doneCount : filter === 'q2' ? biweekly.q2.doneCount : totals.doneCount}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
