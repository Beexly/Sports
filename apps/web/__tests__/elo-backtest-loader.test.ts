import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Elo-vs-market loader: runs the real Elo backtest + de-vig market calibration
 * over the same moneyline games (only the DB is mocked) and reports which is
 * better calibrated.
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { historicalGame: { findMany: mocks.findMany } } }));

import {
  loadEloVsMarketBacktest,
  resetEloBacktestCacheForTests,
} from "@/lib/calibration/elo-backtest";

beforeEach(() => {
  mocks.findMany.mockReset();
  resetEloBacktestCacheForTests();
});

describe("loadEloVsMarketBacktest", () => {
  it("scores Elo and the market on the same moneyline games", async () => {
    // A strong home team (A) and a few priced games across two seasons.
    const rows = [
      { season: 2021, week: 1, homeTeam: "A", awayTeam: "B", homeScore: 30, awayScore: 10, homeMoneyline: -200, awayMoneyline: 170 },
      { season: 2021, week: 2, homeTeam: "A", awayTeam: "B", homeScore: 27, awayScore: 13, homeMoneyline: -180, awayMoneyline: 150 },
      { season: 2022, week: 1, homeTeam: "B", awayTeam: "A", homeScore: 14, awayScore: 24, homeMoneyline: 160, awayMoneyline: -190 },
      // no-moneyline game: warms Elo ratings but is not scored
      { season: 2020, week: 1, homeTeam: "A", awayTeam: "B", homeScore: 21, awayScore: 20, homeMoneyline: null, awayMoneyline: null },
    ];
    mocks.findMany.mockResolvedValue(rows);

    const r = await loadEloVsMarketBacktest();
    expect(r.status).toBe("ok");
    expect(r.comparisonSampleSize).toBe(3); // three priced, decided games
    expect(r.elo.sampleSize).toBe(3); // Elo scored on the same subset
    expect(r.market.sampleSize).toBe(3);
    expect(r.elo.teamsRated).toBe(2); // includes the unpriced 2020 game's teams
    expect(r.seasonRange).toEqual({ from: 2021, to: 2022 });
    expect(["elo", "market", "tie"]).toContain(r.betterCalibrated);
    expect(r.market.brier).toBeGreaterThanOrEqual(0);
  });

  it("returns no-data when no games have closing moneylines", async () => {
    mocks.findMany.mockResolvedValue([
      { season: 2003, week: 1, homeTeam: "A", awayTeam: "B", homeScore: 20, awayScore: 17, homeMoneyline: null, awayMoneyline: null },
    ]);
    expect((await loadEloVsMarketBacktest()).status).toBe("no-data");
  });

  it("is stub-safe when the DB returns null", async () => {
    mocks.findMany.mockResolvedValue(null);
    expect((await loadEloVsMarketBacktest()).status).toBe("no-data");
  });
});

/**
 * Cost bound for the PUBLIC, unauthenticated /api/calibration/elo-backtest.
 * The query is a `findMany` over historical_games with no `take` and no
 * pagination, and the Elo simulation then runs over every row in JS — the most
 * expensive of the two public backtests. Unbounded, a concurrent curl loop
 * saturates the Neon pool and times out /dashboard and /picks for subscribers.
 */
describe("loadEloVsMarketBacktest cost bound", () => {
  const PRICED_ROWS = [
    { season: 2021, week: 1, homeTeam: "A", awayTeam: "B", homeScore: 30, awayScore: 10, homeMoneyline: -200, awayMoneyline: 170 },
    { season: 2022, week: 1, homeTeam: "B", awayTeam: "A", homeScore: 14, awayScore: 24, homeMoneyline: 160, awayMoneyline: -190 },
  ];

  it("memoises: a second call inside the TTL does not re-query historical_games", async () => {
    mocks.findMany.mockResolvedValue(PRICED_ROWS);

    const first = await loadEloVsMarketBacktest();
    const second = await loadEloVsMarketBacktest();

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(second).toBe(first); // same memoised report, not a re-run Elo sim
    expect(second.status).toBe("ok");
  });

  it("single-flights a concurrent burst into ONE full-table read + ONE Elo sim", async () => {
    let release!: (rows: typeof PRICED_ROWS) => void;
    const gate = new Promise<typeof PRICED_ROWS>((resolve) => (release = resolve));
    mocks.findMany.mockImplementation(() => gate);

    const burst = Promise.all(Array.from({ length: 50 }, () => loadEloVsMarketBacktest()));
    await Promise.resolve();
    expect(mocks.findMany).toHaveBeenCalledTimes(1);

    release(PRICED_ROWS);
    const reports = await burst;
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(reports.every((r) => r === reports[0])).toBe(true);
  });

  it("cacheTtlMs: 0 opts out entirely (uncached callers still recompute)", async () => {
    mocks.findMany.mockResolvedValue(PRICED_ROWS);

    await loadEloVsMarketBacktest({ cacheTtlMs: 0 });
    await loadEloVsMarketBacktest({ cacheTtlMs: 0 });

    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });

  it("does not pin the endpoint to a failed read", async () => {
    mocks.findMany.mockRejectedValueOnce(new Error("neon pool exhausted"));
    await expect(loadEloVsMarketBacktest()).rejects.toThrow("neon pool exhausted");

    mocks.findMany.mockResolvedValue(PRICED_ROWS);
    expect((await loadEloVsMarketBacktest()).status).toBe("ok");
  });
});
