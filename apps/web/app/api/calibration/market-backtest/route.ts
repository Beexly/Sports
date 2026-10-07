/**
 * Public market-calibration backtest. Aggregate calibration of the closing line
 * over historical games (Brier / ECE / reliability curve) — a methodology/proof
 * surface, not premium picks, so it is intentionally public (per the platform's
 * public-calibration trust posture).
 *
 * Public does not mean unbounded (GSE-SEC-031 family): the loader reads
 * `historical_games` with no `take` and no pagination, so an unauthenticated
 * `while true; do curl ... & done` turned N concurrent requests into N
 * full-table reads and saturated the Neon pool — which times out /dashboard and
 * /picks for PAYING subscribers. The fix keeps the data public and bounds the
 * cost: an IP-keyed limiter (same shape as /api/sources/catalog) in front of an
 * hour-memoised, single-flight loader.
 */
import { NextRequest, NextResponse } from "next/server";
import { loadMarketCalibrationBacktest } from "@/lib/calibration/market-backtest";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

const RATE_MAX = 60;
const RATE_WINDOW_MS = 60_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limit = consumeRateLimit("calibration-market-backtest", clientIp(req), RATE_MAX, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  const data = await loadMarketCalibrationBacktest();
  return NextResponse.json({ success: data.status === "ok", data });
}
