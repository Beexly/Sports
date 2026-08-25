/**
 * Public Elo-vs-market calibration backtest. Aggregate, methodology/proof
 * surface (no picks), so intentionally public — same posture as the market
 * backtest. Shows whether a results-only Elo matches the closing line.
 *
 * Public does not mean unbounded (GSE-SEC-031 family): the loader reads
 * `historical_games` with no `take` and no pagination and then runs a full Elo
 * simulation in JS, so an unauthenticated concurrent curl loop turned N
 * requests into N full-table reads plus N simulations — Neon pool saturation,
 * and /dashboard and /picks timing out for PAYING subscribers. The data stays
 * public; the cost is bounded by an IP-keyed limiter (same shape as
 * /api/sources/catalog) in front of an hour-memoised, single-flight loader.
 */
import { NextRequest, NextResponse } from "next/server";
import { loadEloVsMarketBacktest } from "@/lib/calibration/elo-backtest";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

const RATE_MAX = 60;
const RATE_WINDOW_MS = 60_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limit = consumeRateLimit("calibration-elo-backtest", clientIp(req), RATE_MAX, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  const data = await loadEloVsMarketBacktest();
  return NextResponse.json({ success: data.status === "ok", data });
}
