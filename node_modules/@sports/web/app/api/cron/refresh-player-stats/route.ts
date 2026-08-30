/**
 * Vercel cron — refresh NFL player weekly stats from nflverse.
 *
 * Primary path (default): weekly player stats only + free IngestionRun SUCCESS.
 * Full path (?mode=full): sequential satellites (snaps, injuries, depth, NGS).
 *
 * Why default is primary-only:
 * Hobby serverless OOM'd even with sequential satellites after weekly stats
 * (2026-08-06: killed after ~90s post-primary). Health SLA + paid-worth
 * spine need the primary stamp; satellites can run less often via mode=full
 * or a future larger memory tier.
 *
 * Auth: Bearer <CRON_SECRET>.
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
export const maxDuration = 300;

type SatelliteBundle = {
  snaps: unknown;
  injuries: unknown;
  depth: unknown;
  ngs: {
    passing: unknown;
    receiving: unknown;
    rushing: unknown;
  };
};

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  const mode = (url.searchParams.get("mode") ?? "primary").toLowerCase();
  const runFull = mode === "full" || mode === "all";

  const resolved = resolveFootballStatsSeason();
  const season = seasonParam ? Number(seasonParam) : resolved.season;
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  const stats = await ingestPlayerWeeklyStats(season);
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

  let satellites: SatelliteBundle | null = null;
  let satellitesOk = true;

  if (runFull) {
    const snaps = await ingestSnapCounts(season);
    const injuries = await ingestInjuries(season);
    const depth = await ingestDepthCharts(season);
    const ngsPassing = await ingestNextGenStats(season, "passing");
    const ngsReceiving = await ingestNextGenStats(season, "receiving");
    const ngsRushing = await ingestNextGenStats(season, "rushing");
    satellites = {
      snaps,
      injuries,
      depth,
      ngs: { passing: ngsPassing, receiving: ngsReceiving, rushing: ngsRushing },
    };
    satellitesOk = [snaps, injuries, depth, ngsPassing, ngsReceiving, ngsRushing].every(
      (r) => r.status === "ok",
    );
  }

  const success = primaryOk && satellitesOk;

  return NextResponse.json(
    {
      success,
      season,
      mode: runFull ? "full" : "primary",
      seasonResolution: {
        season: resolved.season,
        reason: resolved.reason,
        labelledCurrent: resolved.labelledCurrent,
        completedFloor: resolved.completedFloor,
      },
      stats,
      ...(satellites ?? {}),
      ingestionRun,
    },
    { status: primaryOk ? 200 : 502 },
  );
}
