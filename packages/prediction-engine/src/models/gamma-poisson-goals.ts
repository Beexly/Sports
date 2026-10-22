/**
 * Conjugate Gamma-Poisson goal projection.
 *
 * Prior art, not copied code: MatheusRabetti/football-data has no licence
 * file. Its README states a conjugate update:
 *   posterior = Gamma(alpha_prior + goals, beta_prior + matches)
 *   prior for a known scorer uses Jeffreys pseudocounts (+0.5)
 * The expected remaining goals below are the posterior mean times the
 * matches left. No samples are drawn.
 */

export interface GammaPoissonPosterior {
  alpha: number;
  beta: number;
  meanRate: number;
}

export function jeffreysGoalPrior(historicalGoals: number, historicalMatches: number): GammaPoissonPosterior {
  if (historicalGoals < 0 || historicalMatches < 0) {
    throw new Error("historical goals and matches must be non-negative");
  }
  const alpha = historicalGoals + 0.5;
  const beta = historicalMatches + 0.5;
  return { alpha, beta, meanRate: alpha / beta };
}

export function gammaPoissonPosterior(
  prior: GammaPoissonPosterior,
  currentGoals: number,
  matchesPlayed: number,
): GammaPoissonPosterior {
  if (currentGoals < 0 || matchesPlayed < 0) {
    throw new Error("current goals and matches played must be non-negative");
  }
  if (!(prior.alpha > 0) || !(prior.beta > 0)) {
    throw new Error("Gamma prior needs positive alpha and beta");
  }
  const alpha = prior.alpha + currentGoals;
  const beta = prior.beta + matchesPlayed;
  return { alpha, beta, meanRate: alpha / beta };
}

export function expectedSeasonGoals(
  posterior: GammaPoissonPosterior,
  currentGoals: number,
  matchesRemaining: number,
): number {
  if (matchesRemaining < 0 || currentGoals < 0) {
    throw new Error("remaining matches and current goals must be non-negative");
  }
  return currentGoals + posterior.meanRate * matchesRemaining;
}
