/**
 * A Bayesian circular mixed-effects model for explaining variability in directional movement in American football
 *
 * arXiv:2507.06122 · lane:bayesian · verdict:ADAPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Conjugate Bayesian updates: Beta-Binomial for rates (successes/trials) and Normal-Normal for means (prior + n observations), plus 95% credible intervals.
 *
 * Improvement (record):
 * GSE extracts a per-season 'shiftiness' feature for RBs/WRs from von Mises mixed-effects models of ball-carrier movement on tracking data, predicting next-season YAC and missed-tackle rate.
 *
 * ACCEPTANCE GATE:
 * ADOPT if adding the shiftiness feature improves out-of-sample prediction of next-season YAC/attempt or missed-tackle rate over the current RB/WR feature set by >=0.02 R^2 (or significant at alpha=0.05); REJECT if no stable year-over-year signal.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: Bayesian updater. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2507.06122" as const;
export const LANE = "bayesian" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if adding the shiftiness feature improves out-of-sample prediction of next-season YAC/attempt or missed-tackle rate over the current RB/WR feature set by >=0.02 R^2 (or significant at alpha=0.05); REJECT if no stable year-over-year signal.`;

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
