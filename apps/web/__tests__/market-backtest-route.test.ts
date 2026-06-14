import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/calibration/market-backtest", () => ({ loadMarketCalibrationBacktest: vi.fn() }));

import { GET } from "@/app/api/calibration/market-backtest/route";
import { loadMarketCalibrationBacktest } from "@/lib/calibration/market-backtest";

describe("GET /api/calibration/market-backtest", () => {
  beforeEach(() => (loadMarketCalibrationBacktest as Mock).mockReset());

  it("returns the report with success=true when ok", async () => {
    (loadMarketCalibrationBacktest as Mock).mockResolvedValue({ status: "ok", sampleSize: 100, brier: 0.2 });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { sampleSize: number } };
    expect(body.success).toBe(true);
    expect(body.data.sampleSize).toBe(100);
  });

  it("returns success=false for the honest no-data state", async () => {
    (loadMarketCalibrationBacktest as Mock).mockResolvedValue({ status: "no-data", sampleSize: 0 });
    const res = await GET();
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });
});
