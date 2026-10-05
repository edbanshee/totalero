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
  CreditCard, 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  PiggyBank, 
  Scale, 
  Layers, 
  ExternalLink,
  Printer,
  FileDown,
  Loader2,
  Check
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

    return {
      startOfYearBalance,
      endOfYearBalance,
      totalAnnualIncome,
      totalAnnualExpense,
      annualNetSavings,
      netCapitalChange,
      capitalChangePct,
      savingsRate,
      avgMonthlyIncome: totalAnnualIncome / 12,
      avgMonthlyExpense: totalAnnualExpense / 12,
      avgMonthlyNetFlow: annualNetSavings / 12,
      totalAnnualActual,
      totalAnnualCards,
      totalAnnualLoanPayments,
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
        `${annualAggregates.solventCount} / 12`
      ]];

      autoTable(doc, {
        startY: 146,
        head: tableHead,
        body: tableBody,
        foot: tableFoot,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.5
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
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 22 },
          1: { fontStyle: 'bold', cellWidth: 70 },
          2: { halign: 'right' },
          3: { halign: 'right', textColor: [5, 150, 105] },
          4: { halign: 'right', textColor: [225, 29, 72] },
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right', fontStyle: 'bold' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          9: { halign: 'center', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: marginX, right: marginX }
      });

      // Pie de página de documento
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Totalero · Flujo de Caja · 2026 · Reporte Ejecutivo Confidencial',
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
      );

      doc.save(`Totalero_Reporte_Anual_${year}.pdf`);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* 1. Header de Control Anual */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'es' ? 'Panorama Financiero Anual' : 'Annual Financial Overview'} · {year}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            {language === 'es' 
              ? 'Comparativa ejecutiva de los 12 meses: proyección de balance, ingresos, gastos y diagnóstico de solvencia.'
              : 'Executive 12-month comparison: balance projection, income, expenses, and solvency diagnostic.'}
          </p>
        </div>

        {/* Selector de Año y Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Volver al Flujo Mensual */}
          {onBackToMonthly && (
            <button
              type="button"
              onClick={onBackToMonthly}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 shadow-xs transition-colors cursor-pointer"
              title={language === 'es' ? 'Volver a la hoja mensual' : 'Back to monthly sheet'}
            >
              <ChevronLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'es' ? 'Volver al Flujo Mensual' : 'Back to Monthly'}</span>
            </button>
          )}

          {/* Controles de año */}
          <div className="flex items-center bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => onYearChange(Math.max(MIN_CATALOG_YEAR, year - 1))}
              disabled={year <= MIN_CATALOG_YEAR}
              title={year > MIN_CATALOG_YEAR ? `${year - 1}` : undefined}
              className="p-1.5 hover:bg-white dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-lg disabled:opacity-25 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{year}</span>
            </div>
            <button
              onClick={() => onYearChange(Math.min(MAX_CATALOG_YEAR, year + 1))}
              disabled={year >= MAX_CATALOG_YEAR}
              title={year < MAX_CATALOG_YEAR ? `${year + 1}` : undefined}
              className="p-1.5 hover:bg-white dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-lg disabled:opacity-25 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Años rápidos */}
          <div className="hidden lg:flex items-center gap-1">
            {quickYears.map(yr => (
              <button
                key={yr}
                onClick={() => onYearChange(yr)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold tabular-nums transition-all ${
                  yr === year
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Botón Descargar PDF / Imprimir */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-neutral-800 bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title={language === 'es' ? 'Descargar reporte anual en PDF' : 'Download annual report in PDF'}
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            ) : pdfSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline">
              {isExportingPdf
                ? (language === 'es' ? 'Generando PDF...' : 'Generating...')
                : pdfSuccess
                  ? (language === 'es' ? '¡PDF Descargado!' : 'PDF Downloaded!')
                  : (language === 'es' ? 'Descargar PDF' : 'Download PDF')}
            </span>
          </button>
        </div>
      </div>

      {/* 1.5 Banner Ejecutivo de Solvencia Anual: "¿Tendré Solvencia en este año?" */}
      <div className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        annualAggregates.deficitCount === 0
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            annualAggregates.deficitCount === 0
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-rose-500 text-white shadow-sm'
          }`}>
            {annualAggregates.deficitCount === 0 ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {annualAggregates.deficitCount === 0
                  ? (language === 'es' ? `✓ Solvencia Garantizada para todo ${year}` : `✓ Full Solvency Confirmed for ${year}`)
                  : (language === 'es' ? `⚠️ Alerta de Solvencia: ${annualAggregates.deficitCount} mes(es) con déficit proyectado` : `⚠️ Solvency Alert: ${annualAggregates.deficitCount} deficit month(s) projected`)
                }
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                annualAggregates.deficitCount === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {annualAggregates.deficitCount === 0 
                  ? (language === 'es' ? '12/12 Meses Solventes' : '12/12 Solvent Months') 
                  : (language === 'es' ? `${annualAggregates.solventCount}/12 Solventes` : `${annualAggregates.solventCount}/12 Solvent`)}
              </span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed max-w-3xl">
              {annualAggregates.deficitCount === 0
                ? (language === 'es' 
                    ? `Todos los meses del año concluyen con saldo a favor. Tu saldo final proyectado a diciembre es de ${formatCurrency(annualAggregates.endOfYearBalance)}, habiendo generado un ahorro neto de ${formatCurrency(annualAggregates.annualNetSavings)} con una tasa de ahorro del ${annualAggregates.savingsRate.toFixed(1)}%. Tu mes más vulnerable es ${annualAggregates.lowestBalanceMonth?.name} con ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}.`
                    : `Every month of the year projects a positive closing balance. Projected December closing balance is ${formatCurrency(annualAggregates.endOfYearBalance)}, accumulating ${formatCurrency(annualAggregates.annualNetSavings)} in net savings with a ${annualAggregates.savingsRate.toFixed(1)}% savings rate. Your tightest month is ${annualAggregates.lowestBalanceMonth?.name} at ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}.`)
                : (language === 'es'
                    ? `Se detectaron meses que cierran en negativo (punto crítico en ${annualAggregates.lowestBalanceMonth?.name} con saldo proyectado de ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). Cuentas con una bolsa de crédito disponible de ${formatCurrency(totalLiquidity)}, ${totalLiquidity >= Math.abs(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0) ? 'suficiente para cubrir la brecha temporal mediante financiamiento sin descapitalizarte.' : 'lo cual requiere programar líneas adicionales o diferir pagos.'}`
                    : `Some months close in negative balance (critical lowest month is ${annualAggregates.lowestBalanceMonth?.name} at ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}). You have ${formatCurrency(totalLiquidity)} in available credit backing, ${totalLiquidity >= Math.abs(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0) ? 'sufficient to bridge cash shortfalls without insolvency.' : 'which requires securing further liquidity or deferring outlays.'}`)}
            </p>
          </div>
        </div>

        {/* Cifras de Respaldo Inmediatas */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xs p-3 rounded-xl border border-current/20">
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-neutral-400">
              {language === 'es' ? 'Bolsa de Préstamos' : 'Credit Backing'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(totalLiquidity)}
            </span>
          </div>
          <div className="w-px h-7 bg-current/20" />
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-neutral-400">
              {language === 'es' ? 'Saldo Cierre Dic' : 'Dec Closing'}
            </span>
            <span className={`text-sm font-black tabular-nums ${annualAggregates.endOfYearBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(annualAggregates.endOfYearBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas Maestras de KPIs Anuales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Saldo de Cierre Anual Proyectado */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1">
              <span className="font-semibold">{language === 'es' ? 'Saldo de Cierre Anual' : 'Annual Closing Balance'}</span>
              <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums my-1">
              {formatCurrency(annualAggregates.endOfYearBalance)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Inicio en Ene:' : 'Jan Start:'} <strong className="text-slate-700 dark:text-neutral-300">{formatCurrency(annualAggregates.startOfYearBalance)}</strong></span>
            <span className={`font-bold flex items-center gap-0.5 ${annualAggregates.netCapitalChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {annualAggregates.netCapitalChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {annualAggregates.netCapitalChange >= 0 ? '+' : ''}{formatCurrency(annualAggregates.netCapitalChange)}
            </span>
          </div>
        </div>

        {/* Card 2: Ingresos Totales del Año */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1">
              <span className="font-semibold">{language === 'es' ? 'Ingresos Anuales' : 'Total Annual Income'}</span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums my-1">
              {formatCurrency(annualAggregates.totalAnnualIncome)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Promedio mensual:' : 'Monthly average:'}</span>
            <span className="font-bold text-slate-700 dark:text-neutral-300">{formatCurrency(annualAggregates.avgMonthlyIncome)}</span>
          </div>
        </div>

        {/* Card 3: Gastos Totales del Año */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1">
              <span className="font-semibold">{language === 'es' ? 'Gastos Anuales' : 'Total Annual Expenses'}</span>
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums my-1">
              {formatCurrency(annualAggregates.totalAnnualExpense)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Deudas + Tarjetas:' : 'Loans + Cards:'}</span>
            <span className="font-bold text-slate-700 dark:text-neutral-300">{formatCurrency(annualAggregates.totalAnnualLoanPayments + annualAggregates.totalAnnualCards)}</span>
          </div>
        </div>

        {/* Card 4: Flujo Operativo Neto y Solvencia */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1">
              <span className="font-semibold">{language === 'es' ? 'Flujo Neto Operativo' : 'Net Annual Savings'}</span>
              {annualAggregates.deficitCount === 0 ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
            </div>
            <div className={`text-2xl font-black tracking-tight tabular-nums my-1 ${annualAggregates.annualNetSavings >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {annualAggregates.annualNetSavings >= 0 ? '+' : ''}{formatCurrency(annualAggregates.annualNetSavings)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
            <span>{language === 'es' ? 'Tasa de Ahorro:' : 'Savings Rate:'} <strong className="text-slate-700 dark:text-neutral-300">{annualAggregates.savingsRate.toFixed(1)}%</strong></span>
            <span className="font-semibold text-slate-700 dark:text-neutral-300">
              {annualAggregates.solventCount}/12 {language === 'es' ? 'solventes' : 'solvent'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Visualizador de Trayectoria y Comparador Gráfico de 12 Meses */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'es' ? 'Curva de Tesorería y Solvencia Mes a Mes' : 'Monthly Solvency & Treasury Curve'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              {language === 'es' 
                ? 'Monitorea el saldo final proyectado al cierre de cada mes e identifica los meses críticos antes de que ocurran.'
                : 'Track the projected end-of-month balance and identify critical deficit months in advance.'}
            </p>
          </div>

          {/* Leyenda Visual */}
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-neutral-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
              <span>{language === 'es' ? 'Saldo Positivo' : 'Positive Balance'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
              <span>{language === 'es' ? 'Déficit Proyectado' : 'Deficit'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{language === 'es' ? 'Solvente' : 'Solvent'}</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras Relativas */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[720px] grid grid-cols-12 gap-2 pt-6 pb-2">
            {monthlyMetrics.map((m) => {
              const balance = m.totals.endOfMonthTotal;
              const isPositive = balance >= 0;
              const heightPct = Math.min(100, Math.max(12, (Math.abs(balance) / maxBarValue) * 100));
              const isSelected = selectedChartMonth === m.month;

              return (
                <div
                  key={m.month}
                  onClick={() => setSelectedChartMonth(isSelected ? null : m.month)}
                  className={`flex flex-col items-center justify-end h-44 p-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-neutral-800/80 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-neutral-950/60 hover:bg-slate-100 dark:hover:bg-neutral-800/50 border-slate-200 dark:border-neutral-800'
                  }`}
                  title={`${m.name}: Saldo fin de mes ${formatCurrency(balance)}`}
                >
                  {/* Monto Fin de Mes */}
                  <span className={`text-[10px] font-bold tabular-nums mb-1 truncate max-w-full text-center ${
                    isPositive ? 'text-slate-700 dark:text-neutral-200' : 'text-rose-600 dark:text-rose-400 font-black'
                  }`}>
                    {formatCurrency(balance)}
                  </span>

                  {/* Barra Visual */}
                  <div className="w-full h-24 flex items-end justify-center px-1">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                        isPositive 
                          ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                          : 'bg-rose-500 dark:bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                      }`}
                    />
                  </div>

                  {/* Diagnóstico de Solvencia con Dot */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      m.solvency === 'solvent'
                        ? 'bg-emerald-500'
                        : m.solvency === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:text-neutral-400">
                      {m.name.slice(0, 3)}
                    </span>
                  </div>

                  {/* Mini indicador de flujo neto */}
                  <span className={`text-[9px] tabular-nums font-semibold ${
                    m.netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {m.netFlow >= 0 ? '+' : ''}{formatCurrency(m.netFlow).split('.')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Desplegable de Mes Seleccionado (Snapshot Rápido) */}
        {activeFocusMonth && (
          <div className="bg-slate-50 dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black">
                {activeFocusMonth.name.slice(0, 3)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{activeFocusMonth.name} ({year})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                    activeFocusMonth.solvency === 'solvent'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                      : activeFocusMonth.solvency === 'warning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                  }`}>
                    {activeFocusMonth.solvencyLabel}
                  </span>
                </h4>
                <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                  <span>{language === 'es' ? 'Saldo Fin de Mes:' : 'End of Month:'} <strong className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(activeFocusMonth.totals.endOfMonthTotal)}</strong></span>
                  <span>·</span>
                  <span>{language === 'es' ? 'Flujo Neto:' : 'Net Flow:'} <strong className="tabular-nums">{activeFocusMonth.netFlow >= 0 ? '+' : ''}{formatCurrency(activeFocusMonth.netFlow)}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectMonthAndNavigate(activeFocusMonth.month)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer"
            >
              <span>{language === 'es' ? `Ver hoja de cálculo de ${activeFocusMonth.name}` : `Open ${activeFocusMonth.name} sheet`}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabla Matriz Comparativa de los 12 Meses */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'es' ? 'Matriz Comparativa de los 12 Meses' : '12-Month Comparative Financial Matrix'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              {language === 'es' 
                ? 'Todos los indicadores del año fila por fila con acceso directo a cada mes.'
                : 'All annual indicators row-by-row with direct access to each month.'}
            </p>
          </div>

          {/* Filtros Rápidos de la Tabla Matriz */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-950 p-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTableFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                tableFilter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'es' ? 'Todos (12)' : 'All (12)'}
            </button>
            <button
              type="button"
              onClick={() => setTableFilter('solvent')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                tableFilter === 'solvent'
                  ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'es' ? `Solventes (${annualAggregates.solventCount})` : `Solvent (${annualAggregates.solventCount})`}
            </button>
            {annualAggregates.deficitCount > 0 && (
              <button
                type="button"
                onClick={() => setTableFilter('deficit')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  tableFilter === 'deficit'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                {language === 'es' ? `Déficit (${annualAggregates.deficitCount})` : `Deficit (${annualAggregates.deficitCount})`}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-neutral-950/80 border-b border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 text-center">#</th>
                <th className="py-3 px-3.5">{language === 'es' ? 'Mes' : 'Month'}</th>
                <th className="py-3 px-3.5 text-right">{language === 'es' ? 'Saldo Inicial' : 'Start Balance'}</th>
                <th className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400">{language === 'es' ? 'Ingresos (+)' : 'Income (+)'}</th>
                <th className="py-3 px-3.5 text-right text-rose-600 dark:text-rose-400">{language === 'es' ? 'Gastos (-)' : 'Expenses (-)'}</th>
                <th className="py-3 px-3.5 text-right">{language === 'es' ? 'Flujo Neto' : 'Net Cash Flow'}</th>
                <th className="py-3 px-3.5 text-right font-black">{language === 'es' ? 'Saldo Fin de Mes' : 'End of Month'}</th>
                <th className="py-3 px-3.5 text-right text-slate-500 dark:text-neutral-400">{language === 'es' ? 'Dinero Real (✓)' : 'Actual Bank (✓)'}</th>
                <th className="py-3 px-3.5 text-right">{language === 'es' ? 'Deudas/Tarjetas' : 'Debts/Cards'}</th>
                <th className="py-3 px-3.5 text-center">{language === 'es' ? 'Solvencia' : 'Solvency'}</th>
                <th className="py-3 px-3.5 text-center">{language === 'es' ? 'Acción' : 'Action'}</th>
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
                    <td className="py-2.5 px-3.5 text-center text-slate-400 dark:text-neutral-500 font-medium tabular-nums">
                      {m.month + 1}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.hasActivity && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Mes con actividad activa" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums text-slate-600 dark:text-neutral-300 font-medium">
                      {formatCurrency(m.totals.accumulated)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(m.totals.totalIncome)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(m.totals.totalExpense)}
                    </td>
                    <td className={`py-2.5 px-3.5 text-right tabular-nums font-bold ${
                      m.netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {m.netFlow >= 0 ? '+' : ''}{formatCurrency(m.netFlow)}
                    </td>
                    <td className={`py-2.5 px-3.5 text-right tabular-nums font-black ${
                      isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {formatCurrency(m.totals.endOfMonthTotal)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums text-slate-500 dark:text-neutral-400">
                      {formatCurrency(m.totals.totalActual)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums text-slate-600 dark:text-neutral-400">
                      {formatCurrency(m.totalLoanPayments + m.totalCards)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        m.solvency === 'solvent'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                          : m.solvency === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                      }`}>
                        {m.solvency === 'solvent' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : m.solvency === 'warning' ? (
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{m.solvencyLabel}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        onClick={() => onSelectMonthAndNavigate(m.month)}
                        className="p-1 px-2 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
                        title={language === 'es' ? `Abrir flujo de caja de ${m.name}` : `Open ${m.name} cash flow`}
                      >
                        {language === 'es' ? 'Ver Mes' : 'Open'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totales Anuales Footer */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-neutral-950 font-bold border-t-2 border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white">
                <td colSpan={2} className="py-3 px-3.5 text-right uppercase tracking-wider text-[11px]">
                  {language === 'es' ? 'Totales del Año:' : 'Year Totals:'}
                </td>
                <td className="py-3 px-3.5 text-right tabular-nums text-slate-500">
                  -
                </td>
                <td className="py-3 px-3.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(annualAggregates.totalAnnualIncome)}
                </td>
                <td className="py-3 px-3.5 text-right tabular-nums text-rose-600 dark:text-rose-400">
                  -{formatCurrency(annualAggregates.totalAnnualExpense)}
                </td>
                <td className={`py-3 px-3.5 text-right tabular-nums font-black ${
                  annualAggregates.annualNetSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {annualAggregates.annualNetSavings >= 0 ? '+' : ''}{formatCurrency(annualAggregates.annualNetSavings)}
                </td>
                <td className="py-3 px-3.5 text-right tabular-nums font-black text-slate-900 dark:text-white">
                  {formatCurrency(annualAggregates.endOfYearBalance)}
                </td>
                <td className="py-3 px-3.5 text-right tabular-nums text-slate-500 dark:text-neutral-400">
                  {formatCurrency(annualAggregates.totalAnnualActual)}
                </td>
                <td className="py-3 px-3.5 text-right tabular-nums text-slate-600 dark:text-neutral-400">
                  {formatCurrency(annualAggregates.totalAnnualLoanPayments + annualAggregates.totalAnnualCards)}
                </td>
                <td colSpan={2} className="py-3 px-3.5 text-center text-[11px] text-slate-500">
                  {annualAggregates.solventCount} / 12 {language === 'es' ? 'meses solventes' : 'solvent months'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Dos Paneles Inferiores: Diagnóstico y Distribución por Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel Izquierdo: Diagnóstico Inteligente y Puntos Clave del Año */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'es' ? 'Diagnóstico Anual de Solvencia' : 'Annual Solvency Diagnostic'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mb-4">
              {language === 'es' 
                ? 'Lectura ejecutiva de tu perfil financiero y puntos de liquidez más relevantes para este año.'
                : 'Executive reading of your financial profile and key liquidity milestones for this year.'}
            </p>

            <div className="flex flex-col gap-3 text-xs">
              
              {/* Punto 1: Mes más vulnerable */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-800 dark:text-neutral-200">
                    {language === 'es' ? 'Punto de Menor Liquidez del Año:' : 'Lowest Liquidity Month:'} {annualAggregates.lowestBalanceMonth?.name}
                  </span>
                  <span className="text-slate-500 dark:text-neutral-400">
                    {language === 'es' 
                      ? `El mes con saldo más ajustado es ${annualAggregates.lowestBalanceMonth?.name} con un balance proyectado de ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}.`
                      : `The tightest month is ${annualAggregates.lowestBalanceMonth?.name} projecting a balance of ${formatCurrency(annualAggregates.lowestBalanceMonth?.totals.endOfMonthTotal || 0)}.`}
                  </span>
                </div>
              </div>

              {/* Punto 2: Mes de mayor crecimiento */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-800 dark:text-neutral-200">
                    {language === 'es' ? 'Mes de Mayor Superávit:' : 'Peak Month:'} {annualAggregates.highestBalanceMonth?.name}
                  </span>
                  <span className="text-slate-500 dark:text-neutral-400">
                    {language === 'es' 
                      ? `Cierra con ${formatCurrency(annualAggregates.highestBalanceMonth?.totals.endOfMonthTotal || 0)}, consolidando tu mayor reserva de capital.`
                      : `Closes at ${formatCurrency(annualAggregates.highestBalanceMonth?.totals.endOfMonthTotal || 0)}, consolidating your biggest capital reserve.`}
                  </span>
                </div>
              </div>

              {/* Punto 3: Respaldo de Crédito */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-200 dark:border-neutral-800 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-800 dark:text-neutral-200">
                    {language === 'es' ? 'Bolsa de Liquidez en Préstamos:' : 'Credit Line Backing:'} {formatCurrency(totalLiquidity)}
                  </span>
                  <span className="text-slate-500 dark:text-neutral-400">
                    {language === 'es' 
                      ? `Cuentas con ${formatCurrency(totalLiquidity)} en líneas de crédito disponibles para solventar cualquier eventualidad en meses con saldo ajustado.`
                      : `You have ${formatCurrency(totalLiquidity)} in available credit lines to absorb unexpected expenses during tight months.`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500">
            <span>{language === 'es' ? 'Diagnóstico global:' : 'Global diagnostic:'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {annualAggregates.deficitCount === 0 
                ? (language === 'es' ? '✓ 100% Solvente durante todo el año' : '✓ 100% Solvent across entire year')
                : (language === 'es' ? `⚠️ ${annualAggregates.deficitCount} mes(es) requieren financiamiento` : `⚠️ ${annualAggregates.deficitCount} month(s) project deficit`)}
            </span>
          </div>
        </div>

        {/* Panel Derecho: Desglose Anual por Categorías */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'es' ? 'Desglose Anual por Categorías' : 'Annual Category Distribution'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mb-4">
              {language === 'es' 
                ? 'Distribución consolidada de todos tus egresos presupuestados durante el año.'
                : 'Consolidated breakdown of your expenses across all categories for the year.'}
            </p>

            <div className="flex flex-col gap-3">
              {categoryBreakdown.expenses.slice(0, 6).map(item => {
                const pct = annualAggregates.totalAnnualExpense > 0 
                  ? (item.amount / annualAggregates.totalAnnualExpense) * 100 
                  : 0;

                return (
                  <div key={item.label} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{item.label}</span>
                        <span className="text-[10px] text-slate-400">({item.count} movs)</span>
                      </span>
                      <span className="tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.amount)} <span className="text-[10px] text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
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

          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500">
            <span>{language === 'es' ? 'Total Egresos Anuales:' : 'Total Annual Outflows:'}</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {formatCurrency(annualAggregates.totalAnnualExpense)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
