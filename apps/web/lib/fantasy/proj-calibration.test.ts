import { describe, expect, it } from "vitest";
import {
  MIN_SAMPLE,
  SPREAD_CLIP,
  Z90,
  applyCalibration,
  calibrationReport,
  fitProjectionCalibration,
  type ProjectionOutcome,
} from "@/lib/fantasy/proj-calibration";

const rows = (n: number, projected: number, actual: number): ProjectionOutcome[] =>
  Array.from({ length: n }, () => ({ projected, actual }));

describe("proj-calibration — refuses to fit noise", () => {
  it("passes projections through untouched below the sample floor", () => {
    const fit = fitProjectionCalibration(rows(MIN_SAMPLE - 1, 100, 200));
    expect(fit.insufficient).toBe(true);
    expect(fit.biasRatio).toBe(1);
    expect(fit.spreadMultiplier).toBe(1);
    expect(applyCalibration(137, fit)).toBe(137);
    expect(fit.note).toContain("Insufficient sample");
  });

  it("reports its sample size on every fit", () => {
    const fit = fitProjectionCalibration(rows(40, 100, 100));
    expect(fit.insufficient).toBe(false);
    expect(fit.n).toBe(40);
  });

  it("drops non-finite rows before counting the sample", () => {
    const fit = fitProjectionCalibration([
      ...rows(35, 100, 100),
      { projected: Number.NaN, actual: 10 },
      { projected: 10, actual: Number.POSITIVE_INFINITY },
    ]);
    expect(fit.n).toBe(35);
  });
});

describe("proj-calibration — bias and spread math", () => {
  it("findings an unbiased sample at biasRatio 1", () => {
    const fit = fitProjectionCalibration(rows(50, 100, 100));
    expect(fit.biasRatio).toBeCloseTo(1, 10);
    expect(applyCalibration(100, fit)).toBeCloseTo(100, 10);
  });

  it("corrects a systematic multiplicative bias", () => {
    const fit = fitProjectionCalibration(rows(60, 100, 120));
    expect(fit.biasRatio).toBeCloseTo(1.2, 10);
    // pivot-centered: the mean projection is bias-scaled but not spread-scaled.
    expect(applyCalibration(100, fit)).toBeCloseTo(120, 10);
  });

  it("scales the spread around the pivot, leaving the pivot itself unmoved by spread", () => {
    const fit = fitProjectionCalibration(rows(60, 100, 100));
    const applied = applyCalibration(150, fit);
    // spread is centred on the pivot, so a higher projection moves further out.
    expect(applied).toBeGreaterThan(100);
  });

  it("derives the spread multiplier as p90(|residual|) / z90", () => {
    // 90 rows at residual 1.5, 10 rows at residual 0.2 → p90 lands on 1.5.
    const mixed: ProjectionOutcome[] = [
      ...Array.from({ length: 90 }, () => ({ projected: 100, actual: 250 })),
      ...Array.from({ length: 10 }, () => ({ projected: 100, actual: 120 })),
    ];
    const fit = fitProjectionCalibration(mixed);
    expect(fit.spreadMultiplier).toBeCloseTo(1.5 / Z90, 6);
    expect(1.5 / Z90).toBeGreaterThan(SPREAD_CLIP.min);
    expect(1.5 / Z90).toBeLessThan(SPREAD_CLIP.max);
    expect(fit.clipped).toBe(false);
  });

  it("clips the spread into the published band and says when it binds", () => {
    const tight = fitProjectionCalibration(rows(50, 100, 100));
    expect(tight.spreadMultiplier).toBe(SPREAD_CLIP.min);
    expect(tight.clipped).toBe(true);
    expect(tight.note).toContain("CLIPPED");
  });

  it("states its formula in the note so a reader can recompute", () => {
    const fit = fitProjectionCalibration(rows(50, 100, 120));
    expect(fit.note).toContain("biasRatio = mean(actual)/mean(projected)");
    expect(fit.note).toContain("p90(|residual|)");
  });

  it("survives projected=0 rows without dividing by zero", () => {
    const fit = fitProjectionCalibration([
      ...rows(35, 100, 110),
      { projected: 0, actual: 5 },
    ]);
    expect(Number.isFinite(fit.biasRatio)).toBe(true);
    expect(Number.isFinite(fit.spreadMultiplier)).toBe(true);
    expect(fit.note).toContain("dropped");
  });
});

describe("proj-calibration — honest out-of-sample reporting", () => {
  it("separates in-sample from holdout error", () => {
    const data = rows(40, 100, 200);
    const rep = calibrationReport(data);
    expect(rep.fit.insufficient).toBe(false);
    expect(rep.holdoutN).toBe(10);
    expect(rep.maeInSample).toBeLessThan(rep.maeRaw);
    expect(rep.maeHoldout).not.toBeNull();
  });

  it("says so when the correction does NOT generalise", () => {
    const data: ProjectionOutcome[] = [
      ...rows(30, 100, 200),
      ...rows(10, 100, 100),
    ];
    const rep = calibrationReport(data);
    expect(rep.improvedOutOfSample).toBe(false);
    expect(rep.note).toContain("did NOT improve");
  });

  it("reports unknown — not success — when there is no holdout slice", () => {
    const rep = calibrationReport(rows(40, 100, 200), { holdoutFraction: 0 });
    expect(rep.maeHoldout).toBeNull();
    expect(rep.improvedOutOfSample).toBeNull();
    expect(rep.note).toContain("unknown");
  });

  it("labels an unsampled report as no-sample and keeps MAE raw", () => {
    const rep = calibrationReport(rows(5, 100, 200));
    expect(rep.basis).toBe("no-sample");
    expect(rep.maeInSample).toBe(rep.maeRaw);
    expect(rep.maeHoldout).toBeNull();
  });

  it("labels a fitted report as settled-outcomes", () => {
    const rep = calibrationReport(rows(40, 100, 200));
    expect(rep.basis).toBe("settled-outcomes");
    expect(rep.note).toContain("flatters by construction");
  });
});