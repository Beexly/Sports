import { describe, expect, it } from "vitest";

import {
  KernelError,
  makeRng,
  type DiscreteDistribution,
  type Rng,
  type Support,
} from "../contract.js";
import { crpsDiscrete, crpsEmpirical } from "../slots/crps.js";

// ─────────────────────────────────────────────────────────────────────────────
// Test doubles — minimal, fully specified discrete predictives whose CRPS is
// known in closed form. Only `cdf` and `support` are exercised by crpsDiscrete;
// the rest are implemented so the doubles are honest DiscreteDistributions.
// ─────────────────────────────────────────────────────────────────────────────

/** Finite table of probabilities on {min, min+1, ..., min + probs.length − 1}. */
function tabular(probs: readonly number[], min = 0): DiscreteDistribution {
  const cum: number[] = [];
  let running = 0;
  for (const p of probs) {
    running += p;
    cum.push(running);
  }
  const max = min + probs.length - 1;
  const support: Support = { min, max };
  const mean = probs.reduce((acc, p, i) => acc + p * (min + i), 0);
  const second = probs.reduce((acc, p, i) => acc + p * (min + i) * (min + i), 0);
  return {
    kind: "discrete",
    pmf(k) {
      if (!Number.isInteger(k)) throw new KernelError("DOMAIN", "pmf requires an integer");
      const i = k - min;
      return i < 0 || i >= probs.length ? 0 : probs[i]!;
    },
    cdf(k) {
      if (k < min) return 0;
      if (k >= max) return cum[cum.length - 1]!;
      return cum[Math.floor(k) - min]!;
    },
    quantile(p) {
      if (!(p >= 0 && p <= 1)) throw new KernelError("DOMAIN", "quantile requires p in [0,1]");
      for (let i = 0; i < cum.length; i += 1) {
        if (cum[i]! >= p) return min + i;
      }
      return max;
    },
    sample(rng: Rng) {
      const u = rng();
      for (let i = 0; i < cum.length; i += 1) {
        if (u < cum[i]!) return min + i;
      }
      return max;
    },
    mean: () => mean,
    variance: () => second - mean * mean,
    support: () => support,
  };
}

/** Degenerate predictive: all mass at `m`. */
function pointMass(m: number): DiscreteDistribution {
  return tabular([1], m);
}

/**
 * Geometric on {0, 1, 2, ...} with success probability p:
 *   pmf(k) = p·q^k,  cdf(k) = 1 − q^(k+1),  q = 1 − p.
 * Unbounded above — this is the double that exercises tail truncation.
 */
function geometric(p: number): DiscreteDistribution {
  const q = 1 - p;
  const support: Support = { min: 0, max: Number.POSITIVE_INFINITY };
  return {
    kind: "discrete",
    pmf(k) {
      if (!Number.isInteger(k)) throw new KernelError("DOMAIN", "pmf requires an integer");
      return k < 0 ? 0 : p * Math.pow(q, k);
    },
    cdf(k) {
      if (k < 0) return 0;
      return 1 - Math.pow(q, Math.floor(k) + 1);
    },
    quantile(pr) {
      if (!(pr >= 0 && pr <= 1)) throw new KernelError("DOMAIN", "quantile requires p in [0,1]");
      if (pr === 0) return 0;
      if (pr === 1) return Number.POSITIVE_INFINITY;
      return Math.max(0, Math.ceil(Math.log(1 - pr) / Math.log(q) - 1));
    },
    sample(rng: Rng) {
      const u = rng();
      return Math.max(0, Math.floor(Math.log(1 - u) / Math.log(q)));
    },
    mean: () => q / p,
    variance: () => q / (p * p),
    support: () => support,
  };
}

/** Closed-form CRPS of Geometric(p) at an integer y >= 0. Derivation:
 *    Σ_{k=0}^{y−1} (1 − q^{k+1})² + Σ_{k=y}^{∞} q^{2(k+1)}
 *  = y − 2q(1 − q^y)/(1 − q) + q²(1 − q^{2y})/(1 − q²) + q^{2y+2}/(1 − q²)
 *  = y − 2(1 − q^y)·q/p + q²/(1 − q²).
 */
function geometricCrps(p: number, y: number): number {
  const q = 1 - p;
  return y - 2 * (1 - Math.pow(q, y)) * (q / p) + (q * q) / (1 - q * q);
}

/** Naive O(n²) reference for the ensemble CRPS — the thing we must match. */
function bruteForceEmpiricalCrps(samples: readonly number[], y: number): number {
  const n = samples.length;
  let first = 0;
  for (const x of samples) first += Math.abs(x - y);
  let second = 0;
  for (const xi of samples) {
    for (const xj of samples) second += Math.abs(xi - xj);
  }
  return first / n - 0.5 * (second / (n * n));
}

/** A distribution stub built from a raw cdf, for the fail-closed paths. */
function stub(cdf: (k: number) => number, support: Support): DiscreteDistribution {
  return {
    kind: "discrete",
    pmf: () => 0,
    cdf,
    quantile: () => support.min,
    sample: () => support.min,
    mean: () => 0,
    variance: () => 0,
    support: () => support,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// crpsDiscrete — closed-form agreement
// ─────────────────────────────────────────────────────────────────────────────

describe("crpsDiscrete — analytic identities", () => {
  it("scores exactly 0 for a point mass at the observed value", () => {
    expect(crpsDiscrete(pointMass(7), 7)).toBe(0);
    expect(crpsDiscrete(pointMass(0), 0)).toBe(0);
    expect(crpsDiscrete(pointMass(-3), -3)).toBe(0);
  });

  it("reduces to |m − y| for a point mass at m (both directions)", () => {
    for (const m of [0, 3, 12, -4]) {
      for (const y of [-6, -1, 0, 1, 5, 12, 30]) {
        expect(crpsDiscrete(pointMass(m), y)).toBeCloseTo(Math.abs(m - y), 12);
      }
    }
  });

  it("reduces to the Brier score for a two-point {0,1} predictive", () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.73, 0.999, 1]) {
      const dist = tabular([1 - p, p], 0);
      // outcome 1 -> (1 − p)²; outcome 0 -> p²  (Brier for forecast p)
      expect(crpsDiscrete(dist, 1)).toBeCloseTo((1 - p) * (1 - p), 12);
      expect(crpsDiscrete(dist, 0)).toBeCloseTo(p * p, 12);
    }
  });

  it("matches a hand-computed sum on a 3-point table", () => {
    // probs [0.2, 0.5, 0.3] -> F = [0.2, 0.7, 1.0]
    const dist = tabular([0.2, 0.5, 0.3], 0);
    // y = 1: (0.2 − 0)² + (0.7 − 1)² + (1 − 1)² = 0.04 + 0.09 + 0 = 0.13
    expect(crpsDiscrete(dist, 1)).toBeCloseTo(0.13, 12);
    // y = 0: (0.2 − 1)² + (0.7 − 1)² + 0 = 0.64 + 0.09 = 0.73
    expect(crpsDiscrete(dist, 0)).toBeCloseTo(0.73, 12);
    // y = 2: (0.2)² + (0.7)² + 0 = 0.04 + 0.49 = 0.53
    expect(crpsDiscrete(dist, 2)).toBeCloseTo(0.53, 12);
  });

  it("matches the closed-form geometric CRPS on an UNBOUNDED support", () => {
    for (const p of [0.1, 0.3, 0.5, 0.8]) {
      for (const y of [0, 1, 2, 3, 7, 15]) {
        expect(crpsDiscrete(geometric(p), y)).toBeCloseTo(geometricCrps(p, y), 9);
      }
    }
  });

  it("truncation loses nothing: matches a brute-force sum to k = 4000", () => {
    const p = 0.3;
    const dist = geometric(p);
    for (const y of [0, 4, 11]) {
      let reference = 0;
      for (let k = 0; k <= 4000; k += 1) {
        const d = dist.cdf(k) - (k >= y ? 1 : 0);
        reference += d * d;
      }
      expect(crpsDiscrete(dist, y)).toBeCloseTo(reference, 9);
    }
  });

  it("handles an observation far past the truncation point", () => {
    // Geometric(0.5) truncates near k = 39; y = 200 lives well beyond it.
    expect(crpsDiscrete(geometric(0.5), 200)).toBeCloseTo(geometricCrps(0.5, 200), 8);
    expect(crpsDiscrete(geometric(0.5), 60)).toBeCloseTo(geometricCrps(0.5, 60), 8);
  });

  it("handles an observation below the support minimum", () => {
    // Support {5,6,7} with all mass at 5; y = 2 -> |5 − 2| = 3.
    expect(crpsDiscrete(tabular([1, 0, 0], 5), 2)).toBeCloseTo(3, 12);
    // Support {5,6,7}, F = [0.5, 0.5, 1.0], y = 4:
    // k=4: (0 − 1)² = 1; k=5: (0.5 − 1)² = 0.25; k=6: 0.25; k=7: 0 -> 1.5
    expect(crpsDiscrete(tabular([0.5, 0, 0.5], 5), 4)).toBeCloseTo(1.5, 12);
  });

  it("decreases monotonically as the predictive concentrates on the truth", () => {
    const observed = 1;
    const scores = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0].map((mass) => {
      const rest = (1 - mass) / 2;
      return crpsDiscrete(tabular([rest, mass, rest], 0), observed);
    });
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]!).toBeLessThan(scores[i - 1]!);
    }
    expect(scores[scores.length - 1]!).toBeCloseTo(0, 12);
  });

  it("is minimised by the true distribution (strict propriety, one instance)", () => {
    // Truth: geometric(0.4). Expected CRPS under truth beats a mis-specified p.
    const truth = geometric(0.4);
    const wrong = geometric(0.15);
    let underTruth = 0;
    let underWrong = 0;
    for (let y = 0; y <= 60; y += 1) {
      const w = truth.pmf(y);
      underTruth += w * crpsDiscrete(truth, y);
      underWrong += w * crpsDiscrete(wrong, y);
    }
    expect(underTruth).toBeLessThan(underWrong);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// crpsDiscrete — fail closed
// ─────────────────────────────────────────────────────────────────────────────

describe("crpsDiscrete — fail-closed behaviour", () => {
  const codeOf = (fn: () => unknown): string => {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      return (e as KernelError).code;
    }
    throw new Error("expected a KernelError, none thrown");
  };

  it("throws NOT_FINITE for a non-finite observed value", () => {
    expect(codeOf(() => crpsDiscrete(pointMass(1), Number.NaN))).toBe("NOT_FINITE");
    expect(codeOf(() => crpsDiscrete(pointMass(1), Number.POSITIVE_INFINITY))).toBe("NOT_FINITE");
    expect(codeOf(() => crpsDiscrete(pointMass(1), Number.NEGATIVE_INFINITY))).toBe("NOT_FINITE");
  });

  it("throws DOMAIN for a non-integer observed value", () => {
    expect(codeOf(() => crpsDiscrete(pointMass(1), 1.5))).toBe("DOMAIN");
  });

  it("throws UNSUPPORTED for a support unbounded below", () => {
    const d = stub(() => 1, { min: Number.NEGATIVE_INFINITY, max: 10 });
    expect(codeOf(() => crpsDiscrete(d, 0))).toBe("UNSUPPORTED");
  });

  it("throws DOMAIN for non-integer support bounds", () => {
    expect(codeOf(() => crpsDiscrete(stub(() => 1, { min: 0.5, max: 3 }), 1))).toBe("DOMAIN");
    expect(codeOf(() => crpsDiscrete(stub(() => 1, { min: 0, max: 3.5 }), 1))).toBe("DOMAIN");
  });

  it("throws DOMAIN when max < min", () => {
    expect(codeOf(() => crpsDiscrete(stub(() => 1, { min: 4, max: 2 }), 1))).toBe("DOMAIN");
  });

  it("throws NOT_FINITE when the cdf returns a non-finite value", () => {
    const d = stub(() => Number.NaN, { min: 0, max: 5 });
    expect(codeOf(() => crpsDiscrete(d, 1))).toBe("NOT_FINITE");
  });

  it("throws DOMAIN when a bounded support's cdf never reaches 1", () => {
    const d = stub((k) => (k < 1 ? 0.3 : 0.5), { min: 0, max: 1 });
    expect(codeOf(() => crpsDiscrete(d, 0))).toBe("DOMAIN");
  });

  it("throws NO_CONVERGENCE when the tail never thins on an unbounded support", () => {
    const d = stub(() => 0.5, { min: 0, max: Number.POSITIVE_INFINITY });
    expect(codeOf(() => crpsDiscrete(d, 0))).toBe("NO_CONVERGENCE");
  });

  it("never returns NaN on a well-formed distribution", () => {
    expect(Number.isFinite(crpsDiscrete(geometric(0.05), 3))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// crpsEmpirical
// ─────────────────────────────────────────────────────────────────────────────

describe("crpsEmpirical — sorted identity vs brute force", () => {
  it("proves the sorted pair-sum identity against an O(n²) double loop", () => {
    const rng = makeRng(2024);
    for (const n of [1, 2, 3, 5, 17, 64]) {
      const xs = Array.from({ length: n }, () => rng() * 40 - 10);
      const sorted = [...xs].sort((a, b) => a - b);

      let brute = 0;
      for (const a of xs) for (const b of xs) brute += Math.abs(a - b);
      brute /= n * n;

      let identity = 0;
      for (let i = 0; i < n; i += 1) identity += (2 * i - n + 1) * sorted[i]!;
      identity = (2 / (n * n)) * identity;

      expect(identity).toBeCloseTo(brute, 10);
    }
  });

  it("agrees with the O(n²) brute-force CRPS on small ensembles", () => {
    const rng = makeRng(99);
    for (const n of [1, 2, 3, 4, 9, 33, 128]) {
      const xs = Array.from({ length: n }, () => Math.round(rng() * 25));
      for (const y of [0, 3, 12, 25, -5]) {
        expect(crpsEmpirical(xs, y)).toBeCloseTo(bruteForceEmpiricalCrps(xs, y), 10);
      }
    }
  });

  it("agrees with brute force on ensembles with ties and duplicates", () => {
    const xs = [4, 4, 4, 1, 9, 9, 1, 4];
    for (const y of [1, 4, 9, 7]) {
      expect(crpsEmpirical(xs, y)).toBeCloseTo(bruteForceEmpiricalCrps(xs, y), 12);
    }
  });
});

describe("crpsEmpirical — analytic edge cases", () => {
  it("a single sample scores |x − y|", () => {
    expect(crpsEmpirical([5], 5)).toBe(0);
    expect(crpsEmpirical([5], 2)).toBeCloseTo(3, 12);
    expect(crpsEmpirical([-2.5], 1.5)).toBeCloseTo(4, 12);
  });

  it("an all-identical ensemble is a point mass: scores |v − y|", () => {
    const xs = [3, 3, 3, 3, 3, 3];
    expect(crpsEmpirical(xs, 3)).toBe(0);
    expect(crpsEmpirical(xs, 8)).toBeCloseTo(5, 12);
    expect(crpsEmpirical(xs, -1)).toBeCloseTo(4, 12);
  });

  it("matches the integral form on a hand-computable two-point ensemble", () => {
    // F_n = 0.5 on [0,2), 1 above. y = 1:
    // ∫_0^1 (0.5)² dt + ∫_1^2 (0.5 − 1)² dt = 0.25 + 0.25 = 0.5
    expect(crpsEmpirical([0, 2], 1)).toBeCloseTo(0.5, 12);
    // y = 0: ∫_0^2 (0.5 − 1)² dt = 0.5
    expect(crpsEmpirical([0, 2], 0)).toBeCloseTo(0.5, 12);
    // y = 3: ∫_0^2 0.25 + ∫_2^3 1 = 0.5 + 1 = 1.5
    expect(crpsEmpirical([0, 2], 3)).toBeCloseTo(1.5, 12);
  });

  it("decreases as the ensemble concentrates on the truth", () => {
    const rng = makeRng(7);
    const base = Array.from({ length: 4000 }, () => {
      // one standard normal deviate per draw, built from the injected rng
      const u1 = Math.max(rng(), 1e-300);
      const u2 = rng();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    });
    const truth = 0;
    let previous = Number.POSITIVE_INFINITY;
    for (const spread of [4, 2, 1, 0.5, 0.25]) {
      const score = crpsEmpirical(
        base.map((z) => truth + spread * z),
        truth,
      );
      expect(score).toBeLessThan(previous);
      previous = score;
    }
    expect(previous).toBeLessThan(0.2);
  });

  it("is non-negative across randomised ensembles", () => {
    const rng = makeRng(4242);
    for (let t = 0; t < 200; t += 1) {
      const n = 1 + Math.floor(rng() * 20);
      const xs = Array.from({ length: n }, () => rng() * 10);
      expect(crpsEmpirical(xs, rng() * 10)).toBeGreaterThanOrEqual(0);
    }
  });

  it("does NOT mutate the input array", () => {
    const xs = [9, 1, 5, 3, 7];
    const copy = [...xs];
    crpsEmpirical(xs, 4);
    expect(xs).toEqual(copy);
  });

  it("accepts a readonly array without mutating the backing store", () => {
    const backing = [8, 2, 6];
    const view: readonly number[] = backing;
    crpsEmpirical(view, 1);
    expect(backing).toEqual([8, 2, 6]);
  });
});

describe("crpsEmpirical — convergence to the analytic discrete CRPS", () => {
  it("a large ensemble from Geometric(p) approximates crpsDiscrete", () => {
    const p = 0.3;
    const dist = geometric(p);
    const rng = makeRng(20250825);
    const n = 200_000;
    const draws = new Array<number>(n);
    for (let i = 0; i < n; i += 1) draws[i] = dist.sample(rng);

    for (const y of [0, 2, 5]) {
      const analytic = crpsDiscrete(dist, y);
      expect(analytic).toBeCloseTo(geometricCrps(p, y), 9);
      // Bias of the n²-pair estimator is E|X−X'|/(2n) ~ 1e-5 here; Monte Carlo
      // SE is ~3e-3. A 0.03 band is ~10 SE.
      expect(crpsEmpirical(draws, y)).toBeCloseTo(analytic, 1);
      expect(Math.abs(crpsEmpirical(draws, y) - analytic)).toBeLessThan(0.03);
    }
  });

  it("is deterministic for a given seed", () => {
    const dist = geometric(0.25);
    const score = (seed: number): number => {
      const rng = makeRng(seed);
      const draws = Array.from({ length: 5000 }, () => dist.sample(rng));
      return crpsEmpirical(draws, 3);
    };
    expect(score(11)).toBe(score(11));
    expect(score(11)).not.toBe(score(12));
  });
});

describe("crpsEmpirical — fail-closed behaviour", () => {
  const codeOf = (fn: () => unknown): string => {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      return (e as KernelError).code;
    }
    throw new Error("expected a KernelError, none thrown");
  };

  it("throws EMPTY for an empty ensemble", () => {
    expect(codeOf(() => crpsEmpirical([], 1))).toBe("EMPTY");
  });

  it("throws NOT_FINITE for a non-finite observed value", () => {
    expect(codeOf(() => crpsEmpirical([1, 2, 3], Number.NaN))).toBe("NOT_FINITE");
    expect(codeOf(() => crpsEmpirical([1, 2, 3], Number.POSITIVE_INFINITY))).toBe("NOT_FINITE");
  });

  it("throws NOT_FINITE for a non-finite sample", () => {
    expect(codeOf(() => crpsEmpirical([1, Number.NaN, 3], 1))).toBe("NOT_FINITE");
    expect(codeOf(() => crpsEmpirical([1, Number.POSITIVE_INFINITY], 1))).toBe("NOT_FINITE");
  });

  it("rejects a bad sample before sorting, leaving the input untouched", () => {
    const xs = [3, 1, Number.NaN, 2];
    const copy = [...xs];
    expect(codeOf(() => crpsEmpirical(xs, 0))).toBe("NOT_FINITE");
    expect(xs[0]).toBe(copy[0]);
    expect(xs[1]).toBe(copy[1]);
    expect(Number.isNaN(xs[2]!)).toBe(true);
    expect(xs[3]).toBe(copy[3]);
  });
});
