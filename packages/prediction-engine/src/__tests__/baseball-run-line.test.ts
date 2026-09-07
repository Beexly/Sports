import { describe, expect, it } from "vitest";
import { BASEBALL_RUN_LINES, isPublishableSpreadLine, scoreGame } from "../scoring.js";
import type { OddsInput } from "@sports/types";

/**
 * C-119 / C-125. Baseball's run line is a FIXED market: 1.5 standard, 2.5 and
 * 3.5 as alternates. The engine publishes the arithmetic MEAN of every book's
 * spread, so one contaminated odds row drags the published line off that ladder
 * to a number no book quotes. Measured on production 2026-09-07: 355 of 725
 * published MLB spread picks carried such a line, including 4.5, 5.5 and 7.5.
 *
 * Every value below is a LINE, not product data: no pick, score or win rate.
 */
describe("isPublishableSpreadLine — baseball run lines only", () => {
  it("accepts the run lines a book actually offers, either side", () => {
    for (const line of BASEBALL_RUN_LINES) {
      expect(isPublishableSpreadLine("baseball_mlb", line)).toBe(true);
      expect(isPublishableSpreadLine("baseball_mlb", -line)).toBe(true);
    }
  });

  it("refuses the means that contamination produces", () => {
    // Observed on production: near-misses that are visibly means of a mostly
    // 1.5 book set, and far values that cannot be baseball at all.
    for (const line of [1.375, 1.4375, 1.227272727272727, 2.375, 4.5, 5.5, 7.5, 13.5]) {
      expect(isPublishableSpreadLine("baseball_mlb", line)).toBe(false);
      expect(isPublishableSpreadLine("baseball_mlb", -line)).toBe(false);
    }
  });

  it("leaves every other sport alone, where a mean between book lines is real", () => {
    // Three football books at -3, -3.5, -3 average to -3.1667. No book quotes
    // it, and it is still a legitimate consensus — 72 percent of NCAAF picks
    // sit on such a value, so a blanket "must be quoted" rule would gut the
    // board. This guard is baseball-only on purpose.
    for (const sport of ["americanfootball_nfl", "americanfootball_ncaaf", "basketball_nba", "icehockey_nhl"]) {
      expect(isPublishableSpreadLine(sport, -3.1666666666666665)).toBe(true);
      expect(isPublishableSpreadLine(sport, 7.5)).toBe(true);
    }
  });

  it("matches the sport by KEY prefix, the value process-sport now passes", () => {
    // The soccer guard silently never fired in production because the display
    // NAME was passed instead of the key (C-118). Same failure mode would apply
    // here, so pin the contract.
    expect(isPublishableSpreadLine("baseball_mlb", 4.5)).toBe(false);
    expect(isPublishableSpreadLine("MLB", 4.5)).toBe(true); // a NAME is not a key
  });

  it("refuses a non-finite line rather than letting it through", () => {
    expect(isPublishableSpreadLine("baseball_mlb", Number.NaN)).toBe(false);
    expect(isPublishableSpreadLine("baseball_mlb", Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("tolerates float drift in a mean that lands on a real run line", () => {
    const mean = (1.5 + 1.5 + 1.5) / 3;
    expect(isPublishableSpreadLine("baseball_mlb", mean)).toBe(true);
  });
});

/**
 * The predicate is only half the guard. C-118 was a guard whose unit test passed
 * while the production path never reached it, so pin the SCORER's behaviour too.
 */
describe("scoreGame — a baseball spread off the run-line ladder is not published", () => {
  const mlbInput = (spreads: readonly number[]): OddsInput => ({
    gameId: "game-run-line-fixture",
    homeTeam: "Fixture Home Sox",
    awayTeam: "Fixture Away Birds",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "baseball_mlb",
    bookmakerOdds: spreads.map((spread, i) => ({
      bookmaker: `fixture-book-${i}`,
      market: "SPREADS" as const,
      spread,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
  });

  it("publishes the spread when every book agrees on the real run line", () => {
    const picks = scoreGame(mlbInput([-1.5, -1.5, -1.5, -1.5]));
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(true);
  });

  it("drops the spread when the mean lands between run lines", () => {
    // -1.75 is a real published value (measured on production, 5 picks). Three
    // books at the standard run line and one at the 2.5 alternate average to a
    // number that sits BETWEEN two rungs of the ladder, so no book quotes it.
    // Chosen deliberately as a NEAR miss: a wildly contaminated mean like -5.25
    // is already refused by the dispersion and edge thresholds, so testing that
    // would pass with or without this guard and prove nothing.
    const picks = scoreGame(mlbInput([-1.5, -1.5, -1.5, -2.5]));
    expect(picks.some((p) => p.pickType === "SPREAD")).toBe(false);
  });

});
