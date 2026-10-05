import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  // Quick years around active year
  const quickYears = useMemo(() => {
    const start = Math.max(MIN_CATALOG_YEAR, Math.min(year - 1, MAX_CATALOG_YEAR - 4));
    return [start, start + 1, start + 2, start + 3, start + 4].filter(y => y <= MAX_CATALOG_YEAR);
  }, [year]);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Catalog of years for year dropdown
  const allYears = useMemo(() => {
    const years: number[] = [];
    for (let y = MIN_CATALOG_YEAR; y <= MAX_CATALOG_YEAR; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <header className="w-full transition-colors relative" ref={mobileMenuRef}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 pt-2.5 pb-2">
        <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
          
          {/* Brand & Main Controls */}
          <div className="flex items-center gap-2 sm:gap-3.5 flex-wrap">
            {/* Logo + Brand Title */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <WalletCards className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="font-extrabold text-base sm:text-lg md:text-xl tracking-tight text-slate-900 dark:text-white">
                {t.appName}
              </span>
            </div>

            {/* Year Selector / Dropdown */}
            <div className="flex items-center bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onYearChange(Math.max(MIN_CATALOG_YEAR, year - 1))}
                disabled={year <= MIN_CATALOG_YEAR}
                className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:hover:bg-transparent rounded-md transition-colors cursor-pointer"
                title={year > MIN_CATALOG_YEAR ? `${year - 1}` : undefined}
                aria-label="Previous year"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <div className="relative flex items-center">
                <select
                  value={year}
                  onChange={(e) => onYearChange(Number(e.target.value))}
                  className="appearance-none bg-transparent pl-2 pr-5 py-0.5 sm:py-1 text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-none tabular-nums text-center"
                  aria-label="Select year"
                >
                  {allYears.map((y) => (
                    <option key={y} value={y} className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white">
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1" />
              </div>

              <button
                type="button"
                onClick={() => onYearChange(Math.min(MAX_CATALOG_YEAR, year + 1))}
                disabled={year >= MAX_CATALOG_YEAR}
                className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:hover:bg-transparent rounded-md transition-colors cursor-pointer"
                title={year < MAX_CATALOG_YEAR ? `${year + 1}` : undefined}
                aria-label="Next year"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Quick Year Jump (desktop only) */}
            <div className="hidden xl:flex items-center gap-1">
              {quickYears.map(yr => (
                <button
                  key={yr}
                  onClick={() => onYearChange(yr)}
                  className={`text-xs px-2 py-0.5 rounded-md transition-all font-semibold tabular-nums ${
                    yr === year
                      ? 'bg-emerald-600 text-white font-bold border border-emerald-600 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* View Switcher: Flujo Mensual vs Resumen Anual */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => onViewChange('monthly')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'monthly'
                    ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'es' ? 'Mensual' : 'Monthly'}</span>
              </button>
              <button
                type="button"
                onClick={() => onViewChange('annual')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'annual'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{language === 'es' ? 'Anual' : 'Annual'}</span>
              </button>
            </div>

            {/* Badge de actividad: alineado a la izquierda (SOLO visible en vista mensual y pantallas grandes) */}
            {activeView === 'monthly' && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800/80 bg-slate-100 dark:bg-neutral-900/50 px-2.5 py-1 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
                <span className="text-slate-700 dark:text-neutral-300 font-medium text-[11px]">{t.hasActivity}</span>
              </div>
            )}
          </div>

          {/* Bloque de Acciones: Desktop icons vs Mobile Hamburger Menu */}
          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0 justify-end">
            
            {/* Desktop Quick Actions (md:flex) */}
            <div className="hidden md:flex items-center gap-1.5">
              {/* Language Switcher */}
              <button
                onClick={onLanguageToggle}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
                title="Cambiar idioma / Switch language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="uppercase text-[11px]">{language}</span>
              </button>

              {/* Dark / Light Toggle */}
              <button
                onClick={onThemeToggle}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
                title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-sky-500" />
                )}
              </button>

              {/* Backup / Export */}
              <button
                onClick={onOpenBackup}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
                title={t.backupModalTitle}
                aria-label="Data backup"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>

              {/* Danger Zone / Reset */}
              <button
                onClick={onOpenDangerZone}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shadow-2xs cursor-pointer"
                title={language === 'es' ? 'Zona de Peligro y Borrado' : 'Danger Zone & Reset'}
                aria-label="Danger Zone"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>

              {/* User Session & Logout */}
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-2.5">
                <div className="hidden lg:flex flex-col text-right leading-tight">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-neutral-200 truncate max-w-[120px]">
                    {userSession.displayName || (userSession.userMode === 'cloud' ? userSession.email : 'Modo Local')}
                  </span>
                  <span className="text-[9px] flex items-center justify-end gap-1">
                    {!isOnline ? (
                      <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1 font-semibold">
                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                        {language === 'es' ? 'Offline' : 'Offline'}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        {userSession.userMode === 'cloud' ? 'Cloud' : 'Local'}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-red-950/30 text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-red-400 transition-colors shadow-2xs cursor-pointer"
                  title={t.logout}
                  aria-label="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile Hamburger Menu Button (visible on mobile < md) */}
            <div className="flex md:hidden items-center gap-1">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  mobileMenuOpen
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                }`}
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 shadow-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col gap-2.5">
            {/* User status */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-neutral-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {userSession.displayName || (userSession.userMode === 'cloud' ? userSession.email : 'Modo Local')}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {userSession.userMode === 'cloud' 
                    ? (language === 'es' ? 'Sincronizado en la Nube' : 'Cloud Synced') 
                    : (language === 'es' ? 'Guardado en Local' : 'Local Storage')}
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-900"
              >
                <LogOut className="w-3 h-3" />
                <span>{t.logout}</span>
              </button>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Language toggle */}
              <button
                type="button"
                onClick={onLanguageToggle}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'es' ? 'Idioma' : 'Language'}</span>
                </span>
                <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-neutral-800">
                  {language}
                </span>
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={onThemeToggle}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-1.5">
                  {theme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-sky-500" />
                  )}
                  <span>{theme === 'dark' ? (language === 'es' ? 'Claro' : 'Light') : (language === 'es' ? 'Oscuro' : 'Dark')}</span>
                </span>
              </button>

              {/* Backup & Export */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBackup();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.backupModalTitle}</span>
              </button>

              {/* Danger Zone */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDangerZone();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{language === 'es' ? 'Zona de Peligro' : 'Danger Zone'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
