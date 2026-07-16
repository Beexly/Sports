import { describe, expect, it } from "vitest";
import {
  clvDeflator,
  fractionalKellyStake,
  jamesSteinShrink,
  ledoitWolfShrinkCovariance,
  portfolioKellyStakes,
} from "../kelly.js";

describe("fractionalKellyStake", () => {
  it("matches the known Kelly value: p=0.55, d=2.0 -> f*=0.10, lambda=0.3 -> 0.03", () => {
    // Full Kelly: f* = (0.55*2 - 1) / (2 - 1) = 0.10. Scaled by lambda=0.3 -> 0.03.
    expect(fractionalKellyStake(0.55, 2.0, 0.3)).toBeCloseTo(0.03, 10);
  });

  it("floors at 0 for a negative edge (never bets against itself)", () => {
    // f* = (0.4*2 - 1) / (2 - 1) = -0.2 -> floored at 0, not a negative stake.
    expect(fractionalKellyStake(0.4, 2.0, 0.3)).toBe(0);
  });

  it("uses the default lambda (0.3) when not supplied", () => {
    expect(fractionalKellyStake(0.55, 2.0)).toBeCloseTo(0.03, 10);
  });

  it("never exceeds lambda itself, even at the theoretical edge of p -> 1", () => {
    const stake = fractionalKellyStake(0.999999, 2.0, 0.3);
    expect(stake).toBeLessThanOrEqual(0.3);
  });

  it("guards p outside the open interval (0, 1)", () => {
    expect(() => fractionalKellyStake(0, 2.0)).toThrow(RangeError);
    expect(() => fractionalKellyStake(1, 2.0)).toThrow(RangeError);
    expect(() => fractionalKellyStake(-0.1, 2.0)).toThrow(RangeError);
    expect(() => fractionalKellyStake(1.1, 2.0)).toThrow(RangeError);
  });

  it("guards decimalOdds <= 1 or non-finite", () => {
    expect(() => fractionalKellyStake(0.55, 1)).toThrow(RangeError);
    expect(() => fractionalKellyStake(0.55, 0.5)).toThrow(RangeError);
    expect(() => fractionalKellyStake(0.55, Infinity)).toThrow(RangeError);
  });

  it("guards lambda <= 0", () => {
    expect(() => fractionalKellyStake(0.55, 2.0, 0)).toThrow(RangeError);
    expect(() => fractionalKellyStake(0.55, 2.0, -0.1)).toThrow(RangeError);
  });
});

describe("jamesSteinShrink", () => {
  it("fully shrinks to 0 for k=1 (too few plays to estimate a shared noise level)", () => {
    const shrunk = jamesSteinShrink([0.05], [0.02]);
    expect(shrunk).toHaveLength(1);
    expect(shrunk[0]).toBeCloseTo(0, 10);
  });

  it("fully shrinks to 0 for k=2", () => {
    const shrunk = jamesSteinShrink([0.05, 0.03], [0.02, 0.01]);
    for (const e of shrunk) expect(e).toBeCloseTo(0, 10);
  });

  it("barely shrinks large, clean (low-se) edges", () => {
    const edges = [0.3, 0.28, 0.32, 0.29, 0.31];
    const se = [0.01, 0.01, 0.01, 0.01, 0.01];
    const shrunk = jamesSteinShrink(edges, se);
    shrunk.forEach((s, i) => {
      // c should be close to 1 here: the ratio of each shrunk edge to its raw
      // edge should be > 0.95 (barely shrunk), not collapsed toward 0.
      expect(s / edges[i]!).toBeGreaterThan(0.95);
    });
  });

  it("heavily shrinks noisy, small edges (the skeptical prior wins)", () => {
    const edges = [0.01, -0.005, 0.008, -0.002, 0.003];
    const se = [0.05, 0.05, 0.05, 0.05, 0.05];
    const shrunk = jamesSteinShrink(edges, se);
    // Noise dominates signal here (mean(se^2) >> mean(edge^2)/... ), so the
    // positive-part shrinkage factor collapses to 0 and every edge is zeroed.
    for (const s of shrunk) expect(s).toBeCloseTo(0, 10);
  });

  it("returns 0 for an all-zero edge slate rather than NaN/Infinity", () => {
    const shrunk = jamesSteinShrink([0, 0, 0, 0], [0.01, 0.01, 0.01, 0.01]);
    for (const s of shrunk) {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeCloseTo(0, 10);
    }
  });

  it("guards mismatched edges/se lengths", () => {
    expect(() => jamesSteinShrink([0.1, 0.2], [0.05])).toThrow(RangeError);
  });
});

describe("ledoitWolfShrinkCovariance", () => {
  const KNOWN_2ASSET = [
    [1, -1, 2, -2],
    [0.5, -0.4, 3, 1],
  ] as const;

  it("returns a symmetric covariance matrix with delta in [0, 1] on a known 2-asset case", () => {
    const { cov, delta } = ledoitWolfShrinkCovariance(KNOWN_2ASSET);
    expect(cov).toHaveLength(2);
    expect(cov[0]).toHaveLength(2);
    expect(cov[0]![1]).toBeCloseTo(cov[1]![0]!, 10);
    expect(delta).toBeGreaterThanOrEqual(0);
    expect(delta).toBeLessThanOrEqual(1);
  });

  it("pulls delta near 1 on this small, noisy 2-asset fixture and keeps the diagonal preserved-ish", () => {
    const { cov, delta } = ledoitWolfShrinkCovariance(KNOWN_2ASSET);
    // This fixture's estimation noise (piHat) dominates its target-mismatch
    // (gammaHat), pulling shrinkage well above the halfway point toward the
    // identity-like target.
    expect(delta).toBeGreaterThan(0.5);

    // "Diagonal preserved-ish": each shrunk diagonal entry is a convex
    // combination of the sample variance and mu, so it must land strictly
    // between them (or equal one, at the degenerate delta=0/1 extremes) —
    // never pulled outside that range. Recompute the raw sample covariance
    // independently to bound against it.
    const n = KNOWN_2ASSET[0].length;
    const means = KNOWN_2ASSET.map((series) => series.reduce((s, v) => s + v, 0) / n);
    const demeaned = KNOWN_2ASSET.map((series, i) => series.map((v) => v - means[i]!));
    const sampleDiag = [0, 1].map((i) => {
      let s = 0;
      for (let t = 0; t < n; t++) s += demeaned[i]![t]! * demeaned[i]![t]!;
      return s / n;
    });
    const sampleMu = (sampleDiag[0]! + sampleDiag[1]!) / 2;

    for (let i = 0; i < 2; i++) {
      const lo = Math.min(sampleDiag[i]!, sampleMu);
      const hi = Math.max(sampleDiag[i]!, sampleMu);
      expect(cov[i]![i]!).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(cov[i]![i]!).toBeLessThanOrEqual(hi + 1e-9);
    }
  });

  it("shrinks the offdiagonal of a perfectly correlated series toward 0, below the sample covariance", () => {
    const x1 = [0.01, -0.02, 0.03, -0.015, 0.02, -0.01, 0.005, -0.008];
    const x2 = x1.map((v) => 2 * v); // perfectly correlated (deterministic linear relation)
    const { cov, delta } = ledoitWolfShrinkCovariance([x1, x2]);

    const n = x1.length;
    const m1 = x1.reduce((s, v) => s + v, 0) / n;
    const m2 = x2.reduce((s, v) => s + v, 0) / n;
    let sampleOffdiag = 0;
    for (let t = 0; t < n; t++) sampleOffdiag += (x1[t]! - m1) * (x2[t]! - m2);
    sampleOffdiag /= n;

    expect(delta).toBeGreaterThan(0);
    expect(Math.abs(cov[0]![1]!)).toBeLessThan(Math.abs(sampleOffdiag));
    // Sign (positive correlation) is preserved, just shrunk in magnitude.
    expect(Math.sign(cov[0]![1]!)).toBe(Math.sign(sampleOffdiag));
  });

  it("guards N=0 (no asset series)", () => {
    expect(() => ledoitWolfShrinkCovariance([])).toThrow(RangeError);
  });

  it("guards n < 2 observations", () => {
    expect(() => ledoitWolfShrinkCovariance([[1], [2]])).toThrow(RangeError);
  });

  it("guards unaligned (differing-length) series", () => {
    expect(() => ledoitWolfShrinkCovariance([[1, 2, 3], [1, 2]])).toThrow(RangeError);
  });
});

describe("clvDeflator", () => {
  it("returns 0 when rhoClv is null (no measurement yet)", () => {
    expect(clvDeflator(null, 100)).toBe(0);
  });

  it("returns 0 when settledCount is below the floor (default 50)", () => {
    expect(clvDeflator(0.6, 10)).toBe(0);
  });

  it("returns rhoClv clamped when settledCount clears the floor", () => {
    expect(clvDeflator(0.6, 100)).toBeCloseTo(0.6, 10);
  });

  it("clamps rhoClv above 1 down to 1", () => {
    expect(clvDeflator(1.2, 100)).toBe(1);
  });

  it("clamps negative rhoClv up to 0", () => {
    expect(clvDeflator(-0.3, 100)).toBe(0);
  });

  it("respects a custom minSettled floor", () => {
    expect(clvDeflator(0.6, 60, 100)).toBe(0);
    expect(clvDeflator(0.6, 150, 100)).toBeCloseTo(0.6, 10);
  });

  it("treats NaN the same as null (self-disarm, not NaN propagation)", () => {
    expect(clvDeflator(NaN, 100)).toBe(0);
  });
});

describe("portfolioKellyStakes", () => {
  it("self-disarm pin: a 0 deflator zeroes every stake exactly", () => {
    const result = portfolioKellyStakes({
      edges: [0.1, 0.08, 0.05],
      se: [0.02, 0.02, 0.02],
      decimalOdds: [2.0, 1.9, 2.2],
      probs: [0.55, 0.56, 0.5],
      rhoClv: null, // no CLV measurement yet -> deflator must be 0
      settledCount: 10,
    });
    expect(result.diagnostics.deflator).toBe(0);
    for (const s of result.stakes) expect(s).toBe(0);
  });

  it("also self-disarms below the settled-count floor even with a strong rhoClv", () => {
    const result = portfolioKellyStakes({
      edges: [0.1, 0.08, 0.05],
      se: [0.02, 0.02, 0.02],
      decimalOdds: [2.0, 1.9, 2.2],
      probs: [0.55, 0.56, 0.5],
      rhoClv: 0.9,
      settledCount: 5,
    });
    expect(result.diagnostics.deflator).toBe(0);
    for (const s of result.stakes) expect(s).toBe(0);
  });

  it("pins the total-stake cap: rescales proportionally when sum > lambda*2", () => {
    const result = portfolioKellyStakes({
      edges: [0.2, 0.2, 0.2],
      se: [0, 0, 0], // se=0 -> no James-Stein shrinkage, c=1
      decimalOdds: [3, 3, 3],
      probs: [0.9, 0.9, 0.9],
      rhoClv: 1,
      settledCount: 100,
    });
    const lambda = 0.3; // default
    const cap = lambda * 2;
    const sum = result.stakes.reduce((s, x) => s + x, 0);
    expect(sum).toBeCloseTo(cap, 8);
    // Equal inputs -> equal (rescaled) stakes.
    expect(result.stakes[0]).toBeCloseTo(result.stakes[1]!, 10);
    expect(result.stakes[1]).toBeCloseTo(result.stakes[2]!, 10);
    expect(result.stakes[0]).toBeCloseTo(0.2, 8);
    expect(result.diagnostics.deflator).toBe(1);
  });

  it("does not rescale when the total is already under the cap", () => {
    const result = portfolioKellyStakes({
      edges: [0.05],
      se: [0.01],
      decimalOdds: [2.0],
      probs: [0.52],
      rhoClv: 0.8,
      settledCount: 100,
    });
    const sum = result.stakes.reduce((s, x) => s + x, 0);
    expect(sum).toBeLessThan(0.6);
  });

  it("applies the correlation penalty and surfaces lwDelta when returnsHistory is given", () => {
    // k=3 with se=0 keeps James-Stein shrinkage neutral (c=1, no haircut) so
    // this test isolates the correlation-penalty step. (k<=2 always fully
    // shrinks edges to 0 per jamesSteinShrink's spec, which would zero every
    // stake before the correlation penalty ever ran.)
    const base = {
      edges: [0.1, 0.1, 0.1],
      se: [0, 0, 0],
      decimalOdds: [2.0, 2.0, 2.0],
      probs: [0.55, 0.55, 0.55],
      rhoClv: 1,
      settledCount: 100,
    } as const;

    const result = portfolioKellyStakes({
      ...base,
      returnsHistory: [
        [0.01, -0.02, 0.03, -0.015, 0.02],
        [0.012, -0.018, 0.028, -0.017, 0.019], // highly correlated with the first
        [-0.02, 0.01, -0.03, 0.02, -0.01], // roughly anti-correlated with the first two
      ],
    });
    expect(result.diagnostics.lwDelta).not.toBeNull();
    expect(result.diagnostics.lwDelta!).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.lwDelta!).toBeLessThanOrEqual(1);

    // Correlated plays should each be discounted below their uncorrelated
    // per-play Kelly stake.
    const uncorrelated = portfolioKellyStakes(base);
    expect(result.stakes[0]!).toBeLessThan(uncorrelated.stakes[0]!);
    expect(result.stakes[0]!).toBeGreaterThan(0);
  });

  it("lwDelta stays null when returnsHistory is omitted", () => {
    const result = portfolioKellyStakes({
      edges: [0.05],
      se: [0.01],
      decimalOdds: [2.0],
      probs: [0.52],
      rhoClv: 0.8,
      settledCount: 100,
    });
    expect(result.diagnostics.lwDelta).toBeNull();
  });

  it("guards mismatched array lengths", () => {
    expect(() =>
      portfolioKellyStakes({
        edges: [0.1, 0.1],
        se: [0.01],
        decimalOdds: [2.0, 2.0],
        probs: [0.55, 0.55],
        rhoClv: null,
        settledCount: 0,
      }),
    ).toThrow(RangeError);
  });

  it("guards a returnsHistory that doesn't have one series per play", () => {
    expect(() =>
      portfolioKellyStakes({
        edges: [0.1, 0.1],
        se: [0.01, 0.01],
        decimalOdds: [2.0, 2.0],
        probs: [0.55, 0.55],
        returnsHistory: [[0.01, -0.02, 0.03]],
        rhoClv: 1,
        settledCount: 100,
      }),
    ).toThrow(RangeError);
  });
});
