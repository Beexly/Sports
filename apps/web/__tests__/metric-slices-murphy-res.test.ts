import { describe, expect, it } from "vitest";
import { sliceCalibrationMetrics } from "@/lib/calibration/metric-slices";

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
