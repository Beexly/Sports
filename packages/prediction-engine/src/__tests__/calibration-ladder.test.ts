import { describe, it, expect } from "vitest";
import {
  plattScaling,
  binnedEmpiricalCalibration,
  buildCalibrationLadder,
  DEFAULT_LADDER_MIN_SAMPLE,
} from "../calibration-ladder.js";
import { expectedCalibrationError, type CalibrationSample } from "../probability-calibration.js";

/** All-same-forecast samples with the wins packed FIRST (i.e. NOT time-shuffled). */
function packed(p: number, winRate: number, n: number): CalibrationSample[] {
  const wins = Math.round(n * winRate);
  return Array.from({ length: n }, (_, i) => ({ p, y: (i < wins ? 1 : 0) as 0 | 1 }));
}

/** All-same-forecast samples with wins spread evenly through the sequence (chronologically honest). */
function interleaved(p: number, winRate: number, n: number): CalibrationSample[] {
  return Array.from({ length: n }, (_, i) => ({
    p,
    y: (Math.floor((i + 1) * winRate) > Math.floor(i * winRate) ? 1 : 0) as 0 | 1,
  }));
}

describe("plattScaling", () => {
  it("is an identity passthrough with no data", () => {
    const m = plattScaling([]);
    expect(m.predict(0.3)).toBeCloseTo(0.3, 6);
  });

  it("reduces ECE on an over-confident dataset", () => {
    // Forecasts at the extremes, but outcomes pulled toward the middle.
    const samples: CalibrationSample[] = [
      ...interleaved(0.9, 0.6, 100),
      ...interleaved(0.1, 0.4, 100),
    ];
    const rawEce = expectedCalibrationError(samples);
    const m = plattScaling(samples);
    const calEce = expectedCalibrationError(samples.map((s) => ({ p: m.predict(s.p), y: s.y })));
    expect(calEce).toBeLessThan(rawEce);
  });

  it("is monotonic increasing when higher forecasts genuinely win more", () => {
    const samples: CalibrationSample[] = [
      ...interleaved(0.2, 0.2, 80),
      ...interleaved(0.5, 0.5, 80),
      ...interleaved(0.8, 0.8, 80),
    ];
    const m = plattScaling(samples);
    expect(m.predict(0.8)).toBeGreaterThan(m.predict(0.2));
    expect(m.predict(0.5)).toBeGreaterThanOrEqual(m.predict(0.2));
  });
});

describe("binnedEmpiricalCalibration", () => {
  it("recovers each bucket's observed win rate", () => {
    const samples: CalibrationSample[] = [
      ...interleaved(0.05, 0.6, 50),
      ...interleaved(0.95, 0.8, 50),
    ];
    const m = binnedEmpiricalCalibration(samples, { bins: 10 });
    expect(m.bins[0]!.observedRate).toBeCloseTo(0.6, 1);
    expect(m.bins[9]!.observedRate).toBeCloseTo(0.8, 1);
  });

  it("shrinks a thin bucket toward the base rate", () => {
    // One sparse, all-win bucket plus a large balanced mass setting base rate ~0.5.
    const samples: CalibrationSample[] = [
      ...interleaved(0.95, 1.0, 2), // 2 wins in the top bin
      ...interleaved(0.45, 0.5, 200),
    ];
    const m = binnedEmpiricalCalibration(samples, { bins: 10, shrinkK: 20 });
    const top = m.bins[9]!;
    expect(top.observedRate).toBeCloseTo(1, 6);
    expect(top.calibrated).toBeLessThan(1); // pulled down toward base rate
    expect(top.calibrated).toBeGreaterThan(m.baseRate);
  });

  it("keeps the Wilson bound around the observed rate and outputs valid probabilities", () => {
    const samples = interleaved(0.7, 0.65, 120);
    const m = binnedEmpiricalCalibration(samples);
    for (const b of m.bins) {
      if (b.count > 0) {
        expect(b.wilsonLow).toBeLessThanOrEqual(b.observedRate + 1e-9);
        expect(b.wilsonHigh).toBeGreaterThanOrEqual(b.observedRate - 1e-9);
      }
    }
    expect(m.predict(0.7)).toBeGreaterThanOrEqual(0);
    expect(m.predict(0.7)).toBeLessThanOrEqual(1);
    expect(m.predictLowerBound(0.7)).toBeLessThanOrEqual(m.predict(0.7) + 0.5);
  });
});

describe("buildCalibrationLadder", () => {
  it("exposes the path-to-70 sample floor (100)", () => {
    expect(DEFAULT_LADDER_MIN_SAMPLE).toBe(100);
  });

  it("is INACTIVE below the sample floor and acts as a labeled identity passthrough", () => {
    const l = buildCalibrationLadder(interleaved(0.5, 0.7, 40));
    expect(l.isActive).toBe(false);
    expect(l.method).toBe("identity");
    const out = l.apply(73);
    expect(out.calibrated).toBe(false);
    expect(out.probability).toBeCloseTo(0.73, 5);
  });

  it("ACTIVATES on a chronologically-honest miscalibrated sample and corrects it", () => {
    // 200 picks scored 50% that actually win 70%, wins spread through time.
    const l = buildCalibrationLadder(interleaved(0.5, 0.7, 200));
    expect(l.isActive).toBe(true);
    expect(l.method).not.toBe("identity");
    expect(l.heldOutEce[l.method]).toBeLessThanOrEqual(l.heldOutEce.identity);
    const out = l.apply(50);
    expect(out.calibrated).toBe(true);
    expect(out.probability).toBeCloseTo(0.7, 1);
  });

  it("REJECTS the in-sample-leakage trap: time-clustered outcomes do NOT activate", () => {
    // Same 50%→70% miscalibration, but with all wins packed first. An in-sample
    // validator would fit 0.5→1.0 on the (all-win) past and call it improved.
    // The held-out future (all losses) exposes that as worse than raw → identity.
    const l = buildCalibrationLadder(packed(0.5, 0.7, 200));
    expect(l.isActive).toBe(false);
    expect(l.method).toBe("identity");
    expect(l.apply(50).calibrated).toBe(false);
  });

  it("stays INACTIVE when the forecasts are already well-calibrated", () => {
    const l = buildCalibrationLadder(interleaved(0.6, 0.6, 200));
    expect(l.isActive).toBe(false);
    expect(l.apply(60).probability).toBeCloseTo(0.6, 5);
  });

  it("apply maps 0–100 → [0,1] and rejects non-finite input", () => {
    const l = buildCalibrationLadder([]);
    expect(l.apply(100).probability).toBe(1);
    expect(l.apply(0).probability).toBe(0);
    expect(l.apply(Number.NaN).probability).toBe(0);
  });

  it("always exposes a conservative Wilson lower bound, even when inactive", () => {
    const l = buildCalibrationLadder(interleaved(0.5, 0.7, 200));
    const floor = l.lowerBound(50);
    expect(floor).toBeGreaterThanOrEqual(0);
    expect(floor).toBeLessThanOrEqual(1);
    // The honest floor sits at or below the point estimate.
    expect(floor).toBeLessThanOrEqual(l.apply(50).probability + 1e-9);
  });
});
