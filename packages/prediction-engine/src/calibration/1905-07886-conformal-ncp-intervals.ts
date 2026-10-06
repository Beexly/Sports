/**
 * arXiv 1905.07886: Conformal Prediction Interval Estimations with an Application to Day-Ahead and Intraday Power Markets
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Normalized nonconformity (NCP) prediction intervals [yhat - sigmahat*qhat, yhat + sigmahat*qhat] with per-game dispersion estimates; a rolling-window (never random-split) calibration design for ordered NFL data; a per-market path-selection protocol over {plain CP, NCP} x point predictor; ICM martingale monitoring for concept drift.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add a normalized-nonconformity interval option ([yhat - sigmahat*qhat, yhat + sigmahat*qhat] with a per-game dispersion estimate) and a rolling-window (not random-split) calibration design to GSE's interval layer, with a per-market path-selection protocol ({plain CP, NCP} x point predictor) picking the winner per market.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT NCP if it achieves nominal coverage within 2pp AND mean width <= plain-CP width on the 2025 holdout; KEEP the path-selection protocol regardless (it is process, not a claim); REJECT the random-split calibration design outright -- never use it on ordered NFL data.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: calibration | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Split-conformal quantile of nonconformity scores (finite-sample corrected). */
export function conformalQuantile(scores: readonly number[], alpha: number): number {
  if (scores.length === 0) throw new Error("conformalQuantile: empty");
  const s = [...scores].sort((a, b) => a - b);
  const k = Math.min(s.length - 1, Math.ceil((s.length + 1) * (1 - alpha)) - 1);
  return s[Math.max(0, k)]!;
}

/** Plain conformal interval from point forecast and score quantile. */
export function conformalInterval(yhat: number, qhat: number): [number, number] {
  return [yhat - qhat, yhat + qhat];
}

/** Normalized-nonconformity interval with per-observation dispersion estimate. */
export function normalizedInterval(yhat: number, sigmahat: number, qhat: number): [number, number] {
  const w = Math.max(1e-9, sigmahat) * qhat;
  return [yhat - w, yhat + w];
}

/** Empirical coverage of intervals on a rolling (time-ordered) evaluation. */
export function rollingCoverage(
  ys: readonly number[],
  los: readonly number[],
  his: readonly number[],
): number {
  let hit = 0;
  for (let i = 0; i < ys.length; i++) if (ys[i]! >= los[i]! && ys[i]! <= his[i]!) hit++;
  return hit / ys.length;
}

/** Inductive conformal martingale value for a p-value (for ICM drift monitors). */
export function icmMartingaleValue(p: number, eps = 0.5): number {
  const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return eps * pc ** (eps - 1);
}

/** ICM alarm: cumulative product of martingale values crosses 1/threshold. */
export function icmAlarm(pvals: readonly number[], threshold = 20): { alarmAt: number; mart: number[] } {
  const mart: number[] = [];
  let m = 1;
  let alarmAt = -1;
  for (let i = 0; i < pvals.length; i++) {
    m *= icmMartingaleValue(pvals[i]!);
    mart.push(m);
    if (alarmAt < 0 && m >= threshold) alarmAt = i;
  }
  return { alarmAt, mart };
}
