// ============================================================
// Controlled abstention for totals regression (sigma head + PID)
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the sigma head is trained
 * with the abstention loss below (a training-system call), and activation
 * requires the gate (MAE -0.5 pts / -3% relative, calibrated sigma) to
 * pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2104.08236v1 — "Controlled Abstention Neural Networks for Identifying Skillful Predictions for Regression Problems"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: add a sigma output (softplus) to the regression head;
 * train first with plain NLL (spin-up), then with the abstention loss
 * L = −q·log N(y; mu, sigma) − alpha·log q with q = min(1, (kappa/sigma)²);
 * kappa is set to the 90th percentile of sigma on validation; a PID
 * controller holds the abstention rate at the target non-publish fraction;
 * publish iff sigma <= tau.
 *
 * IMPROVEMENT (from ledger): Add a sigma output (softplus) to GSE's totals
 * regression head; train with baseline NLL first (spin-up), then the
 * abstention loss L = -q log N(y; mu, sigma) - alpha log q, q = min(1,
 * (kappa/sigma)^2); set kappa = P_90% of sigma on a validation season; PID
 * controller holds abstention at GSE's target non-publish fraction; publish
 * rule: publish the total pick iff sigma <= tau, recalibrate tau each
 * season; couple the sigma head with the SDR variance-regime direction as
 * an extra input.
 *
 * ACCEPTANCE GATE: ADAPT if the abstention model reduces test-window
 * covered-set MAE vs baseline by >=0.5 points of total (or >=3% relative)
 * with sigma z-scores within [-0.2, 0.2] mean and [0.8, 1.2] std; reject if
 * the MAE gap is smaller or sigma is miscalibrated -- then use the simpler
 * baseline, which the paper itself calls 'a simple yet powerful method.'
 */

export const softplus = (x: number): number =>
  x > 20 ? x : Math.log1p(Math.exp(x));

/** Gaussian NLL for one observation. */
export function gaussianNll(y: number, mu: number, sigma: number): number {
  const s = Math.max(sigma, 1e-6);
  const z = (y - mu) / s;
  return 0.5 * z * z + Math.log(s) + 0.5 * Math.log(2 * Math.PI);
}

/**
 * Abstention loss: L = -q·log N(y; mu, sigma) - alpha·log q,
 * q = min(1, (kappa/sigma)^2). Low sigma -> q = 1 (full weight, no
 * abstention pressure); high sigma -> q < 1 (down-weighted likelihood +
 * abstention bonus via -alpha·log q).
 */
export function abstentionNllLoss(
  y: number,
  mu: number,
  sigma: number,
  kappa: number,
  alpha: number,
): number {
  const s = Math.max(sigma, 1e-6);
  const q = Math.min(1, (kappa / s) * (kappa / s));
  // L = -q * log N(y; mu, sigma) - alpha * log q = q * nll - alpha * log q.
  // The -alpha*log q term regularizes against degenerate always-abstain (q -> 0).
  return q * gaussianNll(y, mu, s) - alpha * Math.log(Math.max(q, 1e-12));
}

/** kappa = P90 of sigma on a validation season. */
export function kappaFromSigma(validationSigmas: number[]): number {
  if (validationSigmas.length === 0) return 1;
  const sorted = [...validationSigmas].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(0.9 * sorted.length))]!;
}

export interface PidState {
  integral: number;
  prevError: number;
}

/**
 * PID controller holding the abstention rate at the target non-publish
 * fraction: adjusts alpha (the abstention bonus) each step.
 */
export function pidAbstentionStep(
  state: PidState,
  observedRate: number,
  targetRate: number,
  alpha: number,
  kp = 0.5,
  ki = 0.1,
  kd = 0.05,
): { alpha: number; state: PidState } {
  const error = targetRate - observedRate;
  const integral = state.integral + error;
  const derivative = error - state.prevError;
  const nextAlpha = Math.max(0.01, alpha + kp * error + ki * integral + kd * derivative);
  return { alpha: nextAlpha, state: { integral, prevError: error } };
}

/** Publish rule: publish the total pick iff sigma <= tau. */
export function totalsPublishRule(sigma: number, tau: number): boolean {
  return sigma <= tau;
}

/** Recalibrate tau each season: tau = quantile of validation sigma at the target publish fraction. */
export function recalibrateTau(validationSigmas: number[], targetPublishFraction: number): number {
  if (validationSigmas.length === 0) return Infinity;
  const sorted = [...validationSigmas].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(targetPublishFraction * sorted.length));
  return sorted[idx]!;
}

/** Sigma calibration diagnostics: z = (y - mu)/sigma should be ~ N(0,1). */
export function sigmaCalibration(ys: number[], mus: number[], sigmas: number[]): { mean: number; std: number } {
  const n = Math.min(ys.length, mus.length, sigmas.length);
  if (n === 0) return { mean: 0, std: 1 };
  const zs: number[] = [];
  for (let i = 0; i < n; i++) zs.push((ys[i]! - mus[i]!) / Math.max(sigmas[i]!, 1e-6));
  const mean = zs.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(zs.reduce((a, z) => a + (z - mean) * (z - mean), 0) / n);
  return { mean, std };
}

/** Gate helper: MAE gap >= 0.5 pts (or >= 3% relative) AND sigma z in [-0.2,0.2] mean, [0.8,1.2] std. */
export function totalsAbstentionGatePasses(
  baselineMae: number,
  abstainMae: number,
  zMean: number,
  zStd: number,
): boolean {
  const gap = baselineMae - abstainMae;
  const maeOk = gap >= 0.5 || (baselineMae > 0 && gap / baselineMae >= 0.03);
  const calibOk = zMean >= -0.2 && zMean <= 0.2 && zStd >= 0.8 && zStd <= 1.2;
  return maeOk && calibOk;
}
