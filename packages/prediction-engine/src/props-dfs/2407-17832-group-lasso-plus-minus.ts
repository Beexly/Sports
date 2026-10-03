/**
 * arXiv 2407.17832: Regularized Adjusted Plus-Minus Models for Evaluating and Scouting Football (Soccer) Players using Possession Sequences
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Rebuild GSE's drive-level NFL player ratings as group-lasso regularized plus-minus on possession segments (position-group penalties, separating on-ball and off-ball contributions) with expected-points value targets instead of binary indicators, using the train-ratings->predict-games validity protocol to turn player ratings into game predictions.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Rebuild GSE's drive-level NFL player ratings as group-lasso regularized plus-minus on possession segments (position-group penalties, separating on-ball and off-ball contributions) with expected-points value targets instead of binary indicators, using the train-ratings→predict-games validity protocol to turn player ratings into game predictions.
 *
 * ACCEPTANCE GATE (verbatim):
 * Rebuild on one NFL season of drive data: require group lasso ≥ ridge on Brier score for held-out games, and both significantly better than an ELO-only baseline at 10% (paired t-test); improvement experiment success = Brier-score improvement ≥ 5% over the goal-indicator version.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Block soft-thresholding for one group (group-lasso proximal step). */
export function groupSoftThreshold(beta: number[], t: number): number[] {
  const norm = Math.sqrt(beta.reduce((s, b) => s + b * b, 0));
  if (norm <= t) return beta.map(() => 0);
  const scale = 1 - t / norm;
  return beta.map((b) => b * scale);
}

/**
 * Group lasso via block coordinate descent.
 * groups[i] = group id of feature i (0-based). X rows = observations.
 */
export function groupLassoFit(
  X: number[][],
  y: number[],
  groups: number[],
  lambda: number,
  iters = 150,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  const beta = new Array<number>(p).fill(0);
  const gIds = [...new Set(groups)].sort((a, b) => a - b);
  for (let it = 0; it < iters; it++) {
    for (const g of gIds) {
      const idx: number[] = [];
      for (let j = 0; j < p; j++) if (groups[j] === g) idx.push(j);
      // least-squares fit of residual on group block, then block soft-threshold
      const XtX: number[][] = idx.map(() => new Array<number>(idx.length).fill(0));
      const Xtr = new Array<number>(idx.length).fill(0);
      for (let i = 0; i < n; i++) {
        let resid = y[i]!;
        for (let j = 0; j < p; j++) resid -= X[i]![j]! * beta[j]!;
        for (let a = 0; a < idx.length; a++) {
          Xtr[a]! += X[i]![idx[a]!]! * (resid + X[i]![idx[a]!]! * beta[idx[a]!]!);
          for (let b = 0; b < idx.length; b++) XtX[a]![b]! += X[i]![idx[a]!]! * X[i]![idx[b]!]!;
        }
      }
      // Block-coordinate update for (1/2)||r - X_g b||^2 + lambda||b||_2:
      // shrink the LS fit by (1 - lambda/||X_g' r||)_+. The threshold acts
      // on the score norm ||X_g' r|| (scale ~n), not on ||LS|| (scale ~1).
      const scoreNorm = Math.hypot(...Xtr);
      const ls = solveLinearGroup(XtX, Xtr);
      const scale = scoreNorm <= lambda ? 0 : 1 - lambda / scoreNorm;
      for (let a = 0; a < idx.length; a++) beta[idx[a]!] = scale * ls[a]!;
    }
  }
  return beta;
}

function solveLinearGroup(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c] ?? 0) > Math.abs(M[piv]![c] ?? 0)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c] ?? 0;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]![c] ?? 0) / d;
      for (let k = c; k <= n; k++) M[r]![k] = (M[r]![k] ?? 0) - f * (M[c]![k] ?? 0);
    }
  }
  return M.map((row, i) => {
    const d = row[i] ?? 0;
    return (row[n] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
  });
}
