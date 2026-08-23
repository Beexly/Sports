/**
 * Build independentFairValues for OddsInput.context from REAL stored results.
 *
 * Sources (null = honest no opinion):
 *  1) Prefetched (Kalshi / caller-supplied)
 *  2) Kalshi live fair (series-aware; multi-league)
 *  3) ESPN PowerIndex logistic (NFL/CFB/NBA/NCAAB when FPI available)
 *  4) ClubElo soccer (Fixtures W/D/L → 2-way, else rating logistic)
 *  5) Rate-model independent: Dixon–Coles on soccer (not double-counted with Poisson);
 *     independent Poisson on icehockey / baseball
 *  6) MLB Stats API standings win% logistic (free official; summer Brier lever)
 *  7) Elo fitted from chronological TeamGameLog results
 *  8) Polymarket Gamma internal estimator — ONLY when INDEPENDENT_POLYMARKET=1
 *     (compliance hold: not product, not cron clear)
 *  9) NFL opponent-adjusted EPA/play from TeamGameEfficiency (nflverse) when rows exist
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
  fetchMlbStandings,
  buildMlbWinPctLookup,
  lookupMlbWinPct,
} from "@sports/data-ingestion";
import {
  isPoissonValidSport,
  poissonIndependentFairValue,
  isDixonColesValidSport,
  dixonColesIndependentFairValue,
  fitEloRatingsFromResults,
  eloFairValueFromRatings,
  powerIndexToIndependentFairValue,
  standingsWinPctToIndependentFairValue,
  nflEpaToIndependentFairValue,
  opponentAdjustedRatings,
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
  // League-scoped resolve only — blind short passthrough without a league table
  // is polarity poison (CHW≠CWS, GS≠GSW). No league → no opinion.
  if (!league) return null;
  return resolveKalshiTeamAbbr(league, teamName);
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

/** In-process cache for MLB standings within one refresh cycle. */
let mlbStandingsCache:
  | { readonly season: number; readonly at: number; readonly rows: Awaited<ReturnType<typeof fetchMlbStandings>> }
  | null = null;

async function tryMlbStandingsFairValue(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue | null> {
  if (!input.sportKey.includes("baseball_mlb") && input.sportKey !== "mlb") {
    return null;
  }
  try {
    const season = input.commenceTime.getUTCFullYear();
    const nowMs = (input.now ?? (() => new Date()))().getTime();
    if (
      !mlbStandingsCache ||
      mlbStandingsCache.season !== season ||
      nowMs - mlbStandingsCache.at > 30 * 60 * 1000
    ) {
      const rows = await fetchMlbStandings({ season });
      mlbStandingsCache = { season, at: nowMs, rows };
    }
    if (mlbStandingsCache.rows.length === 0) return null;
    const lookup = buildMlbWinPctLookup(mlbStandingsCache.rows);
    const homeWp = lookupMlbWinPct(lookup, input.homeTeam);
    const awayWp = lookupMlbWinPct(lookup, input.awayTeam);
    if (homeWp == null || awayWp == null) return null;
    // Games played from standings row (wins+losses) when we can soft-match name
    const findGames = (team: string): number | undefined => {
      const key = team.toLowerCase();
      for (const r of mlbStandingsCache!.rows) {
        if (
          r.name.toLowerCase() === key ||
          r.name.toLowerCase().includes(key) ||
          key.includes(r.name.toLowerCase())
        ) {
          return r.wins + r.losses;
        }
      }
      return undefined;
    };
    return standingsWinPctToIndependentFairValue(
      {
        homeWinPct: homeWp,
        awayWinPct: awayWp,
        homeGames: findGames(input.homeTeam),
        awayGames: findGames(input.awayTeam),
        source: "mlb_standings",
      },
      { now: input.now },
    );
  } catch {
    return null;
  }
}

/** Season cache for NFL EPA ratings within one process cycle. */
const nflEpaRatingsCache = new Map<
  number,
  { readonly at: number; readonly byTeam: Map<string, { overall: number; games: number }> }
>();

async function tryNflEpaFairValue(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue | null> {
  if (
    input.sportKey !== "americanfootball_nfl" &&
    input.sportKey !== "nfl"
  ) {
    return null;
  }
  try {
    const season = input.commenceTime.getUTCFullYear();
    // NFL calendar: Jan–Feb games belong to prior season year label in nflverse
    const month = input.commenceTime.getUTCMonth(); // 0-based
    const nflSeason = month <= 1 ? season - 1 : season;
    const nowMs = (input.now ?? (() => new Date()))().getTime();
    let entry = nflEpaRatingsCache.get(nflSeason);
    if (!entry || nowMs - entry.at > 30 * 60 * 1000) {
      const rows = await db.teamGameEfficiency.findMany({
        where: { season: nflSeason },
        select: {
          team: true,
          opponent: true,
          offEpaPerPlay: true,
          defEpaPerPlay: true,
        },
        take: 5000,
      });
      if (rows.length === 0) {
        nflEpaRatingsCache.set(nflSeason, {
          at: nowMs,
          byTeam: new Map(),
        });
        return null;
      }
      const games = rows.map((r) => ({
        team: r.team,
        opponent: r.opponent,
        offValue: r.offEpaPerPlay,
        defValue: r.defEpaPerPlay,
      }));
      const ratings = opponentAdjustedRatings(games);
      const byTeam = new Map<string, { overall: number; games: number }>();
      for (const r of ratings) {
        byTeam.set(r.team.toUpperCase(), { overall: r.overall, games: r.games });
        byTeam.set(r.team, { overall: r.overall, games: r.games });
      }
      entry = { at: nowMs, byTeam };
      nflEpaRatingsCache.set(nflSeason, entry);
    }
    if (entry.byTeam.size === 0) return null;

    // TeamGameEfficiency uses abbreviations; GSE games often use full names.
    // Match by abbreviation tokens embedded in names (e.g. "Kansas City Chiefs" ↔ KC).
    const resolve = (name: string): { overall: number; games: number } | null => {
      const direct =
        entry!.byTeam.get(name) ??
        entry!.byTeam.get(name.toUpperCase()) ??
        entry!.byTeam.get(name.trim());
      if (direct) return direct;
      // Token overlap: last word often matches mascot; try common abbrs via uppercase words
      const upper = name.toUpperCase();
      for (const [k, v] of entry!.byTeam) {
        if (k.length <= 3 && upper.includes(k)) {
          // require word boundary-ish: " NE " or start/end
          const re = new RegExp(`(?:^|\\s)${k}(?:\\s|$)`);
          if (re.test(upper) || upper.endsWith(k) || upper.startsWith(k)) {
            return v;
          }
        }
      }
      return null;
    };

    // Prefer common NFL abbr maps for full names
    const NFL_NAME_TO_ABBR: Record<string, string> = {
      "arizona cardinals": "ARI",
      "atlanta falcons": "ATL",
      "baltimore ravens": "BAL",
      "buffalo bills": "BUF",
      "carolina panthers": "CAR",
      "chicago bears": "CHI",
      "cincinnati bengals": "CIN",
      "cleveland browns": "CLE",
      "dallas cowboys": "DAL",
      "denver broncos": "DEN",
      "detroit lions": "DET",
      "green bay packers": "GB",
      "houston texans": "HOU",
      "indianapolis colts": "IND",
      "jacksonville jaguars": "JAX",
      "kansas city chiefs": "KC",
      "las vegas raiders": "LV",
      "los angeles chargers": "LAC",
      "los angeles rams": "LA",
      "miami dolphins": "MIA",
      "minnesota vikings": "MIN",
      "new england patriots": "NE",
      "new orleans saints": "NO",
      "new york giants": "NYG",
      "new york jets": "NYJ",
      "philadelphia eagles": "PHI",
      "pittsburgh steelers": "PIT",
      "san francisco 49ers": "SF",
      "seattle seahawks": "SEA",
      "tampa bay buccaneers": "TB",
      "tennessee titans": "TEN",
      "washington commanders": "WAS",
    };
    const homeAbbr = NFL_NAME_TO_ABBR[input.homeTeam.toLowerCase().trim()];
    const awayAbbr = NFL_NAME_TO_ABBR[input.awayTeam.toLowerCase().trim()];
    const home =
      (homeAbbr ? entry.byTeam.get(homeAbbr) : null) ?? resolve(input.homeTeam);
    const away =
      (awayAbbr ? entry.byTeam.get(awayAbbr) : null) ?? resolve(input.awayTeam);
    if (!home || !away) return null;
    return nflEpaToIndependentFairValue(
      {
        homeOverall: home.overall,
        awayOverall: away.overall,
        homeGames: home.games,
        awayGames: away.games,
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
        // Soccer: Dixon–Coles only (same λ as Poisson + low-score τ). Emitting
        // both would double-count one rate model in the independent blend and
        // fake consensus. Hockey/baseball keep independent Poisson.
        if (isDixonColesValidSport(input.sportKey)) {
          const dc = dixonColesIndependentFairValue({
            sportKey: input.sportKey,
            homeRecords,
            awayRecords,
            leagueAvgScored: leagueAvg,
          });
          if (dc) {
            out.push({
              source: "dixon_coles",
              homeFairProb: dc.homeFairProb,
              awayFairProb: dc.awayFairProb,
              capturedAt: now().toISOString(),
            });
          } else {
            // Soft fallback: plain Poisson if DC nulls (degenerate τ path rare).
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
        } else {
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
      }
    } catch {
      // Soft-fail: null opinion is honest.
    }
  }

  // 6) MLB Stats API standings win% (free official) — summer Brier lever.
  if (!input.skipNetworkIndependents) {
    const mlbStand = await tryMlbStandingsFairValue(input);
    if (mlbStand) out.push(mlbStand);
  }

  // 7) Elo from chronological results.
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

  // 8) Polymarket Gamma internal (env-gated compliance hold).
  if (
    !input.skipNetworkIndependents &&
    !input.prefetched?.some((f) => f.source === "polymarket_gamma_internal")
  ) {
    const pm = await tryPolymarketIndependentFairValue(input);
    if (pm) out.push(pm);
  }

  // 9) NFL opponent-adjusted EPA (nflverse TeamGameEfficiency) when rows exist.
  if (!input.skipNetworkIndependents) {
    const epa = await tryNflEpaFairValue(input);
    if (epa) out.push(epa);
  }

  return out;
}
