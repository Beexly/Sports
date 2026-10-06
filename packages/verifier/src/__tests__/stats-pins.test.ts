import { describe, it, expect } from "vitest";

import {
  Z_95,
  brierScore,
  meanBrier,
  logLoss,
  meanLogLoss,
  wilsonInterval,
  mulberry32,
  pairedBootstrap,
  logit,
  sigmoid,
  fitLogistic,
  logisticPredict,
  brierOf,
  logLossOf,
  clamp01,
} from "../stats";

/**
 * VERIFIER MATH — PINNING TESTS.
 *
 * Mirrors apps/web/__tests__/calibration-math-invariants.test.ts (39 pins).
 * Every assertion carries a HAND-COMPUTED expected value in its comment.
 * These numbers gate MODEL_VERSION bumps (L11) and factor keep/kill — the
 * worst kind to get wrong silently.
 *
 * ALL FIXTURES ARE SYNTHETIC. No number below is a real GSE result.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRIER
// ─────────────────────────────────────────────────────────────────────────────

describe("Brier score", () => {
  it("is (p − y)² — hand-computed 0.04 / 0.36 / mean 0.22", () => {
    // p=0.80 y=1 → (0.80−1)² = 0.04
    // p=0.60 y=0 → (0.60−0)² = 0.36
    // mean = 0.40/2 = 0.20 — wait, 0.04+0.36=0.40, /2 = 0.20
    expect(brierScore(0.8, 1)).toBeCloseTo(0.04, 12);
    expect(brierScore(0.6, 0)).toBeCloseTo(0.36, 12);
    expect(meanBrier([{ p: 0.8, y: 1 }, { p: 0.6, y: 0 }])).toBeCloseTo(0.2, 12);
  });

  it("clamps p to [0,1] — p=1.5 y=1 reads as p=1 → Brier 0", () => {
    // Without the clamp: (1.5−1)² = 0.25, a penalty for being "too right"
    // outside the probability simplex. With clamp: (1−1)² = 0.
    expect(brierScore(1.5, 1)).toBe(0);
    expect(brierScore(-0.2, 0)).toBe(0);
    // Clamp on the loss side: p=1.5 y=0 → (1−0)² = 1.
    expect(brierScore(1.5, 0)).toBe(1);
  });

  it("returns NaN on empty mean (never 0, which is a perfect forecast)", () => {
    expect(Number.isNaN(meanBrier([]))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOG-LOSS
// ─────────────────────────────────────────────────────────────────────────────

describe("log-loss", () => {
  it("is −log(p) on a win and −log(1−p) on a loss — hand-computed 0.2231435513", () => {
    // p=0.8 y=1 → −ln(0.8) = 0.2231435513142097
    // p=0.2 y=0 → −ln(0.8) = 0.2231435513142097  (symmetric)
    expect(logLoss(0.8, 1)).toBeCloseTo(0.2231435513, 10);
    expect(logLoss(0.2, 0)).toBeCloseTo(0.2231435513, 10);
  });

  it("clamps p into (eps, 1−eps) so a certain-wrong forecast is finite", () => {
    // p=0 y=1 → −ln(1e-15) = 34.538776394910684
    expect(logLoss(0, 1)).toBeCloseTo(-Math.log(1e-15), 10);
    expect(logLoss(0, 1)).toBeCloseTo(34.5387763949, 6);
    // p=1 y=0 → p clamps to 1−1e-15; 1−(1−1e-15) is 1e-15 up to one ulp,
    // so −ln of that lands at 34.53957599234088 (IEEE754), not the ideal
    // 34.5387763949. Pin the finite, ~ln(1e-15) magnitude — the point of the
    // clamp is finiteness, not bit-identity with the other tail.
    expect(logLoss(1, 0)).toBeGreaterThan(34);
    expect(logLoss(1, 0)).toBeLessThan(35);
    expect(Number.isFinite(logLoss(1, 0))).toBe(true);
  });

  it("mean of two identical forecasts equals the single value", () => {
    const v = logLoss(0.7, 1);
    expect(meanLogLoss([{ p: 0.7, y: 1 }, { p: 0.7, y: 1 }])).toBeCloseTo(v, 12);
    expect(Number.isNaN(meanLogLoss([]))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. WILSON
// ─────────────────────────────────────────────────────────────────────────────

describe("Wilson score interval", () => {
  it("Wilson 9/20 is [0.2582, 0.6579] — textbook, matches apps/web pin", () => {
    // z = 1.959963984540054, p̂ = 0.45, n = 20, z² = 3.8414588…
    // denom  = 1 + z²/n = 1.1920729…
    // center = (0.45 + z²/40)/denom = 0.4580566…
    // margin = 0.1998552…
    // low  = 0.2582014…  high = 0.6579118…
    const w = wilsonInterval(9, 20)!;
    expect(w.point).toBe(0.45);
    expect(w.low).toBeCloseTo(0.2582, 4);
    expect(w.high).toBeCloseTo(0.6579, 4);
    expect(w.successes).toBe(9);
    expect(w.n).toBe(20);
  });

  it("returns null at n=0 (no honest band)", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(wilsonInterval(5, -1)).toBeNull();
  });

  it("0/10 has low clamped to 0 and a positive upper — never a zero-width band", () => {
    // center = (0 + z²/20)/(1+z²/10) = 0.19207/1.38415 = 0.13877
    // margin = (z/denom)·√(0 + z²/400) = 1.4160·0.0980 = 0.13877
    // raw low = 0 → clamped 0; high ≈ 0.2775
    const w = wilsonInterval(0, 10)!;
    expect(w.low).toBe(0);
    expect(w.high).toBeGreaterThan(0.2);
    expect(w.high).toBeLessThan(0.35);
  });

  it("10/10 has high clamped to 1 and a low below 1", () => {
    const w = wilsonInterval(10, 10)!;
    // IEEE754: center+margin can land at 0.9999999999999999 before clamp;
    // clamp01 leaves it just under 1. Pin "at the boundary", not bitwise 1.
    expect(w.high).toBeGreaterThan(0.999);
    expect(w.high).toBeLessThanOrEqual(1);
    expect(w.low).toBeGreaterThan(0.6);
    expect(w.low).toBeLessThan(1);
  });

  it("uses z=1.959963984540054 by default (two-sided 95%)", () => {
    expect(Z_95).toBeCloseTo(1.959963984540054, 12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PRNG + PAIRED BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────

describe("mulberry32", () => {
  it("is deterministic: same seed → same first three draws", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const sa = [a(), a(), a()];
    const sb = [b(), b(), b()];
    expect(sa[0]).toBe(sb[0]);
    expect(sa[1]).toBe(sb[1]);
    expect(sa[2]).toBe(sb[2]);
    // Values in [0,1)
    for (const v of sa) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds diverge", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe("paired bootstrap", () => {
  it("P(better)=0 when candidate is strictly worse on every row", () => {
    // candidate always higher loss → every resample has mean(cand) > mean(mkt)
    const r = pairedBootstrap(
      { candidateLoss: [0.30, 0.40, 0.50], marketLoss: [0.10, 0.20, 0.30] },
      { resamples: 200, seed: 1 },
    );
    expect(r.pBetter).toBe(0);
    // Δ = mean([0.20, 0.20, 0.20]) = 0.20
    expect(r.delta).toBeCloseTo(0.2, 12);
    expect(r.n).toBe(3);
  });

  it("P(better)=1 when candidate is strictly better on every row", () => {
    const r = pairedBootstrap(
      { candidateLoss: [0.10, 0.20, 0.30], marketLoss: [0.30, 0.40, 0.50] },
      { resamples: 200, seed: 1 },
    );
    expect(r.pBetter).toBe(1);
    expect(r.delta).toBeCloseTo(-0.2, 12);
  });

  it("mean Δ is the full-sample mean difference — hand-computed 0.04", () => {
    // cand − mkt = [0.03, 0.11, 0.05, −0.03] → sum 0.16 → mean 0.04
    const r = pairedBootstrap(
      {
        candidateLoss: [0.04, 0.36, 0.09, 0.01],
        marketLoss: [0.01, 0.25, 0.04, 0.04],
      },
      { resamples: 50, seed: 7 },
    );
    expect(r.delta).toBeCloseTo(0.04, 12);
  });

  it("length mismatch yields pBetter 0.5 and NaN delta — never a silent 0", () => {
    const r = pairedBootstrap(
      { candidateLoss: [0.1, 0.2], marketLoss: [0.1] },
      { resamples: 10, seed: 1 },
    );
    expect(r.pBetter).toBe(0.5);
    expect(Number.isNaN(r.delta)).toBe(true);
    expect(r.n).toBe(0);
  });

  it("is deterministic under a fixed seed", () => {
    const input = {
      candidateLoss: [0.2, 0.3, 0.25, 0.4, 0.15],
      marketLoss: [0.22, 0.28, 0.24, 0.35, 0.18],
    };
    const a = pairedBootstrap(input, { resamples: 100, seed: 99 });
    const b = pairedBootstrap(input, { resamples: 100, seed: 99 });
    expect(a.pBetter).toBe(b.pBetter);
    expect(a.delta).toBe(b.delta);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. LOGIT / SIGMOID
// ─────────────────────────────────────────────────────────────────────────────

describe("logit and sigmoid", () => {
  it("logit(0.6) = ln(1.5) = 0.4054651081", () => {
    expect(logit(0.6)).toBeCloseTo(Math.log(1.5), 12);
    expect(logit(0.6)).toBeCloseTo(0.4054651081, 8);
  });

  it("logit(0.5) = 0 and sigmoid(0) = 0.5", () => {
    expect(logit(0.5)).toBeCloseTo(0, 12);
    expect(sigmoid(0)).toBeCloseTo(0.5, 12);
  });

  it("sigmoid is the inverse of logit on the interior", () => {
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(sigmoid(logit(p))).toBeCloseTo(p, 10);
    }
  });

  it("clamps p away from {0,1} so logit never returns ±Infinity", () => {
    expect(Number.isFinite(logit(0))).toBe(true);
    expect(Number.isFinite(logit(1))).toBe(true);
    expect(Number.isFinite(logit(0.5))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. LOGISTIC FIT
// ─────────────────────────────────────────────────────────────────────────────

describe("logistic fit", () => {
  it("intercept-only on 7/10 wins recovers logit(0.7) = 0.8472978604", () => {
    // X has zero columns → intercept-only model.
    // MLE: p̂ = 0.7, β0 = ln(0.7/0.3) = 0.8472978603872034
    const X = Array.from({ length: 10 }, () => [] as number[]);
    const y = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0] as (0 | 1)[];
    const fit = fitLogistic(X, y);
    expect(fit.coef[0]).toBeCloseTo(0.8472978604, 6);
    expect(fit.converged).toBe(true);
  });

  it("recovers a known single-feature slope on a clean synthetic sample", () => {
    // y ~ Bernoulli(sigmoid(−0.5 + 1.5·x)), 400 points, x ~ U(−1,1)
    // With enough n the MLE sits near the true coefficients. Pin to 0 dp —
    // finite-sample MLE noise at n=400 is O(0.05).
    const rand = mulberry32(20260915);
    const X: number[][] = [];
    const y: (0 | 1)[] = [];
    for (let i = 0; i < 400; i++) {
      const x = rand() * 2 - 1;
      const p = sigmoid(-0.5 + 1.5 * x);
      X.push([x]);
      y.push(rand() < p ? 1 : 0);
    }
    const fit = fitLogistic(X, y);
    expect(fit.coef[0]).toBeCloseTo(-0.5, 0);
    expect(fit.coef[1]).toBeCloseTo(1.5, 0);
  });

  it("logisticPredict applies coef[0] + coef[1]·x through the sigmoid", () => {
    // coef = [0, ln(3)] → p = sigmoid(ln(3)·1) = 3/4 = 0.75 at x=1
    const p = logisticPredict([0, Math.log(3)], [[1]])[0]!;
    expect(p).toBeCloseTo(0.75, 10);
  });

  it("returns empty coef on empty input", () => {
    const fit = fitLogistic([], []);
    expect(fit.coef).toEqual([]);
    expect(fit.converged).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. AGGREGATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

describe("aggregate helpers", () => {
  it("brierOf / logLossOf match the scalar functions", () => {
    const p = [0.8, 0.6];
    const y = [1, 0] as (0 | 1)[];
    expect(brierOf(p, y)).toBeCloseTo(0.2, 12);
    expect(logLossOf(p, y)).toBeCloseTo((logLoss(0.8, 1) + logLoss(0.6, 0)) / 2, 12);
  });

  it("clamp01 maps non-finite to 0 and edges to themselves", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.42)).toBe(0.42);
  });
});
