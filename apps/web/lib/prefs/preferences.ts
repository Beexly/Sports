/**
 * Preferences — light, local personalization.
 *
 * A feature-rich product should meet you where you are. A one-time intake captures
 * what you're here for (betting, fantasy, or both), which sports, and your
 * experience — then Mission Control re-ranks itself toward what's relevant to you.
 * Stored in the browser; nothing leaves the device. Pure re-ranking, testable.
 */

import type { BriefingCard, BriefingKind } from "../cockpit/mission-control";

export type Focus = "betting" | "fantasy" | "both";
export type Experience = "new" | "intermediate" | "sharp";

export type Preferences = {
  readonly focus: Focus;
  readonly sports: readonly string[];
  readonly experience: Experience;
};

export const DEFAULT_PREFS: Preferences = { focus: "both", sports: ["NFL"], experience: "intermediate" };

export const ALL_SPORTS = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "Soccer"] as const;

export const PREFS_KEY = "gse_prefs_v1";

/** How relevant each briefing kind is to a given focus (multiplier on priority). */
const RELEVANCE: Record<Focus, Partial<Record<BriefingKind, number>>> = {
  betting: { breaking: 1.2, props: 1.3, discipline: 1.3, dfs: 1.0, scheme: 0.8, roster: 0.6 },
  fantasy: { roster: 1.3, scheme: 1.25, dfs: 1.2, breaking: 1.05, props: 0.85, discipline: 0.7 },
  both: {},
};

/** Re-rank a briefing toward the user's focus. Pure; returns a new sorted array. */
export function personalizeBriefing(cards: readonly BriefingCard[], prefs: Preferences): BriefingCard[] {
  const weights = RELEVANCE[prefs.focus];
  return cards
    .map((c) => ({ ...c, priority: Math.round(c.priority * (weights[c.kind] ?? 1)) }))
    .sort((a, b) => b.priority - a.priority);
}

export function isValidPrefs(p: unknown): p is Preferences {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    (o["focus"] === "betting" || o["focus"] === "fantasy" || o["focus"] === "both") &&
    Array.isArray(o["sports"]) &&
    (o["experience"] === "new" || o["experience"] === "intermediate" || o["experience"] === "sharp")
  );
}

export function loadPrefs(): Preferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidPrefs(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePrefs(p: Preferences): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
