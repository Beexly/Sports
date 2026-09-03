import { describe, expect, it } from "vitest";
import { mulberry32, type Rng } from "../rng.js";
import {
  fitGroupPrior,
  partitionRateSamples,
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

// ── EV13: batch-side sieve — poisoned rows drop with reasons, never kill the
//    batch. The fit's own throw contract is deliberately left intact; these
//    tests pin BOTH sides of that seam.

describe("partitionRateSamples — poisoned rows refuse with reasons", () => {
  const GOOD_A: RateSample & { id?: string } = { id: "a", games: 10, total: 22 };
  const GOOD_B: RateSample & { id?: string } = { id: "b", games: 7, total: 3 };

  it("keeps the good rows and refuses the NaN row at its INPUT index", () => {
    const out = partitionRateSamples([GOOD_A, { games: NaN, total: 3 }, GOOD_B]);

    expect(out.kept).toEqual([GOOD_A, GOOD_B]);
    expect(out.refused).toEqual([{ index: 1, id: undefined, reason: "non_finite" }]);
  });

  it("pins the fit's own contract: fitGroupPrior still throws, naming the bad value", () => {
    expect(() => fitGroupPrior([GOOD_A, { games: NaN, total: 3 }])).toThrow(RangeError);
    expect(() => fitGroupPrior([GOOD_A, { games: NaN, total: 3 }])).toThrow(/games=NaN/);
    expect(() => fitGroupPrior([GOOD_A, { games: -2, total: 3 }])).toThrow(/games=-2/);
    expect(() => fitGroupPrior([GOOD_A, { games: 4, total: -7 }])).toThrow(/total=-7/);
  });

  it("returns an empty partition for an empty batch (no data is not bad data)", () => {
    const out = partitionRateSamples([]);
    expect(out.kept).toEqual([]);
    expect(out.refused).toEqual([]);
    expect(fitGroupPrior(out.kept)).toBeNull();
  });

  it("emits every documented refusal reason, one per triggering row", () => {
    const out = partitionRateSamples([
      { id: "nan-games", games: NaN, total: 3 },
      { id: "nan-total", games: 5, total: NaN },
      { id: "zero-games", games: 0, total: 3 },
      { id: "neg-games", games: -4, total: 3 },
      { id: "neg-total", games: 5, total: -1 },
    ]);

    expect(out.kept).toEqual([]);
    expect(out.refused.map((r) => r.reason)).toEqual([
      "non_finite",
      "non_finite",
      "non_positive_games",
      "non_positive_games",
      "negative_total",
    ]);
    expect(out.refused.map((r) => r.id)).toEqual([
      "nan-games",
      "nan-total",
      "zero-games",
      "neg-games",
      "neg-total",
    ]);
  });

  // ── ATTACK: adversarial values must REFUSE, never throw ──────────────────

  it("refuses ±Infinity games/total as non_finite", () => {
    expect(partitionRateSamples([{ games: Infinity, total: 3 }]).refused).toEqual([
      { index: 0, id: undefined, reason: "non_finite" },
    ]);
    expect(partitionRateSamples([{ games: -Infinity, total: 3 }]).refused[0]?.reason).toBe("non_finite");
    expect(partitionRateSamples([{ games: 5, total: Infinity }]).refused[0]?.reason).toBe("non_finite");
  });

  it("refuses games: -0 as non_positive_games (JS: -0 <= 0 is true)", () => {
    const out = partitionRateSamples([{ games: -0, total: 3 }]);
    expect(out.kept).toEqual([]);
    expect(out.refused).toEqual([{ index: 0, id: undefined, reason: "non_positive_games" }]);
  });

  it("refuses a total of -1e-300 as negative_total (no epsilon-clamp to zero)", () => {
    const out = partitionRateSamples([{ games: 5, total: -1e-300 }]);
    expect(out.kept).toEqual([]);
    expect(out.refused).toEqual([{ index: 0, id: undefined, reason: "negative_total" }]);
  });

  it("refuses a numeric STRING that slipped past the type system, without throwing", () => {
    const poisoned = { games: "3" as unknown as number, total: 3 };
    let out!: ReturnType<typeof partitionRateSamples>;
    expect(() => {
      out = partitionRateSamples([GOOD_A, poisoned]);
    }).not.toThrow();
    expect(out.kept).toEqual([GOOD_A]);
    expect(out.refused).toEqual([{ index: 1, id: undefined, reason: "non_finite" }]);
  });

  it("refuses null/undefined holes in the batch, without throwing", () => {
    const holed = [GOOD_A, null, undefined, GOOD_B] as unknown as readonly (RateSample & {
      readonly id?: string;
    })[];
    let out!: ReturnType<typeof partitionRateSamples>;
    expect(() => {
      out = partitionRateSamples(holed);
    }).not.toThrow();
    expect(out.kept).toEqual([GOOD_A, GOOD_B]);
    expect(out.refused).toEqual([
      { index: 1, id: undefined, reason: "non_finite" },
      { index: 2, id: undefined, reason: "non_finite" },
    ]);
    expect(() => fitGroupPrior(out.kept)).not.toThrow();
  });

  // ── ATTACK: reason precedence is deterministic ───────────────────────────

  it("reports the FIRST matching reason: {games: NaN, total: -1} is non_finite", () => {
    expect(partitionRateSamples([{ games: NaN, total: -1 }]).refused[0]?.reason).toBe("non_finite");
    // and it stays non_finite across repeated calls (no ordering nondeterminism)
    for (let i = 0; i < 5; i += 1) {
      expect(partitionRateSamples([{ games: NaN, total: -1 }]).refused[0]?.reason).toBe("non_finite");
    }
  });

  it("prefers non_positive_games over negative_total when both fail", () => {
    expect(partitionRateSamples([{ games: 0, total: -1 }]).refused[0]?.reason).toBe("non_positive_games");
    expect(partitionRateSamples([{ games: -3, total: -3 }]).refused[0]?.reason).toBe("non_positive_games");
  });

  // ── ATTACK: order preservation, input indexes ────────────────────────────

  it("preserves relative order in kept; refused indexes are INPUT indexes", () => {
    const batch: (RateSample & { id?: string })[] = [
      { id: "g0", games: 9, total: 11 },
      { id: "bad1", games: NaN, total: 2 },
      { id: "g2", games: 4, total: 1 },
      { id: "bad3", games: 0, total: 2 },
      { id: "bad4", games: 6, total: -2 },
      { id: "g5", games: 12, total: 30 },
      { id: "g6", games: 3, total: 0 },
    ];

    const out = partitionRateSamples(batch);

    expect(out.kept.map((k) => k.id)).toEqual(["g0", "g2", "g5", "g6"]);
    expect(out.refused).toEqual([
      { index: 1, id: "bad1", reason: "non_finite" },
      { index: 3, id: "bad3", reason: "non_positive_games" },
      { index: 4, id: "bad4", reason: "negative_total" },
    ]);
    // input index, not kept index: batch[3] is the zero-games row
    for (const r of out.refused) {
      expect(batch[r.index]?.id).toBe(r.id);
    }
  });

  it("does not mutate the input batch", () => {
    const batch: (RateSample & { id?: string })[] = [GOOD_A, { games: NaN, total: 3 }, GOOD_B];
    const snapshot = JSON.stringify(batch);
    partitionRateSamples(batch);
    expect(JSON.stringify(batch)).toBe(snapshot);
    expect(batch).toHaveLength(3);
  });

  // ── ATTACK: the never-throws guarantee, property-tested ──────────────────

  it("property: 300 seeded mixed batches — fitGroupPrior(kept) never throws and the partition is exact", () => {
    const rng = mulberry32(20260813);
    const POISONS: readonly (RateSample & { id?: string })[] = [
      { games: NaN, total: 3 },
      { games: 5, total: NaN },
      { games: Infinity, total: 1 },
      { games: 5, total: -Infinity },
      { games: 0, total: 4 },
      { games: -0, total: 4 },
      { games: -2.5, total: 4 },
      { games: 6, total: -1 },
      { games: 6, total: -1e-300 },
      { games: NaN, total: -1 },
      { games: "3" as unknown as number, total: 3 },
      { games: 4, total: undefined as unknown as number },
    ];

    let sawRefusal = false;
    let sawNonNullPrior = false;

    for (let trial = 0; trial < 300; trial += 1) {
      const n = 1 + Math.floor(rng() * 24);
      const batch: (RateSample & { id?: string })[] = [];
      for (let i = 0; i < n; i += 1) {
        if (rng() < 0.35) {
          const poison = POISONS[Math.floor(rng() * POISONS.length)] as RateSample & { id?: string };
          batch.push({ ...poison, id: `t${trial}-r${i}` });
        } else {
          const games = 1 + Math.floor(rng() * 30);
          batch.push({ id: `t${trial}-r${i}`, games, total: Math.floor(rng() * 4 * games) });
        }
      }

      const out = partitionRateSamples(batch);

      // exact partition, no row invented or lost
      expect(out.kept.length + out.refused.length).toBe(batch.length);
      // refused indexes are strictly increasing input indexes within range
      let prevIndex = -1;
      for (const r of out.refused) {
        expect(r.index).toBeGreaterThan(prevIndex);
        expect(r.index).toBeLessThan(batch.length);
        expect(batch[r.index]?.id).toBe(r.id);
        prevIndex = r.index;
      }
      // kept rows are exactly the non-refused rows, in input order
      const refusedIndexes = new Set(out.refused.map((r) => r.index));
      expect(out.kept.map((k) => k.id)).toEqual(
        batch.filter((_, i) => !refusedIndexes.has(i)).map((k) => k.id),
      );

      // THE guarantee
      expect(() => fitGroupPrior(out.kept)).not.toThrow();
      const prior = fitGroupPrior(out.kept);
      if (prior !== null) {
        sawNonNullPrior = true;
        expect(prior.alpha).toBeGreaterThan(0);
        expect(prior.beta).toBeGreaterThan(0);
      }
      if (out.refused.length > 0) sawRefusal = true;
    }

    // the property test is only meaningful if it actually exercised both paths
    expect(sawRefusal).toBe(true);
    expect(sawNonNullPrior).toBe(true);
  });

  it("property control: the same poisoned batches DO kill an unsieved fit", () => {
    const poisoned = [
      { games: 10, total: 22 },
      { games: NaN, total: 3 },
      { games: 8, total: 4 },
    ];
    expect(() => fitGroupPrior(poisoned)).toThrow(RangeError);
    expect(() => fitGroupPrior(partitionRateSamples(poisoned).kept)).not.toThrow();
  });
});
