import { describe, expect, it } from "vitest";
import {
  standingsWinPctToWinProbs,
  standingsWinPctToIndependentFairValue,
} from "../standings-strength.js";

describe("standingsWinPctToWinProbs", () => {
  it("gives home edge to equal .500 teams (HFA)", () => {
    const r = standingsWinPctToWinProbs({
      homeWinPct: 0.5,
      awayWinPct: 0.5,
    });
    expect(r).not.toBeNull();
    expect(r!.pHome).toBeGreaterThan(0.5);
    expect(r!.pHome + r!.pAway).toBeCloseTo(1, 5);
  });

  it("favors clearly better team", () => {
    const r = standingsWinPctToWinProbs({
      homeWinPct: 0.65,
      awayWinPct: 0.4,
    });
    expect(r!.pHome).toBeGreaterThan(0.65);
  });

  it("soft-fails thin sample when games provided", () => {
    const r = standingsWinPctToWinProbs({
      homeWinPct: 0.6,
      awayWinPct: 0.4,
      homeGames: 5,
      awayGames: 5,
      minGames: 20,
    });
    expect(r).toBeNull();
  });

  it("soft-fails non-finite / out of range", () => {
    expect(
      standingsWinPctToWinProbs({ homeWinPct: 0, awayWinPct: 0.5 }),
    ).toBeNull();
    expect(
      standingsWinPctToWinProbs({ homeWinPct: 1.2, awayWinPct: 0.5 }),
    ).toBeNull();
  });
});

describe("standingsWinPctToIndependentFairValue", () => {
  it("labels source mlb_standings by default", () => {
    const fv = standingsWinPctToIndependentFairValue({
      homeWinPct: 0.55,
      awayWinPct: 0.45,
    });
    expect(fv?.source).toBe("mlb_standings");
    expect(fv?.homeFairProb).toBeGreaterThan(0.5);
  });
});
