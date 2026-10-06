/**
 * Bounded proper scoring rule ("practical" rule) — arXiv 1808.07501v2
 * ("Calibration Scoring Rules for Practical Prediction Training").
 *
 * ADDITIVE utility. Not wired into any leaderboard (that wiring is a
 * NEEDS HUMAN CALL — see WIRING-PLAN.md).
 *
 * The log scoring rule is the only strictly proper rule in the paper's
 * practical sense, but its unbounded blowups on near-certain misses are
 * trust-destroying on a public leaderboard. The practical rule keeps the
 * log rule's incentives while capping the worst single-forecast loss at
 * the paper's s_min = −57.27.
 *
 * practicalScore(p, outcome) = max(log(p_outcome), S_MIN)
 *   where p_outcome = p if outcome = 1 else 1 − p.
 *
 * Improvement-ledger gate: ADOPT for the analyst leaderboard only if it
 * preserves the raw-log-score forecaster ranking (Spearman ≥ 0.95) while
 * capping the worst single-forecast loss at −57.27.
 */

/** The paper's worst-single-forecast loss cap. */
export const PRACTICAL_SCORE_MIN = -57.27;

/** Unbounded log score of a binary forecast. −∞ when fully wrong. */
export function logScore(probability: number, outcome: 0 | 1): number {
  const p = outcome === 1 ? probability : 1 - probability;
  return Math.log(p);
}

/** Bounded ("practical") log score: worst single loss capped at S_MIN. */
export function practicalScore(probability: number, outcome: 0 | 1): number {
  return Math.max(logScore(probability, outcome), PRACTICAL_SCORE_MIN);
}

/** Mean practical score over a set of forecasts (higher is better). */
export function meanPracticalScore(
  samples: readonly { readonly probability: number; readonly outcome: 0 | 1 }[],
): number {
  if (samples.length === 0) return 0;
  return (
    samples.reduce((sum, s) => sum + practicalScore(s.probability, s.outcome), 0) /
    samples.length
  );
}
