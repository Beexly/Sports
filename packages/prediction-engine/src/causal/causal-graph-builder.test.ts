import { describe, it, expect } from "vitest";

// The PRNG is shared, not copied: a PRNG duplicated across test files is one that will
// drift, and two files that were supposed to measure the same data would quietly measure
// different data.
import { mulberry32 } from "./__tests__/test-prng.js";
// The panel DGP is shared for the same reason -- see ./__tests__/panel-fixtures.ts.
import { simPanel, scaleColumns } from "./__tests__/panel-fixtures.js";
import {
  laggedDynotearsFit,
  laggedSmoothObjective,
  laggedSmoothGradient,
  buildLaggedDesign,
  isAcyclicSupport,
  thresholdedSupport,
} from "./causal-graph-builder.js";
import type { LaggedEdge, LaggedDynotearsResult } from "./causal-graph-builder.js";

// ---------------------------------------------------------------------------
// Deterministic data generators
// ---------------------------------------------------------------------------

function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * The panel DGP (`simPanel`) and the column scaler (`scaleColumns`) now live in
 * ./__tests__/panel-fixtures.js, so that the mutation spec's T11c gate and this file measure
 * the SAME panel. See that file for why a duplicated generator is a liability.
 */

/** The contemporaneous edge set as sorted strings, for order-insensitive comparison. */
function edgeKeys(result: LaggedDynotearsResult): string[] {
  return result.contemporaneousEdges.map(([from, to]) => `${from}->${to}`).sort();
}

/** The lagged edge set as sorted strings, for order-insensitive comparison. */
function laggedKeys(result: LaggedDynotearsResult): string[] {
  return result.laggedEdges.map((e: LaggedEdge) => `${e.lag}:${e.from}->${e.to}`).sort();
}

/** True when the directed edge set contains a cycle. */
function hasDirectedCycle(edges: readonly [number, number][]): boolean {
  const adjacency = new Map<number, number[]>();
  for (const [from, to] of edges) {
    const list = adjacency.get(from) ?? [];
    list.push(to);
    adjacency.set(from, list);
  }
  const state = new Map<number, number>();
  const visit = (v: number): boolean => {
    state.set(v, 1);
    for (const to of adjacency.get(v) ?? []) {
      const s = state.get(to) ?? 0;
      if (s === 1) return true;
      if (s === 0 && visit(to)) return true;
    }
    state.set(v, 2);
    return false;
  };
  for (const v of adjacency.keys()) {
    if ((state.get(v) ?? 0) === 0 && visit(v)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 1. GRADIENT CORRECTNESS -- the gate on the whole module
// ---------------------------------------------------------------------------

describe("laggedDynotearsFit: the exported gradient is the gradient of the exported objective", () => {
  it("matches a central finite difference entry by entry, for W_0 and for A", () => {
    const frames = simPanel(12, 9, 4242);
    const design = buildLaggedDesign(frames, 1);
    const rand = mulberry32(31337);
    const d = design.d;
    const pd = design.p * d;
    // A small, well-conditioned random point: I - W_0 must be comfortably invertible or the
    // objective is not differentiable there and the comparison is meaningless.
    const W0 = Array.from({ length: d }, () =>
      Array.from({ length: d }, () => (rand() - 0.5) * 0.4),
    );
    const A = Array.from({ length: pd }, () =>
      Array.from({ length: d }, () => (rand() - 0.5) * 0.4),
    );
    const opts = { rho: 1.7, alpha: 0.9 };
    const analytic = laggedSmoothGradient(design, W0, A, opts);
    expect(analytic).not.toBeNull();
    const grad = analytic!;

    const eps = 1e-5;
    const relTol = 1e-4;
    const compare = (fd: number, an: number, label: string): void => {
      const scale = Math.max(1, Math.abs(an), Math.abs(fd));
      expect(Math.abs(fd - an) / scale, `${label}: fd=${fd} analytic=${an}`).toBeLessThan(relTol);
    };

    for (let k = 0; k < d; k++) {
      for (let j = 0; j < d; j++) {
        const up = W0.map((row) => row.slice());
        up[k]![j]! += eps;
        const down = W0.map((row) => row.slice());
        down[k]![j]! -= eps;
        const fd =
          (laggedSmoothObjective(design, up, A, opts) -
            laggedSmoothObjective(design, down, A, opts)) /
          (2 * eps);
        compare(fd, grad.gradW0[k]![j]!, `d/dW0[${k}][${j}]`);
      }
    }

    for (let m = 0; m < pd; m++) {
      for (let j = 0; j < d; j++) {
        const up = A.map((row) => row.slice());
        up[m]![j]! += eps;
        const down = A.map((row) => row.slice());
        down[m]![j]! -= eps;
        const fd =
          (laggedSmoothObjective(design, W0, up, opts) -
            laggedSmoothObjective(design, W0, down, opts)) /
          (2 * eps);
        compare(fd, grad.gradA[m]![j]!, `d/dA[${m}][${j}]`);
      }
    }
  });

  it("reports the gradient of the smooth objective at the parameters it returns", () => {
    // The returned gradW0/gradA must be the gradient AT the returned point, not at some
    // earlier iterate. A stale gradient is the classic way a fit "converges" to a value it
    // never had.
    const frames = simPanel(20, 12, 777);
    const result = laggedDynotearsFit(frames, { lags: 1, lambdaW: 0.02, lambdaA: 0.02 });
    const analytic = laggedSmoothGradient(
      result.design,
      result.W0standardized,
      result.Astandardized,
      { rho: result.rho, alpha: result.alpha },
    );
    expect(analytic).not.toBeNull();
    for (let k = 0; k < result.W0standardized.length; k++) {
      for (let j = 0; j < result.W0standardized.length; j++) {
        expect(result.gradW0[k]![j]!).toBeCloseTo(analytic!.gradW0[k]![j]!, 10);
      }
    }
    for (let m = 0; m < result.Astandardized.length; m++) {
      for (let j = 0; j < result.Astandardized.length; j++) {
        expect(result.gradA[m]![j]!).toBeCloseTo(analytic!.gradA[m]![j]!, 10);
      }
    }
  });

  it("reports the original-unit gradient consistently with the unit rescaling", () => {
    // The original-unit gradient must be the standardised one pushed through the SAME map
    // that produces the original-unit matrices. A finite difference through that map checks
    // it end to end, not just the arithmetic.
    const frames = simPanel(20, 12, 313);
    const result = laggedDynotearsFit(frames, { lags: 1, lambdaW: 0.02, lambdaA: 0.02 });
    const sd = result.design.sd;
    const d = result.W0standardized.length;
    const pd = result.Astandardized.length;

    // The map under test, original -> standardised. The forward map is
    // W0_orig[k][j] = W0_std[k][j] * sd_j / sd_k, so the inverse is
    // W0_std[k][j] = W0_orig[k][j] * sd_k / sd_j.
    const toStd = (W0o: number[][], Ao: number[][]): [number[][], number[][]] => [
      W0o.map((row, k) => row.map((v, j) => (v * sd[k]!) / sd[j]!)),
      Ao.map((row, m) => row.map((v, j) => (v * sd[m % d]!) / sd[j]!)),
    ];

    const eps = 1e-6;
    const opts = { rho: result.rho, alpha: result.alpha };
    for (let k = 0; k < d; k++) {
      for (let j = 0; j < d; j++) {
        const up = result.W0.map((row) => row.slice());
        up[k]![j]! += eps;
        const down = result.W0.map((row) => row.slice());
        down[k]![j]! -= eps;
        const [Wu] = toStd(up, result.A);
        const [Wd] = toStd(down, result.A);
        const fd =
          (laggedSmoothObjective(result.design, Wu, result.Astandardized, opts) -
            laggedSmoothObjective(result.design, Wd, result.Astandardized, opts)) /
          (2 * eps);
        const an = result.gradW0original[k]![j]!;
        expect(Math.abs(fd - an) / Math.max(1, Math.abs(an))).toBeLessThan(1e-4);
      }
    }
    for (let m = 0; m < pd; m++) {
      for (let j = 0; j < d; j++) {
        const up = result.A.map((row) => row.slice());
        up[m]![j]! += eps;
        const down = result.A.map((row) => row.slice());
        down[m]![j]! -= eps;
        const [, Au] = toStd(result.W0, up);
        const [, Ad] = toStd(result.W0, down);
        const fd =
          (laggedSmoothObjective(result.design, result.W0standardized, Au, opts) -
            laggedSmoothObjective(result.design, result.W0standardized, Ad, opts)) /
          (2 * eps);
        const an = result.gradAoriginal[m]![j]!;
        expect(Math.abs(fd - an) / Math.max(1, Math.abs(an))).toBeLessThan(1e-4);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. SCALE INVARIANCE -- the property the module exists for
// ---------------------------------------------------------------------------

describe("laggedDynotearsFit: scale invariance", () => {
  it("recovers the true edges and returns the SAME edge sets when two features are scaled 1,000x", () => {
    const frames = simPanel(60, 30, 11);
    const fitOpts = { lags: 1, lambdaW: 0.05, lambdaA: 0.05, edgeThreshold: 0.1 };

    const base = laggedDynotearsFit(frames, fitOpts);
    const scaled = laggedDynotearsFit(scaleColumns(frames, [0, 2], 1000), fitOpts);

    // The fit is NOT vacuous: the true contemporaneous edges and the true lagged edge are
    // recovered. Without this, two empty edge sets would satisfy the equality below.
    expect(edgeKeys(base)).toContain("0->1");
    expect(edgeKeys(base)).toContain("2->1");
    expect(laggedKeys(base)).toContain("1:1->3");
    expect(edgeKeys(base).length).toBeGreaterThan(0);
    expect(laggedKeys(base).length).toBeGreaterThan(0);

    // The direction of each contemporaneous edge is the one the DGP generated.
    expect(edgeKeys(base)).toEqual(expect.arrayContaining(["0->1", "2->1"]));
    // ... and the reverse directions are absent.
    expect(edgeKeys(base)).not.toContain("1->0");
    expect(edgeKeys(base)).not.toContain("1->2");

    // THE GATE: scaling two features by 1,000x must not move a single edge.
    expect(edgeKeys(scaled)).toEqual(edgeKeys(base));
    expect(laggedKeys(scaled)).toEqual(laggedKeys(base));
  });

  it("is invariant for every feature subset scaled, not just one", () => {
    const frames = simPanel(40, 24, 99);
    const fitOpts = { lags: 1, lambdaW: 0.05, lambdaA: 0.05, edgeThreshold: 0.1 };
    const base = laggedDynotearsFit(frames, fitOpts);
    for (const cols of [[0], [1], [2], [3], [0, 1], [0, 2], [1, 3], [0, 1, 2, 3]]) {
      const scaled = laggedDynotearsFit(scaleColumns(frames, cols, 1000), fitOpts);
      expect(edgeKeys(scaled), `columns ${cols.join(",")}`).toEqual(edgeKeys(base));
      expect(laggedKeys(scaled), `columns ${cols.join(",")}`).toEqual(laggedKeys(base));
    }
  });
});

// ---------------------------------------------------------------------------
// 3. LAGGED RECOVERY -- the right direction, from the right time slice
// ---------------------------------------------------------------------------

describe("laggedDynotearsFit: lagged recovery", () => {
  it("recovers the contemporaneous edge and the lag-1 edge in the right direction", () => {
    const frames = simPanel(60, 30, 23);
    const result = laggedDynotearsFit(frames, {
      lags: 1,
      lambdaW: 0.05,
      lambdaA: 0.05,
      edgeThreshold: 0.1,
    });

    // Contemporaneous: 0 -> 1 and 2 -> 1 (a collider), with the right orientation.
    expect(edgeKeys(result)).toContain("0->1");
    expect(edgeKeys(result)).toContain("2->1");
    expect(edgeKeys(result)).not.toContain("1->0");
    expect(edgeKeys(result)).not.toContain("1->2");

    // Lagged: 1 at t-1 drives 3 at t. The direction is past -> present.
    expect(laggedKeys(result)).toContain("1:1->3");
    expect(laggedKeys(result)).not.toContain("1:3->1");

    // The time slice alignment: the lag-1 block of A is the FIRST block, so the effect of
    // feature 1 at t-1 on feature 3 at t is A[0 * d + 1][3] -- row 1, column 3.
    const d = 4;
    expect(result.Astandardized[1]![3]!).toBeGreaterThan(0.1);
    // And the same cell in the ORIGINAL units is the one that carries the effect.
    expect(result.A[1]![3]!).toBeGreaterThan(0);
  });

  it("attributes a two-lag effect to lag 2 and not to lag 1", () => {
    // x3(t) depends on x1(t-2), not x1(t-1). A mis-aligned lag block would report this at
    // lag 1, so the lag index is checked directly.
    const rand = mulberry32(2024);
    const n = 60;
    const T = 30;
    const frames: number[][][] = [];
    for (let t = 0; t < T; t++) {
      const cur: number[][] = [];
      for (let i = 0; i < n; i++) {
        const x0 = randn(rand);
        const x2 = randn(rand);
        const x1 = 0.9 * x0 + 0.8 * x2 + randn(rand);
        // x3 at time t is driven by x1 at time t-2.
        const x3 = t >= 2 ? 0.9 * frames[t - 2]![i]![1]! + randn(rand) : randn(rand);
        cur.push([x0, x1, x2, x3]);
      }
      frames.push(cur);
    }
    const result = laggedDynotearsFit(frames, {
      lags: 2,
      lambdaW: 0.05,
      lambdaA: 0.05,
      edgeThreshold: 0.1,
    });
    // The effect lives in the SECOND lag block: row (2-1)*d + 1 = 5 for d = 4.
    expect(result.Astandardized[5]![3]!).toBeGreaterThan(0.1);
    // And NOT in the first lag block (row 0*d + 1 = 1).
    expect(result.Astandardized[1]![3]!).toBeLessThan(0.1);
  });
});

// ---------------------------------------------------------------------------
// 4. VALIDATION -- every rejection the spec lists
// ---------------------------------------------------------------------------

describe("laggedDynotearsFit: validation", () => {
  const good = simPanel(8, 6, 5);

  it("rejects a non-positive or non-finite lambda", () => {
    expect(() => laggedDynotearsFit(good, { lambdaW: -0.1 })).toThrow();
    expect(() => laggedDynotearsFit(good, { lambdaA: -0.1 })).toThrow();
    expect(() => laggedDynotearsFit(good, { lambdaW: Number.NaN })).toThrow();
    expect(() => laggedDynotearsFit(good, { lambdaA: Number.POSITIVE_INFINITY })).toThrow();
  });

  it("rejects a negative or non-finite rho, alpha, tol or edgeThreshold", () => {
    expect(() => laggedDynotearsFit(good, { rho: -1 })).toThrow();
    expect(() => laggedDynotearsFit(good, { alpha: -1 })).toThrow();
    expect(() => laggedDynotearsFit(good, { tol: -1e-6 })).toThrow();
    expect(() => laggedDynotearsFit(good, { edgeThreshold: -0.01 })).toThrow();
    expect(() => laggedDynotearsFit(good, { rho: Number.NaN })).toThrow();
    expect(() => laggedDynotearsFit(good, { alpha: Number.NaN })).toThrow();
    expect(() => laggedDynotearsFit(good, { tol: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => laggedDynotearsFit(good, { edgeThreshold: Number.NaN })).toThrow();
  });

  it("rejects a non-integer node index in allowedEdges and allowedLaggedEdges", () => {
    expect(() => laggedDynotearsFit(good, { allowedEdges: [[0.5, 1]] })).toThrow();
    expect(() => laggedDynotearsFit(good, { allowedEdges: [[0, 1.5]] })).toThrow();
    expect(() => laggedDynotearsFit(good, { allowedLaggedEdges: [[1.5, 0, 1]] })).toThrow();
    expect(() => laggedDynotearsFit(good, { allowedLaggedEdges: [[1, 0, 2.5]] })).toThrow();
  });

  it("rejects an out-of-range index in allowedEdges and allowedLaggedEdges", () => {
    expect(() => laggedDynotearsFit(good, { allowedEdges: [[0, 9]] })).toThrow();
    expect(() => laggedDynotearsFit(good, { allowedEdges: [[-1, 0]] })).toThrow();
    expect(() => laggedDynotearsFit(good, { allowedLaggedEdges: [[1, 0, 9]] })).toThrow();
    expect(() => laggedDynotearsFit(good, { allowedLaggedEdges: [[5, 0, 1]] })).toThrow();
  });

  it("rejects ragged frames", () => {
    const ragged = good.map((frame) => frame.map((row) => row.slice()));
    ragged[2]![1] = ragged[2]![1]!.slice(0, 2);
    expect(() => laggedDynotearsFit(ragged)).toThrow();
  });

  it("rejects frames with an inconsistent number of rows or features", () => {
    const shortRow = good.map((frame) => frame.map((row) => row.slice()));
    shortRow[1] = shortRow[1]!.slice(0, 2);
    expect(() => laggedDynotearsFit(shortRow)).toThrow();
    const wideRow = good.map((frame) => frame.map((row) => row.slice()));
    wideRow[1]![0] = [...wideRow[1]![0]!, 1];
    expect(() => laggedDynotearsFit(wideRow)).toThrow();
  });

  it("rejects a non-finite value anywhere in the data", () => {
    const nan = good.map((frame) => frame.map((row) => row.slice()));
    nan[1]![2]![3] = Number.NaN;
    expect(() => laggedDynotearsFit(nan)).toThrow();
    const inf = good.map((frame) => frame.map((row) => row.slice()));
    inf[0]![0]![0] = Number.POSITIVE_INFINITY;
    expect(() => laggedDynotearsFit(inf)).toThrow();
  });

  it("rejects a lag count below 1", () => {
    expect(() => laggedDynotearsFit(good, { lags: 0 })).toThrow();
    expect(() => laggedDynotearsFit(good, { lags: -1 })).toThrow();
    expect(() => laggedDynotearsFit(good, { lags: 1.5 })).toThrow();
  });

  it("rejects a frame count at or below the lag count", () => {
    expect(() => laggedDynotearsFit(good, { lags: 6 })).toThrow();
    expect(() => laggedDynotearsFit(good, { lags: 7 })).toThrow();
    expect(() => laggedDynotearsFit(good, { lags: 100 })).toThrow();
  });

  it("rejects an empty panel", () => {
    expect(() => laggedDynotearsFit([])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. ACYCLICITY
// ---------------------------------------------------------------------------

describe("laggedDynotearsFit: acyclicity", () => {
  it("returns a non-negative h and an acyclic contemporaneous edge set", () => {
    const frames = simPanel(50, 25, 61);
    const result = laggedDynotearsFit(frames, {
      lags: 1,
      lambdaW: 0.05,
      lambdaA: 0.05,
      edgeThreshold: 0.1,
    });
    // h is the NOTEARS acyclicity function, which is >= 0 by construction; the tolerance
    // absorbs the floating-point noise of the matrix exponential.
    expect(result.h).toBeGreaterThanOrEqual(-1e-12);
    // And the graph the module actually reports has no directed cycle.
    expect(hasDirectedCycle(result.contemporaneousEdges)).toBe(false);
    // The support of the standardised contemporaneous matrix is acyclic too.
    expect(isAcyclicSupport(result.W0standardized)).toBe(true);
    // The thresholded support agrees with the reported edge set.
    const support = thresholdedSupport(result.W0standardized, 0.1);
    expect(support.acyclic).toBe(true);
    expect(support.edges.map(([a, b]) => `${a}->${b}`).sort()).toEqual(edgeKeys(result));
  });
});

// ---------------------------------------------------------------------------
// Support restriction: forbidden edges are held at EXACTLY zero
// ---------------------------------------------------------------------------

describe("laggedDynotearsFit: support restriction", () => {
  it("holds every forbidden entry at exactly zero for the whole optimisation", () => {
    const frames = simPanel(40, 20, 8);
    const allowed: [number, number][] = [
      [0, 1],
      [2, 1],
    ];
    const result = laggedDynotearsFit(frames, {
      lags: 1,
      lambdaW: 0.02,
      lambdaA: 0.02,
      allowedEdges: allowed,
      allowedLaggedEdges: [[1, 1, 3]],
    });
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 4; j++) {
        if (k === j) continue;
        const isAllowed = allowed.some(([a, b]) => a === k && b === j);
        if (isAllowed) continue;
        // Exactly zero, not "small": the mask is enforced, not merely penalised.
        expect(result.W0[k]![j]!).toBe(0);
        expect(result.W0standardized[k]![j]!).toBe(0);
      }
    }
    // And the reported edges are a subset of the allowed support.
    for (const [from, to] of result.contemporaneousEdges) {
      expect(allowed.some(([a, b]) => a === from && b === to)).toBe(true);
    }
    for (const e of result.laggedEdges) {
      expect(e.lag === 1 && e.from === 1 && e.to === 3).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// The unit map: the result's fields must be consistent with each other
// ---------------------------------------------------------------------------

describe("laggedDynotearsFit: the result's fields agree", () => {
  it("maps W_0 and A back to original units by the documented rule", () => {
    const frames = simPanel(30, 18, 4242);
    const result = laggedDynotearsFit(frames, { lags: 1, lambdaW: 0.05, lambdaA: 0.05 });
    const sd = result.design.sd;
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 4; j++) {
        expect(result.W0[k]![j]!).toBeCloseTo(
          result.W0standardized[k]![j]! * (sd[j]! / sd[k]!),
          12,
        );
      }
    }
    // A is stacked (p*d) x d, and AByLag is the per-lag d x d view of the same numbers.
    expect(result.A.length).toBe(1 * 4);
    for (let m = 0; m < result.A.length; m++) {
      for (let j = 0; j < 4; j++) {
        const k = m % 4;
        const tau = Math.floor(m / 4) + 1;
        expect(result.A[m]![j]!).toBeCloseTo(
          result.Astandardized[m]![j]! * (sd[j]! / sd[k]!),
          12,
        );
        expect(result.AByLag[tau - 1]![k]![j]!).toBeCloseTo(result.A[m]![j]!, 12);
      }
    }
  });
});
