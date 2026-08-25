import { describe, it, expect } from "vitest";

import {
  KernelError,
  makeRng,
  type DiscreteDistribution,
  type Probability,
  type Rng,
  type Support,
} from "../contract.js";
import { assertDistributionConformance } from "../conformance.js";
import { logChoose, normalCdf } from "../numeric.js";
import { pitDiscrete, pitHistogram } from "../slots/pit.js";

// ───────────────────────────────────────────────────────────────────────────────
// Test fixtures — minimal, self-contained discrete distributions.
// These are NOT kernel slots; they exist so the PIT tests can be checked against
// closed-form probabilities. Both are run through `assertDistributionConformance`
// below so that a broken fixture cannot silently pass a PIT test.
// ───────────────────────────────────────────────────────────────────────────────

function makeBinomial(n: number, p: number): DiscreteDistribution {
  const pmfAt = (k: number): number => {
    if (!Number.isInteger(k)) {
      throw new KernelError("DOMAIN", `pmf requires an integer, received ${k}`);
    }
    if (k < 0 || k > n) return 0;
    return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  };
  const cdfAt = (k: number): number => {
    if (k < 0) return 0;
    const top = Math.min(Math.floor(k), n);
    let acc = 0;
    for (let i = 0; i <= top; i += 1) acc += pmfAt(i);
    return Math.min(1, acc);
  };
  return {
    kind: "discrete",
    pmf: pmfAt,
    cdf: cdfAt,
    quantile(prob: Probability): number {
      if (!Number.isFinite(prob) || prob < 0 || prob > 1) {
        throw new KernelError("DOMAIN", `quantile requires p in [0,1], received ${prob}`);
      }
      let acc = 0;
      for (let k = 0; k <= n; k += 1) {
        acc += pmfAt(k);
        if (acc >= prob - 1e-12) return k;
      }
      return n;
    },
    sample(rng: Rng): number {
      const u = rng();
      let acc = 0;
      for (let k = 0; k <= n; k += 1) {
        acc += pmfAt(k);
        if (u < acc) return k;
      }
      return n;
    },
    mean: () => n * p,
    variance: () => n * p * (1 - p),
    support: (): Support => ({ min: 0, max: n }),
  };
}

/**
 * Distribution from an explicit pmf table starting at 0. Used for the
 * closed-form checks: with DYADIC probabilities (k/32) every quantity in the
 * PIT identity is exactly representable in binary floating point, so the
 * assertions can demand exact equality rather than a tolerance.
 */
function makeTable(probs: readonly number[]): DiscreteDistribution {
  const n = probs.length - 1;
  const pmfAt = (k: number): number => {
    if (!Number.isInteger(k)) {
      throw new KernelError("DOMAIN", `pmf requires an integer, received ${k}`);
    }
    return k < 0 || k > n ? 0 : probs[k]!;
  };
  const cdfAt = (k: number): number => {
    if (k < 0) return 0;
    const top = Math.min(Math.floor(k), n);
    let acc = 0;
    for (let i = 0; i <= top; i += 1) acc += probs[i]!;
    return acc;
  };
  return {
    kind: "discrete",
    pmf: pmfAt,
    cdf: cdfAt,
    quantile(prob: Probability): number {
      if (!Number.isFinite(prob) || prob < 0 || prob > 1) {
        throw new KernelError("DOMAIN", `quantile requires p in [0,1], received ${prob}`);
      }
      for (let k = 0; k <= n; k += 1) if (cdfAt(k) >= prob - 1e-12) return k;
      return n;
    },
    sample(rng: Rng): number {
      const u = rng();
      let acc = 0;
      for (let k = 0; k <= n; k += 1) {
        acc += probs[k]!;
        if (u < acc) return k;
      }
      return n;
    },
    mean(): number {
      let m = 0;
      for (let k = 0; k <= n; k += 1) m += k * probs[k]!;
      return m;
    },
    variance(): number {
      let m = 0;
      let m2 = 0;
      for (let k = 0; k <= n; k += 1) {
        m += k * probs[k]!;
        m2 += k * k * probs[k]!;
      }
      return m2 - m * m;
    },
    support: (): Support => ({ min: 0, max: n }),
  };
}

function makePointMass(at: number): DiscreteDistribution {
  return {
    kind: "discrete",
    pmf(k: number): number {
      if (!Number.isInteger(k)) {
        throw new KernelError("DOMAIN", `pmf requires an integer, received ${k}`);
      }
      return k === at ? 1 : 0;
    },
    cdf: (k: number): number => (k >= at ? 1 : 0),
    quantile(prob: Probability): number {
      if (!Number.isFinite(prob) || prob < 0 || prob > 1) {
        throw new KernelError("DOMAIN", `quantile requires p in [0,1], received ${prob}`);
      }
      return at;
    },
    sample: (_rng: Rng): number => at,
    mean: () => at,
    variance: () => 0,
    support: (): Support => ({ min: at, max: at }),
  };
}

/** Repeated PIT of independent draws from `truth`, scored against `scored`. */
function pitSeries(
  truth: DiscreteDistribution,
  scored: DiscreteDistribution,
  count: number,
  drawSeed: number,
  pitSeed: number,
): number[] {
  const drawRng = makeRng(drawSeed);
  const pitRng = makeRng(pitSeed);
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pitDiscrete(scored, truth.sample(drawRng), pitRng));
  }
  return out;
}

const constantRng = (v: number): Rng => () => v;

describe("test fixtures conform to the DiscreteDistribution contract", () => {
  it("binomial(5, 0.5) conforms", () => {
    assertDistributionConformance(makeBinomial(5, 0.5));
  });
  it("binomial(12, 0.3) conforms", () => {
    assertDistributionConformance(makeBinomial(12, 0.3));
  });
  it("point mass conforms", () => {
    assertDistributionConformance(makePointMass(3));
  });
  it("the exact dyadic table conforms", () => {
    assertDistributionConformance(
      makeTable([1 / 32, 5 / 32, 10 / 32, 10 / 32, 5 / 32, 1 / 32]),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// pitDiscrete — closed-form values
// ───────────────────────────────────────────────────────────────────────────────

describe("pitDiscrete — closed form", () => {
  // Binomial(5, 0.5) pmf, in exact 32nds: 1, 5, 10, 10, 5, 1.
  const bin5 = makeTable([1 / 32, 5 / 32, 10 / 32, 10 / 32, 5 / 32, 1 / 32]);
  const cdf1 = 6 / 32;
  const cdf2 = 16 / 32;
  const pmf2 = 10 / 32;

  it("u = F(y-1) + v*P(Y=y) exactly, for a controlled v", () => {
    // Dyadic probabilities → the identity holds bit-for-bit, no tolerance.
    expect(pitDiscrete(bin5, 2, constantRng(0.5))).toBe(cdf1 + 0.5 * pmf2);
    expect(pitDiscrete(bin5, 2, constantRng(0.5))).toBe(11 / 32);
    expect(pitDiscrete(bin5, 2, constantRng(0.25))).toBe(cdf1 + 0.25 * pmf2);
    expect(pitDiscrete(bin5, 2, constantRng(0.25))).toBe(17 / 64);
    expect(pitDiscrete(bin5, 2, constantRng(0.8))).toBeCloseTo(cdf1 + 0.8 * pmf2, 15);
  });

  it("v = 0 gives exactly F(y-1); v -> 1 approaches F(y)", () => {
    expect(pitDiscrete(bin5, 2, constantRng(0))).toBe(cdf1);
    expect(pitDiscrete(bin5, 2, constantRng(1 - 1e-12))).toBeCloseTo(cdf2, 10);
  });

  it("F(min - 1) = 0: the smallest outcome maps into [0, P(Y=min)]", () => {
    const pmf0 = 1 / 32;
    expect(pitDiscrete(bin5, 0, constantRng(0))).toBe(0);
    expect(pitDiscrete(bin5, 0, constantRng(0.5))).toBe(0.5 * pmf0);
  });

  it("the largest outcome maps into [F(max-1), 1]", () => {
    expect(pitDiscrete(bin5, 5, constantRng(0))).toBe(31 / 32);
    expect(pitDiscrete(bin5, 5, constantRng(1 - 1e-12))).toBeCloseTo(1, 10);
  });

  it("a point mass transforms to the raw uniform draw (u = v exactly)", () => {
    // lower = 0 and P(Y = y) = 1, so the randomized PIT IS the uniform. This is
    // the degenerate case that proves the transform is measure-preserving.
    const point = makePointMass(3);
    for (const v of [0, 0.125, 0.5, 0.75, 0.9999]) {
      expect(pitDiscrete(point, 3, constantRng(v))).toBe(v);
    }
  });

  it("consumes exactly one uniform per call", () => {
    let calls = 0;
    const counting: Rng = () => {
      calls += 1;
      return 0.5;
    };
    pitDiscrete(bin5, 3, counting);
    expect(calls).toBe(1);
    pitDiscrete(bin5, 0, counting);
    expect(calls).toBe(2);
    // Also for out-of-support observations, so replays never desynchronize.
    pitDiscrete(bin5, 99, counting);
    expect(calls).toBe(3);
  });

  it("always returns a value in [0, 1]", () => {
    const rng = makeRng(4242);
    const dist = makeBinomial(9, 0.4);
    const drawRng = makeRng(99);
    for (let i = 0; i < 3000; i += 1) {
      const u = pitDiscrete(dist, dist.sample(drawRng), rng);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
      expect(Number.isFinite(u)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed and differs across seeds", () => {
    const dist = makeBinomial(7, 0.35);
    const a = pitSeries(dist, dist, 50, 11, 22);
    const b = pitSeries(dist, dist, 50, 11, 22);
    const c = pitSeries(dist, dist, 50, 11, 23);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("observations outside the support give the extreme PIT values", () => {
    // The forecast assigned these zero mass: F(y-1) = 0 below, F(y-1) = 1 above.
    expect(pitDiscrete(bin5, 6, makeRng(1))).toBe(1);
    expect(pitDiscrete(bin5, 400, makeRng(1))).toBe(1);
    expect(pitDiscrete(makePointMass(3), 0, makeRng(1))).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// pitDiscrete — failure modes
// ───────────────────────────────────────────────────────────────────────────────

describe("pitDiscrete — fails closed", () => {
  const bin5 = makeBinomial(5, 0.5);

  it("throws DOMAIN for a non-integer observation", () => {
    expect(() => pitDiscrete(bin5, 2.5, makeRng(1))).toThrowError(KernelError);
    try {
      pitDiscrete(bin5, 2.5, makeRng(1));
    } catch (e) {
      expect((e as KernelError).code).toBe("DOMAIN");
    }
  });

  it("throws NOT_FINITE for NaN / Infinity observations", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      try {
        pitDiscrete(bin5, bad, makeRng(1));
        throw new Error("expected a throw");
      } catch (e) {
        expect(e).toBeInstanceOf(KernelError);
        expect((e as KernelError).code).toBe("NOT_FINITE");
      }
    }
  });

  it("throws DOMAIN when the rng returns outside [0,1)", () => {
    for (const bad of [-0.001, 1, 1.5]) {
      try {
        pitDiscrete(bin5, 2, constantRng(bad));
        throw new Error("expected a throw");
      } catch (e) {
        expect(e).toBeInstanceOf(KernelError);
        expect((e as KernelError).code).toBe("DOMAIN");
      }
    }
  });

  it("throws NOT_FINITE when the rng returns NaN", () => {
    try {
      pitDiscrete(bin5, 2, constantRng(Number.NaN));
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("NOT_FINITE");
    }
  });

  it("throws DOMAIN when cdf and pmf are mutually inconsistent", () => {
    // A deliberately broken distribution: F(1) = 0.9 but P(Y = 2) = 0.9, so the
    // transform would land at 1.8. Never silently clamped.
    const broken: DiscreteDistribution = {
      ...makeBinomial(5, 0.5),
      cdf: () => 0.9,
      pmf: () => 0.9,
    };
    try {
      pitDiscrete(broken, 2, constantRng(0.999));
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("DOMAIN");
    }
  });

  it("throws DOMAIN when the distribution reports a probability outside [0,1]", () => {
    const broken: DiscreteDistribution = { ...makeBinomial(5, 0.5), pmf: () => 1.4 };
    try {
      pitDiscrete(broken, 2, constantRng(0));
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("DOMAIN");
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// pitHistogram — binning + chi-square against known table values
// ───────────────────────────────────────────────────────────────────────────────

describe("pitHistogram — binning", () => {
  it("defaults to 10 bins and counts sum to n", () => {
    const values = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
    const h = pitHistogram(values);
    expect(h.bins).toBe(10);
    expect(h.counts).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(values.length);
  });

  it("places 0 in the first bin and 1 in the last bin", () => {
    const h = pitHistogram([0, 1], 4);
    expect(h.counts).toEqual([1, 0, 0, 1]);
  });

  it("uses half-open bins [b/B, (b+1)/B)", () => {
    // bin0: 0.0, 0.2499999 | bin1: 0.25 | bin2: 0.5, 0.7499999 | bin3: 0.75, 0.999999
    const h = pitHistogram([0.0, 0.2499999, 0.25, 0.5, 0.7499999, 0.75, 0.999999], 4);
    expect(h.counts).toEqual([2, 1, 2, 2]);
  });

  it("handles a single value", () => {
    const h = pitHistogram([0.42], 2);
    expect(h.counts).toEqual([1, 0]);
    expect(h.uniformityPValue).toBeGreaterThan(0);
    expect(h.uniformityPValue).toBeLessThanOrEqual(1);
  });

  it("handles all-identical values (maximally non-uniform)", () => {
    const values = new Array<number>(200).fill(0.42);
    const h = pitHistogram(values, 10);
    expect(h.counts[4]).toBe(200);
    // X² = (200-20)²/20 + 9·(20²/20) = 1620 + 180 = 1800 on 9 df.
    expect(h.uniformityPValue).toBeLessThan(1e-12);
  });
});

describe("pitHistogram — chi-square p-value against known values", () => {
  it("perfectly uniform counts give X² = 0 and p = 1", () => {
    const values: number[] = [];
    for (let b = 0; b < 10; b += 1) {
      for (let i = 0; i < 7; i += 1) values.push((b + 0.5) / 10);
    }
    const h = pitHistogram(values, 10);
    expect(h.counts).toEqual(new Array<number>(10).fill(7));
    expect(h.uniformityPValue).toBe(1);
  });

  it("df = 1, X² = 4 → p = 2·(1 − Φ(2)) = 0.0455002638963584", () => {
    // counts [60, 40], expected 50 → X² = (10²+10²)/50 = 4 on 1 df.
    // Closed form: P(χ²₁ > z²) = 2·(1 − Φ(z)).
    const values = [
      ...new Array<number>(60).fill(0.25),
      ...new Array<number>(40).fill(0.75),
    ];
    const h = pitHistogram(values, 2);
    expect(h.counts).toEqual([60, 40]);
    expect(h.uniformityPValue).toBeCloseTo(2 * (1 - normalCdf(2)), 12);
    expect(h.uniformityPValue).toBeCloseTo(0.045500263896358, 12);
  });

  it("df = 1, X² = 1 → p = 2·(1 − Φ(1)) = 0.3173105078629141", () => {
    // counts [55, 45], expected 50 → X² = (25+25)/50 = 1 on 1 df.
    const values = [
      ...new Array<number>(55).fill(0.25),
      ...new Array<number>(45).fill(0.75),
    ];
    const h = pitHistogram(values, 2);
    expect(h.uniformityPValue).toBeCloseTo(0.3173105078629141, 12);
  });

  it("df = 2 → p = exp(−X²/2), the exact chi-square-with-2-df tail", () => {
    // counts [40, 30, 20], n = 90, expected 30 → X² = (100 + 0 + 100)/30 = 20/3.
    const values = [
      ...new Array<number>(40).fill(1 / 6),
      ...new Array<number>(30).fill(0.5),
      ...new Array<number>(20).fill(5 / 6),
    ];
    const h = pitHistogram(values, 3);
    expect(h.counts).toEqual([40, 30, 20]);
    expect(h.uniformityPValue).toBeCloseTo(Math.exp(-10 / 3), 12);
    expect(h.uniformityPValue).toBeCloseTo(0.03567399334725241, 12);
  });

  it("p-value decreases monotonically as the histogram skews further", () => {
    const build = (left: number): number => {
      const values = [
        ...new Array<number>(left).fill(0.25),
        ...new Array<number>(100 - left).fill(0.75),
      ];
      return pitHistogram(values, 2).uniformityPValue;
    };
    const ps = [50, 55, 60, 65, 70].map(build);
    for (let i = 1; i < ps.length; i += 1) {
      expect(ps[i]!).toBeLessThan(ps[i - 1]!);
    }
    expect(ps[0]).toBe(1);
  });
});

describe("pitHistogram — fails closed", () => {
  it("throws EMPTY for no values", () => {
    try {
      pitHistogram([]);
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("EMPTY");
    }
  });

  it("throws DOMAIN for bins < 2 or non-integer bins", () => {
    for (const bad of [1, 0, -3, 2.5]) {
      try {
        pitHistogram([0.5], bad);
        throw new Error("expected a throw");
      } catch (e) {
        expect(e).toBeInstanceOf(KernelError);
        expect((e as KernelError).code).toBe("DOMAIN");
      }
    }
  });

  it("throws NOT_FINITE for non-finite bins", () => {
    try {
      pitHistogram([0.5], Number.NaN);
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("NOT_FINITE");
    }
  });

  it("throws DOMAIN for a PIT value outside [0,1]", () => {
    for (const bad of [-0.001, 1.0001, 12]) {
      try {
        pitHistogram([0.5, bad, 0.2]);
        throw new Error("expected a throw");
      } catch (e) {
        expect(e).toBeInstanceOf(KernelError);
        expect((e as KernelError).code).toBe("DOMAIN");
      }
    }
  });

  it("throws NOT_FINITE for a NaN PIT value", () => {
    try {
      pitHistogram([0.5, Number.NaN]);
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("NOT_FINITE");
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// The mandated end-to-end test: uniformity under a MATCHED simulate/score pair,
// non-uniformity under a mismatched one, and the demonstration that plain
// (non-randomized) PIT fails even when the forecast is perfect.
// ───────────────────────────────────────────────────────────────────────────────

describe("randomized PIT is uniform under a matched simulate/score pair", () => {
  it("binomial(5, 0.5): matched pair passes the uniformity test", () => {
    const truth = makeBinomial(5, 0.5);
    const values = pitSeries(truth, truth, 6000, 20260825, 7);
    const h = pitHistogram(values, 10);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(6000);
    expect(h.uniformityPValue).toBeGreaterThan(0.01);
  });

  it("binomial(12, 0.3): matched pair passes the uniformity test", () => {
    const truth = makeBinomial(12, 0.3);
    const values = pitSeries(truth, truth, 6000, 31337, 555);
    expect(pitHistogram(values, 10).uniformityPValue).toBeGreaterThan(0.01);
  });

  it("a point mass scored against itself yields the raw uniform stream", () => {
    // The most extreme discrete case: one atom of probability 1. Plain PIT would
    // put every value at exactly 1.0; randomized PIT is exactly uniform.
    const point = makePointMass(3);
    const values = pitSeries(point, point, 5000, 1, 2);
    expect(pitHistogram(values, 10).uniformityPValue).toBeGreaterThan(0.01);
  });

  it("MISMATCHED pair (scored against a different distribution) is rejected", () => {
    const truth = makeBinomial(12, 0.3);
    const wrong = makeBinomial(12, 0.5);
    const values = pitSeries(truth, wrong, 2000, 20260825, 7);
    const h = pitHistogram(values, 10);
    expect(h.uniformityPValue).toBeLessThan(1e-6);
  });

  it("MISMATCHED dispersion (right mean, wrong spread) is rejected", () => {
    // Same mean 3.6 = 12·0.3 = 6·0.6, but Binomial(6, 0.6) has variance
    // 6·0.6·0.4 = 1.44 against the truth's 12·0.3·0.7 = 2.52 — an
    // under-dispersed forecast, which produces the classic U-shaped histogram.
    const truth = makeBinomial(12, 0.3);
    const wrong = makeBinomial(6, 0.6);
    expect(truth.mean()).toBeCloseTo(wrong.mean(), 12);
    expect(wrong.variance()).toBeLessThan(truth.variance());
    const values = pitSeries(truth, wrong, 4000, 909, 11);
    const h = pitHistogram(values, 10);
    expect(h.uniformityPValue).toBeLessThan(0.01);
    // Contract: "U-shape: under-dispersed". Both extreme bins must be heavier
    // than every interior bin — outcomes land in the tails the forecast is too
    // narrow to cover.
    const interior = h.counts.slice(1, -1);
    expect(h.counts[0]!).toBeGreaterThan(Math.max(...interior));
    expect(h.counts[h.bins - 1]!).toBeGreaterThan(Math.max(...interior));
  });

  it("an OVER-dispersed forecast produces the humped histogram", () => {
    // Contract: "hump: over-dispersed". Mean 3.6 = 60·0.06, variance 3.384 vs
    // the truth's 2.52 — too wide, so outcomes bunch in the middle of the PIT.
    const truth = makeBinomial(12, 0.3);
    const wrong = makeBinomial(60, 0.06);
    expect(wrong.variance()).toBeGreaterThan(truth.variance());
    const h = pitHistogram(pitSeries(truth, wrong, 4000, 909, 11), 10);
    expect(h.uniformityPValue).toBeLessThan(0.01);
    const interior = h.counts.slice(1, -1);
    expect(h.counts[0]!).toBeLessThan(Math.min(...interior));
    expect(h.counts[h.bins - 1]!).toBeLessThan(Math.min(...interior));
  });

  it("PLAIN (non-randomized) PIT fails on the very same matched pair", () => {
    // This is the whole point of the slot: u = F(y) is NOT uniform on discrete
    // outcomes, so a perfect forecast looks miscalibrated. Same draws, same
    // distribution — only the transform differs.
    const truth = makeBinomial(5, 0.5);
    const drawRng = makeRng(20260825);
    const plain: number[] = [];
    for (let i = 0; i < 6000; i += 1) plain.push(truth.cdf(truth.sample(drawRng)));
    const plainP = pitHistogram(plain, 10).uniformityPValue;
    expect(plainP).toBeLessThan(1e-10);

    const randomizedP = pitHistogram(pitSeries(truth, truth, 6000, 20260825, 7), 10)
      .uniformityPValue;
    expect(randomizedP).toBeGreaterThan(0.01);
  });

  it("uniformity holds across several independent seeds (no lucky seed)", () => {
    const truth = makeBinomial(8, 0.45);
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const ps = seeds.map((s) =>
      pitHistogram(pitSeries(truth, truth, 3000, 1000 + s, 2000 + s), 10).uniformityPValue,
    );
    // Under the null these are Uniform(0,1); requiring every one of eight to
    // clear 0.001 fails with probability < 1% if the transform is correct.
    for (const p of ps) expect(p).toBeGreaterThan(0.001);
    // And they should not all be piled up at 1 either — that would indicate the
    // statistic is not actually varying.
    expect(Math.min(...ps)).toBeLessThan(0.99);
  });
});
