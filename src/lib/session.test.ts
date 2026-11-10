import { beforeEach, describe, expect, it, vi } from "vitest";
import { getState, loadStore, setState } from "./store";
import { signOutGoogle } from "./firebase";

const firebase = vi.hoisted(() => ({ signOut: vi.fn(), auth: {} }));
vi.mock("firebase/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase/auth", () => ({ getAuth: () => firebase.auth, signOut: firebase.signOut }));
vi.mock("firebase/firestore", () => ({ getFirestore: () => ({}) }));

describe("Local session cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebase.signOut.mockResolvedValue(undefined);
    setState(() => ({ session: "google", userName: "Previous Google account", initialBalance: 2500000 }));
  });

  it("removes a previously saved Google profile when loading guest data", () => {
    localStorage.setItem("totalero:v1", JSON.stringify({ session: "guest", userName: "Previous Google account", initialBalance: 2500000 }));
    loadStore();
    expect(getState().userName).toBeNull();
    expect(JSON.parse(localStorage.getItem("totalero:v1") ?? "{}").userName).toBeNull();
    expect(getState().initialBalance).toBe(2500000);
  });

  it("signs out of Firebase and clears the stored profile without deleting financial data", async () => {
    await signOutGoogle();
    expect(firebase.signOut).toHaveBeenCalledWith(firebase.auth);
    expect(getState().session).toBeNull();
    expect(getState().userName).toBeNull();
    const saved = JSON.parse(localStorage.getItem("totalero:v1") ?? "{}");
    expect(saved.session).toBeNull();
    expect(saved.userName).toBeNull();
    expect(saved.initialBalance).toBe(2500000);
  });

  it("clears the last Google profile when entering guest mode", () => {
    setState(() => ({ session: "guest" }));
    expect(getState().userName).toBeNull();
    expect(getState().initialBalance).toBe(2500000);
  });

  it("does not pretend Firebase sign-out succeeded when it fails", async () => {
    firebase.signOut.mockRejectedValue(new Error("offline"));
    await expect(signOutGoogle()).rejects.toThrow("offline");
    expect(getState().session).toBe("google");
  });
});