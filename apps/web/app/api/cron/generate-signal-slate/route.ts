/**
 * Vercel cron — free/signal model-signal slate (no Odds API key).
 * Opens PUBLIC_PICKS signal board when independents exist for upcoming games.
 * Never invents book odds. Never flips PERFORMANCE_STATS / maps.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
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

  try {
    const result = await generateSignalSlate({
      logPrefix: "[cron:generate-signal-slate]",
      trace: await slateAssociationTrace(),
    });
    // A REFUSAL IS NOT A SUCCESS. MEASURED 2026-09-28 by reading
    // packages/ingestion-pipeline/src/generate-signal-slate.ts:177-191 rather
    // than by guessing: `generateSignalSlate` refuses by RESOLVING with
    // `ok: false` (the no-ASSOCIATION_ONLY-trace guard), not by throwing. So
    // the catch below never runs, the refusal body was spread straight into a
    // 200, and a cron that DECLINED TO MINT read as a cron that ran.
    //
    // That is the exact defect this lane exists to kill, one layer up from the
    // two fixed in #944: the body said `ok: false` while the status said
    // "fine". Every consumer that reads only the status — Vercel's scheduler,
    // an uptime probe, whoever opens the log — saw success. Nothing in the
    // route distinguished "minted a slate" from "declined to mint".
    //
    // 503, not 500: nothing crashed and the trace is recoverable, but the
    // cycle did not do its work, so it must not be readable as having done it.
    if (result.ok !== true) {
      return NextResponse.json(
        {
          ...result,
          ok: false,
          oddsApiRequired: false as const,
          claimPosture: "experimental_model_signal_not_book_line",
          note:
            "The slate REFUSED and no picks were minted this cycle. A refusal is " +
            "reported as a failure so a declined cycle is never read as a run.",
        },
        { status: 503 },
      );
    }
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
