/**
 * Skellam regression for NFL score-differential distributions.
 *
 * Research source: arXiv:1807.07536 — "A Skellam Regression Model for
 * Quantifying Positional Value in Soccer".
 *
 * Ports the paper's template to NFL margins: final score differential
 * Z ~ Skellam(lambda1, lambda2) with log-links on unit-strength
 * differential covariates (the NFL analog of the soccer lines). Outputs a
 * closed-form margin PMF -> P(home win), P(cover | spread) by summation, a
 * complement to the engine's Monte Carlo, suitable for precomputed margin
 * CDF tables and O(1) spread pricing.
 *
 * Skellam PMF: P(Z = k) = exp(-(l1+l2)) * (l1/l2)^(k/2) * I_|k|(2 sqrt(l1 l2))
 * where I_n is the modified Bessel function of the first kind.
 *
 * ACCEPTANCE GATE: adopt iff out-of-sample Brier < climatology by >= 0.02
 * AND P(cover) calibration slope in [0.9, 1.1] with >= 80% of bins within
 * 2pp of y=x; reject (stay with engine Monte Carlo) otherwise. If the
 * key-number spikes (+/-3, +/-7) break calibration, the key-number mixture
 * extension becomes the required next step.
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface SkellamParams {
  lambda1: number; // home scoring rate
  lambda2: number; // away scoring rate
}

export interface SkellamObs {
  covariates: number[];
  margin: number; // home score - away score (integer)
}

/**
 * Modified Bessel function of the first kind, integer order n >= 0.
 * Series expansion for small x, Hankel asymptotic expansion for large x.
 */
export function besselI(n: number, x: number): number {
  if (x < 0) throw new Error("besselI: x must be non-negative");
  if (x === 0) return n === 0 ? 1 : 0;
  // The Hankel asymptotic expansion needs x >> n^2 for its correction term
  // (4n^2 - 1)/(8x) to be small; otherwise the positive-term series below
  // is used (it converges for all x, just needs more terms as x grows).
  // In practice x = 2*sqrt(l1*l2) ~ 50 for NFL scoring rates, so the series
  // handles every realistic call and the asymptotic branch is a safeguard.
  const useAsymptotic = x >= 200 && x > 4 * n * n;
  if (!useAsymptotic) {
    // I_n(x) = sum_{m>=0} (x/2)^{2m+n} / (m! Gamma(m+n+1))
    let term = 1;
    for (let m = 1; m <= n; m++) term *= x / 2 / m; // (x/2)^n / n!
    let sum = term;
    for (let m = 1; m < 500; m++) {
      term *= (x / 2) ** 2 / (m * (m + n));
      sum += term;
      if (Math.abs(term) < 1e-15 * Math.abs(sum)) break;
    }
    return sum;
  }
  // Asymptotic: I_n(x) ~ e^x / sqrt(2 pi x) * (1 - (4n^2-1)/(8x))
  const leading = Math.exp(x) / Math.sqrt(2 * Math.PI * x);
  return leading * (1 - (4 * n * n - 1) / (8 * x));
}

/** P(Z = k) for Z ~ Skellam(l1, l2). Computed in log-space for stability. */
export function skellamPMF(k: number, l1: number, l2: number): number {
  if (l1 <= 0 || l2 <= 0) throw new Error("skellamPMF: lambdas must be positive");
  const kk = Math.round(k);
  const z = 2 * Math.sqrt(l1 * l2);
  const logP =
    -(l1 + l2) + (kk / 2) * Math.log(l1 / l2) + Math.log(besselI(Math.abs(kk), z));
  return Math.exp(logP);
}

/** P(Z <= k) by direct summation over a truncated range. */
export function skellamCDF(k: number, l1: number, l2: number): number {
  const mean = l1 - l2;
  const sd = Math.sqrt(l1 + l2);
  const lo = Math.floor(Math.min(k, mean - 12 * sd));
  const hi = Math.ceil(k);
  let s = 0;
  for (let j = lo; j <= hi; j++) s += skellamPMF(j, l1, l2);
  return Math.min(1, s);
}

export interface MarginProbs {
  homeWin: number;
  push: number;
  awayWin: number;
}

/** Full margin outcome probabilities from the Skellam PMF. */
export function marginProbs(l1: number, l2: number): MarginProbs {
  const push = skellamPMF(0, l1, l2);
  const homeWin = 1 - skellamCDF(0, l1, l2);
  return { homeWin, push, awayWin: Math.max(0, 1 - homeWin - push) };
}

/**
 * P(home covers | spread): P(margin > spread). Handles half-point spreads
 * exactly via the integer margin grid.
 */
export function coverProb(l1: number, l2: number, spread: number): number {
  return 1 - skellamCDF(Math.floor(spread), l1, l2);
}

export interface SkellamRegression {
  /** Intercept + slopes for log(lambda1). */
  coef1: number[];
  /** Intercept + slopes for log(lambda2). */
  coef2: number[];
}

function predictLambdas(reg: SkellamRegression, x: readonly number[]): SkellamParams {
  const dot = (c: number[], v: readonly number[]): number =>
    (c[0] ?? 0) + c.slice(1).reduce((a, b, i) => a + b * (v[i] ?? 0), 0);
  return { lambda1: Math.exp(dot(reg.coef1, x)), lambda2: Math.exp(dot(reg.coef2, x)) };
}

function logLik(data: readonly SkellamObs[], reg: SkellamRegression): number {
  let s = 0;
  for (const o of data) {
    const { lambda1, lambda2 } = predictLambdas(reg, o.covariates);
    s += Math.log(Math.max(1e-300, skellamPMF(o.margin, lambda1, lambda2)));
  }
  return s;
}

/**
 * Fit log-linear Skellam regression by gradient ascent with central-difference
 * gradients. Returns null on empty input.
 */
export function fitSkellamRegression(
  data: readonly SkellamObs[],
  opts: { iters?: number; lr?: number; l2?: number } = {},
): SkellamRegression | null {
  if (data.length === 0) return null;
  const first = data[0] as SkellamObs;
  const d = first.covariates.length;
  if (data.some((o) => o.covariates.length !== d)) {
    throw new Error("fitSkellamRegression: inconsistent covariate lengths");
  }
  const iters = opts.iters ?? 200;
  const lr = opts.lr ?? 0.1;
  const l2 = opts.l2 ?? 1e-4;
  const p = 1 + d;
  const n = data.length;
  // Intercepts start at log(20); slopes start at 0.
  let coef = [
    Math.log(20),
    ...new Array<number>(d).fill(0),
    Math.log(20),
    ...new Array<number>(d).fill(0),
  ];
  const get = (): SkellamRegression => ({
    coef1: coef.slice(0, p),
    coef2: coef.slice(p),
  });
  const h = 1e-5;
  for (let it = 0; it < iters; it++) {
    const base = logLik(data, get());
    let maxStep = 0;
    for (let j = 0; j < coef.length; j++) {
      coef[j] = (coef[j] ?? 0) + h;
      const up = logLik(data, get());
      coef[j] = (coef[j] ?? 0) - 2 * h;
      const dn = logLik(data, get());
      coef[j] = (coef[j] ?? 0) + h;
      const grad = (up - dn) / (2 * h) / n - l2 * (coef[j] ?? 0);
      const step = lr * grad;
      coef[j] = (coef[j] ?? 0) + step;
      maxStep = Math.max(maxStep, Math.abs(step));
    }
    if (maxStep < 1e-10) break;
    if (!Number.isFinite(base)) break;
  }
  return get();
}

/** Convenience: margin probabilities for one observation under a fitted model. */
export function predictMarginProbs(
  reg: SkellamRegression,
  covariates: readonly number[],
): MarginProbs {
  const { lambda1, lambda2 } = predictLambdas(reg, covariates);
  return marginProbs(lambda1, lambda2);
}
