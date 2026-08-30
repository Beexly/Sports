/**
 * Public Elo-vs-market calibration backtest. Aggregate, methodology/proof
 * surface (no picks), so intentionally public — same posture as the market
 * backtest. Shows whether a results-only Elo matches the closing line.
 */
import { NextResponse } from "next/server";
import { loadEloVsMarketBacktest } from "@/lib/calibration/elo-backtest";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadEloVsMarketBacktest();
  return NextResponse.json({ success: data.status === "ok", data });
}
