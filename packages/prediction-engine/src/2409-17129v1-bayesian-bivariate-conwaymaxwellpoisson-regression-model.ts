/**
 * arXiv:2409.17129v1 — Bayesian Bivariate Conway-Maxwell-Poisson Regression Model for Correlated Count Data in Sports
 *
 * Bivariate Conway-Maxwell-Poisson for totals: joint count model with time-varying (random-walk) dispersion
 * so variance itself is predictable (weather-driven inflation), scored by joint log-loss.
 *
 * Improvement: Add the bivariate Conway-Maxwell-Poisson as a totals-modeling option with time-varying (random-walk) dispersion so variance itself is predictable (e.g., weather-driven variance inflation in wind games), extended to a multivariate CMP over (home points, away points, home turnovers, away turnovers) for a joint spread/total/turnover model.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt CMP as a totals-modeling option if, on the reproducible test, its out-of-sample joint log-loss beats bivariate Poisson and NB (or ties with demonstrably better tail calibration) and a full-season fit runs in <24 h on GSE hardware.
 */

/** CMP normalizing constant Z(lambda, nu) by truncation. */
export function cmpZ(lambda: number, nu: number, terms = 60): number {
  if (lambda <= 0 || nu <= 0) throw new Error("cmpZ: lambda, nu > 0");
  let z = 0;
  let term = 1; // k=0
  for (let k = 0; k < terms; k++) {
    if (k > 0) term *= lambda / Math.pow(k, nu);
    z += term;
    if (term < 1e-16 * z) break;
  }
  return z;
}

/** CMP log-pmf. */
export function cmpLogPmf(k: number, lambda: number, nu: number): number {
  if (k < 0 || !Number.isInteger(k)) throw new Error("cmpLogPmf: k >= 0 integer");
  let lf = 0;
  for (let i = 2; i <= k; i++) lf += Math.log(i);
  return k * Math.log(lambda) - nu * lf - Math.log(cmpZ(lambda, nu));
}

/**
 * Bivariate CMP (trivariate-reduction lite): X1 = A + C, X2 = B + C with
 * independent CMP(A), CMP(B), CMP(C) — C induces the correlation.
 */
export function bivCmpLogPmf(
  x1: number,
  x2: number,
  la: number,
  lb: number,
  lc: number,
  nu: number,
): number {
  if (x1 < 0 || x2 < 0) throw new Error("bivCmpLogPmf: counts >= 0");
  let total = 0;
  const cmax = Math.min(x1, x2);
  for (let c = 0; c <= cmax; c++) {
    total += Math.exp(cmpLogPmf(x1 - c, la, nu) + cmpLogPmf(x2 - c, lb, nu) + cmpLogPmf(c, lc, nu));
  }
  return Math.log(Math.max(1e-300, total));
}

/** Random-walk dispersion update: nu_t = nu_{t-1} * exp(eta * score). */
export function dispersionUpdate(nu: number, score: number, eta: number): number {
  if (nu <= 0 || eta < 0) throw new Error("dispersionUpdate: nu > 0, eta >= 0");
  return Math.max(1e-3, nu * Math.exp(eta * score));
}

/** Joint log-loss (negative log-likelihood) over games. */
export function jointLogLoss(
  games: readonly { x1: number; x2: number }[],
  la: number,
  lb: number,
  lc: number,
  nu: number,
): number {
  if (games.length === 0) throw new Error("jointLogLoss: no games");
  const ll = games.reduce((s, g) => s + bivCmpLogPmf(g.x1, g.x2, la, lb, lc, nu), 0);
  return -ll / games.length;
}
