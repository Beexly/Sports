/**
 * arXiv 2112.13001v3: Forecasting number of corner kicks taken in association football using compound Poisson distribution
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Port the cross-market extractor: de-vigged moneyline + spread + total odds per game, fit a bivariate normal on (home margin, total) via L-BFGS-B to recover market-implied expected total/spread-implied supremacy as covariates; build Bayesian DCP prop models in Stan (geometric-Poisson or NB for team count props: sacks taken, explosive plays, red-zone trips; rate eq with TG/SUP + last-3 averages + opponent adjustments; shape regression on |SUP|); compare elpd_loo, and also fit the CMP-GLM (two links) the authors mention but never fit -- for underdispersed counts like team punts the DCP family cannot represent.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Port the cross-market extractor: de-vigged moneyline + spread + total odds per game, fit a bivariate normal on (home margin, total) via L-BFGS-B to recover market-implied expected total/spread-implied supremacy as covariates; build Bayesian DCP prop models in Stan (geometric-Poisson or NB for team count props: sacks taken, explosive plays, red-zone trips; rate eq with TG/SUP + last-3 averages + opponent adjustments; shape regression on |SUP|); compare elpd_loo, and also fit the CMP-GLM (two links) the authors mention but never fit — for underdispersed counts like team punts the DCP family cannot represent.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the DCP prop framework iff the geometric-Poisson/NB model beats naive Poisson by elpd_loo with se_diff >= 3 on 2024 rushing-attempt counts AND the positive-EV simulation shows Sharpe >= 1.0 over >=100 bets; REJECT as a framework if the Poisson is within se_diff < 1 with a flat/negative betting sim.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: markets | verdict: ADAPT | doctrine: BASELINE
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

/** Log-gamma via Lanczos approximation. */
function logGamma(z: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0]!;
  for (let i = 1; i < 9; i++) x += c[i]! / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Negative-binomial PMF parameterized by (r, p): k failures before r successes. */
export function negBinPmf(k: number, r: number, p: number): number {
  const lp = logGamma(k + r) - logGamma(r) - logGamma(k + 1) + r * Math.log(p) + k * Math.log(1 - p);
  return Math.exp(lp);
}

/** Method-of-moments (r, p) fit for counts. */
export function negBinMoments(ks: readonly number[]): { r: number; p: number } {
  const m = ks.reduce((a, b) => a + b, 0) / ks.length;
  const v = ks.reduce((a, b) => a + (b - m) ** 2, 0) / ks.length;
  if (v <= m) return { r: 1e9, p: 1e9 / (1e9 + m) }; // Poisson limit
  const p = m / v;
  return { r: (m * m) / (v - m), p };
}

/** Zero-inflated NB PMF. */
export function zinbPmf(k: number, pi: number, r: number, p: number): number {
  if (k === 0) return pi + (1 - pi) * negBinPmf(0, r, p);
  return (1 - pi) * negBinPmf(k, r, p);
}

/** NB log-likelihood. */
export function negBinLogLik(ks: readonly number[], r: number, p: number): number {
  let s = 0;
  for (const k of ks) s += Math.log(Math.max(1e-300, negBinPmf(k, r, p)));
  return s;
}
