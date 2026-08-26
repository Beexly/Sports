import { describe, it, expect } from "vitest";

import {
  KernelError,
  makeRng,
  type CensoredCountParams,
  type DiscreteDistribution,
  type NegBinomialParams,
  type Rng,
  type Support,
} from "../contract.js";
import { assertDistributionConformance } from "../conformance.js";
import { logChoose } from "../numeric.js";
import { makeNegBinomial } from "../slots/neg-binomial.js";
import { makeCensoredCount } from "../slots/censored-count.js";

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

function nb(params: NegBinomialParams): DiscreteDistribution {
  return makeNegBinomial(params);
}

/**
 * The truncation point this slot uses: the smallest k whose cumulative base mass
 * reaches 1 − 1e-12. Recomputed independently here so the tests do not simply
 * echo the implementation's own bookkeeping.
 */
function truncationPoint(base: DiscreteDistribution): number {
  let mass = 0;
  for (let k = base.support().min; k <= 200000; k += 1) {
    mass += base.pmf(k);
    if (mass >= 1 - 1e-12) return k;
  }
  throw new Error("base did not truncate");
}

/** Binom(j, f).pmf(k) through logChoose, exactly as the contract prescribes. */
function binomialPmf(j: number, k: number, f: number): number {
  if (k < 0 || k > j) return 0;
  if (f === 1) return k === j ? 1 : 0;
  return Math.exp(logChoose(j, k) + k * Math.log(f) + (j - k) * Math.log1p(-f));
}

/**
 * Independent brute-force evaluation of the contract's formula
 *   pmf(k) = (1−c)·base.pmf(k) + c·Σ_j base.pmf(j)·Binom(j, f).pmf(k)
 * over the truncated base support. Deliberately O(n) per k and written straight
 * from the contract text, so it shares no code with the precomputed table.
 */
function referencePmf(
  base: DiscreteDistribution,
  c: number,
  f: number,
  hi: number,
  k: number,
): number {
  let thinned = 0;
  for (let j = Math.max(k, base.support().min); j <= hi; j += 1) {
    thinned += base.pmf(j) * binomialPmf(j, k, f);
  }
  return (1 - c) * base.pmf(k) + c * thinned;
}

interface NumericMoments {
  readonly mass: number;
  readonly mean: number;
  readonly variance: number;
}

/** Moments by summation over the composite's own declared support. */
function numericMoments(dist: DiscreteDistribution): NumericMoments {
  const s = dist.support();
  let mass = 0;
  let m1 = 0;
  let m2 = 0;
  for (let k = s.min; k <= s.max; k += 1) {
    const p = dist.pmf(k);
    mass += p;
    m1 += k * p;
    m2 += k * k * p;
  }
  return { mass, mean: m1, variance: m2 - m1 * m1 };
}

/**
 * Justified tolerance for "analytic moment vs numeric sum".
 *
 * The declared moments are those of the UNTRUNCATED base; the numeric sum is over
 * the support truncated at 1e-12 of tail mass. The gap is therefore dominated by
 * the dropped tail's own contribution, bounded by (tail mass) × (a small multiple
 * of hi^order) since the tail decays geometrically past the mode — plus ~n·ε of
 * accumulation rounding, which at n ≤ 5000 is ~1e-12 relative. Hence
 *   order 1: 3e-12·hi + 1e-12·|mean|
 *   order 2: 3e-12·hi² + 1e-9·variance
 * Observed gaps sit a factor 2–5 inside these bounds, so they are tight enough to
 * catch a wrong closed form (which would be off by whole percent) and loose
 * enough to survive the documented truncation.
 */
function momentTolerance(hi: number, order: 1 | 2, magnitude: number): number {
  return order === 1
    ? 3e-12 * hi + 1e-12 * Math.abs(magnitude)
    : 3e-12 * hi * hi + 1e-9 * Math.abs(magnitude);
}

function draw(dist: DiscreteDistribution, n: number, seed: number): number[] {
  const rng = makeRng(seed);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = dist.sample(rng);
  return out;
}

function lowerTailMass(dist: DiscreteDistribution, threshold: number): number {
  return dist.cdf(threshold);
}

function upperTailMass(dist: DiscreteDistribution, threshold: number): number {
  return 1 - dist.cdf(threshold - 1);
}

/** A concrete finite-support distribution built from explicit weights. */
function finiteBase(weights: readonly number[], min = 0): DiscreteDistribution {
  const max = min + weights.length - 1;
  const cum: number[] = [];
  let run = 0;
  for (const w of weights) {
    run += w;
    cum.push(run);
  }
  const support: Support = { min, max };
  const pmf = (k: number): number => {
    if (!Number.isInteger(k)) throw new KernelError("DOMAIN", "integer k required");
    if (k < min || k > max) return 0;
    return weights[k - min]!;
  };
  const cdf = (k: number): number => {
    const floor = Math.floor(k);
    if (floor < min) return 0;
    if (floor >= max) return 1;
    return Math.min(1, cum[floor - min]!);
  };
  const quantile = (p: number): number => {
    if (!(p >= 0 && p <= 1)) throw new KernelError("DOMAIN", "p in [0,1]");
    for (let k = min; k <= max; k += 1) {
      if (cdf(k) >= p) return k;
    }
    return max;
  };
  let mean = 0;
  let second = 0;
  for (let k = min; k <= max; k += 1) {
    mean += k * pmf(k);
    second += k * k * pmf(k);
  }
  const variance = second - mean * mean;
  return {
    kind: "discrete",
    pmf,
    cdf,
    quantile,
    sample: (rng: Rng) => quantile(rng()),
    mean: () => mean,
    variance: () => variance,
    support: () => support,
  };
}

/** A geometric-tailed base on [0, ∞) with retention `q` — for the cap tests. */
function geometricBase(q: number): DiscreteDistribution {
  const support: Support = { min: 0, max: Number.POSITIVE_INFINITY };
  const pmf = (k: number): number => (k < 0 ? 0 : (1 - q) * q ** k);
  return {
    kind: "discrete",
    pmf,
    cdf: (k: number) => (k < 0 ? 0 : 1 - q ** (Math.floor(k) + 1)),
    quantile: () => 0,
    sample: () => 0,
    mean: () => q / (1 - q),
    variance: () => q / ((1 - q) * (1 - q)),
    support: () => support,
  };
}

/** Builds a base object with fields deliberately replaced, for fail-closed tests. */
function brokenBase(overrides: Record<string, unknown>): DiscreteDistribution {
  const sound = finiteBase([0.2, 0.3, 0.5]);
  const merged: Record<string, unknown> = {
    kind: sound.kind,
    pmf: (k: number) => sound.pmf(k),
    cdf: (k: number) => sound.cdf(k),
    quantile: (p: number) => sound.quantile(p),
    sample: (rng: Rng) => sound.sample(rng),
    mean: () => sound.mean(),
    variance: () => sound.variance(),
    support: () => sound.support(),
    ...overrides,
  };
  return merged as unknown as DiscreteDistribution;
}

function params(
  base: DiscreteDistribution,
  censorProbability: number,
  retainedFraction: number,
): CensoredCountParams {
  return { base, censorProbability, retainedFraction };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Conformance — mandatory for every DISTRIBUTION slot
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — distribution conformance", () => {
  const cases: readonly {
    readonly label: string;
    readonly base: NegBinomialParams;
    readonly c: number;
    readonly f: number;
  }[] = [
    { label: "moderate base, moderate censoring", base: { r: 4, p: 0.3 }, c: 0.3, f: 0.5 },
    { label: "blowout star prop (r=8, p=0.25)", base: { r: 8, p: 0.25 }, c: 0.35, f: 0.55 },
    { label: "always censored (c = 1)", base: { r: 12, p: 0.4 }, c: 1, f: 0.4 },
    { label: "never censored (c = 0)", base: { r: 6, p: 0.5 }, c: 0, f: 0.5 },
    { label: "full retention (f = 1)", base: { r: 6, p: 0.5 }, c: 0.5, f: 1 },
    { label: "heavy censoring, low retention", base: { r: 2, p: 0.5 }, c: 0.9, f: 0.1 },
    { label: "geometric base (r = 1)", base: { r: 1, p: 0.4 }, c: 0.45, f: 0.35 },
    {
      label: "near-Poisson base (mean 20.4)",
      base: { r: 1000, p: 0.98 },
      c: 0.3,
      f: 0.5,
    },
  ];

  for (const { label, base, c, f } of cases) {
    it(`conforms: ${label}`, () => {
      const dist = makeCensoredCount(params(nb(base), c, f));
      expect(() => assertDistributionConformance(dist)).not.toThrow();
    });
  }

  it("conforms on a finite-support base", () => {
    const dist = makeCensoredCount(params(finiteBase([0.05, 0.1, 0.2, 0.3, 0.25, 0.1]), 0.4, 0.5));
    expect(() => assertDistributionConformance(dist)).not.toThrow();
  });

  it("conforms on a base whose support starts above zero", () => {
    const dist = makeCensoredCount(params(finiteBase([0.2, 0.3, 0.3, 0.2], 3), 0.5, 0.4));
    expect(() => assertDistributionConformance(dist)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. pmf — the contract's formula, mass, and boundaries
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — pmf", () => {
  it("matches the contract formula evaluated by brute force", () => {
    const base = nb({ r: 5, p: 0.35 });
    const hi = truncationPoint(base);
    for (const [c, f] of [
      [0.3, 0.5],
      [0.65, 0.25],
      [0.1, 0.9],
    ] as const) {
      const dist = makeCensoredCount(params(base, c, f));
      for (let k = 0; k <= hi; k += 1) {
        const expected = referencePmf(base, c, f, hi, k);
        expect(Math.abs(dist.pmf(k) - expected)).toBeLessThanOrEqual(
          1e-15 + 1e-10 * Math.abs(expected),
        );
      }
    }
  });

  it("matches brute force on a finite-support base too", () => {
    const base = finiteBase([0.1, 0.15, 0.25, 0.3, 0.2]);
    const dist = makeCensoredCount(params(base, 0.4, 0.6));
    for (let k = 0; k <= 4; k += 1) {
      expect(dist.pmf(k)).toBeCloseTo(referencePmf(base, 0.4, 0.6, 4, k), 14);
    }
  });

  it("sums to 1 to ~1e-12 across a (c, f) grid", () => {
    const base = nb({ r: 6, p: 0.3 });
    for (const c of [0, 0.15, 0.4, 0.75, 1]) {
      for (const f of [0.1, 0.35, 0.6, 0.85, 1]) {
        const dist = makeCensoredCount(params(base, c, f));
        expect(Math.abs(numericMoments(dist).mass - 1)).toBeLessThan(1e-12);
      }
    }
  });

  it("sums to 1 at the extreme c = 1 with a vanishing retention", () => {
    const base = nb({ r: 4, p: 0.25 });
    for (const f of [1e-12, 1e-6, 1e-3]) {
      const dist = makeCensoredCount(params(base, 1, f));
      expect(Math.abs(numericMoments(dist).mass - 1)).toBeLessThan(1e-12);
    }
  });

  it("sums to 1 at c = 1 with f the largest double strictly below 1", () => {
    const f = 1 - Number.EPSILON / 2 === 1 ? 1 - Number.EPSILON : 1 - Number.EPSILON / 2;
    expect(f).toBeLessThan(1);
    const dist = makeCensoredCount(params(nb({ r: 3, p: 0.4 }), 1, f));
    expect(Math.abs(numericMoments(dist).mass - 1)).toBeLessThan(1e-12);
  });

  it("is non-negative everywhere on the support", () => {
    const dist = makeCensoredCount(params(nb({ r: 2.5, p: 0.15 }), 0.5, 0.3));
    const s = dist.support();
    for (let k = s.min; k <= s.max; k += 1) {
      expect(dist.pmf(k)).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns 0 below the support and above the truncation point", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    const s = dist.support();
    expect(dist.pmf(-1)).toBe(0);
    expect(dist.pmf(-25)).toBe(0);
    expect(dist.pmf(s.max + 1)).toBe(0);
    expect(dist.pmf(s.max + 5000)).toBe(0);
  });

  it("throws DOMAIN on a non-integer k", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    expectKernelError(() => dist.pmf(0.5), "DOMAIN");
    expectKernelError(() => dist.pmf(3.0001), "DOMAIN");
    expectKernelError(() => dist.pmf(-2.5), "DOMAIN");
  });

  it("throws NOT_FINITE on a NaN or infinite k", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    expectKernelError(() => dist.pmf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.pmf(Number.POSITIVE_INFINITY), "NOT_FINITE");
  });

  it("drops less than 1e-12 of base mass at the truncation point", () => {
    for (const p of [0.5, 0.3, 0.15]) {
      const base = nb({ r: 4, p });
      const hi = truncationPoint(base);
      let carried = 0;
      for (let k = 0; k <= hi; k += 1) carried += base.pmf(k);
      expect(1 - carried).toBeLessThan(1e-12);
    }
  });

  it("is stable across repeated calls (the precomputed table is not mutated)", () => {
    const dist = makeCensoredCount(params(nb({ r: 5, p: 0.3 }), 0.4, 0.45));
    const first = dist.pmf(7);
    for (let i = 0; i < 25; i += 1) expect(dist.pmf(7)).toBe(first);
  });

  it("is a pure function of its params — two builds agree bit-for-bit", () => {
    const spec = params(nb({ r: 5, p: 0.3 }), 0.4, 0.45);
    const a = makeCensoredCount(spec);
    const b = makeCensoredCount(spec);
    for (let k = 0; k <= a.support().max; k += 1) expect(a.pmf(k)).toBe(b.pmf(k));
    expect(a.mean()).toBe(b.mean());
    expect(a.variance()).toBe(b.variance());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Degenerate cases — the two EXACT identities and the two extremes
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — c = 0 reproduces the base EXACTLY", () => {
  it("returns bit-identical pmf values over the support", () => {
    const base = nb({ r: 7, p: 0.35 });
    const dist = makeCensoredCount(params(base, 0, 0.4));
    const s = dist.support();
    for (let k = s.min; k <= s.max; k += 1) {
      expect(dist.pmf(k)).toBe(base.pmf(k));
    }
  });

  it("is exact for every retention f, not just one", () => {
    const base = nb({ r: 3, p: 0.5 });
    for (const f of [1e-9, 0.2, 0.5, 0.999, 1]) {
      const dist = makeCensoredCount(params(base, 0, f));
      for (let k = 0; k <= dist.support().max; k += 1) {
        expect(dist.pmf(k)).toBe(base.pmf(k));
      }
    }
  });

  it("returns the base mean and variance bit-for-bit", () => {
    const base = nb({ r: 7, p: 0.35 });
    const dist = makeCensoredCount(params(base, 0, 0.4));
    expect(dist.mean()).toBe(base.mean());
    expect(dist.variance()).toBe(base.variance());
  });

  it("keeps the base's own support minimum", () => {
    const base = finiteBase([0.25, 0.25, 0.25, 0.25], 4);
    const dist = makeCensoredCount(params(base, 0, 0.5));
    expect(dist.support().min).toBe(4);
    expect(dist.pmf(0)).toBe(0);
  });

  it("agrees with the base cdf over the whole support", () => {
    const base = nb({ r: 5, p: 0.4 });
    const dist = makeCensoredCount(params(base, 0, 0.6));
    for (let k = 0; k < dist.support().max; k += 1) {
      expect(dist.cdf(k)).toBeCloseTo(base.cdf(k), 12);
    }
  });
});

describe("makeCensoredCount — f = 1 reproduces the base EXACTLY", () => {
  it("returns bit-identical pmf values for every censor probability", () => {
    const base = nb({ r: 6, p: 0.4 });
    for (const c of [0, 0.01, 0.25, 0.5, 0.777, 1]) {
      const dist = makeCensoredCount(params(base, c, 1));
      for (let k = 0; k <= dist.support().max; k += 1) {
        expect(dist.pmf(k)).toBe(base.pmf(k));
      }
    }
  });

  it("returns the base mean and variance bit-for-bit for every c", () => {
    const base = nb({ r: 6, p: 0.4 });
    for (const c of [0, 0.25, 0.5, 1]) {
      const dist = makeCensoredCount(params(base, c, 1));
      expect(dist.mean()).toBe(base.mean());
      expect(dist.variance()).toBe(base.variance());
    }
  });

  it("matches the point-mass reading of Binom(j, 1) term by term", () => {
    const base = finiteBase([0.1, 0.2, 0.4, 0.3]);
    for (let j = 0; j <= 3; j += 1) {
      for (let k = 0; k <= 3; k += 1) {
        expect(binomialPmf(j, k, 1)).toBe(k === j ? 1 : 0);
      }
    }
    const dist = makeCensoredCount(params(base, 0.6, 1));
    for (let k = 0; k <= 3; k += 1) expect(dist.pmf(k)).toBe(base.pmf(k));
  });

  it("keeps the base's own support minimum", () => {
    const base = finiteBase([0.5, 0.5], 2);
    const dist = makeCensoredCount(params(base, 0.8, 1));
    expect(dist.support().min).toBe(2);
  });
});

describe("makeCensoredCount — c = 1 is the pure thinning", () => {
  it("equals Σ_j base.pmf(j)·Binom(j, f).pmf(k) with no base term", () => {
    const base = nb({ r: 5, p: 0.3 });
    const hi = truncationPoint(base);
    const f = 0.4;
    const dist = makeCensoredCount(params(base, 1, f));
    for (let k = 0; k <= hi; k += 1) {
      let thinned = 0;
      for (let j = k; j <= hi; j += 1) thinned += base.pmf(j) * binomialPmf(j, k, f);
      expect(Math.abs(dist.pmf(k) - thinned)).toBeLessThanOrEqual(1e-15 + 1e-10 * thinned);
    }
  });

  it("has mean f·μ and variance f(1−f)μ + f²σ²", () => {
    const base = nb({ r: 9, p: 0.3 });
    const mu = base.mean();
    const s2 = base.variance();
    for (const f of [0.1, 0.35, 0.6, 0.9]) {
      const dist = makeCensoredCount(params(base, 1, f));
      expect(dist.mean()).toBeCloseTo(f * mu, 10);
      expect(dist.variance()).toBeCloseTo(f * (1 - f) * mu + f * f * s2, 8);
    }
  });

  it("collapses toward a point mass at 0 as f → 0⁺", () => {
    const base = nb({ r: 4, p: 0.25 });
    const mu = base.mean();
    for (const f of [1e-3, 1e-6, 1e-9]) {
      const dist = makeCensoredCount(params(base, 1, f));
      expect(dist.pmf(0)).toBeGreaterThan(1 - 2 * f * mu);
      expect(dist.mean()).toBeCloseTo(f * mu, 15);
      expect(dist.quantile(0.5)).toBe(0);
    }
  });

  it("never produces a value above the base's truncation point", () => {
    const base = nb({ r: 5, p: 0.3 });
    const dist = makeCensoredCount(params(base, 1, 0.5));
    expect(dist.support().max).toBe(truncationPoint(base));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Support — censoring only moves mass DOWN
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — support", () => {
  it("upper bound is the truncated base upper bound, independent of (c, f)", () => {
    const base = nb({ r: 6, p: 0.3 });
    const hi = truncationPoint(base);
    for (const [c, f] of [
      [0, 0.5],
      [0.2, 0.9],
      [0.5, 0.5],
      [1, 0.05],
      [0.4, 1],
    ] as const) {
      expect(makeCensoredCount(params(base, c, f)).support().max).toBe(hi);
    }
  });

  it("lower bound drops to 0 when the censoring branch is live", () => {
    const base = finiteBase([0.2, 0.3, 0.3, 0.2], 3);
    expect(base.support().min).toBe(3);
    const dist = makeCensoredCount(params(base, 0.5, 0.4));
    expect(dist.support().min).toBe(0);
    expect(dist.pmf(0)).toBeGreaterThan(0);
    expect(dist.pmf(1)).toBeGreaterThan(0);
    expect(dist.pmf(2)).toBeGreaterThan(0);
  });

  it("puts exactly the thinning's zero mass at 0", () => {
    const base = finiteBase([0.25, 0.25, 0.25, 0.25], 3);
    const c = 0.5;
    const f = 0.4;
    const dist = makeCensoredCount(params(base, c, f));
    let expected = 0;
    for (let j = 3; j <= 6; j += 1) expected += base.pmf(j) * (1 - f) ** j;
    expect(dist.pmf(0)).toBeCloseTo(c * expected, 14);
  });

  it("keeps the base's lower bound when the branch is not live", () => {
    const base = finiteBase([0.2, 0.3, 0.3, 0.2], 3);
    expect(makeCensoredCount(params(base, 0, 0.4)).support().min).toBe(3);
    expect(makeCensoredCount(params(base, 0.5, 1)).support().min).toBe(3);
  });

  it("uses a finite base's declared maximum as the upper bound", () => {
    const dist = makeCensoredCount(params(finiteBase([0.1, 0.2, 0.3, 0.4]), 0.4, 0.5));
    expect(dist.support().max).toBe(3);
  });

  it("returns the same Support object shape on every call", () => {
    const dist = makeCensoredCount(params(nb({ r: 3, p: 0.4 }), 0.3, 0.5));
    expect(dist.support()).toEqual(dist.support());
    expect(dist.kind).toBe("discrete");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Moments — analytic closed forms proved against numeric summation
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — analytic mean and variance", () => {
  const grid: readonly { readonly base: NegBinomialParams; readonly c: number; readonly f: number }[] =
    [
      { base: { r: 4, p: 0.3 }, c: 0.2, f: 0.5 },
      { base: { r: 4, p: 0.3 }, c: 0.5, f: 0.25 },
      { base: { r: 8, p: 0.25 }, c: 0.35, f: 0.55 },
      { base: { r: 8, p: 0.25 }, c: 0.9, f: 0.8 },
      { base: { r: 12, p: 0.4 }, c: 0.4, f: 0.4 },
      { base: { r: 1, p: 0.35 }, c: 0.6, f: 0.3 },
      { base: { r: 20, p: 0.5 }, c: 0.5, f: 0.5 },
      { base: { r: 1000, p: 0.98 }, c: 0.3, f: 0.5 },
      { base: { r: 2.5, p: 0.2 }, c: 0.75, f: 0.65 },
    ];

  for (const { base, c, f } of grid) {
    it(`mean matches the numeric sum: NB(${base.r}, ${base.p}) c=${c} f=${f}`, () => {
      const dist = makeCensoredCount(params(nb(base), c, f));
      const numeric = numericMoments(dist);
      const hi = dist.support().max;
      expect(Math.abs(numeric.mean - dist.mean())).toBeLessThanOrEqual(
        momentTolerance(hi, 1, dist.mean()),
      );
    });

    it(`variance matches the numeric sum: NB(${base.r}, ${base.p}) c=${c} f=${f}`, () => {
      const dist = makeCensoredCount(params(nb(base), c, f));
      const numeric = numericMoments(dist);
      const hi = dist.support().max;
      expect(Math.abs(numeric.variance - dist.variance())).toBeLessThanOrEqual(
        momentTolerance(hi, 2, dist.variance()),
      );
    });
  }

  it("the evaluated mean equals the contract's (1−c)μ + c·f·μ form", () => {
    for (const { base, c, f } of grid) {
      const b = nb(base);
      const mu = b.mean();
      const dist = makeCensoredCount(params(b, c, f));
      expect(dist.mean()).toBeCloseTo((1 - c) * mu + c * f * mu, 12);
    }
  });

  it("the factored variance equals the expanded law-of-total-variance form", () => {
    for (const { base, c, f } of grid) {
      const b = nb(base);
      const mu = b.mean();
      const s2 = b.variance();
      const expanded =
        (1 - c) * s2 + c * f * (1 - f) * mu + c * f * f * s2 + c * (1 - c) * (1 - f) ** 2 * mu * mu;
      const dist = makeCensoredCount(params(b, c, f));
      expect(dist.variance()).toBeCloseTo(expanded, 9);
    }
  });

  it("carries the mixture term c(1−c)(1−f)²μ², which a naive derivation drops", () => {
    // The classic bug is returning only E[Var(X|B)] and dropping Var(E[X|B]).
    // Assert the real variance exceeds the buggy one by exactly that term.
    const b = nb({ r: 8, p: 0.25 });
    const mu = b.mean();
    const s2 = b.variance();
    const c = 0.35;
    const f = 0.55;
    const innerOnly = (1 - c) * s2 + c * (f * (1 - f) * mu + f * f * s2);
    const between = c * (1 - c) * (1 - f) ** 2 * mu * mu;
    expect(between).toBeGreaterThan(0.2 * innerOnly);
    expect(makeCensoredCount(params(b, c, f)).variance()).toBeCloseTo(innerOnly + between, 9);
  });

  it("carries the f(1−f)E[J] term of the random sum, which a scale reading drops", () => {
    // Var(Binom(J,f)) = f(1−f)E[J] + f²Var(J); treating the thinning as the
    // deterministic scale f·J would give only f²Var(J).
    const b = nb({ r: 9, p: 0.5 });
    const mu = b.mean();
    const s2 = b.variance();
    const f = 0.5;
    const dist = makeCensoredCount(params(b, 1, f));
    expect(dist.variance()).toBeCloseTo(f * (1 - f) * mu + f * f * s2, 9);
    expect(dist.variance()).toBeGreaterThan(f * f * s2 * 1.2);
  });

  it("mean decreases in c and increases in f", () => {
    const b = nb({ r: 6, p: 0.3 });
    let previous = Number.POSITIVE_INFINITY;
    for (const c of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const m = makeCensoredCount(params(b, c, 0.5)).mean();
      expect(m).toBeLessThan(previous);
      previous = m;
    }
    let rising = Number.NEGATIVE_INFINITY;
    for (const f of [0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      const m = makeCensoredCount(params(b, 0.5, f)).mean();
      expect(m).toBeGreaterThan(rising);
      rising = m;
    }
  });

  it("declared moments are non-negative across the grid", () => {
    for (const { base, c, f } of grid) {
      const dist = makeCensoredCount(params(nb(base), c, f));
      expect(dist.mean()).toBeGreaterThanOrEqual(0);
      expect(dist.variance()).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. THE TWO-TAIL CLAIM — the edge this slot exists to express
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The comparison is the book's model: the SAME base family, mean-matched to the
 * censored law by shrinking the volume projection. For NB(r, p) with mean
 * r(1−p)/p, scaling `r` by the mean shrink factor (1 − c(1 − f)) matches the mean
 * exactly while leaving the family's dispersion ratio Var/E = 1/p untouched —
 * i.e. "same model, lower projection", which is precisely a mean shift.
 */
function meanShiftedComparison(
  base: NegBinomialParams,
  c: number,
  f: number,
): DiscreteDistribution {
  return nb({ r: base.r * (1 - c * (1 - f)), p: base.p });
}

describe("makeCensoredCount — mean-shifting misprices BOTH tails", () => {
  it("headline case: a heavy favourite's star prop, both tails strictly heavier", () => {
    const baseParams: NegBinomialParams = { r: 8, p: 0.25 };
    const c = 0.35;
    const f = 0.55;
    const censored = makeCensoredCount(params(nb(baseParams), c, f));
    const shifted = meanShiftedComparison(baseParams, c, f);

    // Means agree to machine precision — the book has "corrected" for the
    // blowout, and by its own point-estimate standard it is right.
    expect(censored.mean()).toBeCloseTo(shifted.mean(), 10);

    // Thresholds at ±1.25 sd of the book's own law, pinned so the case cannot
    // drift silently.
    const mu = shifted.mean();
    const sd = Math.sqrt(shifted.variance());
    const low = Math.round(mu - 1.25 * sd);
    const high = Math.round(mu + 1.25 * sd);
    expect(low).toBe(9);
    expect(high).toBe(31);

    const censoredLow = lowerTailMass(censored, low);
    const shiftedLow = lowerTailMass(shifted, low);
    const censoredHigh = upperTailMass(censored, high);
    const shiftedHigh = upperTailMass(shifted, high);

    expect(censoredLow).toBeGreaterThan(shiftedLow * 1.1);
    expect(censoredHigh).toBeGreaterThan(shiftedHigh * 1.1);
  });

  const regime: readonly {
    readonly label: string;
    readonly base: NegBinomialParams;
    readonly c: number;
    readonly f: number;
  }[] = [
    { label: "star RB carries", base: { r: 8, p: 0.25 }, c: 0.35, f: 0.55 },
    { label: "WR targets", base: { r: 4, p: 0.3 }, c: 0.25, f: 0.5 },
    { label: "QB attempts", base: { r: 12, p: 0.4 }, c: 0.4, f: 0.4 },
    { label: "tight dispersion", base: { r: 20, p: 0.5 }, c: 0.5, f: 0.5 },
    { label: "near-Poisson volume", base: { r: 1000, p: 0.98 }, c: 0.3, f: 0.5 },
    { label: "heavy tail, severe truncation", base: { r: 6, p: 0.2 }, c: 0.6, f: 0.3 },
  ];

  for (const { label, base, c, f } of regime) {
    for (const z of [1, 1.25, 1.5]) {
      it(`${label}: more low-tail AND more high-tail mass at ±${z} sd`, () => {
        const censored = makeCensoredCount(params(nb(base), c, f));
        const shifted = meanShiftedComparison(base, c, f);
        expect(censored.mean()).toBeCloseTo(shifted.mean(), 8);

        const mu = shifted.mean();
        const sd = Math.sqrt(shifted.variance());
        const low = Math.max(0, Math.round(mu - z * sd));
        const high = Math.round(mu + z * sd);

        expect(lowerTailMass(censored, low)).toBeGreaterThan(lowerTailMass(shifted, low));
        expect(upperTailMass(censored, high)).toBeGreaterThan(upperTailMass(shifted, high));
      });
    }
  }

  it("the excess is a mixture effect: the middle is correspondingly lighter", () => {
    const base: NegBinomialParams = { r: 12, p: 0.4 };
    const c = 0.4;
    const f = 0.4;
    const censored = makeCensoredCount(params(nb(base), c, f));
    const shifted = meanShiftedComparison(base, c, f);
    const mu = shifted.mean();
    const sd = Math.sqrt(shifted.variance());
    const low = Math.round(mu - sd);
    const high = Math.round(mu + sd);
    const censoredMiddle = censored.cdf(high - 1) - censored.cdf(low);
    const shiftedMiddle = shifted.cdf(high - 1) - shifted.cdf(low);
    expect(censoredMiddle).toBeLessThan(shiftedMiddle);
  });

  it("carries more variance than the mean-matched shift across the regime", () => {
    for (const { base, c, f } of regime) {
      const censored = makeCensoredCount(params(nb(base), c, f));
      const shifted = meanShiftedComparison(base, c, f);
      expect(censored.variance()).toBeGreaterThan(shifted.variance());
    }
  });

  it("BOUNDARY: the claim is not universal — mild censoring on a near-geometric base", () => {
    // Documented counter-case, asserted so nobody mistakes the header's argument
    // for a theorem. Binomial thinning REDUCES relative dispersion — Var/E of
    // Binom(J,f) is (1−f) + f·Var(J)/E[J] — so on a violently over-dispersed base
    // (here Var/E = 5) with mild truncation (f = 0.8) the thinned component is
    // TIGHTER than the mean-shifted comparison and the low tail flips.
    const base: NegBinomialParams = { r: 6, p: 0.2 };
    const c = 0.15;
    const f = 0.8;
    const censored = makeCensoredCount(params(nb(base), c, f));
    const shifted = meanShiftedComparison(base, c, f);
    const mu = shifted.mean();
    const sd = Math.sqrt(shifted.variance());
    const low = Math.round(mu - 1.5 * sd);
    const high = Math.round(mu + 1.5 * sd);

    // The HIGH tail still behaves as the header claims …
    expect(upperTailMass(censored, high)).toBeGreaterThan(upperTailMass(shifted, high));
    // … but the LOW tail does not, and the slot does not pretend otherwise.
    expect(lowerTailMass(censored, low)).toBeLessThan(lowerTailMass(shifted, low));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. cdf, quantile, sample
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — cdf", () => {
  it("is non-decreasing and reaches exactly 1 at the support maximum", () => {
    for (const [c, f] of [
      [0, 0.4],
      [0.3, 0.5],
      [1, 0.2],
      [0.6, 1],
    ] as const) {
      const dist = makeCensoredCount(params(nb({ r: 5, p: 0.3 }), c, f));
      const s = dist.support();
      let previous = -1;
      for (let k = s.min; k <= s.max; k += 1) {
        const value = dist.cdf(k);
        expect(value).toBeGreaterThanOrEqual(previous);
        expect(value).toBeLessThanOrEqual(1);
        previous = value;
      }
      expect(dist.cdf(s.max)).toBe(1);
      expect(dist.cdf(s.max + 1)).toBe(1);
      expect(dist.cdf(1e9)).toBe(1);
    }
  });

  it("equals the cumulative pmf at every index", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.45, 0.35));
    const s = dist.support();
    let running = 0;
    for (let k = s.min; k <= s.max; k += 1) {
      running += dist.pmf(k);
      expect(Math.abs(dist.cdf(k) - running)).toBeLessThan(1e-12);
    }
  });

  it("floors a real argument (step function on integers)", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    for (const k of [2, 5, 9]) {
      expect(dist.cdf(k + 0.9999)).toBe(dist.cdf(k));
      expect(dist.cdf(k + 0.5)).toBe(dist.cdf(k));
    }
  });

  it("is 0 below the support", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    expect(dist.cdf(-1)).toBe(0);
    expect(dist.cdf(-0.5)).toBe(0);
    expect(dist.cdf(-1e9)).toBe(0);
    const shifted = makeCensoredCount(params(finiteBase([0.5, 0.5], 4), 0, 0.5));
    expect(shifted.cdf(3)).toBe(0);
  });

  it("throws NOT_FINITE on a NaN or infinite argument", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    expectKernelError(() => dist.cdf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.cdf(Number.NEGATIVE_INFINITY), "NOT_FINITE");
  });
});

describe("makeCensoredCount — quantile", () => {
  it("round-trips: cdf(quantile(p)) >= p and the result is minimal", () => {
    const dist = makeCensoredCount(params(nb({ r: 6, p: 0.3 }), 0.4, 0.45));
    const s = dist.support();
    for (const p of [1e-12, 1e-6, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 1 - 1e-9, 1]) {
      const q = dist.quantile(p);
      expect(Number.isInteger(q)).toBe(true);
      expect(q).toBeGreaterThanOrEqual(s.min);
      expect(q).toBeLessThanOrEqual(s.max);
      expect(dist.cdf(q)).toBeGreaterThanOrEqual(p - 1e-15);
      if (q > s.min) expect(dist.cdf(q - 1)).toBeLessThan(p);
    }
  });

  it("inverts its own cdf on every support point", () => {
    const dist = makeCensoredCount(params(nb({ r: 3, p: 0.4 }), 0.5, 0.4));
    const s = dist.support();
    for (let k = s.min; k <= s.max; k += 1) {
      const value = dist.cdf(k);
      if (value <= 0 || value >= 1) continue;
      expect(dist.quantile(value)).toBeLessThanOrEqual(k);
    }
  });

  it("maps 0 to the support minimum and 1 to the support maximum", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.4, 0.5));
    expect(dist.quantile(0)).toBe(dist.support().min);
    expect(dist.quantile(1)).toBe(dist.support().max);
  });

  it("respects a base whose support starts above zero when not censoring", () => {
    const dist = makeCensoredCount(params(finiteBase([0.5, 0.5], 6), 0, 0.5));
    expect(dist.quantile(0)).toBe(6);
    expect(dist.quantile(1)).toBe(7);
  });

  it("is non-decreasing in p", () => {
    const dist = makeCensoredCount(params(nb({ r: 5, p: 0.35 }), 0.35, 0.5));
    let previous = -1;
    for (let i = 0; i <= 200; i += 1) {
      const q = dist.quantile(i / 200);
      expect(q).toBeGreaterThanOrEqual(previous);
      previous = q;
    }
  });

  it("throws DOMAIN outside [0, 1] and NOT_FINITE on NaN", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    expectKernelError(() => dist.quantile(1.5), "DOMAIN");
    expectKernelError(() => dist.quantile(-0.1), "DOMAIN");
    expectKernelError(() => dist.quantile(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.quantile(Number.POSITIVE_INFINITY), "NOT_FINITE");
  });
});

describe("makeCensoredCount — sample", () => {
  it("returns non-negative integers inside the support", () => {
    const dist = makeCensoredCount(params(nb({ r: 5, p: 0.3 }), 0.4, 0.5));
    const s = dist.support();
    for (const x of draw(dist, 5000, 99)) {
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeGreaterThanOrEqual(s.min);
      expect(x).toBeLessThanOrEqual(s.max);
    }
  });

  it("empirical frequencies track the pmf", () => {
    const dist = makeCensoredCount(params(nb({ r: 6, p: 0.4 }), 0.4, 0.5));
    const n = 60000;
    const counts = new Map<number, number>();
    for (const x of draw(dist, n, 20240811)) counts.set(x, (counts.get(x) ?? 0) + 1);
    for (let k = 0; k <= dist.support().max; k += 1) {
      const p = dist.pmf(k);
      if (p < 0.005) continue;
      const empirical = (counts.get(k) ?? 0) / n;
      const band = 4 * Math.sqrt((p * (1 - p)) / n);
      expect(Math.abs(empirical - p)).toBeLessThan(band);
    }
  });

  it("empirical mean and variance track the declared moments", () => {
    const dist = makeCensoredCount(params(nb({ r: 8, p: 0.25 }), 0.35, 0.55));
    const xs = draw(dist, 60000, 4242);
    const n = xs.length;
    let sum = 0;
    for (const x of xs) sum += x;
    const mean = sum / n;
    let ss = 0;
    for (const x of xs) ss += (x - mean) * (x - mean);
    const variance = ss / (n - 1);
    expect(mean).toBeCloseTo(dist.mean(), 0);
    expect(Math.abs(variance - dist.variance())).toBeLessThan(0.15 * dist.variance());
  });

  it("is reproducible under a fixed seed", () => {
    const dist = makeCensoredCount(params(nb({ r: 5, p: 0.3 }), 0.4, 0.5));
    expect(draw(dist, 400, 7)).toEqual(draw(dist, 400, 7));
  });

  it("consumes exactly one uniform per draw", () => {
    const dist = makeCensoredCount(params(nb({ r: 5, p: 0.3 }), 0.4, 0.5));
    let calls = 0;
    const inner = makeRng(11);
    const counting: Rng = () => {
      calls += 1;
      return inner();
    };
    for (let i = 0; i < 250; i += 1) dist.sample(counting);
    expect(calls).toBe(250);
  });

  it("is monotone in the uniform it is given", () => {
    const dist = makeCensoredCount(params(nb({ r: 5, p: 0.3 }), 0.4, 0.5));
    let previous = -1;
    for (let i = 0; i < 100; i += 1) {
      const u = i / 100;
      const x = dist.sample(() => u);
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });

  it("rejects an rng outside [0, 1)", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.3, 0.5));
    expectKernelError(() => dist.sample(() => 1), "DOMAIN");
    expectKernelError(() => dist.sample(() => 1.5), "DOMAIN");
    expectKernelError(() => dist.sample(() => -0.1), "DOMAIN");
    expectKernelError(() => dist.sample(() => Number.NaN), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Fail-closed — every invalid input throws a documented KernelError code
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — retainedFraction domain (0, 1]", () => {
  const base = nb({ r: 4, p: 0.3 });

  it("rejects f = 0 with DOMAIN (the contract's interval is half-open)", () => {
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 0)), "DOMAIN");
  });

  it("rejects f = -0 with DOMAIN", () => {
    expectKernelError(() => makeCensoredCount(params(base, 0.3, -0)), "DOMAIN");
  });

  it("rejects a negative f with DOMAIN", () => {
    expectKernelError(() => makeCensoredCount(params(base, 0.3, -0.25)), "DOMAIN");
  });

  it("rejects f > 1 with DOMAIN", () => {
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 1.0000001)), "DOMAIN");
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 4)), "DOMAIN");
  });

  it("rejects a non-finite f with NOT_FINITE", () => {
    expectKernelError(() => makeCensoredCount(params(base, 0.3, Number.NaN)), "NOT_FINITE");
    expectKernelError(
      () => makeCensoredCount(params(base, 0.3, Number.POSITIVE_INFINITY)),
      "NOT_FINITE",
    );
  });

  it("validates f even when c = 0 makes it operationally irrelevant", () => {
    expectKernelError(() => makeCensoredCount(params(base, 0, 0)), "DOMAIN");
    expectKernelError(() => makeCensoredCount(params(base, 0, 2)), "DOMAIN");
    expectKernelError(() => makeCensoredCount(params(base, 0, Number.NaN)), "NOT_FINITE");
  });

  it("accepts the smallest positive f without producing NaN", () => {
    const dist = makeCensoredCount(params(base, 1, Number.MIN_VALUE));
    // Binom(j, 5e-324) is the point mass at 0 for every j, so pmf(0) is the whole
    // carried base mass — which is 1 minus the documented 1e-12 truncation loss,
    // not exactly 1. Asserting the truncation bound is the honest check here.
    expect(1 - dist.pmf(0)).toBeGreaterThanOrEqual(0);
    expect(1 - dist.pmf(0)).toBeLessThan(1e-12);
    expect(Number.isNaN(dist.mean())).toBe(false);
    expect(Number.isNaN(dist.variance())).toBe(false);
    // The factored mean μ·(1 − c(1 − f)) evaluates `1 − f` as exactly 1 for any f
    // below ~1e-16, so at c = 1 it returns exactly 0 where the expanded form
    // (1 − c)μ + c·f·μ would return the subnormal 4.4e-323. That is a documented
    // trade: the factored form is the one that reproduces the base bit-for-bit at
    // c = 0 and f = 1, which matters; a 1e-323 mean does not.
    expect(dist.mean()).toBe(0);
    expect(Math.abs(dist.mean() - base.mean() * Number.MIN_VALUE)).toBeLessThan(1e-300);
  });
});

describe("makeCensoredCount — censorProbability domain [0, 1]", () => {
  const base = nb({ r: 4, p: 0.3 });

  it("rejects c < 0 and c > 1 with DOMAIN", () => {
    expectKernelError(() => makeCensoredCount(params(base, -0.01, 0.5)), "DOMAIN");
    expectKernelError(() => makeCensoredCount(params(base, 1.01, 0.5)), "DOMAIN");
  });

  it("rejects a non-finite c with NOT_FINITE", () => {
    expectKernelError(() => makeCensoredCount(params(base, Number.NaN, 0.5)), "NOT_FINITE");
    expectKernelError(
      () => makeCensoredCount(params(base, Number.NEGATIVE_INFINITY, 0.5)),
      "NOT_FINITE",
    );
  });

  it("accepts both endpoints", () => {
    expect(() => makeCensoredCount(params(base, 0, 0.5))).not.toThrow();
    expect(() => makeCensoredCount(params(base, 1, 0.5))).not.toThrow();
  });
});

describe("makeCensoredCount — malformed base", () => {
  it("rejects a missing or non-object params bag with DOMAIN", () => {
    expectKernelError(
      () => makeCensoredCount(null as unknown as CensoredCountParams),
      "DOMAIN",
    );
    expectKernelError(
      () => makeCensoredCount(undefined as unknown as CensoredCountParams),
      "DOMAIN",
    );
  });

  it("rejects a missing base with DOMAIN", () => {
    expectKernelError(
      () => makeCensoredCount(params(null as unknown as DiscreteDistribution, 0.3, 0.5)),
      "DOMAIN",
    );
    expectKernelError(
      () => makeCensoredCount(params(undefined as unknown as DiscreteDistribution, 0.3, 0.5)),
      "DOMAIN",
    );
  });

  it("rejects a base with the wrong kind", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ kind: "continuous" }), 0.3, 0.5)),
      "DOMAIN",
    );
  });

  it("rejects a base missing any required method", () => {
    for (const method of ["pmf", "cdf", "quantile", "sample", "mean", "variance", "support"]) {
      expectKernelError(
        () => makeCensoredCount(params(brokenBase({ [method]: undefined }), 0.3, 0.5)),
        "DOMAIN",
      );
    }
  });

  it("rejects a negative pmf value with DOMAIN", () => {
    const base = brokenBase({ pmf: (k: number) => (k === 1 ? -0.1 : 0.5) });
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 0.5)), "DOMAIN");
  });

  it("rejects a non-finite pmf value with NOT_FINITE", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ pmf: () => Number.NaN }), 0.3, 0.5)),
      "NOT_FINITE",
    );
    expectKernelError(
      () =>
        makeCensoredCount(
          params(brokenBase({ pmf: () => Number.POSITIVE_INFINITY }), 0.3, 0.5),
        ),
      "NOT_FINITE",
    );
  });

  it("wraps a base pmf that throws a plain Error as DOMAIN", () => {
    const base = brokenBase({
      pmf: () => {
        throw new Error("no pmf here");
      },
    });
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 0.5)), "DOMAIN");
  });

  it("propagates a KernelError from the base unchanged", () => {
    const base = brokenBase({
      pmf: () => {
        throw new KernelError("NO_CONVERGENCE", "base blew up");
      },
    });
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 0.5)), "NO_CONVERGENCE");
  });

  it("rejects a pmf accumulating more than unit mass with DOMAIN", () => {
    const base = brokenBase({
      pmf: (k: number) => (k >= 0 && k <= 2 ? 0.6 : 0),
      support: () => ({ min: 0, max: 2 }),
    });
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 0.5)), "DOMAIN");
  });

  it("rejects a finite-support pmf that does not sum to 1 with DOMAIN", () => {
    const base = brokenBase({
      pmf: (k: number) => (k >= 0 && k <= 2 ? 0.2 : 0),
      support: () => ({ min: 0, max: 2 }),
    });
    expectKernelError(() => makeCensoredCount(params(base, 0.3, 0.5)), "DOMAIN");
  });

  it("rejects a base whose tail never closes with NO_CONVERGENCE", () => {
    // q = 0.999 leaves ~6.7e-3 of mass beyond index 5000 — not even close to
    // unit mass within the budget.
    expectKernelError(
      () => makeCensoredCount(params(geometricBase(0.999), 0.3, 0.5)),
      "NO_CONVERGENCE",
    );
  });

  it("rejects a support too large for the O(n²) precompute with UNSUPPORTED", () => {
    // q = 0.9959 leaves ~1.2e-9 beyond index 5000: the mass has essentially
    // closed (inside the conformance 1e-6 tolerance) but not to 1e-12, so the
    // truncation point is past the cap and the quadratic build is refused.
    expectKernelError(
      () => makeCensoredCount(params(geometricBase(0.9959), 0.3, 0.5)),
      "UNSUPPORTED",
    );
  });

  it("rejects a non-integer or negative support minimum with DOMAIN", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ support: () => ({ min: -1, max: 5 }) }), 0.3, 0.5)),
      "DOMAIN",
    );
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ support: () => ({ min: 0.5, max: 5 }) }), 0.3, 0.5)),
      "DOMAIN",
    );
  });

  it("rejects a non-integer finite support maximum with DOMAIN", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ support: () => ({ min: 0, max: 5.5 }) }), 0.3, 0.5)),
      "DOMAIN",
    );
  });

  it("rejects an empty support (max < min) with DOMAIN", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ support: () => ({ min: 4, max: 1 }) }), 0.3, 0.5)),
      "DOMAIN",
    );
  });

  it("rejects a non-finite support minimum with NOT_FINITE", () => {
    expectKernelError(
      () =>
        makeCensoredCount(
          params(brokenBase({ support: () => ({ min: Number.NaN, max: 5 }) }), 0.3, 0.5),
        ),
      "NOT_FINITE",
    );
  });

  it("rejects a support() that does not return an object with DOMAIN", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ support: () => null }), 0.3, 0.5)),
      "DOMAIN",
    );
  });

  it("rejects a non-finite base mean or variance with NOT_FINITE", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ mean: () => Number.NaN }), 0.3, 0.5)),
      "NOT_FINITE",
    );
    expectKernelError(
      () =>
        makeCensoredCount(
          params(brokenBase({ variance: () => Number.POSITIVE_INFINITY }), 0.3, 0.5),
        ),
      "NOT_FINITE",
    );
  });

  it("rejects a negative base mean or variance with DOMAIN", () => {
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ mean: () => -1 }), 0.3, 0.5)),
      "DOMAIN",
    );
    expectKernelError(
      () => makeCensoredCount(params(brokenBase({ variance: () => -1 }), 0.3, 0.5)),
      "DOMAIN",
    );
  });

  it("never returns NaN from any method on a valid build", () => {
    const dist = makeCensoredCount(params(nb({ r: 4, p: 0.3 }), 0.45, 0.35));
    const s = dist.support();
    for (let k = s.min; k <= s.max; k += 1) {
      expect(Number.isNaN(dist.pmf(k))).toBe(false);
      expect(Number.isNaN(dist.cdf(k))).toBe(false);
    }
    expect(Number.isNaN(dist.mean())).toBe(false);
    expect(Number.isNaN(dist.variance())).toBe(false);
    expect(Number.isNaN(dist.quantile(0.5))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Composition with the sibling slot
// ─────────────────────────────────────────────────────────────────────────────

describe("makeCensoredCount — composition", () => {
  it("censoring a censored count is itself a valid distribution", () => {
    const inner = makeCensoredCount(params(nb({ r: 6, p: 0.35 }), 0.3, 0.6));
    const outer = makeCensoredCount(params(inner, 0.25, 0.5));
    expect(() => assertDistributionConformance(outer)).not.toThrow();
    expect(outer.mean()).toBeCloseTo(inner.mean() * (1 - 0.25 * 0.5), 10);
  });

  it("chained retention composes multiplicatively on the mean at c = 1", () => {
    const base = nb({ r: 6, p: 0.35 });
    const once = makeCensoredCount(params(base, 1, 0.6));
    const twice = makeCensoredCount(params(once, 1, 0.5));
    expect(twice.mean()).toBeCloseTo(base.mean() * 0.6 * 0.5, 9);
  });
});
