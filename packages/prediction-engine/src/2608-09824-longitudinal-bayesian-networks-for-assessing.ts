/**
 * arXiv:2608.09824 — Longitudinal Bayesian networks for assessing team performance in the National Basketball Association
 *
 * Dynamic longitudinal Bayesian network for fantasy: AR(1) usage across weeks, player random effects,
 * active/snap/attempts/makes nodes with a participation submodel for injury-news conditioning and reverse
 * queries.
 *
 * Improvement: Fit a dynamic longitudinal Bayesian network (AR(1) usage across weeks, player random effects, active/snap/attempts/makes nodes with a participation submodel) to NFL player-game data in Stan or NIMBLE to serve weekly fantasy projections with full posterior uncertainty and reverse queries for injury-news conditioning.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the dynamic-LBN-with-AR-usage pattern and the participation submodel if the AR variant beats static on 2025 held-out log-likelihood AND predictive intervals calibrate; REJECT the hidden-Markov variant unless it beats the AR variant on LOO; REJECT literal replication of the 1M-iteration MCMC — use modern scalable inference.
 */

/** Weekly player-game node values. */
export interface PlayerWeek {
  /** AR(1) usage latent state. */
  usage: number;
  active: boolean;
  snaps: number;
  attempts: number;
  makes: number;
}

/** LBN parameters. */
export interface LbnParams {
  /** AR(1) persistence of usage. */
  phi: number;
  /** Usage innovation sd. */
  sigmaU: number;
  /** Player random-effect sd. */
  sigmaPlayer: number;
  /** Participation (active) intercept + injury loading. */
  partIntercept: number;
  partInjuryLoading: number;
}

/** AR(1) usage forecast: E[usage_t | usage_{t-1}] = phi*usage_{t-1}. */
export function forecastUsage(p: LbnParams, prevUsage: number, playerEffect: number): number {
  return p.phi * prevUsage + playerEffect;
}

/**
 * Participation submodel: P(active | injury news) via logistic.
 * injuryNews in [0,1] (1 = confirmed out-risk).
 */
export function participationProb(p: LbnParams, injuryNews: number): number {
  if (injuryNews < 0 || injuryNews > 1) throw new Error("participationProb: injuryNews in [0,1]");
  const eta = p.partIntercept + p.partInjuryLoading * injuryNews;
  return 1 / (1 + Math.exp(-eta));
}

/**
 * Posterior predictive mean for fantasy points: usage * per-attempt rate,
 * gated by participation probability (the reverse-query conditioning point).
 */
export function fantasyPointMean(
  p: LbnParams,
  prevUsage: number,
  playerEffect: number,
  pointsPerAttempt: number,
  injuryNews: number,
): number {
  const usage = Math.max(0, forecastUsage(p, prevUsage, playerEffect));
  return participationProb(p, injuryNews) * usage * pointsPerAttempt;
}
