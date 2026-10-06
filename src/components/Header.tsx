import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Globe, 
  Database, 
  LogOut, 
  WalletCards,
  Calendar,
  BarChart3,
  ShieldAlert,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { Language, ThemeMode, UserSession, ActiveView, MIN_CATALOG_YEAR, MAX_CATALOG_YEAR } from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES } from '../utils/translations';

interface HeaderProps {
  year: number;
  month: number;
  onYearChange: (newYear: number) => void;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  language: Language;
  onLanguageToggle: () => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  userSession: UserSession;
  onLogout: () => void;
  onOpenBackup: () => void;
  onOpenDangerZone: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  year,
  month,
  onYearChange,
  activeView,
  onViewChange,
  language,
  onLanguageToggle,
  theme,
  onThemeToggle,
  userSession,
  onLogout,
  onOpenBackup,
  onOpenDangerZone
}) => {
  const t = TRANSLATIONS[language];
  const displayMonthName = MONTH_NAMES[language][month];

  // Mobile menu and Year popover states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);

  // Lista de todos los años disponibles
  const allYears = useMemo(() => {
    const list: number[] = [];
    for (let y = MIN_CATALOG_YEAR; y <= MAX_CATALOG_YEAR; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // Años consecutivos inmediatos alrededor del año activo para desktop
  const quickYears = useMemo(() => {
    const start = Math.max(MIN_CATALOG_YEAR, Math.min(year - 1, MAX_CATALOG_YEAR - 4));
    return [start, start + 1, start + 2, start + 3, start + 4].filter(y => y <= MAX_CATALOG_YEAR);
  }, [year]);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="w-full transition-colors relative">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 pt-2.5 pb-2">
        
        {/* ========================================================= */}
        {/* VISTA MÓVIL (< md): Header Compacto en una Sola Fila */}
        {/* ========================================================= */}
        <div className="flex md:hidden items-center justify-between gap-2 h-10">
          
          {/* 1. Logo y Nombre de la App */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
              <WalletCards className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              {t.appName}
            </span>
          </div>

          {/* 2. Selector de Año Táctil (Abre modal/popover) */}
          <button
            type="button"
            onClick={() => setIsYearModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-900 dark:text-white transition-colors cursor-pointer tabular-nums"
            aria-label="Seleccionar año"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{year}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* 3. Botón de Menú Hamburguesa */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs cursor-pointer"
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desplegable de Menú Móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 pt-2 border-t border-slate-200 dark:border-neutral-800 flex flex-col gap-2.5 pb-2 animate-in fade-in slide-in-from-top-2 duration-150">
            
            {/* View Switcher Móvil */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  onViewChange('monthly');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'monthly'
                    ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'es' ? 'Flujo Mensual' : 'Monthly'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewChange('annual');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'annual'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Resumen Anual' : 'Annual'}</span>
              </button>
            </div>

            {/* Acciones Rápidas en Cuadrícula Móvil */}
            <div className="grid grid-cols-4 gap-1.5">
              {/* Idioma */}
              <button
                type="button"
                onClick={onLanguageToggle}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-700 dark:text-neutral-300"
              >
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] uppercase">{language}</span>
              </button>

              {/* Tema */}
              <button
                type="button"
                onClick={onThemeToggle}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-700 dark:text-neutral-300"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-500" />}
                <span className="text-[10px]">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </button>

              {/* Backup */}
              <button
                type="button"
                onClick={() => {
                  onOpenBackup();
                  setIsMobileMenuOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-700 dark:text-neutral-300"
              >
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px]">{language === 'es' ? 'Copia' : 'Backup'}</span>
              </button>

              {/* Danger Zone */}
              <button
                type="button"
                onClick={() => {
                  onOpenDangerZone();
                  setIsMobileMenuOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-rose-600 dark:text-rose-400"
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px]">{language === 'es' ? 'Borrar' : 'Reset'}</span>
              </button>
            </div>

            {/* Sesión y Logout */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-neutral-800 text-xs">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                  {userSession.displayName || (userSession.userMode === 'cloud' ? userSession.email : 'Modo Local')}
                </span>
                <span className="text-[10px] flex items-center gap-1">
                  {!isOnline ? (
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Offline
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {userSession.userMode === 'cloud' ? 'Nube' : 'Local'}
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-red-950 bg-rose-50 dark:bg-red-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.logout}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA ESCRITORIO (>= md): 100% Intacta e Inalterada */}
        {/* ========================================================= */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand & Year Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                <WalletCards className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                {t.appName}
              </span>
            </div>

            {/* Year Controls (2024 - 2050) */}
            <div className="flex items-center bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg p-0.5">
              <button
                onClick={() => onYearChange(Math.max(MIN_CATALOG_YEAR, year - 1))}
                disabled={year <= MIN_CATALOG_YEAR}
                className="p-1.5 hover:bg-white dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:hover:bg-transparent rounded-md transition-colors"
                title={year > MIN_CATALOG_YEAR ? `${year - 1}` : undefined}
                aria-label="Previous year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsYearModalOpen(true)}
                className="px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tabular-nums hover:bg-white dark:hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                title="Ver todos los años"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{year}</span>
              </button>

              <button
                onClick={() => onYearChange(Math.min(MAX_CATALOG_YEAR, year + 1))}
                disabled={year >= MAX_CATALOG_YEAR}
                className="p-1.5 hover:bg-white dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:hover:bg-transparent rounded-md transition-colors"
                title={year < MAX_CATALOG_YEAR ? `${year + 1}` : undefined}
                aria-label="Next year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Year Jump */}
            <div className="hidden lg:flex items-center gap-1">
              {quickYears.map(yr => (
                <button
                  key={yr}
                  onClick={() => onYearChange(yr)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-semibold tabular-nums ${
                    yr === year
                      ? 'bg-emerald-600 text-white font-bold border border-emerald-600 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900 border border-transparent'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Month / Annual View Title */}
            <div className="hidden sm:flex items-center border-l border-slate-200 dark:border-neutral-800 pl-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {activeView === 'annual' 
                  ? (language === 'es' ? `Panorama Anual (${year})` : `Annual Overview (${year})`)
                  : `${displayMonthName} (${year})`
                }
              </h2>
            </div>

            {/* View Switcher alineado a la izquierda: Flujo Mensual vs Resumen Anual */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => onViewChange('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'monthly'
                    ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'es' ? 'Flujo Mensual' : 'Monthly'}</span>
              </button>
              <button
                type="button"
                onClick={() => onViewChange('annual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'annual'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Resumen Anual' : 'Annual Overview'}</span>
              </button>
            </div>

            {/* Badge de actividad: alineado a la izquierda (SOLO visible en vista mensual) */}
            {activeView === 'monthly' && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800/80 bg-slate-100 dark:bg-neutral-900/50 px-3 py-1.5 rounded-full shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span className="text-slate-700 dark:text-neutral-300 font-medium">{t.hasActivity}</span>
              </div>
            )}
          </div>

          {/* Bloque de Acciones: Siempre anclado a la extrema derecha */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0 justify-end">
            {/* Language Switcher */}
            <button
              onClick={onLanguageToggle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs"
              title="Cambiar idioma / Switch language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="uppercase">{language}</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={onThemeToggle}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-sky-500" />
              )}
            </button>

            {/* Backup / Export */}
            <button
              onClick={onOpenBackup}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs"
              title={t.backupModalTitle}
              aria-label="Data backup"
            >
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Danger Zone / Reset */}
            <button
              onClick={onOpenDangerZone}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shadow-xs"
              title={language === 'es' ? 'Zona de Peligro y Borrado' : 'Danger Zone & Reset'}
              aria-label="Danger Zone"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* User Session & Logout */}
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-3">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                  {userSession.displayName || (userSession.userMode === 'cloud' ? userSession.email : 'Modo Local')}
                </span>
                <span className="text-[10px] flex items-center justify-end gap-1">
                  {!isOnline ? (
                    <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      {language === 'es' ? 'Offline (Guardado en Disco)' : 'Offline (Saved to Disk)'}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {userSession.userMode === 'cloud' 
                        ? (language === 'es' ? 'Sincronizado Nube' : 'Cloud Synced') 
                        : 'LocalStorage OK'}
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-red-950/30 text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-red-400 transition-colors shadow-xs"
                title={t.logout}
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* Popover / Modal Flotante de Selección de Años (Portal) */}
      {/* ========================================================= */}
      {isYearModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsYearModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3.5 my-auto max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'es' ? 'Seleccionar Año' : 'Select Year'}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' ? 'Catálogo 2024 - 2050' : 'Catalog 2024 - 2050'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsYearModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-300">
              {language === 'es' 
                ? 'Elige cualquier año para ver o registrar movimientos:' 
                : 'Choose any year to view or manage transactions:'}
            </p>

            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {allYears.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    onYearChange(yr);
                    setIsYearModalOpen(false);
                  }}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all text-center tabular-nums cursor-pointer ${
                    yr === year
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-black'
                      : 'bg-slate-100 dark:bg-neutral-800/90 text-slate-800 dark:text-neutral-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-neutral-700 hover:border-emerald-300 border border-transparent'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

    </header>
  );
};
