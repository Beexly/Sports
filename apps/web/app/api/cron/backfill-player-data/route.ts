/**
 * Chunked multi-season backfill of nflverse player data (weekly stats, snaps,
 * injuries). The full 1999+ history is too much for one 300s request, so each
 * call processes at most MAX_SEASONS_PER_CALL seasons and returns `nextFrom` —
 * the operator (or a chaining job) re-calls with ?from=<nextFrom> until it is
 * null. Auth: Bearer <CRON_SECRET>.
 *
 *   GET /api/cron/backfill-player-data?from=1999&to=2025
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { backfillPlayerData, DATASET_MIN_SEASON } from "@/lib/ingestion/backfill-player-data";
import { ingestionTargetNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel cron caps at 5 min

const MAX_SEASONS_PER_CALL = 4; // bound wall-time under the cron cap

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const url = new URL(request.url);
  // Labelled season (not the completed-REG display floor) bounds the crawl so
  // the in-progress season is reachable the day the source publishes it.
  const maxSeason = ingestionTargetNflSeason() + 1;
  const from = Number(url.searchParams.get("from") ?? DATASET_MIN_SEASON.stats);
  const toParam = url.searchParams.get("to");
  const to = toParam ? Number(toParam) : ingestionTargetNflSeason();
  if (
    !Number.isInteger(from) || !Number.isInteger(to) ||
    from < 1999 || to < 1999 || from > maxSeason || to > maxSeason || from > to
  ) {
    return NextResponse.json({ error: "invalid season range" }, { status: 400 });
  }

  const capTo = Math.min(to, from + MAX_SEASONS_PER_CALL - 1);
  const result = await backfillPlayerData(from, capTo);
  const nextFrom = capTo < to ? capTo + 1 : null;
  return NextResponse.json({ success: result.allOk, ...result, nextFrom }, { status: 200 });
}
