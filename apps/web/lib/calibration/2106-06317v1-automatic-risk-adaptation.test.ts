import { describe, expect, it } from "vitest";

import {
  ENABLED,
  alphaFromNovelty,
  distortedStakeMultiplier,
  fitPsiMonotone,
  isotonicDecreasing,
  noveltyScore,
  stakesMonotoneDecreasing,
} from "@/lib/calibration/2106-06317v1-automatic-risk-adaptation";

describe("automatic risk adaptation", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("novelty and the fixed e^{-u} map behave", () => {
    expect(noveltyScore(0, 2)).toBe(0);
    expect(noveltyScore(4, 2)).toBe(2);
    expect(alphaFromNovelty(0)).toBe(1); // familiar -> full aggression
    expect(alphaFromNovelty(10)).toBeLessThan(0.001);
  });

  it("distorted stake: pass when unprecedented, full when familiar", () => {
    expect(distortedStakeMultiplier(1, 2)).toBe(2);
    expect(distortedStakeMultiplier(0.1, 2)).toBe(0);
    const mid = distortedStakeMultiplier(0.5, 2);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(2);
  });

  it("learned psi is monotone nonincreasing in u", () => {
    const uDeciles = [0.1, 0.3, 0.5, 0.9, 1.4, 2.0, 2.8, 3.5, 4.5, 6.0];
    const decileCvar = [0.9, 0.85, 0.8, 0.7, 0.6, 0.45, 0.3, 0.15, 0.05, -0.1];
    const psi = fitPsiMonotone(uDeciles, decileCvar);
    const alphas = uDeciles.map(psi);
    expect(stakesMonotoneDecreasing(alphas)).toBe(true);
    expect(alphas[0]).toBeCloseTo(1, 6);
    expect(alphas[alphas.length - 1]).toBeLessThan(0.3);
  });

  it("isotonicDecreasing enforces monotonicity", () => {
    const fit = isotonicDecreasing([1, 3, 2, 5, 4, 0]);
    for (let i = 1; i < fit.length; i++) {
      expect(fit[i]).toBeLessThanOrEqual(fit[i - 1] + 1e-9);
    }
  });

  it("stakes decrease monotonically with novelty (gate property)", () => {
    const stakes = [1, 1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.25, 0.25, 0];
    expect(stakesMonotoneDecreasing(stakes)).toBe(true);
    expect(stakesMonotoneDecreasing([1, 0.5, 0.8])).toBe(false);
  });
});
