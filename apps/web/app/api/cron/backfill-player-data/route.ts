/**
 * Chunked multi-season backfill of nflverse player data (weekly stats, snaps,
 * injuries). The full 1999+ history is too much for one 300s request, so each
 * call processes at most MAX_SEASONS_PER_CALL seasons and returns `nextFrom` —
 * the operator (or a chaining job) re-calls with ?from=<nextFrom> until it is
 * null. Auth: Bearer <CRON_SECRET>.
 *
 * The bare default (no `from`/`to`) targets ONLY the labelled current season —
 * same convention as backfill-team-efficiency; a full historical crawl needs
 * an explicit `?from=1999&to=...` range. When the labelled season source-
 * errors or yields zero rows (nflverse has not published it yet), the default
 * retries the completed floor and reports it separately as `floorFallback` —
 * never relabelled. Explicit ranges are never retried this way.
 *
 *   GET /api/cron/backfill-player-data                 (labelled season, floor fallback)
 *   GET /api/cron/backfill-player-data?from=1999&to=2025  (explicit historical range)
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { backfillPlayerData, DATASET_MIN_SEASON } from "@/lib/ingestion/backfill-player-data";
import { currentNflSeason, ingestionTargetNflSeason } from "@/lib/ingestion/player-stats";
import { isUnpublishedSeasonSignal } from "@/lib/ingestion/unpublished-season";

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
  const labelled = ingestionTargetNflSeason();
  const floor = currentNflSeason();
  const maxSeason = labelled + 1;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  // Bare hit (no from/to) defaults to the labelled season only — previously
  // `from` alone still defaulted to DATASET_MIN_SEASON.stats (1999), so a
  // bare hit silently restarted a historical crawl instead of refreshing the
  // current season. Explicit `?from=1999` still starts the historical crawl.
  const from = Number(fromParam ?? labelled);
  const to = toParam ? Number(toParam) : labelled;
  if (
    !Number.isInteger(from) || !Number.isInteger(to) ||
    from < DATASET_MIN_SEASON.stats || to < DATASET_MIN_SEASON.stats || from > maxSeason || to > maxSeason || from > to
  ) {
    return NextResponse.json({ error: "invalid season range" }, { status: 400 });
  }

  const capTo = Math.min(to, from + MAX_SEASONS_PER_CALL - 1);
  const result = await backfillPlayerData(from, capTo);

  // Bare default only: the labelled season's weekly-stats ingestion
  // source-errored, or reported "ok" with zero rows for every season in this
  // chunk (nflverse returned the older combined asset ahead of publishing
  // the labelled season) — retry the completed floor and report it
  // separately. clearance-denied is deliberately excluded — that is a
  // rights stop, not an unpublished-season signal, and must not retry.
  const scheduledDefault = fromParam === null && toParam === null;
  const labelledUnpublished =
    result.results.length > 0 &&
    result.results.every((r) => {
      if (r.stats === "skipped") return false;
      // 404 or ok-with-zero-rows only; a 5xx/timeout is an outage, not an
      // unpublished season (lib/ingestion/unpublished-season.ts).
      return isUnpublishedSeasonSignal(r.stats);
    });
  const floorFallback =
    scheduledDefault && labelled !== floor && labelledUnpublished
      ? await backfillPlayerData(floor, floor)
      : null;

  const success = floorFallback ? floorFallback.allOk : result.allOk;
  const nextFrom = capTo < to ? capTo + 1 : null;
  return NextResponse.json(
    { success, season: { labelled, floor }, ...result, floorFallback, nextFrom },
    { status: 200 },
  );
}
