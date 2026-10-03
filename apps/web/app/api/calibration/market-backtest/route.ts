/**
 * Public market-calibration backtest. Aggregate calibration of the closing line
 * over historical games (Brier / ECE / reliability curve) — a methodology/proof
 * surface, not premium picks, so it is intentionally public (per the platform's
 * public-calibration trust posture).
 */
import { NextResponse } from "next/server";
import { loadMarketCalibrationBacktest } from "@/lib/calibration/market-backtest";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadMarketCalibrationBacktest();
  return NextResponse.json({ success: data.status === "ok", data });
}
