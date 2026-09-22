/**
 * Bayesian hierarchical model of line movement vs P&L — arXiv 2506.13687
 * ("Bayesian Hierarchical Modeling of Line Movement and...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published probabilities and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: hierarchical Bayesian model of how line movement
 * predicts realized P&L: P&L | stake ~ Normal(mu_s + beta_s * line_move,
 * sigma_s) with stratum-level (mu_s, beta_s) shrunk toward global means
 * (strata = market type x week-half x favorite/dog). Serving-time math:
 * conjugate normal posterior updates per stratum, hierarchical shrinkage
 * of thin strata, and the expected-P&L adjustment applied to a pick's
 * edge before sizing.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff the line-movement
 * adjustment improves out-of-sample log-loss of P&L sign (or realized
 * profit) by >=5% relative on the 2025 holdout vs the no-adjustment
 * baseline, with stratum posteriors stable (posterior sd shrinking in n).
 */

export interface StratumPosterior {
  /** Posterior mean of the stratum intercept mu_s. */
  readonly mu: number;
  /** Posterior variance of mu_s. */
  readonly muVar: number;
  /** Posterior mean of the line-move slope beta_s. */
  readonly beta: number;
  /** Posterior variance of beta_s. */
  readonly betaVar: number;
  readonly n: number;
}

/**
 * Conjugate normal-normal update for one scalar parameter.
 * Returns { mean, variance } of the posterior.
 */
export function normalPosterior(
  priorMean: number,
  priorVar: number,
  sampleMean: number,
  sampleVar: number,
  n: number,
): { readonly mean: number; readonly variance: number } {
  if (!(priorVar > 0)) return { mean: priorMean, variance: 0 };
  if (n <= 0 || !(sampleVar > 0)) return { mean: priorMean, variance: priorVar };
  const priorPrec = 1 / priorVar;
  const likePrec = n / sampleVar;
  const postVar = 1 / (priorPrec + likePrec);
  return {
    mean: postVar * (priorPrec * priorMean + likePrec * sampleMean),
    variance: postVar,
  };
}

/**
 * Hierarchical shrinkage: thin stratum estimates are pulled toward the
 * global mean. weight = tau^2 / (tau^2 + sigma^2 / n).
 */
export function shrinkageEstimate(
  groupMean: number,
  globalMean: number,
  groupN: number,
  betweenVar: number,
  withinVar: number,
): number {
  if (groupN <= 0 || !(withinVar > 0)) return globalMean;
  const w = betweenVar / (betweenVar + withinVar / groupN);
  return w * groupMean + (1 - w) * globalMean;
}

/**
 * Signed line movement toward the pick: positive means the market moved
 * with us (e.g. spread shortened for our favorite). Convention:
 * movement = openLine - currentLine for favorites (line drop = steam),
 * documented per-market at the call site.
 */
export function signedLineMovement(openLine: number, currentLine: number): number {
  return openLine - currentLine;
}

/**
 * Expected P&L adjustment for a pick given its stratum posterior and
 * observed line movement: E[P&L] = mu_s + beta_s * movement.
 */
export function expectedPnlAdjustment(
  posterior: Pick<StratumPosterior, "mu" | "beta">,
  lineMovement: number,
): number {
  return posterior.mu + posterior.beta * lineMovement;
}

/** Posterior predictive sd for the P&L of one unit stake. */
export function predictiveSd(
  posterior: Pick<StratumPosterior, "muVar" | "betaVar">,
  lineMovement: number,
  residualSd: number,
): number {
  return Math.sqrt(
    posterior.muVar + lineMovement * lineMovement * posterior.betaVar + residualSd * residualSd,
  );
}
