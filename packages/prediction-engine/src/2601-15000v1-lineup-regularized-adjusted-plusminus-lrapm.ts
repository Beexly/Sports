/**
 * arXiv:2601.15000v1 — Lineup Regularized Adjusted Plus-Minus (L-RAPM): Basketball Lineup Ratings with Informed Priors
 *
 * G-RAPM: group-adjusted EPA for sparse offensive personnel packages and receiver units — noisy
 * small-sample group means shrunk toward a member-rating prior (empirical-Bayes style) so sparse groups are
 * never rated worse than raw EPA/play.
 *
 * Improvement: GSE builds G-RAPM: group-adjusted EPA for sparse offensive personnel packages and receiver units, shrinking noisy small-sample estimates toward a member-rating prior so sparse groups are never rated worse than raw EPA/play.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt if on 2021-2024 G-RAPM beats raw group EPA/play on out-of-sample RMSE for sparse groups (<50 plays) in at least 3 of 4 seasons with >=3% relative improvement in the sparse bin and no bin underperforming by >1%.
 */

/** Arithmetic mean. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean: empty");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Population standard deviation. */
export function std(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("std: empty");
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

/** Raw group EPA/play. */
export function groupEpaPerPlay(epa: readonly number[]): number {
  if (epa.length === 0) throw new Error("groupEpaPerPlay: empty");
  return mean(epa);
}

/** Member-rating prior: mean of the members' individual EPA/play ratings. */
export function memberPrior(memberRatings: readonly number[]): number {
  if (memberRatings.length === 0) throw new Error("memberPrior: no members");
  return mean(memberRatings);
}

/**
 * Empirical-Bayes shrinkage: (n/(n+k)) * raw + (k/(n+k)) * prior.
 * k = prior strength in pseudo-plays.
 */
export function shrinkEstimate(raw: number, prior: number, n: number, k: number): number {
  if (n < 0 || k < 0) throw new Error("shrinkEstimate: n, k >= 0");
  if (n + k === 0) throw new Error("shrinkEstimate: n + k > 0");
  return (n / (n + k)) * raw + (k / (n + k)) * prior;
}

/** G-RAPM rating for one personnel group. */
export function grapm(
  groupEpa: readonly number[],
  memberRatings: readonly number[],
  priorStrength: number,
): number {
  return shrinkEstimate(groupEpaPerPlay(groupEpa), memberPrior(memberRatings), groupEpa.length, priorStrength);
}

/** Out-of-sample RMSE. */
export function rmse(pred: readonly number[], actual: readonly number[]): number {
  if (pred.length !== actual.length || pred.length === 0) throw new Error("rmse: length mismatch or empty");
  return Math.sqrt(mean(pred.map((p, i) => (p - (actual[i] ?? 0)) ** 2)));
}

/** Relative improvement of candidate RMSE over baseline RMSE. */
export function relImprovement(baseRmse: number, candRmse: number): number {
  if (baseRmse <= 0) throw new Error("relImprovement: baseRmse > 0");
  return (baseRmse - candRmse) / baseRmse;
}
