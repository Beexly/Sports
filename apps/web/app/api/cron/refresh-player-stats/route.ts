/**
 * Vercel cron — refresh NFL player weekly stats from nflverse.
 *
 * Persists `player_stats_week` into the Player / PlayerGameStat system-of-record
 * via the clearance-gated ingestion. nflverse is free (CC-BY-4.0), so this can
 * run on a frequent cadence at no metered cost — the "accurate numbers from free
 * sources, refreshed often, without the Odds API bill" path.
 *
 * Schedule: vercel.json `0,30 * * * *` (every 30 minutes); External Cron every 2h.
 *
 * Also records an honest IngestionRun SUCCESS when the primary weekly-stats
 * ingest completes so /api/health free-mode freshness is not solely dependent
 * on free-spine-health. Does not invent scores or injury designations.
 *
 * Memory: satellites run **sequentially** after the primary. Parallel
 * Promise.all of snaps+injuries+depth+3×NGS OOMs Hobby serverless (observed
 * 2026-08-06: "instance was killed because it ran out of available memory").
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

type IngestResult = { status: string; error?: string | null; statsUpserted?: number };

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  const resolved = resolveFootballStatsSeason();
  const season = seasonParam ? Number(seasonParam) : resolved.season;
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  // Primary first (creates Player rows) — this is the paid-worth stats spine.
  const stats = (await ingestPlayerWeeklyStats(season)) as IngestResult & {
    statsUpserted: number;
  };
  const primaryOk = stats.status === "ok";

  // Stamp free SUCCESS as soon as primary lands so health SLA is not blocked by
  // satellite OOMs or empty early-season injury files.
  const ingestionRun = await recordFreeIngestionRun({
    sport: "nflverse-player-stats",
    gamesUpserted: stats.statsUpserted ?? 0,
    oddsInserted: 0,
    failed: !primaryOk,
    errorMessage: primaryOk
      ? null
      : `refresh-player-stats: stats=${stats.status}${stats.error ? ` (${stats.error})` : ""}`,
  });

  // Sequential satellites — never Promise.all all six CSVs into one isolate.
  const snaps = await ingestSnapCounts(season);
  const injuries = await ingestInjuries(season);
  const depth = await ingestDepthCharts(season);
  const ngsPassing = await ingestNextGenStats(season, "passing");
  const ngsReceiving = await ingestNextGenStats(season, "receiving");
  const ngsRushing = await ingestNextGenStats(season, "rushing");
  const ngs = { passing: ngsPassing, receiving: ngsReceiving, rushing: ngsRushing };

  const success = [stats, snaps, injuries, depth, ngsPassing, ngsReceiving, ngsRushing].every(
    (r) => r.status === "ok",
  );

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
      execution: "sequential-satellites",
    },
    { status: success || primaryOk ? 200 : 502 },
  );
}
