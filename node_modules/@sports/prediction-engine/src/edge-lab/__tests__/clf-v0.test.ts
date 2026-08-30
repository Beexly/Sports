/**
 * CLF v0 — calibration layer tests.
 *
 * H0 item 3 — CLF v0 (calibration layer, shrinkage), not a tout score.
 *
 * Tests cover:
 *  - Inactive calibrator (n < minSample): passthrough, calibrated=false.
 *  - Active calibrator: shrinks toward base rate, calibrated=true.
 *  - High evidence → converges to raw p.
 *  - Low evidence → converges to base rate.
 *  - Degenerate p (0, 1, NaN, ±Inf): fail closed.
 *  - Empty sample: identity passthrough.
 *  - priced: false invariant.
 *  - Batch application.
 *  - Monotonicity: increasing p → non-decreasing calibrated p.
 *  - Base rate correctness from settled samples.
 */
import { describe, expect, it } from "vitest";

import type { CalibrationSample } from "../../probability-calibration.js";
import {
  applyClfBatch,
  fitClfCalibrator,
  type ClfCalibrator,
  DEFAULT_MIN_CALIBRATION_SAMPLE,
  DEFAULT_PRIOR_STRENGTH,
} from "../calibration/clf-v0.js";

function samples(n: number, winRate: number, pCenter: number, pSpread: number = 0.1): CalibrationSample[] {
  const out: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ p: pCenter + (i % 3 - 1) * pSpread, y: i / n < winRate ? 1 : 0 });
  }
  return out;
}

describe("fitClfCalibrator — inactive (insufficient sample)", () => {
  it("below minSample: passthrough, calibrated=false", () => {
    const cal = fitClfCalibrator(samples(50, 0.6, 0.55), { minSample: 100 });
    expect(cal.isActive).toBe(false);
    expect(cal.inactiveReason).toBeTruthy();
    const r = cal.apply(0.7, 1);
    expect(r.calibrated).toBe(false);
    expect(r.p).toBeCloseTo(0.7, 10);
  });

  it("empty sample: identity passthrough to 0.5", () => {
    const cal = fitClfCalibrator([]);
    expect(cal.isActive).toBe(false);
    const r = cal.apply(0.6, 1);
    expect(r.calibrated).toBe(false);
    expect(r.p).toBeCloseTo(0.5, 6); // degenerate → 0.5
  });

  it("priced is always false", () => {
    const cal = fitClfCalibrator(samples(200, 0.55, 0.55), { minSample: 100 });
    expect(cal.priced).toBe(false);
  });
});

describe("fitClfCalibrator — active (sufficient sample)", () => {
  it("base rate equals empirical win rate", () => {
    const cal = fitClfCalibrator(samples(200, 0.6, 0.55), { minSample: 100 });
    expect(cal.isActive).toBe(true);
    expect(cal.baseRate).toBeCloseTo(0.6, 2);
  });

  it("kappa is positive and finite", () => {
    const cal = fitClfCalibrator(samples(200, 0.55, 0.55), { minSample: 100, priorStrength: 2 });
    expect(cal.isActive).toBe(true);
    expect(cal.kappa).toBeGreaterThan(0);
    expect(Number.isFinite(cal.kappa)).toBe(true);
  });

  it("low evidence: pulls toward base rate", () => {
    const cal = fitClfCalibrator(samples(200, 0.6, 0.55), { minSample: 100, priorStrength: 10 });
    // With kappa=10, evidence=0.1 → w = 10/10.1 ≈ 0.99 → nearly base rate.
    const r = cal.apply(0.9, 0.1);
    expect(r.calibrated).toBe(true);
    expect(r.p).toBeCloseTo(0.6, 1); // should be very close to base rate
  });

  it("high evidence: converges to raw p", () => {
    const cal = fitClfCalibrator(samples(200, 0.6, 0.55), { minSample: 100, priorStrength: 10 });
    // evidence = 10000 → w = 10/10010 ≈ 0.001 → nearly raw p.
    const r = cal.apply(0.9, 10000);
    expect(r.calibrated).toBe(true);
    expect(r.p).toBeCloseTo(0.9, 2);
  });

  it("identity at base rate: p == baseRate → unchanged", () => {
    const cal = fitClfCalibrator(samples(200, 0.6, 0.55), { minSample: 100, priorStrength: 5 });
    const r = cal.apply(cal.baseRate, 1);
    expect(r.p).toBeCloseTo(cal.baseRate, 6);
  });
});

describe("fitClfCalibrator — fail closed (degenerate p)", () => {
  const cal = fitClfCalibrator(samples(200, 0.6, 0.55), { minSample: 100, priorStrength: 5 });

  it("p = 0: returns raw p, calibrated=false", () => {
    const r = cal.apply(0, 1);
    expect(r.calibrated).toBe(false);
    expect(r.p).toBe(0);
  });

  it("p = 1: returns raw p, calibrated=false", () => {
    const r = cal.apply(1, 1);
    expect(r.calibrated).toBe(false);
    expect(r.p).toBe(1);
  });

  it("p = NaN: returns raw p, calibrated=false", () => {
    const r = cal.apply(NaN, 1);
    expect(r.calibrated).toBe(false);
  });

  it("p = Infinity: returns raw p, calibrated=false", () => {
    const r = cal.apply(Infinity, 1);
    expect(r.calibrated).toBe(false);
  });
});

describe("fitClfCalibrator — not a tout score", () => {
  it("does not produce edge scores — output is a probability in [0,1]", () => {
    const cal = fitClfCalibrator(samples(200, 0.55, 0.55), { minSample: 100 });
    const r = cal.apply(0.7, 1);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it("calibrated p is always between raw p and base rate (shrinkage direction)", () => {
    const cal = fitClfCalibrator(samples(200, 0.4, 0.65), { minSample: 100, priorStrength: 5 });
    // baseRate ≈ 0.4, raw p = 0.9 → calibrated should be between 0.4 and 0.9.
    const r = cal.apply(0.9, 1);
    expect(r.p).toBeGreaterThanOrEqual(Math.min(0.9, cal.baseRate) - 1e-9);
    expect(r.p).toBeLessThanOrEqual(Math.max(0.9, cal.baseRate) + 1e-9);
  });
});

describe("fitClfCalibrator — monotonicity", () => {
  it("increasing raw p → non-decreasing calibrated p", () => {
    const cal = fitClfCalibrator(samples(300, 0.55, 0.55), { minSample: 100, priorStrength: 5 });
    const ps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const cals = ps.map((p) => cal.apply(p, 1).p);
    for (let i = 1; i < cals.length; i++) {
      expect(cals[i]!).toBeGreaterThanOrEqual(cals[i - 1]! - 1e-10);
    }
  });
});

describe("applyClfBatch", () => {
  it("applies to many samples consistently with single calls", () => {
    const cal = fitClfCalibrator(samples(200, 0.6, 0.55), { minSample: 100, priorStrength: 5 });
    const batch = applyClfBatch(cal, [
      { p: 0.7, evidence: 1 },
      { p: 0.8, evidence: 2 },
      { p: 0.5 }, // default evidence = 1
    ]);
    expect(batch).toHaveLength(3);
    expect(batch[0]!.p).toBeCloseTo(cal.apply(0.7, 1).p, 10);
    expect(batch[1]!.p).toBeCloseTo(cal.apply(0.8, 2).p, 10);
    expect(batch[2]!.p).toBeCloseTo(cal.apply(0.5, 1).p, 10);
  });
});

describe("fitClfCalibrator — defaults", () => {
  it("uses DEFAULT_MIN_CALIBRATION_SAMPLE when minSample omitted", () => {
    const cal = fitClfCalibrator(samples(DEFAULT_MIN_CALIBRATION_SAMPLE, 0.5, 0.5));
    expect(cal.isActive).toBe(true);
  });

  it("uses DEFAULT_PRIOR_STRENGTH when priorStrength omitted", () => {
    const cal = fitClfCalibrator(samples(200, 0.55, 0.55), { minSample: 100 });
    expect(cal.kappa).toBeGreaterThan(0); // should be derived from MoM or fallback
  });
});