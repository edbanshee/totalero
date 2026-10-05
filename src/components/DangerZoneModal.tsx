import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Cloud, 
  Trash2, 
  Download, 
  RotateCcw, 
  HardDrive,
  ShieldAlert
} from 'lucide-react';
import { Language, UserSession, MonthData, CreditLine } from '../types/finance';

interface DangerZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: UserSession;
  stats: {
    transactions: number;
    loans: number;
    cards: number;
    creditLines: number;
  };
  onExportJson: () => void;
  onPurgeData: () => void;
  onLoadDemoData: () => void;
  language: Language;
}

export const DangerZoneModal: React.FC<DangerZoneModalProps> = ({
  isOpen,
  onClose,
  userSession,
  stats,
  onExportJson,
  onPurgeData,
  onLoadDemoData,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'purge' | 'demo'>('purge');
  const [confirmText, setConfirmText] = useState('');
  const [demoConfirmText, setDemoConfirmText] = useState('');

  if (!isOpen) return null;

  const isEs = language === 'es';
  const isCloud = userSession.userMode === 'cloud';
  const targetConfirmation = isEs ? 'ELIMINAR' : 'DELETE';
  const targetDemoConfirmation = isEs ? 'RESTAURAR' : 'RESTORE';
  const canDelete = confirmText.trim().toUpperCase() === targetConfirmation;
  const canLoadDemo = demoConfirmText.trim().toUpperCase() === targetDemoConfirmation;

  const handlePurge = () => {
    if (!canDelete) return;
    onPurgeData();
    setConfirmText('');
    setDemoConfirmText('');
    onClose();
  };

  const handleLoadDemo = () => {
    if (!canLoadDemo) return;
    onLoadDemoData();
    setConfirmText('');
    setDemoConfirmText('');
    onClose();
  };

  const handleClose = () => {
    setConfirmText('');
    setDemoConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-neutral-100 transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {isEs ? 'Zona de Peligro y Borrado' : 'Danger Zone & Data Reset'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {isEs 
                  ? 'Gestión avanzada de reset, aislamiento local y purga de datos' 
                  : 'Advanced data reset, local isolation, and data purging'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          
          {/* Banner 1: Actualmente tienes X en memoria + Exportar JSON */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px]">
                {isEs ? (
                  <>Actualmente tienes <strong className="font-bold text-slate-900 dark:text-white">{stats.transactions} movimientos</strong>, <strong className="font-bold text-slate-900 dark:text-white">{stats.loans} préstamos</strong> y <strong className="font-bold text-slate-900 dark:text-white">{stats.cards} tarjetas</strong> en memoria.</>
                ) : (
                  <>You currently have <strong className="font-bold text-slate-900 dark:text-white">{stats.transactions} transactions</strong>, <strong className="font-bold text-slate-900 dark:text-white">{stats.loans} loans</strong>, and <strong className="font-bold text-slate-900 dark:text-white">{stats.cards} cards</strong> in memory.</>
                )}
              </span>
            </div>
            <button
              onClick={onExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 font-bold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEs ? 'Exportar JSON' : 'Export JSON'}</span>
            </button>
          </div>

          {/* Banner 2: Estado de Sesión */}
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-300 dark:border-sky-500/30 flex items-start gap-2.5 text-sky-900 dark:text-sky-300 text-[11px] leading-relaxed">
            {isCloud ? (
              <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            ) : (
              <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              {isCloud ? (
                isEs ? (
                  <>Sesión activa con <strong className="text-slate-900 dark:text-white font-bold">{userSession.email}</strong>. Estás trabajando con la nube vinculada a tu cuenta de Google. Las operaciones de borrado purgarán los datos guardados en tu cuenta.</>
                ) : (
                  <>Active session with <strong className="text-slate-900 dark:text-white font-bold">{userSession.email}</strong>. Connected to Google Cloud. Purge operations will remove data saved in your account.</>
                )
              ) : (
                isEs ? (
                  <>Estás trabajando en <strong className="text-slate-900 dark:text-white font-bold">Modo Local</strong>. Las operaciones de borrado purgarán los datos guardados en este navegador, dejando el espacio local en blanco.</>
                ) : (
                  <>Working in <strong className="text-slate-900 dark:text-white font-bold">Local Mode</strong>. Purge operations will remove data saved in this browser, starting fresh.</>
                )
              )}
            </div>
          </div>

          {/* Selector de Pestañas: [Borrar en tu cuenta/local] vs [Datos de demostración] */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-200 dark:border-neutral-800">
            <button
              onClick={() => setActiveTab('purge')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'purge'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{isCloud ? (isEs ? 'Borrar en tu Cuenta' : 'Purge Cloud Account') : (isEs ? 'Borrar Datos Locales' : 'Purge Local Data')}</span>
            </button>
            <button
              onClick={() => setActiveTab('demo')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'demo'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isEs ? 'Datos de Demostración' : 'Demo Data'}</span>
            </button>
          </div>

          {/* Tab 1: Purga / Borrado Seguro */}
          {activeTab === 'purge' ? (
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-500/5 border border-rose-300 dark:border-rose-500/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                <Trash2 className="w-4 h-4" />
                <span>
                  {isCloud 
                    ? (isEs ? `Vaciar Datos en tu Cuenta de Google (${userSession.email})` : `Empty Data in Google Account (${userSession.email})`)
                    : (isEs ? 'Vaciar Datos de tu Espacio Local' : 'Empty Data in Local Storage')}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                {isEs 
                  ? 'Elimina todos los movimientos, préstamos, tarjetas y configuraciones guardados. Para evitar accidentes, debes confirmar la palabra clave antes de proceder.'
                  : 'Deletes all stored transactions, loans, credit cards, and credit lines. Type the confirmation keyword below to proceed.'}
              </p>

              <div>
                <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 block text-[11px]">
                  {isEs ? 'Escribe ' : 'Type '}
                  <span className="font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider">{targetConfirmation}</span>
                  {isEs ? ' para confirmar:' : ' to confirm:'}
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={targetConfirmation}
                  className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 font-semibold"
                />
              </div>

              <button
                onClick={handlePurge}
                disabled={!canDelete}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isCloud 
                    ? (isEs ? 'Vaciar Datos de Cuenta de Google' : 'Empty Google Account Data')
                    : (isEs ? 'Vaciar Datos de Espacio Local' : 'Empty Local Storage Data')}
                </span>
              </button>
            </div>
          ) : (
            /* Tab 2: Cargar datos de demostración con confirmación protegida */
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-500/5 border border-amber-300 dark:border-amber-500/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold">
                <RotateCcw className="w-4 h-4" />
                <span>{isEs ? 'Restablecer y Cargar Plantilla con Datos de Demostración' : 'Reset and Load Template with Demo Data'}</span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                {isEs 
                  ? 'Esta acción sobrescribirá y reemplazará todos tus movimientos, préstamos, tarjetas y líneas de crédito actuales por los datos de la plantilla de ejemplo. Para evitar restablecer por accidente, debes confirmar la palabra clave antes de proceder.'
                  : 'This action will overwrite and replace all your current transactions, loans, cards, and credit lines with sample demo data. To prevent accidental reset, type the confirmation keyword below to proceed.'}
              </p>

              <div>
                <label className="text-slate-700 dark:text-neutral-300 font-semibold mb-1 block text-[11px]">
                  {isEs ? 'Escribe ' : 'Type '}
                  <span className="font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{targetDemoConfirmation}</span>
                  {isEs ? ' para confirmar:' : ' to confirm:'}
                </label>
                <input
                  type="text"
                  value={demoConfirmText}
                  onChange={e => setDemoConfirmText(e.target.value)}
                  placeholder={targetDemoConfirmation}
                  className="w-full bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <button
                onClick={handleLoadDemo}
                disabled={!canLoadDemo}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isEs ? 'Restablecer y Cargar Plantilla de Ejemplo' : 'Reset and Load Sample Template'}</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isEs ? 'Cerrar' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
