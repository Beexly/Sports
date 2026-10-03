/**
 * arXiv:2409.08172v4 — A Bayesian framework for analyzing alleged cheating in sports through hidden codes
 *
 * Likelihood-ratio game-integrity monitor: per-game LR anomaly score vs an honest baseline, extended to a
 * hierarchical model over referee crews with partial pooling so signal probability and honest baselines are
 * learned jointly across crews, including crews with little history.
 *
 * Improvement: Deploy the likelihood-ratio anomaly detector as GSE's game-integrity monitor, extended from fixed per-case priors to a hierarchical model over referee crews with partial pooling so signal probability and honest baselines are learned jointly across crews, including crews with little history.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the monitor if the LR detector catches at least as many labeled anomalous games as the z-score baseline with no more than 1/2 the false-positive rate on the 2025 weeks 1–3 window; REJECT otherwise.
 */

/** One game's officiating summary for the integrity monitor. */
export interface GameCall {
  crew: string;
  /** Observed controversial-call count. */
  calls: number;
  /** Expected count under the honest baseline. */
  expected: number;
}

/**
 * Likelihood-ratio anomaly score: log P(calls | inflated) - log P(calls | honest),
 * Poisson model with inflation factor k under the anomaly hypothesis.
 */
export function lrAnomalyScore(calls: number, expected: number, k = 2.5): number {
  if (expected <= 0 || calls < 0) throw new Error("lrAnomalyScore: expected > 0, calls >= 0");
  const lam0 = expected;
  const lam1 = k * expected;
  // log Poisson PMF difference; Stirling-free via log-gamma sum for small counts
  const logFact = (n: number): number => {
    let s = 0;
    for (let i = 2; i <= n; i++) s += Math.log(i);
    return s;
  };
  const ll = (lam: number) => calls * Math.log(lam) - lam - logFact(Math.round(calls));
  return ll(lam1) - ll(lam0);
}

/**
 * Hierarchical partial-pooling shrinkage of crew anomaly rates:
 * shrunk_i = w_i * obs_i + (1 - w_i) * global, w_i = n_i/(n_i + tau).
 */
export function pooledCrewRate(
  crewGames: number,
  crewAnomalies: number,
  globalRate: number,
  tau = 5,
): number {
  if (crewGames < 0 || globalRate < 0 || globalRate > 1) {
    throw new Error("pooledCrewRate: invalid inputs");
  }
  const obs = crewGames === 0 ? globalRate : crewAnomalies / crewGames;
  const w = crewGames / (crewGames + tau);
  return w * obs + (1 - w) * globalRate;
}

/** Flag games whose LR score clears the threshold. */
export function flagAnomalousGames(
  games: readonly GameCall[],
  threshold: number,
): GameCall[] {
  return games.filter((g) => lrAnomalyScore(g.calls, g.expected) >= threshold);
}
