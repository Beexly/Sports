/**
 * arXiv:2602.19520v2 — Decomposing Crowd Wisdom: Domain-Specific Calibration Dynamics in Prediction Markets
 *
 * Per-cell extremizing recalibration: logistic recalibration fit per (sport x days-to-event x liquidity)
 * cell over engine probabilities and Odds API snapshots, fixing the domain-specific over/under-extremizing
 * that global Platt scaling misses.
 *
 * Improvement: GSE recalibrates engine probabilities with a per-cell extremizing layer: logistic recalibration fit per (sport x days-to-event x liquidity) cell over engine probabilities and Odds API snapshots, fixing the domain-specific over/under-extremizing that global Platt scaling misses.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if on the 2025 NFL held-out season p* beats global Platt scaling by >=0.003 log-loss AND >=10% relative ECE reduction, with per-cell theta estimates statistically distinguishable from 1 (95% CI excluding 1 in >=3 sport x horizon cells).
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** One cell's recalibration parameters. */
export interface CellRecalParams {
  cell: string;
  /** Intercept (alpha) and slope (beta) of the logistic recalibration. */
  alpha: number;
  beta: number;
}

/** Apply per-cell logistic recalibration to an engine probability. */
export function recalibrate(p: number, params: CellRecalParams): number {
  if (p <= 0 || p >= 1) throw new Error("recalibrate: p in (0,1)");
  const logit = Math.log(p / (1 - p));
  return logistic(params.alpha + params.beta * logit);
}

/**
 * Fit (alpha, beta) by Newton-Raphson on Bernoulli log-likelihood.
 * Deterministic, few iterations — the per-cell fitting routine.
 */
export function fitCellRecal(
  probs: readonly number[],
  outcomes: readonly (0 | 1)[],
  iters = 25,
): { alpha: number; beta: number } {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("fitCellRecal: need aligned non-empty data");
  }
  let alpha = 0;
  let beta = 1;
  for (let it = 0; it < iters; it++) {
    let gA = 0;
    let gB = 0;
    let hAA = 0;
    let hAB = 0;
    let hBB = 0;
    for (let i = 0; i < probs.length; i++) {
      const pi = probs[i] ?? 0.5;
      const l = Math.log(pi / (1 - pi));
      const q = logistic(alpha + beta * l);
      const y = outcomes[i] ?? 0;
      const r = y - q;
      const wgt = q * (1 - q);
      gA += r; gB += r * l;
      hAA += wgt; hAB += wgt * l; hBB += wgt * l * l;
    }
    const det = hAA * hBB - hAB * hAB;
    if (Math.abs(det) < 1e-12) break;
    const dA = (hBB * gA - hAB * gB) / det;
    const dB = (hAA * gB - hAB * gA) / det;
    alpha += dA;
    beta += dB;
    if (Math.abs(dA) + Math.abs(dB) < 1e-10) break;
  }
  return { alpha, beta };
}
