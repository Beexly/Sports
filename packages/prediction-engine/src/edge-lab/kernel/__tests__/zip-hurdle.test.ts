import { describe, it, expect } from "vitest";

import {
  KernelError,
  makeRng,
  type DiscreteDistribution,
  type NegBinomialParams,
  type ZipParams,
} from "../contract.js";
import { assertDistributionConformance } from "../conformance.js";
import { fitNegBinomial, makeNegBinomial } from "../slots/neg-binomial.js";
import { fitZip, makeZip } from "../slots/zip-hurdle.js";

/** The near-Poisson convention the neg-binomial slot documents and this slot inherits. */
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
  const out: number[] = new Array<number>(n);
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
  return { mean, variance: n > 1 ? ss / (n - 1) : 0 };
}

/** First two moments by brute-force summation over a deep truncation. */
function numericMoments(
  dist: DiscreteDistribution,
  upper: number,
): { mass: number; mean: number; variance: number } {
  let mass = 0;
  let m1 = 0;
  let m2 = 0;
  for (let k = 0; k <= upper; k += 1) {
    const w = dist.pmf(k);
    mass += w;
    m1 += k * w;
    m2 += k * k * w;
  }
  return { mass, mean: m1, variance: m2 - m1 * m1 };
}

/** The contract's LITERAL variance form, for comparison with the grouped form. */
function contractVariance(pi: number, base: NegBinomialParams): number {
  const nb = makeNegBinomial(base);
  const mu = nb.mean();
  return (1 - pi) * (nb.variance() + mu * mu) - (1 - pi) * mu * ((1 - pi) * mu);
}

const CONFORMANCE_CASES: readonly { readonly label: string; readonly params: ZipParams }[] = [
  { label: "no inflation (plain NB)", params: { zeroInflation: 0, base: { r: 4, p: 0.3 } } },
  { label: "a whisper of inflation", params: { zeroInflation: 0.01, base: { r: 4, p: 0.3 } } },
  { label: "moderate inflation", params: { zeroInflation: 0.25, base: { r: 3, p: 0.4 } } },
  { label: "half structural zeros", params: { zeroInflation: 0.5, base: { r: 5, p: 0.5 } } },
  { label: "geometric base", params: { zeroInflation: 0.75, base: { r: 1, p: 0.35 } } },
  { label: "heavy tail under heavy inflation", params: { zeroInflation: 0.9, base: { r: 2.5, p: 0.2 } } },
  { label: "extreme inflation pi = 0.99", params: { zeroInflation: 0.99, base: { r: 8, p: 0.7 } } },
  { label: "extreme inflation pi = 0.999", params: { zeroInflation: 0.999, base: { r: 6, p: 0.6 } } },
  { label: "degenerate pi = 1 (point mass at 0)", params: { zeroInflation: 1, base: { r: 3, p: 0.5 } } },
  { label: "fractional r under inflation", params: { zeroInflation: 0.4, base: { r: 0.7, p: 0.15 } } },
  {
    label: "near-Poisson base under inflation",
    params: {
      zeroInflation: 0.3,
      base: { r: NEAR_POISSON_R, p: NEAR_POISSON_R / (NEAR_POISSON_R + 5) },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Conformance — mandatory for every DISTRIBUTION slot
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — distribution conformance", () => {
  for (const { label, params } of CONFORMANCE_CASES) {
    it(`conforms: ${label}`, () => {
      expect(() => assertDistributionConformance(makeZip(params))).not.toThrow();
    });
  }

  it("conforms at a much larger draw count (the sampling checks are not seed-lucky)", () => {
    for (const { params } of CONFORMANCE_CASES) {
      expect(() =>
        assertDistributionConformance(makeZip(params), { draws: 200000, seed: 20260825 }),
      ).not.toThrow();
    }
  }, 120_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// pmf — the mixture identity
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — pmf", () => {
  it("is pi + (1-pi)*nb.pmf(0) at zero and (1-pi)*nb.pmf(k) above it", () => {
    for (const pi of [0, 0.05, 0.35, 0.8, 0.999]) {
      const base = { r: 3.2, p: 0.4 } as const;
      const nb = makeNegBinomial(base);
      const dist = makeZip({ zeroInflation: pi, base });
      expect(dist.pmf(0)).toBeCloseTo(pi + (1 - pi) * nb.pmf(0), 15);
      for (let k = 1; k <= 40; k += 1) {
        expect(dist.pmf(k)).toBeCloseTo((1 - pi) * nb.pmf(k), 15);
      }
    }
  });

  it("sums to 1 over the support to ~1e-12", () => {
    for (const { label, params } of CONFORMANCE_CASES) {
      // The near-Poisson base (r = 1e6) is excluded and handled by the test
      // below: the neg-binomial slot documents up to ~1e-9 of accumulated logGamma
      // error at that r, which no amount of care in THIS slot can undo.
      if (params.base.r >= NEAR_POISSON_R) continue;
      const dist = makeZip(params);
      let mass = 0;
      for (let k = 0; k <= 20000; k += 1) mass += dist.pmf(k);
      expect(Math.abs(mass - 1), label).toBeLessThan(1e-12);
    }
  });

  it("carries the near-Poisson base's documented logGamma error and adds none of its own", () => {
    // At r = 1e6 the base slot documents ~1e-9 of accumulated logGamma error in
    // the cumulative mass. The mixture's total mass is pi + (1-pi)*baseMass, so
    // its error is EXACTLY (1-pi) times the base's — strictly smaller, and
    // provably inherited rather than introduced here.
    const base = { r: NEAR_POISSON_R, p: NEAR_POISSON_R / (NEAR_POISSON_R + 5) } as const;
    const pi = 0.3;
    const sumMass = (dist: DiscreteDistribution): number => {
      let mass = 0;
      for (let k = 0; k <= 20000; k += 1) mass += dist.pmf(k);
      return mass;
    };
    const baseError = sumMass(makeNegBinomial(base)) - 1;
    const mixtureError = sumMass(makeZip({ zeroInflation: pi, base })) - 1;
    expect(Math.abs(baseError)).toBeLessThan(1e-9);
    // Agreement to within one ulp of 1 — i.e. to the resolution of the 20001-term
    // summation the two sides are each computed by. There is no slack here for a
    // mixture-introduced error to hide in.
    expect(Math.abs(mixtureError - (1 - pi) * baseError)).toBeLessThan(1e-15);
    expect(Math.abs(mixtureError)).toBeLessThan(Math.abs(baseError));
  });

  it("only ever ADDS zero mass: pmf(0) >= nb.pmf(0) for every pi", () => {
    const base = { r: 2, p: 0.25 } as const;
    const floor = makeNegBinomial(base).pmf(0);
    for (const pi of [0, 1e-9, 0.1, 0.5, 0.9, 1]) {
      expect(makeZip({ zeroInflation: pi, base }).pmf(0)).toBeGreaterThanOrEqual(floor);
    }
  });

  it("pmf(0) is non-decreasing in pi and pmf(k>0) is non-increasing", () => {
    const base = { r: 4, p: 0.45 } as const;
    let previousZero = -1;
    let previousThree = Number.POSITIVE_INFINITY;
    for (const pi of [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]) {
      const dist = makeZip({ zeroInflation: pi, base });
      expect(dist.pmf(0)).toBeGreaterThanOrEqual(previousZero);
      expect(dist.pmf(3)).toBeLessThanOrEqual(previousThree);
      previousZero = dist.pmf(0);
      previousThree = dist.pmf(3);
    }
  });

  it("is zero below the support", () => {
    const dist = makeZip({ zeroInflation: 0.4, base: { r: 2, p: 0.5 } });
    expect(dist.pmf(-1)).toBe(0);
    expect(dist.pmf(-25)).toBe(0);
  });

  it("throws DOMAIN on a non-integer k", () => {
    const dist = makeZip({ zeroInflation: 0.4, base: { r: 2, p: 0.5 } });
    expectKernelError(() => dist.pmf(0.5), "DOMAIN");
    expectKernelError(() => dist.pmf(3.0001), "DOMAIN");
    expectKernelError(() => dist.pmf(-0.5), "DOMAIN");
  });

  it("throws NOT_FINITE on NaN or Infinity", () => {
    const dist = makeZip({ zeroInflation: 0.4, base: { r: 2, p: 0.5 } });
    expectKernelError(() => dist.pmf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.pmf(Number.POSITIVE_INFINITY), "NOT_FINITE");
    expectKernelError(() => dist.pmf(Number.NEGATIVE_INFINITY), "NOT_FINITE");
  });

  it("never returns NaN or a negative value, even far out in the tail", () => {
    const dist = makeZip({ zeroInflation: 0.6, base: { r: 0.3, p: 0.9 } });
    for (const k of [0, 1, 10, 100, 1000, 100000]) {
      const v = dist.pmf(k);
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pi = 0 is the plain negative binomial, BIT FOR BIT
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — pi = 0 reproduces the base negative binomial exactly", () => {
  const bases: readonly NegBinomialParams[] = [
    { r: 4, p: 0.3 },
    { r: 1, p: 0.5 },
    { r: 0.7, p: 0.15 },
    { r: 30, p: 0.85 },
    { r: NEAR_POISSON_R, p: NEAR_POISSON_R / (NEAR_POISSON_R + 5) },
  ];

  it("pmf values are identical (toBe, not toBeCloseTo)", () => {
    for (const base of bases) {
      const nb = makeNegBinomial(base);
      const zip = makeZip({ zeroInflation: 0, base });
      for (let k = 0; k <= 120; k += 1) {
        expect(zip.pmf(k)).toBe(nb.pmf(k));
      }
    }
  });

  it("cdf values are identical", () => {
    for (const base of bases) {
      const nb = makeNegBinomial(base);
      const zip = makeZip({ zeroInflation: 0, base });
      for (let k = 0; k <= 120; k += 1) {
        expect(zip.cdf(k)).toBe(nb.cdf(k));
      }
    }
  });

  it("quantiles are identical", () => {
    for (const base of bases) {
      const nb = makeNegBinomial(base);
      const zip = makeZip({ zeroInflation: 0, base });
      for (const q of [0, 1e-12, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 1 - 1e-12, 1]) {
        expect(zip.quantile(q)).toBe(nb.quantile(q));
      }
    }
  });

  it("mean and variance are identical (the grouped variance form is exact at pi = 0)", () => {
    for (const base of bases) {
      const nb = makeNegBinomial(base);
      const zip = makeZip({ zeroInflation: 0, base });
      expect(zip.mean()).toBe(nb.mean());
      expect(zip.variance()).toBe(nb.variance());
    }
  });

  it("the seeded sample stream is identical", () => {
    const base = { r: 4, p: 0.3 } as const;
    expect(draw(makeZip({ zeroInflation: 0, base }), 2000, 4242)).toEqual(
      draw(makeNegBinomial(base), 2000, 4242),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pi = 1 is the degenerate point mass at 0
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — pi = 1 is the point mass at 0", () => {
  const dist = makeZip({ zeroInflation: 1, base: { r: 3, p: 0.4 } });

  it("puts all mass at 0", () => {
    expect(dist.pmf(0)).toBe(1);
    for (let k = 1; k <= 50; k += 1) expect(dist.pmf(k)).toBe(0);
  });

  it("has cdf 1 everywhere in the support, mean 0 and variance 0", () => {
    expect(dist.cdf(0)).toBe(1);
    expect(dist.cdf(9999)).toBe(1);
    expect(dist.cdf(-1)).toBe(0);
    expect(dist.mean()).toBe(0);
    expect(dist.variance()).toBe(0);
  });

  it("quantile is 0 for every probability and every draw is 0", () => {
    for (const q of [0, 1e-12, 0.5, 1 - 1e-12, 1]) expect(dist.quantile(q)).toBe(0);
    expect(draw(dist, 500, 7).every((x) => x === 0)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Moments — analytic, and proved against a numeric sum
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — analytic moments", () => {
  const momentCases: readonly ZipParams[] = [
    { zeroInflation: 0, base: { r: 4, p: 0.3 } },
    { zeroInflation: 0.2, base: { r: 3, p: 0.4 } },
    { zeroInflation: 0.5, base: { r: 5, p: 0.5 } },
    { zeroInflation: 0.85, base: { r: 2.5, p: 0.2 } },
    { zeroInflation: 0.97, base: { r: 1, p: 0.35 } },
    { zeroInflation: 0.4, base: { r: 0.7, p: 0.15 } },
  ];

  it("mean matches a pmf-weighted numeric sum to ~1e-9", () => {
    for (const params of momentCases) {
      const dist = makeZip(params);
      const numeric = numericMoments(dist, 20000);
      expect(numeric.mass).toBeCloseTo(1, 11);
      expect(numeric.mean).toBeCloseTo(dist.mean(), 9);
    }
  });

  it("variance matches a pmf-weighted numeric sum to ~1e-9", () => {
    for (const params of momentCases) {
      const dist = makeZip(params);
      const numeric = numericMoments(dist, 20000);
      expect(numeric.variance).toBeCloseTo(dist.variance(), 9);
    }
  });

  it("mean is exactly (1 - pi) * mu", () => {
    for (const params of momentCases) {
      const mu = makeNegBinomial(params.base).mean();
      expect(makeZip(params).mean()).toBe((1 - params.zeroInflation) * mu);
    }
  });

  it("the grouped variance form agrees with the contract's literal form", () => {
    for (const params of momentCases) {
      const grouped = makeZip(params).variance();
      const literal = contractVariance(params.zeroInflation, params.base);
      expect(grouped).toBeCloseTo(literal, 9);
      expect(Math.abs(grouped / literal - 1)).toBeLessThan(1e-12);
    }
  });

  it("the grouped form is strictly the more accurate one when mu^2 >> sigma^2", () => {
    // Near-Poisson base with a large mean: the contract's literal form subtracts
    // mu^2 = 1e6 from (sigma^2 + mu^2), discarding roughly three digits. The
    // grouped form has no cancellation at all, so it recovers the truth.
    const base = {
      r: NEAR_POISSON_R,
      p: NEAR_POISSON_R / (NEAR_POISSON_R + 1000),
    } as const;
    const params: ZipParams = { zeroInflation: 0, base };
    const truth = makeNegBinomial(base).variance();
    const grouped = makeZip(params).variance();
    const literal = contractVariance(0, base);
    expect(grouped).toBe(truth);
    expect(Math.abs(literal - truth)).toBeGreaterThan(Math.abs(grouped - truth));
  });

  it("variance >= mean for every admissible parameter set (inherited overdispersion)", () => {
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      expect(dist.variance()).toBeGreaterThanOrEqual(dist.mean() - 1e-9);
    }
  });

  it("empirical moments of a large seeded sample track the declared moments", () => {
    const dist = makeZip({ zeroInflation: 0.45, base: { r: 4, p: 0.3 } });
    const xs = draw(dist, 200000, 20260825);
    const { mean, variance } = sampleMoments(xs);
    expect(Math.abs(mean - dist.mean())).toBeLessThan(0.05);
    expect(Math.abs(variance / dist.variance() - 1)).toBeLessThan(0.05);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cdf
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — cdf", () => {
  it("is pi + (1-pi)*nb.cdf(k) below saturation", () => {
    const base = { r: 3, p: 0.35 } as const;
    const nb = makeNegBinomial(base);
    for (const pi of [0, 0.2, 0.65, 0.95]) {
      const dist = makeZip({ zeroInflation: pi, base });
      for (let k = 0; k <= 40; k += 1) {
        expect(dist.cdf(k)).toBeCloseTo(pi + (1 - pi) * nb.cdf(k), 14);
      }
    }
  });

  it("cdf(0) equals pmf(0)", () => {
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      expect(dist.cdf(0)).toBe(dist.pmf(0));
    }
  });

  it("is the cumulative pmf and is non-decreasing", () => {
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      let mass = 0;
      let previous = 0;
      for (let k = 0; k <= 300; k += 1) {
        mass += dist.pmf(k);
        const c = dist.cdf(k);
        expect(c).toBeCloseTo(mass, 9);
        expect(c).toBeGreaterThanOrEqual(previous - 1e-15);
        previous = c;
      }
    }
  });

  it("reaches EXACTLY 1 at the top of the support and stays there", () => {
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      const top = dist.quantile(1);
      expect(dist.cdf(top)).toBe(1);
      expect(dist.cdf(top + 1)).toBe(1);
      expect(dist.cdf(top + 100_000)).toBe(1);
    }
  });

  it("is a step function: cdf(x) = cdf(floor(x)), and 0 below the support", () => {
    const dist = makeZip({ zeroInflation: 0.3, base: { r: 3, p: 0.35 } });
    expect(dist.cdf(4.9)).toBe(dist.cdf(4));
    expect(dist.cdf(0.5)).toBe(dist.cdf(0));
    expect(dist.cdf(-0.5)).toBe(0);
    expect(dist.cdf(-10)).toBe(0);
  });

  it("throws NOT_FINITE for a non-finite k", () => {
    const dist = makeZip({ zeroInflation: 0.3, base: { r: 3, p: 0.35 } });
    expectKernelError(() => dist.cdf(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.cdf(Number.POSITIVE_INFINITY), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// quantile
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — quantile", () => {
  it("round-trips quantile(cdf(k)) === k wherever the cdf actually steps", () => {
    // The generalized inverse can only return k where cdf(k) > cdf(k-1). Past
    // the point where the base cumulative table saturates, consecutive cdf
    // values are identical to double precision (the pmf there is ~1e-16, far
    // below the kernel's 1e-12 truncation threshold) and the inverse correctly
    // returns the FIRST index carrying that value. The base neg-binomial slot
    // behaves identically; this guard is the precondition, not a weakening.
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      for (let k = 0; k <= 200; k += 1) {
        if (k > 0 && dist.cdf(k) <= dist.cdf(k - 1)) continue;
        expect(dist.quantile(dist.cdf(k))).toBe(k);
      }
    }
  });

  it("round-trips at the boundaries: k = 0 and the top of the support", () => {
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      expect(dist.quantile(dist.cdf(0))).toBe(0);
      const top = dist.quantile(1);
      expect(dist.quantile(dist.cdf(top))).toBe(top);
    }
  });

  it("returns the SMALLEST k with cdf(k) >= p", () => {
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      for (const q of [1e-12, 1e-6, 0.01, 0.2, 0.5, 0.8, 0.99, 1 - 1e-9]) {
        const k = dist.quantile(q);
        expect(Number.isInteger(k)).toBe(true);
        expect(k).toBeGreaterThanOrEqual(0);
        expect(dist.cdf(k)).toBeGreaterThanOrEqual(q - 1e-15);
        if (k > 0) expect(dist.cdf(k - 1)).toBeLessThan(q);
      }
    }
  });

  it("is non-decreasing in p", () => {
    const dist = makeZip({ zeroInflation: 0.35, base: { r: 2.5, p: 0.2 } });
    let previous = -1;
    for (const q of [0, 1e-9, 0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99, 1 - 1e-9, 1]) {
      const k = dist.quantile(q);
      expect(k).toBeGreaterThanOrEqual(previous);
      previous = k;
    }
  });

  it("everything at or below the zero mass answers 0", () => {
    const dist = makeZip({ zeroInflation: 0.6, base: { r: 3, p: 0.4 } });
    const zeroMass = dist.pmf(0);
    expect(dist.quantile(0)).toBe(0);
    expect(dist.quantile(zeroMass / 2)).toBe(0);
    expect(dist.quantile(zeroMass)).toBe(0);
    expect(dist.quantile(zeroMass + 1e-6)).toBeGreaterThan(0);
  });

  it("quantile(1) lands in the saturated tail where cdf is exactly 1", () => {
    for (const { params } of CONFORMANCE_CASES) {
      const dist = makeZip(params);
      const top = dist.quantile(1);
      expect(Number.isInteger(top)).toBe(true);
      expect(dist.cdf(top)).toBe(1);
    }
  });

  it("quantile(1) is the SMALLEST k where the MIXTURE cdf reaches 1", () => {
    // The mixture cdf pi + (1-pi)*F(k) rounds to exactly 1 strictly earlier than
    // F(k) itself does, so the mixture's top-of-support index is genuinely
    // smaller than the base's saturation index at large pi. Answering with the
    // base's index would violate the generalized-inverse contract.
    for (const params of [
      { zeroInflation: 0.9, base: { r: 2.5, p: 0.2 } },
      { zeroInflation: 0.99, base: { r: 8, p: 0.7 } },
      { zeroInflation: 0.999, base: { r: 6, p: 0.6 } },
      { zeroInflation: 1, base: { r: 3, p: 0.5 } },
    ] as const) {
      const dist = makeZip(params);
      const top = dist.quantile(1);
      expect(dist.cdf(top)).toBe(1);
      if (top > 0) expect(dist.cdf(top - 1)).toBeLessThan(1);
      expect(top).toBeLessThanOrEqual(makeNegBinomial(params.base).quantile(1));
    }
  });

  it("pi = 1 collapses the top of the support to 0 while the base saturates far out", () => {
    expect(makeZip({ zeroInflation: 1, base: { r: 3, p: 0.5 } }).quantile(1)).toBe(0);
    expect(makeNegBinomial({ r: 3, p: 0.5 }).quantile(1)).toBeGreaterThan(10);
  });

  it("throws DOMAIN for a probability outside [0,1]", () => {
    const dist = makeZip({ zeroInflation: 0.3, base: { r: 3, p: 0.35 } });
    expectKernelError(() => dist.quantile(1.5), "DOMAIN");
    expectKernelError(() => dist.quantile(-0.1), "DOMAIN");
    expectKernelError(() => dist.quantile(1 + 1e-9), "DOMAIN");
  });

  it("throws NOT_FINITE for a non-finite probability", () => {
    const dist = makeZip({ zeroInflation: 0.3, base: { r: 3, p: 0.35 } });
    expectKernelError(() => dist.quantile(Number.NaN), "NOT_FINITE");
    expectKernelError(() => dist.quantile(Number.POSITIVE_INFINITY), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sample
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — sample", () => {
  it("returns non-negative integers whose zero frequency tracks pmf(0)", () => {
    const n = 200000;
    for (const params of [
      { zeroInflation: 0.05, base: { r: 4, p: 0.3 } },
      { zeroInflation: 0.4, base: { r: 3, p: 0.4 } },
      { zeroInflation: 0.8, base: { r: 2, p: 0.25 } },
    ] as const) {
      const dist = makeZip(params);
      const xs = draw(dist, n, 13579);
      let zeros = 0;
      for (const x of xs) {
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        if (x === 0) zeros += 1;
      }
      const theoretical = dist.pmf(0);
      const se = Math.sqrt((theoretical * (1 - theoretical)) / n);
      expect(Math.abs(zeros / n - theoretical)).toBeLessThan(4 * se + 1e-6);
    }
  }, 120_000);

  it("the whole histogram tracks the pmf", () => {
    const dist = makeZip({ zeroInflation: 0.35, base: { r: 3, p: 0.5 } });
    const n = 200000;
    const xs = draw(dist, n, 555);
    const counts = new Map<number, number>();
    for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
    for (let k = 0; k <= 10; k += 1) {
      const empirical = (counts.get(k) ?? 0) / n;
      const theoretical = dist.pmf(k);
      const se = Math.sqrt((theoretical * (1 - theoretical)) / n);
      expect(Math.abs(empirical - theoretical)).toBeLessThan(4 * se + 1e-4);
    }
  }, 120_000);

  it("is deterministic for a fixed seed and differs across seeds", () => {
    const dist = makeZip({ zeroInflation: 0.5, base: { r: 5, p: 0.4 } });
    const a = draw(dist, 500, 99);
    const b = draw(dist, 500, 99);
    const c = draw(dist, 500, 100);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("a freshly built distribution reproduces the same stream (no hidden state)", () => {
    const params: ZipParams = { zeroInflation: 0.3, base: { r: 2.2, p: 0.45 } };
    expect(draw(makeZip(params), 300, 4242)).toEqual(draw(makeZip(params), 300, 4242));
  });

  it("consumes exactly one uniform per draw", () => {
    let calls = 0;
    const rng = makeRng(31337);
    const counting = (): number => {
      calls += 1;
      return rng();
    };
    const dist = makeZip({ zeroInflation: 0.5, base: { r: 3, p: 0.4 } });
    for (let i = 0; i < 250; i += 1) dist.sample(counting);
    expect(calls).toBe(250);
  });

  it("rejects an Rng that leaves [0,1)", () => {
    const dist = makeZip({ zeroInflation: 0.3, base: { r: 2, p: 0.5 } });
    expectKernelError(() => dist.sample(() => 1), "DOMAIN");
    expectKernelError(() => dist.sample(() => -0.1), "DOMAIN");
    expectKernelError(() => dist.sample(() => Number.NaN), "NOT_FINITE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Parameter validation and error propagation
// ─────────────────────────────────────────────────────────────────────────────

describe("makeZip — parameter validation", () => {
  it("throws DOMAIN for a zeroInflation outside [0,1]", () => {
    expectKernelError(
      () => makeZip({ zeroInflation: -0.01, base: { r: 2, p: 0.5 } }),
      "DOMAIN",
    );
    expectKernelError(() => makeZip({ zeroInflation: 1.01, base: { r: 2, p: 0.5 } }), "DOMAIN");
  });

  it("throws NOT_FINITE for a non-finite zeroInflation", () => {
    expectKernelError(
      () => makeZip({ zeroInflation: Number.NaN, base: { r: 2, p: 0.5 } }),
      "NOT_FINITE",
    );
    expectKernelError(
      () => makeZip({ zeroInflation: Number.POSITIVE_INFINITY, base: { r: 2, p: 0.5 } }),
      "NOT_FINITE",
    );
  });

  it("propagates the base slot's DOMAIN errors", () => {
    expectKernelError(() => makeZip({ zeroInflation: 0.5, base: { r: 0, p: 0.5 } }), "DOMAIN");
    expectKernelError(() => makeZip({ zeroInflation: 0.5, base: { r: -2, p: 0.5 } }), "DOMAIN");
    expectKernelError(() => makeZip({ zeroInflation: 0.5, base: { r: 2, p: 0 } }), "DOMAIN");
    expectKernelError(() => makeZip({ zeroInflation: 0.5, base: { r: 2, p: 1.5 } }), "DOMAIN");
  });

  it("propagates the base slot's NOT_FINITE errors", () => {
    expectKernelError(
      () => makeZip({ zeroInflation: 0.5, base: { r: Number.NaN, p: 0.5 } }),
      "NOT_FINITE",
    );
    expectKernelError(
      () => makeZip({ zeroInflation: 0.5, base: { r: 2, p: Number.NaN } }),
      "NOT_FINITE",
    );
  });

  it("validates the base even at pi = 1, where it carries no mass", () => {
    expectKernelError(() => makeZip({ zeroInflation: 1, base: { r: -1, p: 0.5 } }), "DOMAIN");
    expectKernelError(() => makeZip({ zeroInflation: 1, base: { r: 2, p: 0 } }), "DOMAIN");
  });

  it("propagates the base slot's NO_CONVERGENCE rather than masking it", () => {
    // Mean = r(1-p)/p ~ 1.9e7, far past the base slot's support ceiling, and
    // pmf(0) underflows to 0 so the cumulative table stalls immediately.
    //
    // A FRESH distribution per assertion is deliberate. The neg-binomial slot
    // pushes the stalled entry onto its memoized cumulative table BEFORE it
    // throws, so a second call on the SAME instance reads that partial entry and
    // returns a value instead of re-throwing. That is the base slot's behaviour,
    // not this slot's, and this slot must not paper over it by caching a
    // sticky error of its own.
    const failing = (): ZipParams => ({
      zeroInflation: 0.5,
      base: { r: NEAR_POISSON_R, p: 0.05 },
    });
    expectKernelError(() => makeZip(failing()).cdf(0), "NO_CONVERGENCE");
    expectKernelError(() => makeZip(failing()).quantile(0.5), "NO_CONVERGENCE");
    expectKernelError(() => makeZip(failing()).sample(() => 0.5), "NO_CONVERGENCE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitZip — recovery of known parameters from seeded draws
// ─────────────────────────────────────────────────────────────────────────────

describe("fitZip — round trip from seeded synthetic data", () => {
  const truths: readonly ZipParams[] = [
    { zeroInflation: 0.5, base: { r: 5, p: 0.5 } },
    { zeroInflation: 0.3, base: { r: 3, p: 0.25 } },
    { zeroInflation: 0.15, base: { r: 8, p: 0.4 } },
    { zeroInflation: 0.6, base: { r: 2, p: 0.2 } },
    { zeroInflation: 0.7, base: { r: 10, p: 0.6 } },
    { zeroInflation: 0.05, base: { r: 4, p: 0.3 } },
  ];

  // STATED TOLERANCE at n = 200000 with the fixed seed below: pi within 0.01
  // absolute, r within 5% relative, p within 3% relative. These are the levels
  // the slot's docblock claims for the large-n regime.
  for (const truth of truths) {
    it(`recovers pi=${truth.zeroInflation} r=${truth.base.r} p=${truth.base.p}`, () => {
      const counts = draw(makeZip(truth), 200000, 20260825);
      const fit = fitZip(counts);
      expect(Math.abs(fit.zeroInflation - truth.zeroInflation)).toBeLessThan(0.01);
      expect(Math.abs(fit.base.r / truth.base.r - 1)).toBeLessThan(0.05);
      expect(Math.abs(fit.base.p / truth.base.p - 1)).toBeLessThan(0.03);
    }, 120_000);
  }

  it("the refitted predictive reproduces the observed zero frequency", () => {
    for (const truth of truths) {
      const counts = draw(makeZip(truth), 200000, 20260825);
      const observedZeroRate = counts.filter((c) => c === 0).length / counts.length;
      expect(makeZip(fitZip(counts)).pmf(0)).toBeCloseTo(observedZeroRate, 3);
    }
  }, 120_000);

  it("satisfies the classical zero-frequency identity to the rounding granularity", () => {
    // pi_hat = (p0_hat - f0_hat) / (1 - f0_hat). The returned pi_hat differs from
    // this only by the integer rounding of the implied zero allocation, i.e. by
    // at most ~1/n — exactly the granularity the docblock claims.
    for (const truth of truths) {
      const n = 20000;
      const counts = draw(makeZip(truth), n, 4242);
      const fit = fitZip(counts);
      const observedZeroRate = counts.filter((c) => c === 0).length / n;
      const f0 = makeNegBinomial(fit.base).pmf(0);
      const identity = (observedZeroRate - f0) / (1 - f0);
      expect(Math.abs(fit.zeroInflation - identity)).toBeLessThan(1.5 / n);
    }
  }, 120_000);

  it("every recovered fit builds a conforming distribution", () => {
    for (const truth of truths) {
      const counts = draw(makeZip(truth), 20000, 987654);
      expect(() =>
        assertDistributionConformance(makeZip(fitZip(counts)), { draws: 4000 }),
      ).not.toThrow();
    }
  }, 120_000);

  it("is invariant to the order of the counts (a pure moment estimator)", () => {
    const counts = [0, 1, 0, 8, 0, 3, 0, 14, 2, 0, 5, 5, 0, 21, 0, 0, 1, 0, 0, 7];
    const a = fitZip(counts);
    const b = fitZip([...counts].reverse());
    expect(a.zeroInflation).toBe(b.zeroInflation);
    expect(a.base.r).toBeCloseTo(b.base.r, 12);
    expect(a.base.p).toBeCloseTo(b.base.p, 12);
  });

  it("does not mutate its input", () => {
    const counts = [0, 0, 1, 2, 0, 40, 3];
    const copy = [...counts];
    fitZip(counts);
    expect(counts).toEqual(copy);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitZip — the documented bias, pinned as a regression
// ─────────────────────────────────────────────────────────────────────────────

describe("fitZip — documented small-sample bias", () => {
  it("overstates r badly at n = 1000, as the docblock warns", () => {
    // Method-of-moments r-hat is a ratio with a noisy denominator and a heavily
    // right-skewed sampling distribution. On this seeded sample it overshoots by
    // more than 40%, while pi is already close. This test PINS the documented
    // behaviour; it is not an aspiration.
    const truth: ZipParams = { zeroInflation: 0.5, base: { r: 5, p: 0.5 } };
    const fit = fitZip(draw(makeZip(truth), 1000, 20260825));
    expect(Math.abs(fit.zeroInflation - 0.5)).toBeLessThan(0.02);
    expect(fit.base.r).toBeGreaterThan(1.3 * truth.base.r);
  });

  it("still returns an admissible, conforming fit in that regime", () => {
    const truth: ZipParams = { zeroInflation: 0.5, base: { r: 5, p: 0.5 } };
    const fit = fitZip(draw(makeZip(truth), 1000, 20260825));
    expect(fit.zeroInflation).toBeGreaterThanOrEqual(0);
    expect(fit.zeroInflation).toBeLessThanOrEqual(1);
    expect(() =>
      assertDistributionConformance(makeZip(fit), { draws: 4000 }),
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitZip — degenerate inputs, every one documented
// ─────────────────────────────────────────────────────────────────────────────

describe("fitZip — all-zero input (pi unidentifiable)", () => {
  it("returns the documented convention pi = 0 with the base carrying the point mass", () => {
    for (const counts of [[0], [0, 0], [0, 0, 0, 0, 0, 0]]) {
      const fit = fitZip(counts);
      expect(fit.zeroInflation).toBe(0);
      expect(fit.base.r).toBe(NEAR_POISSON_R);
      expect(fit.base.p).toBe(1);
    }
  });

  it("agrees with the base slot's own all-zero fit", () => {
    const counts = [0, 0, 0, 0];
    expect(fitZip(counts).base).toEqual(fitNegBinomial(counts));
  });

  it("the predictive is a point mass at 0 and is identical for EVERY pi", () => {
    // This is why the convention is only a convention: the parameters are not
    // identified, but the predictive is unique.
    const fit = fitZip([0, 0, 0, 0]);
    const reference = makeZip(fit);
    expect(reference.pmf(0)).toBe(1);
    expect(reference.mean()).toBe(0);
    expect(reference.variance()).toBe(0);
    for (const pi of [0, 0.25, 0.5, 0.9, 1]) {
      const alternative = makeZip({ zeroInflation: pi, base: fit.base });
      for (let k = 0; k <= 20; k += 1) {
        expect(alternative.pmf(k)).toBe(reference.pmf(k));
      }
    }
  });
});

describe("fitZip — no zeros at all (implied pi <= 0)", () => {
  it("clamps to pi = 0 and returns the plain NB fit on the untouched sample", () => {
    for (const counts of [
      [1, 2, 3, 4],
      [7],
      [18, 22, 31, 12, 27, 25, 19, 40],
      [5, 5, 5, 5, 5],
    ]) {
      const fit = fitZip(counts);
      expect(fit.zeroInflation).toBe(0);
      expect(fit.base).toEqual(fitNegBinomial(counts));
    }
  });

  it("the clamped fit is a usable member of the family (a negative pi would not be)", () => {
    const fit = fitZip([18, 22, 31, 12, 27, 25, 19, 40]);
    expect(fit.zeroInflation).toBeGreaterThanOrEqual(0);
    expect(() => makeZip(fit)).not.toThrow();
    expect(() => assertDistributionConformance(makeZip(fit), { draws: 4000 })).not.toThrow();
  });
});

describe("fitZip — zero DEFLATION (fewer zeros than the count process alone predicts)", () => {
  it("clamps to pi = 0 rather than returning an inexpressible negative inflation", () => {
    // Nine ones and a single zero. The count process fitted to that sample
    // predicts far more zeros than one, so the unconstrained pi-hat is negative.
    for (const counts of [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 1, 2, 1, 2, 1, 2, 0],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],
    ]) {
      const fit = fitZip(counts);
      expect(fit.zeroInflation).toBe(0);
    }
  });

  it("the clamped fit still over-predicts zeros — the family cannot represent deflation", () => {
    const counts = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0];
    const observedZeroRate = 0.1;
    const fit = fitZip(counts);
    expect(fit.zeroInflation).toBe(0);
    // The honest consequence, stated as an assertion: the model's zero mass sits
    // ABOVE the observed rate and there is no parameter that could lower it.
    expect(makeZip(fit).pmf(0)).toBeGreaterThan(observedZeroRate);
  });

  it("a caller can detect deflation by comparing the observed rate to pmf(0)", () => {
    const counts = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0];
    const observed = counts.filter((c) => c === 0).length / counts.length;
    const fitted = makeZip(fitZip(counts)).pmf(0);
    expect(fitted - observed).toBeGreaterThan(0);
  });
});

describe("fitZip — under-dispersed positive part (the base slot's near-Poisson path)", () => {
  it("does not defeat the base slot: an under-dispersed positive part stays near-Poisson", () => {
    // Alternating 4/5 in the positive part: variance far below the mean.
    const fit = fitZip([4, 5, 4, 5, 0, 0, 0]);
    expect(fit.base.r).toBe(NEAR_POISSON_R);
    expect(fit.zeroInflation).toBeGreaterThan(0);
    expect(() => assertDistributionConformance(makeZip(fit), { draws: 4000 })).not.toThrow();
  });

  it("identical positive values plus zeros still produce a valid inflated fit", () => {
    const fit = fitZip([5, 5, 5, 5, 0]);
    expect(fit.base.r).toBe(NEAR_POISSON_R);
    expect(fit.zeroInflation).toBeGreaterThan(0);
    expect(fit.base.p).toBeLessThan(1);
  });

  it("the de-inflated sample always keeps a positive value, so p stays strictly below 1", () => {
    for (const counts of [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 12],
      [0, 0, 3, 0, 0, 4, 0, 0, 5, 0],
      [0, 0, 0, 1],
      [4, 5, 4, 5, 0, 0, 0],
    ]) {
      const fit = fitZip(counts);
      expect(fit.base.p).toBeGreaterThan(0);
      expect(fit.base.p).toBeLessThan(1);
      expect(makeZip(fit).mean()).toBeGreaterThan(0);
    }
  });

  it("an overdispersed sample does NOT get snapped to near-Poisson", () => {
    const fit = fitZip([0, 1, 2, 3, 4, 5]);
    expect(fit.base.r).toBeLessThan(NEAR_POISSON_R);
  });
});

describe("fitZip — tiny samples", () => {
  it("n = 1 with a positive value gives pi = 0 and the base slot's near-Poisson fit", () => {
    const fit = fitZip([12]);
    expect(fit.zeroInflation).toBe(0);
    expect(fit.base.r).toBe(NEAR_POISSON_R);
    expect(makeZip(fit).mean()).toBeCloseTo(12, 8);
  });

  it("n = 1 with a zero is the all-zero case", () => {
    const fit = fitZip([0]);
    expect(fit.zeroInflation).toBe(0);
    expect(makeZip(fit).pmf(0)).toBe(1);
  });

  it("n = 2 with one zero and one positive does not throw and stays admissible", () => {
    const fit = fitZip([0, 1]);
    expect(fit.zeroInflation).toBeGreaterThanOrEqual(0);
    expect(fit.zeroInflation).toBeLessThanOrEqual(1);
    expect(() => makeZip(fit)).not.toThrow();
  });
});

describe("fitZip — fail-closed inputs", () => {
  it("throws EMPTY on no counts", () => {
    expectKernelError(() => fitZip([]), "EMPTY");
  });

  it("throws DOMAIN on a negative count", () => {
    expectKernelError(() => fitZip([1, 2, -1]), "DOMAIN");
    expectKernelError(() => fitZip([-3]), "DOMAIN");
  });

  it("throws DOMAIN on a non-integer count", () => {
    expectKernelError(() => fitZip([1, 2, 2.5]), "DOMAIN");
    expectKernelError(() => fitZip([0, 0, 0.5]), "DOMAIN");
  });

  it("throws NOT_FINITE on NaN or Infinity", () => {
    expectKernelError(() => fitZip([1, Number.NaN]), "NOT_FINITE");
    expectKernelError(() => fitZip([1, Number.POSITIVE_INFINITY]), "NOT_FINITE");
    expectKernelError(() => fitZip([Number.NEGATIVE_INFINITY, 2]), "NOT_FINITE");
  });

  it("validates every element, not just the first", () => {
    expectKernelError(() => fitZip([0, 0, 0, 0, 0, 0, 0, 0, 0, -1]), "DOMAIN");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitZip — invariants that must hold everywhere
// ─────────────────────────────────────────────────────────────────────────────

describe("fitZip — invariants across a broad sweep", () => {
  it("always returns an admissible ZipParams that makeZip accepts", () => {
    for (const pi of [0, 0.1, 0.5, 0.9]) {
      for (const base of [
        { r: 0.4, p: 0.1 },
        { r: 1, p: 0.5 },
        { r: 8, p: 0.3 },
        { r: 40, p: 0.8 },
      ] as const) {
        for (const n of [1, 2, 3, 5, 10, 37, 250]) {
          for (const seed of [1, 2, 3]) {
            const counts = draw(makeZip({ zeroInflation: pi, base }), n, seed);
            const fit = fitZip(counts);
            expect(Number.isFinite(fit.zeroInflation)).toBe(true);
            expect(fit.zeroInflation).toBeGreaterThanOrEqual(0);
            expect(fit.zeroInflation).toBeLessThanOrEqual(1);
            expect(fit.base.r).toBeGreaterThan(0);
            expect(fit.base.p).toBeGreaterThan(0);
            expect(fit.base.p).toBeLessThanOrEqual(1);
            expect(() => makeZip(fit)).not.toThrow();
          }
        }
      }
    }
  }, 120_000);

  it("never returns pi = 1 (that would require no positive observation at all)", () => {
    for (const counts of [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 12],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    ]) {
      expect(fitZip(counts).zeroInflation).toBeLessThan(1);
    }
  });

  it("more zeros in the sample never decreases the fitted zero mass", () => {
    const positives = [3, 4, 5, 3, 6, 4, 5, 2, 7, 4];
    let previous = -1;
    for (const extraZeros of [0, 2, 5, 10, 20, 50]) {
      const counts = [...positives, ...new Array<number>(extraZeros).fill(0)];
      const zeroMass = makeZip(fitZip(counts)).pmf(0);
      expect(zeroMass).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = zeroMass;
    }
  });

  it("every degenerate sample produces a conforming distribution", () => {
    const samples: readonly (readonly number[])[] = [
      [0, 0, 0, 0],
      [0],
      [7],
      [1, 2, 3, 4],
      [0, 1],
      [0, 1, 2, 3, 4, 5],
      [5, 5, 5, 5, 0],
      [4, 5, 4, 5, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 12],
      [0, 0, 3, 0, 0, 4, 0, 0, 5, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [18, 22, 31, 12, 27, 25, 19, 40],
    ];
    for (const counts of samples) {
      const dist = makeZip(fitZip(counts));
      expect(() => assertDistributionConformance(dist, { draws: 4000 })).not.toThrow();
    }
  }, 120_000);
});
