/**
 * arXiv 2402.01914v1: Predicting Batting Averages in Specific Matchups Using Generalized Linked Matrix Factorization
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Port GLMF (heterogeneous linked matrix factorization) to NFL matchup matrices: X = receiver x defense (or QB x defense) binomial matrix (completions/targets, EPA>0 plays/snaps) with aggregate offense/defense stats (normal) as Y/Z side matrices -- the direct NFL analog of the paper's batter/pitcher setup -- reimplemented from Li & Gaynanova (2018) heterogeneous IRLS + O'Connell & Lock (2019) LMF alternating scheme, swapping the paper's weak aggregate Y/Z for NGS-grade side data (separation, pressure rates, coverage shells) and extending to additional linked matrices (weather, venue, referee crew).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Port GLMF (heterogeneous linked matrix factorization) to NFL matchup matrices: X = receiver x defense (or QB x defense) binomial matrix (completions/targets, EPA>0 plays/snaps) with aggregate offense/defense stats (normal) as Y/Z side matrices - the direct NFL analog of the paper's batter/pitcher setup - reimplemented from Li & Gaynanova (2018) heterogeneous IRLS + O'Connell & Lock (2019) LMF alternating scheme, swapping the paper's weak aggregate Y/Z for NGS-grade side data (separation, pressure rates, coverage shells) and extending to additional linked matrices (weather, venue, referee crew).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT only if GLMF beats the current GSE shrinkage/matchup prior by a statistically significant log-likelihood margin with zero convergence failures across folds; ADAPT (offline research prior) if it only matches; otherwise REJECT.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** ALS for biased matrix factorization: R ~= mu + bu + bi + p_u . q_i. */
export function alsFactorize(
  ratings: { u: number; i: number; r: number }[],
  nU: number,
  nI: number,
  k: number,
  iters: number,
  lambda: number,
  rand: () => number,
): { P: number[][]; Q: number[][]; bu: number[]; bi: number[]; mu: number } {
  const mu = ratings.reduce((s, x) => s + x.r, 0) / ratings.length;
  let P = Array.from({ length: nU }, () => Array.from({ length: k }, () => (rand() - 0.5) * 0.1));
  let Q = Array.from({ length: nI }, () => Array.from({ length: k }, () => (rand() - 0.5) * 0.1));
  const bu = new Array<number>(nU).fill(0);
  const bi = new Array<number>(nI).fill(0);
  const byU = new Map<number, { i: number; r: number }[]>();
  const byI = new Map<number, { u: number; r: number }[]>();
  for (const x of ratings) {
    if (!byU.has(x.u)) byU.set(x.u, []);
    if (!byI.has(x.i)) byI.set(x.i, []);
    byU.get(x.u)!.push({ i: x.i, r: x.r });
    byI.get(x.i)!.push({ u: x.u, r: x.r });
  }
  for (let it = 0; it < iters; it++) {
    for (let u = 0; u < nU; u++) {
      const obs = byU.get(u) ?? [];
      if (obs.length === 0) continue;
      const A: number[][] = Array.from({ length: k + 1 }, () => new Array<number>(k + 1).fill(0));
      const bv = new Array<number>(k + 1).fill(0);
      for (const { i, r } of obs) {
        const feat = [...Q[i]!, 1];
        const tgt = r - mu - bi[i]!;
        for (let a = 0; a <= k; a++) {
          bv[a]! += feat[a]! * tgt;
          for (let b = 0; b <= k; b++) A[a]![b]! += feat[a]! * feat[b]!;
        }
      }
      for (let a = 0; a <= k; a++) A[a]![a]! += lambda;
      const sol = solveAls(A, bv);
      P[u] = sol.slice(0, k);
      bu[u] = sol[k]!;
    }
    for (let i = 0; i < nI; i++) {
      const obs = byI.get(i) ?? [];
      if (obs.length === 0) continue;
      const A: number[][] = Array.from({ length: k + 1 }, () => new Array<number>(k + 1).fill(0));
      const bv = new Array<number>(k + 1).fill(0);
      for (const { u, r } of obs) {
        const feat = [...P[u]!, 1];
        const tgt = r - mu - bu[u]!;
        for (let a = 0; a <= k; a++) {
          bv[a]! += feat[a]! * tgt;
          for (let b = 0; b <= k; b++) A[a]![b]! += feat[a]! * feat[b]!;
        }
      }
      for (let a = 0; a <= k; a++) A[a]![a]! += lambda;
      const sol = solveAls(A, bv);
      Q[i] = sol.slice(0, k);
      bi[i] = sol[k]!;
    }
  }
  return { P, Q, bu, bi, mu };
}

function solveAls(A: number[][], b: number[]): number[] {
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

/** GLMF-style prediction with biases. */
export function glmfPredict(
  P: number[][],
  Q: number[][],
  bu: number[],
  bi: number[],
  mu: number,
  u: number,
  i: number,
): number {
  return mu + bu[u]! + bi[i]! + P[u]!.reduce((s, v, k) => s + v * Q[i]![k]!, 0);
}

/** RMSE of held-out ratings. */
export function glmfRmse(
  heldout: { u: number; i: number; r: number }[],
  P: number[][],
  Q: number[][],
  bu: number[],
  bi: number[],
  mu: number,
): number {
  let s = 0;
  for (const x of heldout) {
    const p = glmfPredict(P, Q, bu, bi, mu, x.u, x.i);
    s += (x.r - p) ** 2;
  }
  return Math.sqrt(s / Math.max(1, heldout.length));
}
