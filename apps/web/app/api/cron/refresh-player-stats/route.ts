/**
 * Vercel cron — refresh NFL player weekly stats from nflverse.
 *
 * Persists `player_stats_week` into the Player / PlayerGameStat system-of-record
 * via the clearance-gated ingestion. nflverse is free (CC-BY-4.0), so this can
 * run on a frequent cadence at no metered cost — the "accurate numbers from free
 * sources, refreshed often, without the Odds API bill" path.
 *
 * NOT yet scheduled. To enable (e.g. every 30 minutes), add to `vercel.json`
 * crons (mind your Vercel plan's cron limit):
 *   { "path": "/api/cron/refresh-player-stats", "schedule": "0,30 * * * *" }
 *
 * Auth: Bearer <CRON_SECRET>, same as the other cron routes.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { ingestPlayerWeeklyStats, currentNflSeason } from "@/lib/ingestion/player-stats";
import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";
import { ingestDepthCharts } from "@/lib/ingestion/depth-charts";
import { ingestNextGenStats } from "@/lib/ingestion/next-gen-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel cron caps at 5 min

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const seasonParam = new URL(request.url).searchParams.get("season");
  const season = seasonParam ? Number(seasonParam) : currentNflSeason();
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
  return NextResponse.json(
    { success, season, stats, snaps, injuries, depth, ngs },
    { status: success ? 200 : 502 },
  );
}
