import React, { useState, useEffect, useMemo } from 'react';
import { 
  MonthData, 
  CreditLine, 
  Transaction, 
  CreditCard, 
  Language, 
  ThemeMode, 
  FilterType, 
  PeriodView,
  UserSession,
  MIN_CATALOG_YEAR,
  MAX_CATALOG_YEAR
} from './types/finance';
import { 
  createInitialSampleMonths, 
  DEFAULT_CREDIT_LINES, 
  createDefaultCreditCards,
  createEmptyMonths,
  countDataStats 
} from './utils/sampleData';
import { 
  computeMonthTotals, 
  cascadeAccumulatedBalances, 
  sanitizeAndDeduplicateMonths,
  getPreviousMonthTotals,
  getDateString,
  clampDayToMonth,
  getDaysInMonth,
  computePayoffAndSavings 
} from './utils/calculations';
import { 
  auth, 
  signOutCloud, 
  loadCloudFinancialData, 
  saveCloudFinancialData, 
  deleteCloudFinancialData,
  testFirestoreConnection 
} from './utils/firebase';
import { 
  purgeLegacyStorageKeys, 
  getLocalSnapshot, 
  saveLocalData, 
  atomicWipeLocal, 
  loadLocalDemoData,
  saveCloudLocalMirror,
  getCloudLocalMirror, 
  CANONICAL_LOCAL_DATA_KEY, 
  CANONICAL_SESSION_KEY 
} from './utils/storageManager';
import { onAuthStateChanged } from 'firebase/auth';
import { MONTH_NAMES } from './utils/translations';

import { Header } from './components/Header';
import { MonthBar } from './components/MonthBar';
import { MetricCards } from './components/MetricCards';
import { CashFlowTable } from './components/CashFlowTable';
import { CreditCardsSection } from './components/CreditCardsSection';
import { LiquidityPoolSection } from './components/LiquidityPoolSection';
import { TransactionModal } from './components/TransactionModal';
import { AmortizationModal } from './components/AmortizationModal';
import { LoanDeleteModal, LoanDeleteAction } from './components/LoanDeleteModal';
import { RecurringDeleteModal, RecurringDeleteAction } from './components/RecurringDeleteModal';
import { SingleDeleteModal } from './components/SingleDeleteModal';
import { LoginGateway } from './components/LoginGateway';
import { BackupModal } from './components/BackupModal';
import { SyncPromptModal } from './components/SyncPromptModal';
import { DangerZoneModal } from './components/DangerZoneModal';

const STORAGE_LOCAL_KEY = CANONICAL_LOCAL_DATA_KEY;
const STORAGE_SESSION_KEY = CANONICAL_SESSION_KEY;

function getInheritedCreditCards(monthsRecord: Record<string, MonthData>, fallbackMonthIndex: number): CreditCard[] {
  for (const m of Object.values(monthsRecord)) {
    if (m.creditCards && m.creditCards.length > 0) {
      return m.creditCards.map(c => ({
        ...c,
        isPaid: false
      }));
    }
  }
  return createDefaultCreditCards(fallbackMonthIndex);
}

// Helper para extraer el identificador base o de serie recurrente aislando prefijos de proyección
export function getTransactionRecurringId(tx: Transaction): string {
  if (tx.recurringGroupId) return tx.recurringGroupId;
  let id = tx.id;
  let prev = '';
  while (id !== prev) {
    prev = id;
    id = id.replace(/^(tx-fwd-(annual-)?\d+-\d+-|tx-rec-\d+-)/, '');
  }
  return id;
}

export default function App() {
  // App Preferences
  const [language, setLanguage] = useState<Language>('es');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('totalero_theme');
        if (saved === 'light' || saved === 'dark') return saved;
      } catch {}
    }
    return 'light';
  });
  const [userSession, setUserSession] = useState<UserSession>({
    isLoggedIn: false,
    userMode: 'local',
    displayName: 'Usuario Local'
  });

  // Financial State (Active workspace)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Enero
  const [months, setMonths] = useState<Record<string, MonthData>>({});
  const [creditLines, setCreditLines] = useState<CreditLine[]>(DEFAULT_CREDIT_LINES);

  // Table Controls
  const [pinAccumulated, setPinAccumulated] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [periodView, setPeriodView] = useState<PeriodView>('month');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isAmortizationOpen, setIsAmortizationOpen] = useState(false);
  const [amortizationTx, setAmortizationTx] = useState<Transaction | null>(null);
  const [deletingLoanTx, setDeletingLoanTx] = useState<Transaction | null>(null);
  const [deletingRecurringTx, setDeletingRecurringTx] = useState<Transaction | null>(null);
  const [deletingSingleTx, setDeletingSingleTx] = useState<Transaction | null>(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  // Sync Prompt Modal (when logging into empty cloud with local data)
  const [isSyncPromptOpen, setIsSyncPromptOpen] = useState(false);
  const [pendingCloudUser, setPendingCloudUser] = useState<{ uid: string; email: string } | null>(null);

  // 1. Initial boot: Test Firestore connection, purge legacy storage, and load session
  useEffect(() => {
    testFirestoreConnection();
    purgeLegacyStorageKeys();

    // Check saved session
    try {
      const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (savedSession) {
        const parsedSession: UserSession = JSON.parse(savedSession);
        if (parsedSession.userMode === 'local' && parsedSession.isLoggedIn) {
          setUserSession(parsedSession);
          // Load local workspace strictly from snapshot
          loadLocalWorkspace();
        }
      }
    } catch (e) {
      console.error('Error loading session:', e);
    }
  }, []);

  // 2. Firebase Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Logged into Google Firebase
        const session: UserSession = {
          isLoggedIn: true,
          userMode: 'cloud',
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario'
        };
        setUserSession(session);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));

        // Load cloud data or trigger sync prompt
        await handleCloudDataResolution(firebaseUser.uid, firebaseUser.email || '');
      } else {
        // If not in firebase, check if in local mode
        const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed.userMode === 'cloud') {
              setUserSession({ isLoggedIn: false, userMode: 'local' });
            }
          } catch (e) {}
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper to load local workspace strictly (never demo fallback on null)
  const loadLocalWorkspace = () => {
    const localSnap = getLocalSnapshot();
    if (localSnap.hasLocalData) {
      const cleanMonths = cascadeAccumulatedBalances(localSnap.months, 2024, 0, language);
      setMonths(cleanMonths);
      setCreditLines(localSnap.creditLines);
      if (localSnap.selectedYear) setSelectedYear(localSnap.selectedYear);
      return;
    }
    // Clean empty template (0 elements)
    const empty = createEmptyMonths(selectedYear);
    setMonths(empty);
    setCreditLines([]);
  };

  // Helper to resolve cloud data when user signs into Google
  const handleCloudDataResolution = async (userId: string, email: string, forceScratch: boolean = false) => {
    try {
      const cloudData = await loadCloudFinancialData(userId);
      const cloudStats = countDataStats(cloudData?.months || {}, cloudData?.creditLines || []);
      const cloudHasData = (cloudStats.transactions + cloudStats.loans + cloudStats.cards + cloudStats.creditLines) > 0;

      if (cloudHasData && !forceScratch) {
        // Cloud has existing data -> use it directly and never prompt
        const cleanMonths = cascadeAccumulatedBalances(cloudData!.months, 2024, 0, language);
        setMonths(cleanMonths);
        setCreditLines(cloudData!.creditLines || []);
        if (cloudData!.selectedYear) setSelectedYear(cloudData!.selectedYear);
        setIsSyncPromptOpen(false);
        setPendingCloudUser(null);
        return;
      }

      // Cloud is empty!
      // Check local storage snapshot (STRICT: no demo fallback)
      const localSnap = getLocalSnapshot();
      const hasLocalData = localSnap.hasLocalData && !forceScratch;

      if (hasLocalData) {
        // Open the Sync Prompt modal with real local stats (> 0 elements)
        setPendingCloudUser({ uid: userId, email });
        setIsSyncPromptOpen(true);
        // Preview local data in state
        const cleanMonths = cascadeAccumulatedBalances(localSnap.months, 2024, 0, language);
        setMonths(cleanMonths);
        setCreditLines(localSnap.creditLines);
        if (localSnap.selectedYear) setSelectedYear(localSnap.selectedYear);
      } else {
        // BOTH Cloud and Local are empty (0 elements, or user forced scratch)
        // SILENT AND CLEAN INITIALIZATION: No modal, no prompt!
        setIsSyncPromptOpen(false);
        setPendingCloudUser(null);

        const empty = createEmptyMonths(selectedYear);
        setMonths(empty);
        setCreditLines([]);
        await saveCloudFinancialData(userId, email, empty, [], selectedYear);
      }
    } catch (error) {
      console.error('Error resolving cloud data:', error);
      // Offline fallback: check offline mirror for this user first
      const mirror = getCloudLocalMirror(userId);
      if (mirror && Object.keys(mirror.months).length > 0) {
        const cleanMonths = cascadeAccumulatedBalances(mirror.months, 2024, 0, language);
        setMonths(cleanMonths);
        setCreditLines(mirror.creditLines);
        if (mirror.selectedYear) setSelectedYear(mirror.selectedYear);
      } else {
        const localSnap = getLocalSnapshot();
        const baseMonths = localSnap.hasLocalData ? localSnap.months : createEmptyMonths(selectedYear);
        setMonths(cascadeAccumulatedBalances(baseMonths, 2024, 0, language));
        setCreditLines(localSnap.creditLines);
      }
    }
  };

  // 3. Save changes in real time: Local vs Cloud
  useEffect(() => {
    if (Object.keys(months).length === 0) return;

    if (userSession.userMode === 'cloud' && auth.currentUser) {
      // Keep instant local mirror for immediate offline reliability
      saveCloudLocalMirror(auth.currentUser.uid, months, creditLines, selectedYear);

      // Auto-save to Firestore with IndexedDB persistent offline cache (debounced)
      const timer = setTimeout(() => {
        saveCloudFinancialData(
          auth.currentUser!.uid,
          auth.currentUser!.email || '',
          months,
          creditLines,
          selectedYear
        ).catch(err => console.error('Cloud auto-save error:', err));
      }, 800);
      return () => clearTimeout(timer);
    } else if (userSession.userMode === 'local') {
      // Save to localStorage cleanly
      saveLocalData(months, creditLines, selectedYear);
    }
  }, [months, creditLines, selectedYear, userSession.userMode]);

  // 4. Apply dark/light theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // 5. Auto-healing / Sanitization for corrupted or duplicate Acumulado rows
  useEffect(() => {
    if (Object.keys(months).length === 0) return;

    let needsHealing = false;
    for (const [key, mData] of Object.entries(months)) {
      if (!mData?.transactions) continue;
      const parts = key.split('-');
      const m = Number(parts[1]);
      const accList = mData.transactions.filter(t => t.isAutoAccumulated || t.concept.trim().toLowerCase() === 'acumulado');
      if (accList.length > 1) {
        needsHealing = true;
        break;
      }
      // Checar si hay algún acumulado con fecha que no corresponde a este mes (ej: 01-oct en agosto)
      const stray = accList.find(t => t.dateString && !t.dateString.includes(getDateString(1, m, 'es').split('-')[1]) && !t.dateString.includes(getDateString(1, m, 'en').split('-')[1]));
      if (stray) {
        needsHealing = true;
        break;
      }
    }

    if (needsHealing) {
      setMonths(prev => cascadeAccumulatedBalances(prev, 2024, 0, language));
    }
  }, [months, language]);

  // Sincronización del catálogo de tarjetas de crédito en todos los meses:
  // Todas las tarjetas aparecen en todos los meses; el estado isPaid es independiente para cada mes.
  useEffect(() => {
    if (Object.keys(months).length === 0) return;

    const cardMap = new Map<string, CreditCard>();
    Object.values(months).forEach(m => {
      (m.creditCards || []).forEach(c => {
        if (!cardMap.has(c.id)) {
          cardMap.set(c.id, c);
        }
      });
    });

    if (cardMap.size === 0) return;
    const allCards = Array.from(cardMap.values());

    let needsSync = false;
    for (const m of Object.values(months)) {
      const currentList = m.creditCards || [];
      if (currentList.length !== allCards.length) {
        needsSync = true;
        break;
      }
      for (const baseCard of allCards) {
        const found = currentList.find(c => c.id === baseCard.id);
        if (!found || found.name !== baseCard.name || found.payDay !== baseCard.payDay || found.cutDay !== baseCard.cutDay || found.cutMonthOffset !== baseCard.cutMonthOffset || found.payMonthOffset !== baseCard.payMonthOffset) {
          needsSync = true;
          break;
        }
      }
      if (needsSync) break;
    }

    if (needsSync) {
      setMonths(prev => {
        const updated: Record<string, MonthData> = {};
        Object.entries(prev).forEach(([key, m]) => {
          const currentList = m.creditCards || [];
          const updatedCards = allCards.map(baseCard => {
            const existing = currentList.find(c => c.id === baseCard.id);
            if (existing) {
              return {
                ...baseCard,
                amount: existing.amount !== undefined ? existing.amount : baseCard.amount,
                isPaid: existing.isPaid // Estado independiente por mes
              };
            }
            return {
              ...baseCard,
              isPaid: false // Estado independiente por mes
            };
          });
          updated[key] = {
            ...m,
            creditCards: updatedCards
          };
        });
        return updated;
      });
    }
  }, [months]);

  // Active month data
  const currentKey = `${selectedYear}-${selectedMonth}`;
  const currentMonthData = months[currentKey] || {
    year: selectedYear,
    month: selectedMonth,
    transactions: [],
    creditCards: [],
    hasUserActivity: false
  };

  // Totals for active month
  const currentTotals = useMemo(() => {
    return computeMonthTotals(currentMonthData.transactions);
  }, [currentMonthData.transactions]);

  // Total available liquidity from credit lines
  const totalLiquidity = useMemo(() => {
    return creditLines.reduce((acc, line) => acc + (line.availableAmount || 0), 0);
  }, [creditLines]);

  // Stats in current memory
  const memoryStats = useMemo(() => {
    return countDataStats(months, creditLines);
  }, [months, creditLines]);

  // Local storage stats (for sync prompt)
  const localStats = useMemo(() => {
    return getLocalSnapshot().stats;
  }, [isSyncPromptOpen]);

  // Ensure current active month exists with smart lazy carry-forward
  useEffect(() => {
    if (Object.keys(months).length === 0) return;
    if (!months[currentKey]) {
      let prevBalance = 0;
      let lastPopulatedMonthData: MonthData | null = null;

      // 1. Buscar mes previo inmediato (incluso del año anterior si selectedMonth === 0)
      const immediatePrevKey = selectedMonth > 0 
        ? `${selectedYear}-${selectedMonth - 1}` 
        : `${selectedYear - 1}-11`;

      let prevTotals: ReturnType<typeof computeMonthTotals> | null = null;
      if (months[immediatePrevKey]) {
        prevTotals = computeMonthTotals(months[immediatePrevKey].transactions);
        prevBalance = prevTotals.endOfMonthTotal;
        lastPopulatedMonthData = months[immediatePrevKey];
      } else {
        // Buscar el mes anterior más cercano cronológicamente
        const allPrecedingKeys = Object.keys(months).filter(k => {
          const [y, m] = k.split('-').map(Number);
          return y < selectedYear || (y === selectedYear && m < selectedMonth);
        });

        if (allPrecedingKeys.length > 0) {
          allPrecedingKeys.sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            return (yA * 12 + mA) - (yB * 12 + mB);
          });
          const closestKey = allPrecedingKeys[allPrecedingKeys.length - 1];
          prevTotals = computeMonthTotals(months[closestKey].transactions);
          prevBalance = prevTotals.endOfMonthTotal;
          lastPopulatedMonthData = months[closestKey];
        }
      }

      // 2. Fila 1: Acumulado
      const initialAccumulated: Transaction = {
        id: `acc-${selectedYear}-${selectedMonth}`,
        label: 'Neto',
        concept: 'Acumulado',
        amount: prevBalance,
        day: 1,
        dateString: getDateString(1, selectedMonth, language),
        isRecurring: false,
        isDone: prevTotals ? (prevTotals.doneCount > 0 || prevTotals.totalActual !== 0) : false,
        actualAmount: prevTotals ? prevTotals.totalActual : null,
        highlight: 'none',
        isAutoAccumulated: true
      };

      const monthTitle = `${MONTH_NAMES[language][selectedMonth]} (${selectedYear})`;

      // 3. Arrastre de recurrentes continuos del último mes poblado
      const inheritedTransactions: Transaction[] = [initialAccumulated];
      if (lastPopulatedMonthData) {
        lastPopulatedMonthData.transactions.forEach(oldTx => {
          // Solo heredamos transacciones recurrentes continuas (sin préstamos y NUNCA Acumulados)
          if (oldTx.isRecurring && !oldTx.loanDetails && !oldTx.isAutoAccumulated && oldTx.concept.trim().toLowerCase() !== 'acumulado') {
            const cleanBaseId = getTransactionRecurringId(oldTx);
            const baseOriginalDay = oldTx.recurringOriginalDay || oldTx.day;
            const clampedDay = clampDayToMonth(baseOriginalDay, selectedYear, selectedMonth);
            inheritedTransactions.push({
              id: `tx-fwd-${selectedYear}-${selectedMonth}-${cleanBaseId}`,
              recurringGroupId: oldTx.recurringGroupId || cleanBaseId,
              recurringOriginalDay: baseOriginalDay,
              label: oldTx.label,
              concept: oldTx.concept,
              amount: oldTx.amount,
              day: clampedDay,
              dateString: getDateString(clampedDay, selectedMonth, language, selectedYear),
              isRecurring: true,
              recurrenceFrequency: oldTx.recurrenceFrequency || 'monthly',
              isDone: false,
              actualAmount: null,
              highlight: oldTx.highlight
            });
          }
        });
      }

      setMonths(prev => ({
        ...prev,
        [currentKey]: {
          year: selectedYear,
          month: selectedMonth,
          title: monthTitle,
          transactions: inheritedTransactions,
          creditCards: getInheritedCreditCards(prev, selectedMonth),
          hasUserActivity: false
        }
      }));
    }
  }, [selectedYear, selectedMonth, months, language]);

  // UI Handlers
  const handleLanguageToggle = () => {
    setLanguage(prev => (prev === 'es' ? 'en' : 'es'));
  };

  const handleThemeToggle = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('totalero_theme', next);
      } catch {}
      return next;
    });
  };

  // Navegación mensual y anual mediante flechas laterales
  const handlePrevMonth = () => {
    if (selectedMonth > 0) {
      setSelectedMonth(prev => prev - 1);
    } else if (selectedYear > MIN_CATALOG_YEAR) {
      setSelectedYear(prev => prev - 1);
      setSelectedMonth(11);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth < 11) {
      setSelectedMonth(prev => prev + 1);
    } else if (selectedYear < MAX_CATALOG_YEAR) {
      setSelectedYear(prev => prev + 1);
      setSelectedMonth(0);
    }
  };

  // Login Local
  const handleLoginLocal = (startFromScratch: boolean) => {
    const session: UserSession = {
      isLoggedIn: true,
      userMode: 'local',
      displayName: 'Usuario Local'
    };
    setUserSession(session);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));

    if (startFromScratch) {
      // Iniciar de cero: vacía transacciones, tarjetas y líneas de crédito de forma atómica
      const empty = atomicWipeLocal(selectedYear);
      setMonths(empty);
      setCreditLines([]);
    } else {
      // Cargar local existente o datos de muestra si es primer uso
      const snap = getLocalSnapshot();
      if (snap.hasLocalData) {
        setMonths(snap.months);
        setCreditLines(snap.creditLines);
        if (snap.selectedYear) setSelectedYear(snap.selectedYear);
      } else {
        const demo = loadLocalDemoData(selectedYear);
        setMonths(demo.months);
        setCreditLines(demo.creditLines);
      }
    }
  };

  // Login Cloud Success callback
  const handleLoginCloudSuccess = (session: UserSession, startFromScratch: boolean) => {
    setUserSession(session);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    if (auth.currentUser) {
      handleCloudDataResolution(auth.currentUser.uid, auth.currentUser.email || '', startFromScratch);
    }
  };

  // Logout (Problem 4: Leaves local guest data completely intact)
  const handleLogout = async () => {
    if (userSession.userMode === 'cloud') {
      await signOutCloud();
    }
    const loggedOut: UserSession = {
      isLoggedIn: false,
      userMode: 'local'
    };
    setUserSession(loggedOut);
    localStorage.removeItem(STORAGE_SESSION_KEY);

    // Restore guest local workspace completely untouched by the cloud session
    const localSnap = getLocalSnapshot();
    if (localSnap.hasLocalData) {
      setMonths(localSnap.months);
      setCreditLines(localSnap.creditLines);
      if (localSnap.selectedYear) setSelectedYear(localSnap.selectedYear);
    } else {
      const empty = createEmptyMonths(selectedYear);
      setMonths(empty);
      setCreditLines([]);
    }
  };

  // Sincronizar e importar datos locales a la nube (Image 1 - Option 1)
  const handleSyncLocalToCloud = async () => {
    if (!pendingCloudUser) return;
    try {
      const localSnap = getLocalSnapshot();
      const monthsToSync = localSnap.hasLocalData ? localSnap.months : months;
      const linesToSync = localSnap.hasLocalData ? localSnap.creditLines : creditLines;

      setMonths(monthsToSync);
      setCreditLines(linesToSync);

      await saveCloudFinancialData(
        pendingCloudUser.uid,
        pendingCloudUser.email,
        monthsToSync,
        linesToSync,
        selectedYear
      );

      setIsSyncPromptOpen(false);
      setPendingCloudUser(null);
    } catch (err) {
      console.error('Error syncing local to cloud:', err);
    }
  };

  // Iniciar con cuenta limpia en la nube (Image 1 - Option 2)
  const handleStartFreshCloud = async () => {
    if (!pendingCloudUser) return;
    try {
      const empty = createEmptyMonths(selectedYear);
      setMonths(empty);
      setCreditLines([]);

      // Saves empty workspace to cloud - local guest storage remains untouched!
      await saveCloudFinancialData(
        pendingCloudUser.uid,
        pendingCloudUser.email,
        empty,
        [],
        selectedYear
      );

      setIsSyncPromptOpen(false);
      setPendingCloudUser(null);
    } catch (err) {
      console.error('Error starting fresh cloud:', err);
    }
  };

  // Purge data (from Danger Zone Modal - Problem 4: Atomic Wipe)
  const handlePurgeData = async () => {
    const empty = createEmptyMonths(selectedYear);
    setMonths(empty);
    setCreditLines([]);

    if (userSession.userMode === 'cloud' && auth.currentUser) {
      // Cloud mode: wipes user's cloud document ONLY. Local storage is untouched!
      await deleteCloudFinancialData(auth.currentUser.uid);
      await saveCloudFinancialData(auth.currentUser.uid, auth.currentUser.email || '', empty, [], selectedYear);
    } else {
      // Local mode: atomic wipe canonical and legacy keys
      atomicWipeLocal(selectedYear);
    }
  };

  // Load demo data (from Danger Zone Modal)
  const handleLoadDemoData = async () => {
    const demo = createInitialSampleMonths(selectedYear);
    setMonths(demo);
    setCreditLines(DEFAULT_CREDIT_LINES);

    if (userSession.userMode === 'cloud' && auth.currentUser) {
      await saveCloudFinancialData(auth.currentUser.uid, auth.currentUser.email || '', demo, DEFAULT_CREDIT_LINES, selectedYear);
    } else {
      loadLocalDemoData(selectedYear);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const exportPayload = {
      version: '2.0',
      userMode: userSession.userMode,
      exportedAt: new Date().toISOString(),
      months,
      creditLines
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `totalero_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Transaction CRUD & Cascading Carryover
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id'>,
    loanTermAdjustment?: {
      loanId: string;
      oldTerm: number;
      newTerm: number;
      monthlyPayment: number;
      institution: string;
      day: number;
      startMonth: number;
      startYear: number;
    }
  ) => {
    setMonths(prev => {
      let updatedMonths = { ...prev };
      const monthData = updatedMonths[currentKey] || {
        year: selectedYear,
        month: selectedMonth,
        transactions: [],
        creditCards: [],
        hasUserActivity: true
      };

      let txList = [...monthData.transactions];

      const isAccumulated = !!(
        txData.isAutoAccumulated || 
        (editingTx && (editingTx.isAutoAccumulated || editingTx.concept.trim().toLowerCase() === 'acumulado' || editingTx.id.startsWith('acc-'))) ||
        txData.concept.trim().toLowerCase() === 'acumulado'
      );

      const newId = isAccumulated ? `acc-${selectedYear}-${selectedMonth}` : (editingTx ? editingTx.id : `tx-${Date.now()}`);
      const recurringGroupId = txData.isRecurring
        ? (txData.recurringGroupId || editingTx?.recurringGroupId || (editingTx ? getTransactionRecurringId(editingTx) : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`))
        : undefined;

      const loanId = txData.loanDetails
        ? (txData.loanDetails.loanId || editingTx?.loanDetails?.loanId || `loan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`)
        : undefined;

      const baseOriginalDay = txData.recurringOriginalDay || editingTx?.recurringOriginalDay || txData.day;
      const validDay = isAccumulated ? 1 : clampDayToMonth(baseOriginalDay, selectedYear, selectedMonth);

      const newTx: Transaction = {
        ...txData,
        id: newId,
        recurringGroupId,
        recurringOriginalDay: (txData.isRecurring || txData.loanDetails) ? baseOriginalDay : undefined,
        loanDetails: txData.loanDetails ? { ...txData.loanDetails, loanId: loanId! } : undefined,
        label: isAccumulated ? 'Neto' : txData.label,
        concept: isAccumulated ? 'Acumulado' : txData.concept,
        day: validDay,
        dateString: isAccumulated 
          ? getDateString(1, selectedMonth, language, selectedYear) 
          : getDateString(validDay, selectedMonth, language, selectedYear),
        isRecurring: isAccumulated ? false : txData.isRecurring,
        isAutoAccumulated: isAccumulated ? true : undefined,
        hasCustomActual: isAccumulated ? (txData.actualAmount !== null && txData.actualAmount !== undefined) : undefined
      };

      if (isAccumulated) {
        // Encontrar si ya hay un acumulado en txList
        const accIdx = txList.findIndex(t => t.isAutoAccumulated || t.concept.trim().toLowerCase() === 'acumulado' || t.id.startsWith('acc-'));
        if (accIdx >= 0) {
          txList[accIdx] = newTx;
        } else {
          txList.unshift(newTx);
        }
        // Filtrar cualquier duplicado residual
        txList = [newTx, ...txList.filter(t => t.id !== newTx.id && !t.isAutoAccumulated && t.concept.trim().toLowerCase() !== 'acumulado')];
      } else if (editingTx) {
        const index = txList.findIndex(t => t.id === editingTx.id);
        if (index >= 0) {
          txList[index] = newTx;
        } else {
          txList.push(newTx);
        }
      } else {
        txList.push(newTx);
      }

      // MANEJO DE PRÉSTAMOS / DEUDAS: RETROACTIVIDAD (BACKFILL) Y PROYECCIÓN FUTURA
      if (txData.loanDetails) {
        const loan = txData.loanDetails;
        const loanId = loan.loanId || `loan-${Date.now()}`;
        const inst = loan.institutionName.trim();
        const totalMonths = loan.totalTermMonths;
        const currentCuota = loan.currentTermMonth;
        const monthlyPayment = Math.abs(txData.amount);
        const currentInitial = Math.abs(loan.initialDebt);
        const currentFinal = Math.abs(loan.finalDebt);
        const day = txData.day;
        const isReceivable = (loan.loanType === 'receivable') || txData.amount > 0 || txData.label === 'Ingreso';
        const directionalPayment = isReceivable ? monthlyPayment : -monthlyPayment;

        // A) CREACIÓN RETROACTIVA DE CUOTAS ANTERIORES (si se añade a partir de una cuota > 1)
        if (currentCuota > 1) {
          for (let k = currentCuota - 1; k >= 1; k--) {
            const offset = currentCuota - k;
            let prevM = selectedMonth - offset;
            let prevY = selectedYear;
            while (prevM < 0) {
              prevM += 12;
              prevY -= 1;
            }

            const prevKey = `${prevY}-${prevM}`;
            if (!updatedMonths[prevKey]) {
              updatedMonths[prevKey] = {
                year: prevY,
                month: prevM,
                transactions: [],
                creditCards: getInheritedCreditCards(updatedMonths, prevM),
                hasUserActivity: true
              };
            }

            // Cálculo inverso del saldo de la cuota anterior k:
            const kFinalDebt = currentInitial + ((currentCuota - k - 1) * monthlyPayment);
            const kInitialDebt = kFinalDebt + monthlyPayment;

            // Liquidación y ahorro de interés calculados para la cuota k:
            const { payoffAmount: kPayoff, interestSaved: kSavings } = computePayoffAndSavings({
              originalPrincipal: loan.originalPrincipal || 0,
              totalToPay: loan.totalToPay || (monthlyPayment * totalMonths),
              totalTerm: totalMonths,
              currentTerm: k,
              initialDebt: kInitialDebt
            });

            const baseLoanDay = txData.recurringOriginalDay || editingTx?.recurringOriginalDay || day;
            const prevDay = clampDayToMonth(baseLoanDay, prevY, prevM);
            const prevTx: Transaction = {
              id: `tx-backfill-${prevY}-${prevM}-${loanId}-c${k}`,
              label: txData.label,
              concept: `${inst} ${k} de ${totalMonths}`,
              amount: directionalPayment,
              day: prevDay,
              recurringOriginalDay: baseLoanDay,
              dateString: getDateString(prevDay, prevM, language, prevY),
              isRecurring: true,
              isDone: true, // Marcada como cobrada o pagada en el historial
              actualAmount: directionalPayment,
              highlight: txData.highlight,
              loanDetails: {
                ...loan,
                loanId,
                loanType: isReceivable ? 'receivable' : 'payable',
                currentTermMonth: k,
                initialDebt: Math.round(kInitialDebt * 100) / 100,
                finalDebt: Math.round(kFinalDebt * 100) / 100,
                payoffDiscount: kPayoff > 0 ? kPayoff : undefined,
                interestSaved: kSavings > 0 ? kSavings : undefined
              }
            };

            const prevTxList = [...updatedMonths[prevKey].transactions];
            const existingIdx = prevTxList.findIndex(t => 
              t.loanDetails && (t.loanDetails.loanId === loanId || (t.loanDetails.institutionName === inst && t.loanDetails.currentTermMonth === k))
            );

            if (existingIdx >= 0) {
              prevTxList[existingIdx] = prevTx;
            } else {
              prevTxList.push(prevTx);
            }

            updatedMonths[prevKey] = {
              ...updatedMonths[prevKey],
              transactions: prevTxList,
              hasUserActivity: true
            };
          }
        }

        // B) PROYECCIÓN HACIA MESES FUTUROS (cuotas restantes)
        if (currentCuota < totalMonths) {
          for (let j = currentCuota + 1; j <= totalMonths; j++) {
            const offset = j - currentCuota;
            let nextM = selectedMonth + offset;
            let nextY = selectedYear;
            while (nextM >= 12) {
              nextM -= 12;
              nextY += 1;
            }

            const nextKey = `${nextY}-${nextM}`;
            if (!updatedMonths[nextKey]) {
              updatedMonths[nextKey] = {
                year: nextY,
                month: nextM,
                transactions: [],
                creditCards: getInheritedCreditCards(updatedMonths, nextM),
                hasUserActivity: true
              };
            }

            const jInitialDebt = Math.max(0, currentFinal - ((j - currentCuota - 1) * monthlyPayment));
            const jFinalDebt = Math.max(0, jInitialDebt - monthlyPayment);

            // Liquidación y ahorro de interés calculados para la cuota j:
            const { payoffAmount: jPayoff, interestSaved: jSavings } = computePayoffAndSavings({
              originalPrincipal: loan.originalPrincipal || 0,
              totalToPay: loan.totalToPay || (monthlyPayment * totalMonths),
              totalTerm: totalMonths,
              currentTerm: j,
              initialDebt: jInitialDebt
            });

            const baseLoanDay = txData.recurringOriginalDay || editingTx?.recurringOriginalDay || day;
            const fwdDay = clampDayToMonth(baseLoanDay, nextY, nextM);
            const fwdTx: Transaction = {
              id: `tx-fwd-${nextY}-${nextM}-${loanId}-c${j}`,
              label: txData.label,
              concept: `${inst} ${j} de ${totalMonths}`,
              amount: directionalPayment,
              day: fwdDay,
              recurringOriginalDay: baseLoanDay,
              dateString: getDateString(fwdDay, nextM, language, nextY),
              isRecurring: true,
              isDone: false, // Cuota/cobro futuro pendiente
              actualAmount: null,
              highlight: txData.highlight,
              loanDetails: {
                ...loan,
                loanId,
                loanType: isReceivable ? 'receivable' : 'payable',
                currentTermMonth: j,
                initialDebt: Math.round(jInitialDebt * 100) / 100,
                finalDebt: Math.round(jFinalDebt * 100) / 100,
                payoffDiscount: jPayoff > 0 ? jPayoff : undefined,
                interestSaved: jSavings > 0 ? jSavings : undefined
              }
            };

            const nextTxList = [...updatedMonths[nextKey].transactions];
            const existingIdx = nextTxList.findIndex(t => 
              t.loanDetails && (t.loanDetails.loanId === loanId || (t.loanDetails.institutionName === inst && t.loanDetails.currentTermMonth === j))
            );

            if (existingIdx >= 0) {
              nextTxList[existingIdx] = fwdTx;
            } else {
              nextTxList.push(fwdTx);
            }

            updatedMonths[nextKey] = {
              ...updatedMonths[nextKey],
              transactions: nextTxList,
              hasUserActivity: true
            };
          }
        }
      } else if (txData.isRecurring && !isAccumulated) {
        const isAnnual = txData.recurrenceFrequency === 'annual';
        const baseRecurringId = editingTx ? getTransactionRecurringId(editingTx) : newId;

        if (isAnnual) {
          // Si antes era recurrente mensual, limpiar proyecciones mensuales huérfanas en meses distintos
          if (editingTx && editingTx.recurrenceFrequency !== 'annual') {
            Object.keys(updatedMonths).forEach(key => {
              const mData = updatedMonths[key];
              if (mData.year > selectedYear || (mData.year === selectedYear && mData.month !== selectedMonth)) {
                if (mData.month !== selectedMonth) {
                  updatedMonths[key] = {
                    ...mData,
                    transactions: mData.transactions.filter(t => !isMatchingRecurringTx(t, editingTx, false))
                  };
                }
              }
            });
          }

          // Proyección anual: cada año futuro en este mismo mes y día hasta MAX_CATALOG_YEAR (2050)
          for (let nextY = selectedYear + 1; nextY <= MAX_CATALOG_YEAR; nextY++) {
            const nextKey = `${nextY}-${selectedMonth}`;
            if (!updatedMonths[nextKey]) {
              const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              updatedMonths[nextKey] = {
                year: nextY,
                month: selectedMonth,
                title: `${monthNames[selectedMonth]} (${nextY})`,
                transactions: [],
                creditCards: getInheritedCreditCards(updatedMonths, selectedMonth),
                hasUserActivity: true
              };
            }

            const forwardTxList = [...updatedMonths[nextKey].transactions];

            const existingIdx = forwardTxList.findIndex(t => 
              t.id === `tx-fwd-annual-${nextY}-${selectedMonth}-${baseRecurringId}` ||
              t.id === `tx-fwd-${nextY}-${selectedMonth}-${baseRecurringId}` ||
              (editingTx && isMatchingRecurringTx(t, editingTx, false))
            );

            const fwdAnnualDay = clampDayToMonth(baseOriginalDay, nextY, selectedMonth);
            const fwdTx: Transaction = {
              id: `tx-fwd-annual-${nextY}-${selectedMonth}-${baseRecurringId}`,
              recurringGroupId,
              recurringOriginalDay: baseOriginalDay,
              label: txData.label,
              concept: txData.concept,
              amount: txData.amount,
              day: fwdAnnualDay,
              dateString: getDateString(fwdAnnualDay, selectedMonth, language, nextY),
              isRecurring: true,
              recurrenceFrequency: 'annual',
              isDone: false,
              actualAmount: null,
              highlight: txData.highlight
            };

            if (existingIdx >= 0) {
              forwardTxList[existingIdx] = fwdTx;
            } else {
              forwardTxList.push(fwdTx);
            }

            updatedMonths[nextKey] = {
              ...updatedMonths[nextKey],
              transactions: forwardTxList,
              hasUserActivity: true
            };
          }
        } else {
          // Gasto / Ingreso recurrente regular proyectado en los meses futuros (hasta 5 años / 60 meses o MAX_CATALOG_YEAR 2050)
          if (editingTx && editingTx.recurrenceFrequency === 'annual') {
            Object.keys(updatedMonths).forEach(key => {
              const mData = updatedMonths[key];
              if (mData.year > selectedYear) {
                updatedMonths[key] = {
                  ...mData,
                  transactions: mData.transactions.filter(t => !isMatchingRecurringTx(t, editingTx, false))
                };
              }
            });
          }

          const totalMonthsToProject = Math.min(60, (MAX_CATALOG_YEAR - selectedYear) * 12 + (11 - selectedMonth));

          for (let step = 1; step <= totalMonthsToProject; step++) {
            const rawM = selectedMonth + step;
            const nextM = rawM % 12;
            const nextY = selectedYear + Math.floor(rawM / 12);
            if (nextY > MAX_CATALOG_YEAR) break;

            const nextKey = `${nextY}-${nextM}`;
            if (!updatedMonths[nextKey]) {
              const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              updatedMonths[nextKey] = {
                year: nextY,
                month: nextM,
                title: `${monthNames[nextM]} (${nextY})`,
                transactions: [],
                creditCards: getInheritedCreditCards(updatedMonths, nextM),
                hasUserActivity: true
              };
            }

            const forwardTxList = [...updatedMonths[nextKey].transactions];
            
            // Buscar si ya existe la proyección de esta transacción
            const existingIdx = forwardTxList.findIndex(t => 
              t.id === `tx-fwd-${nextY}-${nextM}-${baseRecurringId}` ||
              t.id === `tx-fwd-annual-${nextY}-${nextM}-${baseRecurringId}` ||
              (editingTx && isMatchingRecurringTx(t, editingTx, false))
            );

            const fwdMonthlyDay = clampDayToMonth(baseOriginalDay, nextY, nextM);
            const fwdTx: Transaction = {
              id: `tx-fwd-${nextY}-${nextM}-${baseRecurringId}`,
              recurringGroupId,
              recurringOriginalDay: baseOriginalDay,
              label: txData.label,
              concept: txData.concept,
              amount: txData.amount,
              day: fwdMonthlyDay,
              dateString: getDateString(fwdMonthlyDay, nextM, language, nextY),
              isRecurring: true,
              recurrenceFrequency: 'monthly',
              isDone: false,
              actualAmount: null,
              highlight: txData.highlight
            };

            if (existingIdx >= 0) {
              forwardTxList[existingIdx] = fwdTx;
            } else {
              forwardTxList.push(fwdTx);
            }

            updatedMonths[nextKey] = {
              ...updatedMonths[nextKey],
              transactions: forwardTxList,
              hasUserActivity: true
            };
          }
        }
      } else if (!txData.isRecurring && editingTx && editingTx.isRecurring && !isAccumulated) {
        // Desmarcado de recurrencia: limpiar proyecciones futuras
        Object.keys(updatedMonths).forEach(key => {
          const mData = updatedMonths[key];
          if (mData.year > selectedYear || (mData.year === selectedYear && mData.month > selectedMonth)) {
            updatedMonths[key] = {
              ...mData,
              transactions: mData.transactions.filter(t => !isMatchingRecurringTx(t, editingTx, false))
            };
          }
        });
      }

      // Si hubo ajuste de plazo (ej. de 12 a 9 meses desde el simulador)
      if (loanTermAdjustment) {
        const { newTerm, monthlyPayment, institution } = loanTermAdjustment;
        for (let m = selectedMonth + 1; m < 12; m++) {
          const nextKey = `${selectedYear}-${m}`;
          if (updatedMonths[nextKey]) {
            let nextTxs = updatedMonths[nextKey].transactions.filter(t => {
              if (t.loanDetails && t.loanDetails.institutionName === institution) {
                return t.loanDetails.currentTermMonth <= newTerm;
              }
              return true;
            });

            nextTxs = nextTxs.map(t => {
              if (t.loanDetails && t.loanDetails.institutionName === institution) {
                const isRec = t.loanDetails.loanType === 'receivable' || t.amount > 0 || t.label === 'Ingreso';
                return {
                  ...t,
                  amount: isRec ? monthlyPayment : -monthlyPayment,
                  concept: `${institution} ${t.loanDetails.currentTermMonth} de ${newTerm}`,
                  loanDetails: {
                    ...t.loanDetails,
                    totalTermMonths: newTerm
                  }
                };
              }
              return t;
            });

            updatedMonths[nextKey] = {
              ...updatedMonths[nextKey],
              transactions: nextTxs
            };
          }
        }
      }

      updatedMonths[currentKey] = {
        ...monthData,
        transactions: txList,
        hasUserActivity: true
      };

      // Si se añadieron cuotas retroactivas a meses previos, propagar el arrastre de saldos desde el mes más antiguo modificado
      const earliestMonth = (txData.loanDetails && txData.loanDetails.currentTermMonth > 1)
        ? Math.max(0, selectedMonth - (txData.loanDetails.currentTermMonth - 1))
        : selectedMonth;

      return cascadeAccumulatedBalances(updatedMonths, selectedYear, earliestMonth);
    });

    setEditingTx(null);
  };

  const handleDeleteTransaction = (id: string) => {
    setMonths(prev => {
      let updatedMonths = { ...prev };
      const monthData = updatedMonths[currentKey];
      if (!monthData) return prev;

      const targetTx = monthData.transactions.find(t => t.id === id);
      const isPrimaryAcc = targetTx && (targetTx.id === `acc-${selectedYear}-${selectedMonth}`);

      let txList = monthData.transactions.filter(t => t.id !== id);

      // Si intentó borrar el acumulado legítimo de este mes, reseteamos su actualAmount y status pero mantenemos la fila viva
      if (isPrimaryAcc) {
        const closestTotals = getPreviousMonthTotals(updatedMonths, selectedYear, selectedMonth);
        const resetAcc: Transaction = {
          id: `acc-${selectedYear}-${selectedMonth}`,
          label: 'Neto',
          concept: 'Acumulado',
          amount: closestTotals ? closestTotals.endOfMonthTotal : 0,
          day: 1,
          dateString: getDateString(1, selectedMonth, language),
          isRecurring: false,
          isDone: false,
          actualAmount: null,
          hasCustomActual: false,
          highlight: 'none',
          isAutoAccumulated: true
        };
        txList = [resetAcc, ...txList.filter(t => !t.isAutoAccumulated && t.concept.trim().toLowerCase() !== 'acumulado')];
      }

      updatedMonths[currentKey] = {
        ...monthData,
        transactions: txList
      };

      return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth, language);
    });
  };

  // Helper to match recurring instances belonging to the exact same recurring series across months
  const isMatchingRecurringTx = (t: Transaction, target: Transaction, isSameOriginMonth: boolean = false): boolean => {
    // 1. Accumulator and loan transactions are never regular recurring matches
    if (t.isAutoAccumulated || target.isAutoAccumulated) return false;
    if (t.loanDetails || target.loanDetails) return false;

    // 2. Exact same transaction instance
    if (t.id === target.id) return true;

    // 3. In the same origin month (where user clicked delete), NEVER match or delete any other transaction!
    // Even if it has the exact same concept name, category or amount, two items in the same month are distinct.
    if (isSameOriginMonth) {
      return false;
    }

    // 4. In other months, only transactions marked as recurring can belong to a recurring series
    if (!t.isRecurring) {
      return false;
    }

    // 5. Match by explicit recurringGroupId
    if (t.recurringGroupId && target.recurringGroupId) {
      return t.recurringGroupId === target.recurringGroupId;
    }

    // 6. Match by unwound base ID
    const baseTargetId = getTransactionRecurringId(target);
    const baseTId = getTransactionRecurringId(t);
    if (baseTargetId && baseTId && baseTargetId === baseTId) {
      return true;
    }

    return false;
  };

  const handleDeleteRequest = (tx: Transaction) => {
    if (tx.loanDetails) {
      setDeletingLoanTx(tx);
      return;
    }

    // Check if it's recurring or present in other months
    const isRecurringOrShared = tx.isRecurring || Object.entries(months).some(([k, mData]) => {
      if (k === currentKey) return false;
      return mData.transactions.some(t => isMatchingRecurringTx(t, tx, false));
    });

    if (isRecurringOrShared) {
      setDeletingRecurringTx(tx);
    } else {
      setDeletingSingleTx(tx);
    }
  };

  const handleRecurringDeleteAction = (action: RecurringDeleteAction, tx: Transaction) => {
    setDeletingRecurringTx(null);

    setMonths(prev => {
      let updatedMonths = { ...prev };

      if (action === 'single') {
        const monthData = updatedMonths[currentKey];
        if (monthData) {
          updatedMonths[currentKey] = {
            ...monthData,
            transactions: monthData.transactions.filter(t => t.id !== tx.id)
          };
        }
        return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth, language);
      }

      if (action === 'forward') {
        // Borrar este mes y todos los siguientes hacia adelante
        Object.keys(updatedMonths).forEach(key => {
          const mData = updatedMonths[key];
          const isOriginMonth = (mData.year === selectedYear && mData.month === selectedMonth);
          if (mData.year > selectedYear || (mData.year === selectedYear && mData.month >= selectedMonth)) {
            updatedMonths[key] = {
              ...mData,
              transactions: mData.transactions.filter(t => {
                if (isOriginMonth) {
                  // En el mes de origen, ÚNICAMENTE borrar la transacción exacta sobre la que se hizo clic
                  return t.id !== tx.id;
                }
                return !isMatchingRecurringTx(t, tx, false);
              })
            };
          }
        });
        return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth, language);
      }

      if (action === 'backward') {
        // Borrar este mes y todos los anteriores hacia atrás
        let earliestYear = selectedYear;
        let earliestMonth = selectedMonth;

        Object.keys(updatedMonths).forEach(key => {
          const mData = updatedMonths[key];
          const isOriginMonth = (mData.year === selectedYear && mData.month === selectedMonth);
          if (mData.year < selectedYear || (mData.year === selectedYear && mData.month <= selectedMonth)) {
            const hasMatch = mData.transactions.some(t => isOriginMonth ? t.id === tx.id : isMatchingRecurringTx(t, tx, false));
            if (hasMatch) {
              if (mData.year < earliestYear || (mData.year === earliestYear && mData.month < earliestMonth)) {
                earliestYear = mData.year;
                earliestMonth = mData.month;
              }
            }
            updatedMonths[key] = {
              ...mData,
              transactions: mData.transactions.filter(t => {
                if (isOriginMonth) {
                  return t.id !== tx.id;
                }
                return !isMatchingRecurringTx(t, tx, false);
              })
            };
          }
        });
        return cascadeAccumulatedBalances(updatedMonths, earliestYear, earliestMonth, language);
      }

      if (action === 'all') {
        // Borrar de todos los meses pasados y futuros
        let earliestYear = selectedYear;
        let earliestMonth = selectedMonth;

        Object.keys(updatedMonths).forEach(key => {
          const mData = updatedMonths[key];
          const isOriginMonth = (mData.year === selectedYear && mData.month === selectedMonth);
          const hasMatch = mData.transactions.some(t => isOriginMonth ? t.id === tx.id : isMatchingRecurringTx(t, tx, false));
          if (hasMatch) {
            if (mData.year < earliestYear || (mData.year === earliestYear && mData.month < earliestMonth)) {
              earliestYear = mData.year;
              earliestMonth = mData.month;
            }
          }
          updatedMonths[key] = {
            ...mData,
            transactions: mData.transactions.filter(t => {
              if (isOriginMonth) {
                return t.id !== tx.id;
              }
              return !isMatchingRecurringTx(t, tx, false);
            })
          };
        });
        return cascadeAccumulatedBalances(updatedMonths, earliestYear, earliestMonth, language);
      }

      return updatedMonths;
    });
  };

  const handleLoanDeleteAction = (action: LoanDeleteAction, tx: Transaction) => {
    if (!tx.loanDetails) return;
    const loan = tx.loanDetails;
    const loanId = loan.loanId;
    const inst = loan.institutionName;
    const currentCuota = loan.currentTermMonth;
    const monthlyPayment = Math.abs(tx.amount);

    setMonths(prev => {
      let updatedMonths = { ...prev };

      if (action === 'single') {
        const monthData = updatedMonths[currentKey];
        if (monthData) {
          updatedMonths[currentKey] = {
            ...monthData,
            transactions: monthData.transactions.filter(t => t.id !== tx.id)
          };
        }
        return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth);
      }

      if (action === 'skip_and_double') {
        // En el mes actual se salta el pago ($0 no sale dinero)
        const monthData = updatedMonths[currentKey];
        if (monthData) {
          updatedMonths[currentKey] = {
            ...monthData,
            transactions: monthData.transactions.filter(t => t.id !== tx.id)
          };
        }

        // En el mes siguiente se cobra el doble para ponerse al corriente
        let nextM = selectedMonth + 1;
        let nextY = selectedYear;
        if (nextM >= 12) {
          nextM = 0;
          nextY += 1;
        }
        const nextKey = `${nextY}-${nextM}`;
        if (!updatedMonths[nextKey]) {
          updatedMonths[nextKey] = {
            year: nextY,
            month: nextM,
            transactions: [],
            creditCards: getInheritedCreditCards(updatedMonths, nextM),
            hasUserActivity: true
          };
        }

        const nextTxList = [...updatedMonths[nextKey].transactions];
        const nextIdx = nextTxList.findIndex(t => 
          t.loanDetails && (
            (loanId && t.loanDetails.loanId ? t.loanDetails.loanId === loanId : (t.loanDetails.institutionName.trim().toLowerCase() === inst.trim().toLowerCase() && t.loanDetails.totalTermMonths === loan.totalTermMonths))
            && t.loanDetails.currentTermMonth === currentCuota + 1
          )
        );

        const isRec = loan.loanType === 'receivable' || tx.amount > 0 || tx.label === 'Ingreso';
        const doubleAmount = isRec ? (monthlyPayment * 2) : -(monthlyPayment * 2);
        const catchUpConcept = language === 'es' 
          ? (isRec
              ? `${inst} ${currentCuota + 1} de ${loan.totalTermMonths} (Cobro doble por mes diferido)`
              : `${inst} ${currentCuota + 1} de ${loan.totalTermMonths} (Cuota doble por mes diferido)`)
          : (isRec
              ? `${inst} ${currentCuota + 1} of ${loan.totalTermMonths} (Double collection for skipped month)`
              : `${inst} ${currentCuota + 1} of ${loan.totalTermMonths} (Double payment for skipped month)`);

        if (nextIdx >= 0) {
          const existingNext = nextTxList[nextIdx];
          nextTxList[nextIdx] = {
            ...existingNext,
            amount: doubleAmount,
            concept: catchUpConcept,
            loanDetails: {
              ...existingNext.loanDetails!,
              initialDebt: loan.initialDebt,
              finalDebt: Math.max(0, loan.initialDebt - (monthlyPayment * 2))
            }
          };
        } else {
          const baseLoanDay = tx.recurringOriginalDay || tx.day;
          const dblDay = clampDayToMonth(baseLoanDay, nextY, nextM);
          const newNextTx: Transaction = {
            id: `tx-skip-dbl-${nextY}-${nextM}-${loanId || 'loan'}`,
            label: tx.label,
            concept: catchUpConcept,
            amount: doubleAmount,
            day: dblDay,
            recurringOriginalDay: baseLoanDay,
            dateString: getDateString(dblDay, nextM, language, nextY),
            isRecurring: true,
            isDone: false,
            actualAmount: null,
            highlight: 'yellow',
            loanDetails: {
              ...loan,
              currentTermMonth: currentCuota + 1,
              initialDebt: loan.initialDebt,
              finalDebt: Math.max(0, loan.initialDebt - (monthlyPayment * 2))
            }
          };
          nextTxList.push(newNextTx);
        }

        updatedMonths[nextKey] = {
          ...updatedMonths[nextKey],
          transactions: nextTxList,
          hasUserActivity: true
        };

        return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth);
      }

      if (action === 'forward') {
        // Borrar esta cuota y todas las siguientes
        Object.keys(updatedMonths).forEach(key => {
          const mData = updatedMonths[key];
          const isOriginMonth = (mData.year === selectedYear && mData.month === selectedMonth);
          if (mData.year > selectedYear || (mData.year === selectedYear && mData.month >= selectedMonth)) {
            updatedMonths[key] = {
              ...mData,
              transactions: mData.transactions.filter(t => {
                if (isOriginMonth) {
                  // En el mes de origen, ÚNICAMENTE borrar la transacción exacta del préstamo seleccionada
                  return t.id !== tx.id;
                }
                if (t.id === tx.id) return false;
                if (t.loanDetails) {
                  const isSameLoan = (loanId && t.loanDetails.loanId)
                    ? t.loanDetails.loanId === loanId
                    : (t.loanDetails.institutionName.trim().toLowerCase() === inst.trim().toLowerCase() && t.loanDetails.totalTermMonths === loan.totalTermMonths);
                  if (isSameLoan && t.loanDetails.currentTermMonth >= currentCuota) {
                    return false;
                  }
                }
                return true;
              })
            };
          }
        });
        return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth, language);
      }

      if (action === 'backward') {
        // Borrar esta cuota y todas las anteriores
        const earliestMonth = Math.max(0, selectedMonth - (currentCuota - 1));
        Object.keys(updatedMonths).forEach(key => {
          const mData = updatedMonths[key];
          const isOriginMonth = (mData.year === selectedYear && mData.month === selectedMonth);
          if (mData.year < selectedYear || (mData.year === selectedYear && mData.month <= selectedMonth)) {
            updatedMonths[key] = {
              ...mData,
              transactions: mData.transactions.filter(t => {
                if (isOriginMonth) {
                  return t.id !== tx.id;
                }
                if (t.id === tx.id) return false;
                if (t.loanDetails) {
                  const isSameLoan = (loanId && t.loanDetails.loanId)
                    ? t.loanDetails.loanId === loanId
                    : (t.loanDetails.institutionName.trim().toLowerCase() === inst.trim().toLowerCase() && t.loanDetails.totalTermMonths === loan.totalTermMonths);
                  if (isSameLoan && t.loanDetails.currentTermMonth <= currentCuota) {
                    return false;
                  }
                }
                return true;
              })
            };
          }
        });
        return cascadeAccumulatedBalances(updatedMonths, selectedYear, earliestMonth, language);
      }

      if (action === 'all') {
        // Borrar todo el crédito en todos los meses
        Object.keys(updatedMonths).forEach(key => {
          const mData = updatedMonths[key];
          const isOriginMonth = (mData.year === selectedYear && mData.month === selectedMonth);
          updatedMonths[key] = {
            ...mData,
            transactions: mData.transactions.filter(t => {
              if (isOriginMonth) {
                return t.id !== tx.id;
              }
              if (t.id === tx.id) return false;
              if (t.loanDetails) {
                const isSameLoan = (loanId && t.loanDetails.loanId)
                  ? t.loanDetails.loanId === loanId
                  : (t.loanDetails.institutionName.trim().toLowerCase() === inst.trim().toLowerCase() && t.loanDetails.totalTermMonths === loan.totalTermMonths);
                if (isSameLoan) return false;
              }
              return true;
            })
          };
        });
        return cascadeAccumulatedBalances(updatedMonths, selectedYear, 0, language);
      }

      return updatedMonths;
    });

    setDeletingLoanTx(null);
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    if (tx.isAutoAccumulated || tx.concept.trim().toLowerCase() === 'acumulado' || tx.id.startsWith('acc-')) {
      return;
    }

    setMonths(prev => {
      let updatedMonths = { ...prev };
      const monthData = updatedMonths[currentKey];
      if (!monthData) return prev;

      const duplicated: Transaction = {
        ...tx,
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        concept: `${tx.concept} (Copia)`,
        recurringGroupId: tx.isRecurring ? `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` : undefined,
        isDone: false,
        actualAmount: null
      };

      updatedMonths[currentKey] = {
        ...monthData,
        transactions: [...monthData.transactions, duplicated]
      };

      return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth, language);
    });
  };

  const handleMoveTransaction = (id: string, direction: 'up' | 'down') => {
    setMonths(prev => {
      const monthData = prev[currentKey];
      if (!monthData) return prev;

      const txList = [...monthData.transactions];
      const index = txList.findIndex(t => t.id === id);
      if (index <= 0 && direction === 'up') return prev;
      if (index >= txList.length - 1 && direction === 'down') return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (txList[targetIndex]?.isAutoAccumulated) return prev;

      const temp = txList[index];
      txList[index] = txList[targetIndex];
      txList[targetIndex] = temp;

      return {
        ...prev,
        [currentKey]: {
          ...monthData,
          transactions: txList
        }
      };
    });
  };

  const handleToggleDone = (id: string) => {
    setMonths(prev => {
      let updatedMonths = { ...prev };
      const monthData = updatedMonths[currentKey];
      if (!monthData) return prev;

      const txList = monthData.transactions.map(t => {
        if (t.id === id) {
          const nextDone = !t.isDone;
          return {
            ...t,
            isDone: nextDone,
            actualAmount: nextDone ? (t.actualAmount !== null ? t.actualAmount : t.amount) : null
          };
        }
        return t;
      });

      updatedMonths[currentKey] = {
        ...monthData,
        transactions: txList
      };

      return cascadeAccumulatedBalances(updatedMonths, selectedYear, selectedMonth);
    });
  };

  // Credit Card Handlers
  const handleUpdateCreditCard = (updatedCard: CreditCard, updateAllMonths: boolean = false) => {
    setMonths(prev => {
      const updated: Record<string, MonthData> = {};
      Object.entries(prev).forEach(([key, mData]) => {
        if (key === currentKey) {
          // En el mes activo actualizamos todo (incluyendo su estado isPaid particular y monto)
          const cards = (mData.creditCards || []).map(c => c.id === updatedCard.id ? updatedCard : c);
          updated[key] = {
            ...mData,
            creditCards: cards
          };
        } else if (updateAllMonths) {
          // Si se editaron los parámetros de la tarjeta (nombre, días y offsets de corte/pago),
          // se sincronizan en todos los meses, pero manteniendo el estado 'isPaid' particular de cada mes
          const cards = (mData.creditCards || []).map(c => {
            if (c.id === updatedCard.id) {
              return {
                ...c,
                name: updatedCard.name,
                payDay: updatedCard.payDay,
                payMonthOffset: updatedCard.payMonthOffset,
                cutDay: updatedCard.cutDay,
                cutMonthOffset: updatedCard.cutMonthOffset,
                amount: updatedCard.amount,
                isPaid: c.isPaid // Estado independiente por mes
              };
            }
            return c;
          });
          updated[key] = {
            ...mData,
            creditCards: cards
          };
        } else {
          updated[key] = mData;
        }
      });
      return updated;
    });
  };

  const handleAddCreditCard = (newCardData: Omit<CreditCard, 'id'>) => {
    const newCardId = `cc-${Date.now()}`;
    const newCard: CreditCard = {
      ...newCardData,
      id: newCardId
    };

    setMonths(prev => {
      const updated: Record<string, MonthData> = {};
      Object.entries(prev).forEach(([key, mData]) => {
        const existingCards = mData.creditCards || [];
        // Se añade la tarjeta en todos los meses; el estado isPaid inicia en false en cada mes
        updated[key] = {
          ...mData,
          creditCards: [...existingCards, { ...newCard, isPaid: false }]
        };
      });
      return updated;
    });
  };

  const handleDeleteCreditCard = (cardId: string) => {
    setMonths(prev => {
      const updated: Record<string, MonthData> = {};
      Object.entries(prev).forEach(([key, mData]) => {
        updated[key] = {
          ...mData,
          creditCards: (mData.creditCards || []).filter(c => c.id !== cardId)
        };
      });
      return updated;
    });
  };

  // Liquidity Line Handlers
  const handleUpdateCreditLine = (id: string, newAmount: number) => {
    setCreditLines(prev => prev.map(line => line.id === id ? { ...line, availableAmount: newAmount } : line));
  };

  const handleAddCreditLine = (institution: string, amount: number) => {
    const newLine: CreditLine = {
      id: `cl-${Date.now()}`,
      institution,
      availableAmount: amount
    };
    setCreditLines(prev => [...prev, newLine]);
  };

  const handleDeleteCreditLine = (id: string) => {
    setCreditLines(prev => prev.filter(l => l.id !== id));
  };

  // Import JSON backup with immediate persistence
  const handleImportData = async (importedMonths: Record<string, MonthData>, importedLines: CreditLine[]) => {
    setMonths(importedMonths);
    setCreditLines(importedLines);

    if (userSession.userMode === 'cloud' && auth.currentUser) {
      try {
        await saveCloudFinancialData(
          auth.currentUser.uid,
          auth.currentUser.email || '',
          importedMonths,
          importedLines,
          selectedYear
        );
      } catch (err) {
        console.error('Error persisting imported data to cloud:', err);
      }
    } else {
      saveLocalData(importedMonths, importedLines, selectedYear);
    }
  };

  // If user is not logged in, show initial Login / Welcome Gateway screen
  if (!userSession.isLoggedIn) {
    return (
      <LoginGateway
        onLoginLocal={handleLoginLocal}
        onLoginCloudSuccess={handleLoginCloudSuccess}
        language={language}
        onLanguageToggle={handleLanguageToggle}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* 1. Header Global y Barra de 12 Meses Fija en el Scrolling (Sticky top-0) */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-950/95 border-b border-slate-200 dark:border-neutral-800 backdrop-blur-md transition-colors shadow-xs">
        <Header
          year={selectedYear}
          month={selectedMonth}
          onYearChange={setSelectedYear}
          language={language}
          onLanguageToggle={handleLanguageToggle}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          userSession={userSession}
          onLogout={handleLogout}
          onOpenBackup={() => setIsBackupOpen(true)}
          onOpenDangerZone={() => setIsDangerZoneOpen(true)}
        />
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-2.5 pt-0.5">
          <MonthBar
            year={selectedYear}
            selectedMonth={selectedMonth}
            monthsData={months}
            onSelectMonth={setSelectedMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            language={language}
          />
        </div>
      </div>

      {/* Main Viewport */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 flex flex-col gap-5">
        
        {/* 2. Tarjetas de Métricas Resumen y Diagnóstico Quincenal */}
        <MetricCards
          totals={currentTotals}
          totalLiquidity={totalLiquidity}
          transactions={currentMonthData.transactions}
          month={selectedMonth}
          year={selectedYear}
          language={language}
          periodView={periodView}
          onPeriodViewChange={setPeriodView}
          onFilterTableQuincena={(q) => setFilter(q === 1 ? 'q1' : 'q2')}
        />

        {/* 4. Tabla de Flujo de Caja Inteligente */}
        <CashFlowTable
          transactions={currentMonthData.transactions}
          totals={currentTotals}
          totalLiquidity={totalLiquidity}
          selectedMonth={selectedMonth}
          year={selectedYear}
          language={language}
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pinAccumulated={pinAccumulated}
          onTogglePinAccumulated={() => setPinAccumulated(!pinAccumulated)}
          onOpenAddModal={() => {
            setEditingTx(null);
            setIsTxModalOpen(true);
          }}
          onEditTransaction={(tx) => {
            setEditingTx(tx);
            setIsTxModalOpen(true);
          }}
          onDeleteTransaction={handleDeleteRequest}
          onDuplicateTransaction={handleDuplicateTransaction}
          onMoveTransaction={handleMoveTransaction}
          onToggleDone={handleToggleDone}
          onOpenAmortizationModal={(tx) => {
            setAmortizationTx(tx);
            setIsAmortizationOpen(true);
          }}
        />

        {/* 5. Paneles Inferiores: Tarjetas de Crédito y Bolsa de Liquidez */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-2">
          {/* Tarjetas de Crédito Quincenales */}
          <div className="xl:col-span-8">
            <CreditCardsSection
              creditCards={currentMonthData.creditCards || []}
              selectedMonth={selectedMonth}
              year={selectedYear}
              language={language}
              onUpdateCard={handleUpdateCreditCard}
              onAddCard={handleAddCreditCard}
              onDeleteCard={handleDeleteCreditCard}
            />
          </div>

          {/* Capital Disponible en Préstamos (Bolsa de Liquidez) */}
          <div className="xl:col-span-4">
            <LiquidityPoolSection
              creditLines={creditLines}
              language={language}
              onUpdateCreditLine={handleUpdateCreditLine}
              onAddCreditLine={handleAddCreditLine}
              onDeleteCreditLine={handleDeleteCreditLine}
            />
          </div>
        </div>

      </main>

      {/* Footer Discreto */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-neutral-500 border-t border-slate-200 dark:border-neutral-900 mt-6">
        <span>Totalero · Flujo de Caja · 2026</span>
      </footer>

      {/* Modal Agregar / Editar Transacción */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTx}
        selectedMonth={selectedMonth}
        year={selectedYear}
        language={language}
        prevMonthTotals={getPreviousMonthTotals(months, selectedYear, selectedMonth)}
      />

      {/* Modal Simulador de Amortización y Ahorro */}
      {amortizationTx && (
        <AmortizationModal
          isOpen={isAmortizationOpen}
          onClose={() => {
            setIsAmortizationOpen(false);
            setAmortizationTx(null);
          }}
          transaction={amortizationTx}
          language={language}
          onApplyAdjustment={(updatedTx) => {
            handleSaveTransaction(updatedTx);
            setIsAmortizationOpen(false);
          }}
        />
      )}

      {/* Modal Confirmación y Acciones para Eliminar / Saltar Cuota de Préstamo */}
      {deletingLoanTx && (
        <LoanDeleteModal
          isOpen={!!deletingLoanTx}
          onClose={() => setDeletingLoanTx(null)}
          transaction={deletingLoanTx}
          selectedMonth={selectedMonth}
          year={selectedYear}
          language={language}
          onConfirm={handleLoanDeleteAction}
        />
      )}

      {/* Modal Confirmación para Eliminar Pago Mensual Recurrente */}
      {deletingRecurringTx && (
        <RecurringDeleteModal
          isOpen={!!deletingRecurringTx}
          onClose={() => setDeletingRecurringTx(null)}
          transaction={deletingRecurringTx}
          selectedMonth={selectedMonth}
          year={selectedYear}
          language={language}
          onConfirm={handleRecurringDeleteAction}
        />
      )}

      {/* Modal Confirmación para Eliminar Transacción Individual */}
      {deletingSingleTx && (
        <SingleDeleteModal
          isOpen={!!deletingSingleTx}
          onClose={() => setDeletingSingleTx(null)}
          transaction={deletingSingleTx}
          selectedMonth={selectedMonth}
          year={selectedYear}
          language={language}
          onConfirm={(tx) => handleDeleteTransaction(tx.id)}
        />
      )}

      {/* Modal Copia de Seguridad & JSON */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        monthsData={months}
        creditLines={creditLines}
        onImportData={handleImportData}
        onResetFactoryData={handleLoadDemoData}
        language={language}
      />

      {/* Modal Sincronización Nube Vacía (Image 1) */}
      <SyncPromptModal
        isOpen={isSyncPromptOpen}
        userEmail={pendingCloudUser?.email || userSession.email || ''}
        stats={localStats}
        onSyncLocalToCloud={handleSyncLocalToCloud}
        onStartFreshCloud={handleStartFreshCloud}
        onDismiss={() => {
          setIsSyncPromptOpen(false);
          setPendingCloudUser(null);
        }}
        language={language}
      />

      {/* Modal Zona de Peligro y Borrado (Image 2) */}
      <DangerZoneModal
        isOpen={isDangerZoneOpen}
        onClose={() => setIsDangerZoneOpen(false)}
        userSession={userSession}
        stats={memoryStats}
        onExportJson={handleExportJson}
        onPurgeData={handlePurgeData}
        onLoadDemoData={handleLoadDemoData}
        language={language}
      />

    </div>
  );
}
