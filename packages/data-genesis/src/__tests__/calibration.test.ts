import { describe, it, expect } from "vitest";
import {
  buildCalibrationCurve,
  expectedCalibrationErrorFromPoints,
  maxCalibrationErrorFromPoints,
  betaPosteriorCalibration,
  reliabilityLabel,
  regularizedIncompleteBeta,
  betaQuantile,
  MIN_SAMPLES_FOR_GOOD,
  MIN_SAMPLES_FOR_EXCELLENT,
  type CalibrationOutcomeSample,
} from "../calibration.js";

/** Build n samples at forecast p with `hits` wins. */
function samplesAt(p: number, n: number, hits: number): CalibrationOutcomeSample[] {
  return Array.from({ length: n }, (_, i) => ({ p, y: (i < hits ? 1 : 0) as 0 | 1 }));
}

describe("buildCalibrationCurve", () => {
  it("produces a populated bin with the right predicted/observed values", () => {
    // 100 forecasts at p=0.75, 75 wins → perfectly calibrated bin.
    const curve = buildCalibrationCurve(samplesAt(0.75, 100, 75), 10);
    const bin = curve.points.find((pt) => pt.sampleCount > 0)!;
    expect(bin.predictedProbability).toBeCloseTo(0.75, 5);
    expect(bin.observedFrequency).toBeCloseTo(0.75, 5);
    expect(bin.binAccuracy).toBeCloseTo(1, 5);
    expect(curve.totalSamples).toBe(100);
    expect(curve.curveId.startsWith("curve:")).toBe(true);
  });

  it("ECE and MCE from points reflect miscalibration", () => {
    // 100 at p=0.9, only 50 win → 0.4 gap in that bin.
    const curve = buildCalibrationCurve(samplesAt(0.9, 100, 50), 10);
    expect(expectedCalibrationErrorFromPoints(curve.points)).toBeCloseTo(0.4, 5);
    expect(maxCalibrationErrorFromPoints(curve.points)).toBeCloseTo(0.4, 5);
  });

  it("rejects non-binary outcomes", () => {
    expect(() => buildCalibrationCurve([{ p: 0.5, y: 2 as unknown as 0 }], 10)).toThrow();
  });
});

describe("reliabilityLabel — small samples are never excellent", () => {
  it("below the good threshold is always needs_improvement", () => {
    expect(reliabilityLabel(0.0, MIN_SAMPLES_FOR_GOOD - 1)).toBe("reliability:needs_improvement");
  });
  it("low ECE but small N cannot be excellent", () => {
    expect(reliabilityLabel(0.01, MIN_SAMPLES_FOR_EXCELLENT - 1)).toBe("reliability:good");
  });
  it("low ECE and large N is excellent", () => {
    expect(reliabilityLabel(0.01, MIN_SAMPLES_FOR_EXCELLENT)).toBe("reliability:excellent");
  });
  it("high ECE is needs_improvement regardless of N", () => {
    expect(reliabilityLabel(0.2, 10_000)).toBe("reliability:needs_improvement");
  });
});

describe("betaPosteriorCalibration", () => {
  it("updates the Beta posterior from observed wins/trials", () => {
    const r = betaPosteriorCalibration({ priorAlpha: 1, priorBeta: 1, successes: 70, trials: 100 });
    expect(r.posteriorAlpha).toBe(71);
    expect(r.posteriorBeta).toBe(31);
    expect(r.posteriorMean).toBeCloseTo(71 / 102, 4);
    expect(r.credibleIntervalLow).toBeGreaterThanOrEqual(0);
    expect(r.credibleIntervalHigh).toBeLessThanOrEqual(1);
    expect(r.credibleIntervalLow).toBeLessThan(r.credibleIntervalHigh);
    expect(r.calibrationTag.startsWith("calibration:")).toBe(true);
  });

  it("clamps successes to trials and rejects a non-positive prior", () => {
    const r = betaPosteriorCalibration({ successes: 999, trials: 10 });
    expect(r.posteriorAlpha).toBe(1 + 10);
    expect(() => betaPosteriorCalibration({ priorAlpha: 0, successes: 1, trials: 2 })).toThrow();
  });

  it("uses an EXACT Beta credible interval (not a normal approximation)", () => {
    // Beta(71,31): the exact equal-tailed 95% interval is ≈ [0.604, 0.779]; a normal approximation
    // would be symmetric about the mean (0.696) and noticeably off in the tails.
    const r = betaPosteriorCalibration({ successes: 70, trials: 100 });
    expect(r.credibleIntervalLow).toBeCloseTo(0.604, 2);
    expect(r.credibleIntervalHigh).toBeCloseTo(0.779, 2);
    expect(r.credibleIntervalLow).toBeLessThan(r.posteriorMean);
    expect(r.posteriorMean).toBeLessThan(r.credibleIntervalHigh);
  });
});

describe("incomplete-beta primitives", () => {
  it("regularizedIncompleteBeta matches the uniform CDF for Beta(1,1)", () => {
    // I_x(1,1) = x exactly (the uniform distribution).
    expect(regularizedIncompleteBeta(0.3, 1, 1)).toBeCloseTo(0.3, 6);
    expect(regularizedIncompleteBeta(0.75, 1, 1)).toBeCloseTo(0.75, 6);
    expect(regularizedIncompleteBeta(0, 5, 5)).toBe(0);
    expect(regularizedIncompleteBeta(1, 5, 5)).toBe(1);
  });

  it("is monotonically increasing in x", () => {
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.1) {
      const v = regularizedIncompleteBeta(Math.min(1, x), 3, 7);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("betaQuantile inverts the CDF (median of a symmetric Beta is 0.5)", () => {
    expect(betaQuantile(0.5, 5, 5)).toBeCloseTo(0.5, 4);
    expect(betaQuantile(0.5, 1, 1)).toBeCloseTo(0.5, 4);
    // round-trip: CDF(quantile(p)) ≈ p
    expect(regularizedIncompleteBeta(betaQuantile(0.9, 4, 6), 4, 6)).toBeCloseTo(0.9, 4);
  });
});
