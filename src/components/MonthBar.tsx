import React from 'react';
import { Language, MonthData } from '../types/finance';
import { MONTH_NAMES } from '../utils/translations';

interface MonthBarProps {
  year: number;
  selectedMonth: number;
  monthsData: Record<string, MonthData>;
  onSelectMonth: (monthIndex: number) => void;
  language: Language;
}

export const MonthBar: React.FC<MonthBarProps> = ({
  year,
  selectedMonth,
  monthsData,
  onSelectMonth,
  language
}) => {
  const monthNames = MONTH_NAMES[language];

  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 min-w-[760px]">
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
              className={`relative flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-150 border select-none cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400 dark:bg-white dark:text-neutral-950 dark:border-white dark:shadow-white/5 dark:ring-emerald-500/50'
                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 shadow-xs dark:bg-neutral-900/80 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-800/80 dark:hover:border-neutral-700'
              }`}
            >
              <span className="text-xs sm:text-sm tracking-tight truncate w-full text-center">
                {name}
              </span>
              
              {/* Activity indicator: Green dot (🟢) or empty space for height balance */}
              <div className="h-2 flex items-center justify-center mt-1">
                {hasUserActivity ? (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected
                        ? 'bg-white dark:bg-neutral-900 shadow-xs'
                        : 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    }`}
                    title="Mes con movimientos activos"
                  />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
