/**
 * Vercel cron — free/signal model-signal slate (no Odds API key).
 * Opens PUBLIC_PICKS signal board when independents exist for upcoming games.
 * Never invents book odds. Never flips PERFORMANCE_STATS / maps.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { canMintSignalPicksNow } from "@/lib/cron/noon-window-guard";
import { generateSignalSlate, slateAssociationTrace } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// 300s (the Vercel Pro cron ceiling, same as refresh-odds): Vercel runtime errors
// recorded 583 "Task timed out after 120 seconds" events across the cron routes
// between 2026-08-10 and 2026-09-05, which cut the slate mid-write every cycle.
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const mintGate = canMintSignalPicksNow(request);
  if (!mintGate.allowed) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: mintGate.reason,
      gamesConsidered: 0,
      candidatesWithIndependents: 0,
      picksUpserted: 0,
      picksSkipped: 0,
      fixtureUnconfirmed: 0,
      skippedInPlay: 0,
      seriesRepeatsSkipped: 0,
      mindWithheld: 0,
      errors: [],
      note: mintGate.reason,
      oddsApiRequired: false as const,
      claimPosture: "experimental_model_signal_not_book_line",
    });
  }

  try {
    const result = await generateSignalSlate({
      logPrefix: "[cron:generate-signal-slate]",
      trace: await slateAssociationTrace(),
    });
    return NextResponse.json({
      ...result,
      oddsApiRequired: false as const,
      claimPosture: "experimental_model_signal_not_book_line",
    });
  } catch (err) {
    console.error(
      `[cron:generate-signal-slate] failed: ${err instanceof Error ? err.message : err}`,
    );
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        oddsApiRequired: false as const,
      },
      { status: 500 },
    );
  }
}
