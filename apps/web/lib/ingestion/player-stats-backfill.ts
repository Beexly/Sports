/**
 * Self-driving season cursor for the daily player-stats ingestion cron.
 *
 * The Trend Lab publication gate declares it needs multiple seasons of
 * persisted, joined Player/PlayerGameStat observations (see
 * `NFLVERSE_TREND_PLANS` — minimumSeasons/minimumObservations). One-shot
 * multi-season backfills are unsafe under the Vercel function timeout, so the
 * cron ingests exactly ONE season per invocation and derives its cursor from
 * the persisted data itself: the seasons that already have PlayerGameStat rows
 * ARE the progress record. No new tables, no stored cursor to drift.
 *
 * Each run:
 *   - target window = the most recent TREND_BACKFILL_SEASONS seasons
 *   - any target season with zero persisted rows → "backfill" mode, ingest the
 *     NEWEST missing season (freshest data reaches users first)
 *   - all target seasons populated → "steady-state" mode, re-ingest the current
 *     season (idempotent upserts pick up new weeks as they land)
 *
 * Successive daily runs therefore complete the backfill with no human action,
 * then settle into a current-season refresh. When the NFL season rolls over in
 * September the new season shows up as missing and is backfilled automatically.
 *
 * The planner is a pure pre-run decision over persisted state; it cannot know
 * that a picked season will yield zero rows (e.g. rollover before nflverse
 * publishes week-1 data). The cron route therefore owns the starvation guard:
 * on a zero-row/source-error outcome it attempts the next-newest missing
 * season within the same run, capped at one fallback (see
 * `app/api/cron/ingest-player-stats/route.ts`).
 */
import { db } from "@sports/db";
import { NFLVERSE_TREND_PLANS } from "@sports/data-ingestion";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

/**
 * The anchor trend plan whose declared season threshold sizes the window. One
 * extra season of margin: the current season is partial for most of the year,
 * so the window must still contain minimumSeasons complete seasons.
 */
const ANCHOR_PLAN = NFLVERSE_TREND_PLANS["qb-age-rb-target-share"];
export const TREND_BACKFILL_SEASONS = ANCHOR_PLAN.minimumSeasons + 1;

export interface PlayerStatsRunPlan {
  readonly mode: "backfill" | "steady-state";
  /** The single season this run should ingest. */
  readonly season: number;
  readonly targetSeasons: readonly number[];
  readonly seasonsWithData: readonly number[];
  /** Target seasons still missing BEFORE this run executes. */
  readonly missingSeasons: readonly number[];
  readonly backfillComplete: boolean;
}

/**
 * Decide which season the next ingestion run should process. Reads only the
 * distinct persisted seasons (cheap, index-backed); the stub DB client returns
 * an empty list, which safely degrades to "everything is missing".
 */
export async function planPlayerStatsRun(now = new Date()): Promise<PlayerStatsRunPlan> {
  const current = currentNflSeason(now);
  const targetSeasons: number[] = [];
  for (let season = current - TREND_BACKFILL_SEASONS + 1; season <= current; season++) {
    targetSeasons.push(season);
  }
  const oldestTarget = current - TREND_BACKFILL_SEASONS + 1;

  const seasonRows = await db.playerGameStat.findMany({
    where: { season: { gte: oldestTarget } },
    distinct: ["season"],
    select: { season: true },
  });
  const persisted = new Set(seasonRows.map((row) => row.season));

  const seasonsWithData = targetSeasons.filter((season) => persisted.has(season));
  const missingSeasons = targetSeasons.filter((season) => !persisted.has(season));

  const newestMissing = missingSeasons[missingSeasons.length - 1];
  if (newestMissing !== undefined) {
    return {
      mode: "backfill",
      season: newestMissing,
      targetSeasons,
      seasonsWithData,
      missingSeasons,
      backfillComplete: false,
    };
  }
  return {
    mode: "steady-state",
    season: current,
    targetSeasons,
    seasonsWithData,
    missingSeasons,
    backfillComplete: true,
  };
}
