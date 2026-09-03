import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Market-calibration backtest: de-vig closing moneylines into the market's
 * forecast probability, pair with the real result, and run the actual Brier/ECE/
 * reliability math (real prediction-engine functions; only the DB is mocked).
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { historicalGame: { findMany: mocks.findMany } } }));

import {
  loadMarketCalibrationBacktest,
  resetMarketBacktestCacheForTests,
} from "@/lib/calibration/market-backtest";

beforeEach(() => {
  mocks.findMany.mockReset();
  resetMarketBacktestCacheForTests();
});

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

/**
 * Cost bound for the PUBLIC, unauthenticated /api/calibration/market-backtest.
 * The query below is a `findMany` over historical_games with no `take` and no
 * pagination, so every un-memoised request is a full-table read pulled into the
 * Node process. Unbounded, a concurrent curl loop saturates the Neon pool and
 * times out /dashboard and /picks for paying subscribers.
 */
describe("loadMarketCalibrationBacktest cost bound", () => {
  const PRICED_ROWS = [
    { season: 2021, homeMoneyline: -200, awayMoneyline: 170, homeScore: 24, awayScore: 17 },
    { season: 2022, homeMoneyline: 150, awayMoneyline: -180, homeScore: 10, awayScore: 21 },
  ];

  it("memoises: a second call inside the TTL does not re-query historical_games", async () => {
    mocks.findMany.mockResolvedValue(PRICED_ROWS);

    const first = await loadMarketCalibrationBacktest();
    const second = await loadMarketCalibrationBacktest();

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(second).toBe(first); // same memoised report object, not a recompute
    expect(second.sampleSize).toBe(2);
  });

  it("single-flights a concurrent burst into ONE full-table read", async () => {
    // 50 requests that all arrive before the first read resolves — the exact
    // shape a cache alone cannot help with, since every one of them misses.
    let release!: (rows: typeof PRICED_ROWS) => void;
    const gate = new Promise<typeof PRICED_ROWS>((resolve) => (release = resolve));
    mocks.findMany.mockImplementation(() => gate);

    const burst = Promise.all(
      Array.from({ length: 50 }, () => loadMarketCalibrationBacktest()),
    );
    await Promise.resolve(); // let every caller reach its first await
    expect(mocks.findMany).toHaveBeenCalledTimes(1);

    release(PRICED_ROWS);
    const reports = await burst;
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(reports.every((r) => r === reports[0])).toBe(true);
  });

  it("cacheTtlMs: 0 opts out entirely (uncached callers still recompute)", async () => {
    mocks.findMany.mockResolvedValue(PRICED_ROWS);

    await loadMarketCalibrationBacktest({ cacheTtlMs: 0 });
    await loadMarketCalibrationBacktest({ cacheTtlMs: 0 });

    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });

  it("does not pin the endpoint to a failed read", async () => {
    mocks.findMany.mockRejectedValueOnce(new Error("neon pool exhausted"));
    await expect(loadMarketCalibrationBacktest()).rejects.toThrow("neon pool exhausted");

    mocks.findMany.mockResolvedValue(PRICED_ROWS);
    const recovered = await loadMarketCalibrationBacktest();
    expect(recovered.status).toBe("ok");
  });
});
