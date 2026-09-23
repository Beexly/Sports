/**
 * External power-ratings independent fair values (research corpus + TeamRankings).
 *
 * Two unused-capacity sources, both disabled-by-default:
 *
 *  1) Research CSVs under docs/research (composite / objective power ratings).
 *     Gate: RESEARCH_POWER_RATINGS_ENABLED=true. Offline, no network.
 *  2) TeamRankings NFL power ratings (rights: cleared-with-attribution).
 *     Gate: TEAMRANKINGS_FAIR_VALUE_ENABLED=true. Network only when the flag
 *     is on; attribution required by the source registry.
 *
 * Both emit IndependentMarketFairValue rows for the same blend as Kalshi /
 * FPI / Elo. Null = honest no-opinion. Never invents ratings or book lines.
 */

import {
  isResearchPowerRatingsEnabled,
  loadResearchPowerRatings,
  lookupResearchRating,
  RESEARCH_POWER_RATINGS_SOURCE,
  TeamRankingsClient,
  TEAMRANKINGS_RATINGS_ATTRIBUTION,
  TEAMRANKINGS_RATINGS_SOURCE_ID,
  isIngestible,
  envFlagEnabled,
  type ResearchPowerRatingsTable,
} from "@sports/data-ingestion";
import {
  powerRatingsToIndependentFairValue,
  winPctVsAverageToIndependentFairValue,
} from "@sports/prediction-engine";
import type { IndependentMarketFairValue } from "@sports/types";
import { resolveKalshiTeamAbbr } from "./kalshi-team-abbr.js";

export const TEAMRANKINGS_FAIR_VALUE_FLAG = "TEAMRANKINGS_FAIR_VALUE_ENABLED";
export const TEAMRANKINGS_FAIR_VALUE_SOURCE = "teamrankings";

/** In-process cache so one refresh cycle does not re-fetch / re-parse per game. */
let researchTableCache: {
  readonly at: number;
  readonly table: ResearchPowerRatingsTable | null;
} | null = null;

let teamrankingsCache: {
  readonly at: number;
  readonly rows: readonly { team: string; rating: number | null }[] | null;
} | null = null;

const CACHE_TTL_MS = 30 * 60 * 1000;

export function isTeamRankingsFairValueEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, TEAMRANKINGS_FAIR_VALUE_FLAG);
}

/** Reset caches — tests only. */
export function resetExternalRatingsCachesForTests(): void {
  researchTableCache = null;
  teamrankingsCache = null;
}

export type ExternalRatingsFairValueInput = {
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly now?: () => Date;
  /** Skip network (TeamRankings). Research CSVs are local and still run. */
  readonly skipNetworkIndependents?: boolean;
};

function isNflSport(sportKey: string): boolean {
  const k = sportKey.trim().toLowerCase();
  return k === "americanfootball_nfl" || k === "nfl";
}

async function loadResearchTableCached(
  env: NodeJS.ProcessEnv,
  now: () => Date,
): Promise<ResearchPowerRatingsTable | null> {
  const nowMs = now().getTime();
  if (researchTableCache && nowMs - researchTableCache.at < CACHE_TTL_MS) {
    return researchTableCache.table;
  }
  const table = await loadResearchPowerRatings({ env, now });
  researchTableCache = { at: nowMs, table };
  return table;
}

/**
 * Research-corpus fair value for one NFL game.
 * Prefers points-vs-average composite; falls back to market-implied win% vs average.
 * Flag must be on; otherwise null without touching the filesystem.
 */
export async function tryResearchPowerRatingsFairValue(
  input: ExternalRatingsFairValueInput,
): Promise<IndependentMarketFairValue | null> {
  const env = input.env ?? process.env;
  if (!isNflSport(input.sportKey)) return null;
  if (!isResearchPowerRatingsEnabled(env)) return null;
  try {
    const now = input.now ?? (() => new Date());
    const table = await loadResearchTableCached(env, now);
    if (!table) return null;
    const home = lookupResearchRating(table, input.homeTeam);
    const away = lookupResearchRating(table, input.awayTeam);
    if (!home || !away) return null;

    if (home.rating != null && away.rating != null) {
      return powerRatingsToIndependentFairValue(
        {
          homeRating: home.rating,
          awayRating: away.rating,
          sportKey: input.sportKey,
          source: RESEARCH_POWER_RATINGS_SOURCE,
        },
        { now },
      );
    }
    if (home.winPctVsAvg != null && away.winPctVsAvg != null) {
      return winPctVsAverageToIndependentFairValue(
        {
          homeWinPctVsAvg: home.winPctVsAvg,
          awayWinPctVsAvg: away.winPctVsAvg,
          source: RESEARCH_POWER_RATINGS_SOURCE,
        },
        { now },
      );
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * TeamRankings power ratings → fair value (points vs average).
 * Rights: cleared-with-attribution (registry teamrankings-ratings). The
 * attribution string is returned alongside the fair value so a caller can
 * surface it; the flag keeps this off the live blend until acceptance.
 */
export async function tryTeamRankingsFairValue(
  input: ExternalRatingsFairValueInput,
): Promise<IndependentMarketFairValue | null> {
  const env = input.env ?? process.env;
  if (!isNflSport(input.sportKey)) return null;
  if (!isTeamRankingsFairValueEnabled(env)) return null;
  if (input.skipNetworkIndependents) return null;
  if (!isIngestible(TEAMRANKINGS_RATINGS_SOURCE_ID)) return null;
  try {
    const now = input.now ?? (() => new Date());
    const nowMs = now().getTime();
    if (!teamrankingsCache || nowMs - teamrankingsCache.at > CACHE_TTL_MS) {
      const client = new TeamRankingsClient();
      const ratings = await client.getRatings();
      teamrankingsCache = {
        at: nowMs,
        rows: ratings.map((r) => ({ team: r.team, rating: r.rating })),
      };
    }
    const rows = teamrankingsCache.rows;
    if (!rows || rows.length === 0) return null;

    const findRating = (teamName: string): number | null => {
      const abbr = resolveKalshiTeamAbbr("NFL", teamName);
      const key = teamName.trim().toLowerCase();
      for (const row of rows) {
        const t = row.team.trim().toLowerCase();
        if (t === key) return row.rating;
        if (abbr && (t === abbr.toLowerCase() || t.includes(abbr.toLowerCase()))) {
          return row.rating;
        }
        // TeamRankings uses full city+name; soft contains both ways.
        if (t.includes(key) || key.includes(t)) return row.rating;
      }
      return null;
    };

    const homeRating = findRating(input.homeTeam);
    const awayRating = findRating(input.awayTeam);
    if (homeRating == null || awayRating == null) return null;
    return powerRatingsToIndependentFairValue(
      {
        homeRating,
        awayRating,
        sportKey: input.sportKey,
        source: TEAMRANKINGS_FAIR_VALUE_SOURCE,
      },
      { now },
    );
  } catch {
    return null;
  }
}

/** Attribution strings a caller must surface when TeamRankings rows are used. */
export function teamRankingsAttribution(): string {
  return TEAMRANKINGS_RATINGS_ATTRIBUTION;
}
