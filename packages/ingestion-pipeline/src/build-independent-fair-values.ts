/**
 * Build independentFairValues for OddsInput.context from REAL stored results.
 *
 * Sources (null = honest no opinion):
 *  1) Poisson team rates from TeamGameLog (soccer / icehockey / baseball only)
 *  2) Elo fitted from chronological TeamGameLog results (any sport with history)
 *  3) Kalshi — only when a pre-fetched IndependentMarketFairValue is passed in
 *
 * Never synthesizes λ or ratings. Never invents book lines.
 */

import {
  getTeamScoringRecords,
  getLeagueAverageScored,
} from "@sports/data-ingestion";
import {
  isPoissonValidSport,
  poissonIndependentFairValue,
  fitEloRatingsFromResults,
  eloFairValueFromRatings,
  type EloResultGame,
} from "@sports/prediction-engine";
import type { IndependentMarketFairValue } from "@sports/types";
import { db } from "@sports/db";

export type IndependentFairValueBuildInput = {
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: Date;
  /** Optional pre-fetched Kalshi (or other) fair values — already independent. */
  readonly prefetched?: readonly IndependentMarketFairValue[];
  /** Injected clock for deterministic capturedAt on Elo. */
  readonly now?: () => Date;
};

/**
 * Load completed games for a sport before `before` for Elo fit.
 * Caps at 2000 most recent to keep refresh cycles bounded.
 */
export async function loadSportResultGamesForElo(
  sportKey: string,
  before: Date,
): Promise<EloResultGame[]> {
  // TeamGameLog is one row per team per game — pair home/away via gameId.
  const logs = await db.teamGameLog.findMany({
    where: {
      sport: sportKey,
      teamScore: { not: null },
      opponentScore: { not: null },
      gameDate: { lt: before },
    },
    orderBy: { gameDate: "desc" },
    take: 4000,
    select: {
      gameId: true,
      teamName: true,
      opponentName: true,
      teamScore: true,
      opponentScore: true,
      isHome: true,
      gameDate: true,
    },
  });

  // Prefer home-side rows (isHome true) so each game appears once.
  const byGame = new Map<string, EloResultGame>();
  for (const row of logs) {
    if (row.teamScore == null || row.opponentScore == null) continue;
    if (row.isHome === false) continue;
    if (byGame.has(row.gameId)) continue;
    byGame.set(row.gameId, {
      homeTeam: row.teamName,
      awayTeam: row.opponentName,
      homeScore: row.teamScore,
      awayScore: row.opponentScore,
      gameDate: row.gameDate,
    });
  }
  // If isHome never set, fall back: first seen row as "home" (weaker but honest).
  if (byGame.size === 0) {
    for (const row of logs) {
      if (row.teamScore == null || row.opponentScore == null) continue;
      if (byGame.has(row.gameId)) continue;
      byGame.set(row.gameId, {
        homeTeam: row.teamName,
        awayTeam: row.opponentName,
        homeScore: row.teamScore,
        awayScore: row.opponentScore,
        gameDate: row.gameDate,
      });
    }
  }
  return [...byGame.values()];
}

/** Cache Elo ratings per sport+date bucket within a single processSport cycle. */
export type EloRatingsCache = Map<string, Map<string, number>>;

export async function getOrFitEloRatings(
  cache: EloRatingsCache,
  sportKey: string,
  before: Date,
): Promise<Map<string, number>> {
  const key = `${sportKey}|${before.toISOString().slice(0, 10)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const games = await loadSportResultGamesForElo(sportKey, before);
  const ratings = fitEloRatingsFromResults(games);
  cache.set(key, ratings);
  return ratings;
}

/**
 * Assemble independent fair values for one game. Empty array = no opinion.
 */
export async function buildIndependentFairValues(
  input: IndependentFairValueBuildInput,
  eloCache: EloRatingsCache = new Map(),
): Promise<IndependentMarketFairValue[]> {
  const out: IndependentMarketFairValue[] = [];
  const now = input.now ?? (() => new Date());

  // 1) Prefetched (e.g. Kalshi) — already independent, never book-echo.
  if (input.prefetched) {
    for (const fv of input.prefetched) {
      if (
        (fv.homeFairProb != null && Number.isFinite(fv.homeFairProb)) ||
        (fv.awayFairProb != null && Number.isFinite(fv.awayFairProb))
      ) {
        out.push(fv);
      }
    }
  }

  // 2) Poisson from real TeamGameLog rates (valid sports only).
  if (isPoissonValidSport(input.sportKey)) {
    try {
      const [homeRecords, awayRecords, leagueAvg] = await Promise.all([
        getTeamScoringRecords(
          input.homeTeam,
          input.sportKey,
          20,
          input.commenceTime,
        ),
        getTeamScoringRecords(
          input.awayTeam,
          input.sportKey,
          20,
          input.commenceTime,
        ),
        getLeagueAverageScored(input.sportKey, input.commenceTime),
      ]);
      if (leagueAvg != null && leagueAvg > 0) {
        const poisson = poissonIndependentFairValue({
          sportKey: input.sportKey,
          homeRecords,
          awayRecords,
          leagueAvgScored: leagueAvg,
        });
        if (poisson) {
          out.push({
            source: "poisson",
            homeFairProb: poisson.homeFairProb,
            awayFairProb: poisson.awayFairProb,
            capturedAt: now().toISOString(),
          });
        }
      }
    } catch {
      // Soft-fail: null opinion is honest.
    }
  }

  // 3) Elo from chronological results.
  try {
    const ratings = await getOrFitEloRatings(
      eloCache,
      input.sportKey,
      input.commenceTime,
    );
    const elo = eloFairValueFromRatings(
      ratings,
      input.homeTeam,
      input.awayTeam,
      { now },
    );
    if (elo) out.push(elo);
  } catch {
    // Soft-fail.
  }

  return out;
}
