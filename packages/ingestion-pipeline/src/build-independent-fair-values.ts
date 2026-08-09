/**
 * Build independentFairValues for OddsInput.context from REAL stored results.
 *
 * Sources (null = honest no opinion):
 *  1) Prefetched (Kalshi / caller-supplied)
 *  2) Kalshi live fair (series-aware; multi-league)
 *  3) ESPN PowerIndex logistic (NFL/CFB/NBA/NCAAB when FPI available)
 *  4) ClubElo soccer (Fixtures W/D/L → 2-way, else rating logistic)
 *  5) Poisson team rates from TeamGameLog (soccer / icehockey / baseball only)
 *  6) Elo fitted from chronological TeamGameLog results
 *  7) Polymarket Gamma internal estimator — ONLY when INDEPENDENT_POLYMARKET=1
 *     (compliance hold: not product, not cron clear)
 *
 * Never synthesizes λ, ratings, or FPI. Never invents book lines.
 * Edge is NOT a probability — consumers must use trueProb / homeFairProb only.
 */

import {
  getTeamScoringRecords,
  getLeagueAverageScored,
  KalshiClient,
  toIndependentFairValue,
  type KalshiLeague,
  type KalshiGameRef,
  sportKeyToPowerIndexLeague,
  getCachedEspnPowerIndexMap,
  lookupTeamFpi,
  defaultPowerIndexSeason,
  sportKeyToKalshiLeagueCode,
  getSharedClubEloClient,
  isClubEloSport,
  isPolymarketIndependentEnabled,
  PolymarketIndependentClient,
} from "@sports/data-ingestion";
import {
  isPoissonValidSport,
  poissonIndependentFairValue,
  fitEloRatingsFromResults,
  eloFairValueFromRatings,
  powerIndexToIndependentFairValue,
  type EloResultGame,
} from "@sports/prediction-engine";
import type { IndependentMarketFairValue } from "@sports/types";
import { db } from "@sports/db";
import { resolveKalshiTeamAbbr } from "./kalshi-team-abbr.js";

export type IndependentFairValueBuildInput = {
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: Date;
  /** Optional pre-fetched Kalshi (or other) fair values — already independent. */
  readonly prefetched?: readonly IndependentMarketFairValue[];
  /** Injected clock for deterministic capturedAt on Elo. */
  readonly now?: () => Date;
  /** Skip live network independents (Kalshi / ESPN / ClubElo / Polymarket) — tests. */
  readonly skipNetworkIndependents?: boolean;
};

/**
 * Map Odds-API sport keys → Kalshi league codes (expanded multi-league harvest).
 */
export function sportKeyToKalshiLeague(sportKey: string): KalshiLeague | null {
  return sportKeyToKalshiLeagueCode(sportKey);
}

/**
 * Best-effort team abbreviation for Kalshi tickers.
 * Uses league-specific name tables first; falls back to short tokens only.
 * Full names without a map hit → null (honest no-opinion).
 */
export function guessKalshiTeamAbbr(
  teamName: string,
  league?: KalshiLeague | null,
): string | null {
  if (league) {
    const mapped = resolveKalshiTeamAbbr(league, teamName);
    if (mapped) return mapped;
  }
  const t = teamName.trim();
  if (!t) return null;
  if (/^[A-Za-z]{2,6}$/.test(t)) return t.toUpperCase();
  const paren = t.match(/\(([A-Za-z]{2,6})\)/);
  if (paren?.[1]) return paren[1].toUpperCase();
  return null;
}

/**
 * Load completed games for a sport before `before` for Elo fit.
 * Caps at 2000 most recent to keep refresh cycles bounded.
 */
export async function loadSportResultGamesForElo(
  sportKey: string,
  before: Date,
): Promise<EloResultGame[]> {
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

async function tryKalshiFairValue(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue | null> {
  const league = sportKeyToKalshiLeague(input.sportKey);
  if (!league) return null;
  const homeAbbr = guessKalshiTeamAbbr(input.homeTeam, league);
  const awayAbbr = guessKalshiTeamAbbr(input.awayTeam, league);
  if (!homeAbbr || !awayAbbr) return null;

  // Prefer full ISO commence so MLB time-fragment construction can help;
  // series search still recovers pure date-only misses.
  const dateUtc = input.commenceTime.toISOString();
  const game: KalshiGameRef = {
    league,
    dateUtc,
    awayAbbr,
    homeAbbr,
  };
  try {
    const client = new KalshiClient({ now: input.now });
    const fv = await client.getFairValue(game);
    const indep = toIndependentFairValue(fv, homeAbbr, awayAbbr);
    if (
      (indep.homeFairProb != null && Number.isFinite(indep.homeFairProb)) ||
      (indep.awayFairProb != null && Number.isFinite(indep.awayFairProb))
    ) {
      return indep;
    }
  } catch {
    // Soft-fail: no Kalshi coverage / network — honest null.
  }
  return null;
}

async function tryEspnPowerIndexFairValue(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue | null> {
  const league = sportKeyToPowerIndexLeague(input.sportKey);
  if (!league) return null;
  try {
    const season = defaultPowerIndexSeason(input.now?.() ?? new Date());
    const map = await getCachedEspnPowerIndexMap(league, season);
    if (map.size === 0) return null;
    const homeFpi = lookupTeamFpi(map, input.homeTeam);
    const awayFpi = lookupTeamFpi(map, input.awayTeam);
    if (homeFpi == null || awayFpi == null) return null;
    return powerIndexToIndependentFairValue(
      {
        homeFpi,
        awayFpi,
        sportKey: input.sportKey,
      },
      { now: input.now },
    );
  } catch {
    return null;
  }
}

async function tryClubEloFairValue(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue | null> {
  if (!isClubEloSport(input.sportKey)) return null;
  try {
    const client = getSharedClubEloClient(input.now);
    return await client.getFairValue({
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      commenceTime: input.commenceTime,
    });
  } catch {
    return null;
  }
}

async function tryPolymarketIndependentFairValue(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue | null> {
  // Compliance hold: default OFF. Internal estimator only.
  if (!isPolymarketIndependentEnabled()) return null;
  try {
    const client = new PolymarketIndependentClient({ now: input.now });
    return await client.getFairValue({
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
    });
  } catch {
    return null;
  }
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

  // 2) Live Kalshi (series-aware, multi-league) — exchange yes mid as independent P.
  if (!input.skipNetworkIndependents && !input.prefetched?.some((f) => f.source === "kalshi")) {
    const kalshi = await tryKalshiFairValue(input);
    if (kalshi) out.push(kalshi);
  }

  // 3) ESPN PowerIndex logistic (NFL/CFB/NBA/NCAAB).
  if (!input.skipNetworkIndependents) {
    const fpi = await tryEspnPowerIndexFairValue(input);
    if (fpi) out.push(fpi);
  }

  // 4) ClubElo soccer (free CSV) — Fixtures or rating logistic.
  if (
    !input.skipNetworkIndependents &&
    !input.prefetched?.some((f) => f.source === "clubelo")
  ) {
    const clubelo = await tryClubEloFairValue(input);
    if (clubelo) out.push(clubelo);
  }

  // 5) Poisson from real TeamGameLog rates (valid sports only).
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

  // 6) Elo from chronological results.
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

  // 7) Polymarket Gamma internal (env-gated compliance hold).
  if (
    !input.skipNetworkIndependents &&
    !input.prefetched?.some((f) => f.source === "polymarket_gamma_internal")
  ) {
    const pm = await tryPolymarketIndependentFairValue(input);
    if (pm) out.push(pm);
  }

  return out;
}
