import { describe, it, expect } from "vitest";

import { blockBootstrap } from "../slots/block-bootstrap.js";
import { KernelError, makeRng, type BlockBootstrapOptions } from "../contract.js";
import { boxMuller } from "../numeric.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (deterministic; no Math.random anywhere in this file)
// ─────────────────────────────────────────────────────────────────────────────

const mean = (xs: readonly number[]): number => {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
};

const sum = (xs: readonly number[]): number => {
  let s = 0;
  for (const x of xs) s += x;
  return s;
};

/** Population (÷n) standard deviation. */
const sd = (xs: readonly number[]): number => {
  const m = mean(xs);
  let acc = 0;
  for (const x of xs) acc += (x - m) * (x - m);
  return Math.sqrt(acc / xs.length);
};

const opts = (o: Partial<BlockBootstrapOptions> & { seed?: number }): BlockBootstrapOptions => ({
  blockLength: o.blockLength ?? 1,
  resamples: o.resamples ?? 500,
  level: o.level ?? 0.95,
  rng: o.rng ?? makeRng(o.seed ?? 42),
});

/** i.i.d. standard-normal series, scaled, from a fixed seed. */
function iidNormal(n: number, seed: number, mu = 0, sigma = 1): number[] {
  const rng = makeRng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(mu + sigma * boxMuller(rng));
  return out;
}

/**
 * Stationary AR(1): x_t = phi·x_{t−1} + sqrt(1 − phi²)·ε_t, ε ~ N(0,1),
 * started from its stationary distribution so the whole series has unit
 * marginal variance. The long-run variance of the mean is inflated by the
 * factor (1 + phi) / (1 − phi) relative to i.i.d. data of the same marginal
 * variance — which is exactly what the block form is supposed to recover.
 */
function ar1(n: number, phi: number, seed: number): number[] {
  const rng = makeRng(seed);
  const innovSd = Math.sqrt(1 - phi * phi);
  let x = boxMuller(rng); // stationary start
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    x = phi * x + innovSd * boxMuller(rng);
    out.push(x);
  }
  return out;
}

const width = (i: { lower: number; upper: number }): number => i.upper - i.lower;

// ─────────────────────────────────────────────────────────────────────────────
// Exact / closed-form behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe("blockBootstrap — exact algebraic cases", () => {
  it("blockLength === n admits exactly ONE block start, so every resample IS the original series", () => {
    // n − L + 1 = 1 admissible start and ceil(n/L) = 1 block, therefore each
    // resample reproduces `values` exactly. The percentile interval of a
    // constant sample is that constant, so lower === upper === point EXACTLY.
    const values = [3, 1, 4, 1, 5, 9, 2, 6];
    const r = blockBootstrap(values, mean, opts({ blockLength: 8, resamples: 200, seed: 7 }));
    expect(r.point).toBe(mean(values));
    expect(r.lower).toBe(mean(values));
    expect(r.upper).toBe(mean(values));
    expect(r.level).toBe(0.95);
  });

  it("blockLength === n with a non-linear statistic is still exact", () => {
    const values = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
    const stat = (s: readonly number[]): number => Math.max(...s) - Math.min(...s);
    const r = blockBootstrap(values, stat, opts({ blockLength: 10, resamples: 50, seed: 11 }));
    expect(r.point).toBe(8); // 9 − 1
    expect(r.lower).toBe(8);
    expect(r.upper).toBe(8);
  });

  it("a constant series gives a zero-width interval at the constant, for any block length", () => {
    const values = new Array<number>(40).fill(2.5);
    for (const L of [1, 3, 7, 40]) {
      const r = blockBootstrap(values, mean, opts({ blockLength: L, resamples: 300, seed: 5 }));
      expect(r.point).toBeCloseTo(2.5, 12);
      expect(r.lower).toBeCloseTo(2.5, 12);
      expect(r.upper).toBeCloseTo(2.5, 12);
    }
  });

  it("point is the statistic on the ORIGINAL series, not the mean of the resamples", () => {
    // A statistic that is wildly biased under resampling: count of DISTINCT
    // values. Resamples repeat blocks, so the resampled statistic is almost
    // always strictly below the original — proving `point` is not a resample
    // summary.
    const values = Array.from({ length: 60 }, (_, i) => i);
    const distinct = (s: readonly number[]): number => new Set(s).size;
    const r = blockBootstrap(values, distinct, opts({ blockLength: 5, resamples: 400, seed: 3 }));
    expect(r.point).toBe(60);
    expect(r.upper).toBeLessThan(60);
  });

  it("every resample has exactly length n (verified by a length-reporting statistic)", () => {
    const values = Array.from({ length: 17 }, (_, i) => i + 1);
    for (const L of [1, 2, 5, 6, 16, 17]) {
      const r = blockBootstrap(
        values,
        (s) => s.length,
        opts({ blockLength: L, resamples: 60, seed: 9 }),
      );
      expect(r.point).toBe(17);
      expect(r.lower).toBe(17);
      expect(r.upper).toBe(17);
    }
  });

  it("resamples are drawn only from the original values (no wrapping, no invention)", () => {
    const values = [10, 20, 30, 40, 50, 60, 70];
    const allowed = new Set(values);
    let seen = 0;
    const check = (s: readonly number[]): number => {
      for (const x of s) {
        expect(allowed.has(x)).toBe(true);
        seen += 1;
      }
      return mean(s);
    };
    blockBootstrap(values, check, opts({ blockLength: 3, resamples: 100, seed: 21 }));
    expect(seen).toBe(7 * 101); // original call + 100 resamples
  });

  it("blocks are CONTIGUOUS and non-wrapping: every length-L window in a resample that starts at a block boundary is a window of the original", () => {
    const L = 4;
    const values = Array.from({ length: 20 }, (_, i) => i); // strictly increasing
    const check = (s: readonly number[]): number => {
      for (let off = 0; off + L <= s.length; off += L) {
        for (let j = 1; j < L; j += 1) {
          // contiguous ascending run inside each block
          expect(s[off + j]! - s[off + j - 1]!).toBe(1);
        }
        // non-wrapping: a block starting at `start` needs start + L − 1 <= 19
        expect(s[off + L - 1]!).toBeLessThanOrEqual(19);
        expect(s[off]!).toBeGreaterThanOrEqual(0);
      }
      return mean(s);
    };
    blockBootstrap(values, check, opts({ blockLength: L, resamples: 200, seed: 33 }));
  });

  it("does not mutate the input array, even when the statistic sorts what it is given", () => {
    const values = [5, 3, 9, 1, 7, 2, 8];
    const snapshot = [...values];
    const destructive = (s: readonly number[]): number => {
      (s as number[]).sort((a, b) => a - b);
      return s[0]!;
    };
    blockBootstrap(values, destructive, opts({ blockLength: 2, resamples: 50, seed: 1 }));
    expect(values).toEqual(snapshot);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Determinism
// ─────────────────────────────────────────────────────────────────────────────

describe("blockBootstrap — determinism", () => {
  it("identical seed ⇒ bit-identical interval", () => {
    const values = iidNormal(120, 1234);
    const a = blockBootstrap(values, mean, opts({ blockLength: 6, resamples: 800, seed: 99 }));
    const b = blockBootstrap(values, mean, opts({ blockLength: 6, resamples: 800, seed: 99 }));
    expect(a.point).toBe(b.point);
    expect(a.lower).toBe(b.lower);
    expect(a.upper).toBe(b.upper);
    expect(a.level).toBe(b.level);
  });

  it("different seeds ⇒ different interval (the rng is actually consumed)", () => {
    const values = iidNormal(120, 1234);
    const a = blockBootstrap(values, mean, opts({ blockLength: 6, resamples: 800, seed: 99 }));
    const b = blockBootstrap(values, mean, opts({ blockLength: 6, resamples: 800, seed: 100 }));
    expect(a.point).toBe(b.point); // point never depends on the rng
    expect(a.lower).not.toBe(b.lower);
    expect(a.upper).not.toBe(b.upper);
  });

  it("uses ONLY the injected rng (a rng returning a constant makes the run fully determined)", () => {
    // A degenerate rng that always yields 0 forces every block start to 0, so
    // every resample is values[0..L−1] repeated and truncated to n.
    const values = [1, 2, 3, 4, 5, 6];
    const zeros = (): number => 0;
    const r = blockBootstrap(values, (s) => s.join(",").length + sum(s), {
      blockLength: 2,
      resamples: 10,
      level: 0.9,
      rng: zeros,
    });
    // resample = [1,2,1,2,1,2] ⇒ sum 9, joined "1,2,1,2,1,2" length 11 ⇒ 20
    expect(r.lower).toBe(20);
    expect(r.upper).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Statistical correctness
// ─────────────────────────────────────────────────────────────────────────────

describe("blockBootstrap — statistical behaviour", () => {
  it("lower <= point <= upper for the mean of i.i.d. data", () => {
    const values = iidNormal(200, 777, 4, 2);
    const r = blockBootstrap(values, mean, opts({ blockLength: 5, resamples: 1500, seed: 8 }));
    expect(r.lower).toBeLessThanOrEqual(r.point);
    expect(r.point).toBeLessThanOrEqual(r.upper);
  });

  it("brackets the point estimate across the block lengths and levels the method is valid for (L ≪ n)", () => {
    // The moving-block bootstrap is a large-n, L = o(n) method. Inside that
    // regime (here L/n <= 0.1 on an autocorrelated series) the resampling
    // distribution is centred on the sample statistic and the percentile band
    // brackets it at every level. This sweep asserts exactly that, over three
    // independent AR(1) realisations so it is not one lucky seed.
    for (const n of [600, 1200]) {
      for (const seriesSeed of [4242, 909, 31]) {
        const values = ar1(n, 0.5, seriesSeed);
        for (const L of [1, 2, 5, 10, 20, 30, 60]) {
          for (const level of [0.5, 0.8, 0.9, 0.95, 0.99]) {
            const r = blockBootstrap(
              values,
              mean,
              opts({ blockLength: L, resamples: 1000, level, seed: 17 }),
            );
            expect(r.lower).toBeLessThanOrEqual(r.point + 1e-12);
            expect(r.point).toBeLessThanOrEqual(r.upper + 1e-12);
            expect(r.lower).toBeLessThanOrEqual(r.upper + 1e-12);
            expect(r.level).toBe(level);
          }
        }
      }
    }
  });

  it("KNOWN LIMITATION, proven not asserted: at L/n large the NON-WRAPPING moving block is edge-biased and the band can miss `point`", () => {
    // This is a real property of the estimator the contract mandates, not a
    // defect in this implementation, so it is pinned by a test rather than
    // hidden. With non-wrapping starts drawn from {0 … n − L}, observation i is
    // eligible for min(i + 1, L, n − L + 1, n − i) of the admissible blocks:
    // the observations near BOTH ends appear in strictly fewer blocks than the
    // interior ones, so E*[resample mean] is a weighted mean that tilts away
    // from the equally-weighted sample mean. The tilt is O(L/n) and vanishes as
    // L/n → 0 (proven by the sweep above); at L/n = 0.4 it can exceed the
    // half-width and push the whole band to one side of `point`.
    //
    // The circular block bootstrap (Politis & Romano) removes this by wrapping
    // — which the contract explicitly forbids ("non-wrapping blocks"), so the
    // correct response here is to document the bias, NOT to wrap, and NOT to
    // recentre the interval on `point` (recentring would fabricate coverage).
    const values = ar1(150, 0.5, 4242);
    const r = blockBootstrap(values, mean, opts({ blockLength: 60, resamples: 2000, level: 0.5, seed: 17 }));
    expect(r.lower).toBeLessThanOrEqual(r.upper);
    expect(r.point).toBeLessThan(r.lower); // the documented miss
  });

  it("widens monotonically with the confidence level (a real percentile property)", () => {
    const values = ar1(150, 0.5, 4242);
    let previousWidth = -Infinity;
    for (const level of [0.5, 0.8, 0.9, 0.95, 0.99]) {
      const r = blockBootstrap(values, mean, opts({ blockLength: 5, resamples: 2000, level, seed: 17 }));
      const width = r.upper - r.lower;
      expect(width).toBeGreaterThanOrEqual(previousWidth - 1e-12);
      previousWidth = width;
    }
  });

  it("on i.i.d. normal data with blockLength 1, the CI width tracks the analytic normal CI for the mean", () => {
    // ANALYTIC REFERENCE: for the mean of n i.i.d. draws, a level-(1−α) normal
    // interval has width 2 · z_{1−α/2} · σ / sqrt(n). The i.i.d. bootstrap
    // (L = 1) resampling distribution of the mean has variance s²/n with s the
    // ÷n sample sd, so its percentile width converges to 2 · 1.959964 · s/√n.
    const n = 500;
    const values = iidNormal(n, 20260825, 0, 3);
    const analytic = 2 * 1.959963984540054 * (sd(values) / Math.sqrt(n));

    const r = blockBootstrap(values, mean, opts({ blockLength: 1, resamples: 6000, seed: 555 }));
    const ratio = width(r) / analytic;
    // Loose band: Monte-Carlo error on a 2.5%/97.5% percentile from 6000
    // replicates is a few percent.
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  });

  it("the L=1 width scales like 1/sqrt(n) (four-fold n ⇒ ~half the width)", () => {
    const small = iidNormal(250, 31337);
    const large = iidNormal(1000, 31337);
    const a = blockBootstrap(small, mean, opts({ blockLength: 1, resamples: 4000, seed: 2 }));
    const b = blockBootstrap(large, mean, opts({ blockLength: 1, resamples: 4000, seed: 2 }));
    expect(width(a) / width(b)).toBeGreaterThan(1.6);
    expect(width(a) / width(b)).toBeLessThan(2.5);
  });

  it("THE JUSTIFICATION FOR THE BLOCK FORM: on strongly autocorrelated data the block CI is materially WIDER than the L=1 CI", () => {
    // AR(1) with phi = 0.9 ⇒ long-run variance inflation (1+φ)/(1−φ) = 19,
    // so the honest interval is ~sqrt(19) ≈ 4.36× the i.i.d. one. A finite
    // block of length L recovers only part of that, so we require a clear
    // widening (>1.8×) rather than the full asymptotic factor.
    const values = ar1(600, 0.9, 987654);
    const iid = blockBootstrap(values, mean, opts({ blockLength: 1, resamples: 3000, seed: 1010 }));
    const blocked = blockBootstrap(values, mean, opts({ blockLength: 50, resamples: 3000, seed: 1010 }));
    expect(width(blocked)).toBeGreaterThan(1.8 * width(iid));
  });

  it("width grows monotonically-ish with block length on autocorrelated data", () => {
    const values = ar1(600, 0.9, 5150);
    const w = [1, 5, 20, 60].map(
      (L) => width(blockBootstrap(values, mean, opts({ blockLength: L, resamples: 2500, seed: 61 }))),
    );
    expect(w[1]!).toBeGreaterThan(w[0]!);
    expect(w[2]!).toBeGreaterThan(w[1]!);
    expect(w[3]!).toBeGreaterThan(w[2]!);
  });

  it("on i.i.d. data the block form does NOT materially widen the interval (no free lunch, no false alarm)", () => {
    const values = iidNormal(600, 24680);
    const iid = blockBootstrap(values, mean, opts({ blockLength: 1, resamples: 3000, seed: 77 }));
    const blocked = blockBootstrap(values, mean, opts({ blockLength: 20, resamples: 3000, seed: 77 }));
    const ratio = width(blocked) / width(iid);
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.4);
  });

  it("higher confidence level ⇒ wider interval", () => {
    const values = iidNormal(300, 1357);
    const w50 = width(blockBootstrap(values, mean, opts({ blockLength: 4, resamples: 3000, level: 0.5, seed: 4 })));
    const w90 = width(blockBootstrap(values, mean, opts({ blockLength: 4, resamples: 3000, level: 0.9, seed: 4 })));
    const w99 = width(blockBootstrap(values, mean, opts({ blockLength: 4, resamples: 3000, level: 0.99, seed: 4 })));
    expect(w90).toBeGreaterThan(w50);
    expect(w99).toBeGreaterThan(w90);
  });

  it("the interval is centred near the point estimate for the (unbiased) mean", () => {
    const values = iidNormal(400, 8642, 7, 1.5);
    const r = blockBootstrap(values, mean, opts({ blockLength: 1, resamples: 5000, seed: 13 }));
    const mid = (r.lower + r.upper) / 2;
    expect(Math.abs(mid - r.point)).toBeLessThan(0.15 * width(r));
  });

  it("a single-observation series has a zero-width interval at that observation", () => {
    const r = blockBootstrap([42], mean, opts({ blockLength: 1, resamples: 25, seed: 6 }));
    expect(r.point).toBe(42);
    expect(r.lower).toBe(42);
    expect(r.upper).toBe(42);
  });

  it("resamples = 1 gives a degenerate interval equal to that single replicate", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8];
    const r = blockBootstrap(values, mean, opts({ blockLength: 2, resamples: 1, level: 0.95, seed: 88 }));
    expect(r.lower).toBe(r.upper);
    // and it is a genuine resample statistic, i.e. a mean of eight of the values
    expect(r.lower).toBeGreaterThanOrEqual(1);
    expect(r.lower).toBeLessThanOrEqual(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Percentile definition
// ─────────────────────────────────────────────────────────────────────────────

describe("blockBootstrap — percentile interpolation (type 7)", () => {
  it("reproduces the type-7 percentile of a controlled replicate set", () => {
    // Force a fully deterministic, known replicate set: an rng cycling through
    // block starts 0 and 1 in a fixed pattern with L = n − 1 gives exactly two
    // possible resamples. With resamples = 4 and level = 0.5 the type-7
    // 25% / 75% percentiles of the sorted 4-element replicate vector
    // [a, a, b, b] (a < b) are:
    //   h(0.25) = 3 · 0.25 = 0.75 → a + 0.75·(a − a) = a   (lo = 0)
    //   h(0.75) = 3 · 0.75 = 2.25 → b + 0.25·(b − b) = b   (lo = 2)
    const values = [0, 0, 0, 10]; // n = 4, L = 3 ⇒ starts {0, 1}
    // starts: 0,1,0,1 — one draw per resample (ceil(4/3) = 2 blocks per
    // resample, but the second block is truncated to 1 element), so 2 draws
    // per resample.
    const draws = [0, 0, 0.9, 0.9, 0, 0, 0.9, 0.9];
    let i = 0;
    const rng = (): number => draws[i++]!;
    const r = blockBootstrap(values, sum, {
      blockLength: 3,
      resamples: 4,
      level: 0.5,
      rng,
    });
    // start 0 ⇒ block [0,0,0] then truncated block [0] ⇒ sum 0
    // start 1 ⇒ block [0,0,10] then truncated block [0] ⇒ sum 10
    // replicates = [0, 0, 10, 10]; sorted the same.
    expect(r.point).toBe(10);
    expect(r.lower).toBe(0);
    expect(r.upper).toBe(10);
  });

  it("interpolates between order statistics (a non-integer percentile position lands strictly between two replicates)", () => {
    // Replicates {0, 10} in a 3-element sample [0, 0, 10]: level 0.5 ⇒
    // h(0.25) = 2 · 0.25 = 0.5 → 0 + 0.5·(0 − 0) = 0
    // h(0.75) = 2 · 0.75 = 1.5 → 0 + 0.5·(10 − 0) = 5  ← interpolated
    const values = [0, 0, 0, 10];
    const draws = [0, 0, 0, 0, 0.9, 0.9];
    let i = 0;
    const rng = (): number => draws[i++]!;
    const r = blockBootstrap(values, sum, {
      blockLength: 3,
      resamples: 3,
      level: 0.5,
      rng,
    });
    expect(r.lower).toBe(0);
    expect(r.upper).toBe(5);
  });

  it("never extrapolates: the interval stays inside [min replicate, max replicate]", () => {
    const values = iidNormal(80, 2468);
    const seen: number[] = [];
    const stat = (s: readonly number[]): number => {
      const m = mean(s);
      seen.push(m);
      return m;
    };
    const r = blockBootstrap(values, stat, opts({ blockLength: 4, resamples: 500, level: 0.999, seed: 3 }));
    const reps = seen.slice(1); // drop the original-series call
    expect(r.lower).toBeGreaterThanOrEqual(Math.min(...reps));
    expect(r.upper).toBeLessThanOrEqual(Math.max(...reps));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fail-closed behaviour — every documented code has a test
// ─────────────────────────────────────────────────────────────────────────────

describe("blockBootstrap — fail closed", () => {
  const good = opts({ blockLength: 2, resamples: 10, seed: 1 });

  const expectCode = (fn: () => unknown, code: string): void => {
    let err: unknown;
    try {
      fn();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect((err as KernelError).code).toBe(code);
  };

  it("EMPTY: empty values", () => {
    expectCode(() => blockBootstrap([], mean, good), "EMPTY");
  });

  it("NOT_FINITE: a NaN element", () => {
    expectCode(() => blockBootstrap([1, 2, Number.NaN, 4], mean, good), "NOT_FINITE");
  });

  it("NOT_FINITE: an Infinity element", () => {
    expectCode(
      () => blockBootstrap([1, 2, Number.POSITIVE_INFINITY, 4], mean, good),
      "NOT_FINITE",
    );
    expectCode(
      () => blockBootstrap([1, Number.NEGATIVE_INFINITY, 3, 4], mean, good),
      "NOT_FINITE",
    );
  });

  it("DOMAIN: blockLength > n", () => {
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: 4, resamples: 10, seed: 1 })),
      "DOMAIN",
    );
  });

  it("DOMAIN: blockLength < 1", () => {
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: 0, resamples: 10, seed: 1 })),
      "DOMAIN",
    );
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: -2, resamples: 10, seed: 1 })),
      "DOMAIN",
    );
  });

  it("DOMAIN: non-integer or non-finite blockLength", () => {
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: 1.5, resamples: 10, seed: 1 })),
      "DOMAIN",
    );
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: Number.NaN, resamples: 10, seed: 1 })),
      "DOMAIN",
    );
  });

  it("DOMAIN: resamples < 1 or non-integer", () => {
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: 2, resamples: 0, seed: 1 })),
      "DOMAIN",
    );
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: 2, resamples: -5, seed: 1 })),
      "DOMAIN",
    );
    expectCode(
      () => blockBootstrap([1, 2, 3], mean, opts({ blockLength: 2, resamples: 2.5, seed: 1 })),
      "DOMAIN",
    );
  });

  it("DOMAIN: level outside the open interval (0,1)", () => {
    for (const level of [0, 1, -0.1, 1.5, Number.NaN]) {
      expectCode(
        () =>
          blockBootstrap([1, 2, 3], mean, opts({ blockLength: 2, resamples: 10, level, seed: 1 })),
        "DOMAIN",
      );
    }
  });

  it("DOMAIN: rng is not a function", () => {
    expectCode(
      () =>
        blockBootstrap([1, 2, 3], mean, {
          blockLength: 2,
          resamples: 10,
          level: 0.95,
          rng: undefined as unknown as () => number,
        }),
      "DOMAIN",
    );
  });

  it("DOMAIN: rng returns out of [0,1)", () => {
    expectCode(
      () =>
        blockBootstrap([1, 2, 3], mean, {
          blockLength: 2,
          resamples: 10,
          level: 0.95,
          rng: () => 1.5,
        }),
      "DOMAIN",
    );
    expectCode(
      () =>
        blockBootstrap([1, 2, 3], mean, {
          blockLength: 2,
          resamples: 10,
          level: 0.95,
          rng: () => -0.1,
        }),
      "DOMAIN",
    );
  });

  it("NOT_FINITE: a statistic that returns NaN on the ORIGINAL series", () => {
    expectCode(() => blockBootstrap([1, 2, 3, 4], () => Number.NaN, good), "NOT_FINITE");
  });

  it("NOT_FINITE: a statistic that goes non-finite on a resample, naming that resample index", () => {
    // Call 1 = original series, call 2 = resample 0, call 3 = resample 1.
    let calls = 0;
    const flaky = (s: readonly number[]): number => {
      calls += 1;
      return calls === 3 ? Number.NaN : mean(s);
    };
    let err: unknown;
    try {
      blockBootstrap([1, 2, 3, 4, 5], flaky, opts({ blockLength: 2, resamples: 20, seed: 1 }));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect((err as KernelError).code).toBe("NOT_FINITE");
    expect((err as KernelError).message).toContain("resample 1");
    // It must abort, not silently drop the replicate and carry on.
    expect(calls).toBe(3);
  });

  it("NOT_FINITE: a statistic returning Infinity on a resample also throws (not silently dropped)", () => {
    let calls = 0;
    const flaky = (s: readonly number[]): number => {
      calls += 1;
      return calls === 5 ? Number.POSITIVE_INFINITY : mean(s);
    };
    expectCode(
      () => blockBootstrap([1, 2, 3, 4, 5], flaky, opts({ blockLength: 2, resamples: 20, seed: 1 })),
      "NOT_FINITE",
    );
  });

  it("DOMAIN: statistic is not a function", () => {
    expectCode(
      () => blockBootstrap([1, 2, 3], undefined as unknown as (s: readonly number[]) => number, good),
      "DOMAIN",
    );
  });
});
