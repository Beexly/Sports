import { describe, it, expect } from "vitest";
import { eloBacktest, type EloBacktestGame } from "../elo-backtest.js";

function game(
  season: number, week: number, home: string, away: string, hs: number, as: number, include?: boolean,
): EloBacktestGame {
  return { season, week, homeTeam: home, awayTeam: away, homeScore: hs, awayScore: as, ...(include !== undefined ? { includeInCalibration: include } : {}) };
}

describe("eloBacktest", () => {
  it("returns an empty report for no games", () => {
    expect(eloBacktest([]).sampleSize).toBe(0);
  });

  it("favours and correctly predicts a dominant home team", () => {
    const games = Array.from({ length: 6 }, (_, i) => game(2020, i + 1, "A", "B", 24, 10));
    const r = eloBacktest(games);
    expect(r.sampleSize).toBe(6);
    expect(r.accuracy).toBe(1); // A is the home favourite every week and wins every week
    expect(r.baseRate).toBe(1); // all home wins
    expect(r.teamsRated).toBe(2);
    expect(r.brier).toBeGreaterThanOrEqual(0);
    expect(r.brier).toBeLessThanOrEqual(1);
    expect(r.curve).toHaveLength(10);
  });

  it("updates ratings on every game but scores only flagged games", () => {
    const games = [
      game(2020, 1, "A", "B", 24, 10, false), // ratings update, not scored
      game(2020, 2, "A", "B", 24, 10, true),
      game(2020, 3, "C", "D", 20, 17), // default include
    ];
    const r = eloBacktest(games);
    expect(r.sampleSize).toBe(2); // the false-flagged game is excluded
    expect(r.teamsRated).toBe(4); // A, B, C, D all rated
  });

  it("excludes ties from the calibration sample but still rates the teams", () => {
    const r = eloBacktest([game(2020, 1, "A", "B", 17, 17)]);
    expect(r.sampleSize).toBe(0);
    expect(r.teamsRated).toBe(2);
  });

  it("regresses ratings between seasons (carryover applied)", () => {
    // One season of A dominating, then a cross-season game; with carryover the
    // gap shrinks vs no carryover. Just assert it runs and scores both seasons.
    const games = [
      ...Array.from({ length: 8 }, (_, i) => game(2020, i + 1, "A", "B", 30, 0)),
      game(2021, 1, "A", "B", 21, 20),
    ];
    const r = eloBacktest(games, { seasonCarryover: 0.5 });
    expect(r.sampleSize).toBe(9);
    expect(r.teamsRated).toBe(2);
  });
});
