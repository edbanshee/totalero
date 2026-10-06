import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
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
  const [isMonthGridModalOpen, setIsMonthGridModalOpen] = useState(false);

  const prevMonthIndex = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? year - 1 : year;
  const prevMonthTooltip = `${monthNames[prevMonthIndex]} (${prevYear})`;

  const nextMonthIndex = selectedMonth === 11 ? 0 : selectedMonth + 1;
  const nextYear = selectedMonth === 11 ? year + 1 : year;
  const nextMonthTooltip = `${monthNames[nextMonthIndex]} (${nextYear})`;

  const canGoPrev = year > MIN_CATALOG_YEAR || selectedMonth > 0;
  const canGoNext = year < MAX_CATALOG_YEAR || selectedMonth < 11;

  // Comprobar si el mes activo actual tiene actividad
  const currentMonthKey = `${year}-${selectedMonth}`;
  const currentMonthData = monthsData[currentMonthKey];
  const currentHasActivity = currentMonthData?.transactions?.some(
    t => !t.isAutoAccumulated || (t.isAutoAccumulated && t.isDone)
  ) || currentMonthData?.hasUserActivity;

  return (
    <>
      {/* ========================================================= */}
      {/* VISTA MÓVIL (< sm): Barra Compacta (Prev, Botón Mes Activo, Next) */}
      {/* ========================================================= */}
      <div className="flex sm:hidden items-center justify-between gap-1.5 w-full">
        {/* Flecha Mes Anterior */}
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          title={canGoPrev ? `${language === 'es' ? 'Ir a' : 'Go to'} ${prevMonthTooltip}` : undefined}
          aria-label="Mes anterior"
          className="h-8.5 w-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800 bg-white hover:bg-slate-100 dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors shadow-xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Botón Mes Activo Central (Abre la cuadrícula modal de 12 meses) */}
        <button
          type="button"
          onClick={() => setIsMonthGridModalOpen(true)}
          className="flex-1 h-8.5 px-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 dark:bg-emerald-600 text-white font-bold text-xs shadow-xs border border-emerald-600 transition-all cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="truncate">{monthNames[selectedMonth]} ({year})</span>
          {currentHasActivity && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.8)]" title="Tiene actividad" />
          )}
        </button>

        {/* Flecha Mes Siguiente */}
        <button
          type="button"
          onClick={onNextMonth}
          disabled={!canGoNext}
          title={canGoNext ? `${language === 'es' ? 'Ir a' : 'Go to'} ${nextMonthTooltip}` : undefined}
          aria-label="Mes siguiente"
          className="h-8.5 w-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800 bg-white hover:bg-slate-100 dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors shadow-xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal / Popover de Cuadrícula de 12 Meses en Móvil (Portal) */}
      {isMonthGridModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 sm:hidden"
          onClick={() => setIsMonthGridModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl flex flex-col gap-3.5 my-auto max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'es' ? `Meses (${year})` : `Months (${year})`}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' ? 'Selecciona un mes activo' : 'Select an active month'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthGridModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((name, index) => {
                const isSelected = selectedMonth === index;
                const monthKey = `${year}-${index}`;
                const data = monthsData[monthKey];
                const hasUserActivity = data?.transactions?.some(
                  t => !t.isAutoAccumulated || (t.isAutoAccumulated && t.isDone)
                ) || data?.hasUserActivity;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onSelectMonth(index);
                      setIsMonthGridModalOpen(false);
                    }}
                    className={`relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all border select-none cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-black border-emerald-600 shadow-md ring-2 ring-emerald-400'
                        : 'bg-slate-50 dark:bg-neutral-800/90 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    <span className="text-xs font-bold truncate w-full text-center">
                      {name}
                    </span>
                    <div className="h-1.5 flex items-center justify-center mt-1">
                      {hasUserActivity ? (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected
                              ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]'
                              : 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.8)]'
                          }`}
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
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* VISTA ESCRITORIO (>= sm): 100% Intacta e Inalterada */}
      {/* ========================================================= */}
      <div className="hidden sm:flex w-full items-center gap-1 sm:gap-1.5">
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
    </>
  );
};
