/**
 * Vitest suite for arXiv:2506.03057v1 (Partially Regularized Ordinal Regression to Adjust Teams' Scoring for Strength of Schedule and Complementary Unit Performance in American Football).
 * Gate: Adopt complementary features permanently if 10-fold CV on 2015–2024 shows MAE improvement with SE bars non-overlapping vs GS+SoS in ≥4 of 10 seasons; otherwise keep SoS-only.
 */
import { describe, it, expect } from "vitest";
import { cumulativeProbs, softThreshold, fitOrdinalPartial } from "./2506-03057v1-partially-regularized-ordinal-regression-to";

describe("2506-03057v1 partially-regularized ordinal regression", () => {
  it("soft-thresholds small coefficients to zero", () => {
    expect(softThreshold(0.05, 0.1)).toBe(0);
    expect(softThreshold(0.3, 0.1)).toBeCloseTo(0.2, 12);
    expect(softThreshold(-0.3, 0.1)).toBeCloseTo(-0.2, 12);
  });
  it("cumulative probs sum to 1 and are ordered", () => {
    const p = cumulativeProbs(0.5, [-1, 0, 1]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(p.every((v) => v >= 0)).toBe(true);
  });
  it("fit recovers a positive SoS slope and selects features", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 120; i++) {
      const sos = (i % 10 - 4.5) / 2;
      const noise = ((i * 37) % 11 - 5) / 20;
      X.push([sos, noise]);
      const score = sos * 1.5 + noise * 0.1;
      y.push(score < -1 ? 0 : score < 1 ? 1 : 2);
    }
    const { cuts, beta } = fitOrdinalPartial(X, y, [false, true], 0.5, 40);
    expect(beta[0]).toBeGreaterThan(0.3);
    expect(cuts[0]).toBeLessThan(cuts[1] ?? 0);
    expect(() => fitOrdinalPartial([], [], [], 0.1)).toThrow();
  });
});
