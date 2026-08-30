import { describe, expect, it } from "vitest";
import type { CalibrationSample } from "../probability-calibration.js";
import { fitTemperature } from "../temperature-scaling.js";
import { meanLogLoss } from "../certificate/proper-scoring.js";
import {
  diagnoseLogLoss,
  fitTemperatureNewton,
  holdoutLogLoss,
  meanLogLossAtTemperature,
  temperatureLogLossGradient,
} from "../log-loss-optimize.js";

function sample(p: number, y: 0 | 1): CalibrationSample {
  return { p, y };
}

/** Balanced overconfident forecasts: stated ~0.9 but outcomes ~50/50. */
function overconfident(n: number): CalibrationSample[] {
  return Array.from({ length: n }, (_, i) => sample(0.9, i % 2 === 0 ? 1 : 0));
}

describe("fitTemperatureNewton", () => {
  it("accepts the Newton refine step only when NLL actually improves", () => {
    const samples = overconfident(40);
    const gridOnly = fitTemperatureNewton(samples, { maxIter: 0 });
    const refined = fitTemperatureNewton(samples);
    expect(gridOnly).not.toBeNull();
    expect(refined).not.toBeNull();
    if (gridOnly === null || refined === null) return;

    const gridNll = meanLogLossAtTemperature(samples, gridOnly.T);
    const refinedNll = meanLogLossAtTemperature(samples, refined.T);
    expect(refinedNll).toBeLessThanOrEqual(gridNll + 1e-12);

    const gridFit = fitTemperature(samples);
    expect(gridFit).not.toBeNull();
    if (gridFit === null) return;
    expect(refinedNll).toBeLessThanOrEqual(meanLogLossAtTemperature(samples, gridFit.T) + 1e-12);
  });

  it("returns null on degenerate-label input", () => {
    expect(fitTemperatureNewton([])).toBeNull();
    expect(fitTemperatureNewton([sample(0.8, 1)])).toBeNull();
    expect(fitTemperatureNewton([sample(0.9, 1), sample(0.7, 1), sample(0.6, 1)])).toBeNull();
    expect(fitTemperatureNewton([sample(0.2, 0), sample(0.4, 0)])).toBeNull();
  });
});

describe("holdoutLogLoss", () => {
  it("uses a chronological prefix/suffix split that respects trainFrac", () => {
    const samples = Array.from({ length: 10 }, (_, i) => sample(0.1 + i * 0.08, i % 2 === 0 ? 1 : 0));

    let capturedTrain: readonly CalibrationSample[] | undefined;
    const result = holdoutLogLoss(
      samples,
      (train) => {
        capturedTrain = train;
        return (p) => p;
      },
      0.7,
    );

    expect(result.nTrain).toBe(7);
    expect(result.nTest).toBe(3);
    expect(capturedTrain).toEqual(samples.slice(0, 7));
    expect(result.mappedLogLoss).not.toBeNull();
    expect(result.rawLogLoss).toBeCloseTo(meanLogLoss(samples.slice(7).map((r) => ({ p: r.p, y: r.y }))), 12);
    expect(result.mappedLogLoss).toBeCloseTo(result.rawLogLoss, 12);

    const half = holdoutLogLoss(samples, () => (p) => p, 0.5);
    expect(half.nTrain).toBe(5);
    expect(half.nTest).toBe(5);

    const threeTenths = holdoutLogLoss(samples, () => (p) => p, 0.3);
    expect(threeTenths.nTrain).toBe(3);
    expect(threeTenths.nTest).toBe(7);
  });

  it("keeps the train cut at least 1 and scores an empty suffix as unmapped", () => {
    const samples = [sample(0.4, 0), sample(0.7, 1), sample(0.6, 1)];
    const tinyFrac = holdoutLogLoss(samples, () => (p) => p, 0.1);
    expect(tinyFrac.nTrain).toBe(1);
    expect(tinyFrac.nTest).toBe(2);

    const allTrain = holdoutLogLoss(samples, () => (p) => p, 1);
    expect(allTrain.nTrain).toBe(3);
    expect(allTrain.nTest).toBe(0);
    expect(Number.isNaN(allTrain.rawLogLoss)).toBe(true);
    expect(allTrain.mappedLogLoss).toBeNull();
  });

  it("returns mappedLogLoss null when fit declines", () => {
    const samples = overconfident(20);
    const result = holdoutLogLoss(samples, () => null, 0.7);
    expect(result.nTest).toBeGreaterThan(0);
    expect(result.mappedLogLoss).toBeNull();
    expect(Number.isFinite(result.rawLogLoss)).toBe(true);
  });
});

describe("meanLogLossAtTemperature", () => {
  it("matches raw mean log-loss at T=1 and returns NaN on invalid input", () => {
    const samples = [sample(0.8, 1), sample(0.3, 0), sample(0.6, 1)];
    expect(meanLogLossAtTemperature(samples, 1)).toBeCloseTo(
      meanLogLoss(samples.map((r) => ({ p: r.p, y: r.y }))),
      12,
    );
    expect(Number.isNaN(meanLogLossAtTemperature([], 1))).toBe(true);
    expect(Number.isNaN(meanLogLossAtTemperature(samples, 0))).toBe(true);
    expect(Number.isNaN(meanLogLossAtTemperature(samples, -1))).toBe(true);
    expect(Number.isNaN(meanLogLossAtTemperature(samples, Number.POSITIVE_INFINITY))).toBe(true);
  });

  it("reduces NLL under T>1 for overconfident 50/50 forecasts", () => {
    const samples = overconfident(40);
    expect(meanLogLossAtTemperature(samples, 2)).toBeLessThan(meanLogLossAtTemperature(samples, 1));
  });
});

describe("temperatureLogLossGradient", () => {
  it("is zero on empty/invalid T and at p=0.5 (logit vanishes)", () => {
    expect(temperatureLogLossGradient([], 1)).toBe(0);
    expect(temperatureLogLossGradient([sample(0.8, 1)], 0)).toBe(0);
    expect(temperatureLogLossGradient([sample(0.5, 1), sample(0.5, 0)], 1)).toBeCloseTo(0, 12);
  });

  it("matches a centered finite difference of mean NLL", () => {
    const samples = overconfident(40);
    const T = 1.4;
    const h = 1e-4;
    const analytic = temperatureLogLossGradient(samples, T);
    const finiteDiff =
      (meanLogLossAtTemperature(samples, T + h) - meanLogLossAtTemperature(samples, T - h)) / (2 * h);
    expect(analytic).toBeCloseTo(finiteDiff, 3);
    expect(temperatureLogLossGradient(samples, 1)).toBeLessThan(0);
  });
});

describe("diagnoseLogLoss", () => {
  it("returns NaN totals on empty input", () => {
    const empty = diagnoseLogLoss([]);
    expect(empty.n).toBe(0);
    expect(Number.isNaN(empty.meanLogLoss)).toBe(true);
    expect(Number.isNaN(empty.meanBrier)).toBe(true);
    expect(Number.isNaN(empty.extremeMass)).toBe(true);
    expect(Number.isNaN(empty.meanAbsDevFromHalf)).toBe(true);
  });

  it("reports NLL, Brier, extreme mass, and sharpness on a known slice", () => {
    const samples = [sample(0.5, 1), sample(0.99, 0), sample(0.01, 1)];
    const report = diagnoseLogLoss(samples);
    expect(report.n).toBe(3);
    expect(report.meanBrier).toBeCloseTo(((0.5 - 1) ** 2 + (0.99 - 0) ** 2 + (0.01 - 1) ** 2) / 3, 12);
    expect(report.extremeMass).toBeCloseTo(2 / 3, 12);
    expect(report.meanAbsDevFromHalf).toBeCloseTo((0 + 0.49 + 0.49) / 3, 12);
    expect(report.meanLogLoss).toBeGreaterThan(0);
    expect(report.meanLogLoss).toBeCloseTo(meanLogLoss(samples.map((r) => ({ p: r.p, y: r.y }))), 5);
  });
});
