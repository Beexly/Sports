/**
 * Scoreline partial-credit metric + availability-aware engine evaluation
 *
 * Research port: arXiv:2607.18084
 * Normalized lane: nlp | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's Scoreline metric for GSE's internal
 * engine-evaluation and public-pick verification machinery: 45 points for
 * the correct outcome class plus closeness terms for predicted margin and
 * predicted total, availability-aware aggregation across model variants,
 * and the lock-before-deadline / score-after verification protocol. The
 * paper's display calibration (eq. 3) is deliberately NOT implemented —
 * external reporting uses raw scores.
 *
 * ACCEPTANCE GATE: The gate for GSE: the Scoreline metric must change
 * model-variant rankings vs raw accuracy on GSE's own data (reproducing the
 * paper's RQ1), or it is decorative. Do not adopt the display calibration
 * (eq. 3) for external reporting — report raw scores.
 */

export type OutcomeClass = "home" | "draw" | "away";

/** Points constants from the paper's Scoreline definition. */
export const SCORELINE_OUTCOME_POINTS = 45;
export const SCORELINE_MARGIN_POINTS = 30;
export const SCORELINE_TOTAL_POINTS = 25;

export interface ScorelineForecast {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
}

export function outcomeClass(home: number, away: number): OutcomeClass {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

/**
 * Scoreline: 45 for the correct outcome class, plus margin closeness
 * (predicted vs actual margin) and total closeness (predicted vs actual
 * total), each linearly decaying to zero at the scale distance.
 */
export function scoreline(
  f: ScorelineForecast,
  marginScale = 21,
  totalScale = 28,
): number {
  if (
    ![f.predictedHome, f.predictedAway, f.actualHome, f.actualAway].every(Number.isFinite) ||
    marginScale <= 0 ||
    totalScale <= 0
  ) {
    return Number.NaN;
  }
  let score = 0;
  if (outcomeClass(f.predictedHome, f.predictedAway) === outcomeClass(f.actualHome, f.actualAway)) {
    score += SCORELINE_OUTCOME_POINTS;
  }
  const marginErr = Math.abs(f.predictedHome - f.predictedAway - (f.actualHome - f.actualAway));
  const totalErr = Math.abs(f.predictedHome + f.predictedAway - (f.actualHome + f.actualAway));
  score += SCORELINE_MARGIN_POINTS * Math.max(0, 1 - marginErr / marginScale);
  score += SCORELINE_TOTAL_POINTS * Math.max(0, 1 - totalErr / totalScale);
  return score;
}

export interface VariantScore {
  variant: string;
  score: number;
  /** fraction of the evaluation window the variant actually produced picks */
  availability: number;
}

/**
 * Availability-aware aggregation: variants are compared on
 * availability-weighted mean score so a variant that sat out hard weeks
 * is not rewarded for abstention.
 */
export function availabilityAwareRanking(variantScores: VariantScore[]): string[] {
  return [...variantScores]
    .map((v) => ({ variant: v.variant, weighted: v.score * Math.max(0, Math.min(1, v.availability)) }))
    .sort((a, b) => b.weighted - a.weighted)
    .map((v) => v.variant);
}

export interface LockedPick {
  variant: string;
  lockedAtMs: number;
  deadlineMs: number;
  scoredAtMs: number;
}

export interface ProtocolCheck {
  variant: string;
  lockedBeforeDeadline: boolean;
  scoredAfterDeadline: boolean;
  valid: boolean;
}

/** Lock-before-deadline / score-after verification protocol. */
export function verifyProtocol(picks: LockedPick[]): ProtocolCheck[] {
  return picks.map((p) => {
    const lockedBeforeDeadline = p.lockedAtMs <= p.deadlineMs;
    const scoredAfterDeadline = p.scoredAtMs > p.deadlineMs;
    return {
      variant: p.variant,
      lockedBeforeDeadline,
      scoredAfterDeadline,
      valid: lockedBeforeDeadline && scoredAfterDeadline,
    };
  });
}

/**
 * RQ1 check helper: does the Scoreline ranking differ from the raw-accuracy
 * ranking on the same forecasts? If not, the metric is decorative for this
 * variant set.
 */
export function rankingDiffers(
  scorelineRanking: string[],
  accuracyRanking: string[],
): boolean {
  if (scorelineRanking.length !== accuracyRanking.length) return true;
  return scorelineRanking.some((v, i) => v !== accuracyRanking[i]);
}

export const GSE_SCORELINE_EVAL_ENABLED = false;
