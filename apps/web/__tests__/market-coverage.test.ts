import { describe, expect, it } from "vitest";
import {
  classifyMarketCoverage,
  loadMarketCoverage,
  MARKET_COVERAGE_WINDOW_HOURS,
  type MarketCoverageDb,
} from "@/lib/board/market-coverage";

const from = new Date("2026-09-12T12:00:00Z");
const to = new Date("2026-09-15T12:00:00Z");

describe("classifyMarketCoverage", () => {
  it("flags CFB totals as degraded when games exist but no TOTAL picks do (the zero-key gap)", () => {
    const report = classifyMarketCoverage(
      {
        games: [
          { sportKey: "americanfootball_ncaaf" },
          { sportKey: "americanfootball_ncaaf" },
          { sportKey: "americanfootball_ncaaf" },
        ],
        picks: [
          { sportKey: "americanfootball_ncaaf", pickType: "MONEYLINE" },
          { sportKey: "americanfootball_ncaaf", pickType: "MONEYLINE" },
          { sportKey: "americanfootball_ncaaf", pickType: "SPREAD" },
        ],
      },
      { from, to },
    );
    const cfb = report.sports.find((s) => s.sportKey === "americanfootball_ncaaf");
    expect(cfb?.games).toBe(3);
    expect(cfb?.picks).toEqual({ MONEYLINE: 2, SPREAD: 1, TOTAL: 0 });
    expect(cfb?.status).toEqual({ MONEYLINE: "covered", SPREAD: "covered", TOTAL: "none" });
    expect(report.degraded).toHaveLength(1);
    expect(report.degraded[0]).toMatchObject({ sportKey: "americanfootball_ncaaf", market: "TOTAL", games: 3 });
    expect(report.degraded[0]!.hint).toMatch(/MIN_BOOKMAKERS=2/);
    expect(report.degraded[0]!.hint).toMatch(/degraded, not broken/);
  });

  it("reports covered when every market has at least one published pending pick", () => {
    const report = classifyMarketCoverage(
      {
        games: [{ sportKey: "americanfootball_nfl" }],
        picks: [
          { sportKey: "americanfootball_nfl", pickType: "MONEYLINE" },
          { sportKey: "americanfootball_nfl", pickType: "SPREAD" },
          { sportKey: "americanfootball_nfl", pickType: "TOTAL" },
        ],
      },
      { from, to },
    );
    expect(report.degraded).toEqual([]);
    expect(report.sports[0]?.status).toEqual({ MONEYLINE: "covered", SPREAD: "covered", TOTAL: "covered" });
  });

  it("a sport with picks but no games in the window is no_games, never degraded (picks on stale rows)", () => {
    const report = classifyMarketCoverage(
      { games: [], picks: [{ sportKey: "baseball_mlb", pickType: "MONEYLINE" }] },
      { from, to },
    );
    expect(report.sports[0]?.status.TOTAL).toBe("no_games");
    expect(report.degraded).toEqual([]);
  });

  it("ignores unknown pick types and never invents a market", () => {
    const report = classifyMarketCoverage(
      { games: [{ sportKey: "soccer_usa_mls" }], picks: [{ sportKey: "soccer_usa_mls", pickType: "PROP" }] },
      { from, to },
    );
    expect(report.sports[0]?.picks).toEqual({ MONEYLINE: 0, SPREAD: 0, TOTAL: 0 });
    expect(report.degraded.map((d) => d.market)).toEqual(["MONEYLINE", "SPREAD", "TOTAL"]);
  });

  it("carries the window it was asked about", () => {
    const report = classifyMarketCoverage({ games: [], picks: [] }, { from, to });
    expect(report.from).toBe(from.toISOString());
    expect(report.to).toBe(to.toISOString());
    expect(report.windowHours).toBe(MARKET_COVERAGE_WINDOW_HOURS);
  });
});

describe("loadMarketCoverage", () => {
  it("queries board-eligible PENDING picks (published, non-bootstrap, not seed) and games inside the window", async () => {
    const seen: unknown[] = [];
    const db: MarketCoverageDb = {
      game: {
        findMany: async (args) => {
          seen.push(args);
          return [{ sport: { key: "americanfootball_ncaaf" } }, { sport: { key: "americanfootball_nfl" } }];
        },
      },
      pick: {
        findMany: async (args) => {
          seen.push(args);
          return [
            { pickType: "MONEYLINE", game: { sport: { key: "americanfootball_ncaaf" } } },
            { pickType: "TOTAL", game: { sport: { key: "americanfootball_nfl" } } },
            { pickType: "MONEYLINE", game: { sport: { key: "americanfootball_nfl" } } },
            { pickType: "SPREAD", game: { sport: { key: "americanfootball_nfl" } } },
          ];
        },
      },
    };
    const now = new Date("2026-09-12T12:00:00Z");
    const report = await loadMarketCoverage(db, now, 48);
    expect(report.windowHours).toBe(48);
    expect(report.to).toBe(new Date("2026-09-14T12:00:00Z").toISOString());
    expect(seen).toHaveLength(2);
    // A pick the public board hides (bootstrap, seed, unpublished) must never
    // satisfy coverage: the same predicate the board's relation filter uses.
    expect(seen[1]).toMatchObject({
      where: {
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
        result: "PENDING",
      },
    });
    expect(report.degraded.map((d) => `${d.sportKey}:${d.market}`)).toEqual([
      "americanfootball_ncaaf:SPREAD",
      "americanfootball_ncaaf:TOTAL",
    ]);
  });
});
