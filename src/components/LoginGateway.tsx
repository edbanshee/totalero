import React, { useState } from 'react';
import { 
  WalletCards, 
  HardDrive, 
  Cloud, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Globe, 
  Sun, 
  Moon,
  AlertCircle
} from 'lucide-react';
import { Language, ThemeMode, UserSession } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { signInWithGoogle } from '../utils/firebase';

interface LoginGatewayProps {
  onLoginLocal: (startFromScratch: boolean) => void;
  onLoginCloudSuccess: (session: UserSession, startFromScratch: boolean) => void;
  language: Language;
  onLanguageToggle: () => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  onLoginLocal,
  onLoginCloudSuccess,
  language,
  onLanguageToggle,
  theme,
  onThemeToggle
}) => {
  const t = TRANSLATIONS[language];
  const isEs = language === 'es';

  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('cloud');
  const [startFromScratch, setStartFromScratch] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginLocal(startFromScratch);
  };

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setCloudError(null);
    try {
      const user = await signInWithGoogle();
      if (!user) {
        // User closed or cancelled the sign-in popup - do not treat as an error
        return;
      }
      onLoginCloudSuccess({
        isLoggedIn: true,
        userMode: 'cloud',
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario'
      }, startFromScratch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'POPUP_BLOCKED') {
        setCloudError(
          isEs
            ? 'Las ventanas emergentes están bloqueadas en tu navegador. Por favor permite popups para iniciar sesión con Google.'
            : 'Popups are blocked by your browser. Please allow popups to sign in with Google.'
        );
      } else if (msg.includes('api-key-not-valid')) {
        setCloudError(
          isEs
            ? 'Firebase Authentication aún no está activado en tu proyecto "oceiros-totalero". Ve a Firebase Console > Authentication > clic en "Comenzar" > pestaña Sign-in method > activa el proveedor Google.'
            : 'Firebase Authentication is not yet activated on your "oceiros-totalero" project. Go to Firebase Console > Authentication > click "Get Started" > Sign-in method > enable Google.'
        );
      } else if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setCloudError(
          isEs 
            ? 'No se pudo iniciar sesión con Google. Puedes intentarlo de nuevo o usar el Modo Local.' 
            : 'Could not sign in with Google. You can retry or use Local Mode.'
        );
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-neutral-950 transition-colors">
      
      {/* Top Bar Navigation */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-neutral-900 bg-white/80 dark:bg-neutral-950/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <WalletCards className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            {t.appName}
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Pro
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLanguageToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="uppercase">{language}</span>
          </button>

          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 transition-colors"
            title="Cambiar tema"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl relative overflow-hidden">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Title & Subtitle */}
          <div className="text-center mb-6 relative">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.loginTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              {t.loginSubtitle}
            </p>
          </div>

          {/* Tabs: Local vs Cloud */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-200 dark:border-neutral-800 mb-6">
            <button
              onClick={() => setActiveTab('cloud')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'cloud'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>{isEs ? 'Cuenta en la Nube (Google)' : 'Cloud Account (Google)'}</span>
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'local'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isEs ? 'Modo Local (Offline)' : 'Local Mode (Offline)'}</span>
            </button>
          </div>

          {/* Form Content */}
          {activeTab === 'cloud' ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-neutral-950/60 border border-sky-100 dark:border-neutral-800/80 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-bold">
                  <Cloud className="w-4 h-4" />
                  <span>{isEs ? 'Sincronización Segura con Firebase & Firestore' : 'Secure Firebase & Firestore Sync'}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  {isEs 
                    ? 'Inicia sesión con tu cuenta de Google para respaldar tus movimientos, tarjetas de crédito y préstamos en la nube y acceder desde cualquier dispositivo.'
                    : 'Sign in with your Google account to back up cash flow, credit cards, and installment debts in the cloud across all your devices.'}
                </p>
              </div>

              {cloudError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cloudError}</span>
                </div>
              )}

              {/* Botón Google Sign In con Logo Oficial */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoadingGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {/* SVG Google Logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoadingGoogle ? (isEs ? 'Conectando con Google...' : 'Connecting to Google...') : (isEs ? 'Continuar con Google' : 'Continue with Google')}</span>
              </button>

              {/* Opción explícita de Empezar de Cero (con permanencia por defecto) */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/40 border border-slate-200 dark:border-neutral-800/60 mt-1">
                <input
                  type="checkbox"
                  id="scratchToggleCloud"
                  checked={startFromScratch}
                  onChange={e => setStartFromScratch(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                />
                <label htmlFor="scratchToggleCloud" className="text-xs text-slate-700 dark:text-neutral-300 cursor-pointer select-none">
                  <span className="font-semibold block">
                    {isEs ? 'Empezar con cuenta completamente limpia' : 'Start with completely clean account'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-500 block">
                    {isEs 
                      ? 'Sin marcar: se mantendrán tus datos guardados o la plantilla completa con deudas y tarjetas. Marcar solo si deseas una hoja 100% en blanco.'
                      : 'Unchecked: keeps your saved data or the sample template. Check only if you want an entirely blank sheet.'}
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLocalSubmit} className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-neutral-950/60 border border-emerald-100 dark:border-neutral-800/80 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.localModeTitle}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  {t.localModeDesc}
                </p>
              </div>

              {/* Opción explícita de Empezar de Cero */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/40 border border-slate-200 dark:border-neutral-800/60">
                <input
                  type="checkbox"
                  id="scratchToggleLocal"
                  checked={startFromScratch}
                  onChange={e => setStartFromScratch(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                />
                <label htmlFor="scratchToggleLocal" className="text-xs text-slate-700 dark:text-neutral-300 cursor-pointer select-none">
                  <span className="font-semibold block">
                    {isEs ? 'Empezar con hoja completamente limpia' : 'Start with completely blank sheet'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-500 block">
                    {isEs 
                      ? 'Sin marcar: cargará la plantilla contable de ejemplo (Nómina, Servicios, Tarjetas y Préstamos). Marcar para iniciar en blanco.'
                      : 'Unchecked: loads full sample template (Salary, Utilities, Cards, Loans). Check to start with a blank sheet.'}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                <span>{t.localModeBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Features Highlight */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-neutral-800 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 dark:text-neutral-400">
            <div>
              <span className="font-bold text-slate-700 dark:text-neutral-200 block">12 Meses</span>
              <span>Siempre visibles</span>
            </div>
            <div>
              <span className="font-bold text-slate-700 dark:text-neutral-200 block">{language === 'es' ? 'Flujo de Caja' : 'Cash Flow'}</span>
              <span>{language === 'es' ? 'Mensual y Anual' : 'Monthly & Annual'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700 dark:text-neutral-200 block">Simulador</span>
              <span>Ahorro en intereses</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-neutral-500 border-t border-slate-200 dark:border-neutral-900">
        <span>Totalero © 2026 · {t.tagline}</span>
      </footer>

    </div>
  );
};
