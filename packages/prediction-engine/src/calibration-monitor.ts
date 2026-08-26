/**
 * Consecutive-day Brier health check — shadow.
 *
 * A single bad day is noise; a sustained run above the eligibility floor is a
 * regression worth surfacing. This module makes no claim about WHY Brier moved
 * (sample composition, a genuine model regression, a settlement bug) — it is a
 * trigger for a human to look, not a diagnosis.
 *
 * Deliberately pure and DB-agnostic: it takes an already-computed series of daily
 * Brier scores. The caller (an ops module with real database access) is
 * responsible for building that series from settled picks — see
 * `apps/web/lib/ops/calibration-regression-snapshot.ts`, which reuses the exact
 * `brierDecomposition` this package already exports rather than a second,
 * competing Brier calculator.
 */

export interface CalibrationHealthResult {
  readonly healthy: boolean;
  /** Longest run of consecutive above-threshold days ending at the series' end. */
  readonly currentStreak: number;
  /** Longest run of consecutive above-threshold days anywhere in the series. */
  readonly longestStreak: number;
  readonly threshold: number;
  readonly consecutiveDaysLimit: number;
  readonly alert: string | null;
}

/**
 * `recentBriers` is oldest-first (day 0 .. day N-1), matching how a caller would
 * naturally build it from `ORDER BY day ASC`. A non-finite entry (a day with no
 * settled picks, encoded as `NaN` rather than skipped, so gaps don't silently
 * reset the streak) breaks the current streak without counting as either a good
 * or a bad day — it is missing information, not evidence of health.
 */
export function checkCalibrationHealth(
  recentBriers: readonly number[],
  threshold = 0.22,
  consecutiveDays = 7,
): CalibrationHealthResult {
  const safeThreshold = Number.isFinite(threshold) ? threshold : 0.22;
  const safeLimit = Number.isInteger(consecutiveDays) && consecutiveDays > 0 ? consecutiveDays : 7;

  let currentStreak = 0;
  let longestStreak = 0;
  let alertStreak = 0;

  for (const brier of recentBriers) {
    if (!Number.isFinite(brier)) {
      currentStreak = 0;
      continue;
    }
    if (brier > safeThreshold) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    if (currentStreak >= safeLimit) {
      alertStreak = currentStreak;
    }
  }

  const healthy = alertStreak === 0;

  return {
    healthy,
    currentStreak,
    longestStreak,
    threshold: safeThreshold,
    consecutiveDaysLimit: safeLimit,
    alert: healthy
      ? null
      : `Brier > ${safeThreshold} for ${alertStreak} consecutive day(s) (limit ${safeLimit}).`,
  };
}

// ============================================================
// Negative-update guard — relative candidate-vs-incumbent regression check
// ============================================================
//
// Ported from arXiv:2403.04146 (FL-GUARD, "A Holistic Framework for Run-Time
// Detection and Recovery of Negative Federated Learning") — federation-
// agnostic at its core: a cheap run-time statistic for "did this update make
// things worse than the incumbent," robust-aggregated across cohorts,
// windowed, with an explicit consecutive-window trigger AND a symmetric
// cancellation rule. See docs/ops/edge/extraction/2026-08-26-group-learning-theory.md
// §2 for the full derivation (their Eqs. 1-5) and GSE's adaptation.
//
// Unlike `checkCalibrationHealth` above (an ABSOLUTE threshold on one
// series), this checks a RELATIVE gain — incumbent loss minus candidate loss
// — which is the actual question the C6 calibration apply/rollback decision
// asks: not "is Brier bad" but "did applying the candidate map make Brier
// worse than not applying it." Advisory only: this emits an alert
// recommendation, never a live gate flip — the C6 flip itself
// (CALIBRATION_ADJUSTMENTS_ENABLED) stays founder-gated per
// ADJUSTMENTS_ENABLE_RUNBOOK.

export interface CohortGain {
  /** e.g. "SPREAD:baseball_mlb" — identifies the cohort within one window; not otherwise used. */
  readonly cohort: string;
  /** The incumbent (currently-live) map's loss on this cohort's newest settlement window. */
  readonly incumbentLoss: number;
  /** The candidate (proposed) map's loss on the same cohort and window. */
  readonly candidateLoss: number;
}

export interface NegativeUpdateGuardResult {
  readonly alertActive: boolean;
  /** Consecutive most-recent rounds with smoothed beta-hat < 0. */
  readonly currentNegativeStreak: number;
  /** Consecutive most-recent rounds with smoothed beta-hat >= 0. */
  readonly currentPositiveStreak: number;
  readonly rollbackThreshold: number;
  readonly cancelWindow: number;
  /**
   * Smoothed beta-hat per round (same length and order as `windows`), NaN
   * for a round with no cohort data. beta-hat > 0 means the candidate beats
   * the incumbent in that round; < 0 means it is a negative update.
   */
  readonly smoothedSeries: readonly number[];
  readonly alert: string | null;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * `windows` is oldest-first, one array of per-cohort (incumbent, candidate)
 * loss pairs per settlement round — matching how a caller would build it
 * from the same settled-pick export the calibration fit report already
 * scripts, grouped by round then by cohort (pickType x sport). A round with
 * no cohorts (empty array) is a gap: its beta-hat is NaN and it resets both
 * streaks without counting as either a good or a bad round, matching
 * `checkCalibrationHealth`'s "missing information, not evidence" convention.
 *
 * Per round: per-cohort gain = incumbentLoss - candidateLoss (positive =
 * candidate is better); the round's statistic is the MEDIAN gain across its
 * cohorts (so one pathological cohort cannot flip the verdict — FL-GUARD's
 * robust-aggregation step, Eq. 4); the reported beta-hat is the trailing
 * mean of that statistic over the last `cancelWindow` rounds (Eq. 5 — the
 * source paper reuses one window size for both smoothing and cancellation,
 * kept here for fidelity).
 *
 * Trigger: smoothed beta-hat < 0 for MORE than `rollbackThreshold`
 * consecutive rounds raises a rollback alert. Cancellation: beta-hat >= 0
 * for `cancelWindow` consecutive rounds clears an active alert — the
 * asymmetric-then-symmetric hysteresis is deliberate (their §4.1, §5.1):
 * false positives are cheap to cancel, a real regression should not clear on
 * one good round.
 */
export function checkNegativeUpdateGuard(
  windows: readonly (readonly CohortGain[])[],
  rollbackThreshold = 3,
  cancelWindow = 2,
): NegativeUpdateGuardResult {
  const safeRollback = Number.isInteger(rollbackThreshold) && rollbackThreshold > 0 ? rollbackThreshold : 3;
  const safeCancel = Number.isInteger(cancelWindow) && cancelWindow > 0 ? cancelWindow : 2;

  const perRound = windows.map((cohorts) =>
    cohorts.length === 0 ? NaN : median(cohorts.map((c) => c.incumbentLoss - c.candidateLoss)),
  );

  const smoothedSeries: number[] = [];
  let negativeStreak = 0;
  let positiveStreak = 0;
  let alertActive = false;

  for (let i = 0; i < perRound.length; i++) {
    if (!Number.isFinite(perRound[i])) {
      smoothedSeries.push(NaN);
      negativeStreak = 0;
      positiveStreak = 0;
      continue;
    }
    // Trailing mean over the last `safeCancel` rounds' valid statistics
    // (natural warm-up: fewer than safeCancel samples for the first rounds).
    const windowStart = Math.max(0, i - safeCancel + 1);
    const trailing = perRound.slice(windowStart, i + 1).filter((v) => Number.isFinite(v));
    const smoothed = trailing.reduce((s, v) => s + v, 0) / trailing.length;
    smoothedSeries.push(smoothed);

    if (smoothed < 0) {
      negativeStreak += 1;
      positiveStreak = 0;
    } else {
      positiveStreak += 1;
      negativeStreak = 0;
    }

    if (!alertActive && negativeStreak > safeRollback) alertActive = true;
    else if (alertActive && positiveStreak >= safeCancel) alertActive = false;
  }

  return {
    alertActive,
    currentNegativeStreak: negativeStreak,
    currentPositiveStreak: positiveStreak,
    rollbackThreshold: safeRollback,
    cancelWindow: safeCancel,
    smoothedSeries,
    alert: alertActive
      ? `Candidate calibration map underperformed the incumbent (median cohort loss gain < 0) for more than ${safeRollback} consecutive round(s) — recommend rollback.`
      : null,
  };
}
