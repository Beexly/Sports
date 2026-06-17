import { describe, it, expect } from "vitest";
import { buildCalibrator, DEFAULT_MIN_CALIBRATION_SAMPLE } from "../calibration-apply.js";
import type { CalibrationSample } from "../probability-calibration.js";

/** N samples that all forecast `p` and win at rate `winRate` (deterministic split). */
function samplesAt(p: number, winRate: number, n: number): CalibrationSample[] {
  const wins = Math.round(n * winRate);
  return Array.from({ length: n }, (_, i) => ({ p, y: i < wins ? 1 : 0 }) as CalibrationSample);
}

describe("buildCalibrator", () => {
  it("default minimum sample is 100 (matches MIN_SETTLED_PICKS_FOR_LEARNING)", () => {
    expect(DEFAULT_MIN_CALIBRATION_SAMPLE).toBe(100);
  });

  it("is INACTIVE with no data and acts as an identity passthrough labeled uncalibrated", () => {
    const c = buildCalibrator([]);
    expect(c.isActive).toBe(false);
    expect(c.sampleSize).toBe(0);
    expect(c.inactiveReason).toMatch(/below the minimum/);
    const out = c.apply(73);
    expect(out.calibrated).toBe(false);
    expect(out.probability).toBeCloseTo(0.73, 5);
  });

  it("stays INACTIVE below the sample floor even when data is available", () => {
    const c = buildCalibrator(samplesAt(0.5, 0.7, 40), { minSample: 100 });
    expect(c.isActive).toBe(false);
    expect(c.apply(50).calibrated).toBe(false);
    expect(c.apply(50).probability).toBeCloseTo(0.5, 5);
  });

  it("ACTIVATES with a sufficient sample and corrects a miscalibrated score", () => {
    // 120 picks all scored 50% confidence but that bucket actually wins 70%.
    const c = buildCalibrator(samplesAt(0.5, 0.7, 120), { minSample: 100 });
    expect(c.isActive).toBe(true);
    expect(c.calibratedEce).toBeLessThanOrEqual(c.rawEce);
    const out = c.apply(50);
    expect(out.calibrated).toBe(true);
    expect(out.probability).toBeCloseTo(0.7, 1); // 50% score → ~70% calibrated probability
  });

  it("never reports a calibrated number when inactive (honesty guard)", () => {
    const c = buildCalibrator(samplesAt(0.5, 0.7, 10), { minSample: 100 });
    for (const conf of [10, 50, 90]) {
      expect(c.apply(conf).calibrated).toBe(false);
    }
  });

  it("apply maps confidence 0–100 to a probability in [0,1] and rejects non-finite input", () => {
    const c = buildCalibrator([]);
    expect(c.apply(100).probability).toBe(1);
    expect(c.apply(0).probability).toBe(0);
    expect(c.apply(Number.NaN).probability).toBe(0);
  });
});
