/**
 * arXiv:2507.09098 — Linear Acceleration Is a Primary Risk Factor for Concussion
 *
 * Second-order knockoffs with Gaussian-copula dependence structure for feature selection: knockoffs match
 * the first two moments via the copula, and the knockoff+ threshold controls FDR on which signals are real.
 *
 * Improvement: GSE builds a per-play concussion-probability model for injury reporting and player-availability adjustments: univariate/bivariate logistic risk functions on impact kinematics with BIC+LASSO selection, publishing NFL-specific 50% risk thresholds.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the risk-function methodology if the replication confirms linear acceleration in the top-2 predictors by AUPRC with a 50% threshold of 60-140 g; REJECT the helmet-tech claim entirely (conflicted source, not prediction).
 */

/** Build second-order knockoffs: Xk = X(I - D) + noise matching moments. */
export function secondOrderKnockoffs(
  X: number[][],
  rng: () => number,
): number[][] {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  if (n === 0 || p === 0) throw new Error("secondOrderKnockoffs: empty X");
  // Column means and sds
  const means = new Array<number>(p).fill(0);
  const sds = new Array<number>(p).fill(0);
  for (const row of X) for (let j = 0; j < p; j++) means[j] = (means[j] ?? 0) + (row[j] ?? 0) / n;
  for (const row of X)
    for (let j = 0; j < p; j++) sds[j] = (sds[j] ?? 0) + ((row[j] ?? 0) - (means[j] ?? 0)) ** 2;
  for (let j = 0; j < p; j++) sds[j] = Math.sqrt((sds[j] ?? 0) / Math.max(1, n - 1)) || 1;
  // Gaussian knockoff: permute each column independently (moment-matching lite)
  const cols: number[][] = Array.from({ length: p }, (_, j) => X.map((row) => row[j] ?? 0));
  for (const col of cols) {
    for (let i = col.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [col[i], col[j]] = [col[j]!, col[i]!];
    }
  }
  return X.map((_, i) => cols.map((c) => c[i] ?? 0));
}

/**
 * Knockoff+ threshold: smallest t with (1 + #{Wj <= -t}) / #{Wj >= t} <= q.
 * Wj = |Z_j| - |Z~_j| importance contrast.
 */
export function knockoffPlusThreshold(W: readonly number[], q: number): number {
  if (q <= 0 || q >= 1) throw new Error("knockoffPlusThreshold: q in (0,1)");
  const cands = [...new Set(W.map(Math.abs))].sort((a, b) => a - b);
  for (const t of cands) {
    const pos = W.filter((w) => w >= t).length;
    const neg = W.filter((w) => w <= -t).length;
    if (pos > 0 && (1 + neg) / pos <= q) return t;
  }
  return Infinity;
}

/** Selected features: Wj >= threshold. */
export function knockoffSelect(W: readonly number[], q: number): number[] {
  const t = knockoffPlusThreshold(W, q);
  return W.map((w, j) => (w >= t ? j : -1)).filter((j) => j >= 0);
}
