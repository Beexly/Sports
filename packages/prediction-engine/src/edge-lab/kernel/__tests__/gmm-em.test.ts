import { describe, it, expect } from "vitest";
import {
  fitDiagonalGmm,
  gmmLogDensity,
  gmmPosteriors,
  gmmHardLabels,
  logSumExp,
  zScoreFit,
  zScoreApply,
  selectKByLowoAri,
  featureInfluence,
  labelClustersByCushionRule,
  adjustedRandIndex,
} from "../gmm-em.js";
import { mulberry32 } from "../../rng.js";

/** Seeded standard-normal via Box-Muller (deterministic; no Math.random). */
function makeGauss(seed: number): () => number {
  const rng = mulberry32(seed);
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

/** Two 6-d diagonal Gaussians (the port's defense-week feature count), well separated on dims 0 and 3. */
function twoClusterFixture(seed: number, nPer = 200): { data: number[][]; truth: number[] } {
  const gauss = makeGauss(seed);
  const data: number[][] = [];
  const truth: number[] = [];
  const means = [
    [0, 0, 0, 0, 0, 0],
    [4, 0, 0, 4, 0, 0],
  ];
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < nPer; i++) {
      data.push(means[g]!.map((m) => m + gauss()));
      truth.push(g);
    }
  }
  return { data, truth };
}

/** Best-matching accuracy under label switching: use ARI against truth instead of raw labels. */

describe("logSumExp", () => {
  it("matches the hand-computed stable value where linear space would underflow", () => {
    // logSumExp([-1000, -1001]) = -1000 + log(1 + e^-1)
    expect(logSumExp([-1000, -1001])).toBeCloseTo(-1000 + Math.log(1 + Math.exp(-1)), 12);
    expect(Number.isFinite(logSumExp([-1000, -1001]))).toBe(true);
  });

  it("throws on empty input", () => {
    expect(() => logSumExp([])).toThrow(RangeError);
  });
});

describe("adjustedRandIndex — hand-computed exact values", () => {
  it("identical partitions give exactly 1", () => {
    expect(adjustedRandIndex([0, 0, 1, 1], [0, 0, 1, 1])).toBe(1);
  });

  it("maximally crossed 2x2 partitions give exactly -0.5", () => {
    // Contingency all-ones: index 0, expected (2*2)/6, max 2 => (0 - 2/3)/(2 - 2/3) = -0.5
    expect(adjustedRandIndex([0, 0, 1, 1], [0, 1, 0, 1])).toBeCloseTo(-0.5, 12);
  });

  it("one side all-one-cluster gives exactly 0", () => {
    expect(adjustedRandIndex([0, 0, 1, 1], [0, 0, 0, 0])).toBeCloseTo(0, 12);
  });

  it("is invariant to label permutation (label-switching property)", () => {
    const a = [0, 0, 1, 1, 2, 2];
    const b = [2, 2, 0, 0, 1, 1]; // same partition, relabeled
    expect(adjustedRandIndex(a, b)).toBe(1);
  });

  it("degenerate both-single-cluster returns 1 by convention", () => {
    expect(adjustedRandIndex([0, 0, 0], [5, 5, 5])).toBe(1);
  });

  it("throws on mismatch or empty", () => {
    expect(() => adjustedRandIndex([0], [0, 1])).toThrow(RangeError);
    expect(() => adjustedRandIndex([], [])).toThrow(RangeError);
  });
});

describe("fitDiagonalGmm — closed-form and synthetic recovery", () => {
  it("k=1 recovers the sample mean and population variance in closed form", () => {
    const fit = fitDiagonalGmm([[1], [2], [3]], 1, { seed: 7 });
    expect(fit.weights[0]!).toBeCloseTo(1, 12);
    expect(fit.means[0]![0]!).toBeCloseTo(2, 8);
    expect(fit.variances[0]![0]!).toBeCloseTo(2 / 3, 6);
    expect(fit.converged).toBe(true);
  });

  it("recovers two well-separated 6-d components (weights, means, variances) from seeded synthetic data", () => {
    const { data, truth } = twoClusterFixture(42);
    const fit = fitDiagonalGmm(data, 2, { seed: 1 });
    expect(fit.converged).toBe(true);
    // Weights ~0.5 each.
    for (const w of fit.weights) expect(w).toBeGreaterThan(0.45);
    // Means recovered within 0.15 sd on the separating dims (order-free check).
    const bySep = [...fit.means].sort((a, b) => a[0]! - b[0]!);
    expect(bySep[0]![0]!).toBeCloseTo(0, 0);
    expect(bySep[1]![0]!).toBeCloseTo(4, 0);
    expect(Math.abs(bySep[0]![0]! - 0)).toBeLessThan(0.15);
    expect(Math.abs(bySep[1]![0]! - 4)).toBeLessThan(0.15);
    // Variances ~1 within 30%.
    for (const vs of fit.variances) for (const v of vs) expect(Math.abs(v - 1)).toBeLessThan(0.3);
    // Hard labels agree with ground truth almost perfectly (label-switching-safe via ARI).
    expect(adjustedRandIndex(gmmHardLabels(fit, data), truth)).toBeGreaterThan(0.95);
    // Mean posterior of own component > 0.95.
    let postSum = 0;
    for (let i = 0; i < data.length; i++) {
      const p = gmmPosteriors(fit, data[i]!);
      postSum += Math.max(...p);
    }
    expect(postSum / data.length).toBeGreaterThan(0.95);
  });

  it("is deterministic: the same seed yields a deeply-equal model", () => {
    const { data } = twoClusterFixture(9);
    const a = fitDiagonalGmm(data, 2, { seed: 33 });
    const b = fitDiagonalGmm(data, 2, { seed: 33 });
    expect(a).toEqual(b);
  });

  it("floors the variance of a component seeded on identical repeated points — never NaN/Infinity", () => {
    const data = [
      [0, 0],
      [0, 0],
      [0, 0],
      [5, 5],
      [5, 5],
      [5, 5],
    ];
    const fit = fitDiagonalGmm(data, 2, { seed: 3 });
    for (const vs of fit.variances) {
      for (const v of vs) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1e-6);
      }
    }
    expect(Number.isFinite(fit.logLikelihood)).toBe(true);
  });

  it("stays finite in log space on a scale where linear-space density products underflow", () => {
    const { data } = twoClusterFixture(5, 100);
    const scaled = data.map((row) => row.map((v) => v * 1e3));
    const fit = fitDiagonalGmm(scaled, 2, { seed: 11 });
    expect(Number.isFinite(fit.logLikelihood)).toBe(true);
    for (const x of scaled.slice(0, 10)) {
      const p = gmmPosteriors(fit, x);
      expect(p.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 8);
      for (const v of p) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("throws on empty data, ragged rows, k=0, k>n, and non-finite values", () => {
    expect(() => fitDiagonalGmm([], 1, { seed: 1 })).toThrow(RangeError);
    expect(() => fitDiagonalGmm([[1, 2], [3]], 1, { seed: 1 })).toThrow(RangeError);
    expect(() => fitDiagonalGmm([[1]], 0, { seed: 1 })).toThrow(RangeError);
    expect(() => fitDiagonalGmm([[1]], 2, { seed: 1 })).toThrow(RangeError);
    expect(() => fitDiagonalGmm([[NaN]], 1, { seed: 1 })).toThrow(RangeError);
  });
});

describe("gmmPosteriors — hand-built model", () => {
  it("matches the closed-form posterior for a 2-component 1-d model", () => {
    const model = {
      k: 2,
      dim: 1,
      weights: [0.5, 0.5],
      means: [[0], [10]],
      variances: [[1], [1]],
      logLikelihood: 0,
      iterations: 1,
      converged: true,
    };
    // At x=0: log-odds toward component 0 = ( -0 ) - ( -50 ) = 50 => p0 = 1/(1+e^-50) ~ 1
    const p0 = gmmPosteriors(model, [0]);
    expect(p0[0]!).toBeCloseTo(1 / (1 + Math.exp(-50)), 12);
    // At x=5 (equidistant): exactly [0.5, 0.5]
    const pMid = gmmPosteriors(model, [5]);
    expect(pMid[0]!).toBeCloseTo(0.5, 12);
    expect(pMid[1]!).toBeCloseTo(0.5, 12);
    // Density sanity at the midpoint: mixture log-density is finite and symmetric.
    expect(Number.isFinite(gmmLogDensity(model, [5]))).toBe(true);
  });
});

describe("zScoreFit / zScoreApply", () => {
  it("computes train-only stats and standardizes exactly", () => {
    const stats = zScoreFit([
      [0, 10],
      [2, 10],
    ]);
    expect(stats.mean).toEqual([1, 10]);
    expect(stats.sd[0]!).toBeCloseTo(1, 12);
    expect(stats.sd[1]!).toBe(1); // zero-variance dim gets sd 1
    expect(zScoreApply(stats, [3, 12])).toEqual([2, 2]);
  });

  it("throws on empty train or dimension mismatch", () => {
    expect(() => zScoreFit([])).toThrow(RangeError);
    expect(() => zScoreApply({ mean: [0], sd: [1] }, [1, 2])).toThrow(RangeError);
  });
});

describe("selectKByLowoAri — the paper's stability selection with the typed kill", () => {
  it("selects k=2 with high stability when every week draws from one 2-component mixture", () => {
    const weeks: number[][][] = [];
    for (let w = 0; w < 6; w++) {
      weeks.push(twoClusterFixture(100 + w, 40).data);
    }
    const sel = selectKByLowoAri(weeks, [2, 3], { seed: 5, restarts: 4 });
    expect(sel.outcome).toBe("selected");
    if (sel.outcome === "selected") {
      expect(sel.k).toBe(2);
      expect(sel.meanAriByK.get(2)!).toBeGreaterThan(0.9);
    }
  });

  it("returns the typed 'unstable' kill when the data is a single iid Gaussian (no K is stable)", () => {
    const gauss = makeGauss(77);
    const weeks: number[][][] = [];
    for (let w = 0; w < 6; w++) {
      const wk: number[][] = [];
      for (let i = 0; i < 40; i++) wk.push([gauss(), gauss(), gauss(), gauss(), gauss(), gauss()]);
      weeks.push(wk);
    }
    const sel = selectKByLowoAri(weeks, [2, 3, 4], { seed: 5, restarts: 4, minStableAri: 0.7 });
    expect(sel.outcome).toBe("unstable");
    for (const [, ari] of sel.meanAriByK) {
      expect(Number.isFinite(ari) ? ari < 0.7 : true).toBe(true);
    }
  });

  it("throws on fewer than 2 weeks or empty candidate list", () => {
    expect(() => selectKByLowoAri([twoClusterFixture(1, 10).data], [2], { seed: 1 })).toThrow(RangeError);
    expect(() => selectKByLowoAri([twoClusterFixture(1, 10).data, twoClusterFixture(2, 10).data], [], { seed: 1 })).toThrow(RangeError);
  });
});

describe("featureInfluence", () => {
  it("scores a pure-noise dimension near zero and a separating dimension materially positive", () => {
    const gauss = makeGauss(500);
    const weeks: number[][][] = [];
    for (let w = 0; w < 5; w++) {
      const wk: number[][] = [];
      for (let g = 0; g < 2; g++) {
        for (let i = 0; i < 30; i++) {
          // dim 0 separates (0 vs 6); dim 1 is pure noise.
          wk.push([g * 6 + gauss() * 0.5, gauss()]);
        }
      }
      weeks.push(wk);
    }
    const influence = featureInfluence(weeks, 2, { seed: 9, restarts: 4 });
    // Dropping the separating dim destroys stability; dropping noise does not.
    expect(influence[0]!).toBeGreaterThan(0.25);
    expect(Math.abs(influence[1]!)).toBeLessThan(0.15);
  });
});

describe("labelClustersByCushionRule — the polarity gate (CodeRabbit finding, mechanically encoded)", () => {
  const model = {
    k: 2,
    dim: 3,
    weights: [0.5, 0.5],
    means: [
      [5.0, 0, 0], // higher cushion
      [2.5, 0, 0], // lower cushion — MAN candidate under the pre-registered rule
    ],
    variances: [
      [1, 1, 1],
      [1, 1, 1],
    ],
    logLikelihood: 0,
    iterations: 1,
    converged: true,
  };

  it("returns anonymous with null validation, even on clearly separated cushion means", () => {
    expect(labelClustersByCushionRule(model, 0, null)).toEqual({ kind: "anonymous" });
  });

  it("returns anonymous with a failed validation", () => {
    expect(labelClustersByCushionRule(model, 0, { passed: false })).toEqual({ kind: "anonymous" });
  });

  it("names the lower-cushion-mean cluster MAN only after a passed validation", () => {
    expect(labelClustersByCushionRule(model, 0, { passed: true })).toEqual({ kind: "man_zone", manCluster: 1 });
  });

  it("throws on an out-of-range cushion feature index", () => {
    expect(() => labelClustersByCushionRule(model, 3, { passed: true })).toThrow(RangeError);
    expect(() => labelClustersByCushionRule(model, -1, { passed: true })).toThrow(RangeError);
  });
});
