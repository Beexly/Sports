/**
 * Autonomous board fill — odds (Odds API + Rundown free) + signal slate.
 * In-process; no founder click. Auth: CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { runBoardFillPipeline } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export const fetchCache = "force-no-store";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const result = await runBoardFillPipeline({ logPrefix: "[cron:board-fill]" });
    return NextResponse.json({
      ok: result.ok,
      note: result.note,
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
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
