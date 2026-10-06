/**
 * Vitest suite for arXiv:2506.00348 (Beyond Winning: Margin of Victory Relative to Expectation Unlocks Accurate Skill Ratings).
 * Gate: ADOPT the margin-surprise update into the team-strength layer if it clears the §12 gate on 2022–2025 NFL hold-out with no tuning after the gate is set. REJECT (do not merge) if it fails either metric, if the tanh fit is unstable across refits (parameter CV > 25%), or if it underperforms linear-MOV Elo.
 */
import { describe, it, expect } from "vitest";
import { blendedRating, eloExpected, eloUpdate, rollingOriginTune, logLossGate } from "./2506-00348-beyond-winning-margin-of-victory";

describe("2506-00348 Elo CV-tuned blend", () => {
  it("blends ratings and updates Elo correctly", () => {
    expect(blendedRating(1600, 1500, 0.7)).toBeCloseTo(1570, 10);
    expect(eloExpected(0, 0)).toBeCloseTo(0.5, 10);
    expect(eloUpdate(1500, 0.5, 1, 20)).toBeCloseTo(1510, 10);
    expect(() => blendedRating(1, 2, 2)).toThrow();
    expect(() => eloUpdate(1500, 0.5, 1, 0)).toThrow();
  });
  it("rolling-origin tuning picks the predictive config", () => {
    const games = Array.from({ length: 60 }, (_, i) => ({
      gseDiff: (i % 7 - 3) * 20,
      marketDiff: (i % 7 - 3) * 18,
      homeWin: (i % 7 >= 3 ? 1 : 0) as 0 | 1,
    }));
    const { best, logLoss } = rollingOriginTune(games, [
      { w: 1, hfa: 0, k: 20 },
      { w: 0.5, hfa: 55, k: 20 },
    ]);
    expect(logLoss).toBeLessThan(0.6931);
    expect(logLossGate(logLoss)).toBe(true);
    expect(best.hfa).toBe(55);
    expect(() => rollingOriginTune([], [{ w: 1, hfa: 0, k: 1 }])).toThrow();
  });
});
