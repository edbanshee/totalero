import React, { useState } from 'react';
import { Landmark, Plus, Trash2 } from 'lucide-react';
import { CreditLine, Language } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { formatCurrency } from '../utils/calculations';

interface LiquidityPoolSectionProps {
  creditLines: CreditLine[];
  language: Language;
  onUpdateCreditLine: (id: string, newAmount: number) => void;
  onAddCreditLine: (institution: string, amount: number) => void;
  onDeleteCreditLine: (id: string) => void;
}

export const LiquidityPoolSection: React.FC<LiquidityPoolSectionProps> = ({
  creditLines,
  language,
  onUpdateCreditLine,
  onAddCreditLine,
  onDeleteCreditLine
}) => {
  const t = TRANSLATIONS[language];
  const [isAdding, setIsAdding] = useState(false);
  const [newInstitution, setNewInstitution] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);

  const totalLiquidity = creditLines.reduce((sum, line) => sum + (line.availableAmount || 0), 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstitution.trim()) return;
    onAddCreditLine(newInstitution.trim(), newAmount || 0);
    setNewInstitution('');
    setNewAmount(0);
    setIsAdding(false);
  };

  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{t.liquidityTitle}</h3>
            <p className="text-[11px] text-neutral-400">{t.liquiditySubtitle}</p>
          </div>
        </div>

        {/* Botón Agregar Línea */}
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.addLine}</span>
        </button>
      </div>

      {/* Resumen Total */}
      <div className="flex items-center justify-between bg-neutral-900/80 px-4 py-2.5 rounded-xl border border-neutral-800/80">
        <span className="text-xs font-semibold text-neutral-300">{t.totalLiquidity}:</span>
        <span className="text-base font-extrabold font-mono text-emerald-400 tracking-tight tabular-nums">
          {formatCurrency(totalLiquidity)}
        </span>
      </div>

      {/* Formulario rápido para nueva línea */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-neutral-900 p-3 rounded-xl border border-emerald-500/30 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            required
            placeholder={language === 'es' ? 'Nombre institución (ej. Scotiabank)' : 'Institution name (e.g. Chase)'}
            value={newInstitution}
            onChange={e => setNewInstitution(e.target.value)}
            className="flex-1 min-w-[140px] bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            placeholder="0.00"
            value={newAmount || ''}
            onChange={e => setNewAmount(Number(e.target.value))}
            className="w-28 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400"
          >
            {t.btnSave}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-2 py-1 text-xs text-neutral-400 hover:text-white"
          >
            {t.btnCancel}
          </button>
        </form>
      )}

      {/* Tabla de Instituciones y Montos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] text-neutral-400 border-b border-neutral-800 uppercase font-semibold">
              <th className="py-2 px-3">{t.institutionCol}</th>
              <th className="py-2 px-3 text-right">{t.availableAmountCol}</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {creditLines.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-neutral-500 text-xs">
                  {language === 'es' ? 'No hay líneas de crédito registradas.' : 'No credit lines registered.'}
                </td>
              </tr>
            ) : (
              creditLines.map(line => (
                <tr key={line.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2 px-3 font-semibold text-white whitespace-nowrap">
                    {line.institution}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <span className="text-neutral-500 font-mono text-[11px]">$</span>
                      <input
                        type="number"
                        step="1"
                        value={line.availableAmount}
                        onChange={e => onUpdateCreditLine(line.id, Number(e.target.value))}
                        className="w-24 bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-emerald-500 focus:bg-neutral-900 rounded px-1 py-0.5 text-right font-mono font-bold text-white text-xs tabular-nums focus:outline-none transition-all"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={() => onDeleteCreditLine(line.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Eliminar línea"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-800 font-bold text-neutral-300">
              <td className="py-2.5 px-3 uppercase text-[10px] text-emerald-400">
                {t.totalLiquidity}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-emerald-400 text-sm tabular-nums">
                {formatCurrency(totalLiquidity)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Nota al pie */}
      <p className="text-[11px] text-neutral-400 italic">
        {t.liquidityHelpNote}
      </p>
    </div>
  );
};
