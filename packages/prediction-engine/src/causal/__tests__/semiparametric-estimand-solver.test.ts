/**
 * Tests for the one-step (EIF) solver of the ratio functionals from do-calculus-id.
 *
 * Everything here is driven by a deterministic 24-bit LCG, so no assertion depends on the
 * platform's Math.random and every number below is reproducible.
 *
 * The synthetic design is built to satisfy the Verma constraint exactly, which is the
 * condition under which the ratio functional is weighting-invariant:
 *   W ~ N(0, 1)                 (observed covariate, confounds Z and Y)
 *   Z = 0.8 W + 0.9 eps         (Z is driven by W, so p~(Z)/f(Z|W) is doing real work)
 *   P(X = 1 | Z) = sigmoid(0.3 + 1.6 Z)     (no W dependence -> kappa_1/kappa_2 is flat in z)
 *   Y = 2 X + 0.6 W + sigma(Z) eta          (no direct Z -> Y channel given W)
 * so E[Y^{x0}] = 2 x0 + 0.6 E[W], and mu(x0, z, w) = 2 x0 + 0.6 w.
 *
 * Note the confounding: X <- Z <- W -> Y, so the unadjusted mean of Y inside X = x0 is biased
 * and the test asserts the solver beats it.
 */

import { describe, expect, it } from "vitest";

import {
  EFFICIENCY_PROJECTION_TOLERANCE,
  MIN_SEMIPARAMETRIC_SAMPLE_SIZE,
  PROPENSITY_CLIP_HIGH,
  PROPENSITY_CLIP_LOW,
  VERMA_SPREAD_TOLERANCE,
  extractRatioFunctional,
  ratioEstimandSensitivity,
  solveSemiparametricRatioFunctional,
} from "../semiparametric-estimand-solver";
import type {
  SemiparametricFailureReason,
  SemiparametricRatioEstimate,
  SemiparametricRatioFailure,
  SemiparametricRatioResult,
  SemiparametricRatioSample,
} from "../semiparametric-estimand-solver";
import { formatSymbolicFactor } from "../do-calculus-id";
import type { SymbolicFactor } from "../do-calculus-id";

// ---------------------------------------------------------------------------------------
// Deterministic randomness: 24-bit LCG exactly as specified.
// ---------------------------------------------------------------------------------------

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function mean(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function buildGrid(low: number, high: number, points: number): number[] {
  const grid: number[] = [];
  const step = (high - low) / (points - 1);
  for (let g = 0; g < points; g += 1) grid.push(low + step * g);
  return grid;
}

// ---------------------------------------------------------------------------------------
// Synthetic problems
// ---------------------------------------------------------------------------------------

const TRUE_LEVEL_EFFECT = 2;
const W_COEFFICIENT = 0.6;
const MAIN_GRID = buildGrid(-2.6, 2.6, 21);

interface Synthetic {
  readonly sample: SemiparametricRatioSample;
  readonly truth: number;
  readonly naive: number;
  readonly withinSupport: number;
}

/** Verma-consistent problem: see the file header for the data-generating process. */
function makeVermaSample(seed: number, n: number): Synthetic {
  const rand = makeRng(seed);
  const w: number[] = [];
  const z: number[] = [];
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const wi = gaussian(rand);
    const zi = 0.8 * wi + 0.9 * gaussian(rand);
    const pi = sigmoid(0.3 + 1.6 * zi);
    const xi = rand() < pi ? 1 : 0;
    const sigma = 0.6 + 0.35 * Math.abs(zi);
    const yi = TRUE_LEVEL_EFFECT * xi + W_COEFFICIENT * wi + sigma * gaussian(rand);
    w.push(wi);
    z.push(zi);
    x.push(xi);
    y.push(yi);
  }

  const naiveValues: number[] = [];
  for (let i = 0; i < n; i += 1) if (x[i] === 1) naiveValues.push(y[i]!);

  return {
    sample: {
      outcome: y,
      treatment: x,
      confounder: z,
      covariates: w.map((value) => [value]),
      treatmentLevel: 1,
      admissibleZ: MAIN_GRID,
    },
    // kappa_1/kappa_2 = tau * x0 + b * E[W] exactly, because pi does not depend on W.
    truth: TRUE_LEVEL_EFFECT * 1 + W_COEFFICIENT * mean(w),
    naive: mean(naiveValues),
    withinSupport: z.filter((value) => value >= -2.6 && value <= 2.6).length,
  };
}

function expectOk(result: SemiparametricRatioResult): SemiparametricRatioEstimate {
  if (!result.ok) {
    throw new Error(`expected a successful estimate, got ${result.reason}: ${result.detail}`);
  }
  return result;
}

function expectFailure(
  result: SemiparametricRatioResult,
  reason: SemiparametricFailureReason,
): SemiparametricRatioFailure {
  if (result.ok) {
    throw new Error(`expected a refusal (${reason}), got the estimate ${result.estimand}`);
  }
  expect(result.reason).toBe(reason);
  expect(result.detail.length).toBeGreaterThan(0);
  return result;
}

// ---------------------------------------------------------------------------------------
// 1. Convergence to the true effect
// ---------------------------------------------------------------------------------------

describe("one-step estimation of the ratio functional", () => {
  it("converges to the true interventional mean on a Verma-consistent problem", () => {
    const { sample, truth, naive } = makeVermaSample(20261020, 3000);
    const estimate = expectOk(solveSemiparametricRatioFunctional(sample));

    expect(Number.isFinite(estimate.estimand)).toBe(true);
    expect(Math.abs(estimate.estimand - truth)).toBeLessThan(
      Math.max(0.1, 4 * estimate.standardError),
    );
    expect(estimate.standardError).toBeGreaterThan(0);
    expect(estimate.varianceEstimate).toBeGreaterThan(0);
    // The one-step correction is a computed quantity, not a hard-coded zero, and it stays on
    // the same scale as the estimand.
    expect(Number.isFinite(estimate.oneStepCorrection)).toBe(true);
    expect(Math.abs(estimate.oneStepCorrection)).toBeGreaterThan(0);
    expect(Math.abs(estimate.plugIn - estimate.estimand)).toBeLessThan(0.2);

    // The confounding is real, and the solver removes it where the unadjusted mean does not.
    expect(Math.abs(naive - truth)).toBeGreaterThan(Math.abs(estimate.estimand - truth));
    expect(Math.abs(naive - truth)).toBeGreaterThan(0.1);

    // The measurements the caller is entitled to see.
    expect(estimate.sampleSize).toBe(3000);
    expect(estimate.weighting).toBe("efficiency");
    expect(estimate.normalizer).toBeGreaterThan(0);
    expect(estimate.grid).toHaveLength(MAIN_GRID.length);
    // A few observations genuinely reach the positivity boundary on this design; they are
    // reported rather than clamped in silence.
    expect(estimate.clippedPropensityCount).toBeLessThan(0.01 * estimate.sampleSize);
  });

  it("does not depend on the propensities sitting on the clip boundary (interior of the grid is used)", () => {
    const { sample } = makeVermaSample(777, 1500);
    const estimate = expectOk(solveSemiparametricRatioFunctional(sample));
    // Every admissible z must carry strictly positive weighting mass, or "admissible" is a lie.
    for (const point of estimate.grid) {
      expect(point.weightingDensity).toBeGreaterThan(0);
      expect(point.kappa2).toBeGreaterThanOrEqual(PROPENSITY_CLIP_LOW);
      expect(point.kappa2).toBeLessThanOrEqual(PROPENSITY_CLIP_HIGH);
    }
  });

  // -------------------------------------------------------------------------------------
  // 2. The efficiency weighting actually buys precision
  // -------------------------------------------------------------------------------------

  it("reduces the estimated variance with the inverse-variance weighting versus uniform", () => {
    const { sample } = makeVermaSample(424242, 4000);

    const efficiency = expectOk(
      solveSemiparametricRatioFunctional({ ...sample, weighting: "efficiency" }),
    );
    const uniform = expectOk(solveSemiparametricRatioFunctional({ ...sample, weighting: "uniform" }));

    // Both target the same scalar (that is what the Verma constraint buys), so the
    // comparison is like-for-like.
    expect(Math.abs(efficiency.estimand - uniform.estimand)).toBeLessThan(0.05);

    expect(efficiency.varianceEstimate).toBeLessThan(uniform.varianceEstimate);
    expect(efficiency.projectedVariance).toBeLessThan(uniform.projectedVariance);
    expect(efficiency.standardError).toBeLessThan(uniform.standardError);

    // A meaningful gain, not a rounding artefact.
    const gain = uniform.varianceEstimate / efficiency.varianceEstimate;
    expect(gain).toBeGreaterThan(1.05);
  });

  it("puts more weighting mass where the local effect is measured precisely", () => {
    const { sample } = makeVermaSample(424242, 4000);
    const estimate = expectOk(solveSemiparametricRatioFunctional(sample));

    const pairs = estimate.grid.map((point) => ({
      variance: point.influenceVariance,
      density: point.weightingDensity,
    }));
    const ordered = [...pairs].sort((a, b) => a.variance - b.variance);
    const third = Math.floor(ordered.length / 3);
    const preciseMean = mean(ordered.slice(0, third).map((pair) => pair.density));
    const noisyMean = mean(ordered.slice(ordered.length - third).map((pair) => pair.density));

    expect(preciseMean).toBeGreaterThan(noisyMean * 1.5);
  });

  // -------------------------------------------------------------------------------------
  // 3. Clipping is reported, never silent
  // -------------------------------------------------------------------------------------

  it("reports the count of clipped propensities when a fitted propensity is 0 or 1", () => {
    const rand = makeRng(99991);
    const n = 200;
    const w: number[] = [];
    const z: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const outlier = i >= n - 4;
      const wi = outlier ? 5 : 0;
      const zi = 0.7 * gaussian(rand);
      // The four outliers are all treated at an extreme W, so the logistic coefficient on W
      // diverges and their fitted propensity saturates at 1.
      const xi = outlier ? 1 : rand() < sigmoid(0.2 + 1.4 * zi) ? 1 : 0;
      const yi = 1.5 * xi + 0.4 * wi + 0.7 * gaussian(rand);
      w.push(wi);
      z.push(zi);
      x.push(xi);
      y.push(yi);
    }

    const result = solveSemiparametricRatioFunctional({
      outcome: y,
      treatment: x,
      confounder: z,
      covariates: w.map((value) => [value]),
      treatmentLevel: 1,
      admissibleZ: buildGrid(-2, 2, 11),
    });

    const estimate = expectOk(result);
    expect(estimate.clippedPropensityCount).toBeGreaterThan(0);
    // The four saturated rows are the ones that were clipped; nothing else should be.
    expect(estimate.clippedPropensityCount).toBeLessThanOrEqual(8);
    // Grid evaluations that needed the same clip are reported separately, never folded in.
    expect(estimate.clippedGridPointCount).toBeGreaterThan(0);
    expect(Number.isFinite(estimate.estimand)).toBe(true);
  });

  it("refuses when clipping is so widespread that overlap has failed", () => {
    const rand = makeRng(5150);
    const n = 400;
    const w: number[] = [];
    const z: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const zi = -1 + 2 * rand();
      // X is a deterministic function of Z: perfect separation, no overlap anywhere.
      const xi = zi > 0 ? 1 : 0;
      w.push(0.3 * gaussian(rand));
      z.push(zi);
      x.push(xi);
      y.push(2 * xi + 0.5 * gaussian(rand));
    }

    const failure = expectFailure(
      solveSemiparametricRatioFunctional({
        outcome: y,
        treatment: x,
        confounder: z,
        covariates: w.map((value) => [value]),
        treatmentLevel: 1,
        admissibleZ: buildGrid(-1, 1, 11),
      }),
      "EXCESSIVE_PROPENSITY_CLIPPING",
    );
    expect(failure.clippedPropensityCount).toBeGreaterThan(0);
    expect(failure.clippedPropensityCount).toBeGreaterThan(0.25 * n);
  });

  // -------------------------------------------------------------------------------------
  // 4. Refusals
  // -------------------------------------------------------------------------------------

  it("refuses on an empty admissible-z set", () => {
    const { sample } = makeVermaSample(11, 400);
    const failure = expectFailure(
      solveSemiparametricRatioFunctional({ ...sample, admissibleZ: [] }),
      "EMPTY_ADMISSIBLE_Z_SET",
    );
    expect(failure.sampleSize).toBe(400);

    // One point is not an integral either.
    expectFailure(
      solveSemiparametricRatioFunctional({ ...sample, admissibleZ: [0] }),
      "EMPTY_ADMISSIBLE_Z_SET",
    );
  });

  it("refuses on a non-positive influence variance instead of weighting by infinity", () => {
    const rand = makeRng(31337);
    const n = 300;
    const w: number[] = [];
    const z: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const wi = gaussian(rand);
      const zi = 0.5 * wi + 0.8 * gaussian(rand);
      const xi = rand() < sigmoid(0.1 + 1.2 * zi) ? 1 : 0;
      w.push(wi);
      z.push(zi);
      x.push(xi);
      // A constant outcome: every local influence value is exactly zero.
      y.push(5);
    }

    const failure = expectFailure(
      solveSemiparametricRatioFunctional({
        outcome: y,
        treatment: x,
        confounder: z,
        covariates: w.map((value) => [value]),
        treatmentLevel: 1,
        admissibleZ: buildGrid(-1.5, 1.5, 9),
      }),
      "NON_POSITIVE_VARIANCE",
    );
    expect(failure.detail).toContain("MIN_EFFICIENCY_VARIANCE");

    // The same data are perfectly estimable without inverse-variance weighting.
    const uniform = expectOk(
      solveSemiparametricRatioFunctional({
        outcome: y,
        treatment: x,
        confounder: z,
        covariates: w.map((value) => [value]),
        treatmentLevel: 1,
        admissibleZ: buildGrid(-1.5, 1.5, 9),
        weighting: "uniform",
      }),
    );
    expect(Math.abs(uniform.estimand - 5)).toBeLessThan(1e-8);
  });

  it("refuses on a sample smaller than the minimum", () => {
    const { sample } = makeVermaSample(5, MIN_SEMIPARAMETRIC_SAMPLE_SIZE - 1);
    const failure = expectFailure(
      solveSemiparametricRatioFunctional(sample),
      "SAMPLE_TOO_SMALL",
    );
    expect(failure.sampleSize).toBe(MIN_SEMIPARAMETRIC_SAMPLE_SIZE - 1);
    expect(failure.detail).toContain("at least");
  });

  it("refuses when the treatment stratum is too small to fit the outcome model", () => {
    const rand = makeRng(808);
    const n = 200;
    const w: number[] = [];
    const z: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const wi = gaussian(rand);
      const zi = 0.4 * gaussian(rand);
      // Only three treated observations.
      const xi = i < 3 ? 1 : 0;
      w.push(wi);
      z.push(zi);
      x.push(xi);
      y.push(1.2 * xi + 0.3 * wi + 0.5 * gaussian(rand));
    }

    expectFailure(
      solveSemiparametricRatioFunctional({
        outcome: y,
        treatment: x,
        confounder: z,
        covariates: w.map((value) => [value]),
        treatmentLevel: 1,
        admissibleZ: buildGrid(-1, 1, 9),
      }),
      "INSUFFICIENT_TREATMENT_GROUP",
    );
  });

  // -------------------------------------------------------------------------------------
  // 5. Determinism
  // -------------------------------------------------------------------------------------

  it("is deterministic: identical input yields bit-identical output", () => {
    const { sample } = makeVermaSample(2024, 800);
    const first = expectOk(solveSemiparametricRatioFunctional(sample));
    const second = expectOk(solveSemiparametricRatioFunctional(sample));

    expect(second.estimand).toBe(first.estimand);
    expect(second.plugIn).toBe(first.plugIn);
    expect(second.varianceEstimate).toBe(first.varianceEstimate);
    expect(second.standardError).toBe(first.standardError);
    expect(second.normalizer).toBe(first.normalizer);
    expect(second.weightingDensity).toEqual(first.weightingDensity);
    expect(second.clippedPropensityCount).toBe(first.clippedPropensityCount);

    // Rebuilding the sample from the same seed reproduces it too.
    const rebuilt = expectOk(solveSemiparametricRatioFunctional(makeVermaSample(2024, 800).sample));
    expect(rebuilt.estimand).toBe(first.estimand);
  });

  it("keeps the Verma diagnostic below tolerance on a Verma-consistent design", () => {
    const { sample } = makeVermaSample(606, 1200);
    const estimate = expectOk(solveSemiparametricRatioFunctional(sample));
    expect(estimate.vermaConsistent).toBe(true);
    // The gated quantity: the estimand does not move when the weighting is changed.
    expect(estimate.vermaShift).toBeLessThanOrEqual(VERMA_SPREAD_TOLERANCE);
    // Reported alongside it, ungated, in outcome units.
    expect(estimate.vermaSpread).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------------------
  // 6. Input validation
  // -------------------------------------------------------------------------------------

  it("throws on malformed input rather than returning a plausible number", () => {
    const { sample } = makeVermaSample(3, 200);

    // Length disagreements.
    expect(() => solveSemiparametricRatioFunctional({ ...sample, treatment: [0, 1, 0] })).toThrow(
      /treatment has/,
    );
    expect(() => solveSemiparametricRatioFunctional({ ...sample, confounder: [] })).toThrow(
      /must be non-empty/,
    );
    expect(() => solveSemiparametricRatioFunctional({ ...sample, covariates: [] })).toThrow(
      /covariates has/,
    );

    // Non-finite entries.
    const withNaN = [...sample.outcome];
    withNaN[7] = Number.NaN;
    expect(() => solveSemiparametricRatioFunctional({ ...sample, outcome: withNaN })).toThrow(
      /finite number/,
    );
    const withInfinity = [...sample.confounder];
    withInfinity[3] = Number.POSITIVE_INFINITY;
    expect(() => solveSemiparametricRatioFunctional({ ...sample, confounder: withInfinity })).toThrow(
      /finite number/,
    );

    // Values outside the allowed domain.
    const withBadTreatment = [...sample.treatment];
    withBadTreatment[10] = 2;
    expect(() =>
      solveSemiparametricRatioFunctional({ ...sample, treatment: withBadTreatment }),
    ).toThrow(/must be 0 or 1/);
    expect(() => solveSemiparametricRatioFunctional({ ...sample, treatmentLevel: 3 })).toThrow(
      /treatmentLevel must be 0 or 1/,
    );
    expect(() =>
      solveSemiparametricRatioFunctional({
        ...sample,
        weighting: "optimal" as unknown as SemiparametricRatioSample["weighting"],
      }),
    ).toThrow(/weighting must be/);

    // A grid that is not strictly increasing cannot be integrated.
    expect(() =>
      solveSemiparametricRatioFunctional({ ...sample, admissibleZ: [0, 0.5, 0.5, 1] }),
    ).toThrow(/strictly increasing/);

    // Ragged covariate rows.
    const ragged = sample.covariates.map((row, index) => (index === 4 ? [row[0]!, row[0]!] : row));
    expect(() => solveSemiparametricRatioFunctional({ ...sample, covariates: ragged })).toThrow(
      /expected 1/,
    );
  });

  // -------------------------------------------------------------------------------------
  // 7. Symbolic-factor bridge and the E-value receipt
  // -------------------------------------------------------------------------------------

  it("extracts a ratio functional from the symbolic form produced by do-calculus-id", () => {
    const numerator: SymbolicFactor = {
      kind: "OBSERVATIONAL_COND",
      target: "y",
      given: ["x", "w", "z"],
    };
    const denominator: SymbolicFactor = {
      kind: "OBSERVATIONAL_COND",
      target: "x",
      given: ["w", "z"],
    };
    const ratio: SymbolicFactor = { kind: "RATIO", numerator, denominator };
    const wrapped: SymbolicFactor = { kind: "MARGINAL_SUM", sumOut: ["w"], body: ratio };

    const extracted = extractRatioFunctional(wrapped);
    expect(extracted.numerator).toBe(numerator);
    expect(extracted.denominator).toBe(denominator);
    expect(formatSymbolicFactor(extracted.numerator)).toBe("P(y|x,w,z)");

    // A non-ratio estimand is a caller bug, not something to estimate anyway.
    const product: SymbolicFactor = { kind: "PRODUCT", factors: [numerator, denominator] };
    expect(() => extractRatioFunctional(product)).toThrow(/expected a RATIO functional/);
    expect(() => extractRatioFunctional(product)).toThrow(/P\(y\|x,w,z\)/);
  });

  it("attaches an E-value receipt with a validated baseline risk", () => {
    const { sample } = makeVermaSample(20261020, 3000);
    const estimate = expectOk(solveSemiparametricRatioFunctional(sample));

    const sensitivity = ratioEstimandSensitivity(estimate, 0.2);
    expect(sensitivity.riskRatio).toBeCloseTo((0.2 + estimate.estimand) / 0.2, 10);
    expect(sensitivity.ePoint).toBeGreaterThan(1);
    expect(Number.isFinite(sensitivity.eCi)).toBe(true);

    expect(() => ratioEstimandSensitivity(estimate, 0)).toThrow(/baselineRisk/);
    expect(() => ratioEstimandSensitivity(estimate, 1.5)).toThrow(/baselineRisk/);
    expect(() => ratioEstimandSensitivity(estimate, Number.NaN)).toThrow(/baselineRisk/);
  });

  it("exposes a positive projection tolerance that the projection is checked against", () => {
    // Guards against the tolerance being quietly zeroed (which would make every projection fail)
    // or widened into meaninglessness.
    expect(EFFICIENCY_PROJECTION_TOLERANCE).toBeGreaterThan(0);
    expect(EFFICIENCY_PROJECTION_TOLERANCE).toBeLessThan(1e-6);
    expect(PROPENSITY_CLIP_LOW).toBeGreaterThan(0);
    expect(PROPENSITY_CLIP_HIGH).toBeLessThan(1);
    expect(PROPENSITY_CLIP_LOW).toBeLessThan(PROPENSITY_CLIP_HIGH);
  });
});
