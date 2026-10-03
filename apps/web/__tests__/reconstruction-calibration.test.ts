import { describe, it, expect } from "vitest";
import {
  calibrationReport,
  reconstructionRmse,
  wasserstein1,
  ksStatistic,
  TARGET_RMSE_YARDS,
  type TruthPair,
} from "@/lib/reconstruction/calibration-eval";
import { reconstructed, makeProvenance } from "@/lib/reconstruction/provenance";

/**
 * The calibration harness is the honest scoreboard: it measures reconstruction
 * against real coordinates and cannot be gamed. These tests pin the metrics.
 */

function pair(predicted: number, actual: number, halfWidth = 0.5): TruthPair {
  return {
    predicted: reconstructed(
      predicted,
      [predicted - halfWidth, predicted + halfWidth],
      0.2,
      makeProvenance("covariate-adjusted", ["calibration:truth"], true),
    ),
    actual,
  };
}

describe("reconstructionRmse", () => {
  it("is zero for perfect reconstruction and grows with error", () => {
    expect(reconstructionRmse([pair(3, 3), pair(2, 2)])).toBe(0);
    expect(reconstructionRmse([pair(3, 4)])).toBeCloseTo(1, 6);
    expect(Number.isNaN(reconstructionRmse([]))).toBe(true);
  });
});

describe("calibrationReport", () => {
  it("reports coverage and honors the RMSE target", () => {
    // Two exact hits inside their intervals; RMSE 0 beats the target.
    const report = calibrationReport([pair(3, 3), pair(5, 5)]);
    expect(report.n).toBe(2);
    expect(report.rmse).toBe(0);
    expect(report.empiricalCoverage).toBe(1);
    expect(report.nominalCoverage).toBeCloseTo(0.8, 6);
    expect(report.meetsRmseTarget).toBe(true);
    expect(TARGET_RMSE_YARDS).toBeGreaterThan(0.3); // ~0.328 yd == 0.3 m
  });

  it("counts truths outside their interval as missed coverage", () => {
    const report = calibrationReport([pair(3, 3), pair(5, 9)]); // second miss (9 outside 4.5..5.5)
    expect(report.empiricalCoverage).toBe(0.5);
    expect(report.meetsRmseTarget).toBe(false);
  });
});

describe("distributional distances", () => {
  it("wasserstein1 is 0 for identical samples and positive for shifted ones", () => {
    expect(wasserstein1([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 6);
    expect(wasserstein1([1, 2, 3], [2, 3, 4])).toBeGreaterThan(0);
  });

  it("ksStatistic is 0 for identical samples and bounded by 1", () => {
    expect(ksStatistic([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 6);
    const d = ksStatistic([1, 1, 1], [5, 5, 5]);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(1);
  });
});
