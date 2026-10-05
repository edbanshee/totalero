import React, { useState } from 'react';
import { CreditCard as CardIcon, Plus, Trash2, Edit2, X, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { CreditCard, Language } from '../types/finance';
import { TRANSLATIONS, MONTH_NAMES, MONTH_SHORT } from '../utils/translations';
import { formatCurrency, getDateString } from '../utils/calculations';

interface CreditCardsSectionProps {
  creditCards: CreditCard[];
  selectedMonth: number;
  year: number;
  language: Language;
  onUpdateCard: (card: CreditCard, updateAllMonths?: boolean) => void;
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
  const [formPayMonthOffset, setFormPayMonthOffset] = useState<number>(0); // 0 = mes actual, 1 = mes siguiente
  const [formCutDay, setFormCutDay] = useState(22);
  const [formCutMonthOffset, setFormCutMonthOffset] = useState<number>(-1); // -1 = mes anterior, 0 = mes actual
  const [formAmount, setFormAmount] = useState<number>(0);

  // Helper para calcular las fechas dinámicas de cualquier tarjeta para el mes activo
  const getCardDates = (card: CreditCard) => {
    // Offset de corte: -1 = mes anterior, 0 = mes actual (default: payDay < cutDay ? -1 : 0)
    const cutOffset = card.cutMonthOffset !== undefined 
      ? card.cutMonthOffset 
      : (card.payDay < card.cutDay ? -1 : 0);
    const rawCutMonth = selectedMonth + cutOffset;
    const cutMonthIdx = (rawCutMonth + 12) % 12;
    const cutYear = year + Math.floor(rawCutMonth / 12);
    const cutDateStr = getDateString(card.cutDay, cutMonthIdx, language, cutYear);

    // Offset de pago: 0 = mes actual, 1 = mes siguiente (default: 0)
    const payOffset = card.payMonthOffset !== undefined ? card.payMonthOffset : 0;
    const rawPayMonth = selectedMonth + payOffset;
    const payMonthIdx = (rawPayMonth + 12) % 12;
    const payYear = year + Math.floor(rawPayMonth / 12);
    const payDateStr = getDateString(card.payDay, payMonthIdx, language, payYear);

    return {
      cutDateStr,
      payDateStr,
      cutOffset,
      payOffset
    };
  };

  // Separar en 1ra y 2da quincena según el día de pago
  const fortnight1 = creditCards.filter(c => c.payDay <= 15);
  const fortnight2 = creditCards.filter(c => c.payDay > 15);

  const totalFortnight1 = fortnight1.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalFortnight2 = fortnight2.reduce((sum, c) => sum + (c.amount || 0), 0);

  const openAddModal = (presetPayDay: number = 5) => {
    setEditingCard(null);
    setFormName('');
    setFormPayDay(presetPayDay);
    setFormPayMonthOffset(0);
    setFormCutDay(presetPayDay <= 15 ? 22 : 5);
    setFormCutMonthOffset(presetPayDay <= 15 ? -1 : 0);
    setFormAmount(0);
    setIsModalOpen(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setFormName(card.name);
    setFormPayDay(card.payDay);
    setFormPayMonthOffset(card.payMonthOffset ?? 0);
    setFormCutDay(card.cutDay);
    setFormCutMonthOffset(card.cutMonthOffset ?? (card.payDay < card.cutDay ? -1 : 0));
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
        payMonthOffset: formPayMonthOffset,
        cutDay: formCutDay,
        cutMonthOffset: formCutMonthOffset,
        amount: formAmount
      }, true); // updateAllMonths = true para sincronizar datos en todos los meses
    } else {
      onAddCard({
        name: formName.trim(),
        payDay: formPayDay,
        payMonthOffset: formPayMonthOffset,
        cutDay: formCutDay,
        cutMonthOffset: formCutMonthOffset,
        amount: formAmount,
        isPaid: false
      });
    }
    setIsModalOpen(false);
  };

  // El estado de pagado se actualiza de forma INDEPENDIENTE para el mes activo
  const toggleCardPaid = (card: CreditCard) => {
    onUpdateCard({
      ...card,
      isPaid: !card.isPaid
    }, false); // updateAllMonths = false (solo este mes)
  };

  // Nombres de meses para la vista previa en el modal
  const activeMonthName = MONTH_NAMES[language][selectedMonth];
  const prevMonthName = MONTH_NAMES[language][(selectedMonth + 11) % 12];
  const nextMonthName = MONTH_NAMES[language][(selectedMonth + 1) % 12];

  const prevMonthShort = MONTH_SHORT[language][(selectedMonth + 11) % 12];
  const currMonthShort = MONTH_SHORT[language][selectedMonth];
  const nextMonthShort = MONTH_SHORT[language][(selectedMonth + 1) % 12];

  // Cálculo de vista previa en tiempo real dentro del modal
  const rawPreviewCutMonth = selectedMonth + formCutMonthOffset;
  const previewCutMonthIdx = (rawPreviewCutMonth + 12) % 12;
  const previewCutYear = year + Math.floor(rawPreviewCutMonth / 12);
  const previewCutDateStr = getDateString(formCutDay, previewCutMonthIdx, language, previewCutYear);

  const rawPreviewPayMonth = selectedMonth + formPayMonthOffset;
  const previewPayMonthIdx = (rawPreviewPayMonth + 12) % 12;
  const previewPayYear = year + Math.floor(rawPreviewPayMonth / 12);
  const previewPayDateStr = getDateString(formPayDay, previewPayMonthIdx, language, previewPayYear);

  return (
    <div className="bg-white dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CardIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{t.creditCardsTitle}</h3>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">{t.creditCardsSubtitle}</p>
          </div>
        </div>

        {/* Totales Quincenales */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="text-slate-600 dark:text-neutral-400">
            {t.totalFortnight1}: <strong className="text-slate-900 dark:text-white tabular-nums font-bold">{formatCurrency(totalFortnight1)}</strong>
          </span>
          <span className="text-slate-300 dark:text-neutral-700">|</span>
          <span className="text-slate-600 dark:text-neutral-400">
            {t.totalFortnight2}: <strong className="text-slate-900 dark:text-white tabular-nums font-bold">{formatCurrency(totalFortnight2)}</strong>
          </span>
        </div>
      </div>

      {/* Dos Subpaneles Quincenales en paralelo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 1ra Quincena (Días 1 - 15) */}
        <div className="bg-slate-50/70 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-neutral-200">
              <span>📅</span>
              <span>{t.fortnight1}</span>
            </div>
            <button
              onClick={() => openAddModal(5)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-500/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{t.addCard}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-slate-500 dark:text-neutral-400 border-b border-slate-200 dark:border-neutral-800 uppercase font-semibold">
                  <th className="py-1.5 px-2">{t.cardColName}</th>
                  <th className="py-1.5 px-2">{t.cardColPayDate}</th>
                  <th className="py-1.5 px-2">{t.cardColCutDate}</th>
                  <th className="py-1.5 px-2 text-right">{t.cardColAmount}</th>
                  <th className="py-1.5 px-2 text-center">{t.cardColStatus}</th>
                  <th className="py-1.5 px-1 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800/40">
                {fortnight1.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400 dark:text-neutral-500 text-[11px]">
                      {language === 'es' ? 'Sin tarjetas en 1ra quincena' : 'No cards in 1st fortnight'}
                    </td>
                  </tr>
                ) : (
                  fortnight1.map(card => {
                    const { cutDateStr, payDateStr, cutOffset, payOffset } = getCardDates(card);

                    return (
                      <tr key={card.id} className="hover:bg-slate-100/80 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">{card.name}</td>
                        <td className="py-2 px-2 text-slate-700 dark:text-neutral-300 whitespace-nowrap tabular-nums">
                          <div className="flex items-center gap-1">
                            <span>{payDateStr}</span>
                            {payOffset === 1 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold" title={language === 'es' ? 'Pago en mes siguiente' : 'Paid in next month'}>
                                {language === 'es' ? 'mes sig.' : 'next mo.'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-slate-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                          <div className="flex items-center gap-1">
                            <span>{cutDateStr}</span>
                            {cutOffset === -1 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold" title={language === 'es' ? 'Corte en mes anterior' : 'Cutoff in previous month'}>
                                {language === 'es' ? 'mes ant.' : 'prev. mo.'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                          {card.amount > 0 ? formatCurrency(card.amount) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => toggleCardPaid(card)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                              card.isPaid
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                                : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-400 border-slate-300 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-500'
                            }`}
                          >
                            {card.isPaid ? t.paidPayment : t.pendingPayment}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(card)}
                              className="text-slate-400 dark:text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-0.5 cursor-pointer"
                              title={language === 'es' ? 'Editar' : 'Edit'}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteCard(card.id)}
                              className="text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 cursor-pointer"
                              title={language === 'es' ? 'Eliminar' : 'Delete'}
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
        <div className="bg-slate-50/70 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-neutral-200">
              <span>📅</span>
              <span>{t.fortnight2}</span>
            </div>
            <button
              onClick={() => openAddModal(18)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-500/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{t.addCard}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-slate-500 dark:text-neutral-400 border-b border-slate-200 dark:border-neutral-800 uppercase font-semibold">
                  <th className="py-1.5 px-2">{t.cardColName}</th>
                  <th className="py-1.5 px-2">{t.cardColPayDate}</th>
                  <th className="py-1.5 px-2">{t.cardColCutDate}</th>
                  <th className="py-1.5 px-2 text-right">{t.cardColAmount}</th>
                  <th className="py-1.5 px-2 text-center">{t.cardColStatus}</th>
                  <th className="py-1.5 px-1 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800/40">
                {fortnight2.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400 dark:text-neutral-500 text-[11px]">
                      {language === 'es' ? 'Sin tarjetas en 2da quincena' : 'No cards in 2nd fortnight'}
                    </td>
                  </tr>
                ) : (
                  fortnight2.map(card => {
                    const { cutDateStr, payDateStr, cutOffset, payOffset } = getCardDates(card);

                    return (
                      <tr key={card.id} className="hover:bg-slate-100/80 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">{card.name}</td>
                        <td className="py-2 px-2 text-slate-700 dark:text-neutral-300 whitespace-nowrap tabular-nums">
                          <div className="flex items-center gap-1">
                            <span>{payDateStr}</span>
                            {payOffset === 1 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold" title={language === 'es' ? 'Pago en mes siguiente' : 'Paid in next month'}>
                                {language === 'es' ? 'mes sig.' : 'next mo.'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-slate-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                          <div className="flex items-center gap-1">
                            <span>{cutDateStr}</span>
                            {cutOffset === -1 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold" title={language === 'es' ? 'Corte en mes anterior' : 'Cutoff in previous month'}>
                                {language === 'es' ? 'mes ant.' : 'prev. mo.'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                          {card.amount > 0 ? formatCurrency(card.amount) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => toggleCardPaid(card)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                              card.isPaid
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                                : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-400 border-slate-300 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-500'
                            }`}
                          >
                            {card.isPaid ? t.paidPayment : t.pendingPayment}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(card)}
                              className="text-slate-400 dark:text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-0.5 cursor-pointer"
                              title={language === 'es' ? 'Editar' : 'Edit'}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteCard(card.id)}
                              className="text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 cursor-pointer"
                              title={language === 'es' ? 'Eliminar' : 'Delete'}
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

      {/* Modal para Agregar / Editar Tarjeta con Selección de Mes de Corte y Mes de Pago */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl my-auto text-xs text-slate-900 dark:text-neutral-100">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CardIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingCard 
                      ? (language === 'es' ? 'Editar Tarjeta de Crédito' : 'Edit Credit Card') 
                      : (language === 'es' ? 'Agregar Tarjeta de Crédito' : 'Add Credit Card')}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' 
                      ? `Fechas dinámicas para ${activeMonthName} ${year}` 
                      : `Dynamic dates for ${activeMonthName} ${year}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCard} className="flex flex-col gap-4">
              
              {/* 1. Nombre de la Tarjeta */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 block">
                  {language === 'es' ? 'Nombre de la Tarjeta / Institución' : 'Card Name / Institution'}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="ej. Vexi, BBVA Oro, Nu, Tarjeta Departamental..."
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                />
              </div>

              {/* 2. Monto a Pagar */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 block">
                  {language === 'es' ? 'Monto a Pagar en este Ciclo ($)' : 'Amount Due for this Statement ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount || ''}
                  onChange={e => setFormAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white tabular-nums placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                />
              </div>

              {/* 3. Sección Fecha de Corte (Día + Selector de Mes Anterior vs Mes Actual) */}
              <div className="bg-slate-50/80 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {language === 'es' ? 'Fecha de Corte' : 'Cutoff Date'}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    {language === 'es' ? 'Cierre de tu estado de cuenta' : 'Statement closing date'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <label className="text-[11px] text-slate-600 dark:text-neutral-400 block mb-1">
                      {language === 'es' ? 'Día de Corte (1-31)' : 'Cutoff Day (1-31)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={formCutDay}
                      onChange={e => setFormCutDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                      className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="text-[11px] text-slate-600 dark:text-neutral-400 block mb-1">
                      {language === 'es' ? '¿En qué mes ocurre el corte?' : 'Which month does cutoff happen?'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-200/80 dark:bg-neutral-900 rounded-lg border border-slate-300 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setFormCutMonthOffset(-1)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          formCutMonthOffset === -1
                            ? 'bg-amber-500 text-white shadow-xs font-bold'
                            : 'text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{language === 'es' ? 'Mes Anterior' : 'Previous Month'}</span>
                        <span className="text-[9px] opacity-90">({prevMonthShort})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormCutMonthOffset(0)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          formCutMonthOffset === 0
                            ? 'bg-amber-500 text-white shadow-xs font-bold'
                            : 'text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{language === 'es' ? 'Mes Actual' : 'Current Month'}</span>
                        <span className="text-[9px] opacity-90">({currMonthShort})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Sección Fecha de Pago (Día + Selector de Mes Actual vs Mes Siguiente) */}
              <div className="bg-slate-50/80 dark:bg-neutral-950/70 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {language === 'es' ? 'Fecha de Pago (Límite)' : 'Due Date (Payment Deadline)'}
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                    {language === 'es' ? 'Fecha límite para pagar' : 'Payment deadline date'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <label className="text-[11px] text-slate-600 dark:text-neutral-400 block mb-1">
                      {language === 'es' ? 'Día de Pago (1-31)' : 'Due Day (1-31)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={formPayDay}
                      onChange={e => setFormPayDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                      className="w-full bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="text-[11px] text-slate-600 dark:text-neutral-400 block mb-1">
                      {language === 'es' ? '¿En qué mes se realiza el pago?' : 'Which month is payment made?'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-200/80 dark:bg-neutral-900 rounded-lg border border-slate-300 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setFormPayMonthOffset(0)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          formPayMonthOffset === 0
                            ? 'bg-blue-600 text-white shadow-xs font-bold'
                            : 'text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{language === 'es' ? 'Mes Actual' : 'Current Month'}</span>
                        <span className="text-[9px] opacity-90">({currMonthShort})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormPayMonthOffset(1)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          formPayMonthOffset === 1
                            ? 'bg-blue-600 text-white shadow-xs font-bold'
                            : 'text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{language === 'es' ? 'Mes Siguiente' : 'Next Month'}</span>
                        <span className="text-[9px] opacity-90">({nextMonthShort})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Vista Previa Dinámica del Ciclo para el mes activo */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/30 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {language === 'es' 
                      ? `Vista Previa para ${activeMonthName} ${year}` 
                      : `Cycle Preview for ${activeMonthName} ${year}`}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-bold">
                    {formPayDay <= 15 ? t.fortnight1 : t.fortnight2}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                      {language === 'es' ? 'Fecha de Corte:' : 'Cutoff Date:'}
                    </span>
                    <strong className="text-xs text-amber-700 dark:text-amber-300 font-bold tabular-nums mt-0.5">
                      {previewCutDateStr}
                    </strong>
                    <span className="text-[9px] text-slate-400 dark:text-neutral-500">
                      {formCutMonthOffset === -1 ? `(${prevMonthName})` : `(${activeMonthName})`}
                    </span>
                  </div>

                  <div className="bg-white/80 dark:bg-neutral-900/80 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                      {language === 'es' ? 'Fecha de Pago:' : 'Due Date:'}
                    </span>
                    <strong className="text-xs text-blue-700 dark:text-blue-300 font-bold tabular-nums mt-0.5">
                      {previewPayDateStr}
                    </strong>
                    <span className="text-[9px] text-slate-400 dark:text-neutral-500">
                      {formPayMonthOffset === 1 ? `(${nextMonthName})` : `(${activeMonthName})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  {editingCard ? (language === 'es' ? 'Actualizar Tarjeta' : 'Update Card') : (language === 'es' ? 'Guardar Tarjeta' : 'Save Card')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
