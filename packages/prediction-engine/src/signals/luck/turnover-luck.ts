/**
 * Turnover luck: fumble-recovery regression evaluator (Rung 1 descriptive capture).
 *
 * EDGE THESIS: fumble recovery is near-pure luck (year-over-year persistence ~0;
 * forced-fumble occurrence is the skill component). A team's raw recovery share over a
 * small sample is dominated by variance, so expected future recovery regresses hard to
 * the ~50% league baseline. Buy-low / sell-high framing on extremes is a descriptive
 * flag ONLY - this module does not price props, spreads, or totals (Rung 1; zero
 * un-backtested spread addends).
 *
 * HONESTY RULES:
 * - Shrinkage to RECOVERY_BASELINE = 0.50 with K_FF = 200 pseudo-fumbles
 *   (beta-binomial posterior mean). With K=200 and real-season samples (n <= ~30),
 *   raw shares move the shrunk estimate only modestly - that is the point.
 * - Verdicts require MIN_FUMBLES_FOR_VERDICT = 2 fumbles. Below that the reading is
 *   NEUTRAL and lowSample: a 0% or 100% share on one fumble is noise, not a signal.
 * - fumbles === 0 means NO INFORMATION: recoveredShare is null (never 0 - zero-weight
 *   counts as no data, mirroring the engine's null-not-zero rule).
 * - Degenerate input throws: fumblesLost > fumbles is impossible; negative or
 *   non-finite counts are data corruption, not zero.
 * - K_INT = 150 is the companion occurrence-side constant (INT rate per dropback
 *   shrinkage) reserved for the expected-turnover evaluator; it does not enter the
 *   recovery-share math here and is exported so callers share one constant set.
 */

export const TURNOVER_LUCK_METHOD_TAG = "turnover_luck_v1" as const;
export const RECOVERY_BASELINE = 0.5;
export const TURNOVER_LUCK_K_FF = 200;
/** Reserved for the occurrence-side (INT per dropback) evaluator. */
export const TURNOVER_LUCK_K_INT = 150;
export const MIN_FUMBLES_FOR_VERDICT = 2;

export interface TeamTurnoverObservation {
  readonly team: string;
  /** Fumbles committed by the team (recovery opportunities). */
  readonly fumbles: number;
  /** Of those, how many were lost to the opponent. */
  readonly fumblesLost: number;
}

export type TurnoverLuckVerdict = "LUCKY" | "NEUTRAL" | "UNLUCKY";

export interface TurnoverLuckReading {
  readonly team: string;
  readonly methodTag: typeof TURNOVER_LUCK_METHOD_TAG;
  readonly fumbles: number;
  readonly fumblesLost: number;
  /** Raw recovered share; null when the team committed zero fumbles (no information). */
  readonly recoveredShare: number | null;
  /** Posterior-mean recovery share shrunk toward RECOVERY_BASELINE. */
  readonly shrunkRecoveryShare: number;
  /**
   * Expected fumbles LOST per future fumble = shrunkRecoveryShare. Expected FUMBLES
   * KEPT per future fumble = 1 - shrunkRecoveryShare.
   */
  readonly expectedLostShare: number;
  readonly verdict: TurnoverLuckVerdict;
  /** True when fumbles < MIN_FUMBLES_FOR_VERDICT - below the interpretability floor. */
  readonly lowSample: boolean;
}

function requireCount(v: number, label: string): number {
  if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
    throw new Error(`turnover-luck: ${label} must be a non-negative finite integer, got ${v}`);
  }
  return v;
}

export function evaluateTurnoverLuckOne(
  obs: TeamTurnoverObservation,
): TurnoverLuckReading {
  if (typeof obs.team !== "string" || obs.team.trim().length === 0) {
    throw new Error("turnover-luck: team must be a non-empty string");
  }
  const fumbles = requireCount(obs.fumbles, "fumbles");
  const fumblesLost = requireCount(obs.fumblesLost, "fumblesLost");
  if (fumblesLost > fumbles) {
    throw new Error(
      `turnover-luck: fumblesLost (${fumblesLost}) cannot exceed fumbles (${fumbles}) for ${obs.team}`,
    );
  }

  const recoveredShare = fumbles === 0 ? null : (fumbles - fumblesLost) / fumbles;
  // Beta-binomial posterior mean: (kept + K * baseline) / (fumbles + K).
  const kept = fumbles - fumblesLost;
  const shrunk = (kept + TURNOVER_LUCK_K_FF * RECOVERY_BASELINE) / (fumbles + TURNOVER_LUCK_K_FF);

  const lowSample = fumbles < MIN_FUMBLES_FOR_VERDICT;
  let verdict: TurnoverLuckVerdict = "NEUTRAL";
  if (!lowSample && recoveredShare !== null) {
    if (recoveredShare >= 0.75) verdict = "LUCKY";
    else if (recoveredShare <= 0.25) verdict = "UNLUCKY";
  }

  return {
    team: obs.team,
    methodTag: TURNOVER_LUCK_METHOD_TAG,
    fumbles,
    fumblesLost,
    recoveredShare,
    shrunkRecoveryShare: Math.round(shrunk * 1e4) / 1e4,
    expectedLostShare: Math.round(shrunk * 1e4) / 1e4,
    verdict,
    lowSample,
  };
}

export interface TurnoverLuckBatchResult {
  readonly methodTag: typeof TURNOVER_LUCK_METHOD_TAG;
  readonly readings: readonly TurnoverLuckReading[];
  readonly lucky: readonly string[];
  readonly unlucky: readonly string[];
  readonly lowSampleTeams: readonly string[];
}

/** Evaluate a slate of team observations. Order preserved; no rows dropped silently. */
export function evaluateTurnoverLuck(
  observations: readonly TeamTurnoverObservation[],
): TurnoverLuckBatchResult {
  if (!Array.isArray(observations)) {
    throw new Error("turnover-luck: observations must be an array");
  }
  const readings = observations.map(evaluateTurnoverLuckOne);
  return {
    methodTag: TURNOVER_LUCK_METHOD_TAG,
    readings,
    lucky: readings.filter((r) => r.verdict === "LUCKY").map((r) => r.team),
    unlucky: readings.filter((r) => r.verdict === "UNLUCKY").map((r) => r.team),
    lowSampleTeams: readings.filter((r) => r.lowSample).map((r) => r.team),
  };
}
