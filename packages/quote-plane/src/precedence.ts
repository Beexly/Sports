/**
 * FREE-quote intake precedence for SituationSnapshot / book market-state.
 *
 * Separate from KIND_RANK in aggregate.ts (prediction_market → exchange → …).
 * This ladder is sportsbook market-state only; Kalshi/PM independence mesh untouched.
 *
 * Tier doctrine:
 *   A — provenance-grade (citeAllowed when source clears)
 *   B — internal SIGNAL (Apify: never cite as provenance)
 *
 * OddsPapi: secondary complement; certifiableForLiveGate=false pending legal read.
 */

export const FREE_QUOTE_PRECEDENCE = [
  "rundown",
  "sharp_x3",
  "odds_free",
  "parlay",
  "oddspapi",
  "apify",
] as const;

export type FreeQuoteTier = (typeof FREE_QUOTE_PRECEDENCE)[number];

/** Tier-B market-state only — never cited as provenance behind a published claim. */
const TIER_B_ONLY: ReadonlySet<FreeQuoteTier> = new Set(["apify"]);

/**
 * Sources that must not certify a live-gate path (internal analytics only).
 * OddsPapi: Motif 2026-09-18 — secondary; legal read pending.
 */
const LIVE_GATE_UNCERTIFIABLE: ReadonlySet<FreeQuoteTier> = new Set([
  "oddspapi",
  "apify",
]);

export function isFreeQuoteTier(value: string): value is FreeQuoteTier {
  return (FREE_QUOTE_PRECEDENCE as readonly string[]).includes(value);
}

/** Lower index = higher precedence (earlier wins). Unknown → after last known. */
export function tierIndex(sourceId: string): number {
  const i = (FREE_QUOTE_PRECEDENCE as readonly string[]).indexOf(sourceId);
  return i >= 0 ? i : FREE_QUOTE_PRECEDENCE.length;
}

/** True when a is strictly earlier (higher priority) than b on the free ladder. */
export function earlierWins(a: string, b: string): boolean {
  return tierIndex(a) < tierIndex(b);
}

/** Apify (and any future Tier-B-only ids) — market-state mesh only. */
export function isTierBOnly(sourceId: string): boolean {
  return TIER_B_ONLY.has(sourceId as FreeQuoteTier);
}

/**
 * Whether this free-ladder source may appear in citeEligibleSources /
 * public-claim provenance. Apify always false.
 */
export function citeAllowed(sourceId: string): boolean {
  if (!isFreeQuoteTier(sourceId)) return false;
  return !isTierBOnly(sourceId);
}

/**
 * Whether this free-ladder source may certify a live-gate path.
 * OddsPapi and Apify are always false.
 */
export function certifiableForLiveGate(sourceId: string): boolean {
  if (!isFreeQuoteTier(sourceId)) return false;
  return !LIVE_GATE_UNCERTIFIABLE.has(sourceId);
}
