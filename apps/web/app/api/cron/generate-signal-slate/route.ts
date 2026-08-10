/**
 * Vercel cron — free/signal model-signal slate (no Odds API key).
 * Opens PUBLIC_PICKS signal board when independents exist for upcoming games.
 * Never invents book odds. Never flips PERFORMANCE_STATS / maps.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { generateSignalSlate } from "@sports/ingestion-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const result = await generateSignalSlate({ logPrefix: "[cron:generate-signal-slate]" });
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
