/**
 * Odds-provider failover (#5) — provider-agnostic logic for combining a primary
 * and a secondary odds source so every game clears MIN_BOOKMAKERS.
 *
 * WHY: a single odds aggregator is a single point of failure — if it is down, or
 * thin on a given game, the engine can't price that game (scoring needs at least
 * MIN_BOOKMAKERS two-sided quotes). A second, INDEPENDENT book aggregator covers
 * both gaps: provider outage and per-game thin coverage.
 *
 * This module is the decision + merge layer, pure and fully testable. The
 * concrete second provider (odds-api.io) is a thin OddsProvider whose HTTP
 * mapping lands once its odds endpoint + rate limits are confirmed; nothing here
 * assumes its wire format. The primary (the-odds-api.com via OddsApiClient) is
 * wrapped to the same interface.
 */

import type { NormalizedOdds } from "@sports/types";

/** A normalized result from one odds provider for one sport fetch. */
export interface OddsProviderResult {
  readonly provider: string;
  readonly odds: readonly NormalizedOdds[];
  /** False when the provider errored / returned nothing usable. */
  readonly healthy: boolean;
  readonly error?: string;
}

/** A source of normalized odds for a sport. Both aggregators implement this. */
export interface OddsProvider {
  readonly name: string;
  fetchNormalized(sportKey: string): Promise<OddsProviderResult>;
}

function dedupeKey(o: NormalizedOdds): string {
  return `${o.gameExternalId}|${o.bookmaker}|${o.market}`;
}

/**
 * Union two providers' normalized odds, de-duplicated by
 * (game, bookmaker, market). The PRIMARY wins on conflict — we only ever ADD
 * bookmakers the primary did not already have, never overwrite its prices.
 */
export function mergeNormalizedOdds(
  primary: readonly NormalizedOdds[],
  secondary: readonly NormalizedOdds[],
): NormalizedOdds[] {
  const seen = new Set<string>(primary.map(dedupeKey));
  const merged: NormalizedOdds[] = [...primary];
  for (const o of secondary) {
    const key = dedupeKey(o);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(o);
  }
  return merged;
}

/** Distinct bookmaker count per game (across all markets). */
export function bookmakerCoverage(odds: readonly NormalizedOdds[]): Map<string, number> {
  const byGame = new Map<string, Set<string>>();
  for (const o of odds) {
    let set = byGame.get(o.gameExternalId);
    if (!set) {
      set = new Set<string>();
      byGame.set(o.gameExternalId, set);
    }
    set.add(o.bookmaker);
  }
  const counts = new Map<string, number>();
  for (const [game, books] of byGame) counts.set(game, books.size);
  return counts;
}

/** Game external ids whose distinct-bookmaker count is below the threshold. */
export function gamesBelowThreshold(
  odds: readonly NormalizedOdds[],
  minBookmakers: number,
): string[] {
  const gaps: string[] = [];
  for (const [game, count] of bookmakerCoverage(odds)) {
    if (count < minBookmakers) gaps.push(game);
  }
  return gaps.sort();
}

export type FailoverReason =
  | "primary-sufficient"
  | "primary-unhealthy"
  | "coverage-gap"
  | "no-secondary";

export interface FailoverOutcome {
  readonly odds: NormalizedOdds[];
  readonly usedSecondary: boolean;
  readonly reason: FailoverReason;
  readonly coverageGapsBefore: string[];
  readonly coverageGapsAfter: string[];
  readonly secondaryError?: string;
}

export interface FailoverInput {
  readonly primary: OddsProviderResult;
  readonly minBookmakers: number;
  /** Lazily invoked ONLY when the secondary is actually needed (cost control). */
  readonly fetchSecondary?: () => Promise<OddsProviderResult>;
}

/**
 * Resolve a sport's odds with failover. The secondary is called ONLY when the
 * primary is unhealthy or leaves at least one game under MIN_BOOKMAKERS — so a
 * healthy, well-covered primary never spends a second request. A secondary that
 * errors degrades gracefully to the primary's odds.
 */
export async function resolveOddsWithFailover(input: FailoverInput): Promise<FailoverOutcome> {
  const primaryOdds = [...input.primary.odds];
  const gapsBefore = gamesBelowThreshold(primaryOdds, input.minBookmakers);
  const needSecondary = !input.primary.healthy || gapsBefore.length > 0;

  if (!needSecondary) {
    return {
      odds: primaryOdds,
      usedSecondary: false,
      reason: "primary-sufficient",
      coverageGapsBefore: gapsBefore,
      coverageGapsAfter: gapsBefore,
    };
  }

  const baseReason: FailoverReason = input.primary.healthy ? "coverage-gap" : "primary-unhealthy";

  if (!input.fetchSecondary) {
    return {
      odds: primaryOdds,
      usedSecondary: false,
      reason: "no-secondary",
      coverageGapsBefore: gapsBefore,
      coverageGapsAfter: gapsBefore,
    };
  }

  let secondary: OddsProviderResult;
  try {
    secondary = await input.fetchSecondary();
  } catch (err) {
    return {
      odds: primaryOdds,
      usedSecondary: false,
      reason: baseReason,
      coverageGapsBefore: gapsBefore,
      coverageGapsAfter: gapsBefore,
      secondaryError: err instanceof Error ? err.message : String(err),
    };
  }

  if (!secondary.healthy || secondary.odds.length === 0) {
    return {
      odds: primaryOdds,
      usedSecondary: false,
      reason: baseReason,
      coverageGapsBefore: gapsBefore,
      coverageGapsAfter: gapsBefore,
      secondaryError: secondary.error,
    };
  }

  const merged = mergeNormalizedOdds(primaryOdds, secondary.odds);
  return {
    odds: merged,
    usedSecondary: true,
    reason: baseReason,
    coverageGapsBefore: gapsBefore,
    coverageGapsAfter: gamesBelowThreshold(merged, input.minBookmakers),
  };
}
