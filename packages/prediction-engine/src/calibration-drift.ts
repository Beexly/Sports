/**
 * Calibration-drift monitor — the model-governance guard. Compares a RECENT
 * window of settled predictions against a BASELINE window and flags when the
 * model's calibration is degrading (Brier creep / growing bias). A trust product
 * must notice its own model getting worse before users do — this is the alarm.
 *
 * Pure, no I/O. Pair with a scheduled job that pages on "alert".
 */

export interface ScoredOutcome {
  /** Model P(the chosen side is correct), 0–1. */
  readonly prob: number;
  readonly won: boolean;
}

export interface WindowCalibration {
  readonly n: number;
  /** Mean (prob − outcome)² — lower is better, 0 is perfect. */
  readonly brier: number;
  readonly accuracy: number;
  readonly meanPredicted: number;
  /** |meanPredicted − accuracy| — simple over/under-confidence bias. */
  readonly calibrationError: number;
}

export interface DriftOptions {
  /** Brier worsening that triggers "watch". Default 0.02. */
  readonly watchDelta?: number;
  /** Brier worsening that triggers "alert". Default 0.05. */
  readonly alertDelta?: number;
  /** Minimum sample per window to judge drift. Default 20. */
  readonly minSample?: number;
}

export type DriftSeverity = "none" | "watch" | "alert" | "insufficient";

export interface DriftReport {
  readonly baseline: WindowCalibration;
  readonly recent: WindowCalibration;
  /** recent.brier − baseline.brier; positive = worse. */
  readonly brierDelta: number;
  readonly drifted: boolean;
  readonly severity: DriftSeverity;
}

export function computeWindowCalibration(outcomes: readonly ScoredOutcome[]): WindowCalibration {
  const n = outcomes.length;
  if (n === 0) {
    return { n: 0, brier: 0, accuracy: 0, meanPredicted: 0, calibrationError: 0 };
  }
  let brierSum = 0;
  let wins = 0;
  let predSum = 0;
  for (const o of outcomes) {
    const p = clamp01(o.prob);
    const outcome = o.won ? 1 : 0;
    brierSum += (p - outcome) ** 2;
    wins += outcome;
    predSum += p;
  }
  const accuracy = wins / n;
  const meanPredicted = predSum / n;
  return {
    n,
    brier: round4(brierSum / n),
    accuracy: round4(accuracy),
    meanPredicted: round4(meanPredicted),
    calibrationError: round4(Math.abs(meanPredicted - accuracy)),
  };
}

export function assessDrift(
  baselineOutcomes: readonly ScoredOutcome[],
  recentOutcomes: readonly ScoredOutcome[],
  options: DriftOptions = {},
): DriftReport {
  const watch = options.watchDelta ?? 0.02;
  const alert = options.alertDelta ?? 0.05;
  const minSample = options.minSample ?? 20;

  const baseline = computeWindowCalibration(baselineOutcomes);
  const recent = computeWindowCalibration(recentOutcomes);
  const brierDelta = round4(recent.brier - baseline.brier);

  let severity: DriftSeverity;
  if (baseline.n < minSample || recent.n < minSample) severity = "insufficient";
  else if (brierDelta >= alert) severity = "alert";
  else if (brierDelta >= watch) severity = "watch";
  else severity = "none";

  return {
    baseline,
    recent,
    brierDelta,
    drifted: severity === "watch" || severity === "alert",
    severity,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
