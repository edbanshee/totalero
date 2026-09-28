import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { Language, ThemeMode, UserSession } from '../types/finance';
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

  const quickYears = [2024, 2025, 2026, 2027, 2028];

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
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand & Year Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <WalletCards className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                {t.appName}
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Cash Flow
                </span>
              </span>
            </div>

            {/* Year Controls */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
              <button
                onClick={() => onYearChange(year - 1)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-md transition-colors"
                title={`${year - 1}`}
                aria-label="Previous year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2.5 py-1 text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{year}</span>
              </div>

              <button
                onClick={() => onYearChange(year + 1)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-md transition-colors"
                title={`${year + 1}`}
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
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-mono font-medium ${
                    yr === year
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Month Title & Customization */}
            <div className="hidden sm:flex items-center gap-2 border-l border-neutral-800 pl-3">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    className="bg-neutral-900 border border-emerald-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 w-48 font-medium"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 rounded bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
                    title={t.saveTitle}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {currentTitle}
                  </h2>
                  <button
                    onClick={handleStartEditTitle}
                    className="text-neutral-500 hover:text-emerald-400 transition-colors p-1"
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
            <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400 border border-neutral-800/80 bg-neutral-900/50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
              <span>{t.hasActivity}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-400">{t.monthsAvailable}</span>
            </div>

            {/* Language Switcher */}
            <button
              onClick={onLanguageToggle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
              title="Cambiar idioma / Switch language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="uppercase">{language}</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={onThemeToggle}
              className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-sky-400" />
              )}
            </button>

            {/* Backup / Export */}
            <button
              onClick={onOpenBackup}
              className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title={t.backupModalTitle}
              aria-label="Data backup"
            >
              <Database className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Danger Zone / Reset */}
            <button
              onClick={onOpenDangerZone}
              className="p-1.5 rounded-lg border border-neutral-800 hover:border-rose-900/50 bg-neutral-900 hover:bg-rose-950/20 text-neutral-400 hover:text-rose-400 transition-colors"
              title={language === 'es' ? 'Zona de Peligro y Borrado' : 'Danger Zone & Reset'}
              aria-label="Danger Zone"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* User Session & Logout */}
            <div className="flex items-center gap-2 border-l border-neutral-800 pl-3">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-semibold text-neutral-200">
                  {userSession.displayName || (userSession.userMode === 'cloud' ? userSession.email : 'Modo Local')}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {userSession.userMode === 'cloud' ? 'Sincronizado' : 'LocalStorage OK'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg border border-neutral-800 hover:border-red-900/40 bg-neutral-900 hover:bg-red-950/30 text-neutral-400 hover:text-red-400 transition-colors"
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
