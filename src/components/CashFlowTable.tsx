import React from 'react';
import { 
  Search, 
  Plus, 
  Pin, 
  Edit2, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Calculator, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  Transaction, 
  TransactionLabel, 
  RowHighlight, 
  Language, 
  FilterType 
} from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES } from '../utils/translations';
import { MonthTotals, formatCurrency, computePayoffAndSavings } from '../utils/calculations';

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
  onMoveTransaction: (id: string, direction: 'up' | 'down') => void;
  onToggleDone: (id: string) => void;
  onOpenAmortizationModal: (tx: Transaction) => void;
}

const LABEL_COLORS: Record<TransactionLabel, { bg: string; text: string; border: string }> = {
  Ingreso: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Gasto: { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/30' },
  Servicio: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  Neto: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30' },
  Coppel: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  Préstamo: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  Otro: { bg: 'bg-neutral-500/20', text: 'text-neutral-300', border: 'border-neutral-500/30' }
};

const HIGHLIGHT_CLASSES: Record<RowHighlight, string> = {
  none: 'hover:bg-neutral-800/40',
  yellow: 'bg-yellow-500/10 hover:bg-yellow-500/15 border-l-4 border-l-yellow-400',
  blue: 'bg-blue-500/10 hover:bg-blue-500/15 border-l-4 border-l-blue-400',
  green: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-l-4 border-l-emerald-400'
};

export const CashFlowTable: React.FC<CashFlowTableProps> = ({
  transactions,
  totals,
  totalLiquidity,
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
  onMoveTransaction,
  onToggleDone,
  onOpenAmortizationModal
}) => {
  const t = TRANSLATIONS[language];
  const monthName = MONTH_NAMES[language][selectedMonth];

  // Separar Acumulado si está fijado arriba
  const accumulatedRow = transactions.find(tx => tx.isAutoAccumulated);
  const regularRows = transactions.filter(tx => !tx.isAutoAccumulated);

  // Filtrado y búsqueda
  const filteredRows = regularRows.filter(tx => {
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

  const displayRows = pinAccumulated && accumulatedRow
    ? [accumulatedRow, ...filteredRows]
    : (!pinAccumulated && accumulatedRow
        ? (filter === 'pending' && accumulatedRow.isDone) || (filter === 'done' && !accumulatedRow.isDone)
          ? filteredRows
          : [accumulatedRow, ...filteredRows]
        : filteredRows);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Banner de Arrastre Automático */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500 text-neutral-950 font-bold text-[10px] tracking-wide uppercase">
            {language === 'es' ? 'Arrastre Automático' : 'Auto Carryover'}
          </span>
          <span className="font-medium">
            {t.accumulatedSyncBanner}
          </span>
        </div>
        <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {monthName} {year}
        </span>
      </div>

      {/* Toolbar: Búsqueda, Filtros y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
        
        {/* Barra de búsqueda */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.allRows}
          </button>
          <button
            onClick={() => onFilterChange('done')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              filter === 'done'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.onlyDone}
          </button>
          <button
            onClick={() => onFilterChange('pending')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.onlyPending}
          </button>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePinAccumulated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              pinAccumulated
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Mantiene la fila de Acumulado siempre en la primera posición"
          >
            <Pin className={`w-3.5 h-3.5 ${pinAccumulated ? 'fill-emerald-400' : ''}`} />
            <span className="hidden sm:inline">
              {pinAccumulated ? t.pinAccumulated : t.unpinAccumulated}
            </span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.addTransaction}</span>
          </button>
        </div>

      </div>

      {/* Subtítulo informativo */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
          {t.rowOrderNotice}
        </span>
        <span className="font-mono text-neutral-300">
          {displayRows.length} / {transactions.length} {t.itemsCount}
        </span>
      </div>

      {/* Tabla inteligente de Flujo de Caja */}
      <div className="w-full overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/60 shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/90 text-neutral-300 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-10 text-center">{t.colNumber}</th>
              <th className="py-2.5 px-3 w-24">{t.colLabel}</th>
              <th className="py-2.5 px-3 w-20">{t.colDate}</th>
              <th className="py-2.5 px-3 min-w-[200px]">{t.colConcept}</th>
              <th className="py-2.5 px-3 w-28 text-right">{t.colAmount}</th>
              <th className="py-2.5 px-3 w-28 text-right">{t.colInitialDebt}</th>
              <th className="py-2.5 px-3 w-28 text-right">{t.colFinalDebt}</th>
              <th className="py-2.5 px-3 w-24 text-right">{t.colPayoff}</th>
              <th className="py-2.5 px-3 w-24 text-right">{t.colInterestSaved}</th>
              <th className="py-2.5 px-3 w-28 text-right">{t.colActualAmount}</th>
              <th className="py-2.5 px-3 w-16 text-center">{t.colDone}</th>
              <th className="py-2.5 px-3 w-24 text-center">{t.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-neutral-500 text-sm">
                  {language === 'es' 
                    ? 'No hay movimientos en este mes con los filtros seleccionados. ¡Haz clic en "+ Agregar Transacción"!'
                    : 'No entries for this month matching filters. Click "+ Add Transaction"!'}
                </td>
              </tr>
            ) : (
              displayRows.map((tx, idx) => {
                const labelColor = LABEL_COLORS[tx.label] || LABEL_COLORS['Otro'];
                const highlightClass = HIGHLIGHT_CLASSES[tx.highlight || 'none'];
                const isAccumulated = tx.isAutoAccumulated;

                return (
                  <tr 
                    key={tx.id}
                    className={`transition-colors duration-100 ${highlightClass} ${
                      isAccumulated ? 'bg-teal-950/20 font-semibold' : ''
                    }`}
                  >
                    {/* 1. Row Number */}
                    <td className="py-2.5 px-3 text-center text-neutral-500 font-mono">
                      {idx + 1}
                    </td>

                    {/* 2. Etiqueta / Tipo */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${labelColor.bg} ${labelColor.text} ${labelColor.border}`}>
                        {tx.label}
                      </span>
                    </td>

                    {/* 3. Fecha */}
                    <td className="py-2.5 px-3 font-mono text-neutral-300 whitespace-nowrap">
                      {tx.dateString}
                    </td>

                    {/* 4. Concepto */}
                    <td className="py-2.5 px-3 text-white font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{tx.concept}</span>
                        {isAccumulated && (
                          <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono border border-teal-500/30">
                            {t.autoBadge}
                          </span>
                        )}
                        {tx.isRecurring && !isAccumulated && (
                          <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 text-[9px] font-mono" title="Recurrente mensual">
                            ↻
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Monto */}
                    <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                      tx.amount > 0 
                        ? 'text-emerald-400' 
                        : tx.amount < 0 
                          ? 'text-neutral-200' 
                          : 'text-neutral-400'
                    }`}>
                      {formatCurrency(tx.amount)}
                    </td>

                    {/* 6. Deuda (Inicial) */}
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400 whitespace-nowrap tabular-nums">
                      {tx.loanDetails?.initialDebt ? formatCurrency(tx.loanDetails.initialDebt) : '-'}
                    </td>

                    {/* 7. Final (Restante) */}
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-300 whitespace-nowrap tabular-nums">
                      {tx.loanDetails?.finalDebt ? formatCurrency(tx.loanDetails.finalDebt) : '-'}
                    </td>

                    {/* 8. Liquidación */}
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300 whitespace-nowrap tabular-nums">
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
                        if (tx.loanDetails.payoffDiscount !== undefined && tx.loanDetails.payoffDiscount > 0) {
                          return formatCurrency(tx.loanDetails.payoffDiscount);
                        }
                        return '-';
                      })()}
                    </td>

                    {/* 9. Ahorro Interés */}
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 whitespace-nowrap tabular-nums">
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
                        if (tx.loanDetails.interestSaved !== undefined && tx.loanDetails.interestSaved > 0) {
                          return formatCurrency(tx.loanDetails.interestSaved);
                        }
                        return '-';
                      })()}
                    </td>

                    {/* 10. Actual (Real) */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-white whitespace-nowrap tabular-nums">
                      {tx.isDone ? formatCurrency(tx.actualAmount !== null ? tx.actualAmount : tx.amount) : '-'}
                    </td>

                    {/* 11. Hecho [✓] */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onToggleDone(tx.id)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          tx.isDone
                            ? 'bg-emerald-500 text-neutral-950 font-bold shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                            : 'bg-neutral-900 border border-neutral-700 text-transparent hover:border-neutral-500'
                        }`}
                        title={tx.isDone ? 'Marcado como hecho' : 'Marcar como hecho'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>

                    {/* 12. Acciones */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 text-neutral-400">
                        {/* Botón Amortización / Calculadora si es deuda */}
                        {tx.loanDetails && (
                          <button
                            onClick={() => onOpenAmortizationModal(tx)}
                            className="p-1 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                            title="Abrir simulador de amortización y ahorro"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Editar */}
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1 hover:text-emerald-400 hover:bg-neutral-800 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Subir */}
                        {!isAccumulated && (
                          <button
                            onClick={() => onMoveTransaction(tx.id, 'up')}
                            className="p-1 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                            title="Subir"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Bajar */}
                        {!isAccumulated && (
                          <button
                            onClick={() => onMoveTransaction(tx.id, 'down')}
                            className="p-1 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                            title="Bajar"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Duplicar */}
                        {!isAccumulated && (
                          <button
                            onClick={() => onDuplicateTransaction(tx)}
                            className="p-1 hover:text-sky-400 hover:bg-neutral-800 rounded transition-colors"
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Eliminar */}
                        {!isAccumulated && (
                          <button
                            onClick={() => onDeleteTransaction(tx)}
                            className="p-1 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
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
            <tr className="border-t-2 border-neutral-700 bg-neutral-900 font-bold text-white text-xs">
              <td className="py-3 px-3 text-center text-emerald-400 uppercase tracking-wider font-extrabold" colSpan={4}>
                {t.totals}
              </td>
              {/* Total Fin de Mes en columna de Monto */}
              <td className="py-3 px-3 text-right font-mono text-emerald-400 tabular-nums text-sm">
                <div>{formatCurrency(totals.endOfMonthTotal)}</div>
                <div className="text-[10px] text-neutral-400 font-normal">{t.totalEndOfMonthFoot}</div>
              </td>
              {/* Total Deuda Inicial */}
              <td className="py-3 px-3 text-right font-mono text-rose-400 tabular-nums">
                {formatCurrency(totals.totalInitialDebt)}
              </td>
              {/* Total Deuda Final */}
              <td className="py-3 px-3 text-right font-mono text-neutral-300 tabular-nums">
                {formatCurrency(totals.totalFinalDebt)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-amber-300 tabular-nums">
                -
              </td>
              <td className="py-3 px-3 text-right font-mono text-emerald-400 tabular-nums">
                -
              </td>
              {/* Total Actual (Real ejecutado) */}
              <td className="py-3 px-3 text-right font-mono text-emerald-300 tabular-nums text-sm">
                <div>{formatCurrency(totals.totalActual)}</div>
                <div className="text-[10px] text-neutral-400 font-normal">{t.totalActualFoot}</div>
              </td>
              {/* Items Hechos */}
              <td className="py-3 px-3 text-center font-mono text-neutral-300 text-xs">
                {totals.doneCount}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
