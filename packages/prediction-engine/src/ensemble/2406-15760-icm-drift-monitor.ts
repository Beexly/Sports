/**
 * arXiv 2406.15760: ICM Ensemble with Novel Betting Functions for Concept Drift
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Deploy a weekly ICM concept-drift monitor that uses a market-relative nonconformity score alpha = |p_hat_engine - q_market| on posted picks, so it tests exchangeability of the edge distribution and fires when GSE's edge regime decays (e.g., the market catching up to an angle) instead of tracking raw accuracy.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Deploy a weekly ICM concept-drift monitor that uses a market-relative nonconformity score α = |p̂_engine − q_market| on posted picks, so it tests exchangeability of the edge distribution and fires when GSE's edge regime decays (e.g., the market catching up to an angle) instead of tracking raw accuracy.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT if the offline replay fires an alarm within 3 weeks of the 2024 kickoff-rule change on the TOTALS stream with ≤1 false alarm per season on 2024–2026 data — then deploy the monitor as a weekly cron job feeding the recalibration queue. Reject if alarms are dominated by noise (≥3 false alarms/season) or if detection latency exceeds 6 weeks.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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
