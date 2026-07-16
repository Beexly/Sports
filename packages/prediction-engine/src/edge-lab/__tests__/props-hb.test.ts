import { describe, expect, it } from "vitest";
import { mulberry32, type Rng } from "../rng.js";
import {
  fitGroupPrior,
  posteriorRate,
  probOver,
  probOverContinuous,
  regularizedGammaQ,
  shrinkageReport,
  type GammaPosterior,
  type RateSample,
} from "../props-hb.js";

// ── deterministic synthetic-data generators (test-only; the module itself
//    is closed-form/no-sampling, per its "no MCMC" contract) ──────────────

/** Standard normal via Box-Muller, driven by the shared mulberry32 rng. */
function normal(rng: Rng): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Marsaglia-Tsang Gamma(shape, rate) sampler, shape >= 1. */
function sampleGamma(shape: number, rate: number, rng: Rng): number {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) {
      return (d * v) / rate;
    }
  }
}

/** Poisson(lambda) via Knuth's product-of-uniforms method. */
function samplePoisson(lambda: number, rng: Rng): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/** Brute-force NB(r, p) survival: sum PMF(0..k) via the standard recurrence
 * PMF(0) = p^r, PMF(j) = PMF(j-1) * (1-p) * (j-1+r)/j — independent of the
 * module's regularized-incomplete-beta implementation, for cross-checking. */
function bruteForceNbSurvival(r: number, p: number, k: number): number {
  let pmf = Math.pow(p, r);
  let cdf = pmf;
  for (let j = 1; j <= k; j++) {
    pmf = pmf * (1 - p) * ((j - 1 + r) / j);
    cdf += pmf;
  }
  return 1 - cdf;
}

describe("fitGroupPrior", () => {
  it("recovers known Gamma(alpha=4, beta=2) parameters from synthetic data within 25%", () => {
    const rng = mulberry32(20260716);
    const ALPHA = 4;
    const BETA = 2;
    const N_PLAYERS = 200;
    const GAMES = 20;

    const samples: RateSample[] = [];
    for (let i = 0; i < N_PLAYERS; i++) {
      const rate = sampleGamma(ALPHA, BETA, rng);
      const total = samplePoisson(rate * GAMES, rng);
      samples.push({ games: GAMES, total });
    }

    const fitted = fitGroupPrior(samples);
    expect(fitted).not.toBeNull();
    expect(Math.abs(fitted!.alpha - ALPHA) / ALPHA).toBeLessThan(0.25);
    expect(Math.abs(fitted!.beta - BETA) / BETA).toBeLessThan(0.25);
  });

  it("returns null for an empty group (no data)", () => {
    expect(fitGroupPrior([])).toBeNull();
  });

  it("returns null for a homogeneous group (identical rates -> no fake dispersion)", () => {
    const homogeneous: RateSample[] = [2, 5, 10].map((g) => ({ games: g, total: g * 2 }));
    expect(fitGroupPrior(homogeneous)).toBeNull();
  });

  it("returns null for a single-player group (degenerate variance)", () => {
    expect(fitGroupPrior([{ games: 10, total: 15 }])).toBeNull();
  });

  it("throws RangeError on non-finite or invalid games/total", () => {
    expect(() => fitGroupPrior([{ games: 0, total: 5 }])).toThrow(RangeError);
    expect(() => fitGroupPrior([{ games: -1, total: 5 }])).toThrow(RangeError);
    expect(() => fitGroupPrior([{ games: 10, total: -1 }])).toThrow(RangeError);
    expect(() => fitGroupPrior([{ games: NaN, total: 5 }])).toThrow(RangeError);
    expect(() => fitGroupPrior([{ games: 10, total: Infinity }])).toThrow(RangeError);
  });
});

describe("posteriorRate", () => {
  it("matches the closed-form conjugate update exactly", () => {
    // prior alpha=5, beta=2; total=13, games=6 -> alpha'=18, beta'=8, mean=2.25
    const post = posteriorRate({ alpha: 5, beta: 2 }, 13, 6);
    expect(post.alpha).toBe(18);
    expect(post.beta).toBe(8);
    expect(post.mean).toBeCloseTo(2.25, 12);
  });

  it("degenerates to exactly the prior at playerGames = 0", () => {
    const prior = { alpha: 5, beta: 2 };
    const post = posteriorRate(prior, 0, 0);
    expect(post.alpha).toBe(prior.alpha);
    expect(post.beta).toBe(prior.beta);
    expect(post.mean).toBeCloseTo(prior.alpha / prior.beta, 12);
  });

  it("throws RangeError on an invalid prior or invalid observation", () => {
    expect(() => posteriorRate({ alpha: 0, beta: 2 }, 1, 1)).toThrow(RangeError);
    expect(() => posteriorRate({ alpha: 5, beta: -1 }, 1, 1)).toThrow(RangeError);
    expect(() => posteriorRate({ alpha: 5, beta: 2 }, -1, 1)).toThrow(RangeError);
    expect(() => posteriorRate({ alpha: 5, beta: 2 }, 1, -1)).toThrow(RangeError);
    expect(() => posteriorRate({ alpha: 5, beta: 2 }, NaN, 1)).toThrow(RangeError);
  });
});

describe("shrinkageReport — monotone shrinkage in games", () => {
  // Fixed prior (mean = 2), fixed rawRate = 3 (above the group mean), varying
  // games. shrinkWeight = beta/(beta+games) = 3/(3+games) — pinned exactly.
  const prior = { alpha: 6, beta: 3 };

  it("pins exact shrinkWeight values and shows monotone decrease as games grows", () => {
    const rows = [1, 5, 10, 30].map((games) => shrinkageReport(prior, [{ id: "p", games, total: games * 3 }])[0]!);

    expect(rows[0]!.shrinkWeight).toBeCloseTo(0.75, 10); // 3/4
    expect(rows[1]!.shrinkWeight).toBeCloseTo(0.375, 10); // 3/8
    expect(rows[2]!.shrinkWeight).toBeCloseTo(3 / 13, 10);
    expect(rows[3]!.shrinkWeight).toBeCloseTo(3 / 33, 10);

    // Monotone decreasing in games.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.shrinkWeight).toBeLessThan(rows[i - 1]!.shrinkWeight);
    }

    // Fewer games -> posterior mean stays closer to the group mean (2);
    // more games -> posterior mean moves closer to the raw rate (3).
    const groupMean = prior.alpha / prior.beta;
    for (let i = 1; i < rows.length; i++) {
      const distPrev = Math.abs(rows[i - 1]!.posteriorMean - groupMean);
      const distNext = Math.abs(rows[i]!.posteriorMean - groupMean);
      expect(distNext).toBeGreaterThan(distPrev);
    }
  });

  it("pins the posterior means at each games value", () => {
    const rows = [1, 5, 10, 30].map((games) => shrinkageReport(prior, [{ id: "p", games, total: games * 3 }])[0]!);
    expect(rows[0]!.posteriorMean).toBeCloseTo(2.25, 10);
    expect(rows[1]!.posteriorMean).toBeCloseTo(2.625, 10);
    expect(rows[2]!.posteriorMean).toBeCloseTo(2.769230769, 8);
    expect(rows[3]!.posteriorMean).toBeCloseTo(2.909090909, 8);
  });

  it("reports rawRate = 0 and full shrinkage (weight 1) at games = 0", () => {
    const [row] = shrinkageReport(prior, [{ id: "rookie", games: 0, total: 0 }]);
    expect(row!.rawRate).toBe(0);
    expect(row!.shrinkWeight).toBe(1);
    expect(row!.posteriorMean).toBeCloseTo(prior.alpha / prior.beta, 12);
  });

  it("carries the id field through unchanged", () => {
    const [row] = shrinkageReport(prior, [{ id: "player-42", games: 10, total: 20 }]);
    expect(row!.id).toBe("player-42");
  });
});

describe("probOver — negative-binomial posterior-predictive survival", () => {
  const post: GammaPosterior = { alpha: 7.3, beta: 2.5, mean: 7.3 / 2.5 };

  it("matches a brute-force PMF sum exactly (within 1e-10) across a line grid", () => {
    const p = post.beta / (post.beta + 1);
    for (let line = 0; line <= 20; line++) {
      const viaModule = probOver(post, line);
      const viaBruteForce = bruteForceNbSurvival(post.alpha, p, line);
      expect(Math.abs(viaModule - viaBruteForce)).toBeLessThan(1e-10);
    }
  });

  it("matches the textbook Geometric special case at r=1", () => {
    const geomPost: GammaPosterior = { alpha: 1, beta: 4, mean: 0.25 };
    const p = geomPost.beta / (geomPost.beta + 1); // = 0.8
    for (const line of [0, 1, 2, 5, 10]) {
      const expected = Math.pow(1 - p, line + 1); // survival of Geometric(p): (1-p)^(k+1)
      expect(probOver(geomPost, line)).toBeCloseTo(expected, 10);
    }
  });

  it("is monotone decreasing (non-increasing) in line", () => {
    let prev = 1.1;
    for (let line = 0; line <= 30; line += 0.5) {
      const val = probOver(post, line);
      expect(val).toBeLessThanOrEqual(prev + 1e-12);
      prev = val;
    }
  });

  it("handles half-point lines by flooring (X > 4.5 === X >= 5)", () => {
    expect(probOver(post, 4.5)).toBeCloseTo(probOver(post, 4), 12);
    expect(probOver(post, 4.5)).not.toBeCloseTo(probOver(post, 5), 6);
  });

  it("returns 1 for a negative line (a count always exceeds it)", () => {
    expect(probOver(post, -1)).toBe(1);
  });

  it("returns 0 for a line at/above the domain cap (guard against absurd inputs)", () => {
    expect(probOver(post, 200_000)).toBe(0);
  });

  it("supports a multi-game window via the `games` parameter", () => {
    // More games at the same per-game rate -> higher probability of exceeding
    // a FIXED per-game-scale line (the aggregate has more mass to work with).
    const one = probOver(post, 10, 1);
    const three = probOver(post, 10, 3);
    expect(three).toBeGreaterThan(one);
  });

  it("throws RangeError on an invalid posterior, games, or non-finite line", () => {
    expect(() => probOver({ alpha: 0, beta: 1, mean: 0 }, 5)).toThrow(RangeError);
    expect(() => probOver({ alpha: 5, beta: 0, mean: 0 }, 5)).toThrow(RangeError);
    expect(() => probOver(post, 5, 0)).toThrow(RangeError);
    expect(() => probOver(post, 5, -1)).toThrow(RangeError);
    expect(() => probOver(post, NaN)).toThrow(RangeError);
  });
});

describe("probOverContinuous — Gamma posterior-predictive survival (yardage path)", () => {
  const post: GammaPosterior = { alpha: 999, beta: 999, mean: 50 };
  const shape = 8;

  it("returns 1 at line <= 0 (Gamma support is (0, infinity))", () => {
    expect(probOverContinuous(post, 0, shape)).toBe(1);
    expect(probOverContinuous(post, -5, shape)).toBe(1);
  });

  it("P(over) at the mean is a right-skew-consistent sanity value (< 0.5, > 0)", () => {
    // For a right-skewed Gamma (finite shape), the median sits below the
    // mean, so P(Y > mean) < 0.5 but still well above 0.
    const atMean = probOverContinuous(post, post.mean, shape);
    expect(atMean).toBeGreaterThan(0.3);
    expect(atMean).toBeLessThan(0.5);
    // Cross-check against the direct regularizedGammaQ call at the same
    // (shape, rate*line) argument — same function, sanity wiring check.
    const rate = shape / post.mean;
    expect(atMean).toBeCloseTo(regularizedGammaQ(shape, rate * post.mean), 12);
  });

  it("is monotone decreasing in line", () => {
    let prev = 1.1;
    for (let line = 1; line <= 200; line += 5) {
      const val = probOverContinuous(post, line, shape);
      expect(val).toBeLessThanOrEqual(prev + 1e-12);
      prev = val;
    }
  });

  it("approaches 0 for an extreme line and 1 near 0", () => {
    expect(probOverContinuous(post, 5000, shape)).toBeLessThan(1e-6);
  });

  it("throws RangeError on invalid shape, non-finite line, or a non-positive posterior mean", () => {
    expect(() => probOverContinuous(post, 10, 0)).toThrow(RangeError);
    expect(() => probOverContinuous(post, 10, -1)).toThrow(RangeError);
    expect(() => probOverContinuous(post, NaN, shape)).toThrow(RangeError);
    expect(() => probOverContinuous({ alpha: 1, beta: 1, mean: 0 }, 10, shape)).toThrow(RangeError);
  });
});

describe("regularizedGammaQ", () => {
  it("matches the exact Exponential special case (shape=1): Q(1,x) = exp(-x)", () => {
    for (const x of [0.5, 1, 2, 5, 10]) {
      expect(regularizedGammaQ(1, x)).toBeCloseTo(Math.exp(-x), 9);
    }
  });

  it("Q(a, 0) = 1 and Q is monotone decreasing in x", () => {
    expect(regularizedGammaQ(5, 0)).toBe(1);
    let prev = 1.1;
    for (let x = 0; x <= 40; x += 1) {
      const val = regularizedGammaQ(5, x);
      expect(val).toBeLessThanOrEqual(prev + 1e-12);
      prev = val;
    }
  });

  it("throws RangeError on non-positive a or negative x", () => {
    expect(() => regularizedGammaQ(0, 1)).toThrow(RangeError);
    expect(() => regularizedGammaQ(5, -1)).toThrow(RangeError);
  });
});
