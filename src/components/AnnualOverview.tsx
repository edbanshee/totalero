import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  PiggyBank, 
  Layers, 
  ExternalLink,
  FileDown,
  Loader2,
  Check,
  ChevronDown
} from 'lucide-react';
import { 
  MonthData, 
  CreditLine, 
  Language, 
  TransactionLabel,
  MIN_CATALOG_YEAR, 
  MAX_CATALOG_YEAR 
} from '../types/finance';
import { MONTH_NAMES } from '../utils/translations';
import { computeMonthTotals, formatCurrency, MonthTotals } from '../utils/calculations';

interface AnnualOverviewProps {
  year: number;
  monthsData: Record<string, MonthData>;
  creditLines: CreditLine[];
  language: Language;
  onSelectMonthAndNavigate: (monthIndex: number) => void;
  onYearChange: (newYear: number) => void;
  onBackToMonthly?: () => void;
}

interface MonthMetric {
  month: number;
  name: string;
  totals: MonthTotals;
  netFlow: number;
  totalCards: number;
  totalLoanPayments: number;
  hasActivity: boolean;
  solvency: 'solvent' | 'warning' | 'deficit';
  solvencyLabel: string;
}

export const AnnualOverview: React.FC<AnnualOverviewProps> = ({
  year,
  monthsData,
  creditLines,
  language,
  onSelectMonthAndNavigate,
  onYearChange,
  onBackToMonthly
}) => {
  const monthNames = MONTH_NAMES[language];
  const [selectedChartMonth, setSelectedChartMonth] = useState<number | null>(null);
  const [tableFilter, setTableFilter] = useState<'all' | 'deficit' | 'solvent'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Años rápidos alrededor del año activo
  const quickYears = useMemo(() => {
    const start = Math.max(MIN_CATALOG_YEAR, Math.min(year - 2, MAX_CATALOG_YEAR - 4));
    return [start, start + 1, start + 2, start + 3, start + 4].filter(y => y <= MAX_CATALOG_YEAR);
  }, [year]);

  // Total de líneas de crédito disponibles
  const totalLiquidity = useMemo(() => {
    return creditLines.reduce((sum, l) => sum + (l.availableAmount || 0), 0);
  }, [creditLines]);

  // Métricas mensuales para los 12 meses
  const monthlyMetrics: MonthMetric[] = useMemo(() => {
    return monthNames.map((name, m) => {
      const monthKey = `${year}-${m}`;
      const mData = monthsData[monthKey];
      const txs = mData?.transactions || [];
      const cards = mData?.creditCards || [];

      const totals = computeMonthTotals(txs);
      const netFlow = totals.totalIncome - totals.totalExpense;
      const totalCards = cards.reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const totalLoanPayments = txs
        .filter(t => t.loanDetails && !t.isAutoAccumulated && (t.loanDetails.loanType !== 'receivable' && t.amount < 0))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const hasActivity = txs.some(t => !t.isAutoAccumulated || (t.isAutoAccumulated && t.isDone)) || !!mData?.hasUserActivity;

      let solvency: 'solvent' | 'warning' | 'deficit' = 'solvent';
      let solvencyLabel = language === 'es' ? 'Solvente' : 'Solvent';

      if (totals.endOfMonthTotal < 0) {
        solvency = 'deficit';
        solvencyLabel = language === 'es' ? 'Déficit' : 'Deficit';
      } else if (netFlow < 0) {
        solvency = 'warning';
        solvencyLabel = language === 'es' ? 'En consumo' : 'Deficit flow';
      }

      return {
        month: m,
        name,
        totals,
        netFlow,
        totalCards,
        totalLoanPayments,
        hasActivity,
        solvency,
        solvencyLabel
      };
    });
  }, [year, monthsData, monthNames, language]);

  // Agregados anuales
  const annualAggregates = useMemo(() => {
    const startOfYearBalance = monthlyMetrics[0]?.totals.accumulated || 0;
    const endOfYearBalance = monthlyMetrics[11]?.totals.endOfMonthTotal || 0;
    
    let totalAnnualIncome = 0;
    let totalAnnualExpense = 0;
    let totalAnnualActual = 0;
    let totalAnnualCards = 0;
    let totalAnnualLoanPayments = 0;

    let highestIncomeMonth = monthlyMetrics[0];
    let highestExpenseMonth = monthlyMetrics[0];
    let lowestBalanceMonth = monthlyMetrics[0];
    let highestBalanceMonth = monthlyMetrics[0];

    let solventCount = 0;
    let warningCount = 0;
    let deficitCount = 0;

    monthlyMetrics.forEach((m) => {
      totalAnnualIncome += m.totals.totalIncome;
      totalAnnualExpense += m.totals.totalExpense;
      totalAnnualActual += m.totals.totalActual;
      totalAnnualCards += m.totalCards;
      totalAnnualLoanPayments += m.totalLoanPayments;

      if (m.totals.totalIncome > (highestIncomeMonth?.totals.totalIncome || 0)) {
        highestIncomeMonth = m;
      }
      if (m.totals.totalExpense > (highestExpenseMonth?.totals.totalExpense || 0)) {
        highestExpenseMonth = m;
      }
      if (m.totals.endOfMonthTotal < (lowestBalanceMonth?.totals.endOfMonthTotal ?? Infinity)) {
        lowestBalanceMonth = m;
      }
      if (m.totals.endOfMonthTotal > (highestBalanceMonth?.totals.endOfMonthTotal ?? -Infinity)) {
        highestBalanceMonth = m;
      }

      if (m.solvency === 'solvent') solventCount++;
      else if (m.solvency === 'warning') warningCount++;
      else if (m.solvency === 'deficit') deficitCount++;
    });

    const annualNetSavings = totalAnnualIncome - totalAnnualExpense;
    const netCapitalChange = endOfYearBalance - startOfYearBalance;
    const capitalChangePct = startOfYearBalance !== 0 
      ? (netCapitalChange / Math.abs(startOfYearBalance)) * 100 
      : 0;
    const savingsRate = totalAnnualIncome > 0 
      ? (annualNetSavings / totalAnnualIncome) * 100 
      : 0;

    const avgMonthlyIncome = totalAnnualIncome / 12;
    const avgMonthlyExpense = totalAnnualExpense / 12;
    const avgMonthlyNetSavings = annualNetSavings / 12;

    return {
      startOfYearBalance,
      endOfYearBalance,
      totalAnnualIncome,
      totalAnnualExpense,
      totalAnnualActual,
      totalAnnualCards,
      totalAnnualLoanPayments,
      annualNetSavings,
      netCapitalChange,
      capitalChangePct,
      savingsRate,
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgMonthlyNetSavings,
      highestIncomeMonth,
      highestExpenseMonth,
      lowestBalanceMonth,
      highestBalanceMonth,
      solventCount,
      warningCount,
      deficitCount
    };
  }, [monthlyMetrics]);

  // Distribución por etiquetas (categorías) en el año
  const categoryBreakdown = useMemo(() => {
    const expenseByLabel: Record<string, { label: TransactionLabel; amount: number; count: number }> = {};
    const incomeByLabel: Record<string, { label: TransactionLabel; amount: number; count: number }> = {};

    Object.values(monthsData).forEach(mData => {
      if (mData.year !== year) return;
      (mData.transactions || []).forEach(t => {
        if (t.isAutoAccumulated) return;
        const absVal = Math.abs(t.amount);
        if (t.amount < 0) {
          if (!expenseByLabel[t.label]) {
            expenseByLabel[t.label] = { label: t.label, amount: 0, count: 0 };
          }
          expenseByLabel[t.label].amount += absVal;
          expenseByLabel[t.label].count += 1;
        } else {
          if (!incomeByLabel[t.label]) {
            incomeByLabel[t.label] = { label: t.label, amount: 0, count: 0 };
          }
          incomeByLabel[t.label].amount += absVal;
          incomeByLabel[t.label].count += 1;
        }
      });
    });

    const expenses = Object.values(expenseByLabel).sort((a, b) => b.amount - a.amount);
    const incomes = Object.values(incomeByLabel).sort((a, b) => b.amount - a.amount);

    return { expenses, incomes };
  }, [monthsData, year]);

  // Cálculo de escalas para el gráfico de barras
  const maxBarValue = useMemo(() => {
    let max = 1000;
    monthlyMetrics.forEach(m => {
      max = Math.max(max, Math.abs(m.totals.endOfMonthTotal), m.totals.totalIncome, m.totals.totalExpense);
    });
    return max;
  }, [monthlyMetrics]);

  const activeFocusMonth = selectedChartMonth !== null ? monthlyMetrics[selectedChartMonth] : null;

  // Generador de PDF profesional descargable directo
  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Franja superior de marca
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 50, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(
        language === 'es' 
          ? `TOTALERO · REPORTE FINANCIERO ANUAL ${year}` 
          : `TOTALERO · ANNUAL FINANCIAL OVERVIEW ${year}`,
        30,
        32
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      const nowStr = new Date().toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      doc.text(
        language === 'es' ? `Fecha de emisión: ${nowStr}` : `Issued: ${nowStr}`,
        pageWidth - 30,
        32,
        { align: 'right' }
      );

      // Fila de 4 KPIs ejecutivos (Y = 62 a 106)
      const boxY = 62;
      const boxHeight = 44;
      const marginX = 30;
      const totalWidth = pageWidth - marginX * 2;
      const gap = 10;
      const boxWidth = (totalWidth - gap * 3) / 4;

      // Card 1: Saldo de Cierre
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, boxY, boxWidth, boxHeight, 4, 4, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(language === 'es' ? 'SALDO DE CIERRE ANUAL' : 'ANNUAL CLOSING BALANCE', marginX + 8, boxY + 14);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(annualAggregates.endOfYearBalance), marginX + 8, boxY + 34);

      // Card 2: Ingresos Totales
      const b2X = marginX + boxWidth + gap;
      doc.roundedRect(b2X, boxY, boxWidth, boxHeight, 4, 4, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105);
      doc.text(language === 'es' ? 'INGRESOS TOTALES' : 'TOTAL INCOME', b2X + 8, boxY + 14);
      doc.setFontSize(13);
      doc.setTextColor(5, 150, 105);
      doc.text(formatCurrency(annualAggregates.totalAnnualIncome), b2X + 8, boxY + 34);

      // Card 3: Gastos Totales
      const b3X = b2X + boxWidth + gap;
      doc.roundedRect(b3X, boxY, boxWidth, boxHeight, 4, 4, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72);
      doc.text(language === 'es' ? 'GASTOS TOTALES' : 'TOTAL EXPENSES', b3X + 8, boxY + 14);
      doc.setFontSize(13);
      doc.setTextColor(225, 29, 72);
      doc.text(formatCurrency(annualAggregates.totalAnnualExpense), b3X + 8, boxY + 34);

      // Card 4: Diagnóstico de Solvencia
      const b4X = b3X + boxWidth + gap;
      doc.roundedRect(b4X, boxY, boxWidth, boxHeight, 4, 4, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(language === 'es' ? 'SOLVENCIA & RESPALDO' : 'SOLVENCY & BACKING', b4X + 8, boxY + 14);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const isSolventAll = annualAggregates.deficitCount === 0;
      doc.setTextColor(isSolventAll ? 5 : 225, isSolventAll ? 150 : 29, isSolventAll ? 105 : 72);
      doc.text(
        isSolventAll 
          ? (language === 'es' ? '12/12 Meses Solventes' : '12/12 Solvent')
          : (language === 'es' ? `${annualAggregates.deficitCount} Mes(es) Déficit` : `${annualAggregates.deficitCount} Deficit Months`),
        b4X + 8, 
        boxY + 34
      );

      // Franja de Diagnóstico de Solvencia (Y = 114 a 140)
      const stripY = 114;
      doc.setFillColor(isSolventAll ? 236 : 255, isSolventAll ? 253 : 241, isSolventAll ? 245 : 242);
      doc.setDrawColor(isSolventAll ? 167 : 254, isSolventAll ? 243 : 205, isSolventAll ? 208 : 211);
      doc.roundedRect(marginX, stripY, totalWidth, 24, 4, 4, 'FD');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isSolventAll ? 4 : 159, isSolventAll ? 120 : 18, isSolventAll ? 87 : 57);
      
      const diagnosticText = isSolventAll
        ? (language === 'es' 
            ? `SOLVENCIA TOTAL: Todos los meses de ${year} proyectan saldo a favor al cierre. Mes mas vulnerable: ${annualAggregates.lowestBalanceMonth?.name} (${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). Bolsa de prestamos disponible: ${formatCurrency(totalLiquidity)}.`
            : `TOTAL SOLVENCY: All months in ${year} project positive closing balance. Lowest month: ${annualAggregates.lowestBalanceMonth?.name} (${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). Credit backing: ${formatCurrency(totalLiquidity)}.`)
        : (language === 'es'
            ? `ALERTA DE LIQUIDEZ: Se proyectan ${annualAggregates.deficitCount} mes(es) con saldo negativo (punto critico: ${annualAggregates.lowestBalanceMonth?.name} con ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). Bolsa de credito disponible: ${formatCurrency(totalLiquidity)}.`
            : `LIQUIDITY ALERT: ${annualAggregates.deficitCount} month(s) project deficit (critical lowest: ${annualAggregates.lowestBalanceMonth?.name} at ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). Credit backing: ${formatCurrency(totalLiquidity)}.`);
      
      doc.text(diagnosticText, marginX + 8, stripY + 15);

      // Tabla Matriz Comparativa Anual
      const tableHead = [[
        '#',
        language === 'es' ? 'Mes' : 'Month',
        language === 'es' ? 'Saldo Inicial' : 'Start Balance',
        language === 'es' ? 'Ingresos (+)' : 'Income (+)',
        language === 'es' ? 'Gastos (-)' : 'Expenses (-)',
        language === 'es' ? 'Flujo Neto' : 'Net Flow',
        language === 'es' ? 'Saldo Fin Mes' : 'End of Month',
        language === 'es' ? 'Dinero Real' : 'Actual Bank',
        language === 'es' ? 'Deudas/Tarjetas' : 'Debts/Cards',
        language === 'es' ? 'Solvencia' : 'Solvency'
      ]];

      const tableBody = monthlyMetrics.map((m) => [
        (m.month + 1).toString(),
        m.name,
        formatCurrency(m.totals.accumulated),
        formatCurrency(m.totals.totalIncome),
        formatCurrency(m.totals.totalExpense),
        (m.netFlow >= 0 ? '+' : '') + formatCurrency(m.netFlow),
        formatCurrency(m.totals.endOfMonthTotal),
        formatCurrency(m.totals.totalActual),
        formatCurrency(m.totalLoanPayments + m.totalCards),
        m.solvencyLabel
      ]);

      const tableFoot = [[
        '',
        language === 'es' ? 'TOTALES DEL AÑO' : 'YEAR TOTALS',
        '-',
        formatCurrency(annualAggregates.totalAnnualIncome),
        formatCurrency(annualAggregates.totalAnnualExpense),
        (annualAggregates.annualNetSavings >= 0 ? '+' : '') + formatCurrency(annualAggregates.annualNetSavings),
        formatCurrency(annualAggregates.endOfYearBalance),
        formatCurrency(annualAggregates.totalAnnualActual),
        formatCurrency(annualAggregates.totalAnnualLoanPayments + annualAggregates.totalAnnualCards),
        `${annualAggregates.solventCount}/12`
      ]];

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        foot: tableFoot,
        startY: 146,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 4,
          font: 'helvetica',
          textColor: [30, 41, 59]
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 60 },
          2: { halign: 'right' },
          3: { halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' },
          4: { halign: 'right', textColor: [225, 29, 72], fontStyle: 'bold' },
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right', fontStyle: 'bold' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          9: { halign: 'center', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      doc.save(`Totalero_Reporte_Anual_${year}.pdf`);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-5 animate-in fade-in duration-200">
      
      {/* 1. Header del Panorama Anual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'es' ? `Panorama Anual ${year}` : `Annual Overview ${year}`}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
              12 {language === 'es' ? 'Meses' : 'Months'}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            {language === 'es' 
              ? 'Diagnóstico consolidado de liquidez, solvencia y flujo de tesorería mensual.' 
              : 'Consolidated overview of annual liquidity, solvency, and monthly treasury.'}
          </p>
        </div>

        {/* Acciones y selector de año */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Volver */}
          {onBackToMonthly && (
            <button
              type="button"
              onClick={onBackToMonthly}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 shadow-2xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'es' ? 'Volver' : 'Back'}</span>
            </button>
          )}

          {/* Controles de año */}
          <div className="flex items-center bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => onYearChange(Math.max(MIN_CATALOG_YEAR, year - 1))}
              disabled={year <= MIN_CATALOG_YEAR}
              className="p-1 hover:bg-white dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded disabled:opacity-25 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 tabular-nums">
              <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{year}</span>
            </div>
            <button
              onClick={() => onYearChange(Math.min(MAX_CATALOG_YEAR, year + 1))}
              disabled={year >= MAX_CATALOG_YEAR}
              className="p-1 hover:bg-white dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded disabled:opacity-25 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Descargar PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-neutral-800 bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            ) : pdfSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>
              {isExportingPdf
                ? (language === 'es' ? 'Generando...' : 'Generating...')
                : pdfSuccess
                  ? '¡Listo!'
                  : (language === 'es' ? 'PDF' : 'PDF')}
            </span>
          </button>
        </div>
      </div>

      {/* Banner Ejecutivo de Solvencia Anual */}
      <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 ${
        annualAggregates.deficitCount === 0
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
      }`}>
        <div className="flex items-start gap-2 sm:gap-2.5">
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            annualAggregates.deficitCount === 0
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}>
            {annualAggregates.deficitCount === 0 ? (
              <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-base font-black tracking-tight">
                {annualAggregates.deficitCount === 0
                  ? (language === 'es' ? `✓ Solvencia Garantizada en ${year}` : `✓ Full Solvency in ${year}`)
                  : (language === 'es' ? `⚠️ Alerta: ${annualAggregates.deficitCount} mes(es) en déficit` : `⚠️ Alert: ${annualAggregates.deficitCount} deficit month(s)`)
                }
              </h2>
              <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                annualAggregates.deficitCount === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {annualAggregates.solventCount}/12 {language === 'es' ? 'Solventes' : 'Solvent'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs opacity-90 leading-relaxed max-w-3xl">
              {annualAggregates.deficitCount === 0
                ? (language === 'es' 
                    ? `Todos los meses concluyen en positivo. Saldo a dic: ${formatCurrency(annualAggregates.endOfYearBalance)}. Ahorro neto: ${formatCurrency(annualAggregates.annualNetSavings)} (${annualAggregates.savingsRate.toFixed(1)}%). Mes más vulnerable: ${annualAggregates.lowestBalanceMonth?.name} (${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}).`
                    : `Every month closes positive. Dec balance: ${formatCurrency(annualAggregates.endOfYearBalance)}. Net savings: ${formatCurrency(annualAggregates.annualNetSavings)} (${annualAggregates.savingsRate.toFixed(1)}%). Lowest month: ${annualAggregates.lowestBalanceMonth?.name} (${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}).`)
                : (language === 'es' 
                    ? `Se proyecta déficit en ${annualAggregates.deficitCount} mes(es) (punto crítico: ${annualAggregates.lowestBalanceMonth?.name} con ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). Bolsa de crédito disponible: ${formatCurrency(totalLiquidity)}.`
                    : `${annualAggregates.deficitCount} deficit month(s) projected (critical: ${annualAggregates.lowestBalanceMonth?.name} at ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). Available credit: ${formatCurrency(totalLiquidity)}.`)}
            </p>
          </div>
        </div>

        {/* Respaldo */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start md:self-center bg-white/70 dark:bg-neutral-900/70 p-1.5 sm:p-2.5 rounded-lg border border-current/20 text-xs">
          <div className="flex flex-col text-right">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-500 dark:text-neutral-400">
              {language === 'es' ? 'Crédito' : 'Credit'}
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(totalLiquidity)}
            </span>
          </div>
          <div className="w-px h-5 sm:h-6 bg-current/20" />
          <div className="flex flex-col text-right">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-500 dark:text-neutral-400">
              {language === 'es' ? 'Cierre Dic' : 'Dec Close'}
            </span>
            <span className={`text-xs sm:text-sm font-black tabular-nums ${annualAggregates.endOfYearBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(annualAggregates.endOfYearBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas Maestras de KPIs Anuales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-3">
        {/* Card 1: Saldo de Cierre */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-neutral-400 mb-0.5">
              <span className="font-semibold">{language === 'es' ? 'Saldo Cierre Anual' : 'Annual Close'}</span>
              <PiggyBank className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xs sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums my-0.5">
              {formatCurrency(annualAggregates.endOfYearBalance)}
            </div>
          </div>
          <div className="pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-neutral-800 text-[8px] sm:text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Inicio:' : 'Jan:'} <strong className="text-slate-700 dark:text-neutral-300">{formatCurrency(annualAggregates.startOfYearBalance)}</strong></span>
            <span className={`font-bold flex items-center gap-0.5 ${annualAggregates.netCapitalChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {annualAggregates.netCapitalChange >= 0 ? '+' : ''}{formatCurrency(annualAggregates.netCapitalChange)}
            </span>
          </div>
        </div>

        {/* Card 2: Ingresos Anuales */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-neutral-400 mb-0.5">
              <span className="font-semibold">{language === 'es' ? 'Ingresos Anuales' : 'Total Income'}</span>
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xs sm:text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums my-0.5">
              {formatCurrency(annualAggregates.totalAnnualIncome)}
            </div>
          </div>
          <div className="pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-neutral-800 text-[8px] sm:text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Promedio/mes:' : 'Monthly avg:'}</span>
            <span className="font-bold text-slate-700 dark:text-neutral-300">{formatCurrency(annualAggregates.avgMonthlyIncome)}</span>
          </div>
        </div>

        {/* Card 3: Gastos Anuales */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-neutral-400 mb-0.5">
              <span className="font-semibold">{language === 'es' ? 'Gastos Anuales' : 'Total Expenses'}</span>
              <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-xs sm:text-xl lg:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums my-0.5">
              {formatCurrency(annualAggregates.totalAnnualExpense)}
            </div>
          </div>
          <div className="pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-neutral-800 text-[8px] sm:text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Deudas+Tarjetas:' : 'Loans+Cards:'}</span>
            <span className="font-bold text-slate-700 dark:text-neutral-300">{formatCurrency(annualAggregates.totalAnnualLoanPayments + annualAggregates.totalAnnualCards)}</span>
          </div>
        </div>

        {/* Card 4: Flujo Neto */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-neutral-400 mb-0.5">
              <span className="font-semibold">{language === 'es' ? 'Flujo Neto Operativo' : 'Net Savings'}</span>
              {annualAggregates.deficitCount === 0 ? (
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 dark:text-rose-400" />
              )}
            </div>
            <div className={`text-xs sm:text-xl lg:text-2xl font-black tracking-tight tabular-nums my-0.5 ${annualAggregates.annualNetSavings >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {annualAggregates.annualNetSavings >= 0 ? '+' : ''}{formatCurrency(annualAggregates.annualNetSavings)}
            </div>
          </div>
          <div className="pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-neutral-800 text-[8px] sm:text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Tasa Ahorro:' : 'Savings:'} <strong className="text-slate-700 dark:text-neutral-300">{annualAggregates.savingsRate.toFixed(1)}%</strong></span>
            <span className="font-semibold text-slate-700 dark:text-neutral-300">
              {annualAggregates.solventCount}/12 {language === 'es' ? 'solventes' : 'solvent'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Visualizador Gráfico de 12 Meses */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {language === 'es' ? 'Curva de Tesorería y Solvencia Mes a Mes' : 'Monthly Solvency & Treasury Curve'}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400">
              {language === 'es' 
                ? 'Monitorea el saldo final proyectado al cierre de cada mes.'
                : 'Track projected closing balance for each month.'}
            </p>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-slate-600 dark:text-neutral-400">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-emerald-500"></span>
              <span>{language === 'es' ? 'Positivo' : 'Positive'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-rose-500"></span>
              <span>{language === 'es' ? 'Déficit' : 'Deficit'}</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras con scroll horizontal suave */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
          <div className="min-w-[620px] grid grid-cols-12 gap-1.5 pt-4 pb-1">
            {monthlyMetrics.map((m) => {
              const balance = m.totals.endOfMonthTotal;
              const isPositive = balance >= 0;
              const heightPct = Math.min(100, Math.max(12, (Math.abs(balance) / maxBarValue) * 100));
              const isSelected = selectedChartMonth === m.month;

              return (
                <div
                  key={m.month}
                  onClick={() => setSelectedChartMonth(isSelected ? null : m.month)}
                  className={`flex flex-col items-center justify-end h-36 sm:h-40 p-1 rounded-lg border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-neutral-800/80 border-emerald-500 ring-1 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-neutral-950/60 hover:bg-slate-100 dark:hover:bg-neutral-800/50 border-slate-200 dark:border-neutral-800'
                  }`}
                  title={`${m.name}: ${formatCurrency(balance)}`}
                >
                  {/* Monto */}
                  <span className={`text-[9px] font-bold tabular-nums mb-1 truncate max-w-full text-center ${
                    isPositive ? 'text-slate-700 dark:text-neutral-200' : 'text-rose-600 dark:text-rose-400 font-black'
                  }`}>
                    {formatCurrency(balance)}
                  </span>

                  {/* Barra */}
                  <div className="w-full h-20 flex items-end justify-center px-0.5">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[22px] rounded-t transition-all duration-300 ${
                        isPositive 
                          ? 'bg-emerald-500 dark:bg-emerald-400' 
                          : 'bg-rose-500 dark:bg-rose-500'
                      }`}
                    />
                  </div>

                  {/* Diagnóstico con dot */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      m.solvency === 'solvent'
                        ? 'bg-emerald-500'
                        : m.solvency === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`} />
                    <span className="text-[9px] font-bold uppercase tracking-tight text-slate-500 dark:text-neutral-400">
                      {m.name.slice(0, 3)}
                    </span>
                  </div>

                  <span className={`text-[8px] tabular-nums font-semibold ${
                    m.netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {m.netFlow >= 0 ? '+' : ''}{formatCurrency(m.netFlow).split('.')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Snapshot Mes Seleccionado */}
        {activeFocusMonth && (
          <div className="bg-slate-50 dark:bg-neutral-950 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                {activeFocusMonth.name.slice(0, 3)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{activeFocusMonth.name} ({year})</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                    activeFocusMonth.solvency === 'solvent'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                      : activeFocusMonth.solvency === 'warning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                  }`}>
                    {activeFocusMonth.solvencyLabel}
                  </span>
                </h4>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <span>{language === 'es' ? 'Saldo Fin Mes:' : 'Close:'} <strong className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(activeFocusMonth.totals.endOfMonthTotal)}</strong></span>
                  <span>·</span>
                  <span>{language === 'es' ? 'Flujo Neto:' : 'Net:'} <strong className="tabular-nums">{activeFocusMonth.netFlow >= 0 ? '+' : ''}{formatCurrency(activeFocusMonth.netFlow)}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectMonthAndNavigate(activeFocusMonth.month)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-2xs cursor-pointer"
            >
              <span>{language === 'es' ? `Ver ${activeFocusMonth.name}` : `Open ${activeFocusMonth.name}`}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabla Matriz Comparativa de los 12 Meses */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl sm:rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {language === 'es' ? 'Matriz Comparativa de los 12 Meses' : '12-Month Comparative Financial Matrix'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-neutral-400">
              {language === 'es' 
                ? 'Indicadores del año mes a mes.'
                : 'Annual month-by-month indicators.'}
            </p>
          </div>

          {/* Filtros: Botones Segmentados (Todos | Solventes | Déficit) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-950 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-800 text-xs self-start sm:self-auto overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setTableFilter('all')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] sm:text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                tableFilter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'es' ? 'Todos (12)' : 'All (12)'}
            </button>
            <button
              type="button"
              onClick={() => setTableFilter('solvent')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] sm:text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                tableFilter === 'solvent'
                  ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'es' ? `Solventes (${annualAggregates.solventCount})` : `Solvent (${annualAggregates.solventCount})`}
            </button>
            {annualAggregates.deficitCount > 0 && (
              <button
                type="button"
                onClick={() => setTableFilter('deficit')}
                className={`px-2 py-0.5 rounded-md font-semibold text-[10px] sm:text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  tableFilter === 'deficit'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                {language === 'es' ? `Déficit (${annualAggregates.deficitCount})` : `Deficit (${annualAggregates.deficitCount})`}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-neutral-950/80 border-b border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2 px-2.5 text-center">#</th>
                <th className="py-2 px-2.5">{language === 'es' ? 'Mes' : 'Month'}</th>
                <th className="py-2 px-2.5 text-right">{language === 'es' ? 'Saldo Inicial' : 'Start'}</th>
                <th className="py-2 px-2.5 text-right text-emerald-600 dark:text-emerald-400">{language === 'es' ? 'Ingresos (+)' : 'Income (+)'}</th>
                <th className="py-2 px-2.5 text-right text-rose-600 dark:text-rose-400">{language === 'es' ? 'Gastos (-)' : 'Expenses (-)'}</th>
                <th className="py-2 px-2.5 text-right">{language === 'es' ? 'Flujo Neto' : 'Net Flow'}</th>
                <th className="py-2 px-2.5 text-right font-black">{language === 'es' ? 'Saldo Fin Mes' : 'End Month'}</th>
                <th className="py-2 px-2.5 text-right text-slate-500 dark:text-neutral-400">{language === 'es' ? 'Dinero Real' : 'Actual Bank'}</th>
                <th className="py-2 px-2.5 text-right">{language === 'es' ? 'Deudas/Tarjetas' : 'Debts/Cards'}</th>
                <th className="py-2 px-2.5 text-center">{language === 'es' ? 'Solvencia' : 'Solvency'}</th>
                <th className="py-2 px-2.5 text-center">{language === 'es' ? 'Acción' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
              {monthlyMetrics
                .filter(m => {
                  if (tableFilter === 'solvent') return m.solvency !== 'deficit';
                  if (tableFilter === 'deficit') return m.solvency === 'deficit';
                  return true;
                })
                .map((m) => {
                const isDeficit = m.totals.endOfMonthTotal < 0;
                return (
                  <tr 
                    key={m.month}
                    className={`hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors ${
                      isDeficit ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="py-2 px-2.5 text-center text-slate-400 dark:text-neutral-500 font-medium tabular-nums text-[11px]">
                      {m.month + 1}
                    </td>
                    <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                      <div className="flex items-center gap-1">
                        <span>{m.name}</span>
                        {m.hasActivity && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Mes con actividad activa" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums text-slate-600 dark:text-neutral-300 font-medium text-xs">
                      {formatCurrency(m.totals.accumulated)}
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                      +{formatCurrency(m.totals.totalIncome)}
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400 text-xs">
                      -{formatCurrency(m.totals.totalExpense)}
                    </td>
                    <td className={`py-2 px-2.5 text-right tabular-nums font-bold text-xs ${
                      m.netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {m.netFlow >= 0 ? '+' : ''}{formatCurrency(m.netFlow)}
                    </td>
                    <td className={`py-2 px-2.5 text-right tabular-nums font-black text-xs ${
                      isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {formatCurrency(m.totals.endOfMonthTotal)}
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums text-slate-500 dark:text-neutral-400 text-xs">
                      {formatCurrency(m.totals.totalActual)}
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums text-slate-600 dark:text-neutral-400 text-xs">
                      {formatCurrency(m.totalLoanPayments + m.totalCards)}
                    </td>
                    <td className="py-2 px-2.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                        m.solvency === 'solvent'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                          : m.solvency === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                      }`}>
                        {m.solvency === 'solvent' ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        ) : m.solvency === 'warning' ? (
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{m.solvencyLabel}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <button
                        onClick={() => onSelectMonthAndNavigate(m.month)}
                        className="p-1 px-2 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
                        title={language === 'es' ? `Abrir ${m.name}` : `Open ${m.name}`}
                      >
                        {language === 'es' ? 'Ver' : 'Open'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totales Anuales Footer */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-neutral-950 font-bold border-t-2 border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white text-xs">
                <td colSpan={2} className="py-2 px-2.5 text-right uppercase tracking-wider text-[10px] sm:text-[11px]">
                  {language === 'es' ? 'Totales:' : 'Totals:'}
                </td>
                <td className="py-2 px-2.5 text-right tabular-nums text-slate-500 text-xs">
                  -
                </td>
                <td className="py-2 px-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 text-xs">
                  +{formatCurrency(annualAggregates.totalAnnualIncome)}
                </td>
                <td className="py-2 px-2.5 text-right tabular-nums text-rose-600 dark:text-rose-400 text-xs">
                  -{formatCurrency(annualAggregates.totalAnnualExpense)}
                </td>
                <td className={`py-2 px-2.5 text-right tabular-nums font-black text-xs ${
                  annualAggregates.annualNetSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {annualAggregates.annualNetSavings >= 0 ? '+' : ''}{formatCurrency(annualAggregates.annualNetSavings)}
                </td>
                <td className="py-2 px-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white text-xs">
                  {formatCurrency(annualAggregates.endOfYearBalance)}
                </td>
                <td className="py-2 px-2.5 text-right tabular-nums text-slate-500 dark:text-neutral-400 text-xs">
                  {formatCurrency(annualAggregates.totalAnnualActual)}
                </td>
                <td className="py-2 px-2.5 text-right tabular-nums text-slate-600 dark:text-neutral-400 text-xs">
                  {formatCurrency(annualAggregates.totalAnnualLoanPayments + annualAggregates.totalAnnualCards)}
                </td>
                <td colSpan={2} className="py-2 px-2.5 text-center text-[10px] text-slate-500">
                  {annualAggregates.solventCount}/12
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Dos Paneles Inferiores: Diagnóstico y Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Panel Izquierdo: Diagnóstico */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {language === 'es' ? 'Diagnóstico Anual de Solvencia' : 'Annual Solvency Diagnostic'}
              </h3>
            </div>

            <div className="flex flex-col gap-2 text-xs mt-2">
              {/* Punto 1 */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-neutral-200 text-xs">
                    {language === 'es' ? 'Punto de Menor Liquidez:' : 'Lowest Liquidity:'} {annualAggregates.lowestBalanceMonth?.name}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' 
                      ? `${annualAggregates.lowestBalanceMonth?.name} proyecta un saldo de ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}.`
                      : `${annualAggregates.lowestBalanceMonth?.name} projects ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}.`}
                  </span>
                </div>
              </div>

              {/* Punto 2 */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 flex items-start gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-neutral-200 text-xs">
                    {language === 'es' ? 'Mayor Superávit:' : 'Peak Month:'} {annualAggregates.highestBalanceMonth?.name}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' 
                      ? `Cierra con ${formatCurrency(annualAggregates.highestBalanceMonth?.totals.endOfMonthTotal || 0)}.`
                      : `Closes at ${formatCurrency(annualAggregates.highestBalanceMonth?.totals.endOfMonthTotal || 0)}.`}
                  </span>
                </div>
              </div>

              {/* Punto 3 */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 flex items-start gap-2">
                <Building2 className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-neutral-200 text-xs">
                    {language === 'es' ? 'Líneas de Crédito:' : 'Credit Line Backing:'} {formatCurrency(totalLiquidity)}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {language === 'es' 
                      ? `${formatCurrency(totalLiquidity)} en líneas disponibles de respaldo.`
                      : `${formatCurrency(totalLiquidity)} available in backup credit lines.`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{language === 'es' ? 'Diagnóstico:' : 'Diagnostic:'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {annualAggregates.deficitCount === 0 
                ? (language === 'es' ? '✓ 100% Solvente en el año' : '✓ 100% Solvent')
                : (language === 'es' ? `⚠️ ${annualAggregates.deficitCount} mes(es) con déficit` : `⚠️ ${annualAggregates.deficitCount} deficit month(s)`)}
            </span>
          </div>
        </div>

        {/* Panel Derecho: Categorías */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {language === 'es' ? 'Desglose Anual por Categorías' : 'Annual Category Distribution'}
              </h3>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {categoryBreakdown.expenses.slice(0, 5).map(item => {
                const pct = annualAggregates.totalAnnualExpense > 0 
                  ? (item.amount / annualAggregates.totalAnnualExpense) * 100 
                  : 0;

                return (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{item.label}</span>
                        <span className="text-[9px] text-slate-400">({item.count})</span>
                      </span>
                      <span className="tabular-nums font-bold text-slate-900 dark:text-white text-xs">
                        {formatCurrency(item.amount)} <span className="text-[9px] text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    {/* Barra */}
                    <div className="w-full h-1 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${pct}%` }} 
                        className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{language === 'es' ? 'Total Egresos:' : 'Total Outflows:'}</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-xs">
              {formatCurrency(annualAggregates.totalAnnualExpense)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
