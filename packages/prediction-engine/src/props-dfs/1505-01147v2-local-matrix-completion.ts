/**
 * arXiv 1505.01147v2: Prediction and Quantification of Individual Athletic Performance
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Local matrix completion for sparse player-stat matrices (player x
stat-category or player x week): low-rank ALS completion with
inverse-variance weighting of observed entries imputes missing player-weeks
(bye, injury, DNP) and predicts next-week stat lines. The SVD three-number
specialization embedding (level / possession-vs-explosive / role-scheme
analogues) is emitted per player as prop-model features.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Port the paper's local matrix completion (LMC) to GSE's sparse player-stat matrices: build player x stat-category (or player x week) matrices from nflverse, implement LMC rank 2-3 (400 determinant circuits, inverse-variance weighting) to impute missing player-weeks (bye, injury, DNP) and predict next-week stat lines, and feed the SVD three-number specialization embedding (lambda_1 level, lambda_2 possession-vs-explosive, lambda_3 role/scheme) as features into the prop model.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT LMC imputation for the prop pipeline iff LMC rank 2 or 3 beats EM imputation by >= 5% relative RMSE with Wilcoxon p < 0.01 on the 2024-2025 holdout; also require rank-3 SVD specialization embedding to add >= 0.005 OOS R^2 when appended to the existing prop feature set.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2024-2025 holdout RMSE vs EM imputation.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Solve A x = b (Gauss-Jordan, partial pivoting). */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c]!;
    if (Math.abs(d) < 1e-12) throw new Error("singular matrix");
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / d;
      for (let k = c; k <= n; k++) M[r]![k] = M[r]![k]! - f * M[c]![k]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}

/**
 * Low-rank matrix completion by alternating least squares with
 * inverse-variance weighting of observed entries (the paper's weighting
 * scheme, applied globally rather than per local circuit).
 * Missing entries are `null`.
 */
export function completeMatrix(
  M: (number | null)[][],
  rank: number,
  iters = 100,
  seed = 7,
  ridge = 1e-3,
): number[][] {
  const m = M.length;
  const n = M[0]!.length;
  const rand = mulberry32(seed);
  // inverse-variance weights per column from observed entries
  const weights: number[] = [];
  for (let j = 0; j < n; j++) {
    const obs: number[] = [];
    for (let i = 0; i < m; i++) {
      const v = M[i]![j];
      if (v !== null && v !== undefined) obs.push(v);
    }
    const mean = obs.reduce((a, b) => a + b, 0) / Math.max(obs.length, 1);
    const va = obs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(obs.length, 1);
    weights.push(1 / (va + 1e-6));
  }
  let U = Array.from({ length: m }, () =>
    Array.from({ length: rank }, () => (rand() - 0.5) * 0.1),
  );
  let V = Array.from({ length: n }, () =>
    Array.from({ length: rank }, () => (rand() - 0.5) * 0.1),
  );
  for (let it = 0; it < iters; it++) {
    // update U rows
    for (let i = 0; i < m; i++) {
      const idx: number[] = [];
      for (let j = 0; j < n; j++) {
        const v = M[i]![j];
        if (v !== null && v !== undefined) idx.push(j);
      }
      if (idx.length === 0) continue;
      const A: number[][] = Array.from({ length: rank }, () => new Array<number>(rank).fill(0));
      const b = new Array<number>(rank).fill(0);
      for (const j of idx) {
        const w = weights[j]!;
        const vj = V[j]!;
        for (let a = 0; a < rank; a++) {
          b[a]! += w * vj[a]! * M[i]![j]!;
          for (let c = 0; c < rank; c++) A[a]![c]! += w * vj[a]! * vj[c]!;
        }
      }
      for (let a = 0; a < rank; a++) A[a]![a]! += ridge;
      U[i] = solveLinear(A, b);
    }
    // update V rows
    for (let j = 0; j < n; j++) {
      const idx: number[] = [];
      for (let i = 0; i < m; i++) {
        const v = M[i]![j];
        if (v !== null && v !== undefined) idx.push(i);
      }
      if (idx.length === 0) continue;
      const A: number[][] = Array.from({ length: rank }, () => new Array<number>(rank).fill(0));
      const b = new Array<number>(rank).fill(0);
      const w = weights[j]!;
      for (const i of idx) {
        const ui = U[i]!;
        for (let a = 0; a < rank; a++) {
          b[a]! += w * ui[a]! * M[i]![j]!;
          for (let c = 0; c < rank; c++) A[a]![c]! += w * ui[a]! * ui[c]!;
        }
      }
      for (let a = 0; a < rank; a++) A[a]![a]! += ridge;
      V[j] = solveLinear(A, b);
    }
  }
  return U.map((ui) =>
    V.map((vj) => ui.reduce((s, x, a) => s + x * vj[a]!, 0)),
  );
}

/** Top-k right singular vectors of A by power iteration with deflation on A'A. */
function topRightSingularVectors(A: number[][], k: number, iters = 200): number[][] {
  const n = A[0]!.length;
  // G = A' A
  let G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const row of A) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) G[i]![j]! += row[i]! * row[j]!;
    }
  }
  const vecs: number[][] = [];
  for (let v = 0; v < k; v++) {
    let x: number[] = Array.from({ length: n }, (_, i) => (i === v % n ? 1 : 0.01));
    for (let t = 0; t < iters; t++) {
      const y = G.map((grow) => grow.reduce((s, g, j) => s + g * x[j]!, 0));
      const norm = Math.sqrt(y.reduce((s, yy) => s + yy * yy, 0)) || 1;
      x = y.map((yy) => yy / norm);
    }
    vecs.push(x);
    const lambda = x.reduce((s, xi, i) => s + xi * G[i]!.reduce((ss, g, j) => ss + g * x[j]!, 0), 0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) G[i]![j]! -= lambda * x[i]! * x[j]!;
    }
  }
  return vecs;
}

/**
 * Three-number specialization embedding per player (row): [level,
 * specialization-axis-1, specialization-axis-2] — the analogues of the
 * paper's lambda_1 (level), lambda_2 (possession-vs-explosive), lambda_3
 * (role/scheme) SVD embedding, as prop-model features.
 */
export function specializationEmbedding(completed: number[][]): number[][] {
  const m = completed.length;
  const colMean = completed[0]!.map((_, j) => completed.reduce((s, r) => s + r[j]!, 0) / m);
  const centered = completed.map((row) => row.map((v, j) => v - colMean[j]!));
  const [v1, v2] = topRightSingularVectors(centered, 2);
  return completed.map((row, i) => {
    const c = centered[i]!;
    const level = row.reduce((s, v) => s + v, 0) / row.length;
    return [level, c.reduce((s, v, j) => s + v * v1![j]!, 0), c.reduce((s, v, j) => s + v * v2![j]!, 0)];
  });
}

/** RMSE of imputed entries against ground truth (for gate-style bake-offs). */
export function imputationRmse(
  completed: number[][],
  truth: number[][],
  mask: boolean[][],
): number {
  let se = 0;
  let n = 0;
  for (let i = 0; i < truth.length; i++) {
    for (let j = 0; j < truth[0]!.length; j++) {
      if (mask[i]![j]) {
        se += (completed[i]![j]! - truth[i]![j]!) ** 2;
        n++;
      }
    }
  }
  return Math.sqrt(se / Math.max(n, 1));
}
