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
  CalendarClock,
  Sparkles
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

// Estilos automáticos por ETIQUETA (Color equilibrado, borde lateral y badge)
const LABEL_ROW_STYLES: Record<TransactionLabel, {
  rowClass: string;
  cardClass: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  Ingreso: {
    rowClass: 'bg-emerald-100/90 hover:bg-emerald-200/75 dark:bg-emerald-900/45 dark:hover:bg-emerald-900/65 border-l-4 border-l-emerald-500',
    cardClass: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-l-4 border-l-emerald-500 border-slate-200 dark:border-neutral-800',
    badgeBg: 'bg-emerald-200/90 dark:bg-emerald-500/30',
    badgeText: 'text-emerald-950 dark:text-emerald-100 font-bold',
    badgeBorder: 'border-emerald-400 dark:border-emerald-400/60'
  },
  Gasto: {
    rowClass: 'bg-rose-100/90 hover:bg-rose-200/75 dark:bg-rose-900/45 dark:hover:bg-rose-900/65 border-l-4 border-l-rose-500',
    cardClass: 'bg-rose-50/90 dark:bg-rose-950/40 border-l-4 border-l-rose-500 border-slate-200 dark:border-neutral-800',
    badgeBg: 'bg-rose-200/90 dark:bg-rose-500/30',
    badgeText: 'text-rose-950 dark:text-rose-100 font-bold',
    badgeBorder: 'border-rose-400 dark:border-rose-400/60'
  },
  Préstamo: {
    rowClass: 'bg-purple-100/90 hover:bg-purple-200/75 dark:bg-purple-900/45 dark:hover:bg-purple-900/65 border-l-4 border-l-purple-500',
    cardClass: 'bg-purple-50/90 dark:bg-purple-950/40 border-l-4 border-l-purple-500 border-slate-200 dark:border-neutral-800',
    badgeBg: 'bg-purple-200/90 dark:bg-purple-500/30',
    badgeText: 'text-purple-950 dark:text-purple-100 font-bold',
    badgeBorder: 'border-purple-400 dark:border-purple-400/60'
  },
  Servicio: {
    rowClass: 'bg-amber-100/90 hover:bg-amber-200/75 dark:bg-amber-900/45 dark:hover:bg-amber-900/65 border-l-4 border-l-amber-500',
    cardClass: 'bg-amber-50/90 dark:bg-amber-950/40 border-l-4 border-l-amber-500 border-slate-200 dark:border-neutral-800',
    badgeBg: 'bg-amber-200/90 dark:bg-amber-500/30',
    badgeText: 'text-amber-950 dark:text-amber-100 font-bold',
    badgeBorder: 'border-amber-400 dark:border-amber-400/60'
  },
  Suscripción: {
    rowClass: 'bg-blue-100/90 hover:bg-blue-200/75 dark:bg-blue-950/45 dark:hover:bg-blue-900/60 border-l-4 border-l-blue-500',
    cardClass: 'bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-l-blue-500 border-slate-200 dark:border-neutral-800',
    badgeBg: 'bg-blue-200/90 dark:bg-blue-500/30',
    badgeText: 'text-blue-950 dark:text-blue-100 font-bold',
    badgeBorder: 'border-blue-400 dark:border-blue-400/60'
  },
  Crédito: {
    rowClass: 'bg-indigo-100/90 hover:bg-indigo-200/75 dark:bg-indigo-900/45 dark:hover:bg-indigo-900/65 border-l-4 border-l-indigo-500',
    cardClass: 'bg-indigo-50/90 dark:bg-indigo-950/40 border-l-4 border-l-indigo-500 border-slate-200 dark:border-neutral-800',
    badgeBg: 'bg-indigo-200/90 dark:bg-indigo-500/30',
    badgeText: 'text-indigo-950 dark:text-indigo-100 font-bold',
    badgeBorder: 'border-indigo-400 dark:border-indigo-400/60'
  },
  Neto: {
    rowClass: 'bg-teal-100/90 hover:bg-teal-200/75 dark:bg-teal-900/45 dark:hover:bg-teal-900/65 border-l-4 border-l-teal-500 font-semibold',
    cardClass: 'bg-teal-50/90 dark:bg-teal-950/40 border-l-4 border-l-teal-500 border-slate-200 dark:border-neutral-800 font-semibold',
    badgeBg: 'bg-teal-200/90 dark:bg-teal-500/30',
    badgeText: 'text-teal-950 dark:text-teal-100 font-bold',
    badgeBorder: 'border-teal-400 dark:border-teal-400/60'
  },
  Coppel: {
    rowClass: 'bg-yellow-100/95 hover:bg-yellow-200/85 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 border-l-4 border-l-yellow-500',
    cardClass: 'bg-yellow-50/95 dark:bg-yellow-950/35 border-l-4 border-l-yellow-500 border-slate-200 dark:border-neutral-800',
    badgeBg: 'bg-yellow-200/95 dark:bg-yellow-500/35',
    badgeText: 'text-yellow-950 dark:text-yellow-100 font-bold',
    badgeBorder: 'border-yellow-400 dark:border-yellow-500/60'
  },
  Otro: {
    rowClass: 'bg-slate-200/75 hover:bg-slate-200/95 dark:bg-neutral-800/60 dark:hover:bg-neutral-800/80 border-l-4 border-l-slate-400',
    cardClass: 'bg-slate-100/80 dark:bg-neutral-900/60 border-l-4 border-l-slate-400 border-slate-200 dark:border-neutral-800',
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

  // Ordenado automático por fecha (Día 1 al 31)
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
    <div className="w-full flex flex-col gap-3 relative">

      {/* ========================================================= */}
      {/* 1. TOOLBAR MÓVIL EN 3 FILAS DE ANCHO COMPLETO (sm:hidden) */}
      {/* ========================================================= */}
      <div className="flex sm:hidden flex-col gap-2 bg-white dark:bg-neutral-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
        
        {/* Fila 1 (Búsqueda a Ancho Completo) */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Fila 2 (Periodo: Cuadrícula de 3 Columnas Iguales) */}
        <div className="grid grid-cols-3 gap-1 w-full bg-slate-100 dark:bg-neutral-950/80 p-1 rounded-lg border border-slate-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`py-1.5 px-1 rounded text-xs font-bold text-center transition-all truncate cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'es' ? 'Todas' : 'All'}
          </button>
          
          <button
            type="button"
            onClick={() => onFilterChange('q1')}
            className={`py-1.5 px-1 rounded text-xs font-bold text-center transition-all truncate flex items-center justify-center gap-1 cursor-pointer ${
              filter === 'q1'
                ? 'bg-teal-600 text-white dark:bg-teal-500/30 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🌓</span>
            <span className="text-[12px]">{language === 'es' ? '1a Quincena' : '1st Bw'}</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('q2')}
            className={`py-1.5 px-1 rounded text-xs font-bold text-center transition-all truncate flex items-center justify-center gap-1 cursor-pointer ${
              filter === 'q2'
                ? 'bg-sky-600 text-white dark:bg-sky-500/30 dark:text-sky-200 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🌔</span>
            <span>{language === 'es' ? '2a Quincena' : '2nd Bw'}</span>
          </button>
        </div>

        {/* Fila 3 (Estado y Fijación: Cuadrícula de 3 Columnas Iguales) */}
        <div className="grid grid-cols-3 gap-1 w-full bg-slate-100 dark:bg-neutral-950/80 p-1 rounded-lg border border-slate-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => onFilterChange(filter === 'done' ? 'all' : 'done')}
            className={`py-1.5 px-1 rounded text-xs font-bold text-center transition-all truncate cursor-pointer ${
              filter === 'done'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'es' ? 'Solo Hechas' : 'Done only'}
          </button>

          <button
            type="button"
            onClick={() => onFilterChange(filter === 'pending' ? 'all' : 'pending')}
            className={`py-1.5 px-1 rounded text-xs font-bold text-center transition-all truncate cursor-pointer ${
              filter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'es' ? 'Solo Pendientes' : 'Pending only'}
          </button>

          <button
            type="button"
            onClick={onTogglePinAccumulated}
            className={`py-1.5 px-1 rounded text-xs font-bold text-center transition-all truncate flex items-center justify-center gap-1 cursor-pointer ${
              pinAccumulated
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400/40'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Pin className="w-3 h-3 fill-current" />
            <span>{language === 'es' ? 'Fijar Acum.' : 'Pin Acc.'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TOOLBAR DE ESCRITORIO (>= sm): 100% INTACTA */}
      {/* ========================================================= */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
        
        {/* Barra de búsqueda */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-950/80 p-1 rounded-lg border border-slate-200 dark:border-neutral-800 flex-wrap">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-800 text-white dark:bg-neutral-800 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.allRows}
          </button>
          
          <button
            onClick={() => onFilterChange('q1')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'q1'
                ? 'bg-teal-600 text-white dark:bg-teal-500/20 dark:text-teal-300 shadow-xs dark:border dark:border-teal-500/30'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🌓</span>
            <span>{language === 'es' ? '1a Quincena' : t.filterQ1}</span>
          </button>

          <button
            onClick={() => onFilterChange('q2')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              filter === 'q2'
                ? 'bg-sky-600 text-white dark:bg-sky-500/20 dark:text-sky-300 shadow-xs dark:border dark:border-sky-500/30'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🌔</span>
            <span>{language === 'es' ? '2a Quincena' : t.filterQ2}</span>
          </button>

          <button
            onClick={() => onFilterChange('done')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              filter === 'done'
                ? 'bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300 shadow-xs dark:border dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.onlyDone}
          </button>

          <button
            onClick={() => onFilterChange('pending')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              filter === 'pending'
                ? 'bg-amber-600 text-white dark:bg-amber-500/20 dark:text-amber-300 shadow-xs dark:border dark:border-amber-500/30'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.onlyPending}
          </button>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePinAccumulated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              pinAccumulated
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400'
                : 'bg-white dark:bg-neutral-950/80 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Mantiene la fila de Acumulado siempre en la primera posición"
          >
            <Pin className={`w-3.5 h-3.5 ${pinAccumulated ? 'fill-current text-emerald-600 dark:text-emerald-400' : ''}`} />
            <span>
              {pinAccumulated ? t.unpinAccumulated : t.pinAccumulated}
            </span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.addTransaction}</span>
          </button>
        </div>
      </div>

      {/* Conteo de movimientos */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 px-1 font-medium">
        <span className="font-semibold text-slate-800 dark:text-neutral-200">
          {monthName} {year}
        </span>
        <span className="font-semibold text-slate-700 dark:text-neutral-300 tabular-nums">
          {displayRows.length} / {transactions.length} {t.itemsCount}
        </span>
      </div>

      {/* ========================================================= */}
      {/* 3. VISTA MÓVIL EN TARJETAS DE ALTA DENSIDAD (< sm: sm:hidden) */}
      {/* ========================================================= */}
      <div className="flex sm:hidden flex-col gap-2.5">
        {displayRows.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-400 text-xs">
            {language === 'es' 
              ? 'No hay movimientos con los filtros seleccionados. ¡Toca el botón + para agregar uno!' 
              : 'No transactions found matching filters. Tap + button to add one!'}
          </div>
        ) : (
          displayRows.map((tx, idx) => {
            const style = LABEL_ROW_STYLES[tx.label] || LABEL_ROW_STYLES['Otro'];
            const isPrimaryAccumulated = accumulatedRow && tx.id === accumulatedRow.id;
            const isAccumulated = isPrimaryAccumulated || tx.isAutoAccumulated;

            const targetDay = tx.recurringOriginalDay || tx.day;
            const validDay = isAccumulated ? 1 : clampDayToMonth(targetDay, year, selectedMonth);
            const safeDateString = getDateString(validDay, selectedMonth, language, year);

            return (
              <div 
                key={tx.id}
                className={`rounded-xl p-3 border shadow-xs flex flex-col gap-2 transition-all ${style.cardClass}`}
              >
                {/* FILA 1: #Número, Badge Categoría, Fecha, Quincena, Monto y Botón Hecho */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 tabular-nums">
                      #{idx + 1}
                    </span>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                      {tx.label}
                    </span>

                    <span className="text-[11px] font-medium text-slate-700 dark:text-neutral-300 tabular-nums">
                      {safeDateString}
                    </span>

                    {!isAccumulated ? (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold border ${
                        validDay <= 15 
                          ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30' 
                          : 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/30'
                      }`}>
                        {validDay <= 15 ? '1aQ' : '2aQ'}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-[9px] border border-teal-300 dark:border-teal-500/30 font-bold">
                        AUTO
                      </span>
                    )}
                  </div>

                  {/* Monto y Botón Hecho */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[13px] font-black tabular-nums ${
                      tx.amount > 0 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : tx.amount < 0 
                          ? 'text-slate-900 dark:text-neutral-100' 
                          : 'text-slate-500 dark:text-neutral-400'
                    }`}>
                      {formatCurrency(tx.amount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onToggleDone(tx.id)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        tx.isDone
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-transparent'
                      }`}
                      title={tx.isDone ? 'Marcado como hecho' : 'Marcar como hecho'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>

                {/* FILA 2: Concepto a la izquierda y Acciones Rápidas a la derecha */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-neutral-800/60">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {tx.concept}
                    </span>
                    {tx.isRecurring && !isAccumulated && (
                      <span className="px-1 py-0.2 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[9px] font-bold shrink-0">
                        {tx.recurrenceFrequency === 'annual' ? '↻ Anual' : '↻'}
                      </span>
                    )}
                  </div>

                  {/* Botones de acción rápida agrupados */}
                  <div className="flex items-center gap-1 shrink-0 text-slate-500 dark:text-neutral-400">
                    {tx.loanDetails && (
                      <button
                        type="button"
                        onClick={() => onOpenAmortizationModal(tx)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-amber-600 dark:text-amber-400"
                        title="Simulador de amortización"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-emerald-600 dark:text-emerald-400"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {!isPrimaryAccumulated && (
                      <button
                        type="button"
                        onClick={() => onDuplicateTransaction(tx)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-sky-600 dark:text-sky-400"
                        title="Duplicar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!isPrimaryAccumulated && (
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-rose-600 dark:text-rose-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* FILA 3 (si aplica préstamo/deuda): Micro-barra de datos con Deuda y Liquidación */}
                {tx.loanDetails && (
                  <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 text-[10px] flex items-center justify-between gap-1 flex-wrap font-medium">
                    <span className="text-slate-600 dark:text-neutral-400">
                      Deuda: <strong className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(tx.loanDetails.initialDebt)}</strong> → <strong className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(tx.loanDetails.finalDebt)}</strong>
                    </span>
                    {(() => {
                      const auto = computePayoffAndSavings({
                        originalPrincipal: tx.loanDetails.originalPrincipal || 0,
                        totalToPay: tx.loanDetails.totalToPay || (Math.abs(tx.amount) * tx.loanDetails.totalTermMonths),
                        totalTerm: tx.loanDetails.totalTermMonths,
                        currentTerm: tx.loanDetails.currentTermMonth,
                        initialDebt: tx.loanDetails.initialDebt
                      });
                      const liqVal = auto.payoffAmount > 0 ? auto.payoffAmount : tx.loanDetails.payoffDiscount;
                      if (!liqVal) return null;
                      return (
                        <span className="text-amber-700 dark:text-amber-300 font-semibold">
                          Liq: <strong className="tabular-nums">{formatCurrency(liqVal)}</strong>
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* TARJETA DE SUBTOTALES MÓVIL AL FINAL */}
        <div className="rounded-xl p-3.5 bg-slate-900 text-white dark:bg-neutral-900 border border-slate-800 dark:border-neutral-700 shadow-md flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between border-b border-slate-800 dark:border-neutral-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {filter === 'q1' 
                ? (language === 'es' ? 'Subtotal 1a Quincena' : 'Subtotal 1st Biweek') 
                : filter === 'q2' 
                  ? (language === 'es' ? 'Subtotal 2a Quincena' : 'Subtotal 2nd Biweek') 
                  : (language === 'es' ? 'Resumen del Periodo' : 'Period Summary')}
            </span>
            <span className="text-[11px] font-bold text-slate-300 tabular-nums">
              {filter === 'q1' ? biweekly.q1.doneCount : filter === 'q2' ? biweekly.q2.doneCount : totals.doneCount} / {displayRows.length} hechos
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/80 dark:bg-neutral-950/80 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Saldo Proyectado</span>
              <strong className="text-sm font-black text-emerald-400 tabular-nums">
                {formatCurrency(
                  filter === 'q1'
                    ? biweekly.q1.projectedClose
                    : filter === 'q2'
                      ? biweekly.q2.projectedClose
                      : totals.endOfMonthTotal
                )}
              </strong>
            </div>

            <div className="bg-slate-800/80 dark:bg-neutral-950/80 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Total Real (Actual)</span>
              <strong className="text-sm font-black text-white tabular-nums">
                {formatCurrency(
                  filter === 'q1'
                    ? biweekly.q1.totalActual
                    : filter === 'q2'
                      ? biweekly.q2.totalActual
                      : totals.totalActual
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. TABLA DE ESCRITORIO (>= sm: hidden sm:block) 100% INTACTA */}
      {/* ========================================================= */}
      <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/90 shadow-sm scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-300 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900/90 text-slate-700 dark:text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-10 text-center">{t.colNumber}</th>
              <th className="py-2.5 px-3 w-28">{t.colLabel}</th>
              <th className="py-2.5 px-3 w-28">{t.colDate}</th>
              <th className="py-2.5 px-3 min-w-[200px]">{t.colConcept}</th>
              <th className="py-2.5 px-3 w-32 text-right">{t.colAmount}</th>
              <th className="py-2.5 px-3 w-32 text-right">{t.colInitialDebt}</th>
              <th className="py-2.5 px-3 w-32 text-right">{t.colFinalDebt}</th>
              <th className="py-2.5 px-3 w-32 text-right">{t.colPayoff}</th>
              <th className="py-2.5 px-3 w-32 text-right">{t.colInterestSaved}</th>
              <th className="py-2.5 px-3 w-32 text-right">{t.colActualAmount}</th>
              <th className="py-2.5 px-3 w-16 text-center">{t.colDone}</th>
              <th className="py-2.5 px-3 w-24 text-center">{t.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-neutral-800/60">
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-500 dark:text-neutral-500 text-sm">
                  {language === 'es' 
                    ? 'No hay movimientos en este periodo con los filtros seleccionados. ¡Haz clic en "+ Agregar Transacción"!'
                    : 'No entries for this period matching filters. Click "+ Add Transaction"!'}
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
                    <td className="py-2.5 px-3 text-center text-slate-400 dark:text-neutral-500 font-medium tabular-nums text-xs">
                      {idx + 1}
                    </td>

                    {/* 2. Etiqueta / Tipo (Color Automático) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                        {tx.label}
                      </span>
                    </td>

                    {/* 3. Fecha con Badge Quincenal (1ªQ o 2ªQ) */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-neutral-300 whitespace-nowrap font-medium text-xs tabular-nums">
                      {(() => {
                        const targetDay = tx.recurringOriginalDay || tx.day;
                        const validDay = isAccumulated ? 1 : clampDayToMonth(targetDay, year, selectedMonth);
                        const safeDateString = getDateString(validDay, selectedMonth, language, year);
                        return (
                          <div className="flex items-center gap-1.5">
                            <span>{safeDateString}</span>
                            {!isAccumulated && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                validDay <= 15 
                                  ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30' 
                                  : 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/30'
                              }`}>
                                {validDay <= 15 ? '1aQ' : '2aQ'}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* 4. Concepto */}
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{tx.concept}</span>
                        {isAccumulated && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-[10px] border border-teal-300 dark:border-teal-500/30 font-bold uppercase tracking-wider">
                            {t.autoBadge}
                          </span>
                        )}
                        {tx.isRecurring && !isAccumulated && (
                          <span 
                            className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[10px] font-bold" 
                            title={tx.recurrenceFrequency === 'annual' ? (language === 'es' ? 'Recurrente anual' : 'Annual recurring') : (language === 'es' ? 'Recurrente mensual' : 'Monthly recurring')}
                          >
                            {tx.recurrenceFrequency === 'annual' ? (language === 'es' ? '↻ Anual' : '↻ Annual') : '↻'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Monto */}
                    <td className={`py-2.5 px-3 text-right font-semibold whitespace-nowrap tabular-nums text-sm ${
                      tx.amount > 0 
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold' 
                        : tx.amount < 0 
                          ? 'text-slate-900 dark:text-neutral-100' 
                          : 'text-slate-500 dark:text-neutral-400'
                    }`}>
                      {formatCurrency(tx.amount)}
                    </td>

                    {/* 6. Deuda (Inicial) */}
                    <td className={`py-2.5 px-3 text-right font-semibold whitespace-nowrap tabular-nums text-xs ${
                      (tx.loanDetails?.loanType === 'receivable' || tx.amount > 0)
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {tx.loanDetails?.initialDebt ? formatCurrency(tx.loanDetails.initialDebt) : '-'}
                    </td>

                    {/* 7. Final (Restante) */}
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-neutral-300 font-semibold whitespace-nowrap tabular-nums text-xs">
                      {tx.loanDetails?.finalDebt ? formatCurrency(tx.loanDetails.finalDebt) : '-'}
                    </td>

                    {/* 8. Liquidación */}
                    <td className="py-2.5 px-3 text-right text-amber-800 dark:text-amber-300 font-semibold whitespace-nowrap tabular-nums text-xs">
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
                    <td className="py-2.5 px-3 text-right text-emerald-800 dark:text-emerald-400 font-semibold whitespace-nowrap tabular-nums text-xs">
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
                    <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap tabular-nums text-sm text-emerald-700 dark:text-emerald-400">
                      {tx.isDone 
                        ? formatCurrency(tx.actualAmount !== null ? tx.actualAmount : tx.amount)
                        : <span className="text-slate-400 dark:text-neutral-500 font-normal">-</span>
                      }
                    </td>

                    {/* 11. Hecho (Checkbox) */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onToggleDone(tx.id)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                          tx.isDone
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-transparent hover:border-slate-500 dark:hover:border-neutral-500'
                        }`}
                        title={tx.isDone ? 'Marcado como hecho' : 'Marcar como hecho'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>

                    {/* 12. Acciones */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-neutral-400">
                        {tx.loanDetails && (
                          <button
                            onClick={() => onOpenAmortizationModal(tx)}
                            className="p-1 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Abrir simulador de amortización y ahorro"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isPrimaryAccumulated && (
                          <button
                            onClick={() => onDuplicateTransaction(tx)}
                            className="p-1 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isPrimaryAccumulated && (
                          <button
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

          {/* Fila Inferior de Totales y Subtotales */}
          <tfoot>
            <tr className="border-t-2 border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 font-bold text-slate-900 dark:text-white text-xs">
              <td className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-extrabold" colSpan={4}>
                {filter === 'q1' 
                  ? (language === 'es' ? 'SUBTOTAL 1a QUINCENA' : 'SUBTOTAL 1ST BIWEEK')
                  : filter === 'q2'
                    ? (language === 'es' ? 'SUBTOTAL 2a QUINCENA' : 'SUBTOTAL 2ND BIWEEK')
                    : t.totals}
              </td>
              <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 tabular-nums text-sm font-bold">
                <div>
                  {formatCurrency(
                    filter === 'q1'
                      ? biweekly.q1.projectedClose
                      : filter === 'q2'
                        ? biweekly.q2.projectedClose
                        : totals.endOfMonthTotal
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-normal">
                  {filter === 'q1'
                    ? (language === 'es' ? 'saldo proyectado al 15' : 'balance by day 15')
                    : filter === 'q2'
                      ? (language === 'es' ? 'saldo a fin de mes' : 'month end balance')
                      : t.totalEndOfMonthFoot}
                </div>
              </td>
              <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400 tabular-nums font-semibold text-xs">
                {formatCurrency(
                  (filter === 'all' && !searchQuery.trim())
                    ? (totals.totalInitialDebt + totals.totalInitialReceivable)
                    : displayRows.reduce((sum, tx) => sum + (tx.loanDetails?.initialDebt || 0), 0)
                )}
              </td>
              <td className="py-3 px-3 text-right text-slate-700 dark:text-neutral-300 tabular-nums font-semibold text-xs">
                {formatCurrency(
                  (filter === 'all' && !searchQuery.trim())
                    ? (totals.totalFinalDebt + totals.totalFinalReceivable)
                    : displayRows.reduce((sum, tx) => sum + (tx.loanDetails?.finalDebt || 0), 0)
                )}
              </td>
              <td className="py-3 px-3 text-right text-slate-400 dark:text-neutral-500 tabular-nums text-xs">
                -
              </td>
              <td className="py-3 px-3 text-right text-slate-400 dark:text-neutral-500 tabular-nums text-xs">
                -
              </td>
              <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-300 tabular-nums text-sm font-bold">
                <div>
                  {formatCurrency(
                    filter === 'q1'
                      ? biweekly.q1.totalActual
                      : filter === 'q2'
                        ? biweekly.q2.totalActual
                        : totals.totalActual
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-normal">{t.totalActualFoot}</div>
              </td>
              <td className="py-3 px-3 text-center text-slate-800 dark:text-neutral-300 text-xs font-semibold tabular-nums">
                {filter === 'q1' ? biweekly.q1.doneCount : filter === 'q2' ? biweekly.q2.doneCount : totals.doneCount}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ========================================================= */}
      {/* 5. BOTÓN DE ACCIÓN FLOTANTE (FAB +) PARA MÓVIL (sm:hidden) */}
      {/* ========================================================= */}
      <button
        type="button"
        onClick={onOpenAddModal}
        aria-label="Agregar nueva transacción"
        className="sm:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-2xl flex items-center justify-center transition-all cursor-pointer ring-4 ring-emerald-500/20"
      >
        <Plus className="w-8 h-8 stroke-[3]" />
      </button>

    </div>
  );
};
