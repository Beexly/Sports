/**
 * PER-TIER TTL MATRIX — how stale is too stale, for a given source tier.
 *
 * `signal-lineage.ts` carries `sourceTier` (1 Official .. 6 Synthetic/AI) and
 * `freshnessMinutes` per factor, but nothing had ever encoded HOW stale is too
 * stale for a given tier. A single global staleness threshold is wrong here
 * the same way a single global odds-freshness threshold was wrong in
 * `freshness-schedule.ts`: an hours-old Tier-3 trusted-secondary stat is fine,
 * but a 20-minute-old Tier-1 injury report on game day is not — the injury
 * could have been REVERSED since. The honest gate is per-tier, and injury
 * context on game day is stricter still than the tier's own standard TTL.
 *
 * This module supplies the TTL DATA. It does not, by itself, decide what
 * copy renders — that is `isStaleForTier` plus whatever caller wires it into
 * a factor display (see `signal-lineage.ts` for the analogous throw-never-
 * render-partial style this deliberately mirrors in spirit, though staleness
 * here is advisory metadata rather than a hard refusal).
 */

import type { SourceTier } from "./signal-lineage";

const MINUTE = 1;
const HOUR = 60 * MINUTE;

/**
 * Standard TTL (minutes) per tier, and — for Tier 1 only — a stricter TTL
 * that applies specifically to injury-context data on game day, when a
 * report can be reversed in the time it takes a beat reporter to file an
 * update.
 */
export interface TierTtlEntry {
  readonly tier: SourceTier;
  readonly standardMinutes: number;
  /** Tier-1 game-day-injury override; null for every other tier. */
  readonly gameDayInjuryMinutes: number | null;
}

/**
 * The doctrine TTLs, as data.
 *
 * Tier 1 (Official)          — 15 min standard, 5 min for game-day injury context.
 * Tier 2 (Licensed, live)    — 2 min. Live odds/lines move by the second near kickoff.
 * Tier 3 (Trusted secondary) — 2 hr. Contextual stats change slowly.
 * Tier 4 (Market signal)     — 30 min. Derived from live odds; tracks their cadence
 *                               loosely rather than as tightly as the raw feed itself.
 * Tier 5 (Community/weak)    — 6 hr. Low-stakes context; staleness matters less
 *                               because the confidence in the signal is already low.
 * Tier 6 (Synthetic/AI)      — 24 hr. Generated content, not a live read of reality;
 *                               "stale" is a different question than for a live feed.
 */
export const TIER_TTL_MATRIX: readonly TierTtlEntry[] = [
  { tier: 1, standardMinutes: 15, gameDayInjuryMinutes: 5 },
  { tier: 2, standardMinutes: 2 * MINUTE, gameDayInjuryMinutes: null },
  { tier: 3, standardMinutes: 2 * HOUR, gameDayInjuryMinutes: null },
  { tier: 4, standardMinutes: 30, gameDayInjuryMinutes: null },
  { tier: 5, standardMinutes: 6 * HOUR, gameDayInjuryMinutes: null },
  { tier: 6, standardMinutes: 24 * HOUR, gameDayInjuryMinutes: null },
];

const MATRIX_BY_TIER: ReadonlyMap<SourceTier, TierTtlEntry> = new Map(
  TIER_TTL_MATRIX.map((e) => [e.tier, e]),
);

export function tierTtlEntry(tier: SourceTier): TierTtlEntry {
  const entry = MATRIX_BY_TIER.get(tier);
  if (!entry) throw new RangeError(`tierTtlEntry: no TTL entry for tier ${String(tier)}`);
  return entry;
}

export interface StalenessContext {
  /** True when this factor is injury-context AND the game is today. */
  readonly isGameDayInjury?: boolean;
}

/**
 * The TTL (minutes) that applies to `tier` under `context`. Game-day injury
 * context on Tier 1 gets the stricter override; every other case gets the
 * tier's standard TTL.
 */
export function ttlMinutesFor(tier: SourceTier, context: StalenessContext = {}): number {
  const entry = tierTtlEntry(tier);
  if (context.isGameDayInjury && entry.gameDayInjuryMinutes !== null) {
    return entry.gameDayInjuryMinutes;
  }
  return entry.standardMinutes;
}

/**
 * Is a factor of `tier`, aged `ageMinutes`, stale under `context`? Ages
 * beyond the applicable TTL are stale; exactly at the TTL is NOT yet stale
 * (a `>` comparison, matching `freshness-schedule.ts`'s own convention of
 * treating the boundary as still fresh).
 */
export function isStaleForTier(
  tier: SourceTier,
  ageMinutes: number,
  context: StalenessContext = {},
): boolean {
  if (!Number.isFinite(ageMinutes) || ageMinutes < 0) return true;
  return ageMinutes > ttlMinutesFor(tier, context);
}

/**
 * Freshness-implying words a caller must not pair with data that has
 * breached its tier TTL. Word-boundary, case-insensitive.
 */
const FRESHNESS_CLAIM_WORDS = ["current", "live", "confirmed", "up to date", "up-to-date"] as const;

/**
 * Does `copy` claim freshness ("current", "live", "confirmed", ...) for a
 * datapoint whose tier TTL is breached? Returns the offending word, or null
 * when the copy is honest (either not stale, or stale but making no
 * freshness claim). Pure — this is the gate FUNCTION's contract; wiring it
 * into a specific render path is left to the caller, same division of labor
 * as `isStaleForTier` itself.
 */
export function stalenessCopyViolation(
  copy: string,
  tier: SourceTier,
  ageMinutes: number,
  context: StalenessContext = {},
): string | null {
  if (!isStaleForTier(tier, ageMinutes, context)) return null;
  for (const word of FRESHNESS_CLAIM_WORDS) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\b`, "i");
    if (re.test(copy)) return word;
  }
  return null;
}

export class StalenessCopyError extends Error {
  constructor(readonly word: string, readonly tier: SourceTier, readonly ageMinutes: number) {
    super(
      `Copy claims "${word}" for a Tier ${tier} datapoint aged ${ageMinutes}m, past its ` +
        `${ttlMinutesFor(tier)}m TTL — a stale datapoint may not be described as current, live, or confirmed.`,
    );
    this.name = "StalenessCopyError";
  }
}

/** Throws `StalenessCopyError` when `copy` overclaims freshness for stale data. */
export function assertNoStaleFreshnessClaim(
  copy: string,
  tier: SourceTier,
  ageMinutes: number,
  context: StalenessContext = {},
): void {
  const word = stalenessCopyViolation(copy, tier, ageMinutes, context);
  if (word !== null) throw new StalenessCopyError(word, tier, ageMinutes);
}
