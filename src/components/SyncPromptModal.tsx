import React from 'react';
import { Cloud, UploadCloud, Sparkles, X, Layers, CreditCard, Landmark } from 'lucide-react';
import { Language } from '../types/finance';

interface SyncPromptModalProps {
  isOpen: boolean;
  userEmail: string;
  stats: {
    transactions: number;
    loans: number;
    cards: number;
    creditLines: number;
  };
  onSyncLocalToCloud: () => void;
  onStartFreshCloud: () => void;
  onDismiss: () => void;
  language: Language;
}

export const SyncPromptModal: React.FC<SyncPromptModalProps> = ({
  isOpen,
  userEmail,
  stats,
  onSyncLocalToCloud,
  onStartFreshCloud,
  onDismiss,
  language
}) => {
  if (!isOpen) return null;

  const isEs = language === 'es';
  const totalElements = (stats.transactions || 0) + (stats.loans || 0) + (stats.cards || 0) + (stats.creditLines || 0);
  const hasLocalData = totalElements > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Gradient Hero Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-emerald-600 p-6 sm:p-7 text-center relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white mb-3 shadow-inner">
            <Cloud className="w-6 h-6 stroke-[2.5]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isEs ? '¡Bienvenido a Totalero!' : 'Welcome to Totalero!'}
          </h2>

          <p className="text-xs text-white/90 mt-2 max-w-sm leading-relaxed">
            {isEs ? (
              hasLocalData ? (
                <>
                  Has iniciado sesión con <span className="font-bold underline">{userEmail}</span>. La nube vinculada a tu cuenta de Google está vacía, pero detectamos datos en tu espacio local.
                </>
              ) : (
                <>
                  Has iniciado sesión con <span className="font-bold underline">{userEmail}</span>. Tu cuenta de Google en la nube está lista para comenzar.
                </>
              )
            ) : (
              hasLocalData ? (
                <>
                  Signed in with <span className="font-bold underline">{userEmail}</span>. Your Google Cloud storage is empty, but we detected existing data in your local space.
                </>
              ) : (
                <>
                  Signed in with <span className="font-bold underline">{userEmail}</span>. Your Google Cloud account is ready to get started.
                </>
              )
            )}
          </p>

          {/* Badges de datos detectados: SOLO si totalElements > 0 */}
          {hasLocalData && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-[11px] font-semibold text-white flex items-center gap-1.5 font-mono">
                <Layers className="w-3 h-3" />
                {stats.transactions} {isEs ? 'movimiento(s)' : 'transaction(s)'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-[11px] font-semibold text-white flex items-center gap-1.5 font-mono">
                <Landmark className="w-3 h-3" />
                {stats.loans} {isEs ? 'préstamo(s)' : 'loan(s)'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-[11px] font-semibold text-white flex items-center gap-1.5 font-mono">
                <CreditCard className="w-3 h-3" />
                {stats.cards} {isEs ? 'tarjeta(s)' : 'card(s)'}
              </span>
            </div>
          )}
        </div>

        {/* Options Body */}
        <div className="p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white text-center sm:text-left">
            {isEs 
              ? '¿Cómo deseas inicializar el almacenamiento en tu cuenta de Google?' 
              : 'How would you like to initialize storage in your Google account?'}
          </h3>

          {/* Option 1: Sincronizar e Importar Datos Locales (SOLO visible si hay datos reales > 0) */}
          {hasLocalData && (
            <button
              onClick={onSyncLocalToCloud}
              className="group p-4 rounded-2xl border-2 border-indigo-500/60 hover:border-indigo-400 bg-neutral-950/70 hover:bg-indigo-950/20 text-left transition-all flex items-start gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300">
                    {isEs ? 'Sincronizar e Importar Datos Locales' : 'Sync & Import Local Data'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-neutral-950 text-[10px] font-extrabold uppercase tracking-wide">
                    {isEs ? 'RECOMENDADO' : 'RECOMMENDED'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  {isEs ? (
                    `Copia tus ${stats.transactions} movimientos, ${stats.loans} préstamos y ${stats.cards} tarjetas actuales a la nube vinculada a tu cuenta de Google para tener acceso desde cualquier dispositivo.`
                  ) : (
                    `Copy your current ${stats.transactions} transactions, ${stats.loans} loans, and ${stats.cards} cards to your Google Cloud account for cross-device access.`
                  )}
                </p>
              </div>
            </button>
          )}

          {/* Option 2: Iniciar con Cuenta Limpia */}
          <button
            onClick={onStartFreshCloud}
            className={`group p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
              hasLocalData
                ? 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/50 hover:bg-neutral-800/40'
                : 'border-2 border-emerald-500/60 hover:border-emerald-400 bg-neutral-950/70 hover:bg-emerald-950/20 shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
              hasLocalData
                ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <Sparkles className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs sm:text-sm font-bold ${hasLocalData ? 'text-white group-hover:text-neutral-200' : 'text-white group-hover:text-emerald-300'}`}>
                  {isEs 
                    ? (hasLocalData ? 'Iniciar con Cuenta Limpia' : 'Comenzar a usar la app en la Nube') 
                    : (hasLocalData ? 'Start with Clean Account' : 'Start using app in Cloud')}
                </span>
                {!hasLocalData && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-extrabold uppercase tracking-wide">
                    {isEs ? 'CONTINUAR' : 'PROCEED'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                {isEs ? (
                  hasLocalData 
                    ? 'Comenzar desde cero en la nube vinculada a tu cuenta de Google. Tus datos locales de invitado se mantendrán intactos en este navegador para cuando uses la app sin sesión.'
                    : 'Inicializar tu espacio financiero privado y seguro en Google Firestore con sincronización en tiempo real.'
                ) : (
                  hasLocalData
                    ? 'Start from scratch in Google Cloud. Your local guest data will remain completely intact in this browser whenever you use the app without logging in.'
                    : 'Initialize your private and secure financial space in Google Firestore with real-time sync.'
                )}
              </p>
            </div>
          </button>

          {/* Footer dismiss link */}
          <div className="text-center pt-2">
            <button
              onClick={onDismiss}
              className="text-xs text-neutral-500 hover:text-neutral-300 underline transition-colors"
            >
              {isEs ? 'Decidir más tarde (mantener vista previa)' : 'Decide later (keep preview)'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
