/**
 * SPCI: Sequential Predictive Conformal Inference — arXiv 2212.03463
 * ("Sequential Predictive Conformal Inference for Time Series (SPCI)").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: second-order calibration layer for margin/total
 * forecasts. After the engine produces point forecasts, collect trailing
 * residuals and estimate conditional residual quantiles from residual lags
 * (last w in {4, 8, 16}, team-specific and league-pooled variants); publish
 * intervals per the SPCI formula at alpha in {0.1, 0.2} with
 * width-minimizing beta-hat. Autocorrelation gate: enable SPCI only when
 * trailing-50-game residual lag-1 autocorrelation is significant
 * (|rho-hat| > 0.15), else fall back to EnbPI/ACI. Hybrid extension:
 * augment the residual-lag features with game-context features (rest
 * differential, weather bucket, QB-change flag), fusing CQR's X-adaptivity
 * with SPCI's residual-adaptivity.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff empirical coverage is
 * within +-2pp of nominal AND mean width <= 85% of the EnbPI baseline on
 * 2024-2025. REJECT (fall back to EnbPI) if residual lag-1 autocorrelation
 * is insignificant (|rho-hat| < 0.1).
 */

import { enbpiInterval } from "@/lib/calibration/enbpi";

/** Lag-1 autocorrelation of a residual series. */
export function lag1Autocorrelation(residuals: readonly number[]): number {
  const n = residuals.length;
  if (n < 3) return 0;
  const mean = residuals.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const d = residuals[i]! - mean;
    den += d * d;
    if (i > 0) num += (residuals[i - 1]! - mean) * d;
  }
  if (den === 0) return 0;
  return num / den;
}

export type SpciGateDecision = "enable" | "fallback";

/**
 * Autocorrelation gate: enable SPCI when |rho-hat| > 0.15 on the trailing
 * 50-game window; fall back to EnbPI/ACI when |rho-hat| < 0.1; the band in
 * between keeps the current layer (hysteresis against flapping).
 */
export function spciAutocorrelationGate(
  trailingResiduals: readonly number[],
  current: SpciGateDecision = "fallback",
): SpciGateDecision {
  const rho = Math.abs(lag1Autocorrelation(trailingResiduals.slice(-50)));
  if (rho > 0.15) return "enable";
  if (rho < 0.1) return "fallback";
  return current;
}

/**
 * SPCI interval from conditional residual quantiles:
 * [f + Q_{beta*alpha}(resid | x), f + Q_{1-(1-beta)*alpha}(resid | x)].
 * The conditional quantiles come from the caller's quantile model
 * (QRF / gradient-boosted quantiles on residual lags + context); this
 * module owns the interval formula and the beta-hat width minimization.
 */
export function spciInterval(
  pointForecast: number,
  condQuantileLo: number,
  condQuantileHi: number,
): { readonly lo: number; readonly hi: number } {
  return {
    lo: pointForecast + condQuantileLo,
    hi: pointForecast + condQuantileHi,
  };
}

/** Width-minimizing beta-hat over a validation set of conditional quantiles. */
export function spciOptimizeBeta(
  condLo: (beta: number) => readonly number[],
  condHi: (beta: number) => readonly number[],
  validationSize: number,
  step = 0.05,
): number {
  let bestBeta = 0.5;
  let bestWidth = Number.POSITIVE_INFINITY;
  for (let b = 0; b <= 1 + 1e-9; b += step) {
    const beta = Math.min(b, 1);
    const lo = condLo(beta);
    const hi = condHi(beta);
    let width = 0;
    for (let i = 0; i < validationSize; i++) width += hi[i]! - lo[i]!;
    const mean = width / Math.max(validationSize, 1);
    if (mean < bestWidth) {
      bestWidth = mean;
      bestBeta = beta;
    }
  }
  return bestBeta;
}

/** Residual lag-w feature matrix (rows = time steps, cols = lags). */
export function residualLagFeatures(
  residuals: readonly number[],
  w: number,
): number[][] {
  const out: number[][] = [];
  for (let t = w; t < residuals.length; t++) {
    const row: number[] = [];
    for (let l = 1; l <= w; l++) row.push(residuals[t - l]!);
    out.push(row);
  }
  return out;
}

/**
 * Hybrid extension: concatenate residual-lag features with game-context
 * features (rest differential, weather bucket, QB-change flag, ...).
 */
export function augmentWithContext(
  lagFeatures: ReadonlyArray<readonly number[]>,
  contextFeatures: ReadonlyArray<readonly number[]>,
): number[][] {
  return lagFeatures.map((row, i) => [...row, ...(contextFeatures[i] ?? [])]);
}

/** Re-export the EnbPI fallback interval for the gate's fallback arm. */
export { enbpiInterval };
