/**
 * arXiv:2607.18009v1 — Bayesian Conway-Maxwell-Poisson model with spike-and-slab priors for dispersed count data with application to football scores
 *
 * P-SR probabilistic symbolic regression for equations with honest uncertainty: each discovered equation
 * ships with coefficient credible intervals and a posterior over equation structures (not a point
 * estimate).
 *
 * Improvement: Port the CMP spike-and-slab model to NFL team points (starting from the released repo code, adding Dixon-Coles score-dependence and exponential recency weighting) as a challenger to GSE v5.2.7's totals predictions, replacing full MCMC with a Laplace/VI approximation for production.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT into the GSE totals pipeline if CMP-SAS beats the Poisson-Maher baseline on out-of-sample IGN for totals in >=2 of 3 seasons AND identifies >=3 teams/season with P(Z_i=1)>0.5 (dispersion heterogeneity exists in NFL scoring); REJECT if no team crosses the 0.5 threshold in any season or IGN gains vanish.
 */

/** One equation in the posterior structure ensemble. */
export interface PosteriorEquation {
  /** Human-readable equation text. */
  text: string;
  /** Posterior probability of this structure. */
  prob: number;
  /** Coefficient credible intervals, aligned with the equation's terms. */
  coefIntervals: [number, number][];
}

/** Normalize structure probabilities to sum to 1. */
export function normalizePosterior(eqs: readonly PosteriorEquation[]): PosteriorEquation[] {
  const z = eqs.reduce((s, e) => s + e.prob, 0);
  if (z <= 0) throw new Error("normalizePosterior: non-positive total probability");
  return eqs.map((e) => ({ ...e, prob: e.prob / z }));
}

/**
 * Posterior-predictive mean and variance at a point: mixture over structures,
 * where each structure contributes its point prediction and interval-implied
 * variance. predictions[i] = structure i's point prediction.
 */
export function posteriorPredictive(
  eqs: readonly PosteriorEquation[],
  predictions: readonly number[],
): { mean: number; variance: number } {
  if (eqs.length !== predictions.length || eqs.length === 0) {
    throw new Error("posteriorPredictive: length mismatch");
  }
  const normed = normalizePosterior(eqs);
  const mean = normed.reduce((s, e, i) => s + e.prob * (predictions[i] ?? 0), 0);
  let variance = 0;
  normed.forEach((e, i) => {
    const p = predictions[i] ?? 0;
    // Within-structure variance from the widest coefficient interval.
    const w = e.coefIntervals.length > 0
      ? Math.max(...e.coefIntervals.map(([lo, hi]) => ((hi - lo) / 4) ** 2))
      : 0;
    variance += e.prob * (w + (p - mean) ** 2);
  });
  return { mean, variance };
}

/**
 * Honest-uncertainty gate: every structure with prob >= minProb must have all
 * coefficient intervals bounded (finite, lo <= hi).
 */
export function honestUncertaintyGate(
  eqs: readonly PosteriorEquation[],
  minProb = 0.05,
): boolean {
  return eqs
    .filter((e) => e.prob >= minProb)
    .every((e) =>
      e.coefIntervals.every(
        ([lo, hi]) => Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi,
      ),
    );
}
