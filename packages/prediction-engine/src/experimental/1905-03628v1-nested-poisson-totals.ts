/**
 * arXiv 1905.03628v1: Prediction Model for the Africa Cup of Nations 2019 via Nested Poisson Regression
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Nested conditional Poisson for in-play totals: the underdog's second-half scoring rate is conditioned on the favorite's realized first-half points (log lambda_underdog2H = gamma_0 + gamma_1*favorite strength + gamma_2*favorite 1H points), capturing garbage-time and protect-the-lead effects inside a nested Monte Carlo score simulation.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add nested conditional structure to the in-play NFL totals model: underdog second-half scoring rate conditioned on the favorite's realized first-half points (log lambda_underdog2H = gamma_0 + gamma_1*(favorite strength) + gamma_2*(favorite 1H points)) to capture garbage-time/protect-the-lead effects.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the nested conditional structure for the in-play totals model if it beats the independent-Poisson baseline on holdout log-loss by >=0.005 with gamma_2 significant (p < 0.05); reject if gamma_2 is insignificant or the gain is < 0.005.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Poisson PMF (log-space for stability). */
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** Poisson log-likelihood over observed counts. */
export function poissonLogLik(ks: readonly number[], lambdas: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < ks.length; i++) {
    const p = poissonPmf(ks[i]!, lambdas[i]!);
    s += Math.log(Math.max(1e-300, p));
  }
  return s;
}

/** Poisson MLE = sample mean. */
export function poissonMle(ks: readonly number[]): number {
  return ks.reduce((a, b) => a + b, 0) / ks.length;
}

/** Knuth's Poisson sampler. */
export function poissonSample(rand: () => number, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

/** INGARCH(1,1) conditional-mean filter for count series. */
export function ingarchFilter(
  ys: readonly number[],
  omega: number,
  alpha: number,
  beta: number,
  lam0?: number,
): number[] {
  const lam: number[] = [];
  let l = lam0 ?? Math.max(0.1, ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length));
  for (const y of ys) {
    l = omega + alpha * y + beta * l;
    lam.push(l);
  }
  return lam;
}

/** Poisson INGARCH log-likelihood. */
export function ingarchLogLik(
  ys: readonly number[],
  omega: number,
  alpha: number,
  beta: number,
): number {
  return poissonLogLik(ys, ingarchFilter(ys, omega, alpha, beta));
}

/** Conway-Maxwell-Poisson PMF (nu < 1 over-, nu > 1 under-dispersed). */
export function cmpPmf(k: number, lambda: number, nu: number, kmax = 300): number {
  let z = 0;
  for (let j = 0; j <= kmax; j++) {
    let lf = j * Math.log(Math.max(1e-300, lambda));
    for (let i = 2; i <= j; i++) lf -= nu * Math.log(i);
    z += Math.exp(lf);
    if (j > lambda * 3 + 20 && Math.exp(lf) < 1e-14 * z) break;
  }
  let lf = k * Math.log(Math.max(1e-300, lambda));
  for (let i = 2; i <= k; i++) lf -= nu * Math.log(i);
  return Math.exp(lf) / z;
}

/**
 * Nested conditional score simulator: simulate the favorite's points, then the
 * underdog's points conditional on the realized favorite score (garbage-time /
 * prevent-defense mechanism): log mu_B|A = b0 + b1*oppStrength + b2*loc + b3*G_A.
 */
export function nestedScoreSim(
  rand: () => number,
  n: number,
  favLambda: number,
  coef: { b0: number; b1: number; b2: number; b3: number },
  oppStrength: number,
  loc: number,
): { fav: number[]; dog: number[] } {
  const fav: number[] = [];
  const dog: number[] = [];
  for (let i = 0; i < n; i++) {
    const gA = poissonSample(rand, favLambda);
    const muB = Math.exp(coef.b0 + coef.b1 * oppStrength + coef.b2 * loc + coef.b3 * gA);
    fav.push(gA);
    dog.push(poissonSample(rand, muB));
  }
  return { fav, dog };
}
