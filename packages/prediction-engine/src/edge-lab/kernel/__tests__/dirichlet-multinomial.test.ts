import { describe, it, expect } from "vitest";

import { KernelError, makeRng, type Rng } from "../contract.js";
import { digamma, logBeta, logChoose } from "../numeric.js";
import {
  fitDirichletMultinomial,
  sampleDirichletMultinomial,
} from "../slots/dirichlet-multinomial.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function expectKernelError(fn: () => unknown, code: string): void {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeInstanceOf(KernelError);
  expect((thrown as KernelError).code).toBe(code);
}

function sum(values: readonly number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

function drawMany(
  alpha: readonly number[],
  trials: number,
  draws: number,
  seed: number,
): number[][] {
  const rng = makeRng(seed);
  const out: number[][] = new Array<number[]>(draws);
  for (let i = 0; i < draws; i += 1) {
    out[i] = [...sampleDirichletMultinomial({ alpha, trials }, rng).counts];
  }
  return out;
}

/**
 * Closed-form Dirichlet-multinomial moments, written out independently of the
 * implementation:
 *   E[X_k]       = n·p_k
 *   Var(X_k)     = n·p_k(1 − p_k)·(n + A)/(1 + A)
 *   Cov(X_i,X_j) = −n·p_i·p_j·(n + A)/(1 + A)
 */
function dmMoments(
  alpha: readonly number[],
  trials: number,
): {
  readonly mean: readonly number[];
  readonly variance: readonly number[];
  readonly covariance: (i: number, j: number) => number;
} {
  const a = sum(alpha);
  const share = alpha.map((v) => v / a);
  const factor = (trials + a) / (1 + a);
  return {
    mean: share.map((p) => trials * p),
    variance: share.map((p) => trials * p * (1 - p) * factor),
    covariance: (i: number, j: number) =>
      -trials * (share[i] as number) * (share[j] as number) * factor,
  };
}

/** Exact Beta-Binomial pmf: C(n,k)·B(k+α, n−k+β)/B(α,β). */
function betaBinomialPmf(n: number, k: number, alpha: number, beta: number): number {
  return Math.exp(logChoose(n, k) + logBeta(k + alpha, n - k + beta) - logBeta(alpha, beta));
}

/**
 * Minka's fixed-point ratio for one category, recomputed here straight from
 * `digamma`. At an interior MLE the ratio is exactly 1 for every category, so
 * this is an INDEPENDENT stationarity check on whatever the fit returns rather
 * than a re-run of the implementation.
 */
function minkaRatio(
  countRows: readonly (readonly number[])[],
  alpha: readonly number[],
  category: number,
): number {
  const a = sum(alpha);
  const psiA = digamma(a);
  const psiK = digamma(alpha[category] as number);
  let numerator = 0;
  let denominator = 0;
  for (const row of countRows) {
    const n = row[category] as number;
    if (n > 0) numerator += digamma(n + (alpha[category] as number)) - psiK;
    const total = sum(row);
    if (total > 0) denominator += digamma(total + a) - psiA;
  }
  return numerator / denominator;
}

/** Population (1/n) covariance of two columns of a draw matrix. */
function empiricalCovariance(rows: readonly (readonly number[])[], i: number, j: number): number {
  const n = rows.length;
  let mi = 0;
  let mj = 0;
  for (const r of rows) {
    mi += r[i] as number;
    mj += r[j] as number;
  }
  mi /= n;
  mj /= n;
  let acc = 0;
  for (const r of rows) acc += ((r[i] as number) - mi) * ((r[j] as number) - mj);
  return acc / n;
}

function columnMean(rows: readonly (readonly number[])[], k: number): number {
  let acc = 0;
  for (const r of rows) acc += r[k] as number;
  return acc / rows.length;
}

/** The floor the slot documents for a never-observed category. */
const ALPHA_FLOOR = 1e-9;

// ─────────────────────────────────────────────────────────────────────────────
// sample — THE hard invariant: counts sum EXACTLY to trials
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — counts sum EXACTLY to trials", () => {
  const alphaSets: readonly (readonly number[])[] = [
    [1, 1],
    [5],
    [0.1, 0.5, 3],
    [2, 3, 5],
    [1e-6, 1, 100],
    [1e-9, 1e-9, 1e-9],
    [2, 2, 2, 2, 2, 2, 2, 2],
    [1e5, 1e5],
    [1e8, 1e-8],
    [0.01, 0.01, 0.01, 0.01],
    [0.5, 1, 1.5, 2, 2.5, 3],
  ];
  const trialSets: readonly number[] = [0, 1, 2, 7, 50, 997];

  it("holds for every parameter set × trial count × seed", () => {
    for (const alpha of alphaSets) {
      for (const trials of trialSets) {
        for (let seed = 1; seed <= 25; seed += 1) {
          const rng = makeRng(seed * 7919 + trials);
          const { counts } = sampleDirichletMultinomial({ alpha, trials }, rng);
          expect(counts.length).toBe(alpha.length);
          // Strict integer equality — never `toBeCloseTo`. This is the invariant.
          expect(sum(counts)).toBe(trials);
          for (const c of counts) {
            expect(Number.isInteger(c)).toBe(true);
            expect(c).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("holds across thousands of draws sharing one rng stream", () => {
    const rng = makeRng(4242);
    for (let i = 0; i < 3000; i += 1) {
      const trials = i % 37;
      const { counts } = sampleDirichletMultinomial({ alpha: [0.3, 1.7, 9], trials }, rng);
      expect(sum(counts)).toBe(trials);
    }
  });

  it("holds for a very large trial count", () => {
    const { counts } = sampleDirichletMultinomial(
      { alpha: [1, 2, 3], trials: 200000 },
      makeRng(5),
    );
    expect(sum(counts)).toBe(200000);
  });

  it("holds under a degenerate but in-contract rng that always returns 0", () => {
    const zeroRng: Rng = () => 0;
    const { counts } = sampleDirichletMultinomial({ alpha: [2, 3, 0.5], trials: 11 }, zeroRng);
    expect(sum(counts)).toBe(11);
  });

  it("returns all zeros for trials = 0", () => {
    const { counts } = sampleDirichletMultinomial({ alpha: [1, 2, 3], trials: 0 }, makeRng(1));
    expect([...counts]).toEqual([0, 0, 0]);
    expect(sum(counts)).toBe(0);
  });

  it("consumes no randomness when trials = 0", () => {
    let calls = 0;
    const counting: Rng = () => {
      calls += 1;
      return 0.5;
    };
    sampleDirichletMultinomial({ alpha: [1, 2, 3], trials: 0 }, counting);
    expect(calls).toBe(0);
  });

  it("puts every trial in the single category when K = 1", () => {
    const { counts } = sampleDirichletMultinomial({ alpha: [0.25], trials: 13 }, makeRng(9));
    expect([...counts]).toEqual([13]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample — determinism
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — determinism", () => {
  it("reproduces an identical draw from the same seed", () => {
    const params = { alpha: [1.5, 0.4, 7, 0.02], trials: 60 };
    const a = sampleDirichletMultinomial(params, makeRng(20260825));
    const b = sampleDirichletMultinomial(params, makeRng(20260825));
    expect([...a.counts]).toEqual([...b.counts]);
  });

  it("reproduces an identical 200-draw sequence from the same seed", () => {
    const run = (): number[][] => {
      const rng = makeRng(77);
      const out: number[][] = [];
      for (let i = 0; i < 200; i += 1) {
        out.push([...sampleDirichletMultinomial({ alpha: [2, 3, 5], trials: 25 }, rng).counts]);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it("produces a different draw from a different seed", () => {
    const params = { alpha: [1, 1, 1, 1], trials: 200 };
    const a = [...sampleDirichletMultinomial(params, makeRng(1)).counts];
    const b = [...sampleDirichletMultinomial(params, makeRng(2)).counts];
    expect(a).not.toEqual(b);
  });

  it("uses only the injected rng (a constant source gives a repeatable draw)", () => {
    const constantRng: Rng = () => 0.5;
    const first = [
      ...sampleDirichletMultinomial({ alpha: [1, 2, 3], trials: 30 }, constantRng).counts,
    ];
    const second = [
      ...sampleDirichletMultinomial({ alpha: [1, 2, 3], trials: 30 }, constantRng).counts,
    ];
    expect(first).toEqual(second);
    expect(sum(first)).toBe(30);
  });

  it("does not mutate the supplied alpha", () => {
    const alpha = [1, 2, 3];
    const snapshot = [...alpha];
    sampleDirichletMultinomial({ alpha, trials: 40 }, makeRng(3));
    expect(alpha).toEqual(snapshot);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample — closed-form moments
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — matches the closed-form moments", () => {
  it("gives every category an equal expected share under a symmetric alpha", () => {
    const trials = 40;
    const alpha = [2, 2, 2, 2];
    const draws = 20000;
    const rows = drawMany(alpha, trials, draws, 24680);
    const moments = dmMoments(alpha, trials);
    const expected = trials / alpha.length; // exactly 10
    for (let k = 0; k < alpha.length; k += 1) {
      // Band from the CLOSED-FORM variance, not an arbitrary digit count:
      // 4 standard errors of the mean of `draws` draws.
      const standardError = Math.sqrt((moments.variance[k] as number) / draws);
      expect(moments.mean[k] as number).toBeCloseTo(expected, 12);
      expect(Math.abs(columnMean(rows, k) - expected)).toBeLessThan(4 * standardError);
    }
  });

  it("reproduces the closed-form mean and variance", () => {
    const alpha = [1, 1, 1];
    const trials = 20;
    const rows = drawMany(alpha, trials, 20000, 13579);
    const moments = dmMoments(alpha, trials);
    // Closed form: 20·(1/3)·(2/3)·(20+3)/(1+3) = 25.5555…
    expect(moments.variance[0] as number).toBeCloseTo(25.5555555, 5);
    for (let k = 0; k < alpha.length; k += 1) {
      const standardError = Math.sqrt((moments.variance[k] as number) / 20000);
      expect(Math.abs(columnMean(rows, k) - (moments.mean[k] as number))).toBeLessThan(
        4 * standardError,
      );
      const ratio = empiricalCovariance(rows, k, k) / (moments.variance[k] as number);
      expect(ratio).toBeGreaterThan(0.92);
      expect(ratio).toBeLessThan(1.08);
    }
  });

  it("reproduces the closed-form moments for an asymmetric alpha", () => {
    const alpha = [4, 2, 1, 0.5];
    const trials = 30;
    const rows = drawMany(alpha, trials, 20000, 90210);
    const moments = dmMoments(alpha, trials);
    for (let k = 0; k < alpha.length; k += 1) {
      const standardError = Math.sqrt((moments.variance[k] as number) / 20000);
      expect(Math.abs(columnMean(rows, k) - (moments.mean[k] as number))).toBeLessThan(
        4 * standardError,
      );
      const ratio = empiricalCovariance(rows, k, k) / (moments.variance[k] as number);
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    }
  });

  it("is over-dispersed relative to a plain multinomial", () => {
    const rows = drawMany([1, 1, 1], 20, 20000, 8642);
    const multinomialVariance = 20 * (1 / 3) * (2 / 3); // 4.444…
    // The DM inflates it by (n + A)/(1 + A) = 23/4 = 5.75.
    expect(empiricalCovariance(rows, 0, 0)).toBeGreaterThan(4 * multinomialVariance);
  });

  it("approaches the multinomial as the concentration grows", () => {
    const trials = 100;
    const rows = drawMany([1e6, 1e6], trials, 4000, 31337);
    const multinomialVariance = trials * 0.5 * 0.5; // 25
    const ratio = empiricalCovariance(rows, 0, 0) / multinomialVariance;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
  });

  it("tracks the share vector for a large asymmetric concentration", () => {
    const rows = drawMany([500, 300, 200], 100, 3000, 11);
    expect(columnMean(rows, 0) / 100).toBeCloseTo(0.5, 2);
    expect(columnMean(rows, 1) / 100).toBeCloseTo(0.3, 2);
    expect(columnMean(rows, 2) / 100).toBeCloseTo(0.2, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample — THE reason this slot exists: negative correlation
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — categories are negatively correlated", () => {
  it("has negative sample covariance between two categories, matching the closed form", () => {
    const alpha = [1, 1, 1];
    const trials = 20;
    const rows = drawMany(alpha, trials, 20000, 555);
    const cov = empiricalCovariance(rows, 0, 1);
    expect(cov).toBeLessThan(0);
    // Closed form: −20·(1/3)(1/3)·(20+3)/(1+3) = −12.7777…
    const expected = dmMoments(alpha, trials).covariance(0, 1);
    expect(expected).toBeCloseTo(-12.7777777, 5);
    expect(cov / expected).toBeGreaterThan(0.92);
    expect(cov / expected).toBeLessThan(1.08);
  });

  it("has negative sample covariance for EVERY pair under an asymmetric alpha", () => {
    const alpha = [4, 2, 1, 0.5];
    const trials = 30;
    const rows = drawMany(alpha, trials, 20000, 90211);
    const moments = dmMoments(alpha, trials);
    for (let i = 0; i < alpha.length; i += 1) {
      for (let j = i + 1; j < alpha.length; j += 1) {
        const cov = empiricalCovariance(rows, i, j);
        expect(cov).toBeLessThan(0);
        const ratio = cov / moments.covariance(i, j);
        expect(ratio).toBeGreaterThan(0.85);
        expect(ratio).toBeLessThan(1.15);
      }
    }
  });

  it("stays negatively correlated even at a very large concentration", () => {
    // A → ∞ is the multinomial limit, which is still negatively correlated.
    const rows = drawMany([1e6, 1e6, 1e6], 60, 5000, 606);
    expect(empiricalCovariance(rows, 0, 1)).toBeLessThan(0);
  });

  it("keeps every covariance-matrix row-sum at zero (the pie is fixed)", () => {
    // Σ_j Cov(X_i, X_j) = Cov(X_i, Σ_j X_j) = Cov(X_i, trials) = 0 exactly,
    // because the total is a constant. "One pie", stated algebraically.
    const alpha = [3, 2, 1];
    const rows = drawMany(alpha, 24, 8000, 4711);
    for (let i = 0; i < alpha.length; i += 1) {
      let rowSum = 0;
      for (let j = 0; j < alpha.length; j += 1) rowSum += empiricalCovariance(rows, i, j);
      expect(Math.abs(rowSum)).toBeLessThan(1e-8);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample — exact marginal law (K = 2 is Beta-Binomial)
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — the K = 2 marginal is exactly Beta-Binomial", () => {
  it("matches the closed-form Beta-Binomial pmf", () => {
    const alpha = [2, 3];
    const trials = 5;
    const draws = 60000;
    const rows = drawMany(alpha, trials, draws, 606060);
    const observed = new Array<number>(trials + 1).fill(0);
    for (const r of rows) {
      const k = r[0] as number;
      observed[k] = (observed[k] as number) + 1;
    }

    let totalExpected = 0;
    for (let k = 0; k <= trials; k += 1) {
      const expected = betaBinomialPmf(trials, k, alpha[0] as number, alpha[1] as number);
      totalExpected += expected;
      expect((observed[k] as number) / draws).toBeCloseTo(expected, 2);
    }
    expect(totalExpected).toBeCloseTo(1, 12);
  });

  it("matches the Beta-Binomial pmf for a sub-unit alpha too (the boost path)", () => {
    const alpha = [0.7, 1.3];
    const trials = 4;
    const draws = 60000;
    const rows = drawMany(alpha, trials, draws, 707070);
    const observed = new Array<number>(trials + 1).fill(0);
    for (const r of rows) {
      const k = r[0] as number;
      observed[k] = (observed[k] as number) + 1;
    }
    for (let k = 0; k <= trials; k += 1) {
      const expected = betaBinomialPmf(trials, k, alpha[0] as number, alpha[1] as number);
      expect((observed[k] as number) / draws).toBeCloseTo(expected, 2);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample — extreme parameters and boundary shares
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — extreme parameters", () => {
  it("concentrates on one category when every alpha is tiny", () => {
    const trials = 50;
    const rows = drawMany([1e-3, 1e-3, 1e-3], trials, 1000, 1212);
    let winnerTakesAll = 0;
    for (const r of rows) {
      expect(sum(r)).toBe(trials);
      if (r.some((c) => c === trials)) winnerTakesAll += 1;
    }
    // With α_k = 1e-3 the Dirichlet mass sits in the corners of the simplex.
    expect(winnerTakesAll / rows.length).toBeGreaterThan(0.95);
  });

  it("gives a category at the documented alpha floor exactly zero mass", () => {
    const rows = drawMany([2, ALPHA_FLOOR, 3], 50, 500, 5);
    for (const r of rows) {
      expect(r[1]).toBe(0);
      expect(sum(r)).toBe(50);
    }
  });

  it("survives a concentration spread over 16 orders of magnitude", () => {
    const rows = drawMany([1e8, 1e-8], 100, 200, 31);
    for (const r of rows) {
      expect(sum(r)).toBe(100);
      expect(r[0]).toBe(100); // the 1e-8 share underflows to zero mass
    }
  });

  it("handles the shape < 1 boost path across many seeds", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const { counts } = sampleDirichletMultinomial(
        { alpha: [0.05, 0.2, 0.9], trials: 33 },
        makeRng(seed),
      );
      expect(sum(counts)).toBe(33);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample — failure modes
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — fails closed", () => {
  it("throws EMPTY for an empty alpha", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [], trials: 3 }, makeRng(1)),
      "EMPTY",
    );
  });

  it("throws DOMAIN for a zero alpha", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, 0, 2], trials: 3 }, makeRng(1)),
      "DOMAIN",
    );
  });

  it("throws DOMAIN for a negative alpha", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [-1, 2], trials: 3 }, makeRng(1)),
      "DOMAIN",
    );
  });

  it("throws NOT_FINITE for a NaN or infinite alpha", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [Number.NaN, 2], trials: 3 }, makeRng(1)),
      "NOT_FINITE",
    );
    expectKernelError(
      () =>
        sampleDirichletMultinomial(
          { alpha: [Number.POSITIVE_INFINITY, 2], trials: 3 },
          makeRng(1),
        ),
      "NOT_FINITE",
    );
  });

  it("throws DOMAIN for a negative or fractional trial count", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, 2], trials: -1 }, makeRng(1)),
      "DOMAIN",
    );
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, 2], trials: 2.5 }, makeRng(1)),
      "DOMAIN",
    );
  });

  it("throws NOT_FINITE for a NaN trial count", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, 2], trials: Number.NaN }, makeRng(1)),
      "NOT_FINITE",
    );
  });

  it("validates before short-circuiting on trials = 0", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, -2], trials: 0 }, makeRng(1)),
      "DOMAIN",
    );
  });

  it("throws DOMAIN for an rng that leaves [0, 1)", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, 2], trials: 5 }, () => 1),
      "DOMAIN",
    );
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, 2], trials: 5 }, () => -0.5),
      "DOMAIN",
    );
  });

  it("throws NOT_FINITE for an rng returning a non-finite value", () => {
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [1, 2], trials: 5 }, () => Number.NaN),
      "NOT_FINITE",
    );
  });

  it("never returns NaN in any count", () => {
    const rng = makeRng(31415);
    for (let i = 0; i < 500; i += 1) {
      const { counts } = sampleDirichletMultinomial({ alpha: [0.01, 1, 50], trials: 17 }, rng);
      for (const c of counts) expect(Number.isNaN(c)).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fit — recovery of a known alpha and stationarity
// ─────────────────────────────────────────────────────────────────────────────

describe("fitDirichletMultinomial — recovers a known alpha", () => {
  it("recovers alpha = [8, 5, 3, 2] from simulated rows", () => {
    const truth = [8, 5, 3, 2];
    const rows = drawMany(truth, 30, 3000, 4242);
    const fitted = fitDirichletMultinomial(rows);

    expect(fitted.length).toBe(4);
    for (let k = 0; k < truth.length; k += 1) {
      const ratio = (fitted[k] as number) / (truth[k] as number);
      expect(ratio).toBeGreaterThan(0.85);
      expect(ratio).toBeLessThan(1.15);
    }
    // The share vector is estimated far more precisely than the precision is.
    const a = sum([...fitted]);
    const truthTotal = sum(truth);
    for (let k = 0; k < truth.length; k += 1) {
      expect((fitted[k] as number) / a).toBeCloseTo((truth[k] as number) / truthTotal, 2);
    }
  });

  it("recovers alpha = [2, 3, 5]", () => {
    const truth = [2, 3, 5];
    const rows = drawMany(truth, 25, 3000, 987654);
    const fitted = fitDirichletMultinomial(rows);
    for (let k = 0; k < truth.length; k += 1) {
      const ratio = (fitted[k] as number) / (truth[k] as number);
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    }
  });

  it("recovers a small concentration (high week-to-week share volatility)", () => {
    const truth = [0.4, 0.6, 1.0];
    const rows = drawMany(truth, 20, 3000, 246810);
    const fitted = fitDirichletMultinomial(rows);
    for (let k = 0; k < truth.length; k += 1) {
      const ratio = (fitted[k] as number) / (truth[k] as number);
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    }
  });

  it("returns a point where Minka's fixed-point ratio is 1 for every category", () => {
    const rows = drawMany([2, 3, 5], 25, 1500, 111213);
    const fitted = fitDirichletMultinomial(rows);
    for (let k = 0; k < fitted.length; k += 1) {
      // Stationarity of the DM likelihood, recomputed straight from `digamma`.
      expect(minkaRatio(rows, fitted, k)).toBeCloseTo(1, 6);
    }
  });

  it("converges on a small well-conditioned table, with strictly positive alpha", () => {
    const rows = [
      [8, 2, 0],
      [1, 6, 3],
      [5, 1, 4],
      [0, 9, 1],
      [6, 3, 1],
      [2, 2, 6],
    ];
    const fitted = fitDirichletMultinomial(rows);
    expect(fitted.length).toBe(3);
    for (const v of fitted) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
    for (let k = 0; k < fitted.length; k += 1) {
      expect(minkaRatio(rows, fitted, k)).toBeCloseTo(1, 6);
    }
  });

  it("is equivariant under a permutation of the columns", () => {
    // NOTE: the concentration here is deliberately one the 500-iteration budget
    // frozen by the contract can reach; see the slot header on under-dispersed
    // and slowly-converging samples.
    const rows = drawMany([2, 3, 5], 25, 800, 2718);
    const fitted = fitDirichletMultinomial(rows);
    const permuted = rows.map((r) => [r[2] as number, r[0] as number, r[1] as number]);
    const fittedPermuted = fitDirichletMultinomial(permuted);
    expect(fittedPermuted[0] as number).toBeCloseTo(fitted[2] as number, 6);
    expect(fittedPermuted[1] as number).toBeCloseTo(fitted[0] as number, 6);
    expect(fittedPermuted[2] as number).toBeCloseTo(fitted[1] as number, 6);
  });

  it("is invariant to the order of the rows", () => {
    const rows = drawMany([2, 3, 5], 25, 800, 2718);
    const reversed = [...rows].reverse();
    const a = fitDirichletMultinomial(rows);
    const b = fitDirichletMultinomial(reversed);
    for (let k = 0; k < a.length; k += 1) {
      expect(b[k] as number).toBeCloseTo(a[k] as number, 6);
    }
  });

  it("is deterministic and does not mutate its input", () => {
    const rows = [
      [8, 2, 0],
      [1, 6, 3],
      [5, 1, 4],
      [0, 9, 1],
      [6, 3, 1],
      [2, 2, 6],
    ];
    const snapshot = rows.map((r) => [...r]);
    const first = [...fitDirichletMultinomial(rows)];
    const second = [...fitDirichletMultinomial(rows)];
    expect(first).toEqual(second);
    expect(rows).toEqual(snapshot);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fit — documented boundary behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe("fitDirichletMultinomial — boundary data", () => {
  it("floors a never-observed category, keeping column alignment", () => {
    const rows = [
      [8, 0, 2],
      [1, 0, 9],
      [5, 0, 5],
      [0, 0, 10],
      [6, 0, 4],
      [2, 0, 8],
    ];
    const fitted = fitDirichletMultinomial(rows);
    expect(fitted.length).toBe(3); // one entry per INPUT column, in input order
    expect(fitted[1] as number).toBeGreaterThan(0);
    expect(fitted[1] as number).toBeLessThanOrEqual(ALPHA_FLOOR);
    expect(fitted[0] as number).toBeGreaterThan(ALPHA_FLOOR);
    expect(fitted[2] as number).toBeGreaterThan(ALPHA_FLOOR);
  });

  it("ignores all-zero rows exactly", () => {
    const withZeroRows = [
      [0, 0],
      [8, 2],
      [1, 9],
      [0, 0],
      [5, 5],
      [9, 1],
      [3, 7],
    ];
    const withoutZeroRows = withZeroRows.filter((r) => sum(r) > 0);
    const a = fitDirichletMultinomial(withZeroRows);
    const b = fitDirichletMultinomial(withoutZeroRows);
    // An all-zero row contributes ψ(A) − ψ(A) = 0 to the denominator, so it is
    // ignored EXACTLY — the two fits must agree to the last bits.
    expect(a.length).toBe(2);
    for (let k = 0; k < a.length; k += 1) {
      expect(a[k] as number).toBeCloseTo(b[k] as number, 9);
    }
  });

  it("returns the documented unidentifiable answer when only one column is live", () => {
    // With a single live share the DM likelihood is identical for every
    // precision, so the slot documents one fixed, reproducible answer.
    const fitted = fitDirichletMultinomial([
      [3, 0],
      [5, 0],
      [2, 0],
    ]);
    expect(fitted.length).toBe(2);
    expect(fitted[0] as number).toBe(1);
    expect(fitted[1] as number).toBe(ALPHA_FLOOR);
  });

  it("returns [1] for a single category", () => {
    const fitted = fitDirichletMultinomial([[3], [5], [2]]);
    expect([...fitted]).toEqual([1]);
  });

  it("throws NO_CONVERGENCE for a single row (no between-row spread exists)", () => {
    expectKernelError(() => fitDirichletMultinomial([[5, 3, 2]]), "NO_CONVERGENCE");
  });

  it("throws NO_CONVERGENCE when every row is identical (MLE at A = infinity)", () => {
    const rows = Array.from({ length: 200 }, () => [6, 4]);
    expectKernelError(() => fitDirichletMultinomial(rows), "NO_CONVERGENCE");
  });

  it("throws NO_CONVERGENCE on under-dispersed rows", () => {
    // Alternating one unit either side of a 5/5 split is strictly LESS variable
    // than a multinomial, which no finite-A Dirichlet-multinomial can represent.
    const rows: number[][] = [];
    for (let i = 0; i < 100; i += 1) rows.push(i % 2 === 0 ? [5, 5] : [6, 4]);
    expectKernelError(() => fitDirichletMultinomial(rows), "NO_CONVERGENCE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fit — failure modes
// ─────────────────────────────────────────────────────────────────────────────

describe("fitDirichletMultinomial — fails closed", () => {
  it("throws EMPTY for no rows", () => {
    expectKernelError(() => fitDirichletMultinomial([]), "EMPTY");
  });

  it("throws EMPTY for rows with no columns", () => {
    expectKernelError(() => fitDirichletMultinomial([[], []]), "EMPTY");
  });

  it("throws MISMATCHED_LENGTH for a ragged table (short row)", () => {
    expectKernelError(
      () =>
        fitDirichletMultinomial([
          [1, 2, 3],
          [1, 2],
          [4, 5, 6],
        ]),
      "MISMATCHED_LENGTH",
    );
  });

  it("throws MISMATCHED_LENGTH for a ragged table (long row)", () => {
    expectKernelError(
      () =>
        fitDirichletMultinomial([
          [1, 2],
          [1, 2, 3],
        ]),
      "MISMATCHED_LENGTH",
    );
  });

  it("throws DOMAIN for a negative count", () => {
    expectKernelError(
      () =>
        fitDirichletMultinomial([
          [1, 2],
          [-1, 4],
        ]),
      "DOMAIN",
    );
  });

  it("throws DOMAIN for a fractional count", () => {
    expectKernelError(
      () =>
        fitDirichletMultinomial([
          [1, 2],
          [1.5, 4],
        ]),
      "DOMAIN",
    );
  });

  it("throws NOT_FINITE for a NaN or infinite count", () => {
    expectKernelError(
      () =>
        fitDirichletMultinomial([
          [1, 2],
          [Number.NaN, 4],
        ]),
      "NOT_FINITE",
    );
    expectKernelError(
      () =>
        fitDirichletMultinomial([
          [1, 2],
          [Number.POSITIVE_INFINITY, 4],
        ]),
      "NOT_FINITE",
    );
  });

  it("throws UNSUPPORTED for an all-zero table", () => {
    expectKernelError(
      () =>
        fitDirichletMultinomial([
          [0, 0, 0],
          [0, 0, 0],
        ]),
      "UNSUPPORTED",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fit ∘ sample — the round trip the engine actually depends on
// ─────────────────────────────────────────────────────────────────────────────

describe("fit ∘ sample round trip", () => {
  it("re-simulating from the fitted alpha reproduces the observed moments", () => {
    const truth = [1.5, 2.5, 4, 2];
    const trials = 28;
    const observed = drawMany(truth, trials, 3000, 5150);
    const fitted = fitDirichletMultinomial(observed);
    const resimulated = drawMany([...fitted], trials, 3000, 9160);

    for (let k = 0; k < truth.length; k += 1) {
      expect(columnMean(resimulated, k)).toBeCloseTo(columnMean(observed, k), 0);
      const ratio =
        empiricalCovariance(resimulated, k, k) / empiricalCovariance(observed, k, k);
      expect(ratio).toBeGreaterThan(0.85);
      expect(ratio).toBeLessThan(1.15);
    }
    // And the negative pairwise structure survives the round trip.
    expect(empiricalCovariance(resimulated, 0, 1)).toBeLessThan(0);
  });

  it("renormalises to the surviving weights when a category is dropped (injury re-projection)", () => {
    // Dropping a component from alpha must redistribute its share in proportion
    // to the survivors' own weights — the property independent marginals cannot
    // reproduce, and the reason the engine models shares jointly.
    const full = [6, 3, 1];
    const survivors = [6, 3]; // the third player is out
    const trials = 40;
    const rows = drawMany(survivors, trials, 8000, 1357);
    const expectedShareOfFirst = 6 / 9; // renormalised, not 6/10
    expect(columnMean(rows, 0) / trials).toBeCloseTo(expectedShareOfFirst, 2);
    expect(columnMean(rows, 1) / trials).toBeCloseTo(3 / 9, 2);
    // Sanity: before the drop the first player's share was strictly smaller.
    expect(expectedShareOfFirst).toBeGreaterThan((full[0] as number) / sum(full));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fit — the ITERATION BUDGET itself
//
// `minkaRatio` above proves the returned point is stationary. These tests prove
// the other half of the contract's convergence clause: that well-posed data
// reaches that point in far fewer than 500 sweeps, and that the data which
// throws NO_CONVERGENCE genuinely cannot be made to converge by any budget.
//
// The oracle below is a full Minka sweep written straight from the contract's
// formula, so it can count iterations the slot does not expose.
// ─────────────────────────────────────────────────────────────────────────────

/** One complete Minka sweep, independent of the implementation. */
function minkaSweep(rows: readonly (readonly number[])[], alpha: readonly number[]): number[] {
  const a = sum(alpha);
  const psiA = digamma(a);
  let denominator = 0;
  for (const row of rows) {
    const total = sum(row);
    if (total === 0) continue;
    denominator += digamma(total + a) - psiA;
  }
  return alpha.map((ak, k) => {
    const psiK = digamma(ak);
    let numerator = 0;
    for (const row of rows) {
      const n = row[k] as number;
      if (n === 0) continue;
      numerator += digamma(n + ak) - psiK;
    }
    return (ak * numerator) / denominator;
  });
}

/** The slot's documented hybrid relative/absolute change measure. */
function maxCoordinateChange(a: readonly number[], b: readonly number[]): number {
  let worst = 0;
  for (let k = 0; k < a.length; k += 1) {
    const x = a[k] as number;
    const y = b[k] as number;
    const change = Math.abs(y - x) / Math.max(1, x, y);
    if (change > worst) worst = change;
  }
  return worst;
}

/** Sweeps needed to reach the frozen 1e-9 tolerance from `start`. */
function sweepsToConverge(
  rows: readonly (readonly number[])[],
  start: readonly number[],
  budget: number,
): { sweeps: number; alpha: number[] } {
  let alpha = [...start];
  for (let i = 1; i <= budget; i += 1) {
    const next = minkaSweep(rows, alpha);
    const change = maxCoordinateChange(alpha, next);
    alpha = next;
    if (change <= 1e-9) return { sweeps: i, alpha };
  }
  return { sweeps: budget + 1, alpha };
}

/**
 * The slot's documented moment initialisation, reimplemented from its docblock:
 * pooled shares for the direction, Brier's overdispersion statistic for the
 * precision, clamped to [1e-3, 1e6] with a fallback of A = K.
 */
function documentedMomentInit(rows: readonly (readonly number[])[]): number[] {
  const k = (rows[0] as readonly number[]).length;
  const columnTotals = new Array<number>(k).fill(0);
  let grandTotal = 0;
  let informativeRows = 0;
  for (const row of rows) {
    const total = sum(row);
    for (let j = 0; j < k; j += 1) {
      columnTotals[j] = (columnTotals[j] as number) + (row[j] as number);
    }
    grandTotal += total;
    if (total > 0) informativeRows += 1;
  }
  const shares = columnTotals.map((t) => t / grandTotal);
  let chiSquare = 0;
  for (const row of rows) {
    const total = sum(row);
    if (total === 0) continue;
    for (let j = 0; j < k; j += 1) {
      const expected = total * (shares[j] as number);
      chiSquare += ((row[j] as number) - expected) ** 2 / expected;
    }
  }
  const scaled = chiSquare / (k - 1);
  const estimate = (grandTotal - scaled) / (scaled - informativeRows);
  const precision =
    !Number.isFinite(estimate) || estimate <= 0
      ? k
      : Math.min(1e6, Math.max(1e-3, estimate));
  return shares.map((p) => Math.max(ALPHA_FLOOR, p * precision));
}

describe("fitDirichletMultinomial — converges far inside the 500 budget", () => {
  it("reaches tolerance in well under 500 sweeps on well-posed data", () => {
    // 4 categories, A ~ 1, 600 simulated games. The oracle is started from the
    // NAIVE all-ones vector, i.e. a strictly worse start than the slot uses, and
    // still finishes in a small fraction of the budget.
    const rows = drawMany([0.4, 0.3, 0.2, 0.1], 15, 600, 2);
    const { sweeps, alpha } = sweepsToConverge(rows, [1, 1, 1, 1], 600);
    expect(sweeps).toBeLessThan(150);
    expect(sweeps).toBeLessThan(500);

    // …and the slot lands on exactly that point.
    const fitted = fitDirichletMultinomial(rows);
    for (let k = 0; k < 4; k += 1) {
      expect(fitted[k] as number).toBeCloseTo(alpha[k] as number, 7);
    }
  });

  it("the returned alpha is a true fixed point: one more sweep barely moves it", () => {
    const rows = drawMany([0.4, 0.3, 0.2, 0.1], 15, 600, 2);
    const fitted = fitDirichletMultinomial(rows);
    expect(maxCoordinateChange([...fitted], minkaSweep(rows, [...fitted]))).toBeLessThanOrEqual(
      1e-9,
    );
  });

  it("the moment initialisation is load-bearing, not decorative", () => {
    // On this sample the naive all-ones start needs MORE than the frozen budget
    // while the documented moment start needs less, so the choice of
    // initialisation is exactly what keeps this dataset fittable.
    const rows = drawMany([8, 5, 3, 2], 30, 800, 4242);
    const fromOnes = sweepsToConverge(rows, [1, 1, 1, 1], 900).sweeps;
    const fromMoments = sweepsToConverge(rows, documentedMomentInit(rows), 900).sweeps;

    expect(fromOnes).toBeGreaterThan(500);
    expect(fromMoments).toBeLessThan(500);
    expect(fromMoments).toBeLessThan(fromOnes);
    expect(() => fitDirichletMultinomial(rows)).not.toThrow();
  });

  it("the moment initialisation already lands near the answer", () => {
    const rows = drawMany([8, 5, 3, 2], 30, 800, 4242);
    const fitted = fitDirichletMultinomial(rows);
    const start = documentedMomentInit(rows);
    // Direction and scale both start within a few percent — the remaining cost
    // is the map's linear rate, which no initialisation can improve.
    expect(sum(start) / sum([...fitted])).toBeGreaterThan(0.9);
    expect(sum(start) / sum([...fitted])).toBeLessThan(1.1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fit — NO_CONVERGENCE is PROVEN, not merely observed
// ─────────────────────────────────────────────────────────────────────────────

describe("fitDirichletMultinomial — NO_CONVERGENCE is unreachable, not unlucky", () => {
  const IDENTICAL: readonly (readonly number[])[] = [
    [5, 5],
    [5, 5],
    [5, 5],
  ];

  it("identical rows: the map still moves by ~0.25 a sweep after FOUR budgets", () => {
    // The MLE sits at A = infinity, and the fixed point walks toward it in
    // roughly constant additive steps. After 2000 sweeps — four times the frozen
    // budget — the step is still nine orders of magnitude above the tolerance.
    let alpha = [1, 1];
    for (let i = 0; i < 2000; i += 1) alpha = minkaSweep(IDENTICAL, alpha);
    const next = minkaSweep(IDENTICAL, alpha);
    expect(alpha[0] as number).toBeGreaterThan(400);
    expect((next[0] as number) - (alpha[0] as number)).toBeGreaterThan(0.2);
    expect(maxCoordinateChange(alpha, next)).toBeGreaterThan(1e-9);
    expectKernelError(() => fitDirichletMultinomial(IDENTICAL), "NO_CONVERGENCE");
  });

  it("a single row: the map never settles either", () => {
    const oneRow: readonly (readonly number[])[] = [[7, 3, 2]];
    let alpha = [1, 1, 1];
    for (let i = 0; i < 2000; i += 1) alpha = minkaSweep(oneRow, alpha);
    const next = minkaSweep(oneRow, alpha);
    expect(alpha[0] as number).toBeGreaterThan(1000);
    expect((next[0] as number) - (alpha[0] as number)).toBeGreaterThan(0.2);
    expectKernelError(() => fitDirichletMultinomial(oneRow), "NO_CONVERGENCE");
  });

  it("well-posed but strongly concentrated data also exhausts the budget", () => {
    // Cause (b) in the slot header: nothing is wrong with this sample — it comes
    // straight from a known alpha summing to 180 — but the fixed point's linear
    // rate cannot resolve a concentration that large within 500 sweeps. The
    // oracle needs more than 1200, so the throw is a property of the mandated
    // algorithm and budget, not of the initialisation.
    const rows = drawMany([80, 50, 30, 20], 40, 400, 31);
    expect(sweepsToConverge(rows, [1, 1, 1, 1], 1200).sweeps).toBeGreaterThan(1200);
    expectKernelError(() => fitDirichletMultinomial(rows), "NO_CONVERGENCE");
  });

  it("the NO_CONVERGENCE message names the frozen budget and tolerance", () => {
    let caught: unknown;
    try {
      fitDirichletMultinomial(IDENTICAL);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toContain("500");
    expect((caught as Error).message).toContain("1e-9");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample — rng DRAW ACCOUNTING
//
// The slot documents exactly how many uniforms a draw consumes, including the
// extra one the shape < 1 boost takes. A caller reproducing a stream depends on
// that number, so it is pinned here rather than left to drift.
// ─────────────────────────────────────────────────────────────────────────────

describe("sampleDirichletMultinomial — rng draw accounting", () => {
  /** Wrap a source so the draws it serves can be counted. */
  function counted(seed: number): { rng: Rng; used: () => number } {
    const base = makeRng(seed);
    let calls = 0;
    return {
      rng: () => {
        calls += 1;
        return base();
      },
      used: () => calls,
    };
  }

  it("spends 3 draws per shape >= 1 category plus one per trial", () => {
    // 3 categories x (2 for Box-Muller + 1 for the acceptance test) + 7 trials.
    const { rng, used } = counted(77);
    sampleDirichletMultinomial({ alpha: [2, 3, 4], trials: 7 }, rng);
    expect(used()).toBe(3 * 3 + 7);
  });

  it("the shape < 1 boost costs exactly ONE extra draw per category", () => {
    // 2 categories x (1 boost + 2 Box-Muller + 1 acceptance) + 4 trials = 12,
    // i.e. exactly one more per category than the shape >= 1 case above.
    const { rng, used } = counted(77);
    sampleDirichletMultinomial({ alpha: [0.5, 0.5], trials: 4 }, rng);
    expect(used()).toBe(2 * 4 + 4);

    const withoutBoost = counted(77);
    sampleDirichletMultinomial({ alpha: [1.5, 1.5], trials: 4 }, withoutBoost.rng);
    expect(used() - withoutBoost.used()).toBe(2);
  });

  it("allocation costs exactly one draw per trial", () => {
    const small = counted(2);
    sampleDirichletMultinomial({ alpha: [2, 2], trials: 10 }, small.rng);
    const large = counted(2);
    sampleDirichletMultinomial({ alpha: [2, 2], trials: 60 }, large.rng);
    expect(large.used() - small.used()).toBe(50);
  });

  it("throws NO_CONVERGENCE when the rng makes Marsaglia-Tsang reject forever", () => {
    // The 3-cycle feeds Box-Muller u1 = 1e-8 and u2 = 0, producing a proposal at
    // x ~ 6.07 that fails the squeeze outright, then serves u = 0.5, which fails
    // the exact acceptance test. Every attempt rejects, so the rejection budget
    // is the only thing standing between a worker and an infinite loop.
    let i = 0;
    const adversarial: Rng = () => {
      const v = [1e-8, 0, 0.5][i % 3] as number;
      i += 1;
      return v;
    };
    expectKernelError(
      () => sampleDirichletMultinomial({ alpha: [2, 2], trials: 4 }, adversarial),
      "NO_CONVERGENCE",
    );
    // 1000 attempts x 3 draws each, all spent on the first category.
    expect(i).toBe(3000);
  });
});
