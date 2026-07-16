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
 * Optional `?season=YYYY` override lets an operator drive specific seasons
 * manually (faster backfill via repeated CRON_SECRET curls) — never required.
 *
 * Auth: Bearer <CRON_SECRET>, same as the other cron routes.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { ingestPlayerWeeklyStats, currentNflSeason } from "@/lib/ingestion/player-stats";
import { planPlayerStatsRun } from "@/lib/ingestion/player-stats-backfill";

export const dynamic = "force-dynamic";
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
  const result = await ingestPlayerWeeklyStats(plan.season);
  const success = result.status === "ok";
  return NextResponse.json(
    {
      success,
      mode: plan.mode,
      season: plan.season,
      result,
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
