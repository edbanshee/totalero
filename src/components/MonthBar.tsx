import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Language, MonthData, MIN_CATALOG_YEAR, MAX_CATALOG_YEAR } from '../types/finance';
import { MONTH_NAMES } from '../utils/translations';

interface MonthBarProps {
  year: number;
  selectedMonth: number;
  monthsData: Record<string, MonthData>;
  onSelectMonth: (monthIndex: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  language: Language;
}

export const MonthBar: React.FC<MonthBarProps> = ({
  year,
  selectedMonth,
  monthsData,
  onSelectMonth,
  onPrevMonth,
  onNextMonth,
  language
}) => {
  const monthNames = MONTH_NAMES[language];

  const prevMonthIndex = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? year - 1 : year;
  const prevMonthTooltip = `${monthNames[prevMonthIndex]} (${prevYear})`;

  const nextMonthIndex = selectedMonth === 11 ? 0 : selectedMonth + 1;
  const nextYear = selectedMonth === 11 ? year + 1 : year;
  const nextMonthTooltip = `${monthNames[nextMonthIndex]} (${nextYear})`;

  const canGoPrev = year > MIN_CATALOG_YEAR || selectedMonth > 0;
  const canGoNext = year < MAX_CATALOG_YEAR || selectedMonth < 11;

  return (
    <div className="w-full flex items-center gap-1 sm:gap-1.5">
      {/* Botón flecha mes anterior */}
      <button
        type="button"
        onClick={onPrevMonth}
        disabled={!canGoPrev}
        title={canGoPrev ? `${language === 'es' ? 'Ir a' : 'Go to'} ${prevMonthTooltip}` : undefined}
        aria-label={canGoPrev ? `${language === 'es' ? 'Ir a' : 'Go to'} ${prevMonthTooltip}` : undefined}
        className="h-9 w-7 sm:w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800 bg-white hover:bg-slate-100 dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors shadow-xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Grid de 12 meses */}
      <div className="flex-1 overflow-x-auto pb-0.5 scrollbar-thin">
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 min-w-[680px]">
          {monthNames.map((name, index) => {
            const isSelected = selectedMonth === index;
            const monthKey = `${year}-${index}`;
            const data = monthsData[monthKey];
            
            // Indicador de actividad: si tiene movimientos marcados como hechos o transacciones con deuda
            const hasUserActivity = data?.transactions?.some(
              t => !t.isAutoAccumulated || (t.isAutoAccumulated && t.isDone)
            ) || data?.hasUserActivity;

            return (
              <button
                key={name}
                onClick={() => onSelectMonth(index)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 sm:px-1.5 rounded-lg transition-all duration-150 border select-none cursor-pointer h-9 ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-400 dark:bg-white dark:text-neutral-950 dark:border-white dark:shadow-white/5 dark:ring-emerald-500/50'
                    : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 shadow-xs dark:bg-neutral-900/80 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-800/80 dark:hover:border-neutral-700'
                }`}
              >
                <span className="text-[11px] sm:text-xs tracking-tight truncate w-full text-center leading-none">
                  {name}
                </span>
                
                {/* Activity indicator: Green dot (🟢) or empty space for height balance */}
                <div className="h-1.5 flex items-center justify-center mt-0.5">
                  {hasUserActivity ? (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isSelected
                          ? 'bg-white dark:bg-neutral-900'
                          : 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.5)]'
                      }`}
                      title="Mes con movimientos activos"
                    />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-transparent" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Botón flecha mes siguiente */}
      <button
        type="button"
        onClick={onNextMonth}
        disabled={!canGoNext}
        title={canGoNext ? `${language === 'es' ? 'Ir a' : 'Go to'} ${nextMonthTooltip}` : undefined}
        aria-label={canGoNext ? `${language === 'es' ? 'Ir a' : 'Go to'} ${nextMonthTooltip}` : undefined}
        className="h-9 w-7 sm:w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800 bg-white hover:bg-slate-100 dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors shadow-xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
