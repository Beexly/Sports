/**
 * Build independentFairValues for OddsInput.context from REAL stored results.
 *
 * Sources (null = honest no opinion):
 *  1) Prefetched (Kalshi / caller-supplied)
 *  2) Kalshi live fair (series-aware; multi-league)
 *  3) ESPN PowerIndex logistic (NFL/CFB/NBA/NCAAB when FPI available) ONLY when
 *     ESPN_POWERINDEX_LICENSED="true" (rights gate, default closed; see
 *     independent-source-rights.ts)
 *  4) ClubElo soccer (Fixtures W/D/L → 2-way, else rating logistic)
 *  5) Rate-model independent: Dixon–Coles on soccer (not double-counted with Poisson);
 *     independent Poisson on icehockey / baseball
 *  5b) Skellam ATS cover from the same λ when a home spread is supplied
 *      (soccer/hockey/baseball). Moneyline ranking ignores this row.
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
  isIngestible,
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
  skellamCoverFairValue,
  SKELLAM_COVER_SOURCE,
  fitEloRatingsFromResults,
  eloFairValueFromRatings,
  powerIndexToIndependentFairValue,
  standingsWinPctToIndependentFairValue,
  nflEpaToIndependentFairValue,
  NFL_EPA_MIN_GAMES,
  opponentAdjustedRatings,
  type EloResultGame,
} from "@sports/prediction-engine";
import type { IndependentMarketFairValue } from "@sports/types";
import { db } from "@sports/db";
import { resolveKalshiTeamAbbr } from "./kalshi-team-abbr.js";
import { isEspnPowerIndexCleared } from "./independent-source-rights.js";

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
  /**
   * Environment consulted by rights gates (ESPN_POWERINDEX_LICENSED). Defaults
   * to process.env; injected in tests so the gate is provable without stubbing
   * the global environment.
   */
  readonly env?: NodeJS.ProcessEnv;
  /**
   * Posted home spread (negative = home favourite). Used only as the ATS
   * *question* for Skellam cover; λ still comes from TeamGameLog rates.
   */
  readonly spreadHome?: number | null;
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
    // Kalshi Developer Agreement v1.1 §3 / §3.1 — own-trading only. Fail closed.
    // Web twin: checkClearance({ source_id: "kalshi", ... }) in the rights registry.
    // packages/* cannot import apps/web; isIngestible is the package-side gate.
    if (!isIngestible("kalshi")) return null;
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
    // Package-side twin of the web registry row. Current verdict is
    // use-with-caution (ingestible + attribution). Flip source-registry
    // to paid-required after a Lars decline and this path fail-closes
    // without another code change. Do not treat API timeout as denial.
    if (!isIngestible("clubelo")) return null;
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

/**
 * Provenance for a fair value built on the PRIOR season because the current one
 * cannot yet meet NFL_EPA_MIN_GAMES (C-235). Distinct from "nfl_epa_adj" so a
 * factor trail can never present last season's form as this season's.
 */
export const NFL_EPA_PRIOR_SEASON_SOURCE = "nfl_epa_adj_prior";

/** Season cache for NFL EPA ratings within one process cycle. */
const nflEpaRatingsCache = new Map<
  number,
  { readonly at: number; readonly byTeam: Map<string, { overall: number; games: number }> }
>();

/**
 * Load and cache opponent-adjusted EPA ratings for one nflverse season.
 * Returns an empty map (cached) when the season has no rows yet.
 */
async function loadNflEpaRatings(
  nflSeason: number,
  nowMs: number,
): Promise<Map<string, { overall: number; games: number }>> {
  const cached = nflEpaRatingsCache.get(nflSeason);
  if (cached && nowMs - cached.at <= 30 * 60 * 1000) return cached.byTeam;

  const rows = await db.teamGameEfficiency.findMany({
    where: { season: nflSeason },
    select: { team: true, opponent: true, offEpaPerPlay: true, defEpaPerPlay: true },
    take: 5000,
  });
  const byTeam = new Map<string, { overall: number; games: number }>();
  if (rows.length > 0) {
    const ratings = opponentAdjustedRatings(
      rows.map((r) => ({
        team: r.team,
        opponent: r.opponent,
        offValue: r.offEpaPerPlay,
        defValue: r.defEpaPerPlay,
      })),
    );
    for (const r of ratings) {
      byTeam.set(r.team.toUpperCase(), { overall: r.overall, games: r.games });
      byTeam.set(r.team, { overall: r.overall, games: r.games });
    }
  }
  nflEpaRatingsCache.set(nflSeason, { at: nowMs, byTeam });
  return byTeam;
}

/** TeamGameEfficiency stores abbreviations; GSE game rows often carry full names. */
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

/** Resolve one team's rating from a season map, by abbreviation then by token. */
function resolveNflTeamRating(
  byTeam: Map<string, { overall: number; games: number }>,
  name: string,
): { overall: number; games: number } | null {
  const abbr = NFL_NAME_TO_ABBR[name.toLowerCase().trim()];
  const direct =
    (abbr ? byTeam.get(abbr) : undefined) ??
    byTeam.get(name) ??
    byTeam.get(name.toUpperCase()) ??
    byTeam.get(name.trim());
  if (direct) return direct;
  // Token overlap: a short key (e.g. "NE") embedded in a full name, at a word
  // boundary so "NE" does not match inside "NEW ORLEANS".
  const upper = name.toUpperCase();
  for (const [k, v] of byTeam) {
    if (k.length <= 3 && upper.includes(k)) {
      const re = new RegExp(`(?:^|\\s)${k}(?:\\s|$)`);
      if (re.test(upper) || upper.endsWith(k) || upper.startsWith(k)) return v;
    }
  }
  return null;
}

/**
 * Opponent-adjusted EPA fair value for one NFL game.
 *
 * EARLY-SEASON FALLBACK TO THE PRIOR SEASON (C-235). This looked up the current
 * nflverse season only, and `nflEpaToWinProbs` refuses a team with fewer than
 * NFL_EPA_MIN_GAMES (4) games. Together that meant NFL had NO independent fair
 * value for the FIRST FOUR WEEKS OF EVERY SEASON: in Week 1 the season has zero
 * rows at all, and through Week 4 no team has met the floor. The only other NFL
 * independent is ESPN PowerIndex, which is rights-gated closed by default, so
 * the signal slate - which is MONEYLINE-only and builds from independents -
 * produced no NFL moneylines at all for the opening month. Measured on
 * production 2026-09-08: 6 NFL games in the 72h window, 0 MONEYLINE picks.
 *
 * This is the same hole C-225 closed for the fantasy projection basis, in the
 * picks path, and it takes the same shape of fix: while the CURRENT season
 * cannot meet the sample floor, fall back to the PRIOR season, which is real
 * measured data rather than an invention.
 *
 * Three properties keep it honest:
 *   - The fallback is SELF-LIMITING. It applies only while a team is under
 *     NFL_EPA_MIN_GAMES in the current season, so it stops on its own once the
 *     season can stand up - no hand-picked week cutoff to drift out of sync
 *     with the floor it is derived from.
 *   - It reaches back exactly ONE season, never further. A gap in the data does
 *     not silently serve three-year-old form.
 *   - It carries DIFFERENT PROVENANCE: source "nfl_epa_adj_prior", so nothing
 *     downstream can mistake last season's form for this season's. Both sides
 *     must come from the same season - never one from each, which would compare
 *     ratings built on different opponent pools.
 */
async function tryNflEpaFairValue(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue | null> {
  if (input.sportKey !== "americanfootball_nfl" && input.sportKey !== "nfl") {
    return null;
  }
  try {
    const season = input.commenceTime.getUTCFullYear();
    // NFL calendar: Jan-Feb games belong to the prior season year label in nflverse.
    const month = input.commenceTime.getUTCMonth(); // 0-based
    const nflSeason = month <= 1 ? season - 1 : season;
    const nowMs = (input.now ?? (() => new Date()))().getTime();

    const current = await loadNflEpaRatings(nflSeason, nowMs);
    const curHome = resolveNflTeamRating(current, input.homeTeam);
    const curAway = resolveNflTeamRating(current, input.awayTeam);

    // The current season stands on its own only when BOTH sides meet the floor.
    const minGames = NFL_EPA_MIN_GAMES;
    if (curHome && curAway && curHome.games >= minGames && curAway.games >= minGames) {
      return nflEpaToIndependentFairValue(
        {
          homeOverall: curHome.overall,
          awayOverall: curAway.overall,
          homeGames: curHome.games,
          awayGames: curAway.games,
        },
        { now: input.now },
      );
    }

    // Early season: the prior season is the honest basis, with its own label.
    const prior = await loadNflEpaRatings(nflSeason - 1, nowMs);
    const priorHome = resolveNflTeamRating(prior, input.homeTeam);
    const priorAway = resolveNflTeamRating(prior, input.awayTeam);
    if (
      !priorHome ||
      !priorAway ||
      priorHome.games < minGames ||
      priorAway.games < minGames
    ) {
      return null;
    }
    const fv = nflEpaToIndependentFairValue(
      {
        homeOverall: priorHome.overall,
        awayOverall: priorAway.overall,
        homeGames: priorHome.games,
        awayGames: priorAway.games,
      },
      { now: input.now },
    );
    return fv ? { ...fv, source: NFL_EPA_PRIOR_SEASON_SOURCE } : null;
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
  // Rights gate, fail closed: the registry clears ESPN facts only, and FPI is a
  // proprietary prediction. The client is never called unless the founder has
  // set ESPN_POWERINDEX_LICENSED="true" after a license exists.
  if (
    !input.skipNetworkIndependents &&
    isEspnPowerIndexCleared(input.env ?? process.env)
  ) {
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
  let matchupLambdas: { lambdaHome: number; lambdaAway: number } | null = null;
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
            matchupLambdas = { lambdaHome: dc.lambdaHome, lambdaAway: dc.lambdaAway };
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
              matchupLambdas = { lambdaHome: poisson.lambdaHome, lambdaAway: poisson.lambdaAway };
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
            matchupLambdas = { lambdaHome: poisson.lambdaHome, lambdaAway: poisson.lambdaAway };
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

  // 5b) Skellam ATS cover from the same λ — soccer/hockey/baseball only.
  // Spread is the book's question; rates stay independent of the line.
  if (
    matchupLambdas &&
    input.spreadHome != null &&
    Number.isFinite(input.spreadHome)
  ) {
    const cover = skellamCoverFairValue({
      sportKey: input.sportKey,
      lambdaHome: matchupLambdas.lambdaHome,
      lambdaAway: matchupLambdas.lambdaAway,
      spreadHome: input.spreadHome,
    });
    if (cover) {
      out.push({
        source: SKELLAM_COVER_SOURCE,
        homeFairProb: cover.homeFairProb,
        awayFairProb: cover.awayFairProb,
        capturedAt: now().toISOString(),
      });
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
