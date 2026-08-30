import { describe, expect, it } from "vitest";
import { eloWinProbability, updateEloRatings, toEloFairValue } from "../elo-estimator.js";

const round2 = (x: number) => Number(x.toFixed(2));

describe("eloWinProbability", () => {
  it("gives the home side an edge from home advantage at equal ratings", () => {
    const p = eloWinProbability(1500, 1500);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThan(0.7);
  });

  it("is 0.5 with equal ratings and no home advantage", () => {
    expect(eloWinProbability(1500, 1500, { homeAdvantage: 0 })).toBeCloseTo(0.5, 6);
  });

  it("strongly favors a much higher-rated home team", () => {
    expect(eloWinProbability(1900, 1500)).toBeGreaterThan(0.8);
  });
});

describe("updateEloRatings", () => {
  it("is zero-sum and rewards the winner", () => {
    const { home, away } = updateEloRatings(1500, 1500, true, 20, { homeAdvantage: 0 });
    expect(home).toBeGreaterThan(1500);
    expect(away).toBeLessThan(1500);
    expect(round2(home - 1500)).toBeCloseTo(round2(1500 - away), 6);
  });

  it("swings more when an underdog wins", () => {
    const favWins = updateEloRatings(1700, 1500, true, 20, { homeAdvantage: 0 });
    const dogWins = updateEloRatings(1500, 1700, true, 20, { homeAdvantage: 0 });
    expect(dogWins.home - 1500).toBeGreaterThan(favWins.home - 1700);
  });
});

describe("toEloFairValue", () => {
  it("emits a source-tagged fair value summing to 1", () => {
    const fv = toEloFairValue(1600, 1500, { now: () => new Date("2026-06-03T00:00:00Z") });
    expect(fv.source).toBe("elo");
    expect((fv.homeFairProb ?? 0) + (fv.awayFairProb ?? 0)).toBeCloseTo(1, 4);
    expect(fv.capturedAt).toBe("2026-06-03T00:00:00.000Z");
  });
});
