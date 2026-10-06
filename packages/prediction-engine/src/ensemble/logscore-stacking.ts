/**
 * PSIS-based log-score stacking of Bayesian predictive distributions.
 *
 * Replaces BMA/BMA-like weighting over GSE's heterogeneous sports models
 * with stacking: choose simplex weights maximizing the held-out log score
 * of the combined predictive distribution, warm-started from Pseudo-BMA+
 * (Bayesian-bootstrap regularized elpd weights). Immune to the
 * duplicate-model pathology that breaks BMA; combines full predictive
 * distributions for calibration and staking. Implementation is one
 * log-likelihood matrix away from production.
 *
 * @see arXiv:1704.02030 — "Using stacking to average Bayesian predictive distributions"
 *
 * ACCEPTANCE GATE: ADOPT log-score stacking over BMA iff on the 2024
 * walk-forward it beats BMA/Pseudo-BMA on mean log score with no
 * weight-collapse pathology (no single model absorbing > 90% weight across
 * all weeks); per the paper's simulations, stacking wins in M-open on every
 * simulation. The gate is a backtest concern; this module is the pure
 * stacking kernel, not wired into any live path.
 */

/**
 * Project a vector onto the probability simplex (Duchi et al.).
 */
export function projectSimplex(v: readonly number[]): number[] {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let rho = 0;
  for (let j = 0; j < n; j++) {
    css += u[j] ?? 0;
    if ((u[j] ?? 0) + (1 - css) / (j + 1) > 0) rho = j + 1;
  }
  let s = 0;
  for (let j = 0; j < rho; j++) s += u[j] ?? 0;
  const t = (s - 1) / Math.max(1, rho);
  return v.map((x) => Math.max(0, x - t));
}

/**
 * Pseudo-BMA+ weights: softmax of Bayesian-bootstrap-regularized elpd.
 * (Regularization: elpd − se(elpd); the bootstrap itself lives in the
 * fitting harness — here we take elpd and se as inputs.)
 */
export function pseudoBmaPlus(
  elpd: readonly number[],
  se: readonly number[],
): number[] {
  if (elpd.length !== se.length || elpd.length === 0) {
    throw new Error("pseudoBmaPlus: length mismatch/empty");
  }
  const reg = elpd.map((e, i) => e - (se[i] ?? 0));
  const max = Math.max(...reg);
  const w = reg.map((r) => Math.exp(r - max));
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / total);
}

/**
 * Log-score stacking: maximize Σ_i log(Σ_k w_k · p_{ik}) over the simplex,
 * where lpdPointwise[i][k] = log p(y_i | M_k). Solved by projected gradient
 * ascent (concave objective → global optimum).
 */
export function stackingWeights(
  lpdPointwise: ReadonlyArray<readonly number[]>,
  init?: readonly number[],
  iters = 2000,
  step = 1.0,
): number[] {
  const n = lpdPointwise.length;
  if (n === 0) throw new Error("stackingWeights: empty lpd matrix");
  const k = lpdPointwise[0]?.length ?? 0;
  let w = init && init.length === k ? [...init] : new Array<number>(k).fill(1 / k);
  const logLiks = lpdPointwise.map((row) => row.map((lp) => Math.exp(Math.min(0, lp))));
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(k).fill(0);
    for (let i = 0; i < n; i++) {
      const row = logLiks[i] ?? [];
      let mix = 0;
      for (let j = 0; j < k; j++) mix += (w[j] ?? 0) * (row[j] ?? 0);
      if (mix <= 0) continue;
      for (let j = 0; j < k; j++) grad[j]! += (row[j] ?? 0) / mix / n;
    }
    w = projectSimplex(w.map((x, j) => x + step * (grad[j] ?? 0)));
    step *= 0.999;
  }
  return w;
}

/** Mean log score of the stacked predictive distribution. */
export function stackedLogScore(
  lpdPointwise: ReadonlyArray<readonly number[]>,
  weights: readonly number[],
): number {
  let s = 0;
  for (const row of lpdPointwise) {
    let mix = 0;
    for (let j = 0; j < weights.length; j++) {
      mix += (weights[j] ?? 0) * Math.exp(Math.min(0, row[j] ?? -Infinity));
    }
    s += Math.log(Math.max(1e-300, mix));
  }
  return s / Math.max(1, lpdPointwise.length);
}
