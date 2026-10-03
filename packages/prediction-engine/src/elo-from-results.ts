/**
 * Fit team Elo ratings from chronological completed results (no market data).
 * Used to populate independentFairValues when a dedicated ratings store is absent.
 * Pure — caller supplies already-fetched game rows.
 */

import { eloWinProbability, updateEloRatings, toEloFairValue } from "./elo-estimator.js";
import type { IndependentMarketFairValue } from "@sports/types";

export type EloResultGame = {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number;
  readonly awayScore: number;
  /** ISO or epoch; used for chronological sort only. */
  readonly gameDate: string | number | Date;
};

const DEFAULT_RATING = 1500;

function toTime(d: string | number | Date): number {
  if (typeof d === "number") return d;
  if (d instanceof Date) return d.getTime();
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Sequential Elo over completed games. Returns final rating map after all games.
 * Games with equal scores (draws) are skipped for updates (binary Elo).
 */
export function fitEloRatingsFromResults(
  games: readonly EloResultGame[],
  options?: { readonly k?: number; readonly homeAdvantage?: number },
): Map<string, number> {
  const ratings = new Map<string, number>();
  const k = options?.k ?? 20;
  const ordered = [...games].sort((a, b) => toTime(a.gameDate) - toTime(b.gameDate));

  for (const g of ordered) {
    if (!Number.isFinite(g.homeScore) || !Number.isFinite(g.awayScore)) continue;
    if (g.homeScore === g.awayScore) continue; // binary Elo: skip draws
    const homeR = ratings.get(g.homeTeam) ?? DEFAULT_RATING;
    const awayR = ratings.get(g.awayTeam) ?? DEFAULT_RATING;
    const homeWon = g.homeScore > g.awayScore;
    const next = updateEloRatings(homeR, awayR, homeWon, k, {
      homeAdvantage: options?.homeAdvantage,
    });
    ratings.set(g.homeTeam, next.home);
    ratings.set(g.awayTeam, next.away);
  }
  return ratings;
}

/**
 * Independent fair value for a matchup from an Elo rating map.
 * Returns null if either team is missing (no opinion).
 */
export function eloFairValueFromRatings(
  ratings: ReadonlyMap<string, number>,
  homeTeam: string,
  awayTeam: string,
  options?: {
    readonly homeAdvantage?: number;
    readonly now?: () => Date;
    /** Require both teams to have played (rating ≠ default-only). */
    readonly requireRated?: boolean;
  },
): IndependentMarketFairValue | null {
  if (!ratings.has(homeTeam) || !ratings.has(awayTeam)) {
    if (options?.requireRated !== false) return null;
  }
  const homeR = ratings.get(homeTeam);
  const awayR = ratings.get(awayTeam);
  if (homeR == null || awayR == null) return null;
  // Need some signal: refuse pure default-vs-default (both never played).
  if (homeR === DEFAULT_RATING && awayR === DEFAULT_RATING) return null;

  return toEloFairValue(homeR, awayR, {
    homeAdvantage: options?.homeAdvantage,
    now: options?.now,
  });
}

/** Debug helper — P(home) from ratings without IndependentMarketFairValue wrapper. */
export function eloHomeWinFromRatings(
  ratings: ReadonlyMap<string, number>,
  homeTeam: string,
  awayTeam: string,
  homeAdvantage = 65,
): number | null {
  const homeR = ratings.get(homeTeam);
  const awayR = ratings.get(awayTeam);
  if (homeR == null || awayR == null) return null;
  return eloWinProbability(homeR, awayR, { homeAdvantage });
}
