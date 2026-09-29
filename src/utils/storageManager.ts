import { MonthData, CreditLine, UserSession } from '../types/finance';
import { countDataStats, createEmptyMonths, createInitialSampleMonths, DEFAULT_CREDIT_LINES } from './sampleData';

export const CANONICAL_LOCAL_DATA_KEY = 'totalero_local_workspace_v2';
export const CANONICAL_SESSION_KEY = 'totalero_session_v2';

export const LEGACY_STORAGE_KEYS = [
  'totalero_local_workspace',
  'totalero_session',
  'totalero_workspace',
  'totalero_months',
  'totalero_credit_lines',
  'totalero_state',
  'app_guest_v1_transactions',
  'app_guest_v1_accounts',
  'app_guest_v1_categories',
  'totalero_guest_data',
  'totalero_guest_snapshot',
  'guestSnapshotRef'
];

export interface LocalStorageSnapshot {
  months: Record<string, MonthData>;
  creditLines: CreditLine[];
  selectedYear: number;
  hasLocalData: boolean;
  stats: {
    transactions: number;
    loans: number;
    cards: number;
    creditLines: number;
    total: number;
  };
}

/**
 * Purges any legacy keys from previous versions to eliminate orphan/ghost data.
 */
export function purgeLegacyStorageKeys(): void {
  try {
    LEGACY_STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Also scan and remove any dynamic legacy prefixes
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('app_guest_v1_') || k.startsWith('totalero_guest_') || k.startsWith('totalero_legacy_'))) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('Storage purge warning:', e);
  }
}

/**
 * Reads local guest storage snapshot.
 * CRITICAL ARCHITECTURAL DIRECTIVE:
 * If the key is null, empty or invalid, it returns strictly EMPTY data structures ({}, []),
 * NEVER demo/sample initial data. This completely prevents "ghost data" on cloud login.
 */
export function getLocalSnapshot(): LocalStorageSnapshot {
  try {
    const raw = localStorage.getItem(CANONICAL_LOCAL_DATA_KEY);
    if (!raw) {
      return {
        months: {},
        creditLines: [],
        selectedYear: 2026,
        hasLocalData: false,
        stats: { transactions: 0, loans: 0, cards: 0, creditLines: 0, total: 0 }
      };
    }

    const parsed = JSON.parse(raw);
    const months = (parsed && typeof parsed.months === 'object' && parsed.months !== null) ? parsed.months : {};
    const creditLines = Array.isArray(parsed?.creditLines) ? parsed.creditLines : [];
    const selectedYear = typeof parsed?.selectedYear === 'number' ? parsed.selectedYear : 2026;

    const baseStats = countDataStats(months, creditLines);
    const total = baseStats.transactions + baseStats.loans + baseStats.cards + baseStats.creditLines;

    return {
      months,
      creditLines,
      selectedYear,
      hasLocalData: total > 0,
      stats: {
        ...baseStats,
        total
      }
    };
  } catch (e) {
    console.error('Error reading local snapshot:', e);
    return {
      months: {},
      creditLines: [],
      selectedYear: 2026,
      hasLocalData: false,
      stats: { transactions: 0, loans: 0, cards: 0, creditLines: 0, total: 0 }
    };
  }
}

/**
 * Saves local data cleanly to the canonical key.
 */
export function saveLocalData(
  months: Record<string, MonthData>,
  creditLines: CreditLine[],
  selectedYear: number
): void {
  try {
    const payload = {
      months,
      creditLines,
      selectedYear,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(CANONICAL_LOCAL_DATA_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Error saving local data:', e);
  }
}

/**
 * Atomic wipe of local storage:
 * Sets empty months and empty credit lines in canonical key,
 * and clears any legacy keys.
 */
export function atomicWipeLocal(selectedYear: number = 2026): Record<string, MonthData> {
  purgeLegacyStorageKeys();
  const emptyMonths = createEmptyMonths(selectedYear);
  saveLocalData(emptyMonths, [], selectedYear);
  return emptyMonths;
}

/**
 * Populates local storage with fresh demo data when explicitly requested by user.
 */
export function loadLocalDemoData(selectedYear: number = 2026): {
  months: Record<string, MonthData>;
  creditLines: CreditLine[];
} {
  const sampleMonths = createInitialSampleMonths(selectedYear);
  saveLocalData(sampleMonths, DEFAULT_CREDIT_LINES, selectedYear);
  return {
    months: sampleMonths,
    creditLines: DEFAULT_CREDIT_LINES
  };
}

/**
 * Keeps a local offline mirror of the authenticated user's cloud data.
 * This guarantees instant offline startup and zero loss when working without internet.
 */
export function saveCloudLocalMirror(
  userId: string,
  months: Record<string, MonthData>,
  creditLines: CreditLine[],
  selectedYear: number
): void {
  try {
    const key = `totalero_cloud_mirror_${userId}`;
    const payload = {
      months,
      creditLines,
      selectedYear,
      mirroredAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Error saving cloud local mirror:', e);
  }
}

export function getCloudLocalMirror(userId: string): {
  months: Record<string, MonthData>;
  creditLines: CreditLine[];
  selectedYear: number;
} | null {
  try {
    const key = `totalero_cloud_mirror_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.months) {
      return {
        months: parsed.months,
        creditLines: Array.isArray(parsed.creditLines) ? parsed.creditLines : [],
        selectedYear: typeof parsed.selectedYear === 'number' ? parsed.selectedYear : 2026
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}
