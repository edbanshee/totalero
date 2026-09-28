import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { MonthData, CreditLine } from '../types/finance';

// Read config from Vite environment variables (if configured in GitHub secrets / .env)
// with full fallback to firebase-applet-config.json
const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId,
};

const app = initializeApp(resolvedFirebaseConfig);

const customDbId = (import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '').trim();
// In Firestore Spark plan (free tier), the database name is typically '(default)'.
export const db = (customDbId && customDbId !== '(default)')
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, customDbId)
  : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errCode = (error as { code?: string })?.code;
  const errMsg = error instanceof Error ? error.message : String(error);

  // If the error is network unavailability or client offline, handle gracefully
  if (errCode === 'unavailable' || errMsg.includes('unavailable') || errMsg.includes('could not be completed') || errMsg.includes('client is offline')) {
    console.warn(`Firestore operation ${operationType} temporarily unavailable on ${path}: ${errMsg}. Operating in local/offline mode.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (error?.code === 'unavailable' || errMsg.includes('offline') || errMsg.includes('could not be completed')) {
      console.warn("Firestore operating in offline/cached mode.");
    }
  }
}

// Google Sign In
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const errCode = error?.code || '';
    const errMsg = error instanceof Error ? error.message : String(error);

    // Normal cancellation by user or multiple popup click: handle gracefully without throwing console.error
    if (
      errCode === 'auth/popup-closed-by-user' ||
      errMsg.includes('popup-closed-by-user') ||
      errCode === 'auth/cancelled-popup-request' ||
      errMsg.includes('cancelled-popup-request')
    ) {
      return null;
    }

    if (errCode === 'auth/popup-blocked' || errMsg.includes('popup-blocked')) {
      console.warn('Popup blocked by browser. Please enable popups for this site.');
      throw new Error('POPUP_BLOCKED');
    }

    console.warn('Google sign-in could not be completed:', errMsg);
    throw error;
  }
}

// Sign Out
export async function signOutCloud(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export interface CloudStoragePayload {
  userId: string;
  email: string;
  months: Record<string, MonthData>;
  creditLines: CreditLine[];
  selectedYear: number;
  updatedAt: string;
}

// Load cloud financial data
export async function loadCloudFinancialData(userId: string): Promise<CloudStoragePayload | null> {
  const docPath = `users/${userId}/financialData/main`;
  try {
    const docRef = doc(db, 'users', userId, 'financialData', 'main');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as CloudStoragePayload;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    return null;
  }
}

// Save cloud financial data
export async function saveCloudFinancialData(
  userId: string, 
  email: string,
  months: Record<string, MonthData>,
  creditLines: CreditLine[],
  selectedYear: number
): Promise<void> {
  const docPath = `users/${userId}/financialData/main`;
  try {
    const docRef = doc(db, 'users', userId, 'financialData', 'main');
    const payload: CloudStoragePayload = {
      userId,
      email,
      months,
      creditLines,
      selectedYear,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// Delete cloud financial data
export async function deleteCloudFinancialData(userId: string): Promise<void> {
  const docPath = `users/${userId}/financialData/main`;
  try {
    const docRef = doc(db, 'users', userId, 'financialData', 'main');
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
