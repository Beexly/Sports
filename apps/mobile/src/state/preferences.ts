import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ThemeMode } from "../theme";

/**
 * Device preferences.
 *
 * WHAT IS *NOT* IN HERE, and why:
 *
 *   · No tier. Entitlements come from the server on every session. A cached
 *     tier on the device would be a client-side paywall (CLAUDE.md rule 3) and
 *     would also be wrong the moment a subscription lapses.
 *   · No "unlocked features". Same reason.
 *   · No analytics identifiers. The app does no cross-app tracking, so it has
 *     nothing to persist for one.
 *
 * What IS here is genuine device state: how the user wants the app to look,
 * whether they have cleared the age gate, and which sports they care about.
 * These are preferences, not permissions.
 */

export interface Preferences {
  /**
   * FIELD (default) or the paper reading mode.
   *
   * Deliberately NOT wired to the OS appearance setting. A dark-native
   * instrument that turns white because the phone is in light mode is not the
   * product. Paper is a choice, and it is only offered on the four dense
   * surfaces the token file scopes it to.
   */
  themeMode: ThemeMode;
  /** Cleared at first launch. Gates nothing except the onboarding flow. */
  ageAcknowledged: boolean;
  onboardingComplete: boolean;
  /** Sport preferences drive the default board filter. Empty = all. */
  sports: string[];
  /** Default date scope: today, or the whole slate window. */
  defaultScope: "today" | "window";
  /** Reduce motion, in addition to the OS setting (the app honours both). */
  reduceMotionOverride: boolean;
  /** Results/haptics preference. Stored so the OS permission is not re-asked. */
  hapticsEnabled: boolean;
  /** Last model version seen, used to surface a "model changed" notice once. */
  lastSeenModelVersion: string | null;
}

interface PreferenceState extends Preferences {
  setThemeMode: (mode: ThemeMode) => void;
  acknowledgeAge: () => void;
  completeOnboarding: (sports: string[]) => void;
  toggleSport: (sport: string) => void;
  setDefaultScope: (scope: Preferences["defaultScope"]) => void;
  setReduceMotion: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  noteModelVersion: (version: string) => void;
  reset: () => void;
}

/**
 * The Zustand persist contract wants a `StateStorage` with `getItem`/`setItem`
 * returning strings. AsyncStorage's methods already match, but they are typed
 * with a wider return, so this adapter makes the contract explicit rather than
 * casting at the call site.
 */
const storage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

const DEFAULTS: Preferences = {
  themeMode: "field",
  ageAcknowledged: false,
  onboardingComplete: false,
  sports: [],
  defaultScope: "today",
  reduceMotionOverride: false,
  hapticsEnabled: true,
  lastSeenModelVersion: null,
};

export const usePreferences = create<PreferenceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setThemeMode: (themeMode) => set({ themeMode }),
      acknowledgeAge: () => set({ ageAcknowledged: true }),
      completeOnboarding: (sports) => set({ onboardingComplete: true, sports }),
      toggleSport: (sport) =>
        set((state) => ({
          sports: state.sports.includes(sport)
            ? state.sports.filter((s) => s !== sport)
            : [...state.sports, sport],
        })),
      setDefaultScope: (defaultScope) => set({ defaultScope }),
      setReduceMotion: (reduceMotionOverride) => set({ reduceMotionOverride }),
      setHaptics: (hapticsEnabled) => set({ hapticsEnabled }),
      noteModelVersion: (lastSeenModelVersion) => set({ lastSeenModelVersion }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "gse.preferences.v1",
      storage: createJSONStorage(() => storage),
      // v1 shape. A migration must be added rather than a silent reset, because
      // resetting preferences wipes the user's sport filter and re-shows the
      // age gate, which reads as a bug.
      version: 1,
    },
  ),
);

/** Sports the board can filter on. Sourced from the server's own sport enum. */
export const SUPPORTED_SPORTS = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"] as const;
export type SupportedSport = (typeof SUPPORTED_SPORTS)[number];