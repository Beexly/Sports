/**
 * REG-row probe for the nflverse display season (C-95).
 *
 * `resolveFootballStatsSeason` only advances past the completed floor when a
 * caller tells it the labelled season has regular-season rows, and no
 * production caller ever did, so in September 2026 every surface kept
 * reporting 2025. This adapter answers the question from the one table the
 * weekly-stats ingestion writes (`PlayerGameStat`, `seasonType: "REG"`), with a
 * single indexed `findFirst` per probed season.
 */

import { db } from "@sports/db";
import {
  resolveFootballStatsSeasonAsync,
  type RegRowsProbe,
} from "@sports/data-ingestion";

/** The one query the probe runs; narrow so tests pass a plain object. */
export type RegRowsClient = {
  playerGameStat: {
    findFirst(args: {
      where: { season: number; seasonType: "REG" };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

export function playerGameStatRegRowsProbe(client: RegRowsClient = db): RegRowsProbe {
  return async (season) => {
    const row = await client.playerGameStat.findFirst({
      where: { season, seasonType: "REG" },
      select: { id: true },
    });
    return row !== null;
  };
}

/**
 * Display/ingestion-fallback season resolved against stored REG rows: 2026 the
 * moment week-1 rows land, the completed floor until then.
 */
export function resolveFootballStatsSeasonFromDb(now: Date = new Date(), client: RegRowsClient = db) {
  return resolveFootballStatsSeasonAsync(now, playerGameStatRegRowsProbe(client));
}
