import { describe, it, expect } from "vitest";

import { KernelError, makeRng, type Rng } from "../contract.js";
import { effectiveSampleSize } from "../slots/ess.js";

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

/**
 * Independent transcription of the ANOVA ICC with the m0 term switchable, used
 * ONLY to demonstrate the direction and size of the error made by the naive
 * m0 = m̄ substitution. `m0Mode: "corrected"` must agree with the production
 * function; `m0Mode: "naive"` is the wrong estimator we are pinning against.
 */
function referenceEss(
  values: readonly number[],
  ids: readonly (string | number)[],
  m0Mode: "corrected" | "naive",
): number {
  const n = values.length;
  const index = new Map<string | number, number>();
  const sizes: number[] = [];
  const sums: number[] = [];
  const clusterOf: number[] = [];
  let grandSum = 0;
  for (let i = 0; i < n; i += 1) {
    const id = ids[i] as string | number;
    let c = index.get(id);
    if (c === undefined) {
      c = sizes.length;
      index.set(id, c);
      sizes.push(0);
      sums.push(0);
    }
    clusterOf[i] = c;
    sizes[c] = (sizes[c] as number) + 1;
    sums[c] = (sums[c] as number) + (values[i] as number);
    grandSum += values[i] as number;
  }
  const k = sizes.length;
  const mBar = n / k;
  const grandMean = grandSum / n;
  if (k === n) return n;
  if (k === 1) return n / (1 + (mBar - 1));

  const means: number[] = [];
  let ssb = 0;
  let sumSq = 0;
  for (let c = 0; c < k; c += 1) {
    const mean = (sums[c] as number) / (sizes[c] as number);
    means[c] = mean;
    ssb += (sizes[c] as number) * (mean - grandMean) ** 2;
    sumSq += (sizes[c] as number) ** 2;
  }
  let ssw = 0;
  for (let i = 0; i < n; i += 1) {
    ssw += ((values[i] as number) - (means[clusterOf[i] as number] as number)) ** 2;
  }
  const msb = ssb / (k - 1);
  const msw = ssw / (n - k);
  const m0 = m0Mode === "naive" ? mBar : (n - sumSq / n) / (k - 1);
  const den = msb + (m0 - 1) * msw;
  let rho: number;
  if (den > 0) {
    const raw = (msb - msw) / den;
    rho = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  } else if (msw > 0) {
    rho = 0;
  } else {
    rho = 1;
  }
  return n / (1 + (mBar - 1) * rho);
}

/** Deterministic panel with a tunable share of between-cluster variance. */
function randomPanel(rng: Rng): {
  readonly values: number[];
  readonly ids: number[];
  readonly n: number;
  readonly k: number;
} {
  const k = 1 + Math.floor(rng() * 12);
  const between = rng();
  const values: number[] = [];
  const ids: number[] = [];
  for (let c = 0; c < k; c += 1) {
    const size = 1 + Math.floor(rng() * 6);
    const offset = 12 * between * (rng() - 0.5);
    for (let j = 0; j < size; j += 1) {
      values.push(offset + (1 - between) * (rng() - 0.5));
      ids.push(c);
    }
  }
  return { values, ids, n: values.length, k };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hand-computed balanced designs
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — hand-computed balanced designs", () => {
  it("n=4, k=2, clusters [1,3] and [5,7]: MSB=16, MSW=2, m0=2, rho=7/9, ess=2.25", () => {
    // ȳ_A = 2, ȳ_B = 6, ȳ = 4.
    // SSB = 2(2−4)² + 2(6−4)² = 16 ⇒ MSB = 16/(2−1) = 16
    // SSW = 1+1+1+1 = 4        ⇒ MSW = 4/(4−2) = 2
    // m0  = (4 − (4+4)/4)/(2−1) = 2   (balanced ⇒ m0 = common size)
    // rho = (16−2)/(16 + 1·2) = 14/18 = 7/9
    // m̄ = 2 ⇒ ess = 4/(1 + 7/9) = 4/(16/9) = 2.25
    const r = effectiveSampleSize([1, 3, 5, 7], ["A", "A", "B", "B"]);
    expect(r.ess).toBeCloseTo(2.25, 12);
    expect(r.designEffect).toBeCloseTo(16 / 9, 12);
  });

  it("n=6, k=3, clusters [0,2] [4,6] [8,10]: MSB=32, MSW=2, m0=2, rho=15/17, ess=3.1875", () => {
    // means 1, 5, 9; grand mean 5.
    // SSB = 2(16)+2(0)+2(16) = 64 ⇒ MSB = 64/2 = 32
    // SSW = 6                     ⇒ MSW = 6/3 = 2
    // m0  = (6 − 12/6)/2 = 2
    // rho = (32−2)/(32+2) = 30/34 = 15/17
    // ess = 6/(1 + 15/17) = 6·17/32 = 3.1875
    const r = effectiveSampleSize([0, 2, 4, 6, 8, 10], ["A", "A", "B", "B", "C", "C"]);
    expect(r.ess).toBeCloseTo(3.1875, 12);
    expect(r.designEffect).toBeCloseTo(6 / 3.1875, 12);
  });

  it("n=6, k=2, clusters [1,2,3] and [7,8,9]: MSB=54, MSW=1, m0=3, rho=53/56, ess=56/27", () => {
    // means 2, 8; grand mean 5.
    // SSB = 3(9)+3(9) = 54 ⇒ MSB = 54
    // SSW = 2+2 = 4        ⇒ MSW = 4/4 = 1
    // m0  = (6 − 18/6)/1 = 3
    // rho = (54−1)/(54+2·1) = 53/56
    // m̄ = 3 ⇒ ess = 6/(1 + 2·53/56) = 336/162 = 56/27 ≈ 2.0740741
    const r = effectiveSampleSize([1, 2, 3, 7, 8, 9], ["A", "A", "A", "B", "B", "B"]);
    expect(r.ess).toBeCloseTo(56 / 27, 12);
    expect(r.ess).toBeCloseTo(2.074074074074074, 12);
    expect(r.designEffect).toBeCloseTo(81 / 28, 12);
  });

  it("on a balanced design m0 equals the common cluster size, so the naive substitution is a no-op", () => {
    const values = [1, 2, 3, 7, 8, 9, 20, 21, 22];
    const ids = ["a", "a", "a", "b", "b", "b", "c", "c", "c"];
    const corrected = effectiveSampleSize(values, ids).ess;
    expect(corrected).toBeCloseTo(referenceEss(values, ids, "corrected"), 12);
    expect(corrected).toBeCloseTo(referenceEss(values, ids, "naive"), 12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The unbalanced m0 correction — the bias this slot exists to avoid
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — unbalanced m0 correction", () => {
  it("n=5, sizes (3,2): m0 = 2.4, NOT the mean size 2.5 ⇒ ess ≈ 2.0395279", () => {
    // A = [1,2,3], B = [10,12]; means 2 and 11, grand mean 5.6.
    // SSB = 3(3.6)² + 2(5.4)² = 38.88 + 58.32 = 97.2 ⇒ MSB = 97.2
    // SSW = 2 + 2 = 4                                ⇒ MSW = 4/3
    // m0  = (5 − (9+4)/5)/1 = 2.4      (m̄ = 2.5)
    // rho = (97.2 − 4/3)/(97.2 + 1.4·4/3) = 719/743 ≈ 0.9676985
    // ess = 5/(1 + 1.5·719/743) ≈ 2.0395279
    const r = effectiveSampleSize([1, 2, 3, 10, 12], ["A", "A", "A", "B", "B"]);
    expect(r.ess).toBeCloseTo(2.039527861652484, 12);
    expect(r.designEffect).toBeCloseTo(5 / 2.039527861652484, 12);
  });

  it("extreme unbalance, sizes (10,1,1): m0 = 1.75 against m̄ = 4 ⇒ ess = 1856/607 ≈ 3.0576606", () => {
    // X = five 0s and five 2s (mean 1), Y = [7], Z = [13]; n = 12, grand mean 2.5.
    // SSB = 10(1.5)² + (4.5)² + (10.5)² = 22.5 + 20.25 + 110.25 = 153 ⇒ MSB = 76.5
    // SSW = 10                                                       ⇒ MSW = 10/9
    // m0  = (12 − (100+1+1)/12)/2 = (12 − 8.5)/2 = 1.75
    // rho = (76.5 − 10/9)/(76.5 + 0.75·10/9) = 1357/1392 ≈ 0.9748563
    // ess = 12/(1 + 3·1357/1392) = 1856/607 ≈ 3.0576606
    const values = [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 7, 13];
    const ids = ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "y", "z"];
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeCloseTo(1856 / 607, 12);
    expect(r.ess).toBeCloseTo(3.057660626029654, 12);
    expect(r.designEffect).toBeCloseTo(1821 / 464, 12);
  });

  it("the naive m0 = m̄ answer on that panel is 3.1307, materially higher than the correct 3.0577", () => {
    const values = [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 7, 13];
    const ids = ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "y", "z"];
    const correct = effectiveSampleSize(values, ids).ess;
    const naive = referenceEss(values, ids, "naive");
    expect(naive).toBeCloseTo(3.130718954248366, 12);
    // ~2.4% overstatement: the naive estimator claims more independent evidence
    // than the panel carries, which is the direction a sample gate cannot absorb.
    expect(naive - correct).toBeGreaterThan(0.07);
    expect(naive / correct).toBeGreaterThan(1.02);
  });

  it("the naive substitution ALWAYS overstates ess on unbalanced designs (m0 <= m̄)", () => {
    const layouts: readonly (readonly number[])[] = [
      [5, 1],
      [8, 2, 1],
      [10, 3, 3, 1],
      [20, 1, 1, 1, 1],
      [4, 3, 2, 1],
      [7, 6, 2],
    ];
    const rng = makeRng(4477);
    for (const sizes of layouts) {
      const values: number[] = [];
      const ids: number[] = [];
      sizes.forEach((size, c) => {
        const offset = 5 * (rng() - 0.5);
        for (let j = 0; j < size; j += 1) {
          values.push(offset + 0.4 * (rng() - 0.5));
          ids.push(c);
        }
      });
      const correct = effectiveSampleSize(values, ids).ess;
      const naive = referenceEss(values, ids, "naive");
      expect(correct).toBeCloseTo(referenceEss(values, ids, "corrected"), 10);
      expect(naive).toBeGreaterThan(correct);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rho = 0: the clamp, and exactness of ess = n
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — rho clamped to zero", () => {
  it("identical cluster means ⇒ raw ANOVA ICC is negative ⇒ ess === n EXACTLY", () => {
    // Every cluster mean is 0 and all the variance is inside clusters, so
    // MSB = 0 < MSW and the unbiased estimate is strictly negative.
    const values = [1, -1, 1, -1, 1, -1];
    const ids = ["a", "a", "b", "b", "c", "c"];
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBe(6);
    expect(r.designEffect).toBe(1);
  });

  it("a negative raw ICC never lifts ess above n", () => {
    const rng = makeRng(31337);
    for (let trial = 0; trial < 40; trial += 1) {
      const values: number[] = [];
      const ids: number[] = [];
      // No cluster offset at all: any positive ICC estimate here is pure noise.
      for (let c = 0; c < 9; c += 1) {
        for (let j = 0; j < 4; j += 1) {
          values.push(rng() - 0.5);
          ids.push(c);
        }
      }
      const r = effectiveSampleSize(values, ids);
      expect(r.ess).toBeLessThanOrEqual(36);
      expect(r.designEffect).toBeGreaterThanOrEqual(1);
    }
  });

  it("clamping up in rho is clamping DOWN in ess: the clamped answer is exactly n, never more", () => {
    // Huge within-cluster noise, negligible between-cluster signal.
    const values = [100, -100, 0.001, 99.999, -100.001, 0];
    const ids = [7, 7, 8, 8, 9, 9];
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeLessThanOrEqual(6);
    expect(r.designEffect).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rho = 1: perfect within-cluster duplication
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — perfect within-cluster duplication", () => {
  it("balanced duplication (3 clusters of 3, identical inside) ⇒ ess = k = 3", () => {
    // MSW = 0 with MSB > 0 ⇒ rho = MSB/MSB = 1 exactly ⇒ ess = n/m̄ = k.
    const r = effectiveSampleSize(
      [1, 1, 1, 2, 2, 2, 3, 3, 3],
      ["a", "a", "a", "b", "b", "b", "c", "c", "c"],
    );
    expect(r.ess).toBeCloseTo(3, 12);
    expect(r.designEffect).toBeCloseTo(3, 12);
  });

  it("unbalanced duplication (sizes 4,1,2) also collapses to ess = k = 3", () => {
    const r = effectiveSampleSize([5, 5, 5, 5, 9, 2, 2], ["x", "x", "x", "x", "y", "z", "z"]);
    expect(r.ess).toBeCloseTo(3, 12);
    expect(r.designEffect).toBeCloseTo(7 / 3, 12);
  });

  it("a large duplicated cluster next to singletons still yields ess = k", () => {
    const values = [4, 4, 4, 4, 4, 4, 4, 4, -1, 11];
    const ids = ["big", "big", "big", "big", "big", "big", "big", "big", "s1", "s2"];
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeCloseTo(3, 10);
    expect(r.designEffect).toBeCloseTo(10 / 3, 10);
  });

  it("all values identical everywhere (MSB = MSW = 0) ⇒ documented rho = 1 ⇒ ess = k", () => {
    const r = effectiveSampleSize([7, 7, 7, 7], ["a", "a", "b", "b"]);
    expect(r.ess).toBeCloseTo(2, 12);
    expect(r.designEffect).toBeCloseTo(2, 12);
  });

  it("all values identical with unbalanced clusters ⇒ still ess = k", () => {
    const r = effectiveSampleSize([0, 0, 0, 0, 0], ["a", "a", "a", "b", "c"]);
    expect(r.ess).toBeCloseTo(3, 12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Degenerate designs: k = 1 and k = n
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — degenerate designs", () => {
  it("k = 1 (one cluster, MSB has zero df) ⇒ policy rho = 1 ⇒ ess = 1, designEffect = n", () => {
    const r = effectiveSampleSize([1, 2, 3, 4, 5, 6], ["only", "only", "only", "only", "only", "only"]);
    expect(r.ess).toBeCloseTo(1, 12);
    expect(r.designEffect).toBeCloseTo(6, 12);
  });

  it("k = 1 with wildly dispersed values still gives ess = 1 (dispersion is not independence)", () => {
    const r = effectiveSampleSize([-1000, 0, 1000, 5, -3], [42, 42, 42, 42, 42]);
    expect(r.ess).toBeCloseTo(1, 12);
    expect(r.designEffect).toBeCloseTo(5, 12);
  });

  it("k = 1 with identical values also gives ess = 1, not ess = k", () => {
    const r = effectiveSampleSize([7, 7, 7], ["p", "p", "p"]);
    expect(r.ess).toBeCloseTo(1, 12);
  });

  it("k = n (every row its own cluster, MSW has zero df) ⇒ ess === n EXACTLY", () => {
    const values = [3, 1, 4, 1, 5, 9, 2, 6];
    const r = effectiveSampleSize(values, [0, 1, 2, 3, 4, 5, 6, 7]);
    expect(r.ess).toBe(8);
    expect(r.designEffect).toBe(1);
  });

  it("k = n with only two rows ⇒ ess === 2 exactly", () => {
    const r = effectiveSampleSize([10, -10], ["a", "b"]);
    expect(r.ess).toBe(2);
    expect(r.designEffect).toBe(1);
  });

  it("k = n with identical values ⇒ still ess === n (m̄ − 1 = 0 kills any rho)", () => {
    const r = effectiveSampleSize([5, 5, 5], ["a", "b", "c"]);
    expect(r.ess).toBe(3);
  });

  it("n = 1 lies in both degenerate branches and both agree on ess = 1", () => {
    const r = effectiveSampleSize([42], ["p1"]);
    expect(r.ess).toBe(1);
    expect(r.designEffect).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Monotonicity in rho
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — monotone in the intraclass correlation", () => {
  // 5 clusters of 4. Within-cluster pattern is fixed at [-1, -0.5, 0.5, 1]
  // (mean 0, SS = 2.5), cluster offsets are t·[-2,-1,0,1,2]. Growing t raises
  // MSB quadratically while MSW stays put, so rho rises monotonically toward 1.
  function panel(t: number): { values: number[]; ids: number[] } {
    const offsets = [-2, -1, 0, 1, 2];
    const within = [-1, -0.5, 0.5, 1];
    const values: number[] = [];
    const ids: number[] = [];
    for (let c = 0; c < offsets.length; c += 1) {
      for (const w of within) {
        values.push(t * (offsets[c] as number) + w);
        ids.push(c);
      }
    }
    return { values, ids };
  }

  const ts = [0, 0.5, 1, 2, 4, 8, 16, 32];

  it("ess is strictly decreasing as between-cluster separation grows", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const t of ts) {
      const { values, ids } = panel(t);
      const { ess } = effectiveSampleSize(values, ids);
      expect(ess).toBeLessThan(previous);
      previous = ess;
    }
  });

  it("designEffect is strictly increasing over the same sweep", () => {
    let previous = 0;
    for (const t of ts) {
      const { values, ids } = panel(t);
      const { designEffect } = effectiveSampleSize(values, ids);
      expect(designEffect).toBeGreaterThan(previous);
      previous = designEffect;
    }
  });

  it("the sweep stays inside [k, n] = [5, 20] and converges to k from above", () => {
    const first = effectiveSampleSize(panel(0).values, panel(0).ids);
    const last = effectiveSampleSize(panel(32).values, panel(32).ids);
    expect(first.ess).toBe(20);
    expect(last.ess).toBeGreaterThanOrEqual(5);
    expect(last.ess).toBeLessThan(5.01);
  });

  it("t = 0.5 gives MSB = 2.5, MSW = 5/6, m0 = 4, rho = 1/3 and ess = 10 exactly", () => {
    // SSB = 4·(1 + 0.25 + 0 + 0.25 + 1) = 10 ⇒ MSB = 10/4 = 2.5
    // SSW = 5·2.5 = 12.5                     ⇒ MSW = 12.5/15 = 5/6
    // rho = (2.5 − 5/6)/(2.5 + 3·5/6) = (5/3)/5 = 1/3
    // ess = 20/(1 + 3·(1/3)) = 20/2 = 10
    const { values, ids } = panel(0.5);
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeCloseTo(10, 12);
    expect(r.designEffect).toBeCloseTo(2, 12);
  });

  it("t = 1 gives rho = 11/15 and ess = 6.25", () => {
    // MSB = 40/4 = 10, MSW = 5/6, rho = (10 − 5/6)/(10 + 2.5) = (55/6)/12.5 = 11/15
    // ess = 20/(1 + 3·11/15) = 20/3.2 = 6.25
    const { values, ids } = panel(1);
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeCloseTo(6.25, 10);
    expect(r.designEffect).toBeCloseTo(3.2, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — structural invariants", () => {
  const rng = makeRng(9091);
  const values: number[] = [];
  const ids: number[] = [];
  // 40 clusters of 5: a strong cluster offset plus small noise ⇒ real ICC.
  for (let c = 0; c < 40; c += 1) {
    const offset = 10 * (rng() - 0.5);
    for (let j = 0; j < 5; j += 1) {
      values.push(offset + (rng() - 0.5));
      ids.push(c);
    }
  }

  it("designEffect === n / ess exactly, not merely to within rounding", () => {
    for (const [v, c] of [
      [values, ids],
      [[1, 3, 5, 7], ["A", "A", "B", "B"]],
      [[1, 2, 3, 10, 12], ["A", "A", "A", "B", "B"]],
      [[0, 0, 0], ["z", "z", "z"]],
    ] as readonly [readonly number[], readonly (string | number)[]][]) {
      const r = effectiveSampleSize(v, c);
      expect(r.designEffect).toBe(v.length / r.ess);
    }
  });

  it("designEffect is never below 1", () => {
    expect(effectiveSampleSize(values, ids).designEffect).toBeGreaterThanOrEqual(1);
  });

  it("strong clustering makes 200 nominal rows worth far fewer independent ones", () => {
    const r = effectiveSampleSize(values, ids);
    expect(r.ess).toBeLessThan(70);
    expect(r.ess).toBeGreaterThanOrEqual(40 - 1e-9);
    expect(r.designEffect).toBeGreaterThan(3);
  });

  it("is invariant to affine rescaling of the values (the ICC is scale-free)", () => {
    const base = effectiveSampleSize(values, ids);
    const scaled = effectiveSampleSize(values.map((v) => 3.5 * v + 17), ids);
    expect(scaled.ess).toBeCloseTo(base.ess, 9);
  });

  it("is invariant to a sign flip of the values", () => {
    const base = effectiveSampleSize(values, ids);
    const flipped = effectiveSampleSize(values.map((v) => -v), ids);
    expect(flipped.ess).toBeCloseTo(base.ess, 9);
  });

  it("is invariant to the order the rows arrive in", () => {
    const shuffleRng = makeRng(555);
    const order = values.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(shuffleRng() * (i + 1));
      const tmp = order[i] as number;
      order[i] = order[j] as number;
      order[j] = tmp;
    }
    const shuffled = effectiveSampleSize(
      order.map((i) => values[i] as number),
      order.map((i) => ids[i] as number),
    );
    expect(shuffled.ess).toBeCloseTo(effectiveSampleSize(values, ids).ess, 9);
  });

  it("is invariant to relabelling numeric cluster ids as strings", () => {
    const base = effectiveSampleSize(values, ids);
    const relabelled = effectiveSampleSize(values, ids.map((c) => `cluster-${c}`));
    expect(relabelled.ess).toBeCloseTo(base.ess, 12);
  });

  it("accepts mixed string and number cluster ids in one call", () => {
    const r = effectiveSampleSize([1, 1, 5, 5, 9, 9], ["a", "a", 2, 2, "c", "c"]);
    // Identical inside each cluster, distinct across ⇒ rho = 1 ⇒ ess = k = 3.
    expect(r.ess).toBeCloseTo(3, 12);
  });

  it("does not confuse the number 1 with the string \"1\"", () => {
    // Two clusters, not one.
    const distinct = effectiveSampleSize([0, 0, 5, 5], [1, 1, "1", "1"]);
    expect(distinct.ess).toBeCloseTo(2, 12);
    // Collapsed into a single cluster the k = 1 policy would instead give 1.
    const collapsed = effectiveSampleSize([0, 0, 5, 5], [1, 1, 1, 1]);
    expect(collapsed.ess).toBeCloseTo(1, 12);
  });

  it("treats -0 and 0 as the same cluster id", () => {
    const r = effectiveSampleSize([1, 2, 3, 4], [0, -0, 0, -0]);
    // One cluster ⇒ k = 1 policy ⇒ ess = 1.
    expect(r.ess).toBeCloseTo(1, 12);
    expect(r.designEffect).toBeCloseTo(4, 12);
  });

  it("does not mutate its inputs", () => {
    const v = [1, 3, 5, 7];
    const c: (string | number)[] = ["A", "A", "B", "B"];
    const vCopy = v.slice();
    const cCopy = c.slice();
    effectiveSampleSize(v, c);
    expect(v).toEqual(vCopy);
    expect(c).toEqual(cCopy);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Randomized range sweep — seeded, no Math.random
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — randomized (0, n] range invariant", () => {
  it("holds ess in (0, n] with the upper bound bit-exact across 500 seeded panels", () => {
    const rng = makeRng(20260825);
    for (let trial = 0; trial < 500; trial += 1) {
      const { values, ids, n } = randomPanel(rng);
      const r = effectiveSampleSize(values, ids);
      expect(Number.isFinite(r.ess)).toBe(true);
      expect(r.ess).toBeGreaterThan(0);
      expect(r.ess).toBeLessThanOrEqual(n);
    }
  });

  it("holds ess >= k across the same seeded sweep", () => {
    const rng = makeRng(20260825);
    for (let trial = 0; trial < 500; trial += 1) {
      const { values, ids, k } = randomPanel(rng);
      const r = effectiveSampleSize(values, ids);
      // k = 1 is the documented exception: the single-cluster policy returns 1,
      // which is below k only when k = 1, where they coincide.
      expect(r.ess).toBeGreaterThanOrEqual(k - 1e-9);
    }
  });

  it("holds designEffect === n / ess and designEffect >= 1 across the sweep", () => {
    const rng = makeRng(777001);
    for (let trial = 0; trial < 500; trial += 1) {
      const { values, ids, n } = randomPanel(rng);
      const r = effectiveSampleSize(values, ids);
      expect(r.designEffect).toBe(n / r.ess);
      expect(r.designEffect).toBeGreaterThanOrEqual(1);
    }
  });

  it("agrees with an independent transcription of the estimator across the sweep", () => {
    const rng = makeRng(864213);
    for (let trial = 0; trial < 300; trial += 1) {
      const { values, ids } = randomPanel(rng);
      expect(effectiveSampleSize(values, ids).ess).toBeCloseTo(
        referenceEss(values, ids, "corrected"),
        9,
      );
    }
  });

  it("never returns NaN on integer-valued panels with heavy ties", () => {
    const rng = makeRng(13579);
    for (let trial = 0; trial < 200; trial += 1) {
      const values: number[] = [];
      const ids: number[] = [];
      const k = 1 + Math.floor(rng() * 5);
      for (let c = 0; c < k; c += 1) {
        const size = 1 + Math.floor(rng() * 4);
        const level = Math.floor(rng() * 3);
        for (let j = 0; j < size; j += 1) {
          values.push(level);
          ids.push(c);
        }
      }
      const r = effectiveSampleSize(values, ids);
      expect(Number.isNaN(r.ess)).toBe(false);
      expect(Number.isNaN(r.designEffect)).toBe(false);
      expect(r.ess).toBeGreaterThan(0);
      expect(r.ess).toBeLessThanOrEqual(values.length);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fail closed
// ─────────────────────────────────────────────────────────────────────────────

describe("effectiveSampleSize — fail closed", () => {
  it("throws MISMATCHED_LENGTH when values is longer than clusterIds", () => {
    expectKernelError(() => effectiveSampleSize([1, 2, 3], ["a", "b"]), "MISMATCHED_LENGTH");
  });

  it("throws MISMATCHED_LENGTH when clusterIds is longer than values", () => {
    expectKernelError(() => effectiveSampleSize([1], ["a", "b"]), "MISMATCHED_LENGTH");
  });

  it("throws MISMATCHED_LENGTH before EMPTY when only one side is empty", () => {
    expectKernelError(() => effectiveSampleSize([], ["a"]), "MISMATCHED_LENGTH");
  });

  it("throws EMPTY for no observations at all", () => {
    expectKernelError(() => effectiveSampleSize([], []), "EMPTY");
  });

  it("throws NOT_FINITE for a NaN value", () => {
    expectKernelError(() => effectiveSampleSize([1, Number.NaN], ["a", "b"]), "NOT_FINITE");
  });

  it("throws NOT_FINITE for an infinite value", () => {
    expectKernelError(
      () => effectiveSampleSize([1, Number.POSITIVE_INFINITY], ["a", "b"]),
      "NOT_FINITE",
    );
    expectKernelError(
      () => effectiveSampleSize([Number.NEGATIVE_INFINITY, 1], ["a", "b"]),
      "NOT_FINITE",
    );
  });

  it("throws NOT_FINITE for a NaN numeric cluster id rather than merging every unknown row", () => {
    expectKernelError(() => effectiveSampleSize([1, 2], [1, Number.NaN]), "NOT_FINITE");
    expectKernelError(
      () => effectiveSampleSize([1, 2, 3], [Number.NaN, Number.NaN, Number.NaN]),
      "NOT_FINITE",
    );
  });

  it("throws NOT_FINITE for an infinite numeric cluster id", () => {
    expectKernelError(
      () => effectiveSampleSize([1, 2], [1, Number.POSITIVE_INFINITY]),
      "NOT_FINITE",
    );
  });

  it("reports the offending index in the error message", () => {
    let caught: unknown;
    try {
      effectiveSampleSize([1, 2, Number.NaN], ["a", "b", "c"]);
    } catch (e) {
      caught = e;
    }
    expect((caught as KernelError).message).toContain("values[2]");
  });

  it("accepts the empty string as a legitimate cluster id", () => {
    const r = effectiveSampleSize([1, 1, 4, 4], ["", "", "b", "b"]);
    expect(r.ess).toBeCloseTo(2, 12);
  });
});
