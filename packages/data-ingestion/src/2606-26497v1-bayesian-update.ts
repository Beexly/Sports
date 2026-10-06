/**
 * Learning Probabilistic Filters with Strictly Proper Scoring Rules
 *
 * arXiv:2606.26497v1 · lane:bayesian · verdict:ADAPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Conjugate Bayesian updates: Beta-Binomial for rates (successes/trials) and Normal-Normal for means (prior + n observations), plus 95% credible intervals.
 *
 * Improvement (record):
 * Train an energy-score (beta=1) neural ensemble filter as GSE's live probabilistic game-state updater (score/timeouts/field-position dynamics), benchmarked against bootstrap particle and ensemble Kalman filters, serving with N<=100 ensemble members at inference; test on a misspecified simulator with an online recalibration head to measure the real-world robustness gap.
 *
 * ACCEPTANCE GATE:
 * ADAPT into a GSE game-state module if the energy-score-trained NN filter matches the particle filter within 5% energy-score on simulated NFL game-state trajectories with N≤100 at inference time.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: Bayesian updater. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2606.26497v1" as const;
export const LANE = "bayesian" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT into a GSE game-state module if the energy-score-trained NN filter matches the particle filter within 5% energy-score on simulated NFL game-state trajectories with N≤100 at inference time.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Beta posterior after observing successes/trials. */
export interface BetaPosterior {
  alpha: number;
  beta: number;
  mean: number;
}

/** Normal posterior after n observations. */
export interface NormalPosterior {
  mean: number;
  var: number;
}

/** Beta-Binomial conjugate update for a rate parameter. */
export function betaBinomialUpdate(
  alpha: number,
  beta: number,
  successes: number,
  trials: number,
): BetaPosterior | null {
  if (!isFiniteNumber(alpha) || alpha <= 0 || !isFiniteNumber(beta) || beta <= 0) return null;
  if (!Number.isInteger(successes) || !Number.isInteger(trials)) return null;
  if (successes < 0 || successes > trials) return null;
  const a = alpha + successes;
  const b = beta + trials - successes;
  return { alpha: a, beta: b, mean: a / (a + b) };
}

/** Normal-Normal conjugate update for a mean parameter. */
export function normalNormalUpdate(
  priorMean: number,
  priorVar: number,
  obsMean: number,
  obsVar: number,
  n: number,
): NormalPosterior | null {
  if (!isFiniteNumber(priorMean) || !isFiniteNumber(obsMean)) return null;
  if (!isFiniteNumber(priorVar) || priorVar <= 0) return null;
  if (!isFiniteNumber(obsVar) || obsVar <= 0) return null;
  if (!Number.isInteger(n) || n <= 0) return null;
  const postVar = 1 / (1 / priorVar + n / obsVar);
  const postMean = postVar * (priorMean / priorVar + (n * obsMean) / obsVar);
  return { mean: postMean, var: postVar };
}

/** Symmetric 95% credible interval for a normal posterior. */
export function credibleInterval95(mean: number, sd: number): [number, number] | null {
  if (!isFiniteNumber(mean) || !isFiniteNumber(sd) || sd < 0) return null;
  return [mean - 1.96 * sd, mean + 1.96 * sd];
}
