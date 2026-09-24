/**
 * CRPSmod sharpness training for parametric post-processing â€” arXiv 2606.08587v1
 * ("Improving Sharpness in Neural Network Parametric Post-processing").
 *
 * ADDITIVE utility. Training stays offline; this module is the serving-time
 * loss math plus the live coverage monitor. Not wired into any training or
 * publish path (wiring changes model behavior and is a NEEDS HUMAN CALL â€”
 * see tracking report).
 *
 * Paper mechanism: train the probabilistic post-processor (Gaussian family
 * for game totals and discrete props) with CRPSmod instead of pure CRPS:
 * loss = CRPS + penaltyAlpha * central-interval-width, penaltyAlpha tuned
 * in [0.001, 0.02] on the 2024 walk-forward, producing sharper central
 * intervals at matched coverage. A live coverage monitor rolls back
 * penaltyAlpha if realized coverage drops >1pp below nominal.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT CRPSmod training if on the
 * 2025 frozen test the central-90% interval narrows by >=5% vs pure-CRPS
 * training, empirical coverage stays within +/-0.5pp of nominal, and mean
 * CRPS does not regress (paired test p<0.05 for width, non-inferiority for
 * CRPS).
 */

/** Standard normal PDF. */
export function normalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/** Standard normal CDF (Abramowitz-Stegun 7.1.26, |err| < 7.5e-8). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const approx = 1 - normalPdf(z) * poly;
  return z >= 0 ? approx : 1 - approx;
}

/**
 * Closed-form CRPS for N(mu, sigma): sigma * (z*(2*Phi(z)-1) + 2*phi(z) -
 * 1/sqrt(pi)), z = (y - mu)/sigma.
 */
export function gaussianCrps(y: number, mu: number, sigma: number): number {
  if (!(sigma > 0)) return Number.NaN;
  const z = (y - mu) / sigma;
  return sigma * (z * (2 * normalCdf(z) - 1) + 2 * normalPdf(z) - 1 / Math.sqrt(Math.PI));
}

/** Inverse standard normal CDF (Acklam's approximation). */
export function normalQuantile(p: number): number {
  const pc = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  if (pc < plow) {
    q = Math.sqrt(-2 * Math.log(pc));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (pc > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - pc));
    return -((((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1));
  }
  q = pc - 0.5;
  const r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** Central (1-alpha) interval width for N(mu, sigma). */
export function gaussianIntervalWidth(mu: number, sigma: number, alpha: number): number {
  if (!(sigma > 0)) return Number.NaN;
  void mu;
  return 2 * normalQuantile(1 - alpha / 2) * sigma;
}

/** CRPSmod loss = CRPS + penaltyAlpha * central-interval width. */
export function crpsmodLoss(
  y: number,
  mu: number,
  sigma: number,
  alpha: number,
  penaltyAlpha: number,
): number {
  return gaussianCrps(y, mu, sigma) + penaltyAlpha * gaussianIntervalWidth(mu, sigma, alpha);
}

/**
 * Live coverage monitor: roll back penaltyAlpha when realized coverage
 * over the trailing window drops >1pp below nominal.
 */
export function shouldRollbackPenalty(
  coverages: readonly boolean[],
  nominal: number,
  tolerancePp = 1,
): boolean {
  if (coverages.length === 0) return false;
  const realized = coverages.filter(Boolean).length / coverages.length;
  return realized < nominal - tolerancePp / 100;
}
