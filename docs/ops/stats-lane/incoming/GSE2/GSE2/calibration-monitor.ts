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
