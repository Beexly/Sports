import { describe, it, expect } from "vitest";

import { KernelError, makeRng } from "../contract.js";
import { benjaminiHochberg, effectiveSampleSize } from "../slots/bh-fdr.js";

/** Assert a call throws a KernelError carrying the expected code. */
function expectKernelError(fn: () => unknown, code: string): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(KernelError);
  expect((caught as KernelError).code).toBe(code);
}

describe("benjaminiHochberg — worked literature example", () => {
  // Benjamini & Hochberg (1995), Table 1: the m = 15 p-values from the
  // Needleman et al. multiple-endpoint study. The paper's stated result at
  // alpha = 0.05 is that the four smallest hypotheses are rejected (the
  // Bonferroni rule rejects three).
  const bh1995: readonly number[] = [
    0.0001, 0.0004, 0.0019, 0.0095, 0.0201, 0.0278, 0.0298, 0.0344, 0.0459,
    0.324, 0.4262, 0.5719, 0.6528, 0.759, 1.0,
  ];

  it("rejects exactly the four smallest at alpha = 0.05", () => {
    const r = benjaminiHochberg(bh1995, 0.05);
    expect(r.rejected).toEqual([
      true, true, true, true,
      false, false, false, false, false, false, false, false, false, false, false,
    ]);
    expect(r.threshold).toBeCloseTo(0.0095, 15);
  });

  it("reproduces hand-computed q-values, including the step-down carry", () => {
    const r = benjaminiHochberg(bh1995, 0.05);
    const m = 15;
    // Rank 1: raw 0.0001·15/1 = 0.0015, and rank 2 raw is 0.0004·15/2 = 0.003,
    // so the cumulative minimum from above leaves rank 1 at its own raw value.
    expect(r.qValues[0]).toBeCloseTo(0.0015, 15);
    expect(r.qValues[1]).toBeCloseTo(0.003, 15);
    expect(r.qValues[2]).toBeCloseTo((0.0019 * m) / 3, 15);
    expect(r.qValues[3]).toBeCloseTo((0.0095 * m) / 4, 15);
    // Rank 6 raw is 0.0278·15/6 = 0.0695 but rank 7 raw is 0.0298·15/7 ≈
    // 0.063857, so the step-down carry pulls rank 6 DOWN to the rank-7 value.
    // This is the whole point of the cumulative minimum.
    expect(r.qValues[6]).toBeCloseTo(0.06385714285714286, 12);
    expect(r.qValues[5]).toBeCloseTo(r.qValues[6] as number, 15);
    expect((r.qValues[5] as number) < (0.0278 * m) / 6).toBe(true);
    // Rank 15 raw is 1.0·15/15 = 1 exactly, so the clamp is a no-op there.
    expect(r.qValues[14]).toBe(1);
  });
});

describe("benjaminiHochberg — input-order alignment", () => {
  // Hand computation, m = 5, alpha = 0.05.
  // sorted p:      0.01  0.02  0.04  0.60  0.90     (ranks 1..5)
  // raw p·m/i:     0.05  0.05  0.0666…  0.75  0.90
  // cummin down:   0.05  0.05  0.0666…  0.75  0.90
  // BH line α·i/m: 0.01  0.02  0.03  0.04  0.05  → largest i with p_(i) <= line is 2
  const p: readonly number[] = [0.9, 0.01, 0.04, 0.6, 0.02];

  it("returns q-values and decisions aligned to the unsorted input", () => {
    const r = benjaminiHochberg(p, 0.05);
    expect(r.qValues[0]).toBeCloseTo(0.9, 15);
    expect(r.qValues[1]).toBeCloseTo(0.05, 15);
    expect(r.qValues[2]).toBeCloseTo(0.06666666666666667, 15);
    expect(r.qValues[3]).toBeCloseTo(0.75, 15);
    expect(r.qValues[4]).toBeCloseTo(0.05, 15);
    expect(r.rejected).toEqual([false, true, false, false, true]);
    expect(r.threshold).toBeCloseTo(0.02, 15);
  });

  it("is equivariant under permutation of the input", () => {
    const perm = [3, 0, 4, 2, 1];
    const permuted = perm.map((i) => p[i] as number);
    const base = benjaminiHochberg(p, 0.05);
    const shuffled = benjaminiHochberg(permuted, 0.05);
    for (let j = 0; j < perm.length; j += 1) {
      const i = perm[j] as number;
      expect(shuffled.qValues[j]).toBeCloseTo(base.qValues[i] as number, 15);
      expect(shuffled.rejected[j]).toBe(base.rejected[i]);
    }
    expect(shuffled.threshold).toBeCloseTo(base.threshold, 15);
  });

  it("does not mutate the caller's array", () => {
    const input = [0.9, 0.01, 0.04, 0.6, 0.02];
    const copy = input.slice();
    benjaminiHochberg(input, 0.05);
    expect(input).toEqual(copy);
  });
});

describe("benjaminiHochberg — invariants", () => {
  const grid = makeRng(20240817);
  const many: number[] = [];
  for (let i = 0; i < 500; i += 1) many.push(grid());

  it("q-values are non-decreasing in p and never below p", () => {
    const r = benjaminiHochberg(many, 0.1);
    const order = many
      .map((_, i) => i)
      .sort((a, b) => (many[a] as number) - (many[b] as number));
    let prev = -Infinity;
    for (const idx of order) {
      const q = r.qValues[idx] as number;
      expect(q).toBeGreaterThanOrEqual(prev - 1e-15);
      expect(q).toBeGreaterThanOrEqual((many[idx] as number) - 1e-15);
      expect(q).toBeLessThanOrEqual(1);
      prev = q;
    }
  });

  it("rejection set equals { q <= alpha } exactly", () => {
    for (const alpha of [0.01, 0.05, 0.2, 1]) {
      const r = benjaminiHochberg(many, alpha);
      for (let i = 0; i < many.length; i += 1) {
        expect(r.rejected[i]).toBe((r.qValues[i] as number) <= alpha);
      }
    }
  });

  it("rejection sets are nested in alpha", () => {
    const lo = benjaminiHochberg(many, 0.05);
    const hi = benjaminiHochberg(many, 0.25);
    for (let i = 0; i < many.length; i += 1) {
      if (lo.rejected[i]) expect(hi.rejected[i]).toBe(true);
    }
  });

  it("under the global null (uniform p) rejects at most an alpha fraction", () => {
    const alpha = 0.05;
    const r = benjaminiHochberg(many, alpha);
    const count = r.rejected.filter(Boolean).length;
    // FDR control under the complete null means P(any rejection) <= alpha, so
    // this is an extremely loose bound that a broken implementation blows past.
    expect(count).toBeLessThanOrEqual(alpha * many.length);
  });

  it("rejects everything when every p-value is zero", () => {
    const r = benjaminiHochberg([0, 0, 0, 0], 0.05);
    expect(r.rejected).toEqual([true, true, true, true]);
    expect(r.qValues).toEqual([0, 0, 0, 0]);
    expect(r.threshold).toBe(0);
  });

  it("rejects nothing when every p-value is one, and threshold is 0", () => {
    const r = benjaminiHochberg([1, 1, 1], 0.05);
    expect(r.rejected).toEqual([false, false, false]);
    expect(r.qValues).toEqual([1, 1, 1]);
    expect(r.threshold).toBe(0);
  });

  it("gives tied p-values identical q-values", () => {
    const r = benjaminiHochberg([0.02, 0.5, 0.02, 0.02], 0.05);
    expect(r.qValues[0]).toBeCloseTo(r.qValues[2] as number, 15);
    expect(r.qValues[0]).toBeCloseTo(r.qValues[3] as number, 15);
    // sorted: 0.02, 0.02, 0.02, 0.5; raw = 0.08, 0.04, 0.0266…, 0.5;
    // cummin from the top ⇒ all three ties take 0.02·4/3 = 0.02666…
    expect(r.qValues[0]).toBeCloseTo(0.02666666666666667, 15);
  });

  it("handles a single hypothesis (q = p, BH reduces to the raw test)", () => {
    expect(benjaminiHochberg([0.04], 0.05).qValues[0]).toBeCloseTo(0.04, 15);
    expect(benjaminiHochberg([0.04], 0.05).rejected).toEqual([true]);
    expect(benjaminiHochberg([0.06], 0.05).rejected).toEqual([false]);
    expect(benjaminiHochberg([0.06], 0.05).threshold).toBe(0);
  });

  it("at alpha = 1 the rejection set is { p <= q <= 1 } i.e. everything", () => {
    const r = benjaminiHochberg([0.001, 0.4, 0.999], 1);
    expect(r.rejected).toEqual([true, true, true]);
    expect(r.threshold).toBeCloseTo(0.999, 15);
  });

  it("is more powerful than Bonferroni and never rejects a larger p than the largest rejected", () => {
    const r = benjaminiHochberg(many, 0.05);
    for (let i = 0; i < many.length; i += 1) {
      if ((many[i] as number) <= 0.05 / many.length) expect(r.rejected[i]).toBe(true);
      if (r.rejected[i]) expect(many[i] as number).toBeLessThanOrEqual(r.threshold);
    }
  });
});

describe("benjaminiHochberg — fail closed", () => {
  it("throws DOMAIN for alpha <= 0", () => {
    expectKernelError(() => benjaminiHochberg([0.1], 0), "DOMAIN");
    expectKernelError(() => benjaminiHochberg([0.1], -0.05), "DOMAIN");
  });

  it("throws DOMAIN for alpha > 1", () => {
    expectKernelError(() => benjaminiHochberg([0.1], 1.0001), "DOMAIN");
  });

  it("throws NOT_FINITE for a non-finite alpha", () => {
    expectKernelError(() => benjaminiHochberg([0.1], Number.NaN), "NOT_FINITE");
    expectKernelError(() => benjaminiHochberg([0.1], Number.POSITIVE_INFINITY), "NOT_FINITE");
  });

  it("throws DOMAIN for a p-value outside [0,1]", () => {
    expectKernelError(() => benjaminiHochberg([0.1, 1.2], 0.05), "DOMAIN");
    expectKernelError(() => benjaminiHochberg([-1e-9, 0.2], 0.05), "DOMAIN");
  });

  it("throws NOT_FINITE for a NaN p-value", () => {
    expectKernelError(() => benjaminiHochberg([0.1, Number.NaN], 0.05), "NOT_FINITE");
  });

  it("throws EMPTY for an empty grid", () => {
    expectKernelError(() => benjaminiHochberg([], 0.05), "EMPTY");
  });
});

describe("effectiveSampleSize — closed-form anchors", () => {
  it("matches a fully hand-computed balanced two-cluster example", () => {
    // A = [1, 3], B = [5, 7]; n = 4, k = 2.
    // ȳ_A = 2, ȳ_B = 6, ȳ = 4.
    // MSB = (2·(2−4)² + 2·(6−4)²) / 1 = 16
    // MSW = ((1−2)² + (3−2)² + (5−6)² + (7−6)²) / (4−2) = 4/2 = 2
    // m0  = (4 − (2² + 2²)/4) / (2−1) = 4 − 2 = 2   (= common size, as required)
    // ρ   = (16 − 2) / (16 + (2−1)·2) = 14/18 = 7/9
    // m̄  = 2 ⇒ ess = 4 / (1 + 1·7/9) = 4 / (16/9) = 2.25
    const r = effectiveSampleSize([1, 3, 5, 7], ["A", "A", "B", "B"]);
    expect(r.ess).toBeCloseTo(2.25, 12);
    expect(r.designEffect).toBeCloseTo(4 / 2.25, 12);
  });

  it("matches a hand-computed UNBALANCED example (pins the m0 correction)", () => {
    // A = [1, 2, 3], B = [10, 12]; n = 5, k = 2.
    // ȳ_A = 2, ȳ_B = 11, ȳ = 5.6
    // MSB = (3·(2−5.6)² + 2·(11−5.6)²) / 1 = 38.88 + 58.32 = 97.2
    // MSW = (1 + 0 + 1 + 1 + 1) / (5−2) = 4/3
    // m0  = (5 − (9 + 4)/5) / 1 = 5 − 2.6 = 2.4     (NOT the mean size 2.5)
    const msb = 97.2;
    const msw = 4 / 3;
    const m0 = 2.4;
    const mBar = 2.5;
    const rho = (msb - msw) / (msb + (m0 - 1) * msw);
    const expected = 5 / (1 + (mBar - 1) * rho);
    const r = effectiveSampleSize([1, 2, 3, 10, 12], ["A", "A", "A", "B", "B"]);
    expect(r.ess).toBeCloseTo(expected, 12);
    expect(rho).toBeCloseTo(0.96769852, 8);
    expect(r.ess).toBeCloseTo(2.03952786, 8);
    expect(r.designEffect).toBeCloseTo(5 / expected, 12);
    // Using m̄ = 2.5 in place of m0 = 2.4 would land on a different number; pin
    // that the correction actually bites.
    const wrongRho = (msb - msw) / (msb + (mBar - 1) * msw);
    expect(Math.abs(rho - wrongRho)).toBeGreaterThan(1e-6);
  });
});

describe("effectiveSampleSize — limiting regimes", () => {
  it("all singleton clusters ⇒ ess = n and designEffect = 1 exactly", () => {
    const values = [3, 1, 4, 1, 5, 9, 2, 6];
    const ids = values.map((_, i) => i);
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBe(8);
    expect(r.designEffect).toBe(1);
  });

  it("perfectly correlated clusters (zero within-variance) ⇒ ess = number of clusters", () => {
    // Balanced: 4 clusters of 3, identical inside, different across.
    const values = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];
    const ids = ["a", "a", "a", "b", "b", "b", "c", "c", "c", "d", "d", "d"];
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeCloseTo(4, 12);
    expect(r.designEffect).toBeCloseTo(3, 12);
  });

  it("perfectly correlated UNBALANCED clusters also give ess = k", () => {
    // ρ = 1 ⇒ ess = n / m̄ = k regardless of how uneven the sizes are.
    const values = [5, 5, 5, 5, 9, 2, 2];
    const ids = ["x", "x", "x", "x", "y", "z", "z"];
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeCloseTo(3, 12);
    expect(r.designEffect).toBeCloseTo(7 / 3, 12);
  });

  it("a single cluster collapses to one independent unit (documented policy)", () => {
    const r = effectiveSampleSize([1, 2, 3, 4, 5, 6], ["only", "only", "only", "only", "only", "only"]);
    expect(r.ess).toBeCloseTo(1, 12);
    expect(r.designEffect).toBeCloseTo(6, 12);
  });

  it("a single observation gives ess = 1", () => {
    const r = effectiveSampleSize([42], ["p1"]);
    expect(r.ess).toBe(1);
    expect(r.designEffect).toBe(1);
  });

  it("all values identical everywhere ⇒ conservative rho = 1 ⇒ ess = k", () => {
    const r = effectiveSampleSize([7, 7, 7, 7], ["a", "a", "b", "b"]);
    expect(r.ess).toBeCloseTo(2, 12);
    expect(r.designEffect).toBeCloseTo(2, 12);
  });

  it("no between-cluster signal ⇒ rho clamps to 0 ⇒ ess = n", () => {
    // Identical cluster means, all variation inside ⇒ raw ANOVA ICC is negative.
    const values = [1, -1, 1, -1, 1, -1];
    const ids = ["a", "a", "b", "b", "c", "c"];
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeCloseTo(6, 12);
    expect(r.designEffect).toBeCloseTo(1, 12);
  });
});

describe("effectiveSampleSize — general invariants", () => {
  const rng = makeRng(9091);
  const values: number[] = [];
  const ids: number[] = [];
  // 40 clusters of 5, each with a cluster offset plus noise ⇒ genuine positive ICC.
  for (let c = 0; c < 40; c += 1) {
    const offset = 10 * (rng() - 0.5);
    for (let j = 0; j < 5; j += 1) {
      values.push(offset + (rng() - 0.5));
      ids.push(c);
    }
  }

  it("ess lies in [k, n] and designEffect = n / ess", () => {
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeGreaterThan(0);
    expect(r.ess).toBeLessThanOrEqual(values.length);
    expect(r.ess).toBeGreaterThanOrEqual(40 - 1e-9);
    expect(r.designEffect).toBeCloseTo(values.length / r.ess, 12);
    // Strong clustering here: the nominal 200 rows are worth far fewer.
    expect(r.designEffect).toBeGreaterThan(3);
  });

  it("is invariant to affine rescaling of the values (ICC is scale-free)", () => {
    const base = effectiveSampleSize(values, ids);
    const scaled = effectiveSampleSize(
      values.map((v) => 3.5 * v + 17),
      ids,
    );
    expect(scaled.ess).toBeCloseTo(base.ess, 9);
  });

  it("is invariant to the order rows arrive in", () => {
    const order = values.map((_, i) => i).sort(() => (rng() < 0.5 ? -1 : 1));
    const shuffled = effectiveSampleSize(
      order.map((i) => values[i] as number),
      order.map((i) => ids[i] as number),
    );
    expect(shuffled.ess).toBeCloseTo(effectiveSampleSize(values, ids).ess, 9);
  });

  it("is invariant to relabelling cluster ids", () => {
    const base = effectiveSampleSize(values, ids);
    const relabelled = effectiveSampleSize(values, ids.map((c) => `cluster-${c}`));
    expect(relabelled.ess).toBeCloseTo(base.ess, 12);
  });

  it("does not confuse the number 1 with the string \"1\"", () => {
    // Two clusters, not one: numeric 1 and string "1" are distinct ids.
    const mixed = effectiveSampleSize([0, 0, 5, 5], [1, 1, "1", "1"]);
    // Identical within, different across ⇒ ρ = 1 ⇒ ess = k = 2.
    expect(mixed.ess).toBeCloseTo(2, 12);
    // Collapsed into one cluster the policy would instead give ess = 1.
    const collapsed = effectiveSampleSize([0, 0, 5, 5], [1, 1, 1, 1]);
    expect(collapsed.ess).toBeCloseTo(1, 12);
  });

  it("does not mutate its inputs", () => {
    const v = [1, 3, 5, 7];
    const c = ["A", "A", "B", "B"];
    const vCopy = v.slice();
    const cCopy = c.slice();
    effectiveSampleSize(v, c);
    expect(v).toEqual(vCopy);
    expect(c).toEqual(cCopy);
  });
});

describe("effectiveSampleSize — fail closed", () => {
  it("throws MISMATCHED_LENGTH when the arrays do not align", () => {
    expectKernelError(() => effectiveSampleSize([1, 2, 3], ["a", "b"]), "MISMATCHED_LENGTH");
    expectKernelError(() => effectiveSampleSize([1], ["a", "b"]), "MISMATCHED_LENGTH");
  });

  it("throws EMPTY for no observations", () => {
    expectKernelError(() => effectiveSampleSize([], []), "EMPTY");
  });

  it("throws NOT_FINITE for a NaN or infinite value", () => {
    expectKernelError(() => effectiveSampleSize([1, Number.NaN], ["a", "b"]), "NOT_FINITE");
    expectKernelError(
      () => effectiveSampleSize([1, Number.POSITIVE_INFINITY], ["a", "b"]),
      "NOT_FINITE",
    );
  });

  it("throws NOT_FINITE for a non-finite numeric cluster id", () => {
    expectKernelError(() => effectiveSampleSize([1, 2], [1, Number.NaN]), "NOT_FINITE");
  });
});
