import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/calibration/elo-backtest", () => ({ loadEloVsMarketBacktest: vi.fn() }));

import { GET } from "@/app/api/calibration/elo-backtest/route";
import { loadEloVsMarketBacktest } from "@/lib/calibration/elo-backtest";

describe("GET /api/calibration/elo-backtest", () => {
  beforeEach(() => (loadEloVsMarketBacktest as Mock).mockReset());

  it("returns the comparison with success=true when ok", async () => {
    (loadEloVsMarketBacktest as Mock).mockResolvedValue({ status: "ok", betterCalibrated: "market", comparisonSampleSize: 5000 });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { betterCalibrated: string } };
    expect(body.success).toBe(true);
    expect(body.data.betterCalibrated).toBe("market");
  });

  it("returns success=false for the no-data state", async () => {
    (loadEloVsMarketBacktest as Mock).mockResolvedValue({ status: "no-data" });
    const res = await GET();
    expect((await res.json() as { success: boolean }).success).toBe(false);
  });
});
