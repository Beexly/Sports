// ============================================================
// Hostile-market no-bet head (adversarial robustness with abstain)
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (wrong-pick rate cut >=40% vs the 1006 governor at the same no-bet rate,
 * no hit-rate loss) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1911.11253v1 — "Playing it Safe: Adversarial Robustness with an Abstain Option"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: train an explicit abstain output alongside the
 * classifier with a loss that penalizes abstaining on would-be-correct
 * inputs only — so the model abstains exactly where an adversary (here: a
 * hostile market move) is most likely to flip the prediction. Robustness
 * comes from refusing to decide, not from hardening the decision boundary.
 *
 * IMPROVEMENT (from ledger): Add a hostile-market no-bet head to the pick
 * model (explicit abstain output trained to penalize abstaining on
 * would-be-correct games only), with features for line-move magnitude since
 * open, time-to-kickoff of the move, reverse line movement flags,
 * news-volume anomaly, and input-feature OOD score; lambda tuned to a target
 * no-bet rate.
 *
 * ACCEPTANCE GATE: ADOPT if the abstain head cuts the outright-wrong-pick
 * rate by >=40% relative to the 1006 governor at the SAME no-bet rate
 * (+/-2 pp), with no loss of hit rate on the published set; otherwise
 * REJECT.
 */

export interface HostileMarketFeatures {
  /** Line-move magnitude since open, in points. */
  lineMoveMagnitude: number;
  /** Hours from the move to kickoff (small = late steam). */
  hoursToKickoffAtMove: number;
  /** Reverse line movement flag (line moved against the betting splits). */
  reverseLineMove: boolean;
  /** News-volume anomaly z-score. */
  newsVolumeAnomaly: number;
  /** Input-feature out-of-distribution score in [0,1]. */
  oodScore: number;
}

export interface NoBetHeadWeights {
  wMove: number;
  wLate: number;
  wRlm: number;
  wNews: number;
  wOod: number;
  bias: number;
}

export const DEFAULT_NO_BET_WEIGHTS: NoBetHeadWeights = {
  wMove: 0.9,
  wLate: 0.6,
  wRlm: 0.8,
  wNews: 0.5,
  wOod: 0.7,
  bias: -1.6,
};

/**
 * Hostile-market score: linear head over the ledger's feature list.
 * Late big moves against the splits with anomalous news and OOD inputs
 * score highest (most likely to be hostile).
 */
export function hostileMarketScore(f: HostileMarketFeatures, w: NoBetHeadWeights): number {
  const lateFactor = 1 / (1 + Math.max(f.hoursToKickoffAtMove, 0) / 24); // 1 = at kickoff
  const z =
    w.wMove * Math.min(f.lineMoveMagnitude / 3, 2) +
    w.wLate * lateFactor * Math.min(f.lineMoveMagnitude / 3, 2) +
    w.wRlm * (f.reverseLineMove ? 1 : 0) +
    w.wNews * Math.min(Math.max(f.newsVolumeAnomaly, 0), 3) / 3 +
    w.wOod * Math.min(Math.max(f.oodScore, 0), 1) +
    w.bias;
  return 1 / (1 + Math.exp(-z)); // sigmoid -> P(hostile)
}

/**
 * No-bet decision: abstain when P(hostile) >= lambda. Lambda is tuned to a
 * target no-bet rate on validation data (see tuneLambdaToRate).
 */
export function hostileNoBet(pHostile: number, lambda: number): boolean {
  return pHostile >= lambda;
}

/**
 * Tune lambda to hit a target no-bet rate on scored validation games.
 * Returns the lambda achieving the closest rate from above-or-equal
 * (conservative: never under-abstain vs target).
 */
export function tuneLambdaToRate(scores: number[], targetRate: number): { lambda: number; rate: number } {
  const sorted = [...scores].sort((a, b) => b - a); // descending
  const n = sorted.length;
  if (n === 0) return { lambda: 1, rate: 0 };
  const k = Math.min(n, Math.max(1, Math.round(n * targetRate)));
  const lambda = sorted[k - 1]!;
  const rate = sorted.filter((s) => s >= lambda).length / n;
  return { lambda, rate };
}

/**
 * Gate helper: wrong-pick rate cut >= 40% vs the 1006 governor at the same
 * no-bet rate (±2pp), with no hit-rate loss on the published set.
 */
export function hostileGatePasses(
  candidateWrongRate: number,
  governorWrongRate: number,
  candidateNoBetRate: number,
  governorNoBetRate: number,
  candidateHitRate: number,
  baselineHitRate: number,
): boolean {
  const sameRate = Math.abs(candidateNoBetRate - governorNoBetRate) <= 0.02;
  return (
    sameRate &&
    candidateWrongRate <= 0.6 * governorWrongRate &&
    candidateHitRate >= baselineHitRate
  );
}
