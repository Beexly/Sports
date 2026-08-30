/**
 * Watchlist — eligibility and dedupe rules.
 *
 * Tier decision (see CLAUDE.md's Subscription Tiers table):
 *   - FOLLOWING is the sticky-engagement primitive itself (the scores24
 *     teardown's proven per-entity subscribe loop). It is open to every
 *     authenticated tier, including FREE — gating the follow action itself
 *     would defeat the point of building an adoption/retention primitive.
 *     FREE/FANTASY get a modest follow cap; PRO gets a much higher cap;
 *     ELITE is unlimited. This keeps the action free while still giving the
 *     product a genuine, testable upgrade path (a real 403 + upsell, not a
 *     cosmetic one) for anyone who wants to track more than a handful of
 *     teams/players.
 *   - REAL-TIME ALERTS are the Elite-exclusive feature per CLAUDE.md's tier
 *     table ("All Pro + real-time email & push alerts"). This module does
 *     NOT re-decide that — it reuses `Entitlements.canGetAlerts`
 *     (packages/types/src/index.ts), which is already `tier === "ELITE"`,
 *     as the single source of truth. See alert-eligibility.ts for how that
 *     combines with the graded-only doctrine.
 *
 * Pure module — no DB, no env, no auth. Fully unit-testable.
 */

import type { SubscriptionTier } from "@sports/types";
import type { WatchlistEntry, WatchlistTarget } from "./types";

/**
 * Max follows per tier. `null` = unlimited. FREE/FANTASY share a cap (both
 * are non-betting-board tiers); PRO gets a materially higher cap; ELITE is
 * unlimited. These numbers are a reasonable, easily-tunable default — no
 * product research backs the exact figures, only the ordering (paid tiers
 * get more room).
 */
export const WATCHLIST_FOLLOW_LIMITS: Record<SubscriptionTier, number | null> = {
  FREE: 5,
  FANTASY: 5,
  PRO: 25,
  ELITE: null,
};

/** The tier a FREE/FANTASY user would need to upgrade to for a materially
 *  higher cap. Used to shape the 403 upsell payload. */
export const WATCHLIST_UPGRADE_TIER: SubscriptionTier = "PRO";

export function followLimitForTier(tier: SubscriptionTier): number | null {
  return WATCHLIST_FOLLOW_LIMITS[tier];
}

/** True when `currentCount` more follows would exceed `tier`'s cap.
 *  Unlimited (`null` limit) never blocks. */
export function isOverFollowLimit(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = followLimitForTier(tier);
  if (limit === null) return false;
  return currentCount >= limit;
}

/** Every tier may follow — the gate is the per-tier cap above, not the
 *  action itself. Kept as an explicit named predicate (rather than inlining
 *  `true`) so the "who may follow" decision has one call site to change. */
export function canFollowEntities(_tier: SubscriptionTier): boolean {
  return true;
}

/** True when `existing` already contains `target` (same entityType +
 *  entityId). Used to keep follow idempotent: re-following an
 *  already-followed entity must never be blocked by the follow cap. */
export function isAlreadyFollowing(
  existing: readonly Pick<WatchlistEntry, "entityType" | "entityId">[],
  target: WatchlistTarget,
): boolean {
  return existing.some(
    (e) => e.entityType === target.entityType && e.entityId === target.entityId,
  );
}

/** De-duplicates a list of targets/entries by (entityType, entityId),
 *  keeping the first occurrence. Pure helper for any caller that needs to
 *  fold a list down before persisting or rendering. */
export function dedupeWatchlistTargets<T extends WatchlistTarget>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = `${item.entityType}::${item.entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
