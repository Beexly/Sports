import { describe, expect, it } from "vitest";
import { fitShrinkage } from "@/lib/reconstruction/empirical-bayes";
import {
  fitCovariateModel,
  inertModel,
  applyCovariateModel,
} from "@/lib/reconstruction/covariate-model";
import {
  reconstructSeparation,
  normalQuantile,
} from "@/lib/reconstruction/separation-reconstruct";

/**
 * The reconstruction engine's honesty rests on its math being real, not
 * decorative. These tests pin the exact statistical behavior and the
 * provenance discipline (uncalibrated -> tendency only, never a fabricated
 * per-play number).
 */

describe("empirical-Bayes shrinkage", () => {
  it("pulls low-sample players toward the population and trusts high-sample ones", () => {
    const model = fitShrinkage([
      { key: "steady", mean: 3.0, count: 100 }, // lots of data near the mean
      { key: "hot-smallN", mean: 6.0, count: 2 }, // extreme, tiny sample
      { key: "cold-smallN", mean: 0.5, count: 2 },
    ]);
    const hot = model.estimates.get("hot-smallN")!;
    const steady = model.estimates.get("steady")!;
    // The 2-target outlier is shrunk hard toward the mean; the 100-target
    // player barely moves.
    expect(hot.shrunk).toBeLessThan(hot.raw);
    expect(hot.weight).toBeLessThan(steady.weight);
    expect(Math.abs(steady.shrunk - steady.raw)).toBeLessThan(Math.abs(hot.shrunk - hot.raw));
  });

  it("is a no-op on empty input (no crash, no fabricated mean)", () => {
    const model = fitShrinkage([]);
    expect(model.estimates.size).toBe(0);
  });
});

describe("covariate model fit", () => {
  it("recovers known linear coefficients from clean data", () => {
    // Truth: adjustment = 0.5*x1 - 0.3*x2. Fit should recover it closely.
    const rows: number[][] = [];
    const targets: number[] = [];
    for (let x1 = -2; x1 <= 2; x1++) {
      for (let x2 = -2; x2 <= 2; x2++) {
        rows.push([x1, x2]);
        targets.push(0.5 * x1 - 0.3 * x2);
      }
    }
    const model = fitCovariateModel(rows, targets, 1e-6);
    expect(model.coefficients[0]!).toBeCloseTo(0.5, 2);
    expect(model.coefficients[1]!).toBeCloseTo(-0.3, 2);
    expect(model.fittedRows).toBe(25);
    expect(model.residualSd).toBeLessThan(1e-3);
  });

  it("an inert model applies zero adjustment", () => {
    expect(applyCovariateModel([3, 5], inertModel(2))).toBe(0);
  });
});

describe("reconstructSeparation provenance discipline", () => {
  const tendency = { key: "r1", raw: 3.2, shrunk: 3.0, weight: 0.7, posteriorSd: 0.4 };

  it("uncalibrated: returns the TENDENCY, tagged reconstructed + uncalibrated", () => {
    const f = reconstructSeparation({ tendency, features: [1, 2], model: inertModel(2) });
    expect(f.value).toBeCloseTo(3.0, 6); // tendency, no fabricated play effect
    expect(f.provenance.kind).toBe("RECONSTRUCTED");
    expect(f.provenance.calibrated).toBe(false);
    expect(f.provenance.method).toBe("empirical-bayes-shrinkage");
    expect(f.interval[0]).toBeGreaterThanOrEqual(0); // separation cannot be negative
    expect(f.interval[0]).toBeLessThan(f.value);
    expect(f.interval[1]).toBeGreaterThan(f.value);
  });

  it("calibrated: applies the play adjustment and widens the interval by residual", () => {
    const model = { coefficients: [0.5, -0.3], ridge: 1e-6, residualSd: 0.6, fittedRows: 200, fidelity: 0.4 };
    const f = reconstructSeparation({ tendency, features: [1, 2], model });
    // value = 3.0 + (0.5*1 - 0.3*2) = 3.0 - 0.1 = 2.9
    expect(f.value).toBeCloseTo(2.9, 6);
    expect(f.provenance.calibrated).toBe(true);
    expect(f.provenance.method).toBe("covariate-adjusted");
  });

  it("fidelity gate: a fitted-but-weak model falls back to the honest tendency", () => {
    const weak = { coefficients: [0.5, -0.3], ridge: 1e-6, residualSd: 0.6, fittedRows: 200, fidelity: 0.02 };
    const f = reconstructSeparation({ tendency, features: [1, 2], model: weak });
    expect(f.value).toBeCloseTo(3.0, 6); // tendency, not the adjusted 2.9
    expect(f.provenance.calibrated).toBe(false);
    expect(f.provenance.method).toBe("empirical-bayes-shrinkage");
  });

  it("fidelity gate: too few calibration rows also falls back", () => {
    const thin = { coefficients: [0.5, -0.3], ridge: 1e-6, residualSd: 0.6, fittedRows: 10, fidelity: 0.9 };
    const f = reconstructSeparation({ tendency, features: [1, 2], model: thin });
    expect(f.provenance.calibrated).toBe(false);
  });
});

describe("normalQuantile", () => {
  it("matches known standard-normal quantiles", () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 6);
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 4);
    expect(normalQuantile(0.9)).toBeCloseTo(1.281552, 4);
  });
});
