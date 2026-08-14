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
