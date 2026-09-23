/**
 * arXiv:2608.28116v1 — Generalized Gibbs Ensemble Weighting
 *
 * Online Gibbs weighter over engine-component game probabilities: log-loss/Brier-normalized losses with
 * exponentiated-gradient simplex updates each week plus Local-UCB over (eta, lambda, variant) — a hybrid
 * weighting layer alongside the batch Gibbs stacker.
 *
 * Improvement: Implement an online Gibbs weighter over GSE's engine-component game probabilities: log-loss/Brier-normalized losses with exponentiated-gradient simplex updates each week plus Local-UCB over (eta, lambda, variant), running alongside the batch Gibbs stacker as prior for a hybrid weighting layer.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the online Gibbs weighter if it beats plain exponential weighting by >=0.003 log-loss on 2025 walk-forward (DM p<0.05) and beats or ties the batch Gibbs stacker; REJECT entirely if it cannot beat plain exponential weighting; stability veto: UCB-selected (eta,lambda) changing >50% of weeks requires a smoothing fix before shipping.
 */

/** Exponentiated-gradient simplex update (the online Gibbs core). */
export function egUpdate(
  weights: readonly number[],
  losses: readonly number[],
  eta: number,
): number[] {
  if (weights.length !== losses.length) throw new Error("egUpdate: length mismatch");
  if (eta < 0) throw new Error("egUpdate: eta >= 0");
  const raw = weights.map((w, i) => Math.max(1e-12, w) * Math.exp(-eta * (losses[i] ?? 0)));
  const z = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / z);
}

/** Normalize losses to [0,1] across components (log-loss/Brier scale-free). */
export function normalizeLosses(losses: readonly number[]): number[] {
  if (losses.length === 0) throw new Error("normalizeLosses: no losses");
  const mn = Math.min(...losses);
  const mx = Math.max(...losses);
  if (mx - mn < 1e-12) return losses.map(() => 0.5);
  return losses.map((l) => (l - mn) / (mx - mn));
}

/**
 * Local-UCB arm selection over (eta, lambda, variant) configs:
 * pick argmax(mean - kappa * sd_of_neighbors)? Standard UCB on config means.
 */
export function localUcbPick(
  configMeans: readonly number[],
  configCounts: readonly number[],
  totalPulls: number,
  kappa = 2,
): number {
  if (configMeans.length !== configCounts.length || configMeans.length === 0) {
    throw new Error("localUcbPick: length mismatch");
  }
  let best = 0;
  let bestUcb = -Infinity;
  for (let i = 0; i < configMeans.length; i++) {
    const n = configCounts[i] ?? 0;
    const ucb = n === 0 ? Infinity : (configMeans[i] ?? 0) + kappa * Math.sqrt(Math.log(Math.max(1, totalPulls)) / n);
    if (ucb > bestUcb) { bestUcb = ucb; best = i; }
  }
  return best;
}
