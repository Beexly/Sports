import { describe, expect, it } from "vitest";
import { bootstrapDebiasedEceLowerBound, sliceCalibrationMetrics } from "@/lib/calibration/metric-slices";
import { debiasedExpectedCalibrationError } from "@/lib/calibration/ece-debiased";

describe("C-298: per-slice bootstrap lower bound of the debiased ECE", () => {
  function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function calibrated(n: number, seed: number) {
    const r = lcg(seed);
    return Array.from({ length: n }, () => {
      const p = 0.5 + 0.45 * r();
      return { p, y: (r() < p ? 1 : 0) as 0 | 1 };
    });
  }
  it("is null under 30 rows, present and deterministic at 30 or more, and never above the point estimate", () => {
    expect(bootstrapDebiasedEceLowerBound(calibrated(29, 1))).toBeNull();
    const rows = calibrated(221, 7);
    const lo = bootstrapDebiasedEceLowerBound(rows);
    expect(lo).not.toBeNull();
    expect(bootstrapDebiasedEceLowerBound(rows)).toBe(lo);
    const point = debiasedExpectedCalibrationError(rows, 10, 0).debiased;
    expect(lo!).toBeLessThanOrEqual(point);
    expect(lo!).toBeGreaterThanOrEqual(0);
  });
  it("a slice built by sliceCalibrationMetrics carries the bound, and a small slice carries null", () => {
    const big = calibrated(120, 3).map((s) => ({ ...s, modelVersion: "v5.2.7" }));
    const small = calibrated(12, 4).map((s) => ({ ...s, modelVersion: "v5.2.8" }));
    const slices = sliceCalibrationMetrics([...big, ...small], (s) => s.modelVersion);
    const v527 = slices.find((s) => s.key === "v5.2.7")!;
    const v528 = slices.find((s) => s.key === "v5.2.8")!;
    expect(typeof v527.eceDebiasedCi90Lo).toBe("number");
    expect(v527.eceDebiasedCi90Lo!).toBeLessThanOrEqual(v527.eceDebiased);
    expect(v528.eceDebiasedCi90Lo).toBeNull();
  });
  it("a genuinely miscalibrated slice keeps its bound above the floor", () => {
    // A 20-point gap everywhere at the deployed version's size. The bound is a
    // 5th percentile, so a slice that is only marginally off (a 12-point gap
    // at n 274 reads a bound near 0.04) is given the benefit of the doubt by
    // design; one that is clearly off is not.
    const r = lcg(11);
    const rows = Array.from({ length: 274 }, () => {
      const p = 0.6 + 0.35 * r();
      return { p, y: (r() < p - 0.2 ? 1 : 0) as 0 | 1 };
    });
    const lo = bootstrapDebiasedEceLowerBound(rows)!;
    expect(lo).toBeGreaterThan(0.05);
    expect(debiasedExpectedCalibrationError(rows, 10, 0).debiased).toBeGreaterThan(lo);
  });
});

/**
 * C-276. Every eligibility floor (n, Brier, ECE, murphyRel) measures calibration
 * or volume. None measures whether the model RANKS outcomes — that is Murphy
 * resolution, and it was computed per slice and discarded.
 *
 * These fixtures are abstract (p, y) mathematics: no teams, games, odds or
 * picks, and never rendered anywhere. They exercise the estimator only.
 */
const constant = (p: number, wins: number, losses: number, key: string) => [
  ...Array.from({ length: wins }, () => ({ p, y: 1 as const, key })),
  ...Array.from({ length: losses }, () => ({ p, y: 0 as const, key })),
];

describe("sliceCalibrationMetrics — Murphy resolution (C-276)", () => {
  it("reports RES 0 for a forecaster that always predicts the base rate", () => {
    // Perfectly calibrated by construction, and completely useless: every row
    // carries the same p, so no bin separates winners from losers.
    const rows = constant(0.6, 60, 40, "no-skill");
    const [slice] = sliceCalibrationMetrics(rows, (s) => s.key);

    expect(slice.murphyRes).toBeCloseTo(0, 6);
    // ...while the calibration terms look excellent. This is the whole finding.
    expect(slice.murphyRel).toBeCloseTo(0, 6);
    expect(slice.ece).toBeLessThan(0.01);
  });

  it("reports material RES for a forecaster that separates outcomes", () => {
    // Confident-and-right at both ends: bins finish far from the base rate.
    const rows = [
      ...constant(0.9, 45, 5, "skilled"),
      ...constant(0.1, 5, 45, "skilled"),
    ];
    const [slice] = sliceCalibrationMetrics(rows, (s) => s.key);

    expect(slice.murphyRes).toBeGreaterThan(0.1);
  });

  it("distinguishes RES from REL — they are different terms pulling opposite ways", () => {
    // Well separated but badly calibrated: high RES, high REL. Reading one as
    // the other inverts the conclusion.
    const rows = [
      ...constant(0.99, 30, 20, "overconfident"),
      ...constant(0.01, 20, 30, "overconfident"),
    ];
    const [slice] = sliceCalibrationMetrics(rows, (s) => s.key);

    expect(slice.murphyRes).toBeGreaterThan(0);
    expect(slice.murphyRel).toBeGreaterThan(0.1);
    expect(slice.murphyRes).not.toBeCloseTo(slice.murphyRel, 3);
  });

  it("computes RES per slice, not just pooled", () => {
    // The gap C-276 names: there was no per-version ranking power at all.
    const rows = [
      ...constant(0.5, 25, 25, "flat"),
      ...constant(0.9, 45, 5, "sharp"),
      ...constant(0.1, 5, 45, "sharp"),
    ];
    const slices = sliceCalibrationMetrics(rows, (s) => s.key);
    const flat = slices.find((s) => s.key === "flat");
    const sharp = slices.find((s) => s.key === "sharp");

    expect(flat?.murphyRes).toBeCloseTo(0, 6);
    expect(sharp?.murphyRes).toBeGreaterThan(0.1);
  });
});
