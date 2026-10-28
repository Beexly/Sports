import { describe, it, expect } from "vitest";
import {
  sinkhorn,
  sinkhornWithInfo,
  SINKHORN_EPS,
  SINKHORN_MAX_ITER,
  SINKHORN_TOL,
} from "./sinkhorn.js";

/**
 * Unit contract for the pure Sinkhorn solver.
 *
 * These tests are written against the pure module, not the target-allocation
 * layer. They pin three separate things and refuse to blur them:
 *
 *   1. TRANSPORT MATH — a well-conditioned problem recovers both marginals and
 *      every plan cell stays strictly positive (the entropy term's point).
 *   2. DIAGNOSTIC HONESTY — `converged` must mean "both marginals are inside
 *      the solver's own tol". The reference port hardcodes 1e-4 here, which is
 *      100x looser than SINKHORN_TOL = 1e-6 and therefore reports success on a
 *      plan that violates the stated marginal contract.
 *   3. STABILITY GUARDS — the kernel clamps at -700 instead of underflowing to
 *      an exact zero, a zero marginal does not produce NaN, and repeated runs
 *      are bit-identical.
 *
 * Known limit, asserted rather than hidden: when C_max/eps is large enough that
 * the 1e-12 denominator guard fires, the standard scaling iteration loses the
 * marginal identity and cannot reach SINKHORN_TOL. The solver reports that as
 * converged=false; closing the gap needs Schmitzer (2019) log-domain
 * stabilization (arXiv:1610.06519 §3.1), which is named in the source doc and
 * is NOT implemented here. See the "ill-conditioned" block below.
 */

const rowSums = (P: readonly (readonly number[])[]): number[] =>
  P.map((row) => row.reduce((s, x) => s + x, 0));

const colSums = (P: readonly (readonly number[])[], m: number): number[] => {
  const out = new Array<number>(m).fill(0);
  for (const row of P) for (let j = 0; j < m; j++) out[j] = out[j]! + row[j]!;
  return out;
};

const maxAbs = (xs: readonly number[]): number => xs.reduce((a, x) => Math.max(a, Math.abs(x)), 0);

describe("sinkhorn: transport math on a well-conditioned problem", () => {
  // The worked example from the goal set: r=[0.6,0.4], c=[0.3,0.7], C=[[0,1],[1,0]], eps=0.1.
  const r = [0.6, 0.4];
  const c = [0.3, 0.7];
  const C = [
    [0, 1],
    [1, 0],
  ];

  it("recovers the source marginal as the row sums", () => {
    const P = sinkhorn(r, c, C, 0.1);
    expect(P).toHaveLength(2);
    const sums = rowSums(P);
    expect(Math.abs(sums[0]! - r[0]!)).toBeLessThan(1e-9);
    expect(Math.abs(sums[1]! - r[1]!)).toBeLessThan(1e-9);
  });

  it("recovers the target marginal as the column sums", () => {
    const P = sinkhorn(r, c, C, 0.1);
    const sums = colSums(P, 2);
    expect(Math.abs(sums[0]! - c[0]!)).toBeLessThan(1e-12);
    expect(Math.abs(sums[1]! - c[1]!)).toBeLessThan(1e-12);
  });

  it("keeps every plan cell strictly positive (entropy term)", () => {
    const P = sinkhorn(r, c, C, 0.1);
    for (const row of P) for (const x of row) expect(x).toBeGreaterThan(0);
  });

  it("returns scaling vectors that reconstruct the plan exactly", () => {
    const { plan, scaling } = sinkhornWithInfo(r, c, C, 0.1);
    const eps = 0.1;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const K = Math.exp(Math.max(-C[i]![j]! / eps, -700.0));
        expect(plan[i]![j]!).toBeCloseTo(scaling.u[i]! * K * scaling.v[j]!, 15);
      }
    }
  });

  it("exposes dual potentials alpha = eps*ln(u), beta = eps*ln(v)", () => {
    const { scaling } = sinkhornWithInfo(r, c, C, 0.1);
    expect(scaling.alpha).toHaveLength(2);
    expect(scaling.beta).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      expect(scaling.alpha[i]!).toBeCloseTo(0.1 * Math.log(scaling.u[i]!), 12);
      expect(scaling.beta[i]!).toBeCloseTo(0.1 * Math.log(scaling.v[i]!), 12);
    }
  });

  it("defaults to the sealed eps/iter/tol constants", () => {
    expect(SINKHORN_EPS).toBe(0.05);
    expect(SINKHORN_MAX_ITER).toBe(200);
    expect(SINKHORN_TOL).toBe(1e-6);
  });
});

describe("sinkhorn: convergence diagnostics must tell the truth", () => {
  // Deterministic 4x4 from the measured scan: the scaling vectors satisfy the
  // 1e-6 delta test at maxIter, but the ROW marginal is 9e-5 off — 90x the tol.
  const r = [0.2089, 0.35814, 0.29494, 0.13803];
  const c = [0.27135, 0.22273, 0.23165, 0.27427];
  const C = [
    [0.0, 0.718, 1.1, 0.261],
    [1.183, 0.0, 0.324, 0.472],
    [0.563, 0.878, 0.0, 0.901],
    [0.354, 0.866, 0.427, 0.0],
  ];

  it("pins the column marginal to c exactly (the final v-update does this)", () => {
    const { info } = sinkhornWithInfo(r, c, C, 0.05);
    expect(info.colResidual).toBeLessThan(1e-12);
  });

  it("does NOT claim convergence when a marginal sits outside SINKHORN_TOL", () => {
    const { info } = sinkhornWithInfo(r, c, C, 0.05);
    // The row residual is ~9e-5: outside 1e-6 but inside the reference port's
    // hardcoded 1e-4. Reporting converged here would be a false success.
    expect(info.rowResidual).toBeGreaterThan(SINKHORN_TOL);
    expect(info.converged).toBe(false);
  });

  it("converged implies both marginals are within SINKHORN_TOL", () => {
    const { info } = sinkhornWithInfo(r, c, C, 0.05);
    if (info.converged) {
      expect(info.rowResidual).toBeLessThanOrEqual(SINKHORN_TOL);
      expect(info.colResidual).toBeLessThanOrEqual(SINKHORN_TOL);
    }
  });

  it("honors a caller-supplied tol tighter than the reference's 1e-4 floor", () => {
    // Same problem, but ask for 1e-9. The delta criterion stops long before
    // the marginals get there, so this must NOT be reported as converged.
    const { info } = sinkhornWithInfo(r, c, C, 0.05, 200, 1e-9);
    expect(info.rowResidual).toBeGreaterThan(1e-9);
    expect(info.converged).toBe(false);
  });
});

describe("sinkhorn: numerical stability guards", () => {
  it("clamps the kernel at -700 rather than underflowing to an exact zero", () => {
    const r = [0.5, 0.5];
    const c = [0.5, 0.5];
    const C = [
      [1e6, 1e6],
      [1e6, 1e6],
    ];
    const { plan, scaling } = sinkhornWithInfo(r, c, C, 0.05);
    for (const row of plan) for (const x of row) expect(Number.isFinite(x)).toBe(true);
    for (const u of scaling.u) expect(Number.isFinite(u)).toBe(true);
    for (const v of scaling.v) expect(Number.isFinite(v)).toBe(true);
    // exp(-700) is ~9.86e-305: positive, finite, not zero.
    expect(Math.exp(-700)).toBeGreaterThan(0);
  });

  it("survives a zero row marginal without producing NaN", () => {
    const r = [0, 1];
    const c = [0.5, 0.5];
    const C = [
      [0, 1],
      [1, 0],
    ];
    const { plan, scaling } = sinkhornWithInfo(r, c, C, 0.1);
    for (const row of plan) for (const x of row) expect(Number.isNaN(x)).toBe(false);
    expect(scaling.alpha[0]).toBe(-Infinity);
    expect(plan[0]![0]).toBe(0);
    expect(plan[0]![1]).toBe(0);
    expect(Math.abs(rowSums(plan)[1]! - 1)).toBeLessThan(1e-6);
  });

  it("is deterministic: identical inputs produce bit-identical outputs", () => {
    const r = [0.31, 0.27, 0.42];
    const c = [0.35, 0.4, 0.25];
    const C = [
      [0, 0.4, 0.9],
      [0.4, 0, 0.55],
      [0.9, 0.55, 0],
    ];
    const a = sinkhornWithInfo(r, c, C, 0.05);
    const b = sinkhornWithInfo(r, c, C, 0.05);
    expect(a.plan).toEqual(b.plan);
    expect(a.scaling).toEqual(b.scaling);
    expect(a.info).toEqual(b.info);
  });

  it("rejects mismatched dimensions and negative marginals", () => {
    const C = [
      [0, 1],
      [1, 0],
    ];
    expect(() => sinkhorn([0.5, 0.5], [1], C, 0.1)).toThrow(/dimension mismatch/);
    expect(() => sinkhorn([-0.1, 1.1], [0.5, 0.5], C, 0.1)).toThrow(/non-negative/);
  });

  it("ill-conditioned kernel: reports failure instead of a false success", () => {
    // C_max/eps = 1.051/0.02 = 52.6; the 1e-12 denominator guard fires and the
    // standard scaling iteration cannot hold both marginals. Measured:
    // rowRes 2.2e-2, colRes 3.2e-2 after maxIter. The honest output is a plan
    // plus converged=false — NOT a silent pass. Closing this needs log-domain
    // stabilization, which is not implemented.
    const r = [0.5636, 0.2532, 0.1832];
    const c = [0.3893, 0.3953, 0.2154];
    const C = [
      [0.0, 0.035, 0.914],
      [0.48, 0.0, 1.051],
      [0.665, 0.244, 0.0],
    ];
    const { info } = sinkhornWithInfo(r, c, C, 0.02);
    expect(info.iterations).toBe(SINKHORN_MAX_ITER);
    expect(info.converged).toBe(false);
    expect(info.rowResidual).toBeGreaterThan(SINKHORN_TOL);
    expect(info.colResidual).toBeGreaterThan(SINKHORN_TOL);
  });
});
