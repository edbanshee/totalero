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
              className={`relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all duration-150 border select-none ${
                isSelected
                  ? 'bg-white text-neutral-950 font-bold border-white shadow-lg shadow-white/5 ring-2 ring-emerald-500/50'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800/80 hover:border-neutral-700'
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
                        ? 'bg-emerald-600'
                        : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
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
