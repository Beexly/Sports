/**
 * Build independentFairValues for OddsInput.context from REAL stored results.
 *
 * Sources (null = honest no opinion):
 *  1) Prefetched (Kalshi / caller-supplied)
 *  2) Kalshi live fair (when league mappable + team abbr resolvable)
 *  3) ESPN PowerIndex logistic (NFL/CFB/NBA/NCAAB when FPI available)
 *  4) Poisson team rates from TeamGameLog (soccer / icehockey / baseball only)
 *  5) Elo fitted from chronological TeamGameLog results
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

export type IndependentFairValueBuildInput = {
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: Date;
  /** Optional pre-fetched Kalshi (or other) fair values — already independent. */
  readonly prefetched?: readonly IndependentMarketFairValue[];
  /** Injected clock for deterministic capturedAt on Elo. */
  readonly now?: () => Date;
  /** Skip live network independents (Kalshi / ESPN) — tests. */
  readonly skipNetworkIndependents?: boolean;
};

/**
 * Map Odds-API sport keys → Kalshi league codes.
 */
export function sportKeyToKalshiLeague(sportKey: string): KalshiLeague | null {
  const k = sportKey.trim().toLowerCase();
  if (k === "americanfootball_nfl" || k === "nfl") return "NFL";
  if (k === "basketball_nba" || k === "nba") return "NBA";
  if (k === "baseball_mlb" || k === "mlb") return "MLB";
  if (k === "icehockey_nhl" || k === "nhl") return "NHL";
  return null;
}

/**
 * Best-effort team abbreviation for Kalshi tickers.
 * Prefer last 2–3 letter token; uppercase. Returns null if unusable.
 * Full abbr tables can replace this later — null is honest no-opinion.
 */
export function guessKalshiTeamAbbr(teamName: string): string | null {
  const t = teamName.trim();
  if (!t) return null;
  // Already short abbr
  if (/^[A-Za-z]{2,4}$/.test(t)) return t.toUpperCase();
  // Common patterns: "NYK", "LAL" embedded
  const paren = t.match(/\(([A-Za-z]{2,4})\)/);
  if (paren?.[1]) return paren[1].toUpperCase();
  // Use first letters of multi-word (Dallas Cowboys → DC — often wrong for Kalshi)
  // Prefer known last-token city nicknames are caller concern; only accept 2–3
  // letter final tokens that look like abbrs.
  const parts = t.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (last.length >= 2 && last.length <= 3 && /^[A-Za-z]+$/.test(last)) {
    return last.toUpperCase();
  }
  // City + nick: take first 3 of last word if longer (Cowboys → COW — often wrong)
  // Skip unreliable guesses for long nicknames.
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
  const homeAbbr = guessKalshiTeamAbbr(input.homeTeam);
  const awayAbbr = guessKalshiTeamAbbr(input.awayTeam);
  if (!homeAbbr || !awayAbbr) return null;

  const dateUtc = input.commenceTime.toISOString().slice(0, 10);
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

  // 2) Live Kalshi (when mappable) — exchange yes mid as independent P.
  if (!input.skipNetworkIndependents && !input.prefetched?.some((f) => f.source === "kalshi")) {
    const kalshi = await tryKalshiFairValue(input);
    if (kalshi) out.push(kalshi);
  }

  // 3) ESPN PowerIndex logistic (NFL/CFB/NBA/NCAAB).
  if (!input.skipNetworkIndependents) {
    const fpi = await tryEspnPowerIndexFairValue(input);
    if (fpi) out.push(fpi);
  }

  // 4) Poisson from real TeamGameLog rates (valid sports only).
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

  // 5) Elo from chronological results.
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
