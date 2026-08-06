/**
 * Multi-source free score fetch — world-class redundancy.
 *
 * Primary → fallback chain per sport. Never a single free source for scores.
 * oddsApiRequired=false. Paid Odds is optional enrichment only.
 *
 * Settlement callers MUST pass `dates` (ESPN YYYYMMDD keys and/or ISO days)
 * for historical overdue picks — undated boards are "now" only.
 */

import { fetchScoresFreeFirst } from "./free-first-ingest";
import {
  fetchHenrygdScoreboard,
  HENRYGD_PATHS,
  type NcaaGame,
} from "./free-adapters/henrygd-ncaa";
import {
  fetchEspnScoreboard,
  type NormalizedGame,
} from "./free-adapters/espn-scores";
import type { Sport } from "./source-router";
import { fetchMlbScheduleScores } from "./free-adapters/mlb-statsapi";
import { fetchBalldontlieScores } from "./free-adapters/balldontlie-nba";
import { fetchNhlWebScores } from "./free-adapters/nhl-web-api";
import { compactEspnDateRanges } from "./settlement-score-dates";

export type ScoreSourceId =
  | "espn-public-api"
  | "henrygd-ncaa"
  | "mlb-statsapi"
  | "balldontlie-nba"
  | "nhl-web-api";

export type MultiSourceScoreResult = {
  readonly sport: Sport;
  readonly primary: ScoreSourceId | null;
  readonly used: ScoreSourceId | null;
  readonly attempted: readonly ScoreSourceId[];
  readonly games: readonly NormalizedGame[];
  readonly failover: boolean;
  readonly errors: readonly string[];
  readonly oddsApiRequired: false;
  /** ESPN date params actually requested (empty = undated "now" board). */
  readonly datesRequested: readonly string[];
};

function henryToNormalized(sport: Sport, games: readonly NcaaGame[]): NormalizedGame[] {
  return games.map((g) => ({
    sourceId: "espn-public-api" as const, // shape-compatible; attribution on ncaa
    sport,
    gameId: g.gameId,
    startTime: g.date,
    state: g.state === "post" ? "post" : g.state === "in" ? "in" : g.state === "pre" ? "pre" : "unknown",
    completed: g.completed,
    statusDetail: "",
    venue: null,
    home: { team: g.home.team, abbreviation: g.home.abbr, score: g.home.score },
    away: { team: g.away.team, abbreviation: g.away.abbr, score: g.away.score },
    attribution: g.attribution,
  }));
}

/**
 * Ordered free score sources per sport (min dual where available).
 */
export function scoreSourceChain(sport: Sport): readonly ScoreSourceId[] {
  switch (sport) {
    case "ncaaf":
    case "ncaab":
      return ["espn-public-api", "henrygd-ncaa"];
    case "mlb":
      return ["espn-public-api", "mlb-statsapi"];
    case "nba":
      return ["espn-public-api", "balldontlie-nba"];
    case "nhl":
      return ["espn-public-api", "nhl-web-api"];
    case "nfl":
    case "mls":
    default:
      return ["espn-public-api"]; // nfl: nflverse dual via schedules/stats path
  }
}

function mergeGames(parts: readonly (readonly NormalizedGame[])[]): NormalizedGame[] {
  const byId = new Map<string, NormalizedGame>();
  for (const part of parts) {
    for (const g of part) {
      const key = g.gameId || `${g.startTime}|${g.home?.abbreviation}|${g.away?.abbreviation}`;
      const prev = byId.get(key);
      // Prefer completed rows when deduping.
      if (!prev || (!prev.completed && g.completed)) byId.set(key, g);
    }
  }
  return [...byId.values()];
}

async function fetchEspnForDates(
  sport: Sport,
  espnKeys: readonly string[],
  fetchImpl?: typeof fetch,
): Promise<{ games: NormalizedGame[]; errors: string[]; params: string[] }> {
  const errors: string[] = [];
  if (espnKeys.length === 0) {
    try {
      const games = await fetchEspnScoreboard(sport, { fetchImpl });
      return { games: [...games], errors, params: [] };
    } catch (e) {
      errors.push(`espn-now: ${e instanceof Error ? e.message : String(e)}`);
      return { games: [], errors, params: [] };
    }
  }

  const params = compactEspnDateRanges(espnKeys);
  const chunks: NormalizedGame[][] = [];
  // Serial ranges keep ESPN friendly under cron; cap already applied upstream.
  for (const dates of params) {
    try {
      const games = await fetchEspnScoreboard(sport, { fetchImpl, dates });
      chunks.push([...games]);
    } catch (e) {
      errors.push(`espn ${dates}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { games: mergeGames(chunks), errors, params };
}

async function fetchSecondaryForIsoDays(
  source: ScoreSourceId,
  sport: Sport,
  isoKeys: readonly string[],
  fetchImpl?: typeof fetch,
): Promise<{ games: NormalizedGame[]; errors: string[] }> {
  const errors: string[] = [];
  const days = isoKeys.length > 0 ? isoKeys : [new Date().toISOString().slice(0, 10)];
  const chunks: NormalizedGame[][] = [];

  for (const date of days) {
    try {
      if (source === "mlb-statsapi") {
        chunks.push([...(await fetchMlbScheduleScores({ fetchImpl, date }))]);
      } else if (source === "balldontlie-nba") {
        chunks.push([...(await fetchBalldontlieScores({ fetchImpl, date }))]);
      } else if (source === "nhl-web-api") {
        chunks.push([...(await fetchNhlWebScores({ fetchImpl, date }))]);
      } else if (source === "henrygd-ncaa") {
        const path = sport === "ncaab" ? HENRYGD_PATHS.mbb : HENRYGD_PATHS.cfb;
        const ncaa = await fetchHenrygdScoreboard(path, { fetchImpl });
        chunks.push([...henryToNormalized(sport, ncaa)]);
        // henrygd is full board once — no need to loop days
        break;
      }
    } catch (e) {
      errors.push(`${source} ${date}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { games: mergeGames(chunks), errors };
}

export type MultiSourceOpts = {
  readonly fetchImpl?: typeof fetch;
  /**
   * ESPN-style day keys (YYYYMMDD). When provided, scoreboards for those days
   * are fetched instead of the undated "current" board.
   */
  readonly espnDateKeys?: readonly string[];
  /** ISO days YYYY-MM-DD for secondary APIs (mlb/nhl/balldontlie). */
  readonly isoDateKeys?: readonly string[];
};

/**
 * Fetch free scores. Prefer `espnDateKeys` when settling overdue picks.
 * Returns merged games across requested dates; still tries secondary sources
 * for dual confirmation / failover.
 */
export async function fetchScoresMultiSource(
  sport: Sport,
  opts: MultiSourceOpts = {},
): Promise<MultiSourceScoreResult> {
  const chain = scoreSourceChain(sport);
  const errors: string[] = [];
  const attempted: ScoreSourceId[] = [];
  const espnKeys = opts.espnDateKeys ?? [];
  const isoKeys = opts.isoDateKeys ?? [];
  const datesRequested = espnKeys.length > 0 ? [...espnKeys] : [];

  // When settling historical days, go straight to date-targeted ESPN (skip undated free-first).
  if (espnKeys.length > 0) {
    attempted.push("espn-public-api");
    const espn = await fetchEspnForDates(sport, espnKeys, opts.fetchImpl);
    errors.push(...espn.errors);

    let games = espn.games;
    let used: ScoreSourceId | null = games.length > 0 ? "espn-public-api" : null;

    // Dual / failover secondaries (do not replace ESPN finals — merge).
    for (const source of chain) {
      if (source === "espn-public-api") continue;
      attempted.push(source);
      const sec = await fetchSecondaryForIsoDays(source, sport, isoKeys, opts.fetchImpl);
      errors.push(...sec.errors);
      if (sec.games.length > 0) {
        games = mergeGames([games, sec.games]);
        if (!used) used = source;
      }
    }

    return {
      sport,
      primary: chain[0] ?? null,
      used,
      attempted,
      games,
      failover: attempted.length > 1,
      errors,
      oddsApiRequired: false,
      datesRequested: espn.params.length > 0 ? espn.params : datesRequested,
    };
  }

  // Undated path (live board / health probes) — original chain behavior.
  for (const source of chain) {
    attempted.push(source);
    try {
      if (source === "espn-public-api") {
        const out = await fetchScoresFreeFirst(sport, { fetchImpl: opts.fetchImpl });
        if (out.data && out.data.length > 0) {
          return {
            sport,
            primary: chain[0] ?? null,
            used: "espn-public-api",
            attempted,
            games: out.data,
            failover: attempted.length > 1,
            errors,
            oddsApiRequired: false,
            datesRequested: [],
          };
        }
        if (chain.length === 1) {
          return {
            sport,
            primary: chain[0] ?? null,
            used: "espn-public-api",
            attempted,
            games: out.data ?? [],
            failover: false,
            errors,
            oddsApiRequired: false,
            datesRequested: [],
          };
        }
        errors.push("espn-public-api: empty board");
        continue;
      }
      if (source === "henrygd-ncaa") {
        const path = sport === "ncaab" ? HENRYGD_PATHS.mbb : HENRYGD_PATHS.cfb;
        const ncaa = await fetchHenrygdScoreboard(path, { fetchImpl: opts.fetchImpl });
        if (ncaa.length > 0) {
          return {
            sport,
            primary: chain[0] ?? null,
            used: "henrygd-ncaa",
            attempted,
            games: henryToNormalized(sport, ncaa),
            failover: true,
            errors,
            oddsApiRequired: false,
            datesRequested: [],
          };
        }
        errors.push("henrygd-ncaa: empty");
        continue;
      }
      if (source === "mlb-statsapi") {
        const games = await fetchMlbScheduleScores({ fetchImpl: opts.fetchImpl });
        if (games.length > 0) {
          return {
            sport,
            primary: chain[0] ?? null,
            used: "mlb-statsapi",
            attempted,
            games,
            failover: true,
            errors,
            oddsApiRequired: false,
            datesRequested: [],
          };
        }
        errors.push("mlb-statsapi: empty");
        continue;
      }
      if (source === "balldontlie-nba") {
        const games = await fetchBalldontlieScores({ fetchImpl: opts.fetchImpl });
        if (games.length > 0) {
          return {
            sport,
            primary: chain[0] ?? null,
            used: "balldontlie-nba",
            attempted,
            games,
            failover: true,
            errors,
            oddsApiRequired: false,
            datesRequested: [],
          };
        }
        errors.push("balldontlie-nba: empty");
        continue;
      }
      if (source === "nhl-web-api") {
        const games = await fetchNhlWebScores({ fetchImpl: opts.fetchImpl });
        if (games.length > 0) {
          return {
            sport,
            primary: chain[0] ?? null,
            used: "nhl-web-api",
            attempted,
            games,
            failover: true,
            errors,
            oddsApiRequired: false,
            datesRequested: [],
          };
        }
        errors.push("nhl-web-api: empty");
      }
    } catch (e) {
      errors.push(`${source}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    const games = await fetchEspnScoreboard(sport, { fetchImpl: opts.fetchImpl });
    return {
      sport,
      primary: chain[0] ?? null,
      used: "espn-public-api",
      attempted,
      games,
      failover: attempted.length > 1,
      errors,
      oddsApiRequired: false,
      datesRequested: [],
    };
  } catch (e) {
    errors.push(`espn-final: ${e instanceof Error ? e.message : String(e)}`);
    return {
      sport,
      primary: chain[0] ?? null,
      used: null,
      attempted,
      games: [],
      failover: true,
      errors,
      oddsApiRequired: false,
      datesRequested: [],
    };
  }
}
