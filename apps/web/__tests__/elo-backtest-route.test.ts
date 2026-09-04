import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/calibration/elo-backtest", () => ({ loadEloVsMarketBacktest: vi.fn() }));

import { GET } from "@/app/api/calibration/elo-backtest/route";
import { loadEloVsMarketBacktest } from "@/lib/calibration/elo-backtest";
import { resetRateLimits } from "@/lib/api/rate-limit";

/** Distinct IP per test so buckets never bleed across cases. */
function req(ip: string): NextRequest {
  return new NextRequest("http://x/api/calibration/elo-backtest", {
    headers: { "x-real-ip": ip },
  });
}

describe("GET /api/calibration/elo-backtest", () => {
  beforeEach(() => {
    (loadEloVsMarketBacktest as Mock).mockReset();
    resetRateLimits();
  });

  it("returns the comparison with success=true when ok", async () => {
    (loadEloVsMarketBacktest as Mock).mockResolvedValue({ status: "ok", betterCalibrated: "market", comparisonSampleSize: 5000 });
    const res = await GET(req("10.0.0.1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { betterCalibrated: string } };
    expect(body.success).toBe(true);
    expect(body.data.betterCalibrated).toBe("market");
  });

  it("returns success=false for the no-data state", async () => {
    (loadEloVsMarketBacktest as Mock).mockResolvedValue({ status: "no-data" });
    const res = await GET(req("10.0.0.2"));
    expect(((await res.json()) as { success: boolean }).success).toBe(false);
  });

  it("stays PUBLIC — an anonymous caller is served, never 401/403", async () => {
    // Fix 3 must not change what is public: this is an aggregate proof surface.
    (loadEloVsMarketBacktest as Mock).mockResolvedValue({ status: "ok", comparisonSampleSize: 3 });
    const res = await GET(req("10.0.0.3"));
    expect(res.status).toBe(200);
  });

  it("rate-limits an unauthenticated curl loop and stops running the Elo simulation", async () => {
    // The attack: `while true; do curl -s .../api/calibration/elo-backtest & done`.
    // Each unbounded call was a full historical_games read + a full Elo sim in JS.
    (loadEloVsMarketBacktest as Mock).mockResolvedValue({ status: "ok", comparisonSampleSize: 5000 });
    const ip = "203.0.113.11";

    for (let i = 0; i < 60; i += 1) {
      expect((await GET(req(ip))).status).toBe(200);
    }
    expect(loadEloVsMarketBacktest).toHaveBeenCalledTimes(60);

    const blocked = await GET(req(ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    // The expensive loader is never reached past the limit.
    expect(loadEloVsMarketBacktest).toHaveBeenCalledTimes(60);

    // A different client keeps its own budget — the limiter bounds abuse, not the public.
    expect((await GET(req("203.0.113.12"))).status).toBe(200);
  });
});
