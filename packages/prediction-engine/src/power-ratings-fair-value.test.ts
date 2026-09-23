import { describe, expect, it } from "vitest";
import {
  powerRatingsToIndependentFairValue,
  powerRatingsToWinProbs,
  winPctVsAverageToIndependentFairValue,
  winPctVsAverageToWinProbs,
} from "./power-ratings-fair-value.js";

const FIXED_NOW = new Date("2026-09-23T12:00:00Z");
const now = () => FIXED_NOW;

describe("powerRatingsToWinProbs — points vs average", () => {
  it("gives the stronger side the higher probability", () => {
    const r = powerRatingsToWinProbs({
      homeRating: 5.8,
      awayRating: -2.0,
      sportKey: "americanfootball_nfl",
      source: "research_power_ratings",
    });
    expect(r).not.toBeNull();
    expect(r!.pHome).toBeGreaterThan(r!.pAway);
    expect(r!.pHome).toBeGreaterThan(0.5);
  });

  it("is near a coin flip (plus HFA) for equal ratings", () => {
    const r = powerRatingsToWinProbs({
      homeRating: 0,
      awayRating: 0,
      sportKey: "americanfootball_nfl",
      source: "research_power_ratings",
    });
    expect(r).not.toBeNull();
    expect(r!.pHome).toBeGreaterThan(0.5);
    expect(r!.pHome).toBeLessThan(0.6);
  });

  it("returns null on non-finite ratings", () => {
    expect(
      powerRatingsToWinProbs({
        homeRating: Number.NaN,
        awayRating: 1,
        sportKey: "americanfootball_nfl",
        source: "x",
      }),
    ).toBeNull();
  });

  it("returns null on unsupported sport", () => {
    expect(
      powerRatingsToWinProbs({
        homeRating: 1,
        awayRating: 0,
        sportKey: "chess",
        source: "x",
      }),
    ).toBeNull();
  });

  it("wraps IndependentMarketFairValue with caller source and capturedAt", () => {
    const fv = powerRatingsToIndependentFairValue(
      {
        homeRating: 5.8,
        awayRating: 2.0,
        sportKey: "americanfootball_nfl",
        source: "research_power_ratings",
      },
      { now },
    );
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("research_power_ratings");
    expect(fv!.capturedAt).toBe(FIXED_NOW.toISOString());
    expect(fv!.homeFairProb! + fv!.awayFairProb!).toBeCloseTo(1, 5);
  });
});

describe("winPctVsAverageToWinProbs — market-implied vs average", () => {
  it("maps a clear tier gap to a clear side lean", () => {
    const r = winPctVsAverageToWinProbs({
      homeWinPctVsAvg: 0.742,
      awayWinPctVsAvg: 0.219,
      source: "research_power_ratings",
    });
    expect(r).not.toBeNull();
    expect(r!.pHome).toBeGreaterThan(0.8);
  });

  it("is near a coin flip (plus HFA) for equal win rates", () => {
    const r = winPctVsAverageToWinProbs({
      homeWinPctVsAvg: 0.5,
      awayWinPctVsAvg: 0.5,
      source: "research_power_ratings",
    });
    expect(r).not.toBeNull();
    expect(r!.pHome).toBeGreaterThan(0.5);
    expect(r!.pHome).toBeLessThan(0.6);
  });

  it("returns null when either rate is outside (0, 1)", () => {
    expect(
      winPctVsAverageToWinProbs({
        homeWinPctVsAvg: 1,
        awayWinPctVsAvg: 0.5,
        source: "x",
      }),
    ).toBeNull();
    expect(
      winPctVsAverageToWinProbs({
        homeWinPctVsAvg: 0.5,
        awayWinPctVsAvg: 0,
        source: "x",
      }),
    ).toBeNull();
  });

  it("wraps IndependentMarketFairValue with caller source", () => {
    const fv = winPctVsAverageToIndependentFairValue(
      {
        homeWinPctVsAvg: 0.6,
        awayWinPctVsAvg: 0.4,
        source: "teamrankings",
      },
      { now },
    );
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("teamrankings");
    expect(fv!.capturedAt).toBe(FIXED_NOW.toISOString());
    expect(fv!.homeFairProb).toBeGreaterThan(fv!.awayFairProb!);
  });
});
