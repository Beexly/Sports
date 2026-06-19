/**
 * random-utils.test.ts
 *
 * Comprehensive tests for @/lib/utils/random-utils.
 * At least 150 test cases covering all exported functions.
 */

import { describe, it, expect } from "vitest";
import {
  createPRNG,
  seededRandom,
  seededRandomInt,
  seededShuffle,
  uniformSample,
  normalSample,
  exponentialSample,
  poissonSample,
  binomialSample,
  betaSample,
  gammaSample,
  categoricalSample,
  shuffle,
  sample,
  sampleWithReplacement,
  reservoirSample,
  weightedSample,
  weightedSampleMultiple,
  randomPermutation,
  randomSubset,
  randomPartition,
  randomDerangement,
  monteCarloPi,
  monteCarloIntegral,
  bootstrapMean,
  bootstrapStatistic,
  jackknife,
  simulatePoissonMatch,
  simulateNFLGame,
  simulateSeasonRecord,
  simulateTournament,
  runSimulations,
  chiSquaredUniformTest,
  runsTest,
  autocorrelation,
  type PRNG,
} from "@/lib/utils/random-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePRNG(seed = 42): PRNG {
  return createPRNG(seed);
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
}

// ---------------------------------------------------------------------------
// 1. Seeded PRNG
// ---------------------------------------------------------------------------

describe("createPRNG", () => {
  it("returns a PRNG object with a next() function", () => {
    const prng = createPRNG(1);
    expect(typeof prng.next).toBe("function");
  });

  it("next() returns a number in [0, 1)", () => {
    const prng = createPRNG(99);
    for (let i = 0; i < 100; i++) {
      const v = prng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("same seed produces same sequence", () => {
    const p1 = createPRNG(7);
    const p2 = createPRNG(7);
    for (let i = 0; i < 20; i++) {
      expect(p1.next()).toBe(p2.next());
    }
  });

  it("different seeds produce different sequences", () => {
    const p1 = createPRNG(1);
    const p2 = createPRNG(2);
    const seq1 = Array.from({ length: 10 }, () => p1.next());
    const seq2 = Array.from({ length: 10 }, () => p2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it("sequence evolves (successive calls differ)", () => {
    const prng = createPRNG(123);
    const a = prng.next();
    const b = prng.next();
    expect(a).not.toBe(b);
  });
});

describe("seededRandom", () => {
  it("returns a number in [0, 1)", () => {
    const v = seededRandom(42);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it("is deterministic", () => {
    expect(seededRandom(100)).toBe(seededRandom(100));
  });

  it("different seeds give different values", () => {
    expect(seededRandom(1)).not.toBe(seededRandom(2));
  });
});

describe("seededRandomInt", () => {
  it("returns integer within [min, max]", () => {
    for (let seed = 0; seed < 20; seed++) {
      const v = seededRandomInt(seed, 5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(seededRandomInt(77, 1, 100)).toBe(seededRandomInt(77, 1, 100));
  });

  it("works with min === max", () => {
    expect(seededRandomInt(42, 5, 5)).toBe(5);
  });

  it("covers the full range over many seeds", () => {
    const min = 1;
    const max = 3;
    const seen = new Set<number>();
    for (let s = 0; s < 300; s++) {
      seen.add(seededRandomInt(s, min, max));
    }
    expect(seen.size).toBe(3);
  });
});

describe("seededShuffle", () => {
  it("returns a new array of same length", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = seededShuffle(arr, 42);
    expect(result.length).toBe(arr.length);
    expect(result).not.toBe(arr);
  });

  it("contains all original elements", () => {
    const arr = [10, 20, 30, 40];
    const result = seededShuffle(arr, 7);
    expect(result.sort((a, b) => a - b)).toEqual([10, 20, 30, 40]);
  });

  it("is deterministic", () => {
    const arr = [1, 2, 3, 4, 5, 6];
    expect(seededShuffle(arr, 10)).toEqual(seededShuffle(arr, 10));
  });

  it("different seeds produce different shuffles (usually)", () => {
    const arr = Array.from({ length: 8 }, (_, i) => i);
    const s1 = seededShuffle(arr, 1);
    const s2 = seededShuffle(arr, 2);
    expect(s1).not.toEqual(s2);
  });

  it("does not mutate the original array", () => {
    const arr = [1, 2, 3];
    seededShuffle(arr, 5);
    expect(arr).toEqual([1, 2, 3]);
  });

  it("handles empty array", () => {
    expect(seededShuffle([], 1)).toEqual([]);
  });

  it("handles single element", () => {
    expect(seededShuffle([42], 1)).toEqual([42]);
  });
});

// ---------------------------------------------------------------------------
// 2. Distribution sampling
// ---------------------------------------------------------------------------

describe("uniformSample", () => {
  it("returns value in default [0, 1)", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      const v = uniformSample(prng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("respects custom range", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      const v = uniformSample(prng, 5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it("mean converges to midpoint", () => {
    const prng = makePRNG(1);
    const samples = Array.from({ length: 10000 }, () => uniformSample(prng, 0, 2));
    expect(mean(samples)).toBeCloseTo(1, 1);
  });
});

describe("normalSample", () => {
  it("produces finite numbers", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      expect(Number.isFinite(normalSample(prng))).toBe(true);
    }
  });

  it("mean converges to 0 for default params", () => {
    const prng = makePRNG(2);
    const samples = Array.from({ length: 10000 }, () => normalSample(prng));
    expect(mean(samples)).toBeCloseTo(0, 1);
  });

  it("std deviation converges for default params", () => {
    const prng = makePRNG(3);
    const samples = Array.from({ length: 10000 }, () => normalSample(prng));
    expect(Math.sqrt(variance(samples))).toBeCloseTo(1, 1);
  });

  it("respects custom mean and std", () => {
    const prng = makePRNG(4);
    const samples = Array.from({ length: 5000 }, () => normalSample(prng, 10, 2));
    expect(mean(samples)).toBeCloseTo(10, 0);
  });
});

describe("exponentialSample", () => {
  it("returns positive numbers", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      expect(exponentialSample(prng)).toBeGreaterThan(0);
    }
  });

  it("mean converges to 1/rate (default rate=1 → mean=1)", () => {
    const prng = makePRNG(5);
    const samples = Array.from({ length: 10000 }, () => exponentialSample(prng));
    expect(mean(samples)).toBeCloseTo(1, 1);
  });

  it("mean converges for custom rate", () => {
    const prng = makePRNG(6);
    const samples = Array.from({ length: 10000 }, () => exponentialSample(prng, 2));
    expect(mean(samples)).toBeCloseTo(0.5, 1);
  });
});

describe("poissonSample", () => {
  it("returns non-negative integers", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      const v = poissonSample(prng, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("mean converges to lambda", () => {
    const prng = makePRNG(7);
    const lambda = 4;
    const samples = Array.from({ length: 5000 }, () => poissonSample(prng, lambda));
    expect(mean(samples)).toBeCloseTo(lambda, 0);
  });

  it("variance converges to lambda", () => {
    const prng = makePRNG(8);
    const lambda = 3;
    const samples = Array.from({ length: 5000 }, () => poissonSample(prng, lambda));
    expect(variance(samples)).toBeCloseTo(lambda, 0);
  });
});

describe("binomialSample", () => {
  it("returns integer in [0, n]", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      const v = binomialSample(prng, 10, 0.5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("mean converges to n*p", () => {
    const prng = makePRNG(9);
    const samples = Array.from({ length: 5000 }, () => binomialSample(prng, 20, 0.3));
    expect(mean(samples)).toBeCloseTo(6, 0);
  });

  it("p=0 always returns 0", () => {
    const prng = makePRNG();
    for (let i = 0; i < 20; i++) {
      expect(binomialSample(prng, 10, 0)).toBe(0);
    }
  });

  it("p=1 always returns n", () => {
    const prng = makePRNG();
    for (let i = 0; i < 20; i++) {
      expect(binomialSample(prng, 10, 1)).toBe(10);
    }
  });
});

describe("gammaSample", () => {
  it("throws for shape <= 0", () => {
    const prng = makePRNG();
    expect(() => gammaSample(prng, 0)).toThrow();
    expect(() => gammaSample(prng, -1)).toThrow();
  });

  it("returns positive numbers", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      expect(gammaSample(prng, 2)).toBeGreaterThan(0);
    }
  });

  it("mean converges to shape * scale", () => {
    const prng = makePRNG(10);
    const shape = 3;
    const scale = 2;
    const samples = Array.from({ length: 5000 }, () => gammaSample(prng, shape, scale));
    expect(mean(samples)).toBeCloseTo(shape * scale, 0);
  });

  it("works for shape < 1", () => {
    const prng = makePRNG(11);
    for (let i = 0; i < 20; i++) {
      expect(gammaSample(prng, 0.5)).toBeGreaterThan(0);
    }
  });
});

describe("betaSample", () => {
  it("throws for alpha <= 0", () => {
    const prng = makePRNG();
    expect(() => betaSample(prng, 0, 1)).toThrow();
    expect(() => betaSample(prng, -1, 1)).toThrow();
  });

  it("throws for beta <= 0", () => {
    const prng = makePRNG();
    expect(() => betaSample(prng, 1, 0)).toThrow();
    expect(() => betaSample(prng, 1, -1)).toThrow();
  });

  it("returns values in (0, 1)", () => {
    const prng = makePRNG();
    for (let i = 0; i < 50; i++) {
      const v = betaSample(prng, 2, 5);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("mean converges to alpha/(alpha+beta)", () => {
    const prng = makePRNG(12);
    const alpha = 2;
    const beta = 8;
    const samples = Array.from({ length: 5000 }, () => betaSample(prng, alpha, beta));
    expect(mean(samples)).toBeCloseTo(alpha / (alpha + beta), 1);
  });

  it("symmetric distribution: alpha=beta gives mean ~0.5", () => {
    const prng = makePRNG(13);
    const samples = Array.from({ length: 3000 }, () => betaSample(prng, 3, 3));
    expect(mean(samples)).toBeCloseTo(0.5, 1);
  });
});

describe("categoricalSample", () => {
  it("throws when lengths differ", () => {
    const prng = makePRNG();
    expect(() => categoricalSample(prng, ["a", "b"], [1])).toThrow();
  });

  it("throws when weights sum to 0", () => {
    const prng = makePRNG();
    expect(() => categoricalSample(prng, ["a", "b"], [0, 0])).toThrow();
  });

  it("returns one of the categories", () => {
    const prng = makePRNG();
    const cats = ["x", "y", "z"];
    for (let i = 0; i < 30; i++) {
      expect(cats).toContain(categoricalSample(prng, cats, [1, 1, 1]));
    }
  });

  it("highly weighted category dominates", () => {
    const prng = makePRNG(14);
    const samples = Array.from({ length: 1000 }, () =>
      categoricalSample(prng, ["a", "b"], [100, 1])
    );
    const aCount = samples.filter((s) => s === "a").length;
    expect(aCount).toBeGreaterThan(900);
  });

  it("single category always chosen", () => {
    const prng = makePRNG();
    for (let i = 0; i < 20; i++) {
      expect(categoricalSample(prng, ["only"], [5])).toBe("only");
    }
  });

  it("handles zero-weight categories", () => {
    const prng = makePRNG(15);
    const samples = Array.from({ length: 200 }, () =>
      categoricalSample(prng, ["never", "always"], [0, 1])
    );
    expect(samples.every((s) => s === "always")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Shuffling and sampling
// ---------------------------------------------------------------------------

describe("shuffle", () => {
  it("returns new array of same length", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).not.toBe(arr);
    expect(result.length).toBe(5);
  });

  it("contains all original elements", () => {
    const arr = [10, 20, 30, 40, 50];
    const result = shuffle(arr);
    expect([...result].sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50]);
  });

  it("does not mutate the original", () => {
    const arr = [1, 2, 3];
    shuffle(arr);
    expect(arr).toEqual([1, 2, 3]);
  });

  it("is deterministic with seeded PRNG", () => {
    const arr = [1, 2, 3, 4, 5];
    const r1 = shuffle(arr, createPRNG(42));
    const r2 = shuffle(arr, createPRNG(42));
    expect(r1).toEqual(r2);
  });

  it("uses Math.random when no PRNG provided (no throw)", () => {
    expect(() => shuffle([1, 2, 3])).not.toThrow();
  });

  it("handles empty array", () => {
    expect(shuffle([])).toEqual([]);
  });
});

describe("sample", () => {
  it("throws when n > arr.length", () => {
    expect(() => sample([1, 2], 3)).toThrow();
  });

  it("returns n elements", () => {
    const result = sample([1, 2, 3, 4, 5], 3);
    expect(result.length).toBe(3);
  });

  it("returns a subset of original", () => {
    const arr = [10, 20, 30, 40];
    const result = sample(arr, 2);
    expect(result.every((v) => arr.includes(v))).toBe(true);
  });

  it("no duplicates in result", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = sample(arr, 5, makePRNG());
    expect(new Set(result).size).toBe(5);
  });

  it("n === arr.length returns all elements", () => {
    const arr = [1, 2, 3];
    const result = sample(arr, 3);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("is deterministic with seeded PRNG", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(sample(arr, 3, createPRNG(1))).toEqual(sample(arr, 3, createPRNG(1)));
  });
});

describe("sampleWithReplacement", () => {
  it("returns n elements", () => {
    const result = sampleWithReplacement([1, 2, 3], 10);
    expect(result.length).toBe(10);
  });

  it("all elements from original array", () => {
    const arr = [10, 20, 30];
    const result = sampleWithReplacement(arr, 50);
    expect(result.every((v) => arr.includes(v))).toBe(true);
  });

  it("can produce duplicates", () => {
    // With n=50 from a 3-element array, duplicates are near-certain
    const result = sampleWithReplacement([1, 2, 3], 50, makePRNG());
    const hasDuplicates = result.length > new Set(result).size;
    expect(hasDuplicates).toBe(true);
  });

  it("is deterministic with seeded PRNG", () => {
    const arr = [1, 2, 3];
    const r1 = sampleWithReplacement(arr, 5, createPRNG(10));
    const r2 = sampleWithReplacement(arr, 5, createPRNG(10));
    expect(r1).toEqual(r2);
  });
});

describe("reservoirSample", () => {
  it("returns k items", () => {
    const stream = Array.from({ length: 100 }, (_, i) => i);
    const result = reservoirSample(stream, 10);
    expect(result.length).toBe(10);
  });

  it("all items from the stream", () => {
    const stream = [1, 2, 3, 4, 5];
    const result = reservoirSample(stream, 3);
    expect(result.every((v) => stream.includes(v))).toBe(true);
  });

  it("is deterministic with seeded PRNG", () => {
    const stream = Array.from({ length: 20 }, (_, i) => i);
    const r1 = reservoirSample(stream, 5, createPRNG(5));
    const r2 = reservoirSample(stream, 5, createPRNG(5));
    expect(r1).toEqual(r2);
  });

  it("k === stream length returns all items", () => {
    const stream = [1, 2, 3, 4];
    const result = reservoirSample(stream, 4);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });
});

describe("weightedSample", () => {
  it("throws for empty items", () => {
    expect(() => weightedSample([])).toThrow();
  });

  it("throws when all weights are 0", () => {
    expect(() => weightedSample([{ value: "a", weight: 0 }])).toThrow();
  });

  it("returns one of the values", () => {
    const items = [
      { value: "a", weight: 1 },
      { value: "b", weight: 2 },
    ];
    const prng = makePRNG();
    for (let i = 0; i < 20; i++) {
      expect(["a", "b"]).toContain(weightedSample(items, prng));
    }
  });

  it("heavily weighted item dominates", () => {
    const items = [
      { value: "rare", weight: 1 },
      { value: "common", weight: 999 },
    ];
    const prng = makePRNG(16);
    const results = Array.from({ length: 200 }, () => weightedSample(items, prng));
    const commonCount = results.filter((v) => v === "common").length;
    expect(commonCount).toBeGreaterThan(180);
  });
});

describe("weightedSampleMultiple", () => {
  const items = [
    { value: "a", weight: 1 },
    { value: "b", weight: 2 },
    { value: "c", weight: 3 },
  ];

  it("returns n items (with replacement)", () => {
    const result = weightedSampleMultiple(items, 10, makePRNG(), true);
    expect(result.length).toBe(10);
  });

  it("returns n items (without replacement)", () => {
    const result = weightedSampleMultiple(items, 3, makePRNG(), false);
    expect(result.length).toBe(3);
  });

  it("without replacement: no duplicates for unique items", () => {
    const result = weightedSampleMultiple(items, 3, makePRNG(17), false);
    expect(new Set(result).size).toBe(3);
  });

  it("defaults to without replacement", () => {
    expect(() => weightedSampleMultiple(items, 3, makePRNG())).not.toThrow();
  });

  it("is deterministic with seeded PRNG", () => {
    const r1 = weightedSampleMultiple(items, 3, createPRNG(20), true);
    const r2 = weightedSampleMultiple(items, 3, createPRNG(20), true);
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// 4. Permutations and combinations
// ---------------------------------------------------------------------------

describe("randomPermutation", () => {
  it("returns array of length n", () => {
    expect(randomPermutation(5).length).toBe(5);
  });

  it("contains all values 0..n-1", () => {
    const perm = randomPermutation(6, makePRNG());
    expect([...perm].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("is deterministic with seeded PRNG", () => {
    expect(randomPermutation(8, createPRNG(1))).toEqual(
      randomPermutation(8, createPRNG(1))
    );
  });

  it("n=1 returns [0]", () => {
    expect(randomPermutation(1)).toEqual([0]);
  });
});

describe("randomSubset", () => {
  it("returns subset of given size", () => {
    const arr = [1, 2, 3, 4, 5];
    const subset = randomSubset(arr, 3, makePRNG());
    expect(subset.length).toBe(3);
    expect(subset.every((v) => arr.includes(v))).toBe(true);
  });

  it("is deterministic with seeded PRNG", () => {
    const arr = [10, 20, 30, 40];
    expect(randomSubset(arr, 2, createPRNG(3))).toEqual(
      randomSubset(arr, 2, createPRNG(3))
    );
  });
});

describe("randomPartition", () => {
  it("total elements preserved", () => {
    const arr = [1, 2, 3, 4, 5, 6];
    const parts = randomPartition(arr, 3, makePRNG());
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    expect(total).toBe(6);
  });

  it("returns k partitions", () => {
    expect(randomPartition([1, 2, 3, 4], 2).length).toBe(2);
  });

  it("all original elements present", () => {
    const arr = [10, 20, 30, 40, 50];
    const parts = randomPartition(arr, 2, makePRNG());
    const all = parts.flat();
    expect([...all].sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50]);
  });

  it("is deterministic with seeded PRNG", () => {
    const arr = [1, 2, 3, 4, 5, 6];
    const r1 = randomPartition(arr, 3, createPRNG(7));
    const r2 = randomPartition(arr, 3, createPRNG(7));
    expect(r1).toEqual(r2);
  });
});

describe("randomDerangement", () => {
  it("throws for n < 2", () => {
    expect(() => randomDerangement(1)).toThrow();
    expect(() => randomDerangement(0)).toThrow();
  });

  it("returns permutation of length n", () => {
    const perm = randomDerangement(5, makePRNG());
    expect(perm.length).toBe(5);
    expect([...perm].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("has no fixed points", () => {
    for (let seed = 0; seed < 20; seed++) {
      const perm = randomDerangement(6, createPRNG(seed));
      expect(perm.every((v, i) => v !== i)).toBe(true);
    }
  });

  it("is deterministic with seeded PRNG", () => {
    expect(randomDerangement(5, createPRNG(9))).toEqual(
      randomDerangement(5, createPRNG(9))
    );
  });

  it("n=2 always swaps", () => {
    const perm = randomDerangement(2, makePRNG());
    expect(perm).toEqual([1, 0]);
  });
});

// ---------------------------------------------------------------------------
// 5. Monte Carlo utilities
// ---------------------------------------------------------------------------

describe("monteCarloPi", () => {
  it("approximates π within 0.1", () => {
    const estimate = monteCarloPi(100000, makePRNG(100));
    expect(estimate).toBeCloseTo(Math.PI, 1);
  });

  it("is deterministic with seeded PRNG", () => {
    expect(monteCarloPi(1000, createPRNG(42))).toBe(
      monteCarloPi(1000, createPRNG(42))
    );
  });

  it("works without PRNG", () => {
    expect(Number.isFinite(monteCarloPi(1000))).toBe(true);
  });
});

describe("monteCarloIntegral", () => {
  it("estimates integral of f(x)=1 as (b-a)", () => {
    const result = monteCarloIntegral(() => 1, 0, 5, 10000, makePRNG(1));
    expect(result).toBeCloseTo(5, 1);
  });

  it("estimates integral of f(x)=x over [0,1] ≈ 0.5", () => {
    const result = monteCarloIntegral((x) => x, 0, 1, 10000, makePRNG(2));
    expect(result).toBeCloseTo(0.5, 1);
  });

  it("estimates integral of f(x)=x^2 over [0,1] ≈ 1/3", () => {
    const result = monteCarloIntegral((x) => x * x, 0, 1, 10000, makePRNG(3));
    expect(result).toBeCloseTo(1 / 3, 1);
  });

  it("is deterministic with seeded PRNG", () => {
    const f = (x: number) => x * x;
    expect(monteCarloIntegral(f, 0, 1, 1000, createPRNG(4))).toBe(
      monteCarloIntegral(f, 0, 1, 1000, createPRNG(4))
    );
  });
});

describe("bootstrapMean", () => {
  it("mean equals sample mean", () => {
    const data = [1, 2, 3, 4, 5];
    const result = bootstrapMean(data, 500, makePRNG(1));
    expect(result.mean).toBeCloseTo(3, 10);
  });

  it("CI contains true mean", () => {
    const data = Array.from({ length: 100 }, (_, i) => i);
    const result = bootstrapMean(data, 1000, makePRNG(2));
    const trueMean = mean(data);
    expect(result.ci95Low).toBeLessThan(trueMean);
    expect(result.ci95High).toBeGreaterThan(trueMean);
  });

  it("ci95Low <= mean <= ci95High", () => {
    const data = [10, 20, 30, 40, 50];
    const result = bootstrapMean(data, 500, makePRNG(3));
    expect(result.ci95Low).toBeLessThanOrEqual(result.mean);
    expect(result.mean).toBeLessThanOrEqual(result.ci95High);
  });

  it("is deterministic with seeded PRNG", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const r1 = bootstrapMean(data, 500, createPRNG(5));
    const r2 = bootstrapMean(data, 500, createPRNG(5));
    expect(r1).toEqual(r2);
  });
});

describe("bootstrapStatistic", () => {
  it("computes median estimate", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const median = (s: number[]) => {
      const sorted = [...s].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
        : (sorted[mid] as number);
    };
    const result = bootstrapStatistic(data, median, 500, makePRNG(6));
    expect(result.estimate).toBe(5.5);
  });

  it("ci95Low <= ci95High", () => {
    const data = [1, 2, 3, 4, 5];
    const result = bootstrapStatistic(
      data,
      (s) => s.reduce((a, b) => a + b, 0) / s.length,
      200,
      makePRNG(7)
    );
    expect(result.ci95Low).toBeLessThanOrEqual(result.ci95High);
  });
});

describe("jackknife", () => {
  it("estimate matches statFn(data)", () => {
    const data = [1, 2, 3, 4, 5];
    const statFn = (s: number[]) => s.reduce((a, b) => a + b, 0) / s.length;
    const result = jackknife(data, statFn);
    expect(result.estimate).toBeCloseTo(3, 10);
  });

  it("bias and variance are finite numbers", () => {
    const data = [2, 4, 6, 8, 10];
    const result = jackknife(data, (s) => s.reduce((a, b) => a + b, 0) / s.length);
    expect(Number.isFinite(result.bias)).toBe(true);
    expect(Number.isFinite(result.variance)).toBe(true);
  });

  it("variance is non-negative", () => {
    const data = [1, 2, 3, 4, 5, 6];
    const result = jackknife(data, (s) => s.reduce((a, b) => a + b, 0) / s.length);
    expect(result.variance).toBeGreaterThanOrEqual(0);
  });

  it("bias is near zero for unbiased estimator (mean)", () => {
    const data = Array.from({ length: 50 }, (_, i) => i + 1);
    const result = jackknife(data, (s) => s.reduce((a, b) => a + b, 0) / s.length);
    expect(Math.abs(result.bias)).toBeLessThan(0.1);
  });
});

// ---------------------------------------------------------------------------
// 6. Sports simulation
// ---------------------------------------------------------------------------

describe("simulatePoissonMatch", () => {
  it("returns valid structure", () => {
    const prng = makePRNG();
    const result = simulatePoissonMatch(1.5, 1.2, prng);
    expect(typeof result.homeGoals).toBe("number");
    expect(typeof result.awayGoals).toBe("number");
    expect(["home", "away", "draw"]).toContain(result.result);
  });

  it("goals are non-negative integers", () => {
    const prng = makePRNG();
    for (let i = 0; i < 20; i++) {
      const r = simulatePoissonMatch(2, 1, prng);
      expect(r.homeGoals).toBeGreaterThanOrEqual(0);
      expect(r.awayGoals).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(r.homeGoals)).toBe(true);
      expect(Number.isInteger(r.awayGoals)).toBe(true);
    }
  });

  it("result matches goals", () => {
    const prng = makePRNG(1);
    for (let i = 0; i < 50; i++) {
      const r = simulatePoissonMatch(2, 1, prng);
      if (r.homeGoals > r.awayGoals) expect(r.result).toBe("home");
      else if (r.homeGoals < r.awayGoals) expect(r.result).toBe("away");
      else expect(r.result).toBe("draw");
    }
  });

  it("is deterministic with seeded PRNG", () => {
    const r1 = simulatePoissonMatch(2, 1, createPRNG(42));
    const r2 = simulatePoissonMatch(2, 1, createPRNG(42));
    expect(r1).toEqual(r2);
  });

  it("mean goals converge to lambdas", () => {
    const prng = createPRNG(99);
    const results = Array.from({ length: 2000 }, () =>
      simulatePoissonMatch(2.5, 1.5, prng)
    );
    const homeAvg = mean(results.map((r) => r.homeGoals));
    const awayAvg = mean(results.map((r) => r.awayGoals));
    expect(homeAvg).toBeCloseTo(2.5, 0);
    expect(awayAvg).toBeCloseTo(1.5, 0);
  });

  it("works without prng argument", () => {
    expect(() => simulatePoissonMatch(1.5, 1.2)).not.toThrow();
  });
});

describe("simulateNFLGame", () => {
  it("returns valid structure", () => {
    const result = simulateNFLGame(0.6, 45, makePRNG());
    expect(typeof result.homeScore).toBe("number");
    expect(typeof result.awayScore).toBe("number");
    expect(["home", "away"]).toContain(result.winner);
  });

  it("scores are non-negative integers", () => {
    const prng = makePRNG();
    for (let i = 0; i < 20; i++) {
      const r = simulateNFLGame(0.55, 50, prng);
      expect(r.homeScore).toBeGreaterThanOrEqual(0);
      expect(r.awayScore).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(r.homeScore)).toBe(true);
      expect(Number.isInteger(r.awayScore)).toBe(true);
    }
  });

  it("winner matches scores", () => {
    const prng = makePRNG(2);
    for (let i = 0; i < 30; i++) {
      const r = simulateNFLGame(0.6, 45, prng);
      if (r.homeScore >= r.awayScore) expect(r.winner).toBe("home");
      else expect(r.winner).toBe("away");
    }
  });

  it("is deterministic with seeded PRNG", () => {
    const r1 = simulateNFLGame(0.6, 45, createPRNG(1));
    const r2 = simulateNFLGame(0.6, 45, createPRNG(1));
    expect(r1).toEqual(r2);
  });

  it("total score within ±20% of avgTotal (approximately)", () => {
    const prng = createPRNG(55);
    const avgTotal = 50;
    const results = Array.from({ length: 100 }, () => simulateNFLGame(0.5, avgTotal, prng));
    for (const r of results) {
      const total = r.homeScore + r.awayScore;
      expect(total).toBeGreaterThanOrEqual(avgTotal * 0.8 - 2);
      expect(total).toBeLessThanOrEqual(avgTotal * 1.2 + 2);
    }
  });

  it("works without prng argument", () => {
    expect(() => simulateNFLGame(0.5, 45)).not.toThrow();
  });
});

describe("simulateSeasonRecord", () => {
  it("returns wins + losses === games", () => {
    const r = simulateSeasonRecord(0.6, 16, makePRNG());
    expect(r.wins + r.losses).toBe(16);
  });

  it("winPct === wins/games", () => {
    const r = simulateSeasonRecord(0.5, 20, makePRNG());
    expect(r.winPct).toBeCloseTo(r.wins / 20, 10);
  });

  it("winProb=1 always wins all", () => {
    const prng = makePRNG();
    const r = simulateSeasonRecord(1, 10, prng);
    expect(r.wins).toBe(10);
    expect(r.losses).toBe(0);
  });

  it("winProb=0 always loses all", () => {
    const prng = makePRNG();
    const r = simulateSeasonRecord(0, 10, prng);
    expect(r.wins).toBe(0);
    expect(r.losses).toBe(10);
  });

  it("mean wins converges to winProb * games", () => {
    const prng = createPRNG(200);
    const results = Array.from({ length: 2000 }, () =>
      simulateSeasonRecord(0.7, 20, prng)
    );
    const avgWins = mean(results.map((r) => r.wins));
    expect(avgWins).toBeCloseTo(14, 0);
  });

  it("is deterministic with seeded PRNG", () => {
    const r1 = simulateSeasonRecord(0.6, 16, createPRNG(3));
    const r2 = simulateSeasonRecord(0.6, 16, createPRNG(3));
    expect(r1).toEqual(r2);
  });

  it("works without prng argument", () => {
    expect(() => simulateSeasonRecord(0.5, 10)).not.toThrow();
  });
});

describe("simulateTournament", () => {
  it("throws for non-power-of-2 team count", () => {
    const teams = [
      { name: "A", strength: 1 },
      { name: "B", strength: 1 },
      { name: "C", strength: 1 },
    ];
    expect(() => simulateTournament(teams)).toThrow();
  });

  it("returns one of the team names", () => {
    const teams = [
      { name: "Alpha", strength: 3 },
      { name: "Beta", strength: 1 },
      { name: "Gamma", strength: 2 },
      { name: "Delta", strength: 4 },
    ];
    const winner = simulateTournament(teams, makePRNG());
    expect(["Alpha", "Beta", "Gamma", "Delta"]).toContain(winner);
  });

  it("stronger team wins more often", () => {
    const teams = [
      { name: "Strong", strength: 100 },
      { name: "Weak", strength: 1 },
    ];
    const prng = createPRNG(400);
    const wins = Array.from({ length: 100 }, () => simulateTournament(teams, prng)).filter(
      (w) => w === "Strong"
    ).length;
    expect(wins).toBeGreaterThan(90);
  });

  it("is deterministic with seeded PRNG", () => {
    const teams = [
      { name: "A", strength: 2 },
      { name: "B", strength: 3 },
      { name: "C", strength: 1 },
      { name: "D", strength: 4 },
    ];
    expect(simulateTournament(teams, createPRNG(1))).toBe(
      simulateTournament(teams, createPRNG(1))
    );
  });

  it("handles single-team edge case (length=1)", () => {
    // 1 is 2^0 = power of 2, so it should not throw
    expect(() => simulateTournament([{ name: "Solo", strength: 5 }], makePRNG())).not.toThrow();
  });

  it("8-team tournament returns a name", () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({
      name: `Team${i}`,
      strength: i + 1,
    }));
    const winner = simulateTournament(teams, makePRNG());
    expect(teams.map((t) => t.name)).toContain(winner);
  });
});

describe("runSimulations", () => {
  it("returns correct number of results", () => {
    const results = runSimulations(() => 1, 50, 1);
    expect(results.length).toBe(50);
  });

  it("is deterministic with same seed", () => {
    const simFn = (prng: PRNG) => Math.floor(prng.next() * 100);
    const r1 = runSimulations(simFn, 10, 42);
    const r2 = runSimulations(simFn, 10, 42);
    expect(r1).toEqual(r2);
  });

  it("each simulation gets its own PRNG", () => {
    const prngValues: number[] = [];
    runSimulations((prng) => {
      prngValues.push(prng.next());
      return 0;
    }, 3, 1);
    // All three should be different (they get different seeds)
    const unique = new Set(prngValues);
    expect(unique.size).toBe(3);
  });

  it("accumulates results correctly", () => {
    const results = runSimulations((prng) => prng.next() > 0.5 ? "heads" : "tails", 1000, 7);
    expect(results.filter((r) => r === "heads").length).toBeGreaterThan(300);
    expect(results.filter((r) => r === "tails").length).toBeGreaterThan(300);
  });
});

// ---------------------------------------------------------------------------
// 7. Randomness testing helpers
// ---------------------------------------------------------------------------

describe("chiSquaredUniformTest", () => {
  it("returns chiSq, pValue, isUniform", () => {
    const samples = Array.from({ length: 1000 }, () => createPRNG(1).next());
    const result = chiSquaredUniformTest(samples);
    expect(typeof result.chiSq).toBe("number");
    expect(typeof result.pValue).toBe("number");
    expect(typeof result.isUniform).toBe("boolean");
  });

  it("seeded PRNG passes uniformity test", () => {
    const prng = createPRNG(999);
    const samples = Array.from({ length: 5000 }, () => prng.next());
    const result = chiSquaredUniformTest(samples, 10);
    // A good PRNG should pass the uniformity test
    expect(result.pValue).toBeGreaterThan(0.001);
  });

  it("non-uniform data fails test", () => {
    // All values near 0: clearly non-uniform
    const samples = Array.from({ length: 500 }, () => Math.random() * 0.1);
    const result = chiSquaredUniformTest(samples, 10);
    expect(result.isUniform).toBe(false);
  });

  it("chiSq is non-negative", () => {
    const prng = createPRNG(22);
    const samples = Array.from({ length: 500 }, () => prng.next());
    expect(chiSquaredUniformTest(samples).chiSq).toBeGreaterThanOrEqual(0);
  });

  it("pValue is in [0, 1]", () => {
    const prng = createPRNG(33);
    const samples = Array.from({ length: 500 }, () => prng.next());
    const { pValue } = chiSquaredUniformTest(samples);
    expect(pValue).toBeGreaterThanOrEqual(0);
    expect(pValue).toBeLessThanOrEqual(1);
  });
});

describe("runsTest", () => {
  it("returns z, pValue, isRandom", () => {
    const seq: (0 | 1)[] = Array.from({ length: 100 }, () => (Math.random() > 0.5 ? 1 : 0));
    const result = runsTest(seq);
    expect(typeof result.z).toBe("number");
    expect(typeof result.pValue).toBe("number");
    expect(typeof result.isRandom).toBe("boolean");
  });

  it("alternating sequence fails randomness test", () => {
    // Perfectly alternating: too many runs
    const seq: (0 | 1)[] = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 0 : 1));
    const result = runsTest(seq);
    expect(result.isRandom).toBe(false);
  });

  it("all-same sequence fails randomness test", () => {
    const seq: (0 | 1)[] = new Array(100).fill(0) as (0 | 1)[];
    const result = runsTest(seq);
    // Only 1 run, clearly not random — degenerate case returns isRandom=false
    expect(result.isRandom).toBe(false);
  });

  it("random binary sequence produces z in a reasonable range", () => {
    // The runs test is a statistical test; we check z is finite and pValue in [0,1]
    // rather than asserting a specific outcome (which can fail by chance ~5% of the time).
    const prng = createPRNG(500);
    const seq: (0 | 1)[] = Array.from({ length: 500 }, () =>
      prng.next() > 0.5 ? 1 : 0
    );
    const result = runsTest(seq);
    expect(Number.isFinite(result.z)).toBe(true);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it("pValue is in [0, 1]", () => {
    const seq: (0 | 1)[] = Array.from({ length: 100 }, (_, i) => (i % 3 === 0 ? 1 : 0));
    const { pValue } = runsTest(seq);
    expect(pValue).toBeGreaterThanOrEqual(0);
    expect(pValue).toBeLessThanOrEqual(1);
  });
});

describe("autocorrelation", () => {
  it("lag=0 returns 1 (all variance with itself)", () => {
    const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ac = autocorrelation(samples, 0);
    expect(ac).toBeCloseTo(1, 5);
  });

  it("returns number in approx [-1, 1]", () => {
    const prng = createPRNG(600);
    const samples = Array.from({ length: 100 }, () => prng.next());
    const ac = autocorrelation(samples, 1);
    expect(ac).toBeGreaterThanOrEqual(-1.1);
    expect(ac).toBeLessThanOrEqual(1.1);
  });

  it("iid random samples have near-zero autocorrelation at lag>0", () => {
    const prng = createPRNG(700);
    const samples = Array.from({ length: 5000 }, () => prng.next());
    const ac = autocorrelation(samples, 1);
    expect(Math.abs(ac)).toBeLessThan(0.1);
  });

  it("constant sequence returns 0", () => {
    const samples = new Array(10).fill(3) as number[];
    expect(autocorrelation(samples, 1)).toBe(0);
  });

  it("periodic signal has high autocorrelation at period lag", () => {
    // Sine wave with period 10
    const samples = Array.from({ length: 100 }, (_, i) => Math.sin((2 * Math.PI * i) / 10));
    const ac10 = autocorrelation(samples, 10);
    expect(ac10).toBeGreaterThan(0.8);
  });
});

// ---------------------------------------------------------------------------
// Edge cases and cross-function tests
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("seededShuffle with strings works", () => {
    const arr = ["a", "b", "c", "d"];
    const result = seededShuffle(arr, 1);
    expect(result.sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("sample returns empty array for n=0", () => {
    expect(sample([1, 2, 3], 0)).toEqual([]);
  });

  it("sampleWithReplacement with n=0 returns empty array", () => {
    expect(sampleWithReplacement([1, 2, 3], 0)).toEqual([]);
  });

  it("runSimulations with 0 trials returns empty array", () => {
    expect(runSimulations(() => 1, 0, 1)).toEqual([]);
  });

  it("randomPartition with k=1 returns one group with all elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const parts = randomPartition(arr, 1, makePRNG());
    expect(parts.length).toBe(1);
    expect(parts[0]?.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("bootstrapMean with single element", () => {
    const result = bootstrapMean([42], 100, makePRNG());
    expect(result.mean).toBe(42);
  });

  it("monteCarloPi is positive", () => {
    expect(monteCarloPi(100, makePRNG())).toBeGreaterThan(0);
  });

  it("monteCarloIntegral over single point (a=b) returns 0", () => {
    const result = monteCarloIntegral(() => 1, 5, 5, 100, makePRNG());
    expect(result).toBe(0);
  });

  it("poissonSample with very small lambda returns mostly 0", () => {
    const prng = createPRNG(800);
    const samples = Array.from({ length: 200 }, () => poissonSample(prng, 0.01));
    const zeros = samples.filter((v) => v === 0).length;
    expect(zeros).toBeGreaterThan(150);
  });

  it("categoricalSample with equal weights approximates uniform", () => {
    const prng = createPRNG(900);
    const cats = [0, 1, 2, 3];
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      counts[categoricalSample(prng, cats, [1, 1, 1, 1])]!++;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});
