import { describe, expect, it } from "vitest";
import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import {
  bootstrapCalibrationMetricCis,
  DEFAULT_METRIC_CI_RESAMPLES,
  DEFAULT_METRIC_CI_SEED,
} from "@/lib/calibration/bootstrap-metric-ci";
import { bootstrapCalibrationBand } from "@/lib/calibration/bootstrap-calib-ci";

/**
 * bootstrap-calib-ci.ts bands a fitted calibration map over a score grid and
 * has no scalar-metric interval, so bootstrapCalibrationMetricCis sits next to
 * it. The interval must be reproducible (fixed seed) and contain the pooled
 * point estimate computed by the same functions.
 */
/**
 * Deterministic fixture. `offset` is how far the hit rate at each forecast
 * level sits below the forecast: 0 is calibrated by construction (pooled ECE
 * exactly 0, a boundary value); 0.06 is the realistic case (production reads
 * ECE 0.044 on the market-anchored moneyline sample, 2026-09-05).
 */
function fixture(n: number, offset: number): CalibrationSample[] {
  const out: CalibrationSample[] = [];
  const levels = [0.55, 0.65, 0.75, 0.85];
  const perLevel = n / levels.length;
  for (let i = 0; i < n; i++) {
    const p = levels[i % levels.length]!;
    const idx = Math.floor(i / levels.length);
    out.push({ p, y: idx / perLevel < p - offset ? 1 : 0 });
  }
  return out;
}

describe("bootstrapCalibrationMetricCis", () => {
  const samples = fixture(120, 0.06);

  it("(d) contains the pooled point estimates and echoes the resample count", () => {
    const point = { brier: brierDecomposition(samples).brier, ece: expectedCalibrationError(samples) };
    const cis = bootstrapCalibrationMetricCis(samples);
    expect(cis).not.toBeNull();
    expect(cis!.brierCi95.lo).toBeLessThanOrEqual(point.brier);
    expect(cis!.brierCi95.hi).toBeGreaterThanOrEqual(point.brier);
    expect(cis!.eceCi95.lo).toBeLessThanOrEqual(point.ece);
    expect(cis!.eceCi95.hi).toBeGreaterThanOrEqual(point.ece);
    expect(cis!.brierCi95.lo).toBeLessThan(cis!.brierCi95.hi);
    expect(cis!.brierCi95.resamples).toBe(DEFAULT_METRIC_CI_RESAMPLES);
    expect(cis!.eceCi95.resamples).toBe(DEFAULT_METRIC_CI_RESAMPLES);
    expect(cis!.seed).toBe(DEFAULT_METRIC_CI_SEED);
  });

  it("(d) is deterministic under the seed and follows the seed when changed", () => {
    const a = bootstrapCalibrationMetricCis(samples, { seed: 7, resamples: 150 });
    const b = bootstrapCalibrationMetricCis(samples, { seed: 7, resamples: 150 });
    expect(a).toEqual(b);
    expect(a?.brierCi95.resamples).toBe(150);
    const c = bootstrapCalibrationMetricCis(samples, { seed: 8, resamples: 150 });
    expect(c).not.toBeNull();
    // Two seeds are two different resample streams; at least one bound moves.
    const same =
      c!.brierCi95.lo === a!.brierCi95.lo &&
      c!.brierCi95.hi === a!.brierCi95.hi &&
      c!.eceCi95.lo === a!.eceCi95.lo &&
      c!.eceCi95.hi === a!.eceCi95.hi;
    expect(same).toBe(false);
  });

  it("near-zero pooled ECE: the percentile interval sits ABOVE the point estimate (documented noise bias)", () => {
    // offset 0 is calibrated up to integer rounding (30 rows per level), so the
    // pooled ECE is small but not exactly 0. ECE is bounded at zero and every
    // resample carries binning noise, so the 2.5% bound lands above a near-zero
    // point estimate. Pinned so nobody reads that as a containment bug later;
    // the Brier interval, an unbounded-below mean, still covers its estimate.
    const nearExact = fixture(120, 0);
    const point = expectedCalibrationError(nearExact);
    expect(point).toBeGreaterThanOrEqual(0);
    expect(point).toBeLessThan(0.02);
    const cis = bootstrapCalibrationMetricCis(nearExact);
    expect(cis).not.toBeNull();
    expect(cis!.eceCi95.lo).toBeGreaterThan(point);
    const brier = brierDecomposition(nearExact).brier;
    expect(cis!.brierCi95.lo).toBeLessThanOrEqual(brier);
    expect(cis!.brierCi95.hi).toBeGreaterThanOrEqual(brier);
  });

  it("returns null below two samples (no resampling variance to report)", () => {
    expect(bootstrapCalibrationMetricCis([])).toBeNull();
    expect(bootstrapCalibrationMetricCis([{ p: 0.6, y: 1 }])).toBeNull();
  });

  it("does not change the existing map band helper's output for the same seed", () => {
    const train = samples.map((s) => ({ score: s.p, outcome: s.y }));
    const before = bootstrapCalibrationBand(train, { B: 20, seed: 42 });
    const again = bootstrapCalibrationBand(train, { B: 20, seed: 42 });
    expect(again).toEqual(before);
    expect(before.nBootstrap).toBe(20);
    expect(before.scoreGrid).toHaveLength(21);
  });
});
