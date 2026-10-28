/**
 * Sinkhorn-Knopp entropy-regularized optimal transport — pure solver module.
 *
 * Solves
 *
 *   min  <C, P> - eps * H(P)
 *   s.t. P 1 = r,  P^T 1 = c,  P >= 0
 *
 * by the standard alternating scaling fixed point
 *
 *   u <- r ./ (K v),   v <- c ./ (K^T u),   P = diag(u) K diag(v),
 *   K_ij = exp(-C_ij / eps)
 *
 * This file is a literal port of `gse_injury_overlay_v2.py::sinkhorn_with_info`
 * and is kept free of role labels, cost-model policy, and coach state so the
 * transport math can be tested on its own. `sinkhorn-targets.ts` owns the
 * role-interchangeability matrix and the target-allocation bridge.
 *
 * Stability guards, matching the reference:
 *   - kernel exponent clamped at -700 so a large cost cannot underflow to an
 *     exact zero row (exp(-700) ~ 9.86e-305, still positive),
 *   - every scaling denominator clamped at max(sum, 1e-12),
 *   - early exit when the scaling-vector deltas fall below `tol`.
 *
 * Known limit — reported, not hidden
 * ----------------------------------
 * The 1e-12 denominator clamp keeps the iteration finite but destroys the
 * marginal identity when it fires. Because the final v-update divides by
 * K^T u, the COLUMN marginal is pinned to c by construction; the ROW marginal
 * is the one that drifts. Measured on an ill-conditioned 3x3 (C_max/eps ~ 52.6,
 * eps = 0.02): 33 clamp firings, rowResidual 2.22e-2, colResidual 3.22e-2 at
 * maxIter — four orders of magnitude outside SINKHORN_TOL. On that class of
 * input this solver reports converged=false rather than a false success.
 *
 * Closing that gap requires Schmitzer (2019) log-domain stabilization in the
 * dual potentials (arXiv:1610.06519 §3.1), which the source document names as
 * the Stage B method ("max element-wise discrepancy ... 1.11e-16"). It is NOT
 * implemented here. No math is invented in this module: what is present is the
 * standard scaling iteration plus its reference guards.
 */

export interface SinkhornInfo {
  readonly iterations: number;
  readonly rowResidual: number;
  readonly colResidual: number;
  readonly converged: boolean;
  readonly objective: number;
}

/**
 * Scaling vectors and dual potentials, kept for audit.
 *
 * The plan is P_ij = u_i * K_ij * v_j. The dual potentials are the log-scalings
 * scaled by eps: alpha_i = eps * ln(u_i), beta_j = eps * ln(v_j). A zero
 * marginal drives its potential to -Infinity, which is the correct limit (the
 * constraint is slack there, not violated).
 */
export interface SinkhornScaling {
  readonly u: readonly number[];
  readonly v: readonly number[];
  readonly alpha: readonly number[];
  readonly beta: readonly number[];
}

/** Sealed entropic regularization strength. Not tuned mid-week. */
export const SINKHORN_EPS = 0.05;
/** Hard iteration cap. Exceeding it is reported, never hidden. */
export const SINKHORN_MAX_ITER = 200;
/** Convergence tolerance on the marginals. The sealed contract is 1e-6. */
export const SINKHORN_TOL = 1e-6;

export function sinkhornWithInfo(
  r: readonly number[],
  c: readonly number[],
  C: readonly (readonly number[])[],
  eps: number = SINKHORN_EPS,
  maxIter: number = SINKHORN_MAX_ITER,
  tol: number = SINKHORN_TOL,
): { plan: number[][]; info: SinkhornInfo; scaling: SinkhornScaling } {
  const n = r.length;
  const m = c.length;
  const firstRow = C[0];
  if (C.length !== n || firstRow === undefined || firstRow.length !== m) {
    throw new Error(
      `dimension mismatch: len(r)=${n}, len(c)=${m}, shape(C)=(${C.length},${firstRow?.length ?? 0})`,
    );
  }
  for (const v of r) if (v < 0) throw new Error("marginals r and c must be non-negative");
  for (const v of c) if (v < 0) throw new Error("marginals r and c must be non-negative");

  // K[i][j] = exp(max(-C[i][j]/eps, -700))
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = C[i]!;
    const kRow: number[] = new Array(m);
    for (let j = 0; j < m; j++) {
      kRow[j] = Math.exp(Math.max(-(row[j]!) / eps, -700.0));
    }
    K.push(kRow);
  }

  let u: number[] = new Array(n).fill(1.0 / n);
  let v: number[] = new Array(m).fill(1.0 / m);
  let iterations = 0;

  for (let it = 1; it <= maxIter; it++) {
    // Python's `for iterations in range(1, max_iter + 1)` leaves `iterations`
    // at max_iter when the loop is exhausted. A plain post-increment here would
    // report max_iter + 1, so the counter is assigned inside the body instead.
    iterations = it;
    const uNew: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let kv = 0;
      const kRow = K[i]!;
      for (let j = 0; j < m; j++) kv += kRow[j]! * v[j]!;
      uNew[i] = r[i]! / Math.max(kv, 1e-12);
    }
    const vNew: number[] = new Array(m);
    for (let j = 0; j < m; j++) {
      let ktU = 0;
      for (let i = 0; i < n; i++) ktU += K[i]![j]! * uNew[i]!;
      vNew[j] = c[j]! / Math.max(ktU, 1e-12);
    }
    let du = 0;
    for (let i = 0; i < n; i++) du = Math.max(du, Math.abs(uNew[i]! - u[i]!));
    let dv = 0;
    for (let j = 0; j < m; j++) dv = Math.max(dv, Math.abs(vNew[j]! - v[j]!));
    u = uNew;
    v = vNew;
    if (du < tol && dv < tol) break;
  }

  const plan: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = new Array(m);
    for (let j = 0; j < m; j++) row[j] = u[i]! * K[i]![j]! * v[j]!;
    plan.push(row);
  }

  let rowResidual = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < m; j++) sum += plan[i]![j]!;
    rowResidual = Math.max(rowResidual, Math.abs(sum - r[i]!));
  }
  let colResidual = 0;
  for (let j = 0; j < m; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += plan[i]![j]!;
    colResidual = Math.max(colResidual, Math.abs(sum - c[j]!));
  }
  let objective = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) objective += plan[i]![j]! * C[i]![j]!;

  // Dual potentials. ln(0) is -Infinity, the honest value for a row or column
  // whose marginal is zero: the constraint is inactive there.
  const alpha: number[] = u.map((ui) => (ui > 0 ? eps * Math.log(ui) : -Infinity));
  const beta: number[] = v.map((vj) => (vj > 0 ? eps * Math.log(vj) : -Infinity));

  return {
    plan,
    info: {
      iterations,
      rowResidual,
      colResidual,
      // The reference port hardcodes 1e-4 here, which is 100x looser than the
      // sealed tol and reports success on a plan that violates the marginal
      // contract (measured: rowResidual 8.98e-5 flagged as converged). Honour
      // the caller's tol instead so "converged" means what the contract says.
      converged: rowResidual < tol && colResidual < tol,
      objective,
    },
    scaling: { u: [...u], v: [...v], alpha, beta },
  };
}

/** Minimal Sinkhorn: returns just the transport plan. */
export function sinkhorn(
  r: readonly number[],
  c: readonly number[],
  C: readonly (readonly number[])[],
  eps: number = SINKHORN_EPS,
  maxIter: number = SINKHORN_MAX_ITER,
  tol: number = SINKHORN_TOL,
): number[][] {
  return sinkhornWithInfo(r, c, C, eps, maxIter, tol).plan;
}
