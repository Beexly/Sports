import { describe, it, expect } from "vitest";

import {
  KernelError,
  makeRng,
  type BetaBinomialParams,
  type DiscreteDistribution,
  type Rng,
} from "../contract.js";
import { assertDistributionConformance } from "../conformance.js";
import { logChoose } from "../numeric.js";
import { fitBetaBinomial, makeBetaBinomial } from "../slots/beta-binomial.js";

// ─────────────────────────────────────────────────────────────────────────────
// Conventions documented by the slot, restated here so a change to either side
// is a test failure rather than a silent drift.
// ─────────────────────────────────────────────────────────────────────────────

/** The near-binomial convention: alpha + beta snapped to 1e6. */
const NEAR_BINOMIAL_CONCENTRATION = 1e6;
/** The all-or-nothing floor: alpha + beta snapped to 1e-6. */
const MIN_CONCENTRATION = 1e-6;

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

/** Draw `count` samples from a fixed seed. */
function draw(dist: DiscreteDistribution, count: number, seed: number): number[] {
  const out: number[] = new Array(count);
  const rng = makeRng(seed);
  for (let i = 0; i < count; i += 1) out[i] = dist.sample(rng);
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

/** Total mass over the WHOLE bounded support {0, …, n}. */
function totalMass(dist: DiscreteDistribution, n: number): number {
  let mass = 0;
  for (let k = 0; k <= n; k += 1) mass += dist.pmf(k);
  return mass;
}

/** Independent closed form for the Binomial(n, p) pmf, in log space. */
function binomialPmf(n: number, k: number, p: number): number {
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}

/** Analytic moments straight from the contract's formulas. */
function analyticMean(params: BetaBinomialParams): number {
  return (params.n * params.alpha) / (params.alpha + params.beta);
}
function analyticVariance(params: BetaBinomialParams): number {
  const s = params.alpha + params.beta;
  return (params.n * params.alpha * params.beta * (s + params.n)) / (s * s * (s + 1));
}

// ── A generator for the fit round-trip that shares NO CODE with the slot ─────
// Drawing the fit's training data with `makeBetaBinomial(...).sample()` would
// only prove that `fit` inverts `make`; a shared bug would cancel. These build
// the hierarchy directly from the injected uniform stream:
//   Gamma(k, 1) = −Σ log Uᵢ for integer k;  Beta(a, b) = G_a / (G_a + G_b);
//   Binomial(n, p) = Σ 1{Uᵢ < p}.
// Integer shapes only, which is all the round-trip tests need.

function gammaIntegerShape(shape: number, rng: Rng): number {
  let acc = 0;
  // 1 − U rather than U so the argument of the log is never exactly 0.
  for (let i = 0; i < shape; i += 1) acc -= Math.log(1 - rng());
  return acc;
}

function betaDraw(alpha: number, beta: number, rng: Rng): number {
  const ga = gammaIntegerShape(alpha, rng);
  const gb = gammaIntegerShape(beta, rng);
  return ga / (ga + gb);
}

function binomialDraw(n: number, p: number, rng: Rng): number {
  let successes = 0;
  for (let i = 0; i < n; i += 1) if (rng() < p) successes += 1;
  return successes;
}

interface TrainingData {
  readonly successes: readonly number[];
  readonly trials: readonly number[];
}

/** Rows of (successes, trials) drawn hierarchically from Beta(alpha, beta). */
function generateRows(
  alpha: number,
  beta: number,
  trialSizes: readonly number[],
  rows: number,
  seed: number,
): TrainingData {
  const rng = makeRng(seed);
  const successes: number[] = [];
  const trials: number[] = [];
  for (let i = 0; i < rows; i += 1) {
    const n = trialSizes[i % trialSizes.length]!;
    const p = betaDraw(alpha, beta, rng);
    successes.push(binomialDraw(n, p, rng));
    trials.push(n);
  }
  return { successes, trials };
}

// ─────────────────────────────────────────────────────────────────────────────
// Conformance — mandatory for every DISTRIBUTION slot
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — distribution conformance", () => {
  const cases: readonly { readonly label: string; readonly params: BetaBinomialParams }[] = [
    { label: "moderate overdispersion", params: { n: 12, alpha: 2, beta: 3 } },
    { label: "uniform prior (alpha = beta = 1)", params: { n: 8, alpha: 1, beta: 1 } },
    { label: "U-shaped Jeffreys prior", params: { n: 10, alpha: 0.5, beta: 0.5 } },
    { label: "single trial (Bernoulli)", params: { n: 1, alpha: 0.5, beta: 0.5 } },
    { label: "single fair trial", params: { n: 1, alpha: 1, beta: 1 } },
    { label: "zero trials (point mass at 0)", params: { n: 0, alpha: 2, beta: 5 } },
    { label: "high rate, low dispersion", params: { n: 30, alpha: 40, beta: 8 } },
    { label: "low rate, heavy dispersion", params: { n: 25, alpha: 0.3, beta: 4 } },
    { label: "wide support (n = 400)", params: { n: 400, alpha: 6, beta: 9 } },
    { label: "symmetric, moderate n", params: { n: 60, alpha: 1.5, beta: 1.5 } },
  ];

  for (const { label, params } of cases) {
    it(`conforms: ${label}`, () => {
      expect(() => assertDistributionConformance(makeBetaBinomial(params))).not.toThrow();
    });
  }

  it("conforms at VERY LARGE concentration (s = 1e6, the near-binomial convention)", () => {
    const params: BetaBinomialParams = {
      n: 20,
      alpha: 0.35 * NEAR_BINOMIAL_CONCENTRATION,
      beta: 0.65 * NEAR_BINOMIAL_CONCENTRATION,
    };
    expect(() => assertDistributionConformance(makeBetaBinomial(params))).not.toThrow();
  });

  it("conforms at VERY SMALL concentration (s = 1e-6, the all-or-nothing floor)", () => {
    const params: BetaBinomialParams = {
      n: 6,
      alpha: 0.4 * MIN_CONCENTRATION,
      beta: 0.6 * MIN_CONCENTRATION,
    };
    expect(() => assertDistributionConformance(makeBetaBinomial(params))).not.toThrow();
  });

  it("conforms at the positivity fallback magnitude (alpha = beta = 1e-12)", () => {
    expect(() =>
      assertDistributionConformance(makeBetaBinomial({ n: 3, alpha: 1e-12, beta: 1e-12 })),
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Support — a Beta-Binomial(n) has n + 1 support points, {0, …, n}
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — support is exactly {0, …, n} (n + 1 points)", () => {
  it("support() is {min: 0, max: n} and spans n + 1 integers", () => {
    for (const n of [0, 1, 2, 7, 40]) {
      const s = makeBetaBinomial({ n, alpha: 1.7, beta: 2.3 }).support();
      expect(s).toEqual({ min: 0, max: n });
      expect(s.max - s.min + 1).toBe(n + 1);
    }
  });

  it("the top point k = n carries real mass and k = n + 1 carries none", () => {
    for (const n of [0, 1, 2, 7, 40]) {
      const dist = makeBetaBinomial({ n, alpha: 1.7, beta: 2.3 });
      expect(dist.pmf(n)).toBeGreaterThan(0);
      expect(dist.pmf(n + 1)).toBe(0);
      expect(dist.pmf(-1)).toBe(0);
    }
  });

  it("no support point is missing: the n + 1 masses already sum to 1", () => {
    // An off-by-one that dropped k = n (or started at k = 1) would show up here
    // as a deficit, since every individual mass is strictly positive.
    for (const n of [1, 2, 7, 40]) {
      const dist = makeBetaBinomial({ n, alpha: 1.7, beta: 2.3 });
      expect(Math.abs(totalMass(dist, n) - 1)).toBeLessThan(1e-12);
      expect(Math.abs(totalMass(dist, n - 1) - 1)).toBeGreaterThan(1e-12);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pmf — total mass and closed forms
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — pmf sums to 1 over {0, …, n}", () => {
  it("sums to 1 within 1e-12 across n = 0, 1, 2, 5, 17, 60, 200, 500, 1000", () => {
    // The support is BOUNDED, so the analytic total is exactly 1 and every bit
    // of slack is floating-point residual. `logGamma` carries ~1e-13 RELATIVE
    // error, so the absolute error in LOG space grows with logGamma's
    // magnitude; for ordinary parameters that keeps the residual at a few
    // 1e-13 even at n = 1000.
    const cases: readonly BetaBinomialParams[] = [
      { n: 0, alpha: 2, beta: 3 },
      { n: 1, alpha: 1, beta: 1 },
      { n: 1, alpha: 7, beta: 0.25 },
      { n: 2, alpha: 2, beta: 1 },
      { n: 5, alpha: 1, beta: 1 },
      { n: 17, alpha: 0.5, beta: 0.5 },
      { n: 60, alpha: 3.7, beta: 11.2 },
      { n: 200, alpha: 120, beta: 30 },
      { n: 500, alpha: 6, beta: 9 },
      { n: 1000, alpha: 2, beta: 2 },
      { n: 12, alpha: 0.4 * MIN_CONCENTRATION, beta: 0.6 * MIN_CONCENTRATION },
    ];
    for (const params of cases) {
      const residual = Math.abs(totalMass(makeBetaBinomial(params), params.n) - 1);
      expect(residual).toBeLessThan(1e-12);
    }
  });

  it("sums to 1 within 1e-8 in the near-binomial regime (s = 1e6)", () => {
    // The one regime where logGamma's magnitude costs real digits: its
    // arguments reach ~1.3e7, so the residual rises from ~1e-13 to ~4e-10.
    // Still two orders inside this bound and four inside conformance's 1e-6.
    for (const n of [1, 20, 100]) {
      const params: BetaBinomialParams = {
        n,
        alpha: 0.35 * NEAR_BINOMIAL_CONCENTRATION,
        beta: 0.65 * NEAR_BINOMIAL_CONCENTRATION,
      };
      expect(Math.abs(totalMass(makeBetaBinomial(params), n) - 1)).toBeLessThan(1e-8);
    }
  });

  it("every mass is a probability in [0, 1] and never NaN", () => {
    const cases: readonly BetaBinomialParams[] = [
      { n: 30, alpha: 0.01, beta: 0.01 },
      { n: 30, alpha: 900, beta: 0.05 },
      { n: 30, alpha: 1e-12, beta: 1e-12 },
      { n: 30, alpha: 5e5, beta: 5e5 },
    ];
    for (const params of cases) {
      const dist = makeBetaBinomial(params);
      for (let k = 0; k <= params.n; k += 1) {
        const p = dist.pmf(k);
        expect(Number.isNaN(p)).toBe(false);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("makeBetaBinomial — pmf closed forms", () => {
  it("alpha = beta = 1 reproduces the discrete uniform: pmf(k) = 1/(n + 1) for every k", () => {
    // The sharpest closed form available. C(n,k)·B(k+1, n−k+1)/B(1,1)
    //   = [n!/(k!(n−k)!)] · [k!(n−k)!/(n+1)!] = n!/(n+1)! = 1/(n+1),
    // independent of k. A sign slip or an argument swap inside logBeta breaks
    // it immediately. It is reproduced to within logGamma's own relative error
    // (measured worst case 2.2e-13 at n = 200), not bit-exactly: `logGamma(1)`
    // itself evaluates to −8.9e-16 rather than 0, so exact equality is not
    // attainable through a Lanczos approximation and asserting it would be
    // asserting a property of the arithmetic, not of this slot.
    for (const n of [0, 1, 2, 5, 13, 64, 200]) {
      const dist = makeBetaBinomial({ n, alpha: 1, beta: 1 });
      const expected = 1 / (n + 1);
      for (let k = 0; k <= n; k += 1) {
        expect(Math.abs(dist.pmf(k) / expected - 1)).toBeLessThan(1e-12);
      }
    }
  });

  it("alpha = beta = 1 gives the exactly linear cdf ramp (k + 1)/(n + 1)", () => {
    for (const n of [1, 2, 5, 13, 64]) {
      const dist = makeBetaBinomial({ n, alpha: 1, beta: 1 });
      for (let k = 0; k <= n; k += 1) {
        expect(dist.cdf(k)).toBeCloseTo((k + 1) / (n + 1), 11);
      }
    }
  });

  it("n = 0 is the exact point mass at 0: pmf(0) === 1 with no rounding at all", () => {
    // B(0 + alpha, 0 − 0 + beta) is the SAME call as B(alpha, beta), so the log
    // terms cancel bit-for-bit and exp(0) is exactly 1.
    for (const params of [
      { n: 0, alpha: 2, beta: 5 },
      { n: 0, alpha: 0.25, beta: 900 },
      { n: 0, alpha: 1, beta: 1 },
    ] as const) {
      expect(makeBetaBinomial(params).pmf(0)).toBe(1);
    }
  });

  it("n = 1 is exactly Bernoulli: pmf(1) = alpha/(alpha + beta), pmf(0) = beta/(alpha + beta)", () => {
    // B(alpha+1, beta)/B(alpha, beta) = alpha/(alpha+beta) by Γ(x+1) = xΓ(x).
    for (const [alpha, beta] of [
      [1, 1],
      [2, 3],
      [0.5, 0.5],
      [9, 0.75],
      [1e-3, 40],
    ] as const) {
      const dist = makeBetaBinomial({ n: 1, alpha, beta });
      expect(dist.pmf(1)).toBeCloseTo(alpha / (alpha + beta), 13);
      expect(dist.pmf(0)).toBeCloseTo(beta / (alpha + beta), 13);
    }
  });

  it("hand-computed n = 2, alpha = 2, beta = 1: pmf = (1/6, 1/3, 1/2), mean 4/3, variance 5/9", () => {
    // B(2,1) = 1!·0!/2! = 1/2.
    //  k=0: C(2,0)·B(2,3)/B(2,1) = (1!·2!/4!)·2 = (1/12)·2 = 1/6
    //  k=1: C(2,1)·B(3,2)/B(2,1) = 2·(2!·1!/4!)·2 = 2·(1/12)·2 = 1/3
    //  k=2: C(2,2)·B(4,1)/B(2,1) = (3!·0!/4!)·2 = (1/4)·2 = 1/2
    // mean = 2·2/3 = 4/3;  variance = 2·2·1·(3+2)/(3²·4) = 20/36 = 5/9
    const dist = makeBetaBinomial({ n: 2, alpha: 2, beta: 1 });
    expect(dist.pmf(0)).toBeCloseTo(1 / 6, 13);
    expect(dist.pmf(1)).toBeCloseTo(1 / 3, 13);
    expect(dist.pmf(2)).toBeCloseTo(1 / 2, 13);
    expect(dist.mean()).toBeCloseTo(4 / 3, 13);
    expect(dist.variance()).toBeCloseTo(5 / 9, 13);
  });

  it("hand-computed n = 3, alpha = 1, beta = 2: pmf = (0.4, 0.3, 0.2, 0.1), mean 1, variance 1", () => {
    // B(1,2) = 0!·1!/2! = 1/2.
    //  k=0: C(3,0)·B(1,5)/B(1,2) = (0!·4!/5!)·2 = 0.2·2 = 0.4
    //  k=1: C(3,1)·B(2,4)/B(1,2) = 3·(1!·3!/5!)·2 = 3·0.05·2 = 0.3
    //  k=2: C(3,2)·B(3,3)/B(1,2) = 3·(2!·2!/5!)·2 = 3·(1/30)·2 = 0.2
    //  k=3: C(3,3)·B(4,2)/B(1,2) = (3!·1!/5!)·2 = 0.05·2 = 0.1
    // mean = 3·1/3 = 1;  variance = 3·1·2·(3+3)/(3²·4) = 36/36 = 1
    const dist = makeBetaBinomial({ n: 3, alpha: 1, beta: 2 });
    expect(dist.pmf(0)).toBeCloseTo(0.4, 13);
    expect(dist.pmf(1)).toBeCloseTo(0.3, 13);
    expect(dist.pmf(2)).toBeCloseTo(0.2, 13);
    expect(dist.pmf(3)).toBeCloseTo(0.1, 13);
    expect(dist.mean()).toBeCloseTo(1, 13);
    expect(dist.variance()).toBeCloseTo(1, 13);
  });

  it("is symmetric about n/2 when alpha = beta", () => {
    const n = 21;
    for (const a of [0.4, 1, 2.5, 30]) {
      const dist = makeBetaBinomial({ n, alpha: a, beta: a });
      for (let k = 0; k <= n; k += 1) {
        expect(dist.pmf(k)).toBeCloseTo(dist.pmf(n - k), 13);
      }
    }
  });

  it("swapping alpha and beta mirrors the pmf: pmf_{a,b}(k) = pmf_{b,a}(n − k)", () => {
    const n = 14;
    const forward = makeBetaBinomial({ n, alpha: 2.4, beta: 6.1 });
    const mirrored = makeBetaBinomial({ n, alpha: 6.1, beta: 2.4 });
    for (let k = 0; k <= n; k += 1) {
      expect(forward.pmf(k)).toBeCloseTo(mirrored.pmf(n - k), 13);
    }
  });

  it("evaluates at n = 300 where a RAW-FACTORIAL implementation would be NaN", () => {
    // 171! overflows to Infinity, so C(300,150) computed as 300!/(150!·150!)
    // is Infinity/Infinity = NaN. The contract mandates logChoose + logBeta
    // precisely so this regime is ordinary; pmf(150) must be 1/301.
    let raw = 1;
    for (let i = 2; i <= 300; i += 1) raw *= i;
    expect(Number.isFinite(raw)).toBe(false);

    const dist = makeBetaBinomial({ n: 300, alpha: 1, beta: 1 });
    expect(dist.pmf(150)).toBeCloseTo(1 / 301, 13);
    expect(Math.abs(totalMass(dist, 300) - 1)).toBeLessThan(1e-12);

    const skewed = makeBetaBinomial({ n: 300, alpha: 2, beta: 5 });
    expect(Math.abs(totalMass(skewed, 300) - 1)).toBeLessThan(1e-12);
    expect(skewed.mean()).toBeCloseTo((300 * 2) / 7, 10);
  });

  it("returns zero mass outside the support and throws DOMAIN on a non-integer k", () => {
    const dist = makeBetaBinomial({ n: 5, alpha: 2, beta: 2 });
    expect(dist.pmf(-1)).toBe(0);
    expect(dist.pmf(-100)).toBe(0);
    expect(dist.pmf(6)).toBe(0);
    expect(dist.pmf(1000)).toBe(0);
    expectKernelError(() => dist.pmf(2.5), "DOMAIN");
    expectKernelError(() => dist.pmf(-0.5), "DOMAIN");
    expectKernelError(() => dist.pmf(5.0001), "DOMAIN");
    expectKernelError(() => dist.pmf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.pmf(Number.POSITIVE_INFINITY), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The alpha, beta → ∞ limit is the Binomial
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — the concentration → ∞ limit is Binomial(n, alpha/(alpha+beta))", () => {
  const n = 10;
  const p = 0.3;

  /** Worst RELATIVE deviation from Binomial(n, p) over the whole support. */
  function worstRelativeGap(concentration: number): number {
    const dist = makeBetaBinomial({
      n,
      alpha: p * concentration,
      beta: (1 - p) * concentration,
    });
    let worst = 0;
    for (let k = 0; k <= n; k += 1) {
      worst = Math.max(worst, Math.abs(dist.pmf(k) / binomialPmf(n, k, p) - 1));
    }
    return worst;
  }

  it("at s = 1e6 every mass is within 2e-4 RELATIVE of the binomial (measured 1.05e-4)", () => {
    expect(worstRelativeGap(1e6)).toBeLessThan(2e-4);
  });

  it("the gap shrinks like 1/s: each 10x in s cuts it by at least 5x", () => {
    // Measured: 1.05e-2 -> 1.05e-3 -> 1.05e-4 for s = 1e4, 1e5, 1e6. The
    // leading term of the expansion is O(n²/s), so the ratio is ~10; 5 is the
    // stated safety margin.
    const gaps = [1e4, 1e5, 1e6].map(worstRelativeGap);
    expect(gaps[1]! * 5).toBeLessThan(gaps[0]!);
    expect(gaps[2]! * 5).toBeLessThan(gaps[1]!);
  });

  it("the variance inflation factor (s + n)/(s + 1) collapses to 1 in the same limit", () => {
    const binomialVariance = n * p * (1 - p);
    for (const [s, tolerance] of [
      [1e4, 1e-2],
      [1e6, 1e-4],
    ] as const) {
      const dist = makeBetaBinomial({ n, alpha: p * s, beta: (1 - p) * s });
      expect(Math.abs(dist.variance() / binomialVariance - 1)).toBeLessThan(tolerance);
    }
  });

  it("a small concentration is NOT near-binomial (the check above has teeth)", () => {
    // s = 10 deviates from the binomial by 120x on the worst mass; the bound in
    // the s = 1e6 test would be violated by six orders of magnitude.
    expect(worstRelativeGap(10)).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Moments — analytic formulas against numeric sums over the support
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — moments", () => {
  it("mean = n·alpha/(alpha+beta) and variance = n·alpha·beta·(s+n)/(s²(s+1)), hand-checked", () => {
    // n = 10, alpha = 2, beta = 3 -> mean = 10·2/5 = 4
    // variance = 10·2·3·(5 + 10)/(5²·6) = 900/150 = 6
    const dist = makeBetaBinomial({ n: 10, alpha: 2, beta: 3 });
    expect(dist.mean()).toBeCloseTo(4, 13);
    expect(dist.variance()).toBeCloseTo(6, 13);
  });

  it("the declared moments equal the pmf-weighted sums over {0, …, n}", () => {
    const cases: readonly BetaBinomialParams[] = [
      { n: 0, alpha: 3, beta: 4 },
      { n: 1, alpha: 2, beta: 5 },
      { n: 9, alpha: 1, beta: 1 },
      { n: 14, alpha: 0.6, beta: 2.2 },
      { n: 40, alpha: 12, beta: 4 },
      { n: 100, alpha: 0.4, beta: 0.4 },
      { n: 20, alpha: 0.35 * NEAR_BINOMIAL_CONCENTRATION, beta: 0.65 * NEAR_BINOMIAL_CONCENTRATION },
      { n: 6, alpha: 0.4 * MIN_CONCENTRATION, beta: 0.6 * MIN_CONCENTRATION },
    ];
    for (const params of cases) {
      const dist = makeBetaBinomial(params);
      let m1 = 0;
      let m2 = 0;
      for (let k = 0; k <= params.n; k += 1) {
        const p = dist.pmf(k);
        m1 += k * p;
        m2 += k * k * p;
      }
      expect(m1).toBeCloseTo(dist.mean(), 8);
      expect(m2 - m1 * m1).toBeCloseTo(dist.variance(), 6);
      expect(dist.mean()).toBeCloseTo(analyticMean(params), 11);
      expect(dist.variance()).toBeCloseTo(analyticVariance(params), 10);
    }
  });

  it("variance = binomial variance x (s + n)/(s + 1), and is never below it", () => {
    const cases: readonly BetaBinomialParams[] = [
      { n: 16, alpha: 3, beta: 7 },
      { n: 5, alpha: 0.2, beta: 0.9 },
      { n: 80, alpha: 44, beta: 11 },
    ];
    for (const params of cases) {
      const s = params.alpha + params.beta;
      const mu = params.alpha / s;
      const binomialVariance = params.n * mu * (1 - mu);
      const dist = makeBetaBinomial(params);
      expect(dist.variance()).toBeCloseTo(binomialVariance * ((s + params.n) / (s + 1)), 11);
      // The family's structural limitation: over-dispersion only, never under.
      expect(dist.variance()).toBeGreaterThanOrEqual(binomialVariance - 1e-12);
    }
  });

  it("empirical mean/variance of 60000 fixed-seed draws track the declared moments", () => {
    const params: BetaBinomialParams = { n: 20, alpha: 2, beta: 3 };
    const dist = makeBetaBinomial(params);
    const { mean, variance } = sampleMoments(draw(dist, 60000, 4242));
    expect(mean).toBeCloseTo(analyticMean(params), 1);
    expect(Math.abs(variance / analyticVariance(params) - 1)).toBeLessThan(0.05);
  });

  it("n = 0 is a point mass at 0 with mean 0 and variance 0", () => {
    const dist = makeBetaBinomial({ n: 0, alpha: 2, beta: 5 });
    expect(dist.pmf(0)).toBe(1);
    expect(dist.pmf(1)).toBe(0);
    expect(dist.mean()).toBe(0);
    expect(dist.variance()).toBe(0);
    expect(dist.cdf(0)).toBe(1);
    expect(dist.quantile(0.5)).toBe(0);
    expect(draw(dist, 50, 1).every((x) => x === 0)).toBe(true);
  });

  it("s = 1e-6 is the two-point limit: mean n·p and variance n²·p(1−p)", () => {
    // At s -> 0 the rate is drawn once as 0 or 1, so X is n with probability p
    // and 0 otherwise: mean = n·p, variance = n²·p(1−p).
    const n = 6;
    const p = 0.4;
    const dist = makeBetaBinomial({
      n,
      alpha: p * MIN_CONCENTRATION,
      beta: (1 - p) * MIN_CONCENTRATION,
    });
    expect(dist.mean()).toBeCloseTo(n * p, 10);
    expect(dist.variance()).toBeCloseTo(n * n * p * (1 - p), 4);
    expect(dist.pmf(0) + dist.pmf(n)).toBeGreaterThan(1 - 1e-5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFECT REGRESSION — the moments must never overflow or underflow into NaN
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — moments never return NaN or Infinity (contract rule 3)", () => {
  it("variance() at alpha = beta = 1e120, n = 10 is 2.5, not NaN (s³ overflows)", () => {
    // The raw ratio n·alpha·beta·(s+n) / (s²·(s+1)) sends BOTH numerator and
    // denominator to Infinity once s passes ~5.6e102, leaving Infinity/Infinity.
    // The limit is the binomial: n·mu·(1−mu) = 10·0.25 = 2.5.
    const dist = makeBetaBinomial({ n: 10, alpha: 1e120, beta: 1e120 });
    expect(Number.isNaN(dist.variance())).toBe(false);
    expect(dist.variance()).toBeCloseTo(2.5, 12);
    expect(dist.mean()).toBeCloseTo(5, 12);
  });

  it("variance() at alpha = 4e-201, beta = 6e-201, n = 10 is 24, not NaN (s² underflows)", () => {
    // Mirror failure: s² underflows to 0 below s ~ 1e-154, leaving 0/0. The
    // limit is the two-point law {0 w.p. 0.6, 10 w.p. 0.4}: variance
    // = 100·0.4 − 4² = 24.
    const dist = makeBetaBinomial({ n: 10, alpha: 4e-201, beta: 6e-201 });
    expect(Number.isNaN(dist.variance())).toBe(false);
    expect(dist.variance()).toBeCloseTo(24, 10);
    expect(dist.mean()).toBeCloseTo(4, 12);
  });

  it("variance() at s = 1e-160 is 24 to 10 places, not 24.00198 (partial underflow)", () => {
    // Just above the hard underflow the raw ratio is still evaluable but has
    // already lost four digits.
    const dist = makeBetaBinomial({ n: 10, alpha: 4e-161, beta: 6e-161 });
    expect(dist.variance()).toBeCloseTo(24, 10);
  });

  it("mean() at n = 2e8, alpha = beta = 1e300 is 1e8, not Infinity (n·alpha overflows)", () => {
    // The mean of a distribution on {0, …, n} is bounded by n by definition;
    // returning Infinity is not a rounding artifact, it is a wrong answer.
    const dist = makeBetaBinomial({ n: 2e8, alpha: 1e300, beta: 1e300 });
    expect(Number.isFinite(dist.mean())).toBe(true);
    expect(dist.mean()).toBeCloseTo(1e8, 0);
    expect(dist.mean()).toBeLessThanOrEqual(2e8);
    expect(Number.isFinite(dist.variance())).toBe(true);
    expect(dist.variance()).toBeCloseTo(5e7, 0);
  });

  it("the rewrite is exact on ordinary parameters (still matches the textbook ratio)", () => {
    const cases: readonly BetaBinomialParams[] = [
      { n: 10, alpha: 2, beta: 3 },
      { n: 16, alpha: 3, beta: 7 },
      { n: 200, alpha: 120, beta: 30 },
      { n: 1, alpha: 7, beta: 0.25 },
      { n: 0, alpha: 2, beta: 5 },
      { n: 25, alpha: 0.3, beta: 4 },
      { n: 6, alpha: 4e-7, beta: 6e-7 },
    ];
    for (const params of cases) {
      const dist = makeBetaBinomial(params);
      const target = analyticVariance(params);
      expect(Math.abs(dist.variance() - target)).toBeLessThanOrEqual(
        Math.abs(target) * 1e-15 + Number.EPSILON,
      );
      expect(dist.mean()).toBeCloseTo(analyticMean(params), 12);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cdf
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — cdf", () => {
  it("is the cumulative pmf and is monotone non-decreasing over the whole support", () => {
    const cases: readonly BetaBinomialParams[] = [
      { n: 15, alpha: 1.4, beta: 3.1 },
      { n: 1, alpha: 2, beta: 2 },
      { n: 120, alpha: 0.7, beta: 0.7 },
      { n: 20, alpha: 0.35 * NEAR_BINOMIAL_CONCENTRATION, beta: 0.65 * NEAR_BINOMIAL_CONCENTRATION },
    ];
    for (const params of cases) {
      const dist = makeBetaBinomial(params);
      let running = 0;
      let previous = 0;
      for (let k = 0; k <= params.n; k += 1) {
        running += dist.pmf(k);
        const c = dist.cdf(k);
        expect(c).toBeCloseTo(Math.min(1, running), 8);
        expect(c).toBeGreaterThanOrEqual(previous);
        expect(c).toBeLessThanOrEqual(1);
        previous = c;
      }
    }
  });

  it("cdf(n) is EXACTLY 1 — not a few ulp short — for every parameter set", () => {
    // The sibling neg-binomial slot shipped a cdf that stopped a few ulp under
    // 1 at the top of its truncated support. Here the support is finite, so
    // the analytic total IS 1 and anything else is a defect.
    const cases: readonly BetaBinomialParams[] = [
      { n: 0, alpha: 2, beta: 5 },
      { n: 1, alpha: 1, beta: 1 },
      { n: 15, alpha: 1.4, beta: 3.1 },
      { n: 400, alpha: 6, beta: 9 },
      { n: 25, alpha: 0.3, beta: 4 },
      { n: 20, alpha: 0.35 * NEAR_BINOMIAL_CONCENTRATION, beta: 0.65 * NEAR_BINOMIAL_CONCENTRATION },
      { n: 6, alpha: 0.4 * MIN_CONCENTRATION, beta: 0.6 * MIN_CONCENTRATION },
    ];
    for (const params of cases) {
      const dist = makeBetaBinomial(params);
      expect(dist.cdf(params.n)).toBe(1);
      expect(dist.cdf(params.n + 1)).toBe(1);
      expect(dist.cdf(params.n + 10_000)).toBe(1);
      expect(dist.cdf(Number.MAX_SAFE_INTEGER)).toBe(1);
    }
  });

  it("is exactly 0 everywhere below the support", () => {
    const dist = makeBetaBinomial({ n: 9, alpha: 2, beta: 2 });
    expect(dist.cdf(-1)).toBe(0);
    expect(dist.cdf(-0.5)).toBe(0);
    expect(dist.cdf(-1e9)).toBe(0);
    expect(dist.cdf(-Number.MAX_SAFE_INTEGER)).toBe(0);
  });

  it("is a step function: cdf(x) = cdf(floor(x)) for real x", () => {
    const dist = makeBetaBinomial({ n: 9, alpha: 2, beta: 2 });
    for (let k = 0; k <= 9; k += 1) {
      expect(dist.cdf(k + 0.9)).toBe(dist.cdf(k));
      expect(dist.cdf(k + 0.0001)).toBe(dist.cdf(k));
    }
  });

  it("throws NOT_FINITE for a non-finite argument", () => {
    const dist = makeBetaBinomial({ n: 9, alpha: 2, beta: 2 });
    expectKernelError(() => dist.cdf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.cdf(Number.POSITIVE_INFINITY), "NOT_FINITE");
    expectKernelError(() => dist.cdf(Number.NEGATIVE_INFINITY), "NOT_FINITE");
  });

  it("the lazily grown table is pure: value does not depend on call order or instance", () => {
    const params: BetaBinomialParams = { n: 30, alpha: 2.5, beta: 4.5 };
    const ascending: number[] = [];
    const a = makeBetaBinomial(params);
    for (let k = 0; k <= 30; k += 1) ascending.push(a.cdf(k));

    const descending: number[] = new Array(31);
    const b = makeBetaBinomial(params);
    for (let k = 30; k >= 0; k -= 1) descending[k] = b.cdf(k);

    const perturbed: number[] = [];
    const c = makeBetaBinomial(params);
    c.cdf(1000);
    c.quantile(0.9);
    c.sample(makeRng(1));
    for (let k = 0; k <= 30; k += 1) perturbed.push(c.cdf(k));

    expect(descending).toEqual(ascending);
    expect(perturbed).toEqual(ascending);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// quantile
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — quantile", () => {
  const params: BetaBinomialParams = { n: 24, alpha: 2.5, beta: 4.5 };
  const dist = makeBetaBinomial(params);

  it("is the generalized inverse: smallest k in {0, …, n} with cdf(k) >= p", () => {
    for (const p of [1e-12, 0.001, 0.05, 0.25, 0.5, 0.75, 0.95, 0.999, 1 - 1e-12]) {
      const q = dist.quantile(p);
      expect(Number.isInteger(q)).toBe(true);
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(params.n);
      expect(dist.cdf(q)).toBeGreaterThanOrEqual(p);
      if (q > 0) expect(dist.cdf(q - 1)).toBeLessThan(p);
    }
  });

  it("round-trips through the cdf at every interior support point", () => {
    // Stepping just past cdf(k) must land back on k + 1, and just below on k.
    for (let k = 0; k < params.n; k += 1) {
      const c = dist.cdf(k);
      if (c >= 1) break;
      expect(dist.quantile(c * (1 - 1e-12))).toBeLessThanOrEqual(k);
      expect(dist.quantile(c + (1 - c) * 1e-9)).toBe(k + 1);
    }
  });

  it("quantile(0) = 0 at the lower boundary for every parameter set", () => {
    for (const p of [
      { n: 24, alpha: 2.5, beta: 4.5 },
      { n: 0, alpha: 1, beta: 1 },
      { n: 1, alpha: 9, beta: 0.1 },
      { n: 400, alpha: 6, beta: 9 },
    ] as const) {
      expect(makeBetaBinomial(p).quantile(0)).toBe(0);
    }
  });

  it("quantile(1) is in the support and lands where the cdf is exactly 1", () => {
    for (const p of [
      { n: 24, alpha: 2.5, beta: 4.5 },
      { n: 0, alpha: 1, beta: 1 },
      { n: 1, alpha: 9, beta: 0.1 },
      { n: 400, alpha: 6, beta: 9 },
      { n: 6, alpha: 0.4 * MIN_CONCENTRATION, beta: 0.6 * MIN_CONCENTRATION },
    ] as const) {
      const d = makeBetaBinomial(p);
      const top = d.quantile(1);
      expect(Number.isInteger(top)).toBe(true);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(p.n);
      expect(d.cdf(top)).toBe(1);
      if (top > 0) expect(d.cdf(top - 1)).toBeLessThan(1);
    }
  });

  it("is monotone non-decreasing in p", () => {
    let previous = -1;
    for (let i = 0; i <= 1000; i += 1) {
      const q = dist.quantile(i / 1000);
      expect(q).toBeGreaterThanOrEqual(previous);
      previous = q;
    }
  });

  it("matches the uniform closed form ceil(p·(n+1)) − 1 away from the exact tie points", () => {
    // alpha = beta = 1 => cdf(k) = (k+1)/(n+1) => quantile(p) = ceil(p(n+1)) − 1.
    // Only OFF the ties: at p exactly (k+1)/(n+1) the comparison decides on a
    // cdf that logGamma has already nudged one ulp below the tie, so the
    // generalized inverse legitimately returns k + 1. That is a property of
    // the arithmetic, not a defect, and pinning it would be pinning noise.
    const n = 9;
    const uniform = makeBetaBinomial({ n, alpha: 1, beta: 1 });
    for (const p of [0.05, 0.13, 0.27, 0.34, 0.51, 0.68, 0.79, 0.94]) {
      expect(uniform.quantile(p)).toBe(Math.ceil(p * (n + 1)) - 1);
    }
  });

  it("throws DOMAIN outside [0,1] and NOT_FINITE on NaN", () => {
    expectKernelError(() => dist.quantile(-1e-9), "DOMAIN");
    expectKernelError(() => dist.quantile(-0.1), "DOMAIN");
    expectKernelError(() => dist.quantile(1.0000001), "DOMAIN");
    expectKernelError(() => dist.quantile(1.5), "DOMAIN");
    expectKernelError(() => dist.quantile(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.quantile(Number.POSITIVE_INFINITY), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — sample", () => {
  it("returns integers inside {0, …, n} only", () => {
    for (const params of [
      { n: 11, alpha: 3, beta: 2 },
      { n: 1, alpha: 0.5, beta: 0.5 },
      { n: 0, alpha: 4, beta: 4 },
      { n: 6, alpha: 0.4 * MIN_CONCENTRATION, beta: 0.6 * MIN_CONCENTRATION },
    ] as const) {
      for (const x of draw(makeBetaBinomial(params), 2000, 606)) {
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(params.n);
      }
    }
  });

  it("its histogram tracks the pmf to within 4 standard errors over 200000 draws", () => {
    const params: BetaBinomialParams = { n: 6, alpha: 1.5, beta: 2.5 };
    const dist = makeBetaBinomial(params);
    const draws = 200000;
    const counts = new Array<number>(params.n + 1).fill(0);
    for (const x of draw(dist, draws, 20260825)) counts[x] = counts[x]! + 1;
    for (let k = 0; k <= params.n; k += 1) {
      const theoretical = dist.pmf(k);
      const empirical = counts[k]! / draws;
      const se = Math.sqrt((theoretical * (1 - theoretical)) / draws);
      expect(Math.abs(empirical - theoretical)).toBeLessThan(4 * se + 1e-4);
    }
  });

  it("is deterministic for a fixed seed and differs across seeds", () => {
    const dist = makeBetaBinomial({ n: 11, alpha: 3, beta: 2 });
    expect(draw(dist, 500, 987654)).toEqual(draw(dist, 500, 987654));
    expect(draw(dist, 500, 987654)).not.toEqual(draw(dist, 500, 987655));
  });

  it("a freshly built distribution reproduces the same stream (no hidden state)", () => {
    const params: BetaBinomialParams = { n: 9, alpha: 2.2, beta: 4.5 };
    expect(draw(makeBetaBinomial(params), 300, 4242)).toEqual(
      draw(makeBetaBinomial(params), 300, 4242),
    );
  });

  it("consumes exactly ONE uniform per draw (inverse-cdf, as documented)", () => {
    let calls = 0;
    const inner = makeRng(31337);
    const counting: Rng = () => {
      calls += 1;
      return inner();
    };
    const dist = makeBetaBinomial({ n: 40, alpha: 3, beta: 3 });
    for (let i = 0; i < 250; i += 1) dist.sample(counting);
    expect(calls).toBe(250);
  });

  it("is monotone in u, so a larger uniform never yields a smaller draw", () => {
    const dist = makeBetaBinomial({ n: 30, alpha: 2, beta: 3 });
    let previous = -1;
    for (let i = 0; i < 1000; i += 1) {
      const x = dist.sample(() => i / 1000);
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });

  it("rejects an Rng that leaves [0,1)", () => {
    const dist = makeBetaBinomial({ n: 4, alpha: 1, beta: 1 });
    expectKernelError(() => dist.sample(() => 1), "DOMAIN");
    expectKernelError(() => dist.sample(() => 1.5), "DOMAIN");
    expectKernelError(() => dist.sample(() => -0.1), "DOMAIN");
    expectKernelError(() => dist.sample(() => Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.sample(() => Number.POSITIVE_INFINITY), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// makeBetaBinomial — parameter validation (fail closed)
// ─────────────────────────────────────────────────────────────────────────────

describe("makeBetaBinomial — parameter validation", () => {
  it("throws DOMAIN for a non-positive alpha or beta", () => {
    expectKernelError(() => makeBetaBinomial({ n: 5, alpha: 0, beta: 1 }), "DOMAIN");
    expectKernelError(() => makeBetaBinomial({ n: 5, alpha: -1, beta: 1 }), "DOMAIN");
    expectKernelError(() => makeBetaBinomial({ n: 5, alpha: 1, beta: 0 }), "DOMAIN");
    expectKernelError(() => makeBetaBinomial({ n: 5, alpha: 1, beta: -2.5 }), "DOMAIN");
    expectKernelError(() => makeBetaBinomial({ n: 5, alpha: -0, beta: 1 }), "DOMAIN");
  });

  it("throws DOMAIN for a non-integer or negative n", () => {
    expectKernelError(() => makeBetaBinomial({ n: 2.5, alpha: 1, beta: 1 }), "DOMAIN");
    expectKernelError(() => makeBetaBinomial({ n: -1, alpha: 1, beta: 1 }), "DOMAIN");
    expectKernelError(() => makeBetaBinomial({ n: -0.5, alpha: 1, beta: 1 }), "DOMAIN");
  });

  it("throws NOT_FINITE for NaN or Infinity — the guard is NaN-safe, never fail-open", () => {
    // `assertFinite` runs BEFORE every ordering comparison, so a NaN cannot slip
    // through on the strength of `NaN <= 0` being false.
    expectKernelError(() => makeBetaBinomial({ n: Number.NaN, alpha: 1, beta: 1 }), "NOT_FINITE");
    expectKernelError(
      () => makeBetaBinomial({ n: Number.POSITIVE_INFINITY, alpha: 1, beta: 1 }),
      "NOT_FINITE",
    );
    expectKernelError(() => makeBetaBinomial({ n: 5, alpha: Number.NaN, beta: 1 }), "NOT_FINITE");
    expectKernelError(
      () => makeBetaBinomial({ n: 5, alpha: Number.POSITIVE_INFINITY, beta: 1 }),
      "NOT_FINITE",
    );
    expectKernelError(() => makeBetaBinomial({ n: 5, alpha: 1, beta: Number.NaN }), "NOT_FINITE");
    expectKernelError(
      () => makeBetaBinomial({ n: 5, alpha: 1, beta: Number.POSITIVE_INFINITY }),
      "NOT_FINITE",
    );
    expectKernelError(
      () => makeBetaBinomial({ n: 5, alpha: 1, beta: Number.NEGATIVE_INFINITY }),
      "NOT_FINITE",
    );
  });

  it("accepts n = 0 rather than treating an unused player as an error", () => {
    expect(() => makeBetaBinomial({ n: 0, alpha: 1, beta: 1 })).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitBetaBinomial — fail-closed input validation
// ─────────────────────────────────────────────────────────────────────────────

describe("fitBetaBinomial — input validation", () => {
  it("throws MISMATCHED_LENGTH when the arrays do not align", () => {
    expectKernelError(() => fitBetaBinomial([1, 2], [5]), "MISMATCHED_LENGTH");
    expectKernelError(() => fitBetaBinomial([1], [5, 5]), "MISMATCHED_LENGTH");
    expectKernelError(() => fitBetaBinomial([], [5]), "MISMATCHED_LENGTH");
  });

  it("throws EMPTY on no observations at all", () => {
    expectKernelError(() => fitBetaBinomial([], []), "EMPTY");
  });

  it("throws DOMAIN when successes exceed trials (including 1-of-0)", () => {
    expectKernelError(() => fitBetaBinomial([6], [5]), "DOMAIN");
    expectKernelError(() => fitBetaBinomial([1, 9], [5, 8]), "DOMAIN");
    expectKernelError(() => fitBetaBinomial([1], [0]), "DOMAIN");
  });

  it("throws DOMAIN on a negative count", () => {
    expectKernelError(() => fitBetaBinomial([-1], [5]), "DOMAIN");
    expectKernelError(() => fitBetaBinomial([1], [-5]), "DOMAIN");
    expectKernelError(() => fitBetaBinomial([2, -3], [5, 5]), "DOMAIN");
  });

  it("throws DOMAIN on a non-integer count", () => {
    expectKernelError(() => fitBetaBinomial([1.5], [5]), "DOMAIN");
    expectKernelError(() => fitBetaBinomial([1], [5.5]), "DOMAIN");
    expectKernelError(() => fitBetaBinomial([1, 2], [5, 5.0001]), "DOMAIN");
  });

  it("throws NOT_FINITE on NaN or Infinity in either array", () => {
    expectKernelError(() => fitBetaBinomial([Number.NaN], [5]), "NOT_FINITE");
    expectKernelError(() => fitBetaBinomial([1], [Number.NaN]), "NOT_FINITE");
    expectKernelError(() => fitBetaBinomial([1], [Number.POSITIVE_INFINITY]), "NOT_FINITE");
    expectKernelError(() => fitBetaBinomial([Number.POSITIVE_INFINITY], [5]), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitBetaBinomial — purity
// ─────────────────────────────────────────────────────────────────────────────

describe("fitBetaBinomial — purity", () => {
  it("does not mutate its inputs: FROZEN arrays are accepted without throwing", () => {
    // A moment estimator has no reason to sort or reorder; if it did, this
    // would throw TypeError in strict mode rather than fail an equality check.
    const successes = Object.freeze([9, 2, 5, 0, 7, 3, 11, 1]);
    const trials = Object.freeze([12, 8, 9, 4, 11, 6, 14, 2]);
    let fit: { alpha: number; beta: number } | undefined;
    expect(() => {
      fit = fitBetaBinomial(successes, trials);
    }).not.toThrow();
    expect(fit).toBeDefined();
    // and the frozen arrays came back untouched
    expect([...successes]).toEqual([9, 2, 5, 0, 7, 3, 11, 1]);
    expect([...trials]).toEqual([12, 8, 9, 4, 11, 6, 14, 2]);
  });

  it("leaves mutable inputs byte-for-byte unchanged", () => {
    const successes = [9, 2, 5, 0, 7, 3, 11, 1];
    const trials = [12, 8, 9, 4, 11, 6, 14, 2];
    fitBetaBinomial(successes, trials);
    expect(successes).toEqual([9, 2, 5, 0, 7, 3, 11, 1]);
    expect(trials).toEqual([12, 8, 9, 4, 11, 6, 14, 2]);
  });

  it("is deterministic: repeated calls on the same input return identical parameters", () => {
    const successes = [2, 5, 0, 7, 3];
    const trials = [8, 9, 4, 11, 6];
    expect(fitBetaBinomial(successes, trials)).toEqual(fitBetaBinomial(successes, trials));
  });

  it("is invariant to row order (a pure moment estimator)", () => {
    const successes = [3, 7, 1, 9, 4, 6, 2, 8];
    const trials = [10, 12, 4, 15, 9, 11, 6, 13];
    const forward = fitBetaBinomial(successes, trials);
    const reversed = fitBetaBinomial([...successes].reverse(), [...trials].reverse());
    expect(reversed.alpha).toBeCloseTo(forward.alpha, 12);
    expect(reversed.beta).toBeCloseTo(forward.beta, 12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitBetaBinomial — the moment estimator itself
// ─────────────────────────────────────────────────────────────────────────────

describe("fitBetaBinomial — method of moments, hand computed", () => {
  it("balanced 8x10 rows [3,7,1,9,4,6,2,8]: rho = 17/63, s = 46/17, alpha = beta = 23/17", () => {
    // p̂ = 40/80 = 1/2.  N = 8, n• = 80, Σnᵢ² = 800.
    // A = N − 1 = 7.  B = 80 − 8 − 800/80 + 1 = 63 = (N−1)(n−1) = 7·9.
    // S = Σ nᵢ(p̂ᵢ − p̂)² = 10·(0.04+0.04+0.16+0.16+0.01+0.01+0.09+0.09) = 6.
    // χ² = S/(p̂(1−p̂)) = 6/0.25 = 24.  rho = (24 − 7)/63 = 17/63.
    // s = 1/rho − 1 = 63/17 − 1 = 46/17.  alpha = beta = (1/2)(46/17) = 23/17.
    const fit = fitBetaBinomial([3, 7, 1, 9, 4, 6, 2, 8], [10, 10, 10, 10, 10, 10, 10, 10]);
    expect(fit.alpha).toBeCloseTo(23 / 17, 15);
    expect(fit.beta).toBeCloseTo(23 / 17, 15);
    expect(fit.alpha + fit.beta).toBeCloseTo(46 / 17, 15);
    expect(fit.alpha / (fit.alpha + fit.beta)).toBeCloseTo(0.5, 15);
  });

  it("UNEQUAL trials [0,2,6,8] of [4,4,8,8]: rho = 117/172, alpha = 110/351, beta = 55/351", () => {
    // p̂ = 16/24 = 2/3.  N = 4, n• = 24, Σnᵢ² = 160.
    // A = 3.  B = 24 − 4 − 160/24 + 1 = 43/3.
    // p̂ᵢ = 0, 1/2, 3/4, 1 -> S = 16/9 + 1/9 + 1/18 + 8/9 = 17/6.
    // χ² = (17/6)/((2/3)(1/3)) = 51/4 = 12.75.
    // rho = (12.75 − 3)/(43/3) = 29.25/43 = 117/172.
    // s = 172/117 − 1 = 55/117.  alpha = (2/3)s = 110/351, beta = (1/3)s = 55/351.
    const fit = fitBetaBinomial([0, 2, 6, 8], [4, 4, 8, 8]);
    expect(fit.alpha).toBeCloseTo(110 / 351, 15);
    expect(fit.beta).toBeCloseTo(55 / 351, 15);
    expect(fit.alpha + fit.beta).toBeCloseTo(55 / 117, 15);
  });

  it("reproduces the pooled success rate exactly in the interior case", () => {
    const successes = [3, 7, 1, 9, 4, 6, 2, 8];
    const trials = [10, 12, 4, 15, 9, 11, 6, 13];
    const pooled =
      successes.reduce((a, b) => a + b, 0) / trials.reduce((a, b) => a + b, 0);
    const fit = fitBetaBinomial(successes, trials);
    expect(fit.alpha / (fit.alpha + fit.beta)).toBeCloseTo(pooled, 14);
  });

  it("rows with trials === 0 are dropped and do not change the fit", () => {
    const successes = [3, 7, 1, 9, 4, 6, 2, 8];
    const trials = [10, 10, 10, 10, 10, 10, 10, 10];
    const base = fitBetaBinomial(successes, trials);
    const padded = fitBetaBinomial([...successes, 0, 0, 0], [...trials, 0, 0, 0]);
    expect(padded.alpha).toBeCloseTo(base.alpha, 15);
    expect(padded.beta).toBeCloseTo(base.beta, 15);
  });

  it("a zero-trial row does not count toward N (leading padding is inert too)", () => {
    const base = fitBetaBinomial([3, 7, 1, 9], [10, 10, 10, 10]);
    const padded = fitBetaBinomial([0, 3, 0, 7, 1, 0, 9], [0, 10, 0, 10, 10, 0, 10]);
    expect(padded.alpha).toBeCloseTo(base.alpha, 15);
    expect(padded.beta).toBeCloseTo(base.beta, 15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitBetaBinomial — round trip from an INDEPENDENT seeded generator
// ─────────────────────────────────────────────────────────────────────────────

describe("fitBetaBinomial — recovery from a seeded hierarchical generator", () => {
  // The rows below are built from `makeRng` alone via Gamma/Beta/Binomial
  // helpers defined in this file, sharing no code with the slot, so a shared
  // bug cannot cancel out. Tolerances are RELATIVE and are roughly 2x the
  // measured error, which is itself dominated by the sampling noise of the
  // moment estimator's dispersion term rather than by any bias.

  it("recovers (alpha, beta) = (2, 3) from 6000 rows of 25 trials within 8%", () => {
    const { successes, trials } = generateRows(2, 3, [25], 6000, 424242);
    const fit = fitBetaBinomial(successes, trials);
    expect(Math.abs(fit.alpha / 2 - 1)).toBeLessThan(0.08);
    expect(Math.abs(fit.beta / 3 - 1)).toBeLessThan(0.08);
    // The mean rate is the well-determined quantity and lands much tighter.
    expect(fit.alpha / (fit.alpha + fit.beta)).toBeCloseTo(0.4, 2);
    expect(Math.abs((fit.alpha + fit.beta) / 5 - 1)).toBeLessThan(0.1);
  });

  it("recovers (alpha, beta) = (4, 6) from 5000 rows of 12 trials within 5%", () => {
    const { successes, trials } = generateRows(4, 6, [12], 5000, 20260825);
    const fit = fitBetaBinomial(successes, trials);
    expect(Math.abs(fit.alpha / 4 - 1)).toBeLessThan(0.05);
    expect(Math.abs(fit.beta / 6 - 1)).toBeLessThan(0.05);
  });

  it("recovers the uniform prior (1, 1) from 4000 rows of 20 trials within 10%", () => {
    const { successes, trials } = generateRows(1, 1, [20], 4000, 13579);
    const fit = fitBetaBinomial(successes, trials);
    expect(Math.abs(fit.alpha / 1 - 1)).toBeLessThan(0.1);
    expect(Math.abs(fit.beta / 1 - 1)).toBeLessThan(0.1);
  });

  it("recovers a skewed prior (5, 2) from 5000 rows of 30 trials within 6%", () => {
    const { successes, trials } = generateRows(5, 2, [30], 5000, 97531);
    const fit = fitBetaBinomial(successes, trials);
    expect(Math.abs(fit.alpha / 5 - 1)).toBeLessThan(0.06);
    expect(Math.abs(fit.beta / 2 - 1)).toBeLessThan(0.06);
  });

  it("recovers (4, 6) from UNEQUAL trial counts [3,5,8,12,20] within 8%", () => {
    // The unbalanced Kleinman correction B = n• − N − Σnᵢ²/n• + 1 is what makes
    // this work; the balanced textbook form (N−1)(n−1) is simply wrong here.
    const { successes, trials } = generateRows(4, 6, [3, 5, 8, 12, 20], 8000, 31337);
    const fit = fitBetaBinomial(successes, trials);
    expect(Math.abs(fit.alpha / 4 - 1)).toBeLessThan(0.08);
    expect(Math.abs(fit.beta / 6 - 1)).toBeLessThan(0.08);
    expect(fit.alpha / (fit.alpha + fit.beta)).toBeCloseTo(0.4, 2);
  });

  it("the refitted distribution matches the training data's own moments", () => {
    const n = 16;
    const { successes, trials } = generateRows(3, 5, [n], 5000, 24680);
    const rebuilt = makeBetaBinomial({ n, ...fitBetaBinomial(successes, trials) });
    expect(() => assertDistributionConformance(rebuilt)).not.toThrow();
    const observed = sampleMoments(successes);
    expect(rebuilt.mean()).toBeCloseTo(observed.mean, 6);
    expect(Math.abs(rebuilt.variance() / observed.variance - 1)).toBeLessThan(0.1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitBetaBinomial — documented degeneracies (none of these throw)
// ─────────────────────────────────────────────────────────────────────────────

describe("fitBetaBinomial — documented degeneracies", () => {
  it("every exposure is zero -> the uniform Beta(1, 1), i.e. 'we know nothing'", () => {
    expect(fitBetaBinomial([0, 0, 0], [0, 0, 0])).toEqual({ alpha: 1, beta: 1 });
    expect(fitBetaBinomial([0], [0])).toEqual({ alpha: 1, beta: 1 });
    // and the resulting predictive really is the discrete uniform on 0..n
    const dist = makeBetaBinomial({ n: 4, ...fitBetaBinomial([0], [0]) });
    for (let k = 0; k <= 4; k += 1) expect(dist.pmf(k)).toBeCloseTo(0.2, 12);
  });

  it("all successes (40-for-40) -> Jeffreys rate 40.5/41, never exactly 1", () => {
    const fit = fitBetaBinomial([10, 10, 10, 10], [10, 10, 10, 10]);
    const rate = fit.alpha / (fit.alpha + fit.beta);
    expect(rate).toBeCloseTo(40.5 / 41, 12);
    expect(rate).toBeLessThan(1);
    expect(fit.beta).toBeGreaterThan(0);
    expect(fit.alpha + fit.beta).toBeCloseTo(NEAR_BINOMIAL_CONCENTRATION, 6);
  });

  it("all failures (0-for-20) -> Jeffreys rate 0.5/21, never exactly 0", () => {
    const fit = fitBetaBinomial([0, 0, 0], [7, 9, 4]);
    const rate = fit.alpha / (fit.alpha + fit.beta);
    expect(rate).toBeCloseTo(0.5 / 21, 12);
    expect(rate).toBeGreaterThan(0);
    expect(fit.alpha).toBeGreaterThan(0);
    expect(fit.alpha + fit.beta).toBeCloseTo(NEAR_BINOMIAL_CONCENTRATION, 6);
  });

  it("a SINGLE pair -> near-binomial at that rate (N = 1 leaves B = 0)", () => {
    // B = 10 − 1 − 100/10 + 1 = 0, so within- and between-row variation are
    // not separable and there is no dispersion to estimate.
    const fit = fitBetaBinomial([3], [10]);
    expect(fit.alpha).toBeCloseTo(0.3 * NEAR_BINOMIAL_CONCENTRATION, 6);
    expect(fit.beta).toBeCloseTo(0.7 * NEAR_BINOMIAL_CONCENTRATION, 6);
    expect(fit.alpha / (fit.alpha + fit.beta)).toBeCloseTo(0.3, 14);
  });

  it("all rows are single Bernoulli trials -> near-binomial (B = 0 again)", () => {
    const fit = fitBetaBinomial([1, 0, 1, 1, 0, 0], [1, 1, 1, 1, 1, 1]);
    expect(fit.alpha).toBeCloseTo(0.5 * NEAR_BINOMIAL_CONCENTRATION, 6);
    expect(fit.beta).toBeCloseTo(0.5 * NEAR_BINOMIAL_CONCENTRATION, 6);
  });

  it("UNDER-DISPERSED data, where MoM wants alpha = −5.857, returns the near-binomial fit", () => {
    // successes [5,5,5,5,6,4] of 10 each. p̂ = 30/60 = 1/2, N = 6, Σnᵢ² = 600.
    // A = 5.  B = 60 − 6 − 600/60 + 1 = 45 = (N−1)(n−1).
    // S = 10·(0+0+0+0+0.01+0.01) = 0.2 -> χ² = 0.2/0.25 = 0.8.
    // rho = (0.8 − 5)/45 = −0.09333 <= 0, so s = 1/rho − 1 = −11.714 and the
    // raw moment estimate would be alpha = −5.857, beta = −5.857: negative
    // parameters, an undefined B(alpha, beta), and a NaN pmf downstream. The
    // slot must take the documented near-binomial branch instead of throwing
    // or emitting a negative parameter.
    const fit = fitBetaBinomial([5, 5, 5, 5, 6, 4], [10, 10, 10, 10, 10, 10]);
    expect(fit.alpha).toBeGreaterThan(0);
    expect(fit.beta).toBeGreaterThan(0);
    expect(fit.alpha).toBeCloseTo(0.5 * NEAR_BINOMIAL_CONCENTRATION, 6);
    expect(fit.beta).toBeCloseTo(0.5 * NEAR_BINOMIAL_CONCENTRATION, 6);
    expect(() =>
      assertDistributionConformance(makeBetaBinomial({ n: 10, ...fit })),
    ).not.toThrow();
  });

  it("ZERO observed variance (every row 5-of-10) -> near-binomial, not a division by zero", () => {
    const fit = fitBetaBinomial([5, 5, 5, 5, 5], [10, 10, 10, 10, 10]);
    expect(fit.alpha).toBeCloseTo(0.5 * NEAR_BINOMIAL_CONCENTRATION, 6);
    expect(fit.beta).toBeCloseTo(0.5 * NEAR_BINOMIAL_CONCENTRATION, 6);
    expect(() =>
      assertDistributionConformance(makeBetaBinomial({ n: 10, ...fit })),
    ).not.toThrow();
  });

  it("genuinely binomial data yields at most a whisper of over-dispersion (inflation < 1.02)", () => {
    // Binomial data carries no true over-dispersion, but the moment estimate of
    // rho is NOISY around zero, so the fit does not always land on the 1e6 cap:
    // roughly half the seeds exit at the cap (rho <= 0) and the rest at a large
    // but finite s (rho a hair positive by chance). Asserting the cap would be
    // asserting a coin flip. What IS guaranteed at this sample size is that the
    // implied variance inflation (s + n)/(s + 1) is within a couple of percent
    // of 1 — i.e. the fit is binomial for pricing purposes either way.
    // Measured worst case across these five seeds at 20000 rows: 1.0064.
    for (const seed of [777, 31337, 90210, 424242, 13579]) {
      const rng = makeRng(seed);
      const successes: number[] = [];
      const trials: number[] = [];
      for (let i = 0; i < 20000; i += 1) {
        successes.push(binomialDraw(12, 0.45, rng));
        trials.push(12);
      }
      const fit = fitBetaBinomial(successes, trials);
      const s = fit.alpha + fit.beta;
      expect(s).toBeGreaterThan(1e3);
      expect((s + 12) / (s + 1)).toBeLessThan(1.02);
    }
  });

  it("...and reproduces the pooled rate exactly whichever branch it exits through", () => {
    for (const seed of [777, 31337, 90210, 424242, 13579]) {
      const rng = makeRng(seed);
      const successes: number[] = [];
      const trials: number[] = [];
      for (let i = 0; i < 400; i += 1) {
        successes.push(binomialDraw(12, 0.45, rng));
        trials.push(12);
      }
      const fit = fitBetaBinomial(successes, trials);
      const pooled =
        successes.reduce((a, b) => a + b, 0) / trials.reduce((a, b) => a + b, 0);
      expect(Math.abs(fit.alpha / (fit.alpha + fit.beta) / pooled - 1)).toBeLessThan(1e-14);
    }
  });

  it("ALL-OR-NOTHING data (rho >= 1) -> the s = 1e-6 floor, still strictly positive", () => {
    const successes = [10, 0, 10, 0, 10, 0, 10, 0];
    const trials = [10, 10, 10, 10, 10, 10, 10, 10];
    const fit = fitBetaBinomial(successes, trials);
    expect(fit.alpha).toBeGreaterThan(0);
    expect(fit.beta).toBeGreaterThan(0);
    expect(fit.alpha + fit.beta).toBeCloseTo(MIN_CONCENTRATION, 12);
    expect(fit.alpha / (fit.alpha + fit.beta)).toBeCloseTo(0.5, 12);
    // The predictive puts essentially everything on the two endpoints.
    const dist = makeBetaBinomial({ n: 10, ...fit });
    expect(dist.pmf(0) + dist.pmf(10)).toBeGreaterThan(0.999);
  });

  it("every fit is a strictly positive, finite, buildable (alpha, beta) across a seeded fuzz", () => {
    const rng = makeRng(5150);
    for (let trial = 0; trial < 500; trial += 1) {
      const rows = 1 + Math.floor(rng() * 8);
      const successes: number[] = [];
      const trials: number[] = [];
      for (let i = 0; i < rows; i += 1) {
        const t = Math.floor(rng() * 12);
        successes.push(t === 0 ? 0 : Math.floor(rng() * (t + 1)));
        trials.push(t);
      }
      const fit = fitBetaBinomial(successes, trials);
      expect(Number.isFinite(fit.alpha)).toBe(true);
      expect(Number.isFinite(fit.beta)).toBe(true);
      expect(fit.alpha).toBeGreaterThan(0);
      expect(fit.beta).toBeGreaterThan(0);
      const dist = makeBetaBinomial({ n: 12, ...fit });
      expect(Number.isFinite(dist.mean())).toBe(true);
      expect(Number.isFinite(dist.variance())).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFECT REGRESSION — the positivity fallback must not distort the pooled rate
// ─────────────────────────────────────────────────────────────────────────────

describe("fitBetaBinomial — the positivity fallback is a fallback, not a clamp", () => {
  // Reachable input: seven rows of 1,000,000 exposures with no success, plus a
  // single one-exposure row that hit. rho estimates at ~1.17 >= 1, so the fit
  // takes the all-or-nothing branch with s = MIN_CONCENTRATION = 1e-6, and
  // alpha = p̂·s = 1.43e-13 — under the 1e-12 positivity constant. Clamping UP
  // to 1e-12 silently multiplies the fitted rate by 7 and breaks the fit's
  // headline guarantee that every branch reproduces the pooled rate exactly.
  const successes = [0, 0, 0, 0, 0, 0, 0, 1];
  const trials = [1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1];
  const pooled = 1 / 7000001;

  it("keeps the pooled rate 1/7000001 when alpha falls below the 1e-12 constant", () => {
    const fit = fitBetaBinomial(successes, trials);
    expect(fit.alpha).toBeGreaterThan(0);
    expect(fit.beta).toBeGreaterThan(0);
    expect(Math.abs(fit.alpha / (fit.alpha + fit.beta) / pooled - 1)).toBeLessThan(1e-12);
  });

  it("still exits on the documented s = 1e-6 all-or-nothing floor", () => {
    const fit = fitBetaBinomial(successes, trials);
    expect(fit.alpha + fit.beta).toBeCloseTo(MIN_CONCENTRATION, 12);
    expect(fit.alpha).toBeLessThan(1e-12);
  });

  it("the sub-1e-12 alpha still builds a distribution whose mass sums to 1", () => {
    const dist = makeBetaBinomial({ n: 5, ...fitBetaBinomial(successes, trials) });
    expect(Math.abs(totalMass(dist, 5) - 1)).toBeLessThan(1e-12);
    expect(dist.mean()).toBeCloseTo(5 * pooled, 12);
    expect(dist.cdf(5)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Round trip — every fit must produce a conforming distribution
// ─────────────────────────────────────────────────────────────────────────────

describe("beta-binomial — fit/make round trip", () => {
  it("every documented fit branch produces a conforming distribution", () => {
    const samples: readonly { readonly successes: readonly number[]; readonly trials: readonly number[] }[] = [
      { successes: [3, 7, 1, 9, 4, 6, 2, 8], trials: [10, 10, 10, 10, 10, 10, 10, 10] },
      { successes: [0, 2, 6, 8], trials: [4, 4, 8, 8] },
      { successes: [5, 5, 5, 5, 5], trials: [10, 10, 10, 10, 10] },
      { successes: [10, 10, 10, 10], trials: [10, 10, 10, 10] },
      { successes: [0, 0, 0], trials: [7, 9, 4] },
      { successes: [3], trials: [10] },
      { successes: [0, 0, 0], trials: [0, 0, 0] },
      { successes: [10, 0, 10, 0, 10, 0], trials: [10, 10, 10, 10, 10, 10] },
      { successes: [1, 0, 1, 1, 0, 0], trials: [1, 1, 1, 1, 1, 1] },
    ];
    for (const { successes, trials } of samples) {
      const dist = makeBetaBinomial({ n: 10, ...fitBetaBinomial(successes, trials) });
      expect(() => assertDistributionConformance(dist, { draws: 4000 })).not.toThrow();
    }
  });
});
