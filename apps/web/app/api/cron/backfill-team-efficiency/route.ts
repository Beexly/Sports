/**
 * Chunked backfill of team-game efficiency from play-by-play (1999+). PBP is the
 * heaviest nflverse asset, so each call processes at most MAX_SEASONS_PER_CALL
 * seasons and returns `nextFrom` to chunk through the full history without
 * exceeding the cron timeout. Auth: Bearer <CRON_SECRET>.
 *
 *   GET /api/cron/backfill-team-efficiency?from=1999&to=2025
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { ingestTeamEfficiency } from "@/lib/ingestion/team-efficiency";
import { currentNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel cron caps at 5 min

const MIN_SEASON = 1999; // nflfastR play-by-play / EPA goes back to 1999
const MAX_SEASONS_PER_CALL = 2; // PBP is heavy — keep each call well under the timeout

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const maxSeason = currentNflSeason() + 1;
  // Cron (no query) refreshes the CURRENT season only. Historical crawl is
  // still `?from=1999&to=…` in 2-season chunks. Unparameterized default used
  // to be 1999, so a scheduled hit would rewrite 1999–2000 forever and never
  // fill the live EPA path (TeamGameEfficiency is empty in production).
  const from = Number(url.searchParams.get("from") ?? currentNflSeason());
  const toParam = url.searchParams.get("to");
  const to = toParam ? Number(toParam) : currentNflSeason();
  if (
    !Number.isInteger(from) || !Number.isInteger(to) ||
    from < MIN_SEASON || to < MIN_SEASON || from > maxSeason || to > maxSeason || from > to
  ) {
    return NextResponse.json({ error: "invalid season range" }, { status: 400 });
  }

  const capTo = Math.min(to, from + MAX_SEASONS_PER_CALL - 1);
  const results = [];
  for (let season = from; season <= capTo; season++) {
    results.push(await ingestTeamEfficiency(season));
  }
  const success = results.every((r) => r.status === "ok");
  const nextFrom = capTo < to ? capTo + 1 : null;
  return NextResponse.json({ success, results, nextFrom }, { status: 200 });
}
