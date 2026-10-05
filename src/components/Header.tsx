import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Globe, 
  Database, 
  Edit3, 
  Check, 
  LogOut, 
  WalletCards,
  Calendar,
  ShieldAlert,
  WifiOff
} from 'lucide-react';
import { Language, ThemeMode, UserSession, MIN_CATALOG_YEAR, MAX_CATALOG_YEAR } from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES } from '../utils/translations';

interface HeaderProps {
  year: number;
  month: number;
  monthTitle?: string;
  onYearChange: (newYear: number) => void;
  onUpdateMonthTitle: (newTitle: string) => void;
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
  monthTitle,
  onYearChange,
  onUpdateMonthTitle,
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const displayMonthName = MONTH_NAMES[language][month];
  const currentTitle = monthTitle || `${displayMonthName} (${year})`;

  // Años consecutivos inmediatos alrededor del año activo
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

  const handleStartEditTitle = () => {
    setTempTitle(currentTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onUpdateMonthTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="w-full transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
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

              <div className="px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{year}</span>
              </div>

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

            {/* Month Title & Customization */}
            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-3">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    className="bg-white dark:bg-neutral-900 border border-emerald-500/50 rounded px-2 py-0.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 w-48 font-medium shadow-xs"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs"
                    title={t.saveTitle}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {currentTitle}
                  </h2>
                  <button
                    onClick={handleStartEditTitle}
                    className="text-slate-400 dark:text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1"
                    title={t.editMonthTitle}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Legend & Right Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800/80 bg-slate-100 dark:bg-neutral-900/50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
              <span className="text-slate-700 dark:text-neutral-300 font-medium">{t.hasActivity}</span>
            </div>

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
    </header>
  );
};
