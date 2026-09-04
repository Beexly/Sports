import { describe, it, expect } from "vitest";

import {
  KernelError,
  assertProbability,
  makeRng,
  type ContinuousDistribution,
  type DiscreteDistribution,
  type LognormalTailMixtureParams,
  type Probability,
  type Rng,
  type Support,
} from "../contract.js";
import { assertDistributionConformance } from "../conformance.js";
import { normalCdf, normalQuantile } from "../numeric.js";
import { makeLognormalTailMixture } from "../slots/lognormal-tail.js";

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

/** 1/√(2π), written out so the density tests do not borrow the slot's constant. */
const INV_SQRT_2PI = 0.3989422804014327;

/** Independent standard-normal density. */
function phi(z: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * z * z);
}

/**
 * Independent re-statement of the contract's mixture cdf, written straight from
 * the specification text rather than from the implementation:
 *   cdf(x) = (1−w)·Φ((x − bodyMean)/bodySd) + w·Φ((ln x − tailMu)/tailSigma)
 * with the second term 0 for x <= 0.
 */
function referenceCdf(p: LognormalTailMixtureParams, x: number): number {
  const body = normalCdf((x - p.bodyMean) / p.bodySd);
  const tail = x <= 0 ? 0 : normalCdf((Math.log(x) - p.tailMu) / p.tailSigma);
  return (1 - p.tailWeight) * body + p.tailWeight * tail;
}

/** Independent re-statement of the contract's mixture pdf. */
function referencePdf(p: LognormalTailMixtureParams, x: number): number {
  const body = ((1 - p.tailWeight) * phi((x - p.bodyMean) / p.bodySd)) / p.bodySd;
  const tail =
    x <= 0
      ? 0
      : (p.tailWeight * phi((Math.log(x) - p.tailMu) / p.tailSigma)) / (x * p.tailSigma);
  return body + tail;
}

/**
 * Analytic mean from the contract:
 *   mean = (1−w)·bodyMean + w·exp(tailMu + tailSigma²/2)
 */
function referenceMean(p: LognormalTailMixtureParams): number {
  const mT = Math.exp(p.tailMu + 0.5 * p.tailSigma * p.tailSigma);
  return (1 - p.tailWeight) * p.bodyMean + p.tailWeight * mT;
}

/**
 * Analytic SECOND RAW MOMENT, exactly as the slot brief states it:
 *   E[X²] = (1−w)(bodyMean² + bodySd²) + w·exp(2·tailMu + 2·tailSigma²)
 * Kept separate from `referenceMean` so the variance identity
 * `variance = E[X²] − mean²` can be asserted against the literal formula, not
 * against the reduced law-of-total-variance form the slot evaluates.
 */
function referenceSecondMoment(p: LognormalTailMixtureParams): number {
  const bodyM2 = p.bodyMean * p.bodyMean + p.bodySd * p.bodySd;
  const tailM2 = Math.exp(2 * p.tailMu + 2 * p.tailSigma * p.tailSigma);
  return (1 - p.tailWeight) * bodyM2 + p.tailWeight * tailM2;
}

function referenceVariance(p: LognormalTailMixtureParams): number {
  const m = referenceMean(p);
  return referenceSecondMoment(p) - m * m;
}

/**
 * LATTICE ADAPTER — the bridge to `assertDistributionConformance`.
 *
 * `conformance.ts` is typed for `DiscreteDistribution`, and this slot returns a
 * `ContinuousDistribution`, so the conformance battery cannot be applied to the
 * mixture directly. Rather than skip it, the continuous law is discretised
 * EXACTLY (no approximation is introduced) into the integer-valued variable
 *
 *   K = clamp(ceil(X), lo, hi)
 *
 * whose law follows from the continuous cdf F alone:
 *   P(K = lo) = F(lo)                       (everything at or below lo)
 *   P(K = k)  = F(k) − F(k−1),  lo < k < hi (the half-open bin (k−1, k])
 *   P(K = hi) = 1 − F(hi−1)                 (everything above hi−1)
 *
 * `sample` draws from the CONTINUOUS sampler and applies the same map, so the
 * conformance sampling checks compare the sampler against the cdf — the single
 * most valuable invariant this slot has, and one no closed-form check reaches.
 * `mean`/`variance` are summed from the lattice pmf, i.e. from the cdf, so the
 * moment checks are likewise sampler-vs-cdf and not a self-comparison.
 *
 * Only test scaffolding; nothing here is exported from the package.
 */
function latticeAdapter(
  dist: ContinuousDistribution,
  lo: number,
  hi: number,
): DiscreteDistribution {
  const support: Support = { min: lo, max: hi };

  function pmf(k: number): Probability {
    if (!Number.isFinite(k) || !Number.isInteger(k)) {
      throw new KernelError("DOMAIN", `lattice pmf requires an integer k, received ${k}`);
    }
    if (k < lo || k > hi) return 0;
    if (k === lo) return dist.cdf(lo);
    if (k === hi) return 1 - dist.cdf(hi - 1);
    return dist.cdf(k) - dist.cdf(k - 1);
  }

  function cdf(k: number): Probability {
    if (!Number.isFinite(k)) {
      throw new KernelError("NOT_FINITE", `lattice cdf requires a finite k, received ${k}`);
    }
    if (k < lo) return 0;
    if (k >= hi) return 1;
    return dist.cdf(k);
  }

  let cachedMean: number | null = null;
  let cachedVar: number | null = null;
  function moments(): { readonly m1: number; readonly m2: number } {
    let m1 = 0;
    let m2 = 0;
    for (let k = lo; k <= hi; k += 1) {
      const p = pmf(k);
      m1 += k * p;
      m2 += k * k * p;
    }
    return { m1, m2 };
  }

  return {
    kind: "discrete",
    pmf,
    cdf,
    quantile(p: Probability): number {
      assertProbability(p, "p");
      for (let k = lo; k <= hi; k += 1) {
        if (cdf(k) >= p) return k;
      }
      return hi;
    },
    sample(rng: Rng): number {
      const x = dist.sample(rng);
      const k = Math.ceil(x);
      return k < lo ? lo : k > hi ? hi : k;
    },
    mean(): number {
      if (cachedMean === null) cachedMean = moments().m1;
      return cachedMean;
    },
    variance(): number {
      if (cachedVar === null) {
        const { m1, m2 } = moments();
        cachedVar = m2 - m1 * m1;
      }
      return cachedVar;
    },
    support(): Support {
      return support;
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Representative YAC-shaped mixture: modest body, meaningful broken-play tail. */
const YAC: LognormalTailMixtureParams = {
  tailWeight: 0.2,
  bodyMean: 6,
  bodySd: 3,
  tailMu: 2.5,
  tailSigma: 0.6,
};

/** Deliberately heavy tail — the parameter set the product thesis is argued on. */
const HEAVY: LognormalTailMixtureParams = {
  tailWeight: 0.35,
  bodyMean: 4,
  bodySd: 2.5,
  tailMu: 2.2,
  tailSigma: 1.1,
};

/** Degenerate at w = 0: must be the Normal body, exactly. */
const PURE_BODY: LognormalTailMixtureParams = {
  tailWeight: 0,
  bodyMean: 6,
  bodySd: 3,
  tailMu: 2.5,
  tailSigma: 0.6,
};

/** Degenerate at w = 1: must be the standard lognormal, exactly. */
const PURE_TAIL: LognormalTailMixtureParams = {
  tailWeight: 1,
  bodyMean: 6,
  bodySd: 3,
  tailMu: 0,
  tailSigma: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Conformance
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — distribution conformance", () => {
  it("passes assertDistributionConformance on the exact integer discretisation of the mixture", () => {
    const dist = makeLognormalTailMixture(YAC);
    // lo = −10 is ~5.3 body sds below the body mean (F ≈ 5e-8); hi = 250 leaves
    // ~5e-8 of tail mass, which the lattice places exactly at hi.
    assertDistributionConformance(latticeAdapter(dist, -10, 250), {
      draws: 50000,
      seed: 4242,
    });
  });

  it("passes conformance for the w = 0 (pure Normal body) degenerate case", () => {
    const dist = makeLognormalTailMixture(PURE_BODY);
    assertDistributionConformance(latticeAdapter(dist, -10, 32), {
      draws: 50000,
      seed: 99,
    });
  });

  it("passes conformance for the w = 1 (pure lognormal) degenerate case", () => {
    const dist = makeLognormalTailMixture(PURE_TAIL);
    assertDistributionConformance(latticeAdapter(dist, 0, 500), {
      draws: 50000,
      seed: 7,
    });
  });

  it("passes conformance for a heavy-tail parameterisation", () => {
    const dist = makeLognormalTailMixture(HEAVY);
    assertDistributionConformance(latticeAdapter(dist, -10, 4000), {
      draws: 50000,
      seed: 31337,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Degenerate weights — exact reduction
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — w = 0 reduces EXACTLY to the Normal body", () => {
  const dist = makeLognormalTailMixture(PURE_BODY);

  it("matches Φ((x − bodyMean)/bodySd) bit for bit across the line", () => {
    for (let x = -40; x <= 60; x += 0.25) {
      expect(dist.cdf(x)).toBe(normalCdf((x - PURE_BODY.bodyMean) / PURE_BODY.bodySd));
    }
  });

  it("ignores the tail parameters entirely (an absurd tail changes nothing)", () => {
    const absurd = makeLognormalTailMixture({ ...PURE_BODY, tailMu: 300, tailSigma: 25 });
    for (let x = -20; x <= 40; x += 0.5) {
      expect(absurd.cdf(x)).toBe(dist.cdf(x));
      expect(absurd.pdf(x)).toBe(dist.pdf(x));
    }
    expect(absurd.mean()).toBe(PURE_BODY.bodyMean);
    expect(absurd.variance()).toBe(PURE_BODY.bodySd * PURE_BODY.bodySd);
  });

  it("reports the Normal moments exactly", () => {
    expect(dist.mean()).toBe(6);
    expect(dist.variance()).toBe(9);
  });

  it("has a density equal to the Normal density (closed form at the mode)", () => {
    // φ(0)/σ = 1/(σ√(2π)) = 0.3989422804014327 / 3
    expect(dist.pdf(6)).toBeCloseTo(INV_SQRT_2PI / 3, 15);
    expect(dist.pdf(6 + 3)).toBeCloseTo((INV_SQRT_2PI * Math.exp(-0.5)) / 3, 15);
  });

  it("recovers the Normal quantile function", () => {
    for (const p of [0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999]) {
      const expected = PURE_BODY.bodyMean + PURE_BODY.bodySd * normalQuantile(p);
      expect(dist.quantile(p)).toBeCloseTo(expected, 8);
    }
    // Median of a symmetric body is its mean.
    expect(dist.quantile(0.5)).toBeCloseTo(6, 9);
  });

  it("has mean == median for the symmetric body — no under-bias without a tail", () => {
    expect(dist.quantile(0.5)).toBeCloseTo(dist.mean(), 9);
  });
});

describe("lognormal-tail — w = 1 reduces EXACTLY to the lognormal", () => {
  const dist = makeLognormalTailMixture(PURE_TAIL);

  it("matches Φ((ln x − tailMu)/tailSigma) bit for bit on x > 0", () => {
    for (let x = 0.05; x <= 60; x += 0.05) {
      expect(dist.cdf(x)).toBe(
        normalCdf((Math.log(x) - PURE_TAIL.tailMu) / PURE_TAIL.tailSigma),
      );
    }
  });

  it("puts exactly zero mass on x <= 0 (the body is inert)", () => {
    for (const x of [-1e6, -100, -1, -1e-12, 0]) {
      expect(dist.cdf(x)).toBe(0);
      expect(dist.pdf(x)).toBe(0);
    }
  });

  it("hits the closed-form landmarks of LN(0, 1)", () => {
    // F(1) = Φ(0) = 1/2 exactly.
    expect(dist.cdf(1)).toBe(0.5);
    // Median exp(mu) = 1.
    expect(dist.quantile(0.5)).toBeCloseTo(1, 9);
    // Density at the median: φ(0)/(1·1) = 1/√(2π).
    expect(dist.pdf(1)).toBeCloseTo(INV_SQRT_2PI, 15);
    // mean = exp(mu + sigma²/2) = √e.
    expect(dist.mean()).toBeCloseTo(Math.exp(0.5), 12);
    // var = (exp(sigma²) − 1)·exp(2mu + sigma²) = (e − 1)·e.
    expect(dist.variance()).toBeCloseTo((Math.E - 1) * Math.E, 9);
    // A published quantile: exp(Φ⁻¹(0.95)) = exp(1.6448536269514722).
    expect(dist.quantile(0.95)).toBeCloseTo(Math.exp(1.6448536269514722), 8);
  });

  it("reports support [0, ∞) when the body carries no weight", () => {
    expect(dist.support()).toEqual({ min: 0, max: Number.POSITIVE_INFINITY });
    expect(dist.quantile(0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cdf / pdf structure
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — cdf and pdf", () => {
  it("agrees with the contract formula on a fine grid", () => {
    const dist = makeLognormalTailMixture(YAC);
    for (let x = -20; x <= 120; x += 0.05) {
      expect(dist.cdf(x)).toBeCloseTo(referenceCdf(YAC, x), 14);
      expect(dist.pdf(x)).toBeCloseTo(referencePdf(YAC, x), 14);
    }
  });

  it("is monotone non-decreasing across a fine grid", () => {
    for (const params of [YAC, HEAVY, PURE_BODY, PURE_TAIL]) {
      const dist = makeLognormalTailMixture(params);
      let prev = 0;
      for (let x = -40; x <= 400; x += 0.02) {
        const c = dist.cdf(x);
        expect(c).toBeGreaterThanOrEqual(prev);
        expect(c).toBeLessThanOrEqual(1);
        prev = c;
      }
    }
  });

  it("keeps genuine mass on the negative half-line (tackled behind the catch)", () => {
    const dist = makeLognormalTailMixture(YAC);
    // Only the body reaches x < 0, so P(X < 0) = (1 − w)·Φ(−bodyMean/bodySd).
    const expected = 0.8 * normalCdf(-2);
    expect(dist.cdf(0)).toBeCloseTo(expected, 14);
    expect(dist.cdf(0)).toBeGreaterThan(0.018);
    expect(dist.pdf(-2)).toBeGreaterThan(0);
  });

  it("integrates the pdf back to the cdf (composite Simpson)", () => {
    const dist = makeLognormalTailMixture(YAC);
    const a = -15;
    const b = 150;
    const n = 60000; // even
    const h = (b - a) / n;
    let acc = dist.pdf(a) + dist.pdf(b);
    for (let i = 1; i < n; i += 1) {
      acc += (i % 2 === 1 ? 4 : 2) * dist.pdf(a + i * h);
    }
    const integral = (h / 3) * acc;
    expect(integral).toBeCloseTo(dist.cdf(b) - dist.cdf(a), 8);
  });

  it("accepts ±Infinity on cdf/pdf and rejects NaN", () => {
    const dist = makeLognormalTailMixture(YAC);
    expect(dist.cdf(Number.POSITIVE_INFINITY)).toBe(1);
    expect(dist.cdf(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(dist.pdf(Number.POSITIVE_INFINITY)).toBe(0);
    expect(dist.pdf(Number.NEGATIVE_INFINITY)).toBe(0);
    expectKernelError(() => dist.cdf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.pdf(Number.NaN), "NOT_FINITE");
  });

  it("evaluates the cdf at extreme abscissae instead of overflowing", () => {
    const dist = makeLognormalTailMixture(YAC);
    expect(dist.cdf(1e300)).toBe(1);
    expect(dist.cdf(-1e300)).toBe(0);
    expect(dist.cdf(1e155)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Quantiles
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — quantile", () => {
  it("round-trips quantile(cdf(x)) ≈ x to 1e-8 across the body and the tail", () => {
    for (const params of [YAC, HEAVY]) {
      const dist = makeLognormalTailMixture(params);
      for (let x = -6; x <= 120; x += 0.37) {
        const p = dist.cdf(x);
        if (p <= 0 || p >= 1) continue;
        const back = dist.quantile(p);
        expect(Math.abs(back - x)).toBeLessThanOrEqual(1e-8 * Math.max(1, Math.abs(x)));
      }
    }
  });

  it("satisfies the generalized-inverse guarantee 0 <= cdf(quantile(p)) − p <= 1e-10", () => {
    const dist = makeLognormalTailMixture(YAC);
    const ps = [
      1e-8, 1e-6, 1e-4, 0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99,
      0.999, 0.9999, 1 - 1e-6, 1 - 1e-8,
    ];
    for (const p of ps) {
      const q = dist.quantile(p);
      const c = dist.cdf(q);
      expect(c).toBeGreaterThanOrEqual(p);
      expect(c - p).toBeLessThanOrEqual(1e-10);
    }
  });

  it("is monotone non-decreasing in p", () => {
    const dist = makeLognormalTailMixture(HEAVY);
    let prev = Number.NEGATIVE_INFINITY;
    for (let i = 1; i < 400; i += 1) {
      const q = dist.quantile(i / 400);
      expect(q).toBeGreaterThanOrEqual(prev);
      prev = q;
    }
  });

  it("returns the honest endpoints at p = 0 and p = 1", () => {
    const dist = makeLognormalTailMixture(YAC);
    expect(dist.quantile(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(dist.quantile(1)).toBe(Number.POSITIVE_INFINITY);
    expect(dist.quantile(0)).toBe(dist.support().min);
  });

  it("reaches deep-tail quantiles a fixed bracket would truncate", () => {
    // w tiny but tailSigma large: the 1 − 1e-9 quantile lives far above every
    // body scale, which is exactly the case the geometric expansion exists for.
    const params: LognormalTailMixtureParams = {
      tailWeight: 1e-6,
      bodyMean: 5,
      bodySd: 1,
      tailMu: 1,
      tailSigma: 4,
    };
    const dist = makeLognormalTailMixture(params);
    const q = dist.quantile(1 - 1e-9);
    expect(Number.isFinite(q)).toBe(true);
    expect(q).toBeGreaterThan(1e5);
    const c = dist.cdf(q);
    expect(c).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(c - (1 - 1e-9)).toBeLessThanOrEqual(1e-10);
  });

  it("throws NO_CONVERGENCE when the quantile is not representable in double precision", () => {
    // tailSigma = 300 puts the 1 − 1e-8 quantile near exp(1683), well past the
    // largest finite double, so the bracket expansion walks off the end.
    const dist = makeLognormalTailMixture({
      tailWeight: 1,
      bodyMean: 0,
      bodySd: 1,
      tailMu: 0,
      tailSigma: 300,
    });
    expectKernelError(() => dist.quantile(1 - 1e-8), "NO_CONVERGENCE");
  });

  it("throws DOMAIN outside [0,1] and NOT_FINITE on NaN", () => {
    const dist = makeLognormalTailMixture(YAC);
    expectKernelError(() => dist.quantile(1.5), "DOMAIN");
    expectKernelError(() => dist.quantile(-0.1), "DOMAIN");
    expectKernelError(() => dist.quantile(Number.NaN), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE PRODUCT THESIS — median < mean
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — median < mean (a mean-anchored line favours the under)", () => {
  it("separates median and mean for a heavy tail", () => {
    const dist = makeLognormalTailMixture(HEAVY);
    const median = dist.quantile(0.5);
    const mean = dist.mean();
    expect(median).toBeLessThan(mean);
    // Not a rounding-scale separation: the gap is a large fraction of the sd.
    expect(mean - median).toBeGreaterThan(2);
  });

  it("puts materially more than half the mass below the mean", () => {
    const dist = makeLognormalTailMixture(HEAVY);
    const below = dist.cdf(dist.mean());
    expect(below).toBeGreaterThan(0.75);
    // The Normal it would be mistaken for prices this at exactly 0.5.
    expect(below).toBeGreaterThan(0.5 + 0.2);
  });

  it("widens the median/mean gap monotonically as the tail weight rises", () => {
    let previousGap = -Infinity;
    for (const w of [0, 0.05, 0.1, 0.2, 0.35, 0.5]) {
      const dist = makeLognormalTailMixture({ ...HEAVY, tailWeight: w });
      const gap = dist.mean() - dist.quantile(0.5);
      expect(gap).toBeGreaterThan(previousGap);
      previousGap = gap;
    }
  });

  it("collapses the gap to zero when the tail weight is removed", () => {
    const dist = makeLognormalTailMixture({ ...HEAVY, tailWeight: 0 });
    expect(dist.mean() - dist.quantile(0.5)).toBeCloseTo(0, 9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Moments
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — moments", () => {
  it("matches the closed-form mean", () => {
    for (const params of [YAC, HEAVY, PURE_BODY, PURE_TAIL]) {
      expect(makeLognormalTailMixture(params).mean()).toBeCloseTo(referenceMean(params), 10);
    }
  });

  it("satisfies variance = E[X²] − mean² with E[X²] from the contract formula", () => {
    for (const params of [YAC, HEAVY, PURE_BODY, PURE_TAIL]) {
      const dist = makeLognormalTailMixture(params);
      const expected = referenceVariance(params);
      expect(dist.variance()).toBeCloseTo(expected, 8);
      // Relative agreement too, since HEAVY's variance is ~10³.
      expect(Math.abs(dist.variance() - expected) / expected).toBeLessThan(1e-10);
    }
  });

  it("agrees with numerically integrated moments (Simpson on x·pdf and x²·pdf)", () => {
    const dist = makeLognormalTailMixture(YAC);
    const a = -20;
    const b = 400;
    const n = 200000;
    const h = (b - a) / n;
    let m1 = 0;
    let m2 = 0;
    for (let i = 0; i <= n; i += 1) {
      const x = a + i * h;
      const wgt = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
      const d = dist.pdf(x);
      m1 += wgt * x * d;
      m2 += wgt * x * x * d;
    }
    m1 *= h / 3;
    m2 *= h / 3;
    expect(m1).toBeCloseTo(dist.mean(), 4);
    expect(m2 - m1 * m1).toBeCloseTo(dist.variance(), 2);
  });

  it("fails closed with UNSUPPORTED rather than reporting an infinite mean", () => {
    const dist = makeLognormalTailMixture({
      tailWeight: 0.5,
      bodyMean: 1,
      bodySd: 1,
      tailMu: 0,
      tailSigma: 40,
    });
    expectKernelError(() => dist.mean(), "UNSUPPORTED");
    expectKernelError(() => dist.variance(), "UNSUPPORTED");
    // The cdf is still exact and usable — that is the point of not throwing at
    // construction time.
    expect(dist.cdf(1)).toBeGreaterThan(0);
    expect(dist.cdf(1)).toBeLessThan(1);
  });

  it("fails closed with UNSUPPORTED when only the second moment overflows", () => {
    const dist = makeLognormalTailMixture({
      tailWeight: 0.5,
      bodyMean: 1,
      bodySd: 1,
      tailMu: 0,
      tailSigma: 25,
    });
    // exp(mu + sigma²/2) = exp(312.5) is finite; exp(sigma²) = exp(625) is not.
    expect(Number.isFinite(dist.mean())).toBe(true);
    expectKernelError(() => dist.variance(), "UNSUPPORTED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sampling
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — sample", () => {
  it("is deterministic for a fixed seed", () => {
    const dist = makeLognormalTailMixture(YAC);
    const a: number[] = [];
    const b: number[] = [];
    const ra = makeRng(20260825);
    const rb = makeRng(20260825);
    for (let i = 0; i < 500; i += 1) {
      a.push(dist.sample(ra));
      b.push(dist.sample(rb));
    }
    expect(a).toEqual(b);
    // And a different seed genuinely differs.
    const rc = makeRng(20260826);
    const c: number[] = [];
    for (let i = 0; i < 500; i += 1) c.push(dist.sample(rc));
    expect(c).not.toEqual(a);
  });

  it("consumes exactly three uniforms per draw regardless of component", () => {
    const dist = makeLognormalTailMixture(YAC);
    for (const w of [0, 0.2, 1]) {
      const d = makeLognormalTailMixture({ ...YAC, tailWeight: w });
      let calls = 0;
      const base = makeRng(11);
      const counting: Rng = () => {
        calls += 1;
        return base();
      };
      for (let i = 0; i < 100; i += 1) d.sample(counting);
      expect(calls).toBe(300);
    }
    expect(dist.kind).toBe("continuous");
  });

  it("matches the analytic mean and variance empirically (fixed seed)", () => {
    const dist = makeLognormalTailMixture(YAC);
    const rng = makeRng(987654321);
    const n = 200000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i += 1) {
      const x = dist.sample(rng);
      expect(Number.isFinite(x)).toBe(true);
      sum += x;
      sumSq += x * x;
    }
    const empMean = sum / n;
    const empVar = sumSq / n - empMean * empMean;
    expect(empMean).toBeCloseTo(dist.mean(), 1);
    expect(Math.abs(empVar - dist.variance()) / dist.variance()).toBeLessThan(0.1);
  });

  it("selects the tail component with probability exactly w", () => {
    // Only the tail component can produce x <= 0-free lognormal draws, so count
    // draws against a threshold no body draw can plausibly reach instead: use
    // w = 0 and w = 1, where the component choice is deterministic.
    const bodyOnly = makeLognormalTailMixture(PURE_BODY);
    const tailOnly = makeLognormalTailMixture(PURE_TAIL);
    const r1 = makeRng(5);
    const r2 = makeRng(5);
    let negatives = 0;
    let nonPositive = 0;
    for (let i = 0; i < 20000; i += 1) {
      if (bodyOnly.sample(r1) < 0) negatives += 1;
      if (tailOnly.sample(r2) <= 0) nonPositive += 1;
    }
    // Body draws go negative at rate Φ(−2) ≈ 0.02275; lognormal draws never do.
    expect(negatives / 20000).toBeGreaterThan(0.015);
    expect(negatives / 20000).toBeLessThan(0.032);
    expect(nonPositive).toBe(0);
  });

  it("empirically reproduces the cdf (Kolmogorov–Smirnov style, fixed seed)", () => {
    const dist = makeLognormalTailMixture(HEAVY);
    const rng = makeRng(24680);
    const n = 20000;
    const draws: number[] = [];
    for (let i = 0; i < n; i += 1) draws.push(dist.sample(rng));
    draws.sort((a, b) => a - b);
    let dMax = 0;
    for (let i = 0; i < n; i += 1) {
      const f = dist.cdf(draws[i]!);
      dMax = Math.max(dMax, Math.abs(f - i / n), Math.abs((i + 1) / n - f));
    }
    // KS critical value at alpha = 0.001 is 1.949/√n ≈ 0.0138.
    expect(dMax).toBeLessThan(1.949 / Math.sqrt(n));
  });

  it("fails closed on a malformed Rng", () => {
    const dist = makeLognormalTailMixture(YAC);
    expectKernelError(() => dist.sample((() => 1.5) as Rng), "DOMAIN");
    expectKernelError(() => dist.sample((() => -0.1) as Rng), "DOMAIN");
    expectKernelError(() => dist.sample((() => 1) as Rng), "DOMAIN");
    expectKernelError(() => dist.sample((() => Number.NaN) as Rng), "NOT_FINITE");
    expectKernelError(() => dist.sample(undefined as unknown as Rng), "DOMAIN");
  });

  it("fails closed rather than returning an overflowed draw", () => {
    const dist = makeLognormalTailMixture({
      tailWeight: 1,
      bodyMean: 0,
      bodySd: 1,
      tailMu: 0,
      tailSigma: 400,
    });
    // A +z draw with sigma = 400 exponentiates past the double range.
    const rng = makeRng(1);
    let sawThrow = false;
    for (let i = 0; i < 200 && !sawThrow; i += 1) {
      try {
        dist.sample(rng);
      } catch (e) {
        sawThrow = e instanceof KernelError && (e as KernelError).code === "NOT_FINITE";
      }
    }
    expect(sawThrow).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Support
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — support", () => {
  it("is unbounded below whenever the body carries weight", () => {
    for (const w of [0, 0.001, 0.5, 0.999]) {
      const dist = makeLognormalTailMixture({ ...YAC, tailWeight: w });
      expect(dist.support().min).toBe(Number.NEGATIVE_INFINITY);
      expect(dist.support().max).toBe(Number.POSITIVE_INFINITY);
    }
  });

  it("starts at 0 when the body is inert", () => {
    expect(makeLognormalTailMixture({ ...YAC, tailWeight: 1 }).support().min).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Parameter validation — every documented failure mode
// ─────────────────────────────────────────────────────────────────────────────

describe("lognormal-tail — parameter validation", () => {
  it("throws DOMAIN for a tailWeight outside [0,1]", () => {
    expectKernelError(() => makeLognormalTailMixture({ ...YAC, tailWeight: -0.001 }), "DOMAIN");
    expectKernelError(() => makeLognormalTailMixture({ ...YAC, tailWeight: 1.001 }), "DOMAIN");
  });

  it("throws DOMAIN for bodySd <= 0", () => {
    expectKernelError(() => makeLognormalTailMixture({ ...YAC, bodySd: 0 }), "DOMAIN");
    expectKernelError(() => makeLognormalTailMixture({ ...YAC, bodySd: -1 }), "DOMAIN");
    expectKernelError(() => makeLognormalTailMixture({ ...YAC, bodySd: -1e-300 }), "DOMAIN");
  });

  it("throws DOMAIN for tailSigma <= 0", () => {
    expectKernelError(() => makeLognormalTailMixture({ ...YAC, tailSigma: 0 }), "DOMAIN");
    expectKernelError(() => makeLognormalTailMixture({ ...YAC, tailSigma: -0.5 }), "DOMAIN");
  });

  it("throws NOT_FINITE for any non-finite parameter", () => {
    const keys = ["tailWeight", "bodyMean", "bodySd", "tailMu", "tailSigma"] as const;
    for (const key of keys) {
      for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        expectKernelError(
          () => makeLognormalTailMixture({ ...YAC, [key]: bad }),
          "NOT_FINITE",
        );
      }
    }
  });

  it("validates the inert component too (a bad tail is rejected even at w = 0)", () => {
    expectKernelError(
      () => makeLognormalTailMixture({ ...YAC, tailWeight: 0, tailSigma: 0 }),
      "DOMAIN",
    );
    expectKernelError(
      () => makeLognormalTailMixture({ ...YAC, tailWeight: 1, bodySd: 0 }),
      "DOMAIN",
    );
  });

  it("accepts the boundary weights 0 and 1", () => {
    expect(() => makeLognormalTailMixture({ ...YAC, tailWeight: 0 })).not.toThrow();
    expect(() => makeLognormalTailMixture({ ...YAC, tailWeight: 1 })).not.toThrow();
  });
});
