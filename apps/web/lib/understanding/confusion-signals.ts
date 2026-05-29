/**
 * Confusion signals — observable patterns that suggest a user is lost,
 * mismatched to the surface they landed on, or failing to find a next step.
 *
 * Confusion signals are inputs to two systems:
 *  - Experience Orchestrator (C26): may suggest a clearer next-best surface
 *  - Decision Quality Maturity Model (C22): is the user stalling because
 *    the product is opaque, not because the user is wrong?
 *
 * Hard rule: confusion signals must never trigger a betting-action prompt.
 * The only legal interventions are clarity, methodology, academy, or pass.
 */

import type { TelemetrySurfaceId } from "../telemetry/surfaces";

/** A single observable confusion signal. */
export type ConfusionSignal =
  | { kind: "short-dwell"; surface: TelemetrySurfaceId; dwellMs: number }
  | { kind: "repeated-back"; surface: TelemetrySurfaceId; count: number }
  | { kind: "explainer-bounce"; surface: TelemetrySurfaceId; key: string }
  | { kind: "search-fallback"; query_intent: string }
  | { kind: "tier-mismatch"; surface: TelemetrySurfaceId; tier: "FREE" | "PRO" | "ELITE" }
  | { kind: "evidence-card-unread"; surface: TelemetrySurfaceId; impressionMs: number };

/** Thresholds below which a behavior is treated as a confusion signal. */
export const CONFUSION_THRESHOLDS = {
  shortDwellMs: 4_000,
  repeatedBackCount: 3,
  explainerBounceMaxMs: 2_500,
  evidenceCardImpressionMs: 3_000,
} as const;

/**
 * Suggested remediation per surface family. The orchestrator may pick
 * none — but it is forbidden from suggesting "place a bet" or "upgrade
 * to see this".
 */
export type ConfusionRemediation =
  | { kind: "show-methodology"; href: string }
  | { kind: "open-academy-module"; module: string; href: string }
  | { kind: "elevate-pass-list"; href: string }
  | { kind: "explain-evidence-chain"; key: string }
  | { kind: "lower-density"; level: "less-dense" | "guided" }
  | { kind: "none" };

const FORBIDDEN_REMEDIATIONS = new Set([
  "place-bet",
  "raise-stake",
  "upsell",
  "show-scarcity-timer",
]);

export function isForbiddenRemediation(kind: string): boolean {
  return FORBIDDEN_REMEDIATIONS.has(kind);
}

/**
 * Pure mapping function: given a confusion signal, what should the
 * orchestrator consider? This function never decides — it proposes.
 */
export function proposeRemediation(signal: ConfusionSignal): ConfusionRemediation {
  switch (signal.kind) {
    case "short-dwell":
      if (signal.surface === "picks" || signal.surface === "today") {
        return { kind: "show-methodology", href: "/methodology" };
      }
      return { kind: "lower-density", level: "less-dense" };
    case "repeated-back":
      return { kind: "lower-density", level: "guided" };
    case "explainer-bounce":
      return { kind: "open-academy-module", module: signal.key, href: "/academy" };
    case "search-fallback":
      return { kind: "show-methodology", href: "/methodology" };
    case "tier-mismatch":
      // Never upsell here. The pricing page is the only legal disclosure surface.
      return { kind: "none" };
    case "evidence-card-unread":
      return { kind: "explain-evidence-chain", key: "evidence-chain" };
  }
}
