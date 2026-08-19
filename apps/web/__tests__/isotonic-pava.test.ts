import { describe, expect, it } from "vitest";
import { applyIsotonic, fitIsotonicPava, pava } from "@/lib/calibration/isotonic-pava";

describe("pava core", () => {
  it("returns nondecreasing block means", () => {
    const out = pava([0.9, 0.1, 0.2, 0.8], [1, 1, 1, 1]);
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]! - 1e-12);
    }
  });

  it("identity when already monotone", () => {
    const y = [0.1, 0.2, 0.5, 0.9];
    expect(pava(y)).toEqual(y);
  });

  // REGRESSION: the pooling loop used to advance past the merged block's right
  // edge, so a block that became too large for its RIGHT neighbor was never
  // re-compared. [0.9, 0.1, 0.2, 0.8] pooled (0.9, 0.1) into 0.5 and then never
  // tested 0.5 against 0.2, returning [0.5, 0.5, 0.2, 0.8] - non-monotone from
  // the one function whose entire contract is monotonicity. Exact block means
  // are asserted here, not just ordering: a merely-sorted output would pass a
  // monotonicity check while still being the wrong fit.
  it("pools left AND re-checks the merged block against its right neighbor", () => {
    // Element-wise closeTo, not toEqual: the first block mean is
    // (0.9 + 0.1 + 0.2) / 3, which in IEEE-754 is 0.4000000000000001.
    const out = pava([0.9, 0.1, 0.2, 0.8]);
    const expected = [0.4, 0.4, 0.4, 0.8];
    expect(out).toHaveLength(expected.length);
    out.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 12));
  });

  it("collapses a fully descending sequence to one block at the grand mean", () => {
    expect(pava([4, 3, 2, 1])).toEqual([2.5, 2.5, 2.5, 2.5]);
  });

  it("preserves the sum (PAVA is a projection, it moves mass but never adds it)", () => {
    const y = [0.9, 0.1, 0.2, 0.8, 0.05, 0.4];
    const out = pava(y);
    const before = y.reduce((a, b) => a + b, 0);
    const after = out.reduce((a, b) => a + b, 0);
    expect(after).toBeCloseTo(before, 12);
  });

  it("returns an already-equal sequence unchanged", () => {
    const y = [0.3, 0.3, 0.3, 0.3];
    expect(pava(y)).toEqual(y);
  });

  it("pools to the weighted mean, not the arithmetic mean", () => {
    // 0.9 > 0.1 → pool with weights 1 and 3 → (0.9*1 + 0.1*3)/4 = 0.3
    // 0.3 < 0.8 → stop. Arithmetic mean of 0.9 and 0.1 would be 0.5.
    const out = pava([0.9, 0.1, 0.8], [1, 3, 1]);
    const expected = [0.3, 0.3, 0.8];
    expect(out).toHaveLength(expected.length);
    out.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 12));
  });

  it("is nondecreasing across 200 random inputs", () => {
    let seed = 20260818;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let trial = 0; trial < 200; trial++) {
      const n = 2 + Math.floor(rand() * 15);
      const y = Array.from({ length: n }, () => rand());
      const w = Array.from({ length: n }, () => 0.1 + rand() * 4);
      const out = pava(y, w);
      expect(out).toHaveLength(n);
      for (let i = 1; i < out.length; i++) {
        expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]! - 1e-12);
      }
    }
  });

  it("conserves weighted mass: sum w*out === sum w*in", () => {
    const y = [0.9, 0.1, 0.2, 0.8];
    const w = [1, 3, 2, 0.5];
    const out = pava(y, w);
    const before = y.reduce((acc, yi, i) => acc + yi * w[i]!, 0);
    const after = out.reduce((acc, oi, i) => acc + oi * w[i]!, 0);
    expect(after).toBeCloseTo(before, 9);
  });
});

describe("fitIsotonicPava", () => {
  it("empty → flat 0.5", () => {
    const m = fitIsotonicPava([]);
    expect(m.y[0]).toBe(0.5);
  });

  it("nondecreasing map in (0,1); apply bounded", () => {
    const samples = Array.from({ length: 200 }, (_, i) => {
      const p = 0.05 + (0.9 * i) / 199;
      const y = (p > 0.55 ? 1 : 0) as 0 | 1;
      return { p, y };
    });
    const m = fitIsotonicPava(samples);
    for (let i = 1; i < m.y.length; i++) {
      expect(m.y[i]!).toBeGreaterThanOrEqual(m.y[i - 1]! - 1e-9);
    }
    for (const v of m.y) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    expect(applyIsotonic(0.2, m)).toBeLessThanOrEqual(applyIsotonic(0.8, m) + 1e-9);
  });
});

describe("pava — properties the algorithm must satisfy (regression for the forward-violation bug)", () => {
  // pava([0.9, 0.1, 0.2, 0.8]) used to return [0.5, 0.5, 0.2, 0.8]: after
  // merging a violating pair, the scan jumped PAST the merged block, so a new
  // pooled mean was never re-checked against its successor. A decreasing output
  // from an isotonic fit is a correctness bug in the calibration core, so these
  // pin the algorithm's defining properties, not one example.

  // Deterministic LCG so failures reproduce; Math.random would flake.
  function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
  }

  /** Textbook O(n^2) reference: repeatedly merge the first violating pair. */
  function referencePava(y: number[], w: number[]): number[] {
    const blocks = y.map((v, i) => ({ sum: v * w[i]!, w: w[i]!, len: 1 }));
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i + 1 < blocks.length; i++) {
        const a = blocks[i]!;
        const b = blocks[i + 1]!;
        if (a.sum / a.w > b.sum / b.w + 1e-15) {
          blocks.splice(i, 2, { sum: a.sum + b.sum, w: a.w + b.w, len: a.len + b.len });
          merged = true;
          break;
        }
      }
    }
    const out: number[] = [];
    for (const b of blocks) for (let k = 0; k < b.len; k++) out.push(b.sum / b.w);
    return out;
  }

  it("the exact failing case: descend-then-recover merges to one flat block", () => {
    // toBeCloseTo, not toEqual: the pooled mean arrives as (0.5*2 + 0.2)/3 =
    // 0.39999999999999997 in binary floating point. The block structure is the
    // assertion that matters; exact decimal literals are not representable.
    const out = pava([0.9, 0.1, 0.2, 0.8], [1, 1, 1, 1]);
    expect(out[0]).toBeCloseTo(0.4, 12);
    expect(out[1]).toBeCloseTo(0.4, 12);
    expect(out[2]).toBeCloseTo(0.4, 12);
    expect(out[3]).toBeCloseTo(0.8, 12);
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
  });

  it("fuzz: output is nondecreasing, weight-mean preserving, and matches the reference", () => {
    const rand = lcg(0xc0ffee);
    for (let trial = 0; trial < 200; trial++) {
      const n = 1 + Math.floor(rand() * 40);
      const y = Array.from({ length: n }, () => rand());
      const w = Array.from({ length: n }, () => 0.5 + rand() * 2);
      const out = pava(y.slice(), w.slice());
      const ref = referencePava(y, w);

      for (let i = 1; i < n; i++) {
        expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]! - 1e-9);
      }
      // Weighted mean is invariant under pool-adjacent-violators merging.
      const wm = (v: number[]) => v.reduce((acc, x, i) => acc + x * w[i]!, 0);
      expect(wm(out)).toBeCloseTo(wm(y), 6);
      for (let i = 0; i < n; i++) {
        expect(out[i]!).toBeCloseTo(ref[i]!, 9);
      }
    }
  });

  it("already-sorted input passes through untouched", () => {
    const y = [0.1, 0.2, 0.2, 0.9];
    expect(pava(y.slice(), [1, 1, 1, 1])).toEqual(y);
  });

  it("strictly decreasing input collapses to the global weighted mean", () => {
    const out = pava([0.9, 0.7, 0.4, 0.1], [1, 1, 1, 1]);
    for (const v of out) expect(v).toBeCloseTo(0.525, 12);
  });
});
