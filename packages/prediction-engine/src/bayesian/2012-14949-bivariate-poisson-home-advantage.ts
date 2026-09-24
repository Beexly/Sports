/**
 * arXiv 2012.14949: Estimating the change in soccer's home advantage during the Covid-19 pandemic using bivariate Poisson regression
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build gse.scores.BivariatePoissonHA: per-season NFL fit -- (home points, away points) ~ BP with log lambda_1 = mu_s + T_s + alpha_H + delta_A, log lambda_2 = mu_s + alpha_A + delta_H; team attack/defense random effects; T_s = season home advantage; extensions: within-season time-varying strengths (state-space), lambda_3 estimated not fixed, COVID-2020 season as T'_2020 with posterior P(decline) -- direct replication of the paper's natural experiment on NFL data; posterior attack/defense strengths as spread/total features.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build gse.scores.BivariatePoissonHA: per-season NFL fit -- (home points, away points) ~ BP with log lambda_1 = mu_s + T_s + alpha_H + delta_A, log lambda_2 = mu_s + alpha_A + delta_H; team attack/defense random effects; T_s = season home advantage; extensions: (a) within-season time-varying strengths (state-space); (b) lambda_3 estimated not fixed; (c) COVID-2020 season as T'_2020 with posterior P(decline) -- direct replication of the paper's natural experiment on NFL data; use posterior attack/defense strengths as features for spread/total models.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT->keep if: simulation replication shows MAB(T-hat) <= 0.10 and >=50% bias reduction vs linear regression AND 2020-season holdout predictive log-likelihood beats GSE's current score model by >= 0.01 nats/game. Fail -> REJECT.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Bivariate Poisson PMF via the common-shock convolution sum. */
export function bivPoissonPmf(x: number, y: number, l1: number, l2: number, l3: number): number {
  let s = 0;
  const m = Math.min(x, y);
  for (let k = 0; k <= m; k++) {
    s += bivPoissonTerm(x, y, k, l1, l2, l3);
  }
  return s;
}

function bivPoissonTerm(x: number, y: number, k: number, l1: number, l2: number, l3: number): number {
  const t = Math.exp(-(l1 + l2 + l3)) * (l1 ** (x - k)) * (l2 ** (y - k)) * (l3 ** k);
  let den = 1;
  for (let i = 2; i <= x - k; i++) den *= i;
  for (let i = 2; i <= y - k; i++) den *= i;
  for (let i = 2; i <= k; i++) den *= i;
  return t / den;
}

/** Bivariate Poisson sampler (common-shock construction). */
export function bivPoissonSample(
  rand: () => number,
  l1: number,
  l2: number,
  l3: number,
  poissonSampleFn: (rand: () => number, lambda: number) => number,
): [number, number] {
  const z3 = poissonSampleFn(rand, l3);
  return [poissonSampleFn(rand, l1) + z3, poissonSampleFn(rand, l2) + z3];
}

/** Dixon-Coles rho correction factor for low scores. */
export function dixonColesTau(x: number, y: number, lx: number, ly: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lx * ly * rho;
  if (x === 0 && y === 1) return 1 + lx * rho;
  if (x === 1 && y === 0) return 1 + ly * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}
