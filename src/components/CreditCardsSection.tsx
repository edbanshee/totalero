import React, { useState } from 'react';
import { CreditCard as CardIcon, Plus, Check, Trash2, Edit2 } from 'lucide-react';
import { CreditCard, Language } from '../types/finance';
import { TRANSLATIONS } from '../utils/translations';
import { formatCurrency, getDateString } from '../utils/calculations';

interface CreditCardsSectionProps {
  creditCards: CreditCard[];
  selectedMonth: number;
  year: number;
  language: Language;
  onUpdateCard: (card: CreditCard) => void;
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
  onDeleteCard: (id: string) => void;
}

export const CreditCardsSection: React.FC<CreditCardsSectionProps> = ({
  creditCards,
  selectedMonth,
  year,
  language,
  onUpdateCard,
  onAddCard,
  onDeleteCard
}) => {
  const t = TRANSLATIONS[language];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPayDay, setFormPayDay] = useState(4);
  const [formCutDay, setFormCutDay] = useState(22);
  const [formAmount, setFormAmount] = useState(0);

  // Separar en 1ra y 2da quincena según el día de pago
  const fortnight1 = creditCards.filter(c => c.payDay <= 15);
  const fortnight2 = creditCards.filter(c => c.payDay > 15);

  const totalFortnight1 = fortnight1.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalFortnight2 = fortnight2.reduce((sum, c) => sum + (c.amount || 0), 0);

  const openAddModal = (presetPayDay: number = 5) => {
    setEditingCard(null);
    setFormName('');
    setFormPayDay(presetPayDay);
    setFormCutDay(20);
    setFormAmount(0);
    setIsModalOpen(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setFormName(card.name);
    setFormPayDay(card.payDay);
    setFormCutDay(card.cutDay);
    setFormAmount(card.amount);
    setIsModalOpen(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCard) {
      onUpdateCard({
        ...editingCard,
        name: formName.trim(),
        payDay: formPayDay,
        cutDay: formCutDay,
        amount: formAmount
      });
    } else {
      onAddCard({
        name: formName.trim(),
        payDay: formPayDay,
        cutDay: formCutDay,
        amount: formAmount,
        isPaid: false
      });
    }
    setIsModalOpen(false);
  };

  const toggleCardPaid = (card: CreditCard) => {
    onUpdateCard({
      ...card,
      isPaid: !card.isPaid
    });
  };

  // Helper para mostrar fecha de corte (si el corte es en el mes previo)
  const getCutDateDisplay = (cutDay: number) => {
    if (!cutDay) return '-';
    // Si cutDay > payDay suele pertenecer al ciclo del mes anterior
    const cutMonth = formPayDay < cutDay ? (selectedMonth === 0 ? 11 : selectedMonth - 1) : selectedMonth;
    return getDateString(cutDay, cutMonth, language);
  };

  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CardIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{t.creditCardsTitle}</h3>
            <p className="text-[11px] text-neutral-400">{t.creditCardsSubtitle}</p>
          </div>
        </div>

        {/* Totales Quincenales */}
        <div className="flex items-center gap-3 text-xs font-mono font-medium">
          <span className="text-neutral-400">
            {t.totalFortnight1}: <strong className="text-white tabular-nums">{formatCurrency(totalFortnight1)}</strong>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">
            {t.totalFortnight2}: <strong className="text-white tabular-nums">{formatCurrency(totalFortnight2)}</strong>
          </span>
        </div>
      </div>

      {/* Dos Subpaneles Quincenales en paralelo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 1ra Quincena (Días 1 - 15) */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
              <span>📅</span>
              <span>{t.fortnight1}</span>
            </div>
            <button
              onClick={() => openAddModal(5)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 py-0.5 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>{t.addCard}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-neutral-400 border-b border-neutral-800 uppercase font-semibold">
                  <th className="py-1.5 px-2">{t.cardColName}</th>
                  <th className="py-1.5 px-2">{t.cardColPayDate}</th>
                  <th className="py-1.5 px-2">{t.cardColCutDate}</th>
                  <th className="py-1.5 px-2 text-right">{t.cardColAmount}</th>
                  <th className="py-1.5 px-2 text-center">{t.cardColStatus}</th>
                  <th className="py-1.5 px-1 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {fortnight1.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-neutral-500 text-[11px]">
                      {language === 'es' ? 'Sin tarjetas en 1ra quincena' : 'No cards in 1st fortnight'}
                    </td>
                  </tr>
                ) : (
                  fortnight1.map(card => {
                    const payDateStr = getDateString(card.payDay, selectedMonth, language);
                    const cutMonth = card.payDay < card.cutDay ? (selectedMonth === 0 ? 11 : selectedMonth - 1) : selectedMonth;
                    const cutDateStr = getDateString(card.cutDay, cutMonth, language);

                    return (
                      <tr key={card.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="py-2 px-2 font-bold text-white whitespace-nowrap">{card.name}</td>
                        <td className="py-2 px-2 font-mono text-neutral-300 whitespace-nowrap">{payDateStr}</td>
                        <td className="py-2 px-2 font-mono text-neutral-400 whitespace-nowrap">{cutDateStr}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-white whitespace-nowrap tabular-nums">
                          {card.amount > 0 ? formatCurrency(card.amount) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => toggleCardPaid(card)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                              card.isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'
                            }`}
                          >
                            {card.isPaid ? t.paidPayment : t.pendingPayment}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(card)}
                              className="text-neutral-500 hover:text-emerald-400 p-0.5"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteCard(card.id)}
                              className="text-neutral-500 hover:text-rose-400 p-0.5"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2da Quincena (Días 16 - 31) */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
              <span>📅</span>
              <span>{t.fortnight2}</span>
            </div>
            <button
              onClick={() => openAddModal(18)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 py-0.5 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>{t.addCard}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-neutral-400 border-b border-neutral-800 uppercase font-semibold">
                  <th className="py-1.5 px-2">{t.cardColName}</th>
                  <th className="py-1.5 px-2">{t.cardColPayDate}</th>
                  <th className="py-1.5 px-2">{t.cardColCutDate}</th>
                  <th className="py-1.5 px-2 text-right">{t.cardColAmount}</th>
                  <th className="py-1.5 px-2 text-center">{t.cardColStatus}</th>
                  <th className="py-1.5 px-1 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {fortnight2.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-neutral-500 text-[11px]">
                      {language === 'es' ? 'Sin tarjetas en 2da quincena' : 'No cards in 2nd fortnight'}
                    </td>
                  </tr>
                ) : (
                  fortnight2.map(card => {
                    const payDateStr = getDateString(card.payDay, selectedMonth, language);
                    const cutMonth = card.payDay < card.cutDay ? (selectedMonth === 0 ? 11 : selectedMonth - 1) : selectedMonth;
                    const cutDateStr = getDateString(card.cutDay, cutMonth, language);

                    return (
                      <tr key={card.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="py-2 px-2 font-bold text-white whitespace-nowrap">{card.name}</td>
                        <td className="py-2 px-2 font-mono text-neutral-300 whitespace-nowrap">{payDateStr}</td>
                        <td className="py-2 px-2 font-mono text-neutral-400 whitespace-nowrap">{cutDateStr}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-white whitespace-nowrap tabular-nums">
                          {card.amount > 0 ? formatCurrency(card.amount) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => toggleCardPaid(card)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                              card.isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'
                            }`}
                          >
                            {card.isPaid ? t.paidPayment : t.pendingPayment}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(card)}
                              className="text-neutral-500 hover:text-emerald-400 p-0.5"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteCard(card.id)}
                              className="text-neutral-500 hover:text-rose-400 p-0.5"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal para Agregar / Editar Tarjeta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h4 className="text-base font-bold text-white mb-3">
              {editingCard ? (language === 'es' ? 'Editar Tarjeta' : 'Edit Card') : t.addCard}
            </h4>
            
            <form onSubmit={handleSaveCard} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  {language === 'es' ? 'Nombre de la Tarjeta' : 'Card Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="ej. Nu M, Stori, BBVA..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">
                    {language === 'es' ? 'Día de Pago (1-31)' : 'Due Day (1-31)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formPayDay}
                    onChange={e => setFormPayDay(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">
                    {language === 'es' ? 'Día de Corte (1-31)' : 'Cutoff Day (1-31)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formCutDay}
                    onChange={e => setFormCutDay(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  {language === 'es' ? 'Monto a Pagar ($)' : 'Amount to Pay ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount || ''}
                  onChange={e => setFormAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400"
                >
                  {t.btnSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
