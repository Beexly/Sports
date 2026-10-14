
/**
 * GET /api/cron/microstructure-report — the market-microstructure audit
 * surface (market-consensus-q + kalshi-book-divergence, wired 2026-10-14).
 *
 * REPORT ONLY — priced:false. Reads the kalshi_full_slate RESEARCH artifact
 * (public trade-API reads already landed) + the Odds table rows the free
 * ESPN refresh already fetched. Writes NOTHING to game_signals or picks:
 * the Kalshi paid-required ingest gate (prediction-market-snapshot header)
 * is untouched. The report is the sharp's audit surface: consensus q
 * (labeled, logit-weighted) + "book too long vs Kalshi" direction flags.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { buildMicrostructureReport } from "@/lib/ops/microstructure-report";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;
  try {
    const report = await buildMicrostructureReport();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      {
        priced: false as const,
        games: [],
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
