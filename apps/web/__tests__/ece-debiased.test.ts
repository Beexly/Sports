import { describe, expect, it } from "vitest";
import { brierDecomposition } from "@sports/prediction-engine";
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

/** Forecasts `gap` too high everywhere: the truth is p - gap. */
function overconfidentBy(n: number, gap: number, seed: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const p = 0.55 + 0.4 * r();
    return { p, y: (r() < p - gap ? 1 : 0) as 0 | 1 };
  });
}

function meanOver(draws: number, f: (seed: number) => number): number {
  let total = 0;
  for (let seed = 1; seed <= draws; seed += 1) total += f(seed);
  return total / draws;
}

describe("debiasedExpectedCalibrationError (C-290 / C-292)", () => {
  it("empty input is all zeros, never NaN", () => {
    expect(debiasedExpectedCalibrationError([])).toEqual({
      raw: 0,
      noise: 0,
      noiseAnalytic: 0,
      debiased: 0,
      reliability: 0,
      reliabilityNoise: 0,
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
    expect(r.debiased).toBeLessThanOrEqual(r.raw);
  });

  it("reliability on these bins is brierDecomposition's reliability (same bins, same rule)", () => {
    const s = perfectlyCalibrated(500, 21);
    const r = debiasedExpectedCalibrationError(s);
    // brierDecomposition rounds to 4dp; the estimator keeps 6.
    expect(Math.abs(r.reliability - brierDecomposition(s).reliability)).toBeLessThan(6e-5);
  });

  it("a perfectly calibrated forecaster at n 487: raw sits at the noise floor, debiased well under the 0.05 floor", () => {
    // Averaged over seeds: raw sits at the noise expectation. The per-bin
    // correction clips at 0 one-sidedly, so it keeps a fraction of the noise
    // rather than none; what matters for the gate is that a model with NO
    // calibration error clears the floor with room, which the raw value does not.
    const draws = 40;
    const raw = meanOver(draws, (seed) => debiasedExpectedCalibrationError(perfectlyCalibrated(487, seed)).raw);
    const noise = meanOver(draws, (seed) => debiasedExpectedCalibrationError(perfectlyCalibrated(487, seed)).noise);
    const debiased = meanOver(draws, (seed) => debiasedExpectedCalibrationError(perfectlyCalibrated(487, seed)).debiased);
    expect(raw).toBeGreaterThan(0.03);
    expect(Math.abs(raw - noise)).toBeLessThan(0.01);
    expect(debiased).toBeLessThan(0.025);
  });

  it("a perfectly calibrated forecaster at the n floor of 100 clears 0.05 debiased, and cannot raw", () => {
    const draws = 40;
    const raw = meanOver(draws, (seed) => debiasedExpectedCalibrationError(perfectlyCalibrated(100, seed)).raw);
    const debiased = meanOver(draws, (seed) => debiasedExpectedCalibrationError(perfectlyCalibrated(100, seed)).debiased);
    expect(raw).toBeGreaterThan(0.07);
    expect(debiased).toBeLessThan(0.045);
  });

  it("a genuinely miscalibrated forecaster keeps its full gap after the correction", () => {
    // Forecasts 0.15 too high everywhere at large n: the correction must read
    // the gap, not the gap minus the noise.
    const r = debiasedExpectedCalibrationError(overconfidentBy(2000, 0.15, 99));
    expect(r.raw).toBeGreaterThan(0.12);
    expect(r.debiased).toBeGreaterThan(0.13);
    expect(Math.abs(r.debiased - r.raw)).toBeLessThan(0.02);
  });

  it("C-292 regression: a true 10-point gap at n 274 still reads as a 10-point gap, where raw minus noise would read about 4", () => {
    // This is the deployed-version case (v5.2.7, n 274 on 2026-09-09). The
    // first cut of C-290 subtracted the full null expectation from the raw
    // ECE; E|delta + eps| is not |delta| + E|eps|, so on a real gap that
    // over-corrects and can pass a forecaster that is 10 points off. The
    // per-bin variance correction does not.
    const draws = 40;
    const debiased = meanOver(draws, (seed) => debiasedExpectedCalibrationError(overconfidentBy(274, 0.1, seed)).debiased);
    const subtractive = meanOver(draws, (seed) => {
      const r = debiasedExpectedCalibrationError(overconfidentBy(274, 0.1, seed));
      return Math.max(0, r.raw - r.noise);
    });
    expect(debiased).toBeGreaterThan(0.08);
    expect(debiased).toBeLessThan(0.125);
    // The flaw, pinned so it cannot come back: the subtractive form reads the
    // same forecaster comfortably UNDER the floor.
    expect(subtractive).toBeLessThan(0.06);
  });

  it("the correction never exceeds the raw value and never goes negative", () => {
    for (const seed of [5, 6, 7]) {
      const r = debiasedExpectedCalibrationError(perfectlyCalibrated(30, seed));
      expect(r.debiased).toBeGreaterThanOrEqual(0);
      expect(r.debiased).toBeLessThanOrEqual(r.raw);
      expect(r.reliabilityNoise).toBeGreaterThan(0);
    }
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

describe("C-292: the deployed-version floor reads the same correction on the slice's own rows", () => {
  const pooledGreen = {
    n: 487,
    brier: 0.1907,
    ece: 0.0539,
    eceNoise: 0.041,
    eceDebiased: 0.02,
    mce: 0.31,
    murphy: { reliability: 0.006, resolution: 0.027, uncertainty: 0.212 },
    modelVersion: "mixed",
    dateRange: "2026-06-18…2026-09-09",
    generatedAt: "2026-09-09T12:23:04.304Z",
  };
  const input = {
    metrics: pooledGreen,
    canonicalSettled: 1000,
    minSettledForLearning: 100,
    settlementHealthy: true,
    consecutiveGreenPrior: 0,
    streakRequired: 3,
  };

  it("RED when the deployed version's DEBIASED ECE is over the floor, with raw and noise in the reason (the 2026-09-09 v5.2.7 case)", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.7", n: 274, ece: 0.1055, eceNoise: 0.055, eceDebiased: 0.09 },
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain(
      "Deployed v5.2.7 ECE debiased 0.0900 > 0.05 on its own rows (raw 0.1055, noise 0.0550)",
    );
  });

  it("passes the deployed check when the debiased slice value clears the floor even though the raw one does not", () => {
    // A fresh version at low n: raw ECE is mostly noise, and the C-275 floor
    // must not fail it for being new. n itself is still floored.
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.8", n: 120, ece: 0.085, eceNoise: 0.08, eceDebiased: 0.03 },
    });
    expect(r.runMeetsFloors).toBe(true);
    expect(r.deployedVersionChecked).toBe(true);
  });

  it("a slice without the correction (pre-C-292 artifact) is read raw, the stricter direction", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.8", n: 120, ece: 0.085 },
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain("Deployed v5.2.8 ECE 0.0850 > 0.05 on its own rows");
  });

  it("a null correction on the slice is treated exactly like an absent one", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.8", n: 120, ece: 0.03, eceNoise: null, eceDebiased: null },
    });
    expect(r.runMeetsFloors).toBe(true);
  });

  it("the correction can never clear the n floor for the deployed version", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.8", n: 40, ece: 0.2, eceNoise: 0.19, eceDebiased: 0.0 },
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain("Deployed v5.2.8 has 40 own settled rows < floor 100");
  });
});

describe("C-298: the deployed-version floor reads the slice's 5th-percentile bound when it has one", () => {
  const pooledGreen = {
    n: 344,
    brier: 0.19,
    ece: 0.0577,
    eceNoise: 0.041,
    eceDebiased: 0.0327,
    mce: 0.3,
    murphy: { reliability: 0.0077, resolution: 0.027, uncertainty: 0.235 },
    modelVersion: "mixed",
    dateRange: "2026-06-18…2026-09-09",
    generatedAt: "2026-09-09T13:20:00.000Z",
  };
  const input = {
    metrics: pooledGreen,
    canonicalSettled: 1000,
    minSettledForLearning: 100,
    settlementHealthy: true,
    consecutiveGreenPrior: 0,
    streakRequired: 3,
  };

  it("passes when the point estimate sits a hair over the floor but the bound is under it (v5.2.7 on clean pre-game rows, 2026-09-09)", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.7", n: 221, ece: 0.0933, eceNoise: 0.05, eceDebiased: 0.052, eceDebiasedCi90Lo: 0.031 },
    });
    expect(r.runMeetsFloors).toBe(true);
    expect(r.deployedVersion?.eceDebiasedCi90Lo).toBe(0.031);
  });

  it("fails when even the bound is over the floor, and the reason carries point estimate, bound, raw and noise", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.7", n: 274, ece: 0.1055, eceNoise: 0.05, eceDebiased: 0.09, eceDebiasedCi90Lo: 0.066 },
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain(
      "Deployed v5.2.7 ECE debiased 0.0900 with 5th-percentile bound 0.0660 > 0.05 on its own rows (raw 0.1055, noise 0.0500)",
    );
  });

  it("with no bound (fewer than 30 rows, or an older artifact) the point estimate is read, the stricter direction", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.8", n: 120, ece: 0.09, eceNoise: 0.05, eceDebiased: 0.052, eceDebiasedCi90Lo: null },
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain("Deployed v5.2.8 ECE debiased 0.0520 > 0.05 on its own rows");
  });

  it("the bound can never clear the n floor for the deployed version", () => {
    const r = evaluateCalibrationEligibility({
      ...input,
      deployedVersion: { key: "v5.2.8", n: 60, ece: 0.2, eceNoise: 0.1, eceDebiased: 0.1, eceDebiasedCi90Lo: 0.0 },
    });
    expect(r.runMeetsFloors).toBe(false);
    expect(r.reasons.join(" ")).toContain("Deployed v5.2.8 has 60 own settled rows < floor 100");
  });
});
