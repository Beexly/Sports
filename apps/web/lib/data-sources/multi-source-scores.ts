/**
 * Multi-source free score fetch — world-class redundancy.
 *
 * Primary → fallback chain per sport. Never a single free source for scores.
 * oddsApiRequired=false. Paid Odds is optional enrichment only.
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

export async function fetchScoresMultiSource(
  sport: Sport,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<MultiSourceScoreResult> {
  const chain = scoreSourceChain(sport);
  const errors: string[] = [];
  const attempted: ScoreSourceId[] = [];

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
          };
        }
        // empty board is seasonal — still try fallback for dual confirmation sports
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
          };
        }
        errors.push("nhl-web-api: empty");
      }
    } catch (e) {
      errors.push(`${source}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // last resort: espn even if empty
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
    };
  }
}
