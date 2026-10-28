/**
 * Scale-invariant LAGGED DYNOTEARS: a joint (W_0, A_1..A_p) fit.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a
 * NEEDS HUMAN CALL). This is the LAGGED companion of the contemporaneous `dynotearsFit` in
 * ./fci-pag.ts; it is a separate module rather than an extension of that one because that
 * module is under concurrent edit, and because the objective here differs from it in a way
 * that has to be visible in the code (see THE DETERMINANT COEFFICIENT below).
 *
 * ---------------------------------------------------------------------------
 * 1. THE OBJECTIVE (minimised)
 * ---------------------------------------------------------------------------
 *
 *   L(W_0, A) = 0.5 * sum_j log(sigma_j^2)
 *             - log|det(I - W_0)|
 *             + lambda_W * ||W_0||_1
 *             + lambda_A * ||A||_1
 *             + (rho/2) * h(W_0)^2
 *             + alpha * h(W_0)
 *
 * with
 *   - sigma_j^2 = (1/N) * ||r_j||^2, where r_j is column j of the residual
 *     R = X - Z W_0 - Y A, so sigma_j^2 is the (profiled) variance of target j;
 *   - h(W) = tr(exp(W o W)) - d, the NOTEARS acyclicity function. h is imported from
 *     ./fci-pag.js as `acyclicityExact`, which returns h and its EXACT gradient together;
 *   - the two L1 terms are NON-smooth and are handled by the proximal step. They are NOT part
 *     of the exported smooth objective or its gradient.
 *
 * The smooth part alone is
 *
 *   L_smooth(W_0, A) = 0.5 * sum_j log(sigma_j^2) - log|det(I - W_0)| + (rho/2) h^2 + alpha h
 *
 * and it is exported (`laggedSmoothObjective`, `laggedSmoothGradient`) so a test can
 * finite-difference it against the analytic gradient. A gradient that is wrong in a way that
 * still "converges" -- to a different W, and plausibly -- is invisible to a loss curve and
 * visible only to a finite difference.
 *
 * ---------------------------------------------------------------------------
 * 2. THE DETERMINANT COEFFICIENT IS 1, NOT d
 * ---------------------------------------------------------------------------
 *
 * Kaiser & Sipos (2021) eq. (9), the non-equal-variance objective the project spec names
 * l_NV, is
 *
 *   l_NV(W; X) = 1/2 * sum_j log( ||r_j||^2 ) - log|det(I - W)|
 *
 * with ONE log-determinant, i.e. coefficient 1.
 *
 * The contemporaneous module in ./fci-pag.ts uses a d-FOLDED determinant term
 * (- d * log|det(I - W)|). That folding is a known, separately-reported deviation in THAT
 * module; it is deliberately NOT reproduced here. This module uses coefficient 1, so it
 * matches the spec and the literature. The two objectives have different argmins, so the two
 * modules are NOT interchangeable and this difference is stated in the source, not buried.
 *
 * (The 1/N inside sigma_j^2 changes the objective by the constant (d/2) log N relative to
 * log(||r_j||^2); it does not change the argmin, and it is kept because the spec's gradient
 * carries it. It also puts the objective on the SAME O(1) scale as the contemporaneous
 * module's, which is what makes a single lambda meaningful for both blocks.)
 *
 * ---------------------------------------------------------------------------
 * 3. THE EXACT GRADIENTS OF THE SMOOTH PART, AND THEIR DERIVATION
 * ---------------------------------------------------------------------------
 *
 *   grad_W0 = -(1/N) * Z^T R * Sigma_res^{-1}  +  (I - W_0)^{-T}  +  (rho*h + alpha) * grad_h(W_0)
 *   grad_A  = -(1/N) * Y^T R * Sigma_res^{-1}
 *
 * where Sigma_res^{-1} = diag(1/sigma_1^2, ..., 1/sigma_d^2), so the product with R scales
 * COLUMN j of R by 1/sigma_j^2, and (I - W_0)^{-T} is the transpose of the inverse of
 * (I - W_0).
 *
 * DERIVATION.
 * (i) LIKELIHOOD. 0.5 * log(sigma_j^2) = 0.5 * log( (1/N) r_j^T r_j ) and
 *     r_j = X_j - Z W_0[:,j] - Y A[:,j]. Hence
 *       d sigma_j^2 / d W_0[k][j] = (2/N) r_j^T (d r_j / d W_0[k][j]) = -(2/N) (Z^T r_j)[k]
 *       d sigma_j^2 / d A[m][j]   = -(2/N) (Y^T r_j)[m]
 *     so
 *       d/dW_0[k][j] of 0.5 log sigma_j^2 = -(1/N) (Z^T r_j)[k] / sigma_j^2
 *       d/dA[m][j]   of 0.5 log sigma_j^2 = -(1/N) (Y^T r_j)[m] / sigma_j^2
 *     Written column-wise that is -(1/N) Z^T R Sigma_res^{-1} and -(1/N) Y^T R Sigma_res^{-1}.
 * (ii) DETERMINANT. d/dW of log|det(I - W)| = -(I - W)^{-T}, so the gradient of
 *     - log|det(I - W_0)| is +(I - W_0)^{-T}. The transpose is not cosmetic: the gradient of a
 *     function and the gradient of its transpose are gradients of different functions.
 * (iii) ACYCLICITY PENALTY. d/dW of (rho/2) h^2 + alpha h = (rho * h + alpha) * grad_h, and
 *     grad_h comes from `acyclicityExact` in ./fci-pag.js (it is exact, not a finite
 *     difference of h).
 * (iv) The L1 terms are not smooth and are handled by the proximal step.
 *
 * ---------------------------------------------------------------------------
 * 4. DESIGN-TIME NOTATION (the one decision a reader has to know to read the code)
 * ---------------------------------------------------------------------------
 *
 * The input is `frames`: an array of T time slices, each slice an n x d matrix (number[][]),
 * with ROWS ALIGNED ACROSS SLICES -- row i of frame t is the same entity at time t. d is the
 * number of features; p is the number of lags (default 1).
 *
 * For each slice t from p to T-1:
 *   - Ylag_t is the horizontal concatenation of the previous p frames' FULL matrices, so it is
 *     n x (p*d). Column block (tau-1)*d + k of Ylag_t is feature k at lag tau, i.e. the most
 *     recent lag occupies the FIRST block.
 *   - Z_t (the contemporaneous design) and X_t (the target) are the frame at time t itself.
 *
 * All slices t = p .. T-1 are then POOLED into one regression: N = n * (T - p) rows, with
 * Z (N x d), Y (N x p*d) and X (N x d). The model per pooled row is
 *
 *   x = Z W_0 + Y A,   so  R = X - Z W_0 - Y A,
 *
 * and A is (p*d) x d, laid out so that row (tau-1)*d + k of A is the effect of feature k at
 * lag tau on target column j. Pooling (rather than fitting per slice) is what makes this a
 * single joint estimation of a VAR-like system; it also means the contemporaneous and lagged
 * blocks are estimated on exactly the same rows, so the two are directly comparable.
 *
 * W_0[k][j] is the effect of feature k on feature j, so the reported contemporaneous edge
 * [from, to] is [k, j] with a positive W_0[k][j]. The contemporaneous DIAGONAL is never
 * estimated (a feature is not regressed on its own contemporaneous value); the LAGGED block
 * has no such restriction, because a feature legitimately depends on its own past.
 *
 * ---------------------------------------------------------------------------
 * 5. STANDARDISATION, AND WHY THE SAME PER-FEATURE MEAN/SD IS USED FOR THE LAGGED COPIES
 * ---------------------------------------------------------------------------
 *
 * The fit runs in STANDARDISED space. One mean_j and one sd_j per feature j are computed
 * from the CONTEMPORANEOUS columns pooled over all frames and all rows, and THE SAME mean_j
 * and sd_j are then applied to that feature's copies in every lagged block Y and to the
 * target X.
 *
 * That "same mean/sd" is the whole point, and it is not a detail. If the lagged copies were
 * standardised separately (their own mean/sd, or even a mean/sd recomputed per lag), a lagged
 * coefficient and its contemporaneous counterpart would be expressed in DIFFERENT units and
 * could not be compared, thresholded, or read as the same kind of quantity. Worse, the
 * rescaling of one feature would change the OTHER features' lagged regressors, so the fit
 * would no longer be equivariant under a rescaling of a single feature. With one mean_j/sd_j
 * per feature, multiplying feature j's raw values by a positive constant c multiplies both
 * its mean and its sd by c, and the standardised values (c*x - c*mean)/(c*sd) are the
 * standardised values (x - mean)/sd -- exactly in exact arithmetic, and to within
 * floating-point rounding in IEEE-754. The standardised problem is therefore UNCHANGED, so
 * the recovered edge sets and orientations are unchanged, and that is what the
 * scale-invariance test proves. (The recovered coefficients agree to rounding, not bit for
 * bit; the edge SETS are identical, which is the property that has to hold.)
 *
 * The fit is mapped back to original units afterwards:
 *   W0_orig[k][j]  = W0_std[k][j] * sd_j / sd_k
 *   A_orig[tau][k][j] = A_std[tau][k][j] * sd_j / sd_k
 * (the same rule, with k the source feature of the block and j the target column).
 *
 * EDGES ARE THRESHOLDED AND REPORTED ON THE STANDARDISED COEFFICIENTS, because the
 * standardised coefficients are the only scale-free ones: a raw coefficient of 0.5 means
 * something completely different for a feature measured in goals than for one measured in
 * possession percentage, and thresholding raw coefficients would make the edge set a
 * function of the units the data arrived in.
 *
 * ---------------------------------------------------------------------------
 * 6. ONLY W_0 IS CONSTRAINED: LAGGED ARROWS CANNOT FORM A CYCLE
 * ---------------------------------------------------------------------------
 *
 * The acyclicity penalty h(W_0) is applied to the CONTEMPORANEOUS block ONLY. A lagged edge
 * points from the past to the present, so a cycle made of lagged edges would have to travel
 * backwards in time to close -- it is impossible. Any directed cycle in the joint graph
 * (W_0, A) must therefore use at least one contemporaneous edge, and the constraint on W_0
 * alone is sufficient to keep the joint graph acyclic. Constraining A as well would be
 * imposing a restriction the data cannot violate, i.e. adding a penalty that buys nothing
 * and can only distort the fit.
 *
 * (h(W) = 0 exactly when the SUPPORT of W is a DAG, and h is invariant under transposition,
 * so this statement does not depend on the row/column convention used for the edge set.)
 *
 * ---------------------------------------------------------------------------
 * 7. OPTIMISATION
 * ---------------------------------------------------------------------------
 *
 * Proximal gradient with backtracking line search on the SMOOTH objective, in the same
 * pattern as the contemporaneous module's innerSolve + proxStep: the gradient step is
 * followed by a soft-threshold (the proximal step) at threshold step*lambda, and the step
 * size is halved until the sufficient-decrease condition on the smooth objective holds. The
 * L1 terms live in the proximal step, never in the line search's objective.
 *
 * Around that sits an augmented-Lagrangian loop on h: alpha <- alpha + rho * h(W_0) and
 * rho <- min(4 rho, 1e8), which is the standard NOTEARS multiplier schedule and the same
 * schedule the contemporaneous module uses.
 *
 * The inner loop is O(d^3) and independent of N: it works from the Gram matrix of the
 * pooled, standardised design (Z^T Z, Z^T Y, Y^T Y, Z^T X, Y^T X), so the sufficient
 * statistics -- not the rows -- are what the optimiser sees. This is the same
 * precision-preconditioning trick the contemporaneous module uses.
 *
 * SUPPORT RESTRICTION: `allowedEdges` fixes the support of W_0 and `allowedLaggedEdges` the
 * support of A. Every entry outside the allowed support is held at EXACTLY 0 for the whole
 * optimisation (the proximal step never writes it), so the estimator cannot report an edge
 * the caller has forbidden.
 *
 * ---------------------------------------------------------------------------
 * owner: Motif-lab | bucket: MODEL | lane: causal_discovery | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

import { acyclicityExact, literatureTerm } from "./fci-pag.js";
import type { ClassALiteratureConstraint } from "./fci-pag.js";

export const ENABLED = false;

// ---------------------------------------------------------------------------
/** Acceptance gate, lifted from the source. */
export const ACCEPTANCE_GATE = "---------------------------------------------------------------------------";

// Types
// ---------------------------------------------------------------------------

/**
 * One lagged edge, reported in ORIGINAL node indices.
 *
 * `lag` is 1-based: lag 1 means "one time slice back", lag 2 means "two time slices back".
 * `from` is the source feature at time t - lag; `to` is the target feature at time t.
 */
export interface LaggedEdge {
  /** The lag, 1..p. 1 means "one time slice back". */
  readonly lag: number;
  /** The source feature index (at time t - lag). */
  readonly from: number;
  /** The target feature index (at time t). */
  readonly to: number;
}

/**
 * The pooled, standardised design, reduced to the sufficient statistics the estimator needs.
 *
 * Every matrix below is scaled by 1/N, where N = n * (T - p) is the number of pooled rows.
 * `gZZ` is d x d, `gZY` is d x (p*d), `gYY` is (p*d) x (p*d), `gZX` is d x d, `gYX` is
 * (p*d) x d, and `gXX` holds the d diagonal entries of X^T X / N.
 */
export interface LaggedDesign {
  /** Number of features. */
  readonly d: number;
  /** Number of lags. */
  readonly p: number;
  /** Rows per time slice. */
  readonly n: number;
  /** Number of time slices. */
  readonly T: number;
  /** Number of pooled rows: n * (T - p). */
  readonly N: number;
  /** Per-feature mean of the pooled contemporaneous columns, in raw units. */
  readonly mean: readonly number[];
  /** Per-feature standard deviation of the pooled contemporaneous columns, in raw units. */
  readonly sd: readonly number[];
  /** (1/N) Z^T Z. */
  readonly gZZ: number[][];
  /** (1/N) Z^T Y. */
  readonly gZY: number[][];
  /** (1/N) Y^T Y. */
  readonly gYY: number[][];
  /** (1/N) Z^T X. */
  readonly gZX: number[][];
  /** (1/N) Y^T X. */
  readonly gYX: number[][];
  /** (1/N) X^T X, diagonal only. */
  readonly gXX: readonly number[];
}

/** Options for the smooth objective and its gradient. */
export interface LaggedSmoothOptions {
  /** Weight on the augmented-Lagrangian acyclicity penalty. Default 1. */
  readonly rho?: number;
  /** Multiplier on the acyclicity penalty. Default 1. */
  readonly alpha?: number;
  /**
   * Optional VERIFIED literature constraints on the contemporaneous matrix, in the same form
   * ./fci-pag.ts uses. They enter the smooth objective as the literature term L_lit (imported
   * from there) and are off by default.
   */
  readonly constraints?: readonly ClassALiteratureConstraint[];
  /** The weight on the literature term. Zero (the default) disables it. */
  readonly muLit?: number;
}

/** The smooth objective's value and its exact gradient at one point. */
export interface LaggedSmoothPoint {
  /** The smooth objective value. */
  readonly value: number;
  /** d L_smooth / d W_0. */
  readonly gradW0: number[][];
  /** d L_smooth / d A. */
  readonly gradA: number[][];
  /** h(W_0) at the same point. */
  readonly h: number;
  /** The per-target residual variances sigma_j^2. */
  readonly sigma2: readonly number[];
}

/** Options for `laggedDynotearsFit`. */
export interface LaggedDynotearsOptions {
  /** The number of lags p. Default 1. */
  readonly lags?: number;
  /** L1 weight on the contemporaneous block. Default 0.01. */
  readonly lambdaW?: number;
  /** L1 weight on the lagged block. Default 0.01. */
  readonly lambdaA?: number;
  /** Initial weight on the acyclicity penalty. Default 1. */
  readonly rho?: number;
  /** Initial multiplier on the acyclicity penalty. Default 1. */
  readonly alpha?: number;
  /** Maximum number of augmented-Lagrangian outer iterations. Default 30. */
  readonly maxIter?: number;
  /** Tolerance on h(W_0) for the continuation to stop. Default 1e-6. */
  readonly tol?: number;
  /** Minimum standardised coefficient for an edge to be reported. Default 0.05. */
  readonly edgeThreshold?: number;
  /** The allowed support of W_0: [from, to] pairs. Everything else is held at exactly 0. */
  readonly allowedEdges?: readonly (readonly [number, number])[];
  /** The allowed support of A: [lag, from, to] triples. Everything else is held at exactly 0. */
  readonly allowedLaggedEdges?: readonly (readonly [number, number, number])[];
  /** Optional VERIFIED literature constraints on W_0 (off by default). */
  readonly constraints?: readonly ClassALiteratureConstraint[];
  /** The weight on the literature term (off by default). */
  readonly muLit?: number;
}

/** Result of `laggedDynotearsFit`. */
export interface LaggedDynotearsResult {
  /** Contemporaneous coefficients in ORIGINAL units: x_j = sum_k W0[k][j] x_k + ... */
  readonly W0: number[][];
  /** Stacked lagged coefficients in ORIGINAL units, (p*d) x d. Row (tau-1)*d + k is lag tau. */
  readonly A: number[][];
  /**
   * The lagged block per lag, in ORIGINAL units. `AByLag[tau - 1]` is the d x d matrix for
   * lag `tau`, so the index is lag MINUS ONE (lag 1 -> AByLag[0]).
   */
  readonly AByLag: number[][][];
  /** Contemporaneous coefficients in STANDARDISED units. The edge set is read off these. */
  readonly W0standardized: number[][];
  /** Stacked lagged coefficients in STANDARDISED units, (p*d) x d. */
  readonly Astandardized: number[][];
  /**
   * Directed contemporaneous edges [from, to], thresholded on the standardised coefficients.
   * A directed edge is reported only where the standardised coefficient is POSITIVE: a
   * negative coefficient is a negative effect, not an arrow pointing the other way, and
   * reporting it as a reversed edge would invent a direction the data does not support.
   */
  readonly contemporaneousEdges: readonly [number, number][];
  /**
   * Directed lagged edges, thresholded on the standardised coefficients, with the same
   * positive-coefficient rule. `lag` is 1-based.
   */
  readonly laggedEdges: readonly LaggedEdge[];
  /**
   * h(W_0) at the STANDARDISED contemporaneous matrix -- the parameter the acyclicity
   * constraint is imposed on, and the matrix whose support defines the reported edge set.
   * h is zero iff the support of W_0 is acyclic; it is NOT scale invariant (its magnitude
   * grows with the scale of the coefficients), which is why it is reported on the
   * standardised matrix and not on the original-unit one.
   */
  readonly h: number;
  /** h(W_0) at the ORIGINAL-unit contemporaneous matrix, for reference. */
  readonly hOriginal: number;
  /**
   * The total objective (smooth + both L1 terms) in standardised units at the returned
   * parameters, with the returned `rho` and `alpha`.
   */
  readonly loss: number;
  /** The smooth part of the objective at the returned parameters, in standardised units. */
  readonly smoothLoss: number;
  /**
   * The exact gradient of the smooth objective w.r.t. W_0, in STANDARDISED units, at the
   * returned parameters and the returned `rho`/`alpha`. A caller can finite-difference
   * `laggedSmoothObjective(design, W0standardized, Astandardized, { rho, alpha })` against it.
   */
  readonly gradW0: number[][];
  /** The exact gradient of the smooth objective w.r.t. A, in standardised units. */
  readonly gradA: number[][];
  /**
   * The same gradient expressed in the ORIGINAL units of `W0` and `A`, obtained by the exact
   * chain rule through the unit rescaling (W0_orig[k][j] = W0_std[k][j] * sd_j / sd_k), so
   * d L / d W0_orig[k][j] = (sd_k / sd_j) * d L / d W0_std[k][j]. A caller who works in
   * original units can finite-difference the objective through that map and check these.
   */
  readonly gradW0original: number[][];
  /** The same gradient expressed in the original units of `A`. */
  readonly gradAoriginal: number[][];
  /** The `rho` the reported gradient was taken at. */
  readonly rho: number;
  /** The `alpha` the reported gradient was taken at. */
  readonly alpha: number;
  /** The standardised design the fit ran on, so a caller can finite-difference the gradient. */
  readonly design: LaggedDesign;
}

// ---------------------------------------------------------------------------
// Small linear algebra
// ---------------------------------------------------------------------------

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array<number>(m).fill(0));
}

function identity(n: number): number[][] {
  const out = zeros(n, n);
  for (let i = 0; i < n; i++) out[i]![i] = 1;
  return out;
}

/** Gauss-Jordan inverse with partial pivoting, plus the determinant. Null when singular. */
function inverseWithDet(M: number[][]): { inv: number[][]; det: number } | null {
  const n = M.length;
  const I = identity(n);
  const A = M.map((row, i) => [...row, ...I[i]!]);
  let det = 1;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r]![col]!) > Math.abs(A[piv]![col]!)) piv = r;
    }
    if (Math.abs(A[piv]![col]!) < 1e-12) return null;
    if (piv !== col) {
      const tmp = A[col]!;
      A[col] = A[piv]!;
      A[piv] = tmp;
      det = -det;
    }
    const diag = A[col]![col]!;
    det *= diag;
    for (let k = 0; k < 2 * n; k++) A[col]![k]! /= diag;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r]![col]!;
      if (f === 0) continue;
      for (let k = 0; k < 2 * n; k++) A[r]![k]! -= f * A[col]![k]!;
    }
  }
  return { inv: A.map((row) => row.slice(n)), det };
}

function frob2(M: number[][]): number {
  let s = 0;
  for (const row of M) for (const v of row) s += v * v;
  return s;
}

function l1(M: number[][]): number {
  let s = 0;
  for (const row of M) for (const v of row) s += Math.abs(v);
  return s;
}

/**
 * True when the SUPPORT of W (the entries that are not exactly zero) is a DAG.
 *
 * This is a strict check on the pattern of non-zeros, not on the magnitudes, so it is the
 * right thing to assert about a thresholded edge set: a subgraph of an acyclic support is
 * acyclic.
 */
export function isAcyclicSupport(W: number[][]): boolean {
  const d = W.length;
  const state = new Array<number>(d).fill(0); // 0 unvisited, 1 on the stack, 2 finished
  const visit = (v: number): boolean => {
    state[v] = 1;
    for (let j = 0; j < d; j++) {
      if (W[v]![j]! === 0) continue;
      if (state[j] === 1) return false;
      if (state[j] === 0 && !visit(j)) return false;
    }
    state[v] = 2;
    return true;
  };
  for (let v = 0; v < d; v++) {
    if (state[v] === 0 && !visit(v)) return false;
  }
  return true;
}

/**
 * The thresholded, POSITIVE contemporaneous edges of a standardised W_0, and whether that
 * edge set is acyclic.
 *
 * "Positive" is a reporting convention, not a mathematical claim: a negative contemporaneous
 * coefficient is a negative effect, not an arrow pointing the other way, and folding the two
 * into one edge set would make the direction depend on the sign convention. The acyclicity
 * check is on the REPORTED edge set, because the reported set is what a downstream consumer
 * will act on.
 */
export function thresholdedSupport(
  W0standardized: number[][],
  edgeThreshold: number,
  allowed?: readonly (readonly boolean[])[],
): { edges: [number, number][]; acyclic: boolean } {
  const d = W0standardized.length;
  const edges: [number, number][] = [];
  const adjacency: number[][] = Array.from({ length: d }, () => [] as number[]);
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) {
      if (k === j) continue;
      const row = allowed === undefined ? undefined : allowed[k];
      if (row !== undefined && !row[j]!) continue;
      if (W0standardized[k]![j]! > edgeThreshold) {
        edges.push([k, j]);
        adjacency[k]!.push(j);
      }
    }
  }
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const state = new Array<number>(d).fill(0); // 0 unvisited, 1 on the stack, 2 finished
  let acyclic = true;
  const visit = (v: number): boolean => {
    state[v] = 1;
    for (const to of adjacency[v]!) {
      if (state[to] === 1) return false;
      if (state[to] === 0 && !visit(to)) return false;
    }
    state[v] = 2;
    return true;
  };
  for (let v = 0; v < d && acyclic; v++) {
    if (state[v] === 0 && !visit(v)) acyclic = false;
  }
  return { edges, acyclic };
}

// ---------------------------------------------------------------------------
// Validation of the input frames
// ---------------------------------------------------------------------------

function validateFrames(frames: number[][][], p: number): void {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("causal-graph-builder: need at least one time slice");
  }
  if (!Number.isInteger(p) || p < 1) {
    throw new Error("causal-graph-builder: lags must be a positive integer");
  }
  if (frames.length <= p) {
    throw new Error(
      `causal-graph-builder: need more than ${p} time slice(s) for ${p} lag(s), got ${frames.length}`,
    );
  }
  const first = frames[0]!;
  if (!Array.isArray(first) || first.length === 0) {
    throw new Error("causal-graph-builder: a time slice must have at least one row");
  }
  const d = first[0]!.length;
  if (d < 1) throw new Error("causal-graph-builder: a time slice must have at least one feature");
  const n = first.length;
  for (let t = 0; t < frames.length; t++) {
    const frame = frames[t]!;
    if (!Array.isArray(frame)) throw new Error("causal-graph-builder: a time slice must be an array");
    if (frame.length !== n) {
      throw new Error(
        `causal-graph-builder: time slice ${t} has ${frame.length} rows, expected ${n} (rows must be aligned across slices)`,
      );
    }
    for (let i = 0; i < frame.length; i++) {
      const row = frame[i]!;
      if (!Array.isArray(row)) throw new Error("causal-graph-builder: a row must be an array");
      if (row.length !== d) {
        throw new Error(
          `causal-graph-builder: time slice ${t} row ${i} has ${row.length} features, expected ${d}`,
        );
      }
      for (let j = 0; j < d; j++) {
        const v = row[j]!;
        if (!Number.isFinite(v)) {
          throw new Error(
            `causal-graph-builder: non-finite value at time slice ${t}, row ${i}, feature ${j}`,
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Standardisation and the pooled design
// ---------------------------------------------------------------------------

/**
 * One mean_j and one sd_j per feature, computed from the CONTEMPORANEOUS columns pooled
 * over all frames and all rows. The SAME constants are then applied to that feature's lagged
 * copies; see the header for why that is load-bearing rather than cosmetic.
 */
function standardisationStats(
  frames: number[][][],
  d: number,
): { mean: number[]; sd: number[] } {
  const T = frames.length;
  const n = frames[0]!.length;
  const count = T * n;
  const mean = new Array<number>(d).fill(0);
  for (const frame of frames) {
    for (const row of frame) {
      for (let j = 0; j < d; j++) mean[j]! += row[j]!;
    }
  }
  for (let j = 0; j < d; j++) mean[j]! /= count;
  const sd = new Array<number>(d).fill(0);
  for (const frame of frames) {
    for (const row of frame) {
      for (let j = 0; j < d; j++) {
        const dev = row[j]! - mean[j]!;
        sd[j]! += dev * dev;
      }
    }
  }
  for (let j = 0; j < d; j++) {
    sd[j] = Math.sqrt(Math.max(0, sd[j]! / count));
    // A constant feature carries no information; keep sd = 1 so the division stays finite.
    if (!(sd[j]! > 1e-12)) sd[j] = 1;
  }
  return { mean, sd };
}

/**
 * Build the pooled, standardised design from the frames, reduced to sufficient statistics.
 * See the header for the notation.
 */
export function buildLaggedDesign(frames: number[][][], p: number): LaggedDesign {
  validateFrames(frames, p);
  const T = frames.length;
  const n = frames[0]!.length;
  const d = frames[0]![0]!.length;
  const { mean, sd } = standardisationStats(frames, d);
  const N = n * (T - p);
  const pd = p * d;
  const gZZ = zeros(d, d);
  const gZY = zeros(d, pd);
  const gYY = zeros(pd, pd);
  const gZX = zeros(d, d);
  const gYX = zeros(pd, d);
  const gXX = new Array<number>(d).fill(0);

  // One pooled row per (slice, entity) pair, slices in order, entities in order.
  for (let t = p; t < T; t++) {
    const current = frames[t]!;
    for (let i = 0; i < n; i++) {
      const zrow: number[] = [];
      const xrow: number[] = [];
      for (let j = 0; j < d; j++) {
        const z = (current[i]![j]! - mean[j]!) / sd[j]!;
        zrow.push(z);
        xrow.push(z);
      }
      const yrow: number[] = [];
      for (let tau = 1; tau <= p; tau++) {
        const prev = frames[t - tau]![i]!;
        for (let k = 0; k < d; k++) yrow.push((prev[k]! - mean[k]!) / sd[k]!);
      }
      for (let a = 0; a < d; a++) {
        const za = zrow[a]!;
        for (let b = 0; b < d; b++) gZZ[a]![b]! += za * zrow[b]!;
        for (let m = 0; m < pd; m++) gZY[a]![m]! += za * yrow[m]!;
        for (let b = 0; b < d; b++) gZX[a]![b]! += za * xrow[b]!;
      }
      for (let a = 0; a < pd; a++) {
        const ya = yrow[a]!;
        for (let b = 0; b < pd; b++) gYY[a]![b]! += ya * yrow[b]!;
        for (let b = 0; b < d; b++) gYX[a]![b]! += ya * xrow[b]!;
      }
      for (let j = 0; j < d; j++) gXX[j]! += xrow[j]! * xrow[j]!;
    }
  }
  for (let a = 0; a < d; a++) {
    for (let b = 0; b < d; b++) {
      gZZ[a]![b]! /= N;
      gZX[a]![b]! /= N;
    }
    // gZY is d x (p*d): it spans both loops, so it is normalised here and ONLY here.
    for (let m = 0; m < pd; m++) gZY[a]![m]! /= N;
  }
  for (let a = 0; a < pd; a++) {
    for (let b = 0; b < pd; b++) gYY[a]![b]! /= N;
    for (let b = 0; b < d; b++) gYX[a]![b]! /= N;
  }
  for (let j = 0; j < d; j++) gXX[j]! /= N;

  return { d, p, n, T, N, mean, sd, gZZ, gZY, gYY, gZX, gYX, gXX };
}

// ---------------------------------------------------------------------------
// The smooth objective and its exact gradient
// ---------------------------------------------------------------------------

/**
 * The sufficient statistics of the residual, from the Gram matrices.
 *
 * For target j with w = W_0[:,j] and a = A[:,j]:
 *   (1/N) Z^T r_j = gZX[:,j] - (gZZ w + gZY a)
 *   (1/N) Y^T r_j = gYX[:,j] - (gZY^T w + gYY a)
 *   sigma_j^2    = gXX[j] - 2 w^T gZX[:,j] - 2 a^T gYX[:,j]
 *                  + w^T(gZZ w) + 2 w^T(gZY a) + a^T(gYY a)
 */
function residualStats(
  design: LaggedDesign,
  W0: number[][],
  A: number[][],
): { ztR: number[][]; ytR: number[][]; sigma2: number[] } {
  const d = design.d;
  const pd = design.p * d;
  const ztR = zeros(d, d);
  const ytR = zeros(pd, d);
  const sigma2 = new Array<number>(d).fill(1);
  for (let j = 0; j < d; j++) {
    const w: number[] = [];
    const a: number[] = [];
    for (let k = 0; k < d; k++) w.push(W0[k]![j]!);
    for (let m = 0; m < pd; m++) a.push(A[m]![j]!);
    // u = gZZ w + gZY a  (d-vector); v = gZY^T w + gYY a  (pd-vector)
    const u = new Array<number>(d).fill(0);
    const v = new Array<number>(pd).fill(0);
    for (let k = 0; k < d; k++) {
      let s = 0;
      for (let l = 0; l < d; l++) s += design.gZZ[k]![l]! * w[l]!;
      for (let l = 0; l < pd; l++) s += design.gZY[k]![l]! * a[l]!;
      u[k] = s;
    }
    for (let m = 0; m < pd; m++) {
      let s = 0;
      for (let l = 0; l < d; l++) s += design.gZY[l]![m]! * w[l]!;
      for (let l = 0; l < pd; l++) s += design.gYY[m]![l]! * a[l]!;
      v[m] = s;
    }
    let quad = 0;
    for (let k = 0; k < d; k++) quad += w[k]! * u[k]!;
    for (let m = 0; m < pd; m++) quad += a[m]! * v[m]!;
    let lin = 0;
    for (let k = 0; k < d; k++) lin += w[k]! * design.gZX[k]![j]!;
    for (let m = 0; m < pd; m++) lin += a[m]! * design.gYX[m]![j]!;
    sigma2[j] = Math.max(design.gXX[j]! - 2 * lin + quad, 1e-12);
    for (let k = 0; k < d; k++) ztR[k]![j] = design.gZX[k]![j]! - u[k]!;
    for (let m = 0; m < pd; m++) ytR[m]![j] = design.gYX[m]![j]! - v[m]!;
  }
  return { ztR, ytR, sigma2 };
}

/**
 * The SMOOTH objective:
 *   0.5 * sum_j log(sigma_j^2) - log|det(I - W_0)| + (rho/2) * h(W_0)^2 + alpha * h(W_0)
 * (plus the optional literature term). The two L1 terms are NOT here: they are handled by
 * the proximal step, so including them would make the exported objective something the
 * optimiser never evaluates.
 *
 * The determinant coefficient is 1 (Kaiser & Sipos eq. 9); see the header.
 */
export function laggedSmoothObjective(
  design: LaggedDesign,
  W0: number[][],
  A: number[][],
  opts: LaggedSmoothOptions = {},
): number {
  const rho = opts.rho ?? 1;
  const alpha = opts.alpha ?? 1;
  const d = design.d;
  const { sigma2 } = residualStats(design, W0, A);
  let loss = 0;
  for (let j = 0; j < d; j++) loss += 0.5 * Math.log(sigma2[j]!);
  const eyeMinusW = identity(d).map((row, i) => row.map((v, j) => v - W0[i]![j]!));
  const inv = inverseWithDet(eyeMinusW);
  if (inv === null) return Number.POSITIVE_INFINITY;
  const absDet = Math.abs(inv.det);
  if (!Number.isFinite(absDet) || !(absDet > 1e-300)) return Number.POSITIVE_INFINITY;
  loss -= Math.log(absDet);
  const { h } = acyclicityExact(W0);
  if (!Number.isFinite(h)) return Number.POSITIVE_INFINITY;
  loss += (rho / 2) * h * h + alpha * h;
  const lit = literatureTerm(W0, opts.constraints ?? [], opts.muLit ?? 0);
  if (lit === null) return Number.POSITIVE_INFINITY;
  loss += lit.value;
  return Number.isFinite(loss) ? loss : Number.POSITIVE_INFINITY;
}

/**
 * The EXACT gradient of the smooth objective, in the form the header derives:
 *
 *   grad_W0 = -(1/N) Z^T R Sigma_res^{-1} + (I - W_0)^{-T} + (rho*h + alpha) grad_h(W_0)
 *   grad_A  = -(1/N) Y^T R Sigma_res^{-1}
 *
 * Returns null when I - W_0 is singular: the objective is not differentiable there, and a
 * caller that gets null must treat it as a fit failure rather than as a large-but-finite
 * value.
 */
export function laggedSmoothGradient(
  design: LaggedDesign,
  W0: number[][],
  A: number[][],
  opts: LaggedSmoothOptions = {},
): LaggedSmoothPoint | null {
  const rho = opts.rho ?? 1;
  const alpha = opts.alpha ?? 1;
  const d = design.d;
  const pd = design.p * d;

  const { ztR, ytR, sigma2 } = residualStats(design, W0, A);

  const eyeMinusW = identity(d).map((row, i) => row.map((v, j) => v - W0[i]![j]!));
  const inv = inverseWithDet(eyeMinusW);
  if (inv === null) return null;
  const absDet = Math.abs(inv.det);
  if (!Number.isFinite(absDet) || !(absDet > 1e-300)) return null;

  const { h, grad: gradH } = acyclicityExact(W0);
  if (!Number.isFinite(h)) return null;

  const gradW0 = zeros(d, d);
  const coef = rho * h + alpha;
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) {
      // -(1/N) * (Z^T R)[k][j] / sigma_j^2
      let g = -ztR[k]![j]! / sigma2[j]!;
      // + (I - W_0)^{-T}[k][j] = + ((I - W_0)^{-1})[j][k]
      g += inv.inv[j]![k]!;
      // + (rho * h + alpha) * grad_h
      g += coef * gradH[k]![j]!;
      gradW0[k]![j] = g;
    }
  }

  const gradA = zeros(pd, d);
  for (let m = 0; m < pd; m++) {
    for (let j = 0; j < d; j++) {
      gradA[m]![j] = -ytR[m]![j]! / sigma2[j]!;
    }
  }

  let value = 0;
  for (let j = 0; j < d; j++) value += 0.5 * Math.log(sigma2[j]!);
  value -= Math.log(absDet);
  value += (rho / 2) * h * h + alpha * h;

  const lit = literatureTerm(W0, opts.constraints ?? [], opts.muLit ?? 0);
  if (lit === null) return null;
  value += lit.value;
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) gradW0[k]![j]! += lit.grad[k]![j]!;
  }

  if (!Number.isFinite(value)) return null;
  return { value, gradW0, gradA, h, sigma2 };
}

// ---------------------------------------------------------------------------
// The proximal step
// ---------------------------------------------------------------------------

/** Soft-threshold: sign(v) * max(0, |v| - t). */
function softThreshold(v: number, t: number): number {
  if (v > t) return v - t;
  if (v < -t) return v + t;
  return 0;
}

/**
 * The proximal (soft-threshold) step for W_0, with the support mask applied. Entries outside
 * the allowed support are EXACTLY 0, not merely small: a forbidden edge must not be able to
 * creep back in through a rounding error.
 */
function proxW0(
  W0: number[][],
  grad: number[][],
  step: number,
  lambda: number,
  allowed: boolean[][],
): number[][] {
  const d = W0.length;
  const out = zeros(d, d);
  const t = step * lambda;
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) {
      if (!allowed[k]![j]!) continue;
      out[k]![j]! = softThreshold(W0[k]![j]! - step * grad[k]![j]!, t);
    }
  }
  return out;
}

/** The proximal (soft-threshold) step for A, with the support mask applied. */
function proxA(
  A: number[][],
  grad: number[][],
  step: number,
  lambda: number,
  allowed: boolean[][],
): number[][] {
  const pd = A.length;
  const d = A[0]!.length;
  const out = zeros(pd, d);
  const t = step * lambda;
  for (let m = 0; m < pd; m++) {
    for (let j = 0; j < d; j++) {
      if (!allowed[m]![j]!) continue;
      out[m]![j]! = softThreshold(A[m]![j]! - step * grad[m]![j]!, t);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The inner solve and the augmented-Lagrangian loop
// ---------------------------------------------------------------------------

/**
 * Inner proximal-gradient solve for one (alpha, rho) pair, with backtracking on the SMOOTH
 * objective only -- which is correct for the composite objective, because the L1 terms are
 * handled by the proximal step and not by the line search.
 */
function innerSolve(
  design: LaggedDesign,
  W0: number[][],
  A: number[][],
  lambdaW: number,
  lambdaA: number,
  alpha: number,
  rho: number,
  allowedW0: boolean[][],
  allowedA: boolean[][],
  iters: number,
  constraints: readonly ClassALiteratureConstraint[],
  muLit: number,
): { W0: number[][]; A: number[][] } {
  const smoothOpts: LaggedSmoothOptions = { rho, alpha, constraints, muLit };
  let W = W0.map((row) => row.slice());
  let Am = A.map((row) => row.slice());
  let f = laggedSmoothObjective(design, W, Am, smoothOpts);
  if (!Number.isFinite(f)) {
    W = zeros(design.d, design.d);
    Am = zeros(design.p * design.d, design.d);
    f = laggedSmoothObjective(design, W, Am, smoothOpts);
  }
  let step = 0.25;
  for (let it = 0; it < iters; it++) {
    const g = laggedSmoothGradient(design, W, Am, smoothOpts);
    if (g === null) break;
    const g2 = frob2(g.gradW0) + frob2(g.gradA);
    let accepted = false;
    for (let ls = 0; ls < 45; ls++) {
      const Wc = proxW0(W, g.gradW0, step, lambdaW, allowedW0);
      const Ac = proxA(Am, g.gradA, step, lambdaA, allowedA);
      const fc = laggedSmoothObjective(design, Wc, Ac, smoothOpts);
      if (Number.isFinite(fc) && fc <= f - 1e-4 * step * g2) {
        const prev = f;
        W = Wc;
        Am = Ac;
        f = fc;
        step *= 1.3;
        accepted = true;
        if (prev - fc < 1e-12 * Math.max(1, Math.abs(fc))) it = iters;
        break;
      }
      step *= 0.5;
    }
    if (!accepted) break;
  }
  return { W0: W, A: Am };
}

// ---------------------------------------------------------------------------
// The fit
// ---------------------------------------------------------------------------

/**
 * Fit the lagged DYNOTEARS model: a joint (W_0, A) estimation on a panel of time slices,
 * in standardised space, with the objective written in the header.
 *
 * SCALE INVARIANCE: the fit runs on per-feature z-scores, and the SAME per-feature mean/sd
 * is applied to the lagged copies, so rescaling any feature's raw values by a positive
 * constant cannot change the standardised problem and therefore cannot change the recovered
 * edge set. `W0` and `A` are mapped back to original units afterwards; the edge sets are
 * thresholded on the STANDARDISED coefficients, which are the only scale-free ones.
 *
 * @param frames T time slices, each an n x d matrix, with rows aligned across slices
 * @param opts lags, lambdaW, lambdaA, rho, alpha, maxIter, tol, edgeThreshold, allowedEdges,
 *              allowedLaggedEdges
 */
export function laggedDynotearsFit(
  frames: number[][][],
  opts: LaggedDynotearsOptions = {},
): LaggedDynotearsResult {
  const p = opts.lags ?? 1;
  if (!Number.isInteger(p) || p < 1) {
    throw new Error("causal-graph-builder: lags must be a positive integer");
  }
  // The numeric options are validated BEFORE the data is touched, so a bad option is
  // reported as a bad option regardless of what the data looks like.
  const lambdaW = opts.lambdaW ?? 0.01;
  const lambdaA = opts.lambdaA ?? 0.01;
  const rho0 = opts.rho ?? 1;
  const alpha0 = opts.alpha ?? 1;
  const maxIter = opts.maxIter ?? 30;
  const tol = opts.tol ?? 1e-6;
  const edgeThreshold = opts.edgeThreshold ?? 0.05;
  for (const [name, v] of [
    ["lambdaW", lambdaW],
    ["lambdaA", lambdaA],
    ["rho", rho0],
    ["alpha", alpha0],
    ["tol", tol],
    ["edgeThreshold", edgeThreshold],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`causal-graph-builder: ${name} must be a finite number >= 0`);
    }
  }
  if (!Number.isInteger(maxIter) || maxIter < 1) {
    throw new Error("causal-graph-builder: maxIter must be a positive integer");
  }
  const design = buildLaggedDesign(frames, p);
  const d = design.d;
  const pd = p * d;
  const constraints = opts.constraints ?? [];
  const muLit = opts.muLit ?? 0;
  if (!Number.isFinite(muLit) || muLit < 0) {
    throw new Error("causal-graph-builder: muLit must be a finite number >= 0");
  }
  for (const c of constraints) {
    if (!Number.isInteger(c.from) || !Number.isInteger(c.to)) {
      throw new Error("causal-graph-builder: a literature constraint has a non-integer node index");
    }
    if (c.from < 0 || c.to < 0 || c.from >= d || c.to >= d) {
      throw new Error(
        `causal-graph-builder: literature constraint ${c.from}->${c.to} is out of range for ${d} features`,
      );
    }
    if (c.from === c.to) {
      throw new Error("causal-graph-builder: a literature constraint cannot be a self-edge");
    }
    if (!Number.isFinite(c.delta)) {
      throw new Error("causal-graph-builder: a literature constraint has a non-finite delta");
    }
    if (!Number.isFinite(c.weight) || c.weight < 0) {
      throw new Error("causal-graph-builder: a literature constraint has a negative or non-finite weight");
    }
  }

  // The support masks. Everything outside them is held at exactly 0 for the whole
  // optimisation.
  const allowedW0: boolean[][] = Array.from({ length: d }, () => new Array<boolean>(d).fill(false));
  if (opts.allowedEdges === undefined) {
    for (let k = 0; k < d; k++) for (let j = 0; j < d; j++) allowedW0[k]![j] = k !== j;
  } else {
    for (const [from, to] of opts.allowedEdges) {
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        throw new Error(
          `causal-graph-builder: allowedEdges entry ${from}->${to} has a non-integer node index`,
        );
      }
      if (from < 0 || to < 0 || from >= d || to >= d) {
        throw new Error(
          `causal-graph-builder: allowedEdges entry ${from}->${to} is out of range for ${d} features`,
        );
      }
      if (from === to) {
        throw new Error(
          `causal-graph-builder: allowedEdges entry ${from}->${to} is a self-edge; the contemporaneous diagonal is never estimated`,
        );
      }
      allowedW0[from]![to] = true;
    }
  }

  const allowedA: boolean[][] = Array.from({ length: pd }, () => new Array<boolean>(d).fill(true));
  if (opts.allowedLaggedEdges !== undefined) {
    for (let m = 0; m < pd; m++) for (let j = 0; j < d; j++) allowedA[m]![j] = false;
    for (const [lag, from, to] of opts.allowedLaggedEdges) {
      if (!Number.isInteger(lag) || !Number.isInteger(from) || !Number.isInteger(to)) {
        throw new Error(
          `causal-graph-builder: allowedLaggedEdges entry ${lag}:${from}->${to} has a non-integer index`,
        );
      }
      if (lag < 1 || lag > p) {
        throw new Error(
          `causal-graph-builder: allowedLaggedEdges lag ${lag} is out of range for ${p} lag(s)`,
        );
      }
      if (from < 0 || to < 0 || from >= d || to >= d) {
        throw new Error(
          `causal-graph-builder: allowedLaggedEdges entry ${lag}:${from}->${to} is out of range for ${d} features`,
        );
      }
      allowedA[(lag - 1) * d + from]![to] = true;
    }
  }

  const smoothOpts: LaggedSmoothOptions = { constraints, muLit };
  const innerIters = 160;

  // Augmented-Lagrangian continuation on h: alpha <- alpha + rho * h, rho <- min(4 rho, 1e8).
  // This is the standard NOTEARS multiplier schedule; the penalty term (rho/2)h^2 + alpha*h
  // is part of the smooth objective, so the inner solve sees it.
  let W = zeros(d, d);
  let Am = zeros(pd, d);
  let alpha = alpha0;
  let rho = rho0;
  // Every iterate is a candidate. Candidates are ranked by:
  //
  //   1. the acyclicity of the THRESHOLDED contemporaneous edge set -- the property the
  //      result actually promises its consumer, since the reported edges are the thresholded
  //      ones and a consumer acts on those, not on the raw weights;
  //   2. the acyclicity of the raw SUPPORT, which is the condition h(W) = 0 (h is invariant
  //      under transposition, so this does not depend on the row/column convention);
  //   3. the data fit -- the likelihood and the log-determinant plus both L1 penalties.
  //
  // The h penalty is the device for reaching the acyclic region, not the thing being
  // scored: for an acyclic candidate h is 0, so the h terms drop out of the objective and
  // the comparison below compares the actual objective values.
  const candidates: { W: number[][]; A: number[][]; h: number; dataLoss: number }[] = [];

  for (let outer = 0; outer < maxIter; outer++) {
    const solved = innerSolve(
      design,
      W,
      Am,
      lambdaW,
      lambdaA,
      alpha,
      rho,
      allowedW0,
      allowedA,
      innerIters,
      constraints,
      muLit,
    );
    W = solved.W0;
    Am = solved.A;
    const { h } = acyclicityExact(W);
    if (Number.isFinite(h)) {
      const dataLoss =
        laggedSmoothObjective(design, W, Am, { ...smoothOpts, rho: 0, alpha: 0 }) +
        lambdaW * l1(W) +
        lambdaA * l1(Am);
      candidates.push({
        W: W.map((row) => row.slice()),
        A: Am.map((row) => row.slice()),
        h,
        dataLoss,
      });
    }
    if (h < tol) break;
    alpha = alpha + rho * h;
    rho = Math.min(rho * 4, 1e8);
  }
  if (candidates.length === 0) {
    candidates.push({
      W: W.map((row) => row.slice()),
      A: Am.map((row) => row.slice()),
      h: 0,
      dataLoss: Number.POSITIVE_INFINITY,
    });
  }

  // The rank of a candidate: higher is better. 2 = acyclic thresholded edge set AND acyclic
  // support; 1 = acyclic thresholded edge set only; 0 = neither.
  const rank = (cand: { W: number[][] }): number => {
    const edgeAcyclic = thresholdedSupport(cand.W, edgeThreshold, allowedW0).acyclic;
    const supportAcyclic = isAcyclicSupport(cand.W);
    if (edgeAcyclic && supportAcyclic) return 2;
    if (edgeAcyclic) return 1;
    return 0;
  };

  let chosen = candidates[0]!;
  let chosenRank = rank(chosen);
  for (const cand of candidates) {
    const candRank = rank(cand);
    if (candRank > chosenRank) {
      chosen = cand;
      chosenRank = candRank;
      continue;
    }
    if (candRank < chosenRank) continue;
    if (chosenRank > 0 && cand.dataLoss < chosen.dataLoss) chosen = cand;
  }
  // If no candidate has an acyclic edge set, take the smallest h and let the returned h say so.
  if (chosenRank === 0) {
    for (const cand of candidates) {
      if (cand.h < chosen.h) chosen = cand;
    }
  }

  const W0std = chosen.W;
  const Astd = chosen.A;
  const sd = design.sd;

  // Back to original units. The same rule for both blocks: the coefficient on source k for
  // target j scales by sd_j / sd_k.
  const W0orig = W0std.map((row, k) => row.map((v, j) => (v * sd[j]!) / sd[k]!));
  const Aorig = Astd.map((row, m) => row.map((v, j) => (v * sd[j]!) / sd[m % d]!));
  const AByLag: number[][][] = [];
  for (let tau = 1; tau <= p; tau++) {
    const block = zeros(d, d);
    for (let k = 0; k < d; k++) {
      for (let j = 0; j < d; j++) block[k]![j]! = Aorig[(tau - 1) * d + k]![j]!;
    }
    AByLag.push(block);
  }

  // The edge sets are read off the STANDARDISED coefficients: the only scale-free choice.
  const contemporaneousEdges: [number, number][] = [];
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) {
      if (k === j) continue;
      if (!allowedW0[k]![j]!) continue;
      if (W0std[k]![j]! > edgeThreshold) contemporaneousEdges.push([k, j]);
    }
  }
  contemporaneousEdges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const laggedEdges: LaggedEdge[] = [];
  for (let tau = 1; tau <= p; tau++) {
    for (let k = 0; k < d; k++) {
      for (let j = 0; j < d; j++) {
        const m = (tau - 1) * d + k;
        if (!allowedA[m]![j]!) continue;
        if (Astd[m]![j]! > edgeThreshold) laggedEdges.push({ lag: tau, from: k, to: j });
      }
    }
  }

  const point = laggedSmoothGradient(design, W0std, Astd, { ...smoothOpts, rho, alpha });
  const smoothLoss = point === null ? Number.POSITIVE_INFINITY : point.value;
  const loss = smoothLoss + lambdaW * l1(W0std) + lambdaA * l1(Astd);
  const { h: hStd } = acyclicityExact(W0std);
  const { h: hOrig } = acyclicityExact(W0orig);

  // The gradient in the ORIGINAL units, by the exact chain rule through the unit rescaling.
  // W0_orig[k][j] = W0_std[k][j] * sd_j / sd_k, so dW0_orig[k][j]/dW0_std[k][j] = sd_j/sd_k
  // and therefore dL/dW0_std[k][j] = (sd_j/sd_k) * dL/dW0_orig[k][j], i.e. the original-unit
  // gradient is the standardised one times sd_k/sd_j. The same rule applies to A, whose row m
  // carries source feature m % d.
  const gradW0std = point === null ? zeros(d, d) : point.gradW0;
  const gradAstd = point === null ? zeros(pd, d) : point.gradA;
  const gradW0orig = gradW0std.map((row, k) => row.map((v, j) => (v * sd[k]!) / sd[j]!));
  const gradAorig = gradAstd.map((row, m) => row.map((v, j) => (v * sd[m % d]!) / sd[j]!));

  return {
    W0: W0orig,
    A: Aorig,
    AByLag,
    W0standardized: W0std,
    Astandardized: Astd,
    contemporaneousEdges,
    laggedEdges,
    h: hStd,
    hOriginal: hOrig,
    loss: Number.isFinite(loss) ? loss : Number.POSITIVE_INFINITY,
    smoothLoss: Number.isFinite(smoothLoss) ? smoothLoss : Number.POSITIVE_INFINITY,
    gradW0: gradW0std,
    gradA: gradAstd,
    gradW0original: gradW0orig,
    gradAoriginal: gradAorig,
    rho,
    alpha,
    design,
  };
}
