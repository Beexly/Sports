/**
 * Hourly forward line archive — ESPN/DraftKings leg.
 *
 * Captures one stamped OddsLineSnapshot batch per hour for every NFL game
 * kicking off in the next 7 days, so line-movement/CLV finally has the
 * OPEN/INTERIM history the L-14 census found missing (the table had never
 * persisted a row). In-process; no founder click. Auth: CRON_SECRET or
 * Vercel platform cron.
 *
 * HARD GATE: the job is a no-op (zero fetches, zero DB calls) unless
 * LINE_ARCHIVE_ENABLED=true in the production environment — the founder
 * flips that flag to start capture. Schedule lives in vercel.json
 * ("7 * * * *"); this route existing does not by itself capture anything.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { captureError } from "@/lib/observability/sentry";
import { runLineArchiverJob } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export const fetchCache = "force-no-store";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const result = await runLineArchiverJob({ logPrefix: "[cron:line-archiver]" });
    return NextResponse.json({
      ok: result.errors.length === 0,
      enabled: result.enabled,
      capturedAt: result.capturedAt,
      fetchedEvents: result.fetchedEvents,
      windowEvents: result.windowEvents,
      skippedStartedOrInvalid: result.skippedStartedOrInvalid,
      skippedBeyondWindow: result.skippedBeyondWindow,
      gamesArchived: result.gamesArchived,
      gamesWithoutRows: result.gamesWithoutRows,
      rowsPersisted: result.rowsPersisted,
      unresolvedEventIds: result.unresolvedEventIds,
      errors: result.errors.slice(0, 8),
    });
  } catch (err) {
    console.error(`[cron:line-archiver] ${err instanceof Error ? err.message : err}`);
    captureError(err, { path: "line-archiver" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
