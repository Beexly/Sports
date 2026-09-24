/**
 * arXiv 2304.01538: A doubly self-exciting Poisson model for describing scoring levels in NBA basketball
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Adapt the doubly self-exciting hierarchy to NFL: game level -- weekly player fantasy points (or team points) with INGARCH(1,1) + spread/total/home covariates; drive level -- points per drive within a game with the weekly posterior mean as offset; self-excitation parameters (kappa, eta) per player/team quantifying 'hot' volume dynamics; cluster players by (eta, kappa) posteriors for matchup typing (relevant to live betting and DFS late-swap decisions) -- with a joint (not two-stage) Bayesian fit propagating game-level uncertainty, zero-inflated Poisson for scoreless drives, and attempt-volume vs efficiency decomposition.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adapt the doubly self-exciting hierarchy to NFL: game level - weekly player fantasy points (or team points) with INGARCH(1,1) + spread/total/home covariates; drive level - points per drive within a game with the weekly posterior mean as offset; self-excitation parameters (kappa, eta) per player/team quantifying 'hot' volume dynamics; cluster players by (eta, kappa) posteriors for matchup typing (relevant to live betting and DFS late-swap decisions) - with a joint (not two-stage) Bayesian fit propagating game-level uncertainty, zero-inflated Poisson for scoreless drives, and attempt-volume vs efficiency decomposition.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the doubly self-exciting hierarchy and the Wasserstein-barycenter divide-and-conquer if drive-level DSE beats baseline on 2025 held-out log-likelihood; REJECT game-level self-excitation unless WAIC/LOO supports it (the paper's own evidence says it usually does not); REJECT the plug-in offset as a final implementation - propagate uncertainty jointly in the production version.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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

/** Hawkes intensity at time t given past events (exponential kernel). */
export function hawkesIntensity(
  t: number,
  events: readonly number[],
  mu: number,
  alpha: number,
  beta: number,
): number {
  let s = mu;
  for (const te of events) {
    if (te < t) s += alpha * Math.exp(-beta * (t - te));
  }
  return s;
}

/** Log-likelihood of an event sequence on [0, T] under the Hawkes model. */
export function hawkesLogLik(
  events: readonly number[],
  T: number,
  mu: number,
  alpha: number,
  beta: number,
): number {
  let ll = 0;
  const past: number[] = [];
  for (const t of events) {
    ll += Math.log(Math.max(1e-300, hawkesIntensity(t, past, mu, alpha, beta)));
    past.push(t);
  }
  // compensator integral
  ll -= mu * T;
  for (const te of events) ll -= (alpha / beta) * (1 - Math.exp(-beta * (T - te)));
  return ll;
}

/** Grid-search MLE for (mu, alpha, beta) on fixed grids. */
export function hawkesGridFit(
  events: readonly number[],
  T: number,
  muGrid: readonly number[],
  alphaGrid: readonly number[],
  betaGrid: readonly number[],
): { mu: number; alpha: number; beta: number; ll: number } {
  let best = { mu: muGrid[0]!, alpha: alphaGrid[0]!, beta: betaGrid[0]!, ll: -Infinity };
  for (const mu of muGrid)
    for (const alpha of alphaGrid)
      for (const beta of betaGrid) {
        const ll = hawkesLogLik(events, T, mu, alpha, beta);
        if (ll > best.ll) best = { mu, alpha, beta, ll };
      }
  return best;
}
