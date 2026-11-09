// Optional Firebase layer: Google sign-in + cloud backup. Reads only VITE_FIREBASE_* public
// config; the app keeps working in guest mode when it is missing. Loaded lazily in the browser.
import { exportBackup, importBackup, setState } from "@/lib/store";

// Public web config (protected by Firestore rules); VITE_FIREBASE_* overrides it per deployment.
const defaults: Record<string, string> = {
  VITE_FIREBASE_API_KEY: "AIzaSyAWYxT6HK3H_mC_bsKS6FUvbd1B0ipORjk",
  VITE_FIREBASE_AUTH_DOMAIN: "totalero-finance.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "totalero-finance",
  VITE_FIREBASE_APP_ID: "1:1065099817414:web:48511437075f3a7eb682c7",
};
const env: Record<string, string> = { ...defaults };
for (const n of Object.keys(defaults)) { const v = import.meta.env[n]; if (v) env[n] = v; }
export const firebaseConfigured = !!(env["VITE_FIREBASE_API_KEY"] && env["VITE_FIREBASE_PROJECT_ID"]);

async function sdk() {
  const [{ initializeApp, getApps }, auth, fs] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = getApps()[0] ?? initializeApp({
    apiKey: env["VITE_FIREBASE_API_KEY"] ?? "",
    authDomain: env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "",
    projectId: env["VITE_FIREBASE_PROJECT_ID"] ?? "",
    appId: env["VITE_FIREBASE_APP_ID"] ?? "",
  });
  return { auth, fs, a: auth.getAuth(app), db: fs.getFirestore(app) };
}

export async function signInWithGoogle() {
  const { auth, a } = await sdk();
  const { user } = await auth.signInWithPopup(a, new auth.GoogleAuthProvider());
  setState(() => ({ session: "google", userName: user.displayName ?? user.email ?? "Google" }));
  return user;
}

export async function signOutGoogle() {
  const { auth, a } = await sdk();
  await auth.signOut(a);
}

async function currentUser() {
  const { a } = await sdk();
  await a.authStateReady();
  if (!a.currentUser) throw new Error("notSignedIn");
  return a.currentUser;
}

/** Saves the full backup JSON to backups/{uid}. */
export async function cloudSave() {
  const { fs, db } = await sdk();
  const u = await currentUser();
  await fs.setDoc(fs.doc(db, "backups", u.uid), { data: exportBackup(), at: Date.now() });
}

/** Restores backups/{uid}; returns an error key or null. */
export async function cloudLoad(): Promise<string | null> {
  const { fs, db } = await sdk();
  const u = await currentUser();
  const snap = await fs.getDoc(fs.doc(db, "backups", u.uid));
  if (!snap.exists()) return "empty";
  return importBackup(String(snap.data()["data"]));
}
