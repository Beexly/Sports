/**
 * Covariance-intersection fusion — tests (arXiv 2301.13594v1).
 *
 * ACCEPTANCE GATE: CI is never more confident (smaller variance) than
 * precision-weighting on correlated sources; the fused mean lies
 * between the source means; the epistemic/aleatoric split separates
 * disagreement from noise; adaptive weights favor the better source;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  adaptiveWeights,
  consistencyCheck,
  covarianceIntersection,
  decomposeUncertainty,
  precisionWeighted,
  simpleAverage,
} from "./covariance-intersection";

describe("covarianceIntersection vs precisionWeighted", () => {
  it("is conservative relative to precision weighting", () => {
    const sources = [
      { mean: 0.6, variance: 0.04 },
      { mean: 0.7, variance: 0.09 },
    ];
    const ci = covarianceIntersection(sources);
    const pw = precisionWeighted(sources);
    // CI must not be more confident than PW (correlation-robust).
    expect(ci.variance).toBeGreaterThanOrEqual(pw.variance - 1e-9);
    expect(ci.mean).toBeGreaterThanOrEqual(Math.min(0.6, 0.7));
    expect(ci.mean).toBeLessThanOrEqual(Math.max(0.6, 0.7));
    expect(ci.omega).toBeGreaterThanOrEqual(0);
    expect(ci.omega).toBeLessThanOrEqual(1);
    // Single source passes through.
    const single = covarianceIntersection([{ mean: 0.5, variance: 0.1 }]);
    expect(single.mean).toBeCloseTo(0.5, 12);
    expect(() => covarianceIntersection([])).toThrow();
    expect(() => precisionWeighted([{ mean: 0.5, variance: 0 }])).toThrow();
  });

  it("handles three correlated sources", () => {
    const sources = [
      { mean: 0.55, variance: 0.04 },
      { mean: 0.6, variance: 0.04 },
      { mean: 0.65, variance: 0.04 },
    ];
    const ci = covarianceIntersection(sources);
    // CI collapses toward the lowest-variance source(s), so the mean
    // is bounded by — not strictly inside — the source range.
    expect(ci.mean).toBeGreaterThanOrEqual(0.55);
    expect(ci.mean).toBeLessThanOrEqual(0.65);
    expect(ci.variance).toBeGreaterThan(0);
  });
});

describe("decomposeUncertainty", () => {
  it("separates disagreement from noise", () => {
    // Agreeing sources: epistemic ~ 0.
    const agree = [
      { mean: 0.6, variance: 0.05 },
      { mean: 0.6, variance: 0.05 },
    ];
    const d1 = decomposeUncertainty(agree);
    expect(d1.epistemic).toBeCloseTo(0, 12);
    expect(d1.aleatoric).toBeCloseTo(0.05, 12);
    // Disagreeing sources: epistemic dominates.
    const disagree = [
      { mean: 0.4, variance: 0.01 },
      { mean: 0.8, variance: 0.01 },
    ];
    const d2 = decomposeUncertainty(disagree);
    expect(d2.epistemic).toBeGreaterThan(d2.aleatoric);
    expect(() => decomposeUncertainty([])).toThrow();
  });
});

describe("consistencyCheck + adaptiveWeights", () => {
  it("flags understated fused variance", () => {
    const ok = consistencyCheck({ mean: 0.6, variance: 0.04 }, 0.65);
    expect(ok.consistent).toBe(true);
    const bad = consistencyCheck({ mean: 0.6, variance: 0.0001 }, 0.9);
    expect(bad.consistent).toBe(false);
    expect(bad.squaredError).toBeCloseTo(0.09, 12);
  });

  it("favors the currently better source", () => {
    const w = adaptiveWeights([0.5, 0.7, 0.6]);
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[0]!).toBeGreaterThan(w[2]!);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
    expect(simpleAverage([{ mean: 0.5, variance: 0.1 }]).mean).toBeCloseTo(0.5, 12);
    expect(() => adaptiveWeights([])).toThrow();
    expect(() => simpleAverage([])).toThrow();
  });
});
