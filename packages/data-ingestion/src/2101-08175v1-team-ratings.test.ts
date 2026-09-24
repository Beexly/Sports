/**
 * Tests for ./2101-08175v1-team-ratings (arXiv:2101.08175v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt if the GARCH specification wins on LOO by a clear margin (Delta-elpd > 2xse) for at least one
 * prop-relevant metric AND the volatility feature improves a prop hit-rate model (log-loss) by >=0.3%
 * on 2024-2025 holdout. Reject if volatility is unclustered or the feature adds nothing.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2101-08175v1-team-ratings";

describe("team ratings (arXiv:2101.08175v1)", () => {
  it("maps Elo gaps to win probabilities", () => {
    expect(mod.eloWinProb(1500, 1500)).toBeCloseTo(0.5, 10);
    expect(mod.eloWinProb(1600, 1500)).toBeCloseTo(0.64006, 5);
    expect(mod.eloWinProb(1500, 1600)).toBeCloseTo(1 - 0.64006, 5);
    expect(mod.eloWinProb(NaN, 1500)).toBeNull();
  });

  it("updates Elo zero-sum", () => {
    const [a, b] = mod.eloUpdate(1500, 1500, 1, 32)!;
    expect(a).toBeCloseTo(1516, 10);
    expect(b).toBeCloseTo(1484, 10);
    expect(a + b).toBeCloseTo(3000, 10);
    expect(mod.eloUpdate(1500, 1500, 2, 32)).toBeNull();
    expect(mod.eloUpdate(1500, 1500, 1, -1)).toBeNull();
  });

  it("scales updates by margin of victory", () => {
    expect(mod.movMultiplier(7, 0)).toBeCloseTo(2.07944, 4);
    expect(mod.movMultiplier(0, 0)).toBeCloseTo(0, 10);
    const small = mod.movMultiplier(3, 0)!;
    const big = mod.movMultiplier(28, 0)!;
    expect(big).toBeGreaterThan(small);
    // an expected blowout (large Elo gap) is damped
    expect(mod.movMultiplier(28, 400)!).toBeLessThan(mod.movMultiplier(28, 0)!);
  });

  it("blends rating systems", () => {
    expect(mod.blendRatings([1500, 1600], [1, 1])).toBeCloseTo(1550, 10);
    expect(mod.blendRatings([1500, 1600], [3, 1])).toBeCloseTo(1525, 10);
    expect(mod.blendRatings([], [])).toBeNull();
  });
});
