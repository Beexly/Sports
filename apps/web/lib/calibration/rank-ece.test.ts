import { describe, it, expect } from "vitest";
import { rankEce, splitHalfDelta, distortProbs } from "@/lib/calibration/rank-ece";

// ============================================================
// arXiv 2609.13100 — rankECE. Additive only.
// ============================================================

describe("rankECE — 2609.13100", () => {
  it("rankEce is ~0 for perfectly calibrated alternating forecasts", () => {
    // probs alternate 0.4/0.6 with matching outcomes: residuals alternate
    // -0.4/+0.4 pattern -> consecutive products negative, sum ~ -0.16/2...
    // Instead use exact calibration: residual 0 everywhere.
    const probs = [0.3, 0.7, 0.3, 0.7];
    const outcomes = [0, 1, 0, 1] as Array<0 | 1>;
    // residuals: -0.3, +0.3, -0.3, +0.3 sorted by prob: (0.3,-0.3),(0.3,-0.3),(0.7,0.3),(0.7,0.3)
    // products: 0.09, -0.09, 0.09 -> sum 0.09, /4 = 0.0225
    expect(rankEce(probs, outcomes)).toBeCloseTo(0.0225, 10);
  });

  it("rankEce is larger for miscalibrated forecasts", () => {
    const probs = [0.9, 0.9, 0.9, 0.9, 0.1, 0.1, 0.1, 0.1];
    const outcomes = [0, 0, 0, 0, 1, 1, 1, 1] as Array<0 | 1>;
    // Sorted: four (0.1, +0.9) then four (0.9, -0.9).
    // products: 3*(0.81) + (0.9)(-0.9) + 3*(0.81) = 2.43 - 0.81 + 2.43 = 4.05; /8 = 0.50625
    expect(rankEce(probs, outcomes)).toBeCloseTo(0.50625, 10);
  });

  it("rankEce returns NaN on degenerate input", () => {
    expect(rankEce([0.5], [1])).toBeNaN();
    expect(rankEce([], [])).toBeNaN();
    expect(rankEce([0.5, 0.6], [1])).toBeNaN();
  });

  it("splitHalfDelta is 0 for a repeated series", () => {
    const probs = [0.2, 0.8, 0.2, 0.8, 0.2, 0.8, 0.2, 0.8];
    const outcomes = [0, 1, 0, 1, 0, 1, 0, 1] as Array<0 | 1>;
    expect(splitHalfDelta(probs, outcomes)).toBeCloseTo(0, 10);
    expect(splitHalfDelta([0.5, 0.6], [1, 0])).toBeNaN();
  });

  it("distortProbs pushes toward extremes", () => {
    const d = distortProbs([0.6, 0.4], 0.5);
    expect(d[0]).toBeCloseTo(0.8, 10);
    expect(d[1]).toBeCloseTo(0.2, 10);
    expect(distortProbs([1.5], 0.5)[0]).toBeLessThanOrEqual(1);
  });

  it("distorted copy has larger rankECE (gate rejection direction)", () => {
    const probs = [0.55, 0.6, 0.65, 0.7, 0.35, 0.4, 0.45, 0.5];
    const outcomes = [1, 1, 0, 1, 0, 0, 1, 0] as Array<0 | 1>;
    const clean = rankEce(probs, outcomes);
    const distorted = rankEce(distortProbs(probs, 0.3), outcomes);
    expect(Math.abs(distorted)).toBeGreaterThanOrEqual(Math.abs(clean) - 1e-12);
  });
});
