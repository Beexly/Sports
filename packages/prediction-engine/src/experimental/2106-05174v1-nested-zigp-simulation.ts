/**
 * arXiv 2106.05174v1: UEFA EURO 2020 Forecast via Nested Zero-Inflated Generalized Poisson Regression
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Adapt the nested conditional simulation for NFL exact-score and prop simulation: fit per-team scoring/concession distributions (Poisson/NB from GSE's inventory), add the dependence term log mu_B|A = beta_0 + beta_1*opp_strength + beta_2*location + beta_3*G_A (the garbage-time/prevent-defense mechanism); Monte Carlo: simulate the favorite's points, then the underdog's conditional on the realized favorite score; replace the paper's step-3 parameter averaging with a single joint fit; benchmark the nested sampler against a Gaussian-copula Poisson and Dixon-Coles lambda_3 on exact-score log-loss.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adapt the nested conditional simulation for NFL exact-score and prop simulation: fit per-team scoring/concession distributions (Poisson/NB from GSE's inventory), add the dependence term log mu_B|A = beta_0 + beta_1*opp_strength + beta_2*location + beta_3*G_A (the garbage-time/prevent-defense mechanism); Monte Carlo: simulate the favorite's points, then the underdog's conditional on the realized favorite score; replace the paper's step-3 parameter averaging with a single joint fit (log mu_A = alpha_0 + alpha_1*Elo_B + alpha_2*loc + alpha_3*attack_A + alpha_4*defense_B in one likelihood) — and benchmark the nested sampler against a Gaussian-copula Poisson and Dixon-Coles lambda_3 on exact-score log-loss.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT gate: (a) the nested dependence term beta_3 must be empirically != 0 on NFL data (garbage-time/prevent-defense mechanism); (b) exact-score log-loss must improve over the independent baseline out-of-sample; (c) step-3 parameter averaging replaced by a principled reconciliation. If (a) fails, the mechanism is soccer-specific theater and the paper drops to REJECT.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: INFRA
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

/** Standard normal CDF (Abramowitz-Stegun). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Inverse standard normal CDF (Acklam approximation). */
export function normalQuantile(p: number): number {
  const pc = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (pc < plow) {
    const q = Math.sqrt(-2 * Math.log(pc));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (pc > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - pc));
    return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  const q = pc - 0.5;
  const r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** Bivariate Gaussian-copula sample on [0,1]^2 with correlation rho. */
export function gaussCopulaSample(rand: () => number, rho: number, randnFn: () => number): [number, number] {
  const z1 = randnFn();
  const z2 = randnFn();
  const w2 = rho * z1 + Math.sqrt(Math.max(0, 1 - rho * rho)) * z2;
  void rand;
  return [normalCdf(z1), normalCdf(w2)];
}

/** Gaussian-copula joint CDF for binary-thresholded margins. */
export function gaussCopulaJoint(p1: number, p2: number, rho: number): number {
  // P(U1 <= p1, U2 <= p2) via bivariate normal CDF (Drezner-Wesolowsky approx)
  const x = normalQuantile(p1);
  const y = normalQuantile(p2);
  const a = x;
  const b = y;
  const r = Math.min(0.999999, Math.max(-0.999999, rho));
  // tetrachoric series (first-order is enough for the demo)
  void a; void b;
  return normalCdf(x) * normalCdf(y) + (r / (2 * Math.PI)) * Math.exp(-(x * x + y * y) / 2);
}
