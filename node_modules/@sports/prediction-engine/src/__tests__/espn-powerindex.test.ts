import { describe, it, expect } from "vitest";
import {
  powerIndexToWinProbs,
  powerIndexToIndependentFairValue,
  sigmoidMargin,
  resolvePowerIndexSport,
} from "../espn-powerindex.js";

describe("espn-powerindex logistic", () => {
  it("sigmoid is monotone and mid at 0", () => {
    expect(sigmoidMargin(0, 13.5)).toBeCloseTo(0.5, 5);
    expect(sigmoidMargin(13.5, 13.5)).toBeGreaterThan(0.7);
    expect(sigmoidMargin(-13.5, 13.5)).toBeLessThan(0.3);
  });

  it("resolves sport aliases", () => {
    expect(resolvePowerIndexSport("americanfootball_nfl")).toBe(
      "americanfootball_nfl",
    );
    expect(resolvePowerIndexSport("nfl")).toBe("americanfootball_nfl");
    expect(resolvePowerIndexSport("soccer_epl")).toBeNull();
  });

  it("stronger home FPI → higher pHome", () => {
    const r = powerIndexToWinProbs({
      homeFpi: 10,
      awayFpi: -5,
      sportKey: "americanfootball_nfl",
    });
    expect(r).not.toBeNull();
    expect(r!.pHome).toBeGreaterThan(0.7);
    expect(r!.pAway).toBeCloseTo(1 - r!.pHome, 5);
    expect(r!.pHome + r!.pAway).toBeCloseTo(1, 5);
  });

  it("equal FPI with HFA → home slight favorite", () => {
    const r = powerIndexToWinProbs({
      homeFpi: 0,
      awayFpi: 0,
      sportKey: "americanfootball_nfl",
    });
    expect(r).not.toBeNull();
    expect(r!.pHome).toBeGreaterThan(0.5);
    expect(r!.pHome).toBeLessThan(0.6);
  });

  it("null on non-finite FPI or unsupported sport", () => {
    expect(
      powerIndexToWinProbs({
        homeFpi: NaN,
        awayFpi: 1,
        sportKey: "americanfootball_nfl",
      }),
    ).toBeNull();
    expect(
      powerIndexToWinProbs({
        homeFpi: 1,
        awayFpi: 1,
        sportKey: "soccer_epl",
      }),
    ).toBeNull();
  });

  it("wraps IndependentMarketFairValue with espn_powerindex source", () => {
    const fv = powerIndexToIndependentFairValue(
      { homeFpi: 5, awayFpi: 0, sportKey: "nfl" },
      { now: () => new Date("2026-08-09T00:00:00Z") },
    );
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("espn_powerindex");
    expect(fv!.homeFairProb).toBeGreaterThan(0.5);
    expect(fv!.capturedAt).toBe("2026-08-09T00:00:00.000Z");
  });
});
