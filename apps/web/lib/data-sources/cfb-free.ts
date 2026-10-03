/**
 * Free CFB snapshot — the college-football facts entrypoint, free-first.
 *
 * Composes scores + AP/Coaches rankings + standings for college football from the
 * cleared FREE source (ESPN public). henrygd NCAA (self-hosted) is the no-rate-cap
 * upgrade once cleared. Facts only, attribution preserved, cached via FreeStats.
 *
 * The Odds API is NOT used here — CFB odds remain the only paid need and live behind
 * the spend guard, not this facts path.
 */

import { FreeStats, freeStats as sharedFreeStats } from "./free-stats";
import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { RankingPoll } from "./free-adapters/espn-rankings";
import type { Standings } from "./free-adapters/espn-standings";

export type CfbSnapshot = {
  readonly sport: "ncaaf";
  readonly scores: readonly NormalizedGame[];
  readonly rankings: readonly RankingPoll[];
  readonly standings: Standings;
  readonly sourceId: "espn-public-api";
  readonly attribution: string;
  readonly fetchedAt: number;
  readonly fromCache: boolean;
};

/** One free, cleared CFB facts snapshot. No key, no paid call. */
export async function getCfbSnapshot(stats: FreeStats = sharedFreeStats): Promise<CfbSnapshot> {
  const [scores, rankings, standings] = await Promise.all([
    stats.scores("ncaaf"),
    stats.rankings("ncaaf"),
    stats.standings("ncaaf"),
  ]);

  return {
    sport: "ncaaf",
    scores: scores.data,
    rankings: rankings.data,
    standings: standings.data,
    sourceId: "espn-public-api",
    attribution: "Scores data via ESPN",
    fetchedAt: Math.max(scores.fetchedAt, rankings.fetchedAt, standings.fetchedAt),
    fromCache: scores.cached && rankings.cached && standings.cached,
  };
}

/** The AP Top 25 (or first available poll) from the free snapshot. */
export function apTop25(snapshot: CfbSnapshot): RankingPoll | null {
  return snapshot.rankings.find((p) => p.pollType === "ap") ?? snapshot.rankings[0] ?? null;
}
