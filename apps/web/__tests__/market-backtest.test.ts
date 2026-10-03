import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Market-calibration backtest: de-vig closing moneylines into the market's
 * forecast probability, pair with the real result, and run the actual Brier/ECE/
 * reliability math (real prediction-engine functions; only the DB is mocked).
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { historicalGame: { findMany: mocks.findMany } } }));

import { loadMarketCalibrationBacktest } from "@/lib/calibration/market-backtest";

beforeEach(() => mocks.findMany.mockReset());

describe("loadMarketCalibrationBacktest", () => {
  it("de-vigs closing moneylines and computes real calibration over settled games", async () => {
    mocks.findMany.mockResolvedValue([
      { season: 2021, homeMoneyline: -200, awayMoneyline: 170, homeScore: 24, awayScore: 17 }, // home win
      { season: 2022, homeMoneyline: 150, awayMoneyline: -180, homeScore: 10, awayScore: 21 }, // home loss
      { season: 2022, homeMoneyline: -110, awayMoneyline: -110, homeScore: 20, awayScore: 20 }, // tie → excluded
    ]);

    const r = await loadMarketCalibrationBacktest();

    expect(r.status).toBe("ok");
    expect(r.sampleSize).toBe(2); // tie excluded
    expect(r.seasonsCovered).toBe(2);
    expect(r.seasonRange).toEqual({ from: 2021, to: 2022 });
    expect(r.baseRate).toBeCloseTo(0.5, 4); // 1 of 2 home wins
    expect(r.brier).toBeGreaterThanOrEqual(0);
    expect(r.brier).toBeLessThanOrEqual(1);
    expect(r.curve).toHaveLength(10);
    expect(r.note).toMatch(/closing/i);
  });

  it("returns an honest no-data report when nothing is loaded", async () => {
    mocks.findMany.mockResolvedValue([]);
    const r = await loadMarketCalibrationBacktest();
    expect(r.status).toBe("no-data");
    expect(r.sampleSize).toBe(0);
    expect(r.curve).toHaveLength(0);
  });

  it("is stub-safe when the DB returns null", async () => {
    mocks.findMany.mockResolvedValue(null);
    const r = await loadMarketCalibrationBacktest();
    expect(r.status).toBe("no-data");
  });
});
