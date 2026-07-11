/**
 * The honest accuracy leaderboard — every seam of the incumbent design
 * closed by construction, and each closure documented at the line that
 * closes it.
 *
 * A forecaster entry is scored over EVERY forecast they made (no dropped
 * weeks), with proper scoring rules (absolute, conviction-sensitive), a
 * fixed-baseline skill view, per-bin calibration, and a COVERAGE dimension
 * that makes selective forecasting visible. The composite ranking penalizes
 * low coverage explicitly instead of letting omission be free.
 *
 * Deterministic: same inputs → same board, bit for bit. No snapshot-timing
 * advantage exists because scoring consumes the forecasts a caller locked —
 * lock discipline (forecasts frozen at a stated deadline) is the caller's
 * contract, stated here so the seam is closed by design, not by accident.
 */

import {
  brierScore,
  brierSkillScore,
  expectedCalibrationError,
  logLoss,
  type ScoredForecast,
} from "./scoring";

export interface ForecasterRecord {
  /** Stable identifier (display naming is the caller's concern). */
  readonly forecasterId: string;
  /** Every locked, settled forecast — never a filtered subset. */
  readonly forecasts: readonly ScoredForecast[];
  /**
   * How many scoreable events existed in the window (the denominator of
   * coverage). Skipping hard calls lowers coverage — visibly.
   */
  readonly eventsAvailable: number;
}

export interface LeaderboardEntry {
  readonly forecasterId: string;
  readonly forecastCount: number;
  /** forecastCount / eventsAvailable, in [0,1]. */
  readonly coverage: number;
  /** Mean Brier score (lower = better). ABSOLUTE — reality, not the field. */
  readonly brier: number;
  /** Mean log loss (lower = better). */
  readonly logLoss: number;
  /** Skill vs the stated base rate (higher = better; ≤0 = no skill). */
  readonly skillVsBaseRate: number;
  /** Expected calibration error (lower = better). */
  readonly calibrationError: number;
  /**
   * Composite: coverage-adjusted skill. Skill earned on the forecasts made,
   * scaled by the fraction of the board actually forecast — an 80th-percentile
   * skill on 20% coverage does NOT outrank honest full-board work.
   */
  readonly coverageAdjustedSkill: number;
  /** Below the floor, rankings are withheld (insufficient), never fabricated. */
  readonly meetsMinimumSample: boolean;
}

export interface LeaderboardOptions {
  /**
   * Fixed reference probability for the skill score. When omitted, each
   * forecaster is compared against the base rate of THEIR OWN settled events
   * — stated, reproducible, and immune to field drift.
   */
  readonly referenceProbability?: number;
  /** Minimum settled forecasts before an entry is rankable (default 25). */
  readonly minimumSample?: number;
}

/**
 * Build the board. Entries below the minimum sample are still REPORTED (their
 * numbers are facts) but flagged unrankable and sorted below rankable entries
 * — small-sample noise never tops the board, and nothing is hidden.
 */
export function buildLeaderboard(
  records: readonly ForecasterRecord[],
  options: LeaderboardOptions = {},
): LeaderboardEntry[] {
  const minimumSample = options.minimumSample ?? 25;
  if (!Number.isInteger(minimumSample) || minimumSample < 1) {
    throw new Error(`leaderboard: minimumSample must be a positive integer`);
  }

  const entries = records.map((r) => {
    if (!Number.isInteger(r.eventsAvailable) || r.eventsAvailable < 0) {
      // A NaN/Infinity/negative denominator would corrupt coverage silently
      // (NaN comparisons are false, Infinity passes the < check) — reject it.
      throw new Error(
        `leaderboard: ${r.forecasterId} eventsAvailable must be a non-negative integer, got ${r.eventsAvailable}`,
      );
    }
    if (r.eventsAvailable < r.forecasts.length) {
      throw new Error(
        `leaderboard: ${r.forecasterId} reports more forecasts (${r.forecasts.length}) than available events (${r.eventsAvailable})`,
      );
    }
    const n = r.forecasts.length;
    const coverage = r.eventsAvailable === 0 ? 0 : n / r.eventsAvailable;
    const brier = brierScore(r.forecasts);
    const skill = brierSkillScore(r.forecasts, options.referenceProbability);
    return {
      forecasterId: r.forecasterId,
      forecastCount: n,
      coverage,
      brier,
      logLoss: logLoss(r.forecasts),
      skillVsBaseRate: skill,
      calibrationError: expectedCalibrationError(r.forecasts),
      // Coverage scales POSITIVE skill down toward 0 (partial boards earn
      // partial credit) and leaves non-positive skill unscaled — low coverage
      // must never SHRINK a negative skill toward zero (that would reward
      // skipping with a better composite). -Infinity (imperfect forecasts on
      // an all-same-outcome window, where the base rate is perfect) is a
      // legitimate worst-possible skill and is PRESERVED, never laundered to
      // NaN/neutral.
      coverageAdjustedSkill: Number.isNaN(skill) ? Number.NaN : skill > 0 ? skill * coverage : skill,
      meetsMinimumSample: n >= minimumSample,
    };
  });

  // Rankable first (by coverage-adjusted skill desc, then calibration asc,
  // then brier asc, then id for total order); unrankable after, same keys.
  // NaN sorts BELOW every number including -Infinity (an unscoreable entry
  // never outranks a scored one); equal infinities compare equal.
  const descending = (x: number, y: number): number => {
    const xNaN = Number.isNaN(x);
    const yNaN = Number.isNaN(y);
    if (xNaN && yNaN) return 0;
    if (xNaN) return 1;
    if (yNaN) return -1;
    if (x === y) return 0;
    return y > x ? 1 : -1;
  };
  return entries.sort((a, b) => {
    if (a.meetsMinimumSample !== b.meetsMinimumSample) {
      return a.meetsMinimumSample ? -1 : 1;
    }
    const bySkill = descending(a.coverageAdjustedSkill, b.coverageAdjustedSkill);
    if (bySkill !== 0) return bySkill;
    const byCal = -descending(a.calibrationError, b.calibrationError);
    if (byCal !== 0) return byCal;
    const byBrier = -descending(a.brier, b.brier);
    if (byBrier !== 0) return byBrier;
    return a.forecasterId.localeCompare(b.forecasterId);
  });
}

/**
 * Accuracy-weighted consensus: blend forecaster probabilities for one event,
 * weighting each forecaster by max(0, skill) from the leaderboard — proven
 * skill earns voice; no skill earns none. Falls back to the simple mean when
 * nobody has positive skill (the crowd mean is the floor, never worse).
 *
 * The incumbents' own published results validate this design: their
 * accuracy-WEIGHTED blend beats their plain-average blend. GSE ships it with
 * the weights visible.
 */
export function accuracyWeightedConsensus(
  votes: ReadonlyArray<{ readonly forecasterId: string; readonly probability: number }>,
  board: readonly LeaderboardEntry[],
): number {
  if (votes.length === 0) return Number.NaN;
  for (const v of votes) {
    if (!Number.isFinite(v.probability) || v.probability < 0 || v.probability > 1) {
      throw new Error(`consensus: probability for ${v.forecasterId} must be in [0,1]`);
    }
  }
  const skillById = new Map(
    board
      .filter((e) => e.meetsMinimumSample)
      .map((e) => [e.forecasterId, Math.max(0, e.skillVsBaseRate)]),
  );
  let num = 0;
  let den = 0;
  for (const v of votes) {
    const w = skillById.get(v.forecasterId) ?? 0;
    num += w * v.probability;
    den += w;
  }
  if (den === 0) {
    return votes.reduce((s, v) => s + v.probability, 0) / votes.length;
  }
  return num / den;
}
