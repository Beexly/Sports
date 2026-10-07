import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/calibration/market-backtest", () => ({ loadMarketCalibrationBacktest: vi.fn() }));

import { GET } from "@/app/api/calibration/market-backtest/route";
import { loadMarketCalibrationBacktest } from "@/lib/calibration/market-backtest";
import { resetRateLimits } from "@/lib/api/rate-limit";

/** Distinct IP per test so buckets never bleed across cases. */
function req(ip: string): NextRequest {
  return new NextRequest("http://x/api/calibration/market-backtest", {
    headers: { "x-real-ip": ip },
  });
}

describe("GET /api/calibration/market-backtest", () => {
  beforeEach(() => {
    (loadMarketCalibrationBacktest as Mock).mockReset();
    resetRateLimits();
  });

  it("returns the report with success=true when ok", async () => {
    (loadMarketCalibrationBacktest as Mock).mockResolvedValue({ status: "ok", sampleSize: 100, brier: 0.2 });
    const res = await GET(req("10.0.0.1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { sampleSize: number } };
    expect(body.success).toBe(true);
    expect(body.data.sampleSize).toBe(100);
  });

  it("returns success=false for the honest no-data state", async () => {
    (loadMarketCalibrationBacktest as Mock).mockResolvedValue({ status: "no-data", sampleSize: 0 });
    const res = await GET(req("10.0.0.2"));
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("stays PUBLIC — an anonymous caller is served, never 401/403", async () => {
    // Fix 3 must not change what is public: this is an aggregate proof surface.
    (loadMarketCalibrationBacktest as Mock).mockResolvedValue({ status: "ok", sampleSize: 7 });
    const res = await GET(req("10.0.0.3"));
    expect(res.status).toBe(200);
  });

  it("rate-limits an unauthenticated curl loop and stops running the full-table backtest", async () => {
    // The attack: `while true; do curl -s .../api/calibration/market-backtest & done`.
    // Each unbounded call was a findMany over historical_games with no take.
    (loadMarketCalibrationBacktest as Mock).mockResolvedValue({ status: "ok", sampleSize: 100 });
    const ip = "203.0.113.9";

    for (let i = 0; i < 60; i += 1) {
      expect((await GET(req(ip))).status).toBe(200);
    }
    expect(loadMarketCalibrationBacktest).toHaveBeenCalledTimes(60);

    const blocked = await GET(req(ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    // The expensive loader is never reached past the limit.
    expect(loadMarketCalibrationBacktest).toHaveBeenCalledTimes(60);

    // A different client keeps its own budget — the limiter bounds abuse, not the public.
    expect((await GET(req("203.0.113.10"))).status).toBe(200);
  });
});
