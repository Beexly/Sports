/**
 * Vercel cron — refresh NFL player weekly stats from nflverse.
 *
 * Persists `player_stats_week` into the Player / PlayerGameStat system-of-record
 * via the clearance-gated ingestion. nflverse is free (CC-BY-4.0), so this can
 * run on a frequent cadence at no metered cost — the "accurate numbers from free
 * sources, refreshed often, without the Odds API bill" path.
 *
 * Schedule: vercel.json `0,30 * * * *` (every 30 minutes).
 *
 * Also records an honest IngestionRun SUCCESS when the primary weekly-stats
 * ingest completes so /api/health free-mode freshness is not solely dependent
 * on free-spine-health (which can lag if CRON_SECRET mismatches or the probe
 * times out). Does not invent scores or injury designations.
 *
 * Auth: Bearer <CRON_SECRET>, same as the other cron routes.
 */
import { NextResponse } from "next/server";
import { resolveFootballStatsSeason } from "@sports/data-ingestion";
import { cronAuthError } from "@/lib/cron/authorize";
import { ingestPlayerWeeklyStats } from "@/lib/ingestion/player-stats";
import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";
import { ingestDepthCharts } from "@/lib/ingestion/depth-charts";
import { ingestNextGenStats } from "@/lib/ingestion/next-gen-stats";
import { recordFreeIngestionRun } from "@/lib/data-sources/free-ingestion-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel cron caps at 5 min

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  const resolved = resolveFootballStatsSeason();
  const season = seasonParam ? Number(seasonParam) : resolved.season;
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  // Players first (creates the Player rows), then the satellites concurrently —
  // injuries resolve playerId against the players just upserted. Next Gen Stats
  // (separation, CPOE, RYOE — free CC-BY-4.0 aggregates) persist alongside, one
  // pass per variant; previously the ingester existed but nothing invoked it.
  const stats = await ingestPlayerWeeklyStats(season);
  const [snaps, injuries, depth, ngsPassing, ngsReceiving, ngsRushing] = await Promise.all([
    ingestSnapCounts(season),
    ingestInjuries(season),
    ingestDepthCharts(season),
    ingestNextGenStats(season, "passing"),
    ingestNextGenStats(season, "receiving"),
    ingestNextGenStats(season, "rushing"),
  ]);
  const ngs = { passing: ngsPassing, receiving: ngsReceiving, rushing: ngsRushing };
  const success = [stats, snaps, injuries, depth, ngsPassing, ngsReceiving, ngsRushing].every(
    (r) => r.status === "ok",
  );

  // Durable free-mode health evidence: primary weekly-stats ok stamps SUCCESS
  // even when a satellite (e.g. early-season injuries) is empty/error — empty
  // injury state is honest, not a heartbeat failure.
  const primaryOk = stats.status === "ok";
  const ingestionRun = await recordFreeIngestionRun({
    sport: "nflverse-player-stats",
    gamesUpserted: stats.statsUpserted,
    oddsInserted: 0,
    failed: !primaryOk,
    errorMessage: primaryOk
      ? null
      : `refresh-player-stats: stats=${stats.status}${stats.error ? ` (${stats.error})` : ""}`,
  });

  return NextResponse.json(
    {
      success,
      season,
      seasonResolution: {
        season: resolved.season,
        reason: resolved.reason,
        labelledCurrent: resolved.labelledCurrent,
        completedFloor: resolved.completedFloor,
      },
      stats,
      snaps,
      injuries,
      depth,
      ngs,
      ingestionRun,
    },
    { status: success || primaryOk ? 200 : 502 },
  );
}
