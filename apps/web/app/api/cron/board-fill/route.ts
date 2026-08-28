/**
 * Autonomous board fill — ESPN seed + odds (Odds API + Rundown free) + signal slate.
 * In-process; no founder click. Auth: CRON_SECRET or Vercel platform cron.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { captureError } from "@/lib/observability/sentry";
import { runBoardFillPipeline } from "@sports/ingestion-pipeline";
import { isOffSeasonNoop, offSeasonNoopResponse } from "@/lib/cron/off-season-noop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export const fetchCache = "force-no-store";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  // H-M off-season no-op (Wave 7): board fill is forward-looking. When no sport
  // is explicitly requested and zero sports are in season, there is nothing to
  // seed/refresh — short-circuit before the ESPN+odds+signal pipeline runs.
  // Excludes settlement (backward-looking). A manual ?sport= backfill proceeds.
  const requestedSport = new URL(request.url).searchParams.get("sport");
  if (isOffSeasonNoop({ requestedSport })) {
    return NextResponse.json(offSeasonNoopResponse(requestedSport));
  }

  try {
    const result = await runBoardFillPipeline({ logPrefix: "[cron:board-fill]" });
    return NextResponse.json({
      ok: result.ok,
      note: result.note,
      quoteKeys: result.quoteKeys,
      seed: {
        ok: result.seed.ok,
        fetched: result.seed.fetched,
        upcoming: result.seed.upcoming,
        upserted: result.seed.upserted,
        skippedPast: result.seed.skippedPast,
        errors: result.seed.errors.slice(0, 8),
        note: result.seed.note,
      },
      odds: {
        ok: result.odds.ok,
        okCount: result.odds.okCount,
        totalCount: result.odds.totalCount,
        elapsedMs: result.odds.elapsedMs,
        results: result.odds.results,
      },
      signals: result.signals,
    });
  } catch (err) {
    console.error(`[cron:board-fill] ${err instanceof Error ? err.message : err}`);
    captureError(err, { path: "board-fill" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
