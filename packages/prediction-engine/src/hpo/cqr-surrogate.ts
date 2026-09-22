/**
 * CQR surrogate for hyperparameter optimization (arXiv 2305.03623v1).
 *
 * Replace the GP surrogate in the BO loop with a CQR surrogate:
 * quantile regression over the config space + conformal calibration
 * on a held-out config set, EI acquisition over the conformalized
 * predictive distribution — with multi-fidelity for free (aggregate
 * each config's last-fidelity observation; fidelity = training
 * seasons; plus async successive halving) and market-relative config
 * features (each config's log-loss minus the market-implied baseline,
 * optimizing edge-over-market directly with a heteroskedasticity-aware
 * surrogate).
 *
 * The portable core here: pinball-loss quantile fitting (linear, via
 * subgradient descent), conformal calibration of the quantile band on
 * held-out configs, conformalized EI acquisition, and the surrogate
 * calibration-error metric for the gate comparison vs GP.
 *
 * ACCEPTANCE GATE: ADOPT iff CQR-BO reaches the GP-BO final regret in
 * <= 70% of the wall-clock time AND surrogate calibration error at
 * n >= 256 is <= GP's; REJECT if no wall-clock win or early-regime
 * (n < 100) miscalibration hurts candidate selection.
 *
 * Research-only module. Not wired into any live HPO loop.
 */

export interface ConfigObs {
  /** Config features (standardized). */
  x: number[];
  /** Observed objective (lower is better, e.g. log-loss). */
  y: number;
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((s, x, i) => s + x * (b[i] as number), 0);
}

/**
 * Pinball loss for quantile tau.
 */
export function pinballLoss(y: number, q: number, tau: number): number {
  if (tau <= 0 || tau >= 1) throw new Error("pinballLoss: tau in (0,1)");
  const r = y - q;
  return r >= 0 ? tau * r : (tau - 1) * r;
}

export interface QuantileModel {
  weights: number[];
  bias: number;
  tau: number;
}

/**
 * Fit a linear quantile model by subgradient descent on the pinball
 * loss (small-module stand-in for the quantile GBM).
 */
export function fitQuantile(
  obs: readonly ConfigObs[],
  tau: number,
  lr = 0.1,
  epochs = 200,
): QuantileModel {
  if (obs.length === 0) throw new Error("fitQuantile: no observations");
  if (tau <= 0 || tau >= 1) throw new Error("fitQuantile: tau in (0,1)");
  const d = (obs[0] as ConfigObs).x.length;
  let w = new Array<number>(d).fill(0);
  let b = 0;
  for (let e = 0; e < epochs; e++) {
    for (const o of obs) {
      const q = dot(w, o.x) + b;
      const grad = o.y - q >= 0 ? tau : tau - 1;
      for (let j = 0; j < d; j++) w[j] = (w[j] as number) + lr * grad * (o.x[j] as number);
      b += lr * grad;
    }
    lr *= 0.999;
  }
  return { weights: w, bias: b, tau };
}

export function predictQuantile(model: QuantileModel, x: readonly number[]): number {
  return dot(model.weights, x) + model.bias;
}

export interface CqrSurrogate {
  lower: QuantileModel;
  upper: QuantileModel;
  /** Conformal adjustment from the held-out calibration set. */
  adjustment: number;
  /** Nominal miscoverage. */
  alpha: number;
}

/**
 * Conformal calibration: fit lower/upper quantile models on the
 * training configs, then set the adjustment to the (1-alpha) quantile
 * of conformity scores max(lower - y, y - upper) on held-out configs.
 */
export function calibrateCqr(
  train: readonly ConfigObs[],
  heldout: readonly ConfigObs[],
  alpha = 0.1,
): CqrSurrogate {
  if (heldout.length === 0) throw new Error("calibrateCqr: empty held-out set");
  if (alpha <= 0 || alpha >= 1) throw new Error("calibrateCqr: alpha in (0,1)");
  const lower = fitQuantile(train, alpha / 2);
  const upper = fitQuantile(train, 1 - alpha / 2);
  const scores = heldout.map((o) => {
    const lo = predictQuantile(lower, o.x);
    const hi = predictQuantile(upper, o.x);
    return Math.max(lo - o.y, o.y - hi, 0);
  });
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((1 - alpha) * (sorted.length + 1)) - 1);
  return { lower, upper, adjustment: Math.max(0, sorted[Math.max(0, idx)] as number), alpha };
}

/** Conformalized predictive interval for a config. */
export function conformalInterval(
  surrogate: CqrSurrogate,
  x: readonly number[],
): { lo: number; hi: number; mid: number } {
  const lo = predictQuantile(surrogate.lower, x) - surrogate.adjustment;
  const hi = predictQuantile(surrogate.upper, x) + surrogate.adjustment;
  return { lo, hi, mid: (lo + hi) / 2 };
}

/**
 * Expected Improvement over the conformalized predictive distribution
 * (approximated as uniform over [lo, hi]; minimization).
 */
export function conformalEI(
  surrogate: CqrSurrogate,
  x: readonly number[],
  bestY: number,
): number {
  const { lo, hi } = conformalInterval(surrogate, x);
  if (hi <= lo) return Math.max(0, bestY - lo);
  if (bestY <= lo) return 0;
  const up = Math.min(hi, bestY);
  // E[max(bestY - Y, 0)] for Y ~ Uniform(lo, hi).
  return ((up - lo) * (bestY - (up + lo) / 2)) / (hi - lo);
}

/**
 * Surrogate calibration error: fraction of held-out observations
 * falling outside the conformal interval vs the nominal alpha.
 */
export function calibrationError(
  surrogate: CqrSurrogate,
  heldout: readonly ConfigObs[],
): { miscoverage: number; error: number } {
  if (heldout.length === 0) throw new Error("calibrationError: empty held-out set");
  let outside = 0;
  for (const o of heldout) {
    const { lo, hi } = conformalInterval(surrogate, o.x);
    if (o.y < lo || o.y > hi) outside++;
  }
  const miscoverage = outside / heldout.length;
  return { miscoverage, error: Math.abs(miscoverage - surrogate.alpha) };
}
