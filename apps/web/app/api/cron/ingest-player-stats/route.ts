/**
 * Vercel cron — self-driving nflverse player-stats ingestion (trends unlock).
 *
 * Scheduled DAILY in `vercel.json` (09:00 UTC, offset from the other crons).
 * Each run ingests exactly ONE season of `player_stats_week` (CC-BY-4.0,
 * clearance-gated, rights-stamped) into Player/PlayerGameStat via the existing
 * idempotent upsert writer:
 *
 *   - backfill mode: a season in the trend window has no persisted rows yet →
 *     ingest the newest missing season. Successive daily runs walk the window
 *     to completion with no human action (see planPlayerStatsRun).
 *   - steady-state mode: window fully populated → refresh the current season
 *     (upserts pick up newly played weeks).
 *
 * Rollover-starvation guard: in backfill mode the planner always re-picks the
 * NEWEST missing season, so a season whose source publishes nothing yet (the
 * September rollover, before nflverse ships week-1 rows) would be re-picked
 * every day while older missing seasons starve. When the picked season
 * persists zero rows or source-errors, the SAME run attempts exactly ONE
 * fallback: the next-newest missing season. Capped at one because each
 * ingestion is a full fetch+upsert cycle and two seasons is the most that
 * safely fits the 300s budget. Clearance denials never fall back — the gate
 * is global, so a second season would be denied too. Both attempts are
 * reported in the response.
 *
 * Optional `?season=YYYY` override lets an operator drive specific seasons
 * manually (faster backfill via repeated CRON_SECRET curls) — never required.
 *
 * Auth: Bearer <CRON_SECRET>, same as the other cron routes.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  ingestPlayerWeeklyStats,
  currentNflSeason,
  type PlayerStatsIngestResult,
} from "@/lib/ingestion/player-stats";
import { planPlayerStatsRun } from "@/lib/ingestion/player-stats-backfill";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel cron caps at 5 min

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  if (seasonParam !== null) {
    const season = Number(seasonParam);
    if (!Number.isInteger(season) || season < 1999 || season > currentNflSeason() + 1) {
      return NextResponse.json({ error: "invalid season" }, { status: 400 });
    }
    const result = await ingestPlayerWeeklyStats(season);
    const success = result.status === "ok";
    return NextResponse.json({ success, mode: "manual", season, result }, { status: success ? 200 : 502 });
  }

  const plan = await planPlayerStatsRun();
  const firstResult = await ingestPlayerWeeklyStats(plan.season);

  // Rollover-starvation guard (see module doc): the picked season yielded no
  // persisted rows, so it will still be "missing" tomorrow and the planner
  // would park on it forever. Spend this run's remaining budget on the
  // next-newest missing season instead — at most one fallback per run.
  const firstYieldedNothing =
    firstResult.status === "source-error" ||
    (firstResult.status === "ok" && firstResult.statsUpserted === 0);
  const olderMissingSeasons = plan.missingSeasons.filter((s) => s !== plan.season);
  const fallbackSeason =
    plan.mode === "backfill" && firstYieldedNothing
      ? olderMissingSeasons[olderMissingSeasons.length - 1]
      : undefined;

  let season = plan.season;
  let result = firstResult;
  // Honest reporting: when the fallback runs, `season`/`result` describe the
  // attempt the run stands on and `firstAttempt` preserves the zero-yield pick.
  let firstAttempt: { season: number; result: PlayerStatsIngestResult } | null = null;
  if (fallbackSeason !== undefined) {
    firstAttempt = { season: plan.season, result: firstResult };
    season = fallbackSeason;
    result = await ingestPlayerWeeklyStats(fallbackSeason);
  }

  const success = result.status === "ok";
  return NextResponse.json(
    {
      success,
      mode: plan.mode,
      season,
      result,
      firstAttempt,
      backfill: {
        targetSeasons: plan.targetSeasons,
        seasonsWithData: plan.seasonsWithData,
        missingSeasons: plan.missingSeasons,
        complete: plan.backfillComplete,
      },
    },
    { status: success ? 200 : 502 },
  );
}
