import type { SubscriptionTier } from "../api/contracts";

/**
 * Client-side mirror of `getEntitlements(tier)` from
 * `packages/types/src/index.ts`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THIS IS PRESENTATION ONLY. IT IS NOT A PAYWALL. IT MUST NEVER BE ONE.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * CLAUDE.md rule 3: "No frontend-only paywalls — enforcement is server-side
 * only." The server already tier-filters premium picks out of the DB query and
 * redacts `confidence` before the payload leaves the process. By the time a
 * field reaches this app it has already been gated.
 *
 * So what is this file for? Three legitimate things, and nothing else:
 *
 *   1. CHOOSING THE HONEST LABEL for a redacted field. When the server sends
 *      `confidence: null` because this viewer is FREE, the card must say
 *      "Confidence — Pro" rather than render an em dash that reads like a
 *      data bug. The distinction between "we don't have it" and "you don't
 *      have it" is a customer-facing truth, not a sales tactic.
 *   2. DECIDING WHICH NAV DESTINATIONS TO DEFER, so a FREE user is not walked
 *      into three screens that will each show them the same padlock.
 *   3. NEVER doing the reverse. There is no flag here that unlocks anything.
 *      `canSeeConfidence` does not "get read to decide whether to show
 *      confidence" — the data simply is not there. Search this repo for
 *      `canSee` and every hit is a label or a route guard.
 *
 * If a future change ever reads one of these flags to reveal data that arrived
 * in the payload, that change is a rule-3 violation and should be rejected in
 * review regardless of how convenient it is.
 */

export interface Entitlements {
  tier: SubscriptionTier;
  canSeePremiumPicks: boolean;
  canSeeConfidence: boolean;
  canSeeLineMovement: boolean;
  canSeeFactorBreakdown: boolean;
  canSeeEdgeScore: boolean;
  canGetAlerts: boolean;
  dailyPickLimit: number | null;
  canUseTrendLab: boolean;
  canUseParlayMri: boolean;
  canUseClvLedger: boolean;
  canUseFantasyDraftSuite: boolean;
  canUseFantasyFull: boolean;
  canSeeMultiprob: boolean;
  canSeeNoBetDetail: boolean;
  canSeeGlassLedger: boolean;
  canSeeRecompute: boolean;
}

/**
 * Verbatim port of the server function. Tested against the upstream source by
 * `tests/entitlements-parity.test.ts`, which re-reads the TS source from the
 * checked-out sports repo and asserts the tier table matches — so this cannot
 * silently diverge the way the FREE definition once did (CLAUDE.md records
 * that a hand-rolled fallback is "exactly how the two FREE definitions drifted
 * apart").
 */
export function getEntitlements(tier: SubscriptionTier): Entitlements {
  const isPro = tier === "PRO" || tier === "ELITE";
  const isPaid = tier !== "FREE";
  return {
    tier,
    canSeePremiumPicks: isPro,
    canSeeConfidence: isPro,
    canSeeLineMovement: isPro,
    canSeeFactorBreakdown: isPro,
    canSeeEdgeScore: true,
    canGetAlerts: tier === "ELITE",
    dailyPickLimit: isPro ? null : 2,
    canUseTrendLab: isPro,
    canUseParlayMri: isPro,
    canUseClvLedger: tier === "ELITE",
    canUseFantasyDraftSuite: isPaid,
    canUseFantasyFull: isPaid,
    canSeeMultiprob: isPro,
    canSeeNoBetDetail: isPro,
    canSeeGlassLedger: isPro,
    canSeeRecompute: isPro,
  };
}

/** Anonymous viewers resolve through the SAME function as signed-in ones. */
export const ANONYMOUS_TIER: SubscriptionTier = "FREE";

export function tierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case "FREE":
      return "Free";
    case "FANTASY":
      return "Fantasy";
    case "PRO":
      return "Pro";
    case "ELITE":
      return "Elite";
  }
}

/**
 * The tier narrative from `docs/positioning.md`, verbatim. Used on the paywall
 * and nowhere else — these are the three sanctioned sentences.
 */
export const TIER_NARRATIVE: Record<SubscriptionTier, string> = {
  FREE: "See it. One pick a day plus public surfaces.",
  FANTASY: "Draft it. The fantasy suite, separate from the betting line.",
  PRO: "Bet it. Every pick, confidence, reasoning, factor breakdown, and alerts.",
  ELITE: "Master it. Full analysis, advanced tools, weekly learning digest, and early access.",
};

/**
 * Label for a field the viewer is not entitled to.
 *
 * Returns `null` when the field SHOULD be visible, so the caller renders the
 * real value or an honest em dash. A caller that renders the returned string in
 * place of a null value is doing the right thing; a caller that renders it
 * instead of a NON-null value would be hiding data the server chose to send,
 * which is the failure mode this whole file is written to avoid.
 */
export function redactionLabel(field: RedactableField, tier: SubscriptionTier): string | null {
  const e = getEntitlements(tier);
  switch (field) {
    case "confidence":
      return e.canSeeConfidence ? null : "Pro";
    case "factorBreakdown":
      return e.canSeeFactorBreakdown ? null : "Pro";
    case "lineMovement":
      return e.canSeeLineMovement ? null : "Pro";
    case "edgeScore":
      // Public on every pick by design — the free trust signal.
      return null;
    case "multiprob":
      return e.canSeeMultiprob ? null : "Pro";
    case "noBetDetail":
      return e.canSeeNoBetDetail ? null : "Pro";
    case "glassLedger":
      return e.canSeeGlassLedger ? null : "Pro";
    case "recompute":
      return e.canSeeRecompute ? null : "Pro";
    case "alerts":
      return e.canGetAlerts ? null : "Elite";
  }
}

export type RedactableField =
  | "confidence"
  | "factorBreakdown"
  | "lineMovement"
  | "edgeScore"
  | "multiprob"
  | "noBetDetail"
  | "glassLedger"
  | "recompute"
  | "alerts";

/**
 * Route gating for NAVIGATION only.
 *
 * A deferred route still exists and still renders — it renders the honest
 * "what this is and what unlocks it" state rather than being hidden. Hiding a
 * destination from a FREE user while the web shows it would make the app a
 * different product from the site, and the app is not allowed to be.
 */
export const TIER_GATED_ROUTES: Readonly<Record<string, SubscriptionTier>> = {
  "/clv": "ELITE",
  "/trend-lab": "PRO",
  "/parlay-mri": "PRO",
  "/glass-ledger": "PRO",
};

export function routeRequiresTier(routePath: string): SubscriptionTier | null {
  const exact = TIER_GATED_ROUTES[routePath];
  if (exact) return exact;
  for (const [route, tier] of Object.entries(TIER_GATED_ROUTES)) {
    if (routePath.startsWith(`${route}/`)) return tier;
  }
  return null;
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  FANTASY: 1,
  PRO: 2,
  ELITE: 3,
};

export function tierSatisfies(viewer: SubscriptionTier, required: SubscriptionTier): boolean {
  return TIER_RANK[viewer] >= TIER_RANK[required];
}