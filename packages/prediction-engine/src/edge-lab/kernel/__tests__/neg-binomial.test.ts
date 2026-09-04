import { describe, it, expect } from "vitest";

import {
  KernelError,
  makeRng,
  type DiscreteDistribution,
  type NegBinomialParams,
} from "../contract.js";
import { assertDistributionConformance } from "../conformance.js";
import { logChoose, logGamma } from "../numeric.js";
import { fitNegBinomial, makeNegBinomial } from "../slots/neg-binomial.js";

/** The near-Poisson convention documented in the slot. */
const NEAR_POISSON_R = 1e6;

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

/** Draw `n` samples from a fixed seed. */
function draw(dist: DiscreteDistribution, n: number, seed: number): number[] {
  const rng = makeRng(seed);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = dist.sample(rng);
  return out;
}

function sampleMoments(xs: readonly number[]): { mean: number; variance: number } {
  const n = xs.length;
  let sum = 0;
  for (const x of xs) sum += x;
  const mean = sum / n;
  let ss = 0;
  for (const x of xs) ss += (x - mean) * (x - mean);
  return { mean, variance: ss / (n - 1) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Conformance — mandatory for every DISTRIBUTION slot
// ─────────────────────────────────────────────────────────────────────────────

describe("makeNegBinomial — distribution conformance", () => {
  const cases: readonly { readonly label: string; readonly params: NegBinomialParams }[] = [
    { label: "integer r, moderate dispersion", params: { r: 4, p: 0.3 } },
    { label: "r = 1 (geometric)", params: { r: 1, p: 0.5 } },
    { label: "fractional r (heavy dispersion)", params: { r: 0.7, p: 0.4 } },
    { label: "large r, small mean", params: { r: 40, p: 0.9 } },
    { label: "heavy right tail", params: { r: 2.5, p: 0.1 } },
    {
      label: "near-Poisson (mean 5)",
      params: { r: NEAR_POISSON_R, p: NEAR_POISSON_R / (NEAR_POISSON_R + 5) },
    },
  ];

  for (const { label, params } of cases) {
    it(`conforms: ${label}`, () => {
      expect(() => assertDistributionConformance(makeNegBinomial(params))).not.toThrow();
    });
  }

  it("conforms for the degenerate point mass p = 1", () => {
    expect(() => assertDistributionConformance(makeNegBinomial({ r: 3, p: 1 }))).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pmf — closed form, mass, log-space equivalence
// ─────────────────────────────────────────────────────────────────────────────

describe("makeNegBinomial — pmf", () => {
  it("matches the closed form C(k+r-1,k) p^r (1-p)^k for integer r", () => {
    const r = 5;
    const p = 0.35;
    const dist = makeNegBinomial({ r, p });
    for (let k = 0; k <= 25; k += 1) {
      const expected = Math.exp(logChoose(k + r - 1, k)) * p ** r * (1 - p) ** k;
      expect(dist.pmf(k)).toBeCloseTo(expected, 14);
    }
  });

  it("generalized logGamma coefficient equals logChoose for integer r", () => {
    for (const r of [1, 2, 7, 13]) {
      for (let k = 0; k <= 12; k += 1) {
        const generalized = logGamma(k + r) - logGamma(r) - logGamma(k + 1);
        expect(generalized).toBeCloseTo(logChoose(k + r - 1, k), 9);
      }
    }
  });

  it("pmf(0) = p^r exactly enough for fractional r", () => {
    const dist = makeNegBinomial({ r: 2.75, p: 0.42 });
    expect(dist.pmf(0)).toBeCloseTo(0.42 ** 2.75, 15);
  });

  it("sums to ~1 over a truncated support", () => {
    for (const params of [
      { r: 3, p: 0.25 },
      { r: 0.5, p: 0.6 },
      { r: 12, p: 0.8 },
    ] as const) {
      const dist = makeNegBinomial(params);
      let mass = 0;
      for (let k = 0; k <= 5000; k += 1) mass += dist.pmf(k);
      expect(mass).toBeCloseTo(1, 10);
    }
  });

  it("is zero below the support and throws DOMAIN on a non-integer k", () => {
    const dist = makeNegBinomial({ r: 2, p: 0.5 });
    expect(dist.pmf(-1)).toBe(0);
    expect(dist.pmf(-17)).toBe(0);
    expectKernelError(() => dist.pmf(0.5), "DOMAIN");
    expectKernelError(() => dist.pmf(2.0001), "DOMAIN");
    expectKernelError(() => dist.pmf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.pmf(Number.POSITIVE_INFINITY), "NOT_FINITE");
  });

  it("never returns NaN, even far out in the tail", () => {
    const dist = makeNegBinomial({ r: 0.3, p: 0.9 });
    for (const k of [0, 1, 10, 100, 1000, 100000]) {
      const v = dist.pmf(k);
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// r = 1 collapses EXACTLY to the geometric distribution
// ─────────────────────────────────────────────────────────────────────────────

describe("makeNegBinomial — r = 1 is exactly geometric", () => {
  const p = 0.28;
  const dist = makeNegBinomial({ r: 1, p });

  it("pmf(k) = p (1-p)^k", () => {
    for (let k = 0; k <= 60; k += 1) {
      expect(dist.pmf(k)).toBeCloseTo(p * (1 - p) ** k, 15);
    }
  });

  it("cdf(k) = 1 - (1-p)^(k+1)", () => {
    for (let k = 0; k <= 60; k += 1) {
      expect(dist.cdf(k)).toBeCloseTo(1 - (1 - p) ** (k + 1), 12);
    }
  });

  it("mean = (1-p)/p and variance = (1-p)/p^2", () => {
    expect(dist.mean()).toBeCloseTo((1 - p) / p, 12);
    expect(dist.variance()).toBeCloseTo((1 - p) / (p * p), 12);
  });

  it("quantile matches the closed-form geometric inverse", () => {
    // Smallest k with 1-(1-p)^(k+1) >= q  =>  k = ceil(log(1-q)/log(1-p)) - 1
    for (const q of [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999]) {
      const closed = Math.ceil(Math.log(1 - q) / Math.log(1 - p)) - 1;
      expect(dist.quantile(q)).toBe(Math.max(0, closed));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Moments — analytic and empirical
// ─────────────────────────────────────────────────────────────────────────────

describe("makeNegBinomial — moments", () => {
  it("mean and variance match the analytic formulas", () => {
    for (const { r, p } of [
      { r: 4, p: 0.3 },
      { r: 0.9, p: 0.75 },
      { r: 20, p: 0.55 },
    ]) {
      const dist = makeNegBinomial({ r, p });
      expect(dist.mean()).toBeCloseTo((r * (1 - p)) / p, 12);
      expect(dist.variance()).toBeCloseTo((r * (1 - p)) / (p * p), 12);
      // The defining overdispersion identity: variance = mean / p.
      expect(dist.variance()).toBeCloseTo(dist.mean() / p, 12);
      expect(dist.variance()).toBeGreaterThanOrEqual(dist.mean() - 1e-12);
    }
  });

  it("mean and variance match the pmf-weighted sums", () => {
    const dist = makeNegBinomial({ r: 3.3, p: 0.4 });
    let m1 = 0;
    let m2 = 0;
    for (let k = 0; k <= 4000; k += 1) {
      const w = dist.pmf(k);
      m1 += k * w;
      m2 += k * k * w;
    }
    expect(m1).toBeCloseTo(dist.mean(), 8);
    expect(m2 - m1 * m1).toBeCloseTo(dist.variance(), 6);
  });

  it("empirical mean/variance of many fixed-seed samples match the declared moments", () => {
    const dist = makeNegBinomial({ r: 4, p: 0.3 });
    const xs = draw(dist, 200000, 20260825);
    const { mean, variance } = sampleMoments(xs);
    expect(mean).toBeCloseTo(dist.mean(), 1);
    expect(Math.abs(variance / dist.variance() - 1)).toBeLessThan(0.05);
  });

  it("point mass p = 1 has mean 0 and variance 0", () => {
    const dist = makeNegBinomial({ r: 6, p: 1 });
    expect(dist.mean()).toBe(0);
    expect(dist.variance()).toBe(0);
    expect(dist.pmf(0)).toBe(1);
    expect(dist.pmf(1)).toBe(0);
    expect(dist.cdf(0)).toBe(1);
    expect(dist.quantile(0.5)).toBe(0);
    expect(draw(dist, 100, 7).every((x) => x === 0)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cdf / quantile behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe("makeNegBinomial — cdf and quantile", () => {
  const dist = makeNegBinomial({ r: 3, p: 0.35 });

  it("cdf is the cumulative pmf and is non-decreasing", () => {
    let mass = 0;
    let previous = 0;
    for (let k = 0; k <= 200; k += 1) {
      mass += dist.pmf(k);
      const c = dist.cdf(k);
      expect(c).toBeCloseTo(mass, 9);
      expect(c).toBeGreaterThanOrEqual(previous - 1e-15);
      previous = c;
    }
    expect(previous).toBeCloseTo(1, 10);
  });

  it("cdf is a step function: cdf(x) = cdf(floor(x)), and 0 below the support", () => {
    expect(dist.cdf(3.9)).toBe(dist.cdf(3));
    expect(dist.cdf(-0.5)).toBe(0);
    expect(dist.cdf(-10)).toBe(0);
  });

  it("quantile returns the SMALLEST k with cdf(k) >= p", () => {
    for (const q of [1e-9, 0.01, 0.2, 0.5, 0.8, 0.99, 1 - 1e-9]) {
      const k = dist.quantile(q);
      expect(Number.isInteger(k)).toBe(true);
      expect(dist.cdf(k)).toBeGreaterThanOrEqual(q - 1e-15);
      if (k > 0) expect(dist.cdf(k - 1)).toBeLessThan(q);
    }
  });

  it("quantile(0) = 0 and quantile(1) is inside the saturated tail", () => {
    expect(dist.quantile(0)).toBe(0);
    const top = dist.quantile(1);
    expect(Number.isInteger(top)).toBe(true);
    expect(dist.cdf(top)).toBe(1);
  });

  it("throws DOMAIN for a probability outside [0,1]", () => {
    expectKernelError(() => dist.quantile(1.5), "DOMAIN");
    expectKernelError(() => dist.quantile(-0.1), "DOMAIN");
    expectKernelError(() => dist.quantile(1 + 1e-9), "DOMAIN");
    expectKernelError(() => dist.quantile(Number.NaN), "NOT_FINITE");
  });
});

describe("makeNegBinomial — support closure and fail-closed cdf", () => {
  it("cdf reaches exactly 1 at the top of the truncated support", () => {
    for (const params of [
      { r: 4, p: 0.3 },
      { r: 1, p: 0.5 },
      { r: 0.7, p: 0.4 },
      { r: 2.5, p: 0.1 },
    ] as const) {
      const dist = makeNegBinomial(params);
      const top = dist.quantile(1);
      expect(dist.cdf(top)).toBe(1);
      expect(dist.cdf(top + 10_000)).toBe(1);
      // The discarded tail is genuinely negligible: the pmf there is far below
      // the 1e-12 truncation threshold the kernel works to.
      expect(dist.pmf(top + 1)).toBeLessThan(1e-15);
    }
  });

  it("throws NO_CONVERGENCE rather than truncating a mass that never closes", () => {
    // Mean = r(1-p)/p ≈ 1e9 — far past the documented 5e6 support ceiling.
    const dist = makeNegBinomial({ r: 1, p: 1e-9 });
    expectKernelError(() => dist.cdf(10_000_000), "NO_CONVERGENCE");
    expectKernelError(() => dist.quantile(0.5), "NO_CONVERGENCE");
  }, 120_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Sampling — determinism and the injected Rng only
// ─────────────────────────────────────────────────────────────────────────────

describe("makeNegBinomial — sample", () => {
  it("is deterministic for a fixed seed and differs across seeds", () => {
    const dist = makeNegBinomial({ r: 5, p: 0.4 });
    const a = draw(dist, 500, 99);
    const b = draw(dist, 500, 99);
    const c = draw(dist, 500, 100);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("a freshly built distribution reproduces the same stream (no hidden state)", () => {
    const params = { r: 2.2, p: 0.45 } as const;
    expect(draw(makeNegBinomial(params), 300, 4242)).toEqual(
      draw(makeNegBinomial(params), 300, 4242),
    );
  });

  it("draws are non-negative integers whose histogram tracks the pmf", () => {
    const dist = makeNegBinomial({ r: 3, p: 0.5 });
    const n = 100000;
    const xs = draw(dist, n, 555);
    const counts = new Map<number, number>();
    for (const x of xs) {
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    for (let k = 0; k <= 8; k += 1) {
      const empirical = (counts.get(k) ?? 0) / n;
      // 4 standard errors of a binomial proportion, plus slack.
      const theoretical = dist.pmf(k);
      const se = Math.sqrt((theoretical * (1 - theoretical)) / n);
      expect(Math.abs(empirical - theoretical)).toBeLessThan(4 * se + 1e-4);
    }
  });

  it("rejects an Rng that leaves [0,1)", () => {
    const dist = makeNegBinomial({ r: 2, p: 0.5 });
    expectKernelError(() => dist.sample(() => 1), "DOMAIN");
    expectKernelError(() => dist.sample(() => -0.1), "DOMAIN");
    expectKernelError(() => dist.sample(() => Number.NaN), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Parameter validation
// ─────────────────────────────────────────────────────────────────────────────

describe("makeNegBinomial — parameter validation", () => {
  it("throws DOMAIN for r <= 0", () => {
    expectKernelError(() => makeNegBinomial({ r: 0, p: 0.5 }), "DOMAIN");
    expectKernelError(() => makeNegBinomial({ r: -2, p: 0.5 }), "DOMAIN");
  });

  it("throws NOT_FINITE for a non-finite r", () => {
    expectKernelError(() => makeNegBinomial({ r: Number.NaN, p: 0.5 }), "NOT_FINITE");
    expectKernelError(
      () => makeNegBinomial({ r: Number.POSITIVE_INFINITY, p: 0.5 }),
      "NOT_FINITE",
    );
  });

  it("throws DOMAIN for p outside (0,1]", () => {
    expectKernelError(() => makeNegBinomial({ r: 2, p: 0 }), "DOMAIN");
    expectKernelError(() => makeNegBinomial({ r: 2, p: -0.01 }), "DOMAIN");
    expectKernelError(() => makeNegBinomial({ r: 2, p: 1.01 }), "DOMAIN");
  });

  it("throws NOT_FINITE for a non-finite p", () => {
    expectKernelError(() => makeNegBinomial({ r: 2, p: Number.NaN }), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitNegBinomial — method of moments
// ─────────────────────────────────────────────────────────────────────────────

describe("fitNegBinomial — method of moments", () => {
  it("solves the moment equations exactly on a hand-computed sample", () => {
    // counts = [0, 1, 2, 9]: mean = 3, unbiased variance = (9+4+1+36)/3 = 50/3.
    const counts = [0, 1, 2, 9];
    const mean = 3;
    const variance = 50 / 3;
    const fit = fitNegBinomial(counts);
    expect(fit.p).toBeCloseTo(mean / variance, 12);
    expect(fit.r).toBeCloseTo((mean * mean) / (variance - mean), 12);
    // Round trip: the fitted distribution reproduces the sample moments.
    const dist = makeNegBinomial(fit);
    expect(dist.mean()).toBeCloseTo(mean, 10);
    expect(dist.variance()).toBeCloseTo(variance, 10);
  });

  it("recovers a known (r, p) from a large simulated sample", () => {
    const truth = { r: 4, p: 0.3 } as const;
    const counts = draw(makeNegBinomial(truth), 400000, 31337);
    const fit = fitNegBinomial(counts);
    expect(fit.p).toBeCloseTo(truth.p, 2);
    expect(Math.abs(fit.r / truth.r - 1)).toBeLessThan(0.05);
  });

  it("recovers a fractional r from a large simulated sample", () => {
    const truth = { r: 1.6, p: 0.25 } as const;
    const counts = draw(makeNegBinomial(truth), 400000, 8675309);
    const fit = fitNegBinomial(counts);
    expect(Math.abs(fit.p / truth.p - 1)).toBeLessThan(0.05);
    expect(Math.abs(fit.r / truth.r - 1)).toBeLessThan(0.08);
  });

  it("is invariant to the order of the counts (pure moment estimator)", () => {
    const counts = [1, 8, 0, 3, 14, 2, 5, 5, 21, 0];
    const a = fitNegBinomial(counts);
    const b = fitNegBinomial([...counts].reverse());
    expect(a.r).toBeCloseTo(b.r, 12);
    expect(a.p).toBeCloseTo(b.p, 12);
  });

  it("does not mutate its input", () => {
    const counts = [1, 2, 3, 40];
    const copy = [...counts];
    fitNegBinomial(counts);
    expect(counts).toEqual(copy);
  });
});

describe("fitNegBinomial — documented near-Poisson degeneracy", () => {
  function expectNearPoisson(fit: NegBinomialParams, mean: number): void {
    expect(fit.r).toBe(NEAR_POISSON_R);
    expect(fit.p).toBeCloseTo(NEAR_POISSON_R / (NEAR_POISSON_R + mean), 15);
    const dist = makeNegBinomial(fit);
    // Mean is reproduced exactly; variance is inflated by only (1 + mean/r).
    expect(dist.mean()).toBeCloseTo(mean, 8);
    expect(dist.variance()).toBeCloseTo(mean * (1 + mean / NEAR_POISSON_R), 8);
  }

  it("under-dispersed input returns the near-Poisson fit rather than throwing", () => {
    // Alternating 4/5: mean 4.5, unbiased variance 0.2778 << mean.
    const counts = [4, 5, 4, 5, 4, 5, 4, 5, 4, 5];
    expect(() => fitNegBinomial(counts)).not.toThrow();
    expectNearPoisson(fitNegBinomial(counts), 4.5);
  });

  it("all-identical counts (zero variance) return the near-Poisson fit", () => {
    expectNearPoisson(fitNegBinomial([7, 7, 7, 7, 7, 7]), 7);
  });

  it("a single observation returns the near-Poisson fit at that value", () => {
    expectNearPoisson(fitNegBinomial([12]), 12);
  });

  it("all zeros collapse to an exact point mass at 0 (p = 1)", () => {
    const fit = fitNegBinomial([0, 0, 0, 0]);
    expect(fit.r).toBe(NEAR_POISSON_R);
    expect(fit.p).toBe(1);
    const dist = makeNegBinomial(fit);
    expect(dist.mean()).toBe(0);
    expect(dist.variance()).toBe(0);
    expect(dist.pmf(0)).toBe(1);
  });

  it("exact equidispersion (variance === mean) takes the near-Poisson branch", () => {
    // counts = [1, 3]: mean 2, unbiased variance = ((1)+(1))/1 = 2 = mean.
    expectNearPoisson(fitNegBinomial([1, 3]), 2);
  });

  it("caps a barely-overdispersed fit at r = 1e6", () => {
    // Poisson-like data with a whisper of excess variance still fits, but the
    // implied r is astronomical and is snapped to the documented cap.
    const counts = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6];
    const fit = fitNegBinomial(counts);
    expect(fit.r).toBe(NEAR_POISSON_R);
  });

  it("the near-Poisson fit is numerically well behaved (pmf sums to 1, tracks Poisson)", () => {
    const lambda = 5;
    const dist = makeNegBinomial(fitNegBinomial([5, 5, 5, 5]));
    let mass = 0;
    for (let k = 0; k <= 200; k += 1) {
      const v = dist.pmf(k);
      expect(Number.isNaN(v)).toBe(false);
      mass += v;
      // Poisson(5) pmf via logGamma; the NB with r = 1e6 must be within 1e-4.
      const poisson = Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1));
      expect(Math.abs(v - poisson)).toBeLessThan(1e-4);
    }
    expect(mass).toBeCloseTo(1, 6);
  });
});

describe("fitNegBinomial — fail-closed inputs", () => {
  it("throws EMPTY on no counts", () => {
    expectKernelError(() => fitNegBinomial([]), "EMPTY");
  });

  it("throws DOMAIN on a negative count", () => {
    expectKernelError(() => fitNegBinomial([1, 2, -1]), "DOMAIN");
  });

  it("throws DOMAIN on a non-integer count", () => {
    expectKernelError(() => fitNegBinomial([1, 2, 2.5]), "DOMAIN");
  });

  it("throws NOT_FINITE on NaN or Infinity", () => {
    expectKernelError(() => fitNegBinomial([1, Number.NaN]), "NOT_FINITE");
    expectKernelError(() => fitNegBinomial([1, Number.POSITIVE_INFINITY]), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Round trip: fit → make → conformance
// ─────────────────────────────────────────────────────────────────────────────

describe("neg-binomial — fit/make round trip", () => {
  it("every fit produces a conforming distribution", () => {
    const samples: readonly (readonly number[])[] = [
      [0, 1, 2, 9],
      [4, 5, 4, 5, 4, 5],
      [0, 0, 0, 0],
      [12],
      [0, 0, 1, 0, 3, 0, 0, 7, 0, 1],
      [18, 22, 31, 12, 27, 25, 19, 40],
    ];
    for (const counts of samples) {
      const dist = makeNegBinomial(fitNegBinomial(counts));
      expect(() => assertDistributionConformance(dist, { draws: 4000 })).not.toThrow();
    }
  });
});

describe("makeNegBinomial — a rejected value is never memoized", () => {
  // Regression. `growOne` appended the running sum to the memo table BEFORE
  // deciding whether to keep it, so a NO_CONVERGENCE throw escaped with the
  // stalled partial still in the table. The second call at that index found it
  // memoized, never re-grew, and returned it as a fact — so `cdf(0)` threw the
  // first time and returned 0 the second. The wrong answer is the fail-open
  // one: a caller that catches and retries gets a plausible number instead of
  // the error it should have seen again.
  const NON_CONVERGING = { r: 1e6, p: 0.05 } as const;

  it("cdf(0) throws identically on the first and second call", () => {
    const dist = makeNegBinomial(NON_CONVERGING);
    expect(() => dist.cdf(0)).toThrow(KernelError);
    expect(() => dist.cdf(0)).toThrow(KernelError);
  });

  it("stays throwing across many repeats — no call ever yields a number", () => {
    const dist = makeNegBinomial(NON_CONVERGING);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let returned: number | null = null;
      try {
        returned = dist.cdf(0);
      } catch (e) {
        expect(e).toBeInstanceOf(KernelError);
        expect((e as KernelError).code).toBe("NO_CONVERGENCE");
      }
      expect(returned).toBeNull();
    }
  });

  it("quantile after a thrown cdf throws too, rather than reading the partial", () => {
    const dist = makeNegBinomial(NON_CONVERGING);
    expect(() => dist.cdf(0)).toThrow(KernelError);
    expect(() => dist.quantile(0.5)).toThrow(KernelError);
  });

  it("a converging distribution is unaffected — the memo still works", () => {
    // Guards against "fixing" the leak by disabling memoization: the table must
    // still be built once and reused, so repeated calls agree exactly.
    const dist = makeNegBinomial({ r: 4, p: 0.4 });
    const first = dist.cdf(12);
    expect(dist.cdf(12)).toBe(first);
    expect(dist.cdf(12)).toBe(first);
    expect(Number.isFinite(first)).toBe(true);
  });
});
