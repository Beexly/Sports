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
import { currentNflSeason, ingestionTargetNflSeason } from "@/lib/ingestion/player-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel cron caps at 5 min

const MIN_SEASON = 1999; // nflfastR play-by-play / EPA goes back to 1999
const MAX_SEASONS_PER_CALL = 2; // PBP is heavy — keep each call well under the timeout

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const url = new URL(request.url);
  // The labelled season (September 2026 → 2026) is what the cron must ask the
  // source for; `currentNflSeason()` is the completed-REG display floor and
  // following it here kept the live EPA path on 2025 for the whole 2026
  // season. When the labelled season is not published yet (pre-week-1 404),
  // the scheduled run falls back to the floor so the run stays green.
  const labelled = ingestionTargetNflSeason();
  const floor = currentNflSeason();
  const maxSeason = labelled + 1;
  // Cron (no query) refreshes the labelled season only. Historical crawl is
  // still `?from=1999&to=…` in 2-season chunks. Unparameterized default used
  // to be 1999, so a scheduled hit would rewrite 1999–2000 forever and never
  // fill the live EPA path (TeamGameEfficiency is empty in production).
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = Number(fromParam ?? labelled);
  const to = toParam ? Number(toParam) : labelled;
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

  // Scheduled default only: the labelled season source-errored (nflverse has
  // not published its play-by-play yet), so refresh the completed floor
  // instead. Reported separately — never relabelled as the labelled season.
  const scheduledDefault = fromParam === null && toParam === null;
  const floorFallback =
    scheduledDefault && labelled !== floor && results.every((r) => r.status === "source-error")
      ? await ingestTeamEfficiency(floor)
      : null;

  const success = floorFallback
    ? floorFallback.status === "ok"
    : results.every((r) => r.status === "ok");
  const nextFrom = capTo < to ? capTo + 1 : null;
  return NextResponse.json(
    { success, season: { labelled, floor }, results, floorFallback, nextFrom },
    { status: 200 },
  );
}
