/**
 * Thresholds for HEOS replay.
 *
 * minStratumN MUST match selective-gate MIN_STRATUM_CALIBRATION (100).
 * maxOddsAgeMs MUST match load-gate-slate MAX_CANDIDATE_ODDS_AGE_MS (6h).
 * Do not widen either. Drift test in __tests__ documents the contract.
 */

/** Mirror of selective-gate MIN_STRATUM_CALIBRATION */
export const HIST_MIN_STRATUM_N = 100 as const;

/** Mirror of MAX_CANDIDATE_ODDS_AGE_MS — six hours, never widen */
export const HIST_MAX_ODDS_AGE_MS = 6 * 60 * 60 * 1000;

/** Authority values for CI drift checks (keep in sync with production exports). */
export const AUTHORITY = {
  minStratumCalibration: 100,
  maxCandidateOddsAgeMs: 6 * 60 * 60 * 1000,
} as const;

export function assertThresholdsMatchAuthority(): void {
  if (HIST_MIN_STRATUM_N !== AUTHORITY.minStratumCalibration) {
    throw new Error("HIST_MIN_STRATUM_N drifted from selective-gate floor");
  }
  if (HIST_MAX_ODDS_AGE_MS !== AUTHORITY.maxCandidateOddsAgeMs) {
    throw new Error("HIST_MAX_ODDS_AGE_MS drifted from 6h gate budget");
  }
}
