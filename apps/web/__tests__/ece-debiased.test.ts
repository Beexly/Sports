import { describe, expect, it } from "vitest";
import { debiasedExpectedCalibrationError } from "@/lib/calibration/ece-debiased";
import { evaluateCalibrationEligibility } from "@/lib/ops/calibration-eligibility";

/** Deterministic LCG so the synthetic samples are the same on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A PERFECTLY calibrated forecaster: y ~ Bernoulli(p). Any ECE it shows is noise. */
function perfectlyCalibrated(n: number, seed: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const p = 0.5 + 0.45 * r();
    return { p, y: (r() < p ? 1 : 0) as 0 | 1 };
  });
}

describe("debiasedExpectedCalibrationError (C-290)", () => {
  it("empty input is all zeros, never NaN", () => {
    expect(debiasedExpectedCalibrationError([])).toEqual({
      raw: 0,
      noise: 0,
      noiseAnalytic: 0,
      debiased: 0,
      bins: 10,
      replications: 400,
    });
  });

  it("is deterministic: the same sample gives the same correction on every run", () => {
    const s = perfectlyCalibrated(300, 11);
    expect(debiasedExpectedCalibrationError(s)).toEqual(debiasedExpectedCalibrationError(s));
  });

  it("the Monte Carlo null and the closed-form plug-in agree at moderate n", () => {
    const r = debiasedExpectedCalibrationError(perfectlyCalibrated(2000, 3));
    expect(Math.abs(r.noise - r.noiseAnalytic)).toBeLessThan(0.004);
  });

  it("raw matches the plain binned ECE definition on a tiny hand sample", () => {
    // Two bins: [0.6,0.7) with mean 0.65 and rate 1; [0.8,0.9) with mean 0.85 and rate 0.5.
    const s = [
      { p: 0.6, y: 1 as const },
      { p: 0.7 - 1e-9, y: 1 as const },
      { p: 0.85, y: 1 as const },
      { p: 0.85, y: 0 as const },
    ];
    const r = debiasedExpectedCalibrationError(s);
    expect(r.raw).toBeCloseTo(0.5 * Math.abs(0.65 - 1) + 0.5 * Math.abs(0.85 - 0.5), 6);
    expect(r.noise).toBeGreaterThan(0);
    expect(r.debiased).toBeCloseTo(Math.max(0, r.raw - r.noise), 6);
  });

  it("a perfectly calibrated forecaster shows raw ECE near the noise floor, and the correction takes it out", () => {
    // Averaged over seeds: raw sits at the noise expectation, debiased near 0.
    // Individual draws scatter, so the assertion is on the mean of 40 draws.
    let raw = 0;
    let noise = 0;
    let debiased = 0;
    const draws = 40;
    for (let seed = 1; seed <= draws; seed += 1) {
      const r = debiasedExpectedCalibrationError(perfectlyCalibrated(487, seed));
      raw += r.raw;
      noise += r.noise;
      debiased += r.debiased;
    }
    raw /= draws;
    noise /= draws;
    debiased /= draws;
    // The raw estimator is biased upward by the noise term at n 487: it reads
    // near 0.04 for a model with NO calibration error at all, which is most of
    // the 0.05 floor.
    expect(raw).toBeGreaterThan(0.03);
    expect(Math.abs(raw - noise)).toBeLessThan(0.01);
    expect(debiased).toBeLessThan(0.012);
  });

  it("a genuinely miscalibrated forecaster keeps its gap after the correction", () => {
    // Forecasts 0.15 too high everywhere: the truth is p - 0.15.
    const r0 = rng(99);
    const s = Array.from({ length: 2000 }, () => {
      const p = 0.55 + 0.4 * r0();
      return { p, y: (r0() < p - 0.15 ? 1 : 0) as 0 | 1 };
    });
    const r = debiasedExpectedCalibrationError(s);
    expect(r.raw).toBeGreaterThan(0.12);
    expect(r.debiased).toBeGreaterThan(0.1);
  });

  it("the correction never exceeds the raw value (debiased is floored at 0)", () => {
    const r = debiasedExpectedCalibrationError(perfectlyCalibrated(30, 5));
    expect(r.debiased).toBeGreaterThanOrEqual(0);
    expect(r.debiased).toBeLessThanOrEqual(r.raw);
  });
});

describe("evaluateCalibrationEligibility reads the debiased ECE (C-290)", () => {
  const base = {
    n: 487,
    brier: 0.1907,
    mce: 0.31,
    murphy: { reliability: 0.006, resolution: 0.027, uncertainty: 0.212 },
    modelVersion: "mixed",
    dateRange: "2026-06-18…2026-09-09",
    generatedAt: "2026-09-09T09:38:03.479Z",
  };
  const input = {
    canonicalSettled: 1000,
    minSettledForLearning: 100,
    settlementHealthy: true,
    consecutiveGreenPrior: 0,
    streakRequired: 3,
  };

  it("raw above the floor but debiased below it meets the floors, and says so with provenance", () => {
    const r = evaluateCalibrationEligibility({
      metrics: { ...base, ece: 0.0539, eceNoise: 0.041, eceDebiased: 0.0129 },
      ...input,
    });
    expect(r.runMeetsFloors).toBe(true);
    expect(r.ece).toBe(0.0539);
    expect(r.eceDebiased).toBe(0.0129);
    expect(r.eceNoise).toBe(0.041);
  });

  it("debiased above the floor still fails, and the reason carries raw and noise", () => {
    const r = evaluateCalibrationEligibility({
      metrics: { ...base, ece: 0.12, eceNoise: 0.04, eceDebiased: 0.08 },
      ...input,
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain("ECE debiased 0.0800 > 0.05 (raw 0.1200, noise 0.0400)");
  });

  it("an artifact with no correction falls back to the raw ECE (the stricter direction)", () => {
    const r = evaluateCalibrationEligibility({ metrics: { ...base, ece: 0.0539 }, ...input });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain("ECE 0.0539 > 0.05");
    expect(r.eceDebiased).toBeNull();
  });
});
