import { describe, it, expect } from "vitest";
import {
  buildCalibrationSnapshot,
  checkForRegression,
  type CalibrationSnapshot,
} from "../regression-detector.js";
import type { CalibrationSample } from "../probability-calibration.js";

/** Deterministic PRNG (mulberry32) — matches the package's other seeded modules. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** n samples where p tracks the true win rate closely (well-calibrated, high-RES). */
function wellCalibratedSamples(n: number, seed: number): CalibrationSample[] {
  const rand = mulberry32(seed);
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.3 + 0.4 * rand(); // spread across [0.3, 0.7]
    const y = rand() < p ? 1 : 0;
    out.push({ p, y });
  }
  return out;
}

/** n samples where p is a poor, near-constant guess regardless of outcome (low RES). */
function poorlyCalibratedSamples(n: number, seed: number): CalibrationSample[] {
  const rand = mulberry32(seed);
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.5 + 0.02 * (rand() - 0.5);
    const y = rand() < 0.5 ? 1 : 0;
    out.push({ p, y });
  }
  return out;
}

describe("buildCalibrationSnapshot", () => {
  it("labels the window and reuses brierDecomposition's fields verbatim", () => {
    const snap = buildCalibrationSnapshot(wellCalibratedSamples(50, 1), "2026-08-01..2026-08-07");
    expect(snap.windowLabel).toBe("2026-08-01..2026-08-07");
    expect(snap.sampleSize).toBe(50);
    expect(Number.isFinite(snap.brier)).toBe(true);
    expect(Number.isFinite(snap.resolution)).toBe(true);
  });

  it("empty input yields a zeroed, well-formed snapshot rather than throwing", () => {
    const snap = buildCalibrationSnapshot([], "empty");
    expect(snap.sampleSize).toBe(0);
    expect(snap.brier).toBe(0);
  });
});

describe("checkForRegression", () => {
  it("refuses a verdict below minSampleSize in either snapshot", () => {
    const current = buildCalibrationSnapshot(wellCalibratedSamples(5, 2), "current");
    const baseline = buildCalibrationSnapshot(wellCalibratedSamples(200, 3), "baseline");
    const verdict = checkForRegression(current, baseline, { minSampleSize: 20 });
    expect(verdict.sufficientSample).toBe(false);
    expect(verdict.regressed).toBe(false);
    expect(verdict.reasons[0]).toContain("Insufficient sample");
  });

  it("does not flag a stable model (same distribution, different seed) as regressed", () => {
    const current = buildCalibrationSnapshot(wellCalibratedSamples(400, 11), "current");
    const baseline = buildCalibrationSnapshot(wellCalibratedSamples(400, 22), "baseline");
    const verdict = checkForRegression(current, baseline);
    expect(verdict.sufficientSample).toBe(true);
    expect(verdict.regressed).toBe(false);
    expect(verdict.reasons).toHaveLength(0);
  });

  it("flags a genuine Brier regression (well-calibrated baseline, poorly-calibrated current)", () => {
    const current = buildCalibrationSnapshot(poorlyCalibratedSamples(400, 5), "current");
    const baseline = buildCalibrationSnapshot(wellCalibratedSamples(400, 6), "baseline");
    const verdict = checkForRegression(current, baseline);
    expect(verdict.sufficientSample).toBe(true);
    expect(verdict.regressed).toBe(true);
    expect(verdict.reasons.some((r) => r.includes("Resolution"))).toBe(true);
  });

  it("does not flag an IMPROVEMENT (current better than baseline) as a regression", () => {
    const current = buildCalibrationSnapshot(wellCalibratedSamples(400, 7), "current");
    const baseline = buildCalibrationSnapshot(poorlyCalibratedSamples(400, 8), "baseline");
    const verdict = checkForRegression(current, baseline);
    expect(verdict.regressed).toBe(false);
  });

  it("a small Brier wobble inside tolerance does not trip the alert", () => {
    const current: CalibrationSnapshot = {
      brier: 0.221,
      reliability: 0.02,
      resolution: 0.005,
      uncertainty: 0.236,
      baseRate: 0.5,
      sampleSize: 300,
      windowLabel: "current",
    };
    const baseline: CalibrationSnapshot = { ...current, brier: 0.2, windowLabel: "baseline" };
    const verdict = checkForRegression(current, baseline, { brierTolerance: 0.03 });
    expect(verdict.regressed).toBe(false);
  });

  it("a Brier move exactly at the tolerance boundary does not trip (strict >)", () => {
    const current: CalibrationSnapshot = {
      brier: 0.24,
      reliability: 0.02,
      resolution: 0.005,
      uncertainty: 0.236,
      baseRate: 0.5,
      sampleSize: 300,
      windowLabel: "current",
    };
    const baseline: CalibrationSnapshot = { ...current, brier: 0.22, windowLabel: "baseline" };
    const verdict = checkForRegression(current, baseline, { brierTolerance: 0.02 });
    expect(verdict.regressed).toBe(false);
  });

  it("reports both brierDelta and resolutionDelta with correct sign", () => {
    const current: CalibrationSnapshot = {
      brier: 0.3,
      reliability: 0.02,
      resolution: 0.001,
      uncertainty: 0.25,
      baseRate: 0.5,
      sampleSize: 300,
      windowLabel: "current",
    };
    const baseline: CalibrationSnapshot = {
      brier: 0.25,
      reliability: 0.02,
      resolution: 0.02,
      uncertainty: 0.25,
      baseRate: 0.5,
      sampleSize: 300,
      windowLabel: "baseline",
    };
    const verdict = checkForRegression(current, baseline);
    expect(verdict.brierDelta).toBeCloseTo(0.05, 10);
    expect(verdict.resolutionDelta).toBeCloseTo(-0.019, 10);
    expect(verdict.regressed).toBe(true);
    expect(verdict.reasons).toHaveLength(2);
  });
});
