import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { ANONYMOUS_TIER } from "../lib/entitlements";
import type { SubscriptionTier } from "../api/contracts";

/**
 * Session state.
 *
 * DESIGN CONSTRAINTS, all of them deliberate:
 *
 *  1. **The app is fully usable signed out.** `/api/board/state`, `/api/picks`,
 *     `/api/calibration`, `/api/brief` and `/api/performance` are public, and
 *     the server resolves an anonymous viewer through `getEntitlements("FREE")`
 *     — the SAME function a signed-in FREE user resolves through. So sign-in is
 *     an upgrade, not a gate, and there is no "you must sign in" wall anywhere
 *     in this app except on the two surfaces the server 401s.
 *
 *  2. **The token lives in the Keychain, never in AsyncStorage.** `expo-secure-store`
 *     is backed by the iOS Keychain with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
 *     accessibility, which also means it does not travel in an iCloud backup.
 *     An auth token in a plain preferences file is readable by anything that
 *     can read the app container.
 *
 *  3. **The tier is never persisted.** It is fetched per session from
 *     `/api/mobile/v1/bootstrap` and discarded on sign-out. A cached tier is
 *     both a rule-3 violation and wrong the moment a subscription lapses.
 *
 *  4. **Sign-out clears the cache too.** Leaving a previous account's cached
 *     board on the device is a data-leak between accounts on a shared phone.
 */

const TOKEN_KEY = "gse.session.token.v1";
const EXPIRY_KEY = "gse.session.expiry.v1";

/** Keychain accessibility: device-only, available once unlocked. */
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string | null;
  tier: SubscriptionTier;
  alertsEligible: boolean;
}

interface SessionState {
  /** null while signed out. The app runs fine in this state. */
  token: string | null;
  expiresAt: number | null;
  user: SessionUser | null;
  /** True until the persisted token has been read at cold start. */
  hydrating: boolean;
  signIn: (input: { token: string; expiresAt: number; user: SessionUser }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Called by the bootstrap fetch. Never persisted. */
  setUser: (user: SessionUser | null) => void;
  hydrate: () => Promise<void>;
  isSignedIn: () => boolean;
}

/**
 * Tasks to run on sign-out.
 *
 * A registry rather than a direct import, because the queue lives in a higher
 * layer than the session store and importing it here would invert the
 * dependency. Everything registered here MUST complete before the session is
 * cleared: a previous account's queued writes replayed as the next user's would
 * appear as someone following picks they never chose.
 */
const signOutTasks: Array<() => Promise<void>> = [];

export function registerSignOutTask(task: () => Promise<void>): void {
  signOutTasks.push(task);
}

export const useSession = create<SessionState>()((set, get) => ({
  token: null,
  expiresAt: null,
  user: null,
  hydrating: true,

  hydrate: async () => {
    try {
      const [token, expiryRaw] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY, KEYCHAIN_OPTIONS),
        SecureStore.getItemAsync(EXPIRY_KEY, KEYCHAIN_OPTIONS),
      ]);
      const expiresAt = expiryRaw ? Number(expiryRaw) : null;
      if (token && expiresAt !== null && Number.isFinite(expiresAt) && expiresAt > Date.now()) {
        set({ token, expiresAt, hydrating: false });
        return;
      }
      // An expired token is CLEARED, not kept. A stale bearer token produces a
      // 401 on every request, which the UI would surface as "sign in" on a
      // screen the user is already signed in to.
      if (token) await clearStoredToken();
      set({ token: null, expiresAt: null, hydrating: false });
    } catch {
      // A locked Keychain at cold start is not an error; the session simply is
      // not readable yet. The app proceeds anonymously and re-hydrates later.
      set({ hydrating: false });
    }
  },

  signIn: async ({ token, expiresAt, user }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token, KEYCHAIN_OPTIONS);
    await SecureStore.setItemAsync(EXPIRY_KEY, String(expiresAt), KEYCHAIN_OPTIONS);
    set({ token, expiresAt, user });
  },

  signOut: async () => {
    // Device state first. If a task throws, the token is still cleared — a
    // failure to clean up must never leave someone signed in who asked not to be.
    for (const task of signOutTasks) {
      try {
        await task();
      } catch {
        // Deliberately swallowed per task: one failing cleanup must not block
        // the others or the sign-out itself.
      }
    }
    await clearStoredToken();
    set({ token: null, expiresAt: null, user: null });
  },

  setUser: (user) => set({ user }),

  isSignedIn: () => get().token !== null,
}));

async function clearStoredToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY, KEYCHAIN_OPTIONS),
    SecureStore.deleteItemAsync(EXPIRY_KEY, KEYCHAIN_OPTIONS),
  ]);
}

/**
 * The tier the app should render for.
 *
 * Signed out resolves through the SAME constant the server's anonymous path
 * uses (`getEntitlements("FREE")`), so the two definitions cannot drift — which
 * is the drift CLAUDE.md records shipping once already.
 *
 * Note this is used for LABELS ONLY. It never unlocks anything: see the header
 * of `lib/entitlements.ts`.
 */
export function viewerTier(user: SessionUser | null): SubscriptionTier {
  return user?.tier ?? ANONYMOUS_TIER;
}

/**
 * Devices are registered for push only when the account's tier actually
 * permits alerts (Elite). Registering a FREE device and then never sending is
 * the exact pattern that trains users to ignore notifications.
 */
export function shouldRegisterForPush(user: SessionUser | null, enabled: boolean): boolean {
  return enabled && user !== null && user.alertsEligible === true;
}