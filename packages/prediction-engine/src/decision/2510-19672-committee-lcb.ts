// ============================================================
// Committee-disagreement abstention + LCB upgrade gate (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2510.19672 — "Policy Learning with Abstention"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: policy learning with abstention — instead of one
 * post/no-post threshold, a committee of K=10 near-optimal
 * pick-selection rules votes, and the policy abstains when the committee
 * disagrees (disagreement fraction above a threshold). A safe-upgrade
 * protocol (LCB gate) blocks new engine versions whose lower confidence
 * bound on recent graded picks fails to clear the bar.
 *
 * IMPROVEMENT (from ledger): GSE replaces the single post/no-post threshold with committee disagreement: K=10 near-optimal pick-selection rules, abstain when they disagree — plus a safe-upgrade protocol (LCB gate) that blocks new engine versions failing on recent graded picks.
 *
 * ACCEPTANCE GATE: ADAPT the disagreement rule iff it beats the single-threshold rule by >=2 selective-ROI points at matched abstention rate on the chronological test block; ADAPT the LCB upgrade gate iff it blocks the known-bad candidate while passing the known-good one.
 */

/** Committee disagreement: fraction of the K rules voting to post. */
export function committeePostFraction(ruleVotes: boolean[]): number {
  const n = ruleVotes.length;
  if (n === 0) return 0;
  return ruleVotes.filter(Boolean).length / n;
}

/** Disagreement: 1 − |2·fraction − 1| (0 = unanimous, 1 = evenly split). */
export function committeeDisagreement(ruleVotes: boolean[]): number {
  const f = committeePostFraction(ruleVotes);
  return 1 - Math.abs(2 * f - 1);
}

/**
 * Abstain when committee disagreement exceeds the threshold.
 * Returns true = post, false = abstain.
 */
export function disagreementPostDecision(ruleVotes: boolean[], threshold: number): boolean {
  return committeeDisagreement(ruleVotes) <= threshold;
}

/** Abstention rate over a set of committee vote vectors. */
export function abstentionRate(allVotes: boolean[][], threshold: number): number {
  if (allVotes.length === 0) return 0;
  const abstained = allVotes.filter((v) => !disagreementPostDecision(v, threshold)).length;
  return abstained / allVotes.length;
}

/** Selective ROI: mean net return per unit on posted picks only. */
export function selectiveRoi(posted: boolean[], netReturns: number[]): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < posted.length; i++) {
    if (posted[i]) {
      sum += netReturns[i]!;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/**
 * LCB safe-upgrade gate: Wilson lower bound of the candidate's hit rate on
 * recent graded picks must clear the bar; blocks known-bad candidates.
 */
export function wilsonLowerBound(hits: number, n: number, z = 1.645): number {
  if (n === 0) return 0;
  const p = hits / n;
  const den = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const half = z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n));
  return Math.max(0, (center - half) / den);
}

/** LCB upgrade decision: pass the candidate iff its LCB clears the bar. */
export function lcbUpgradePasses(hits: number, n: number, bar: number): boolean {
  return wilsonLowerBound(hits, n) >= bar;
}

export interface DisagreementGate {
  disagreementRoi: number;
  thresholdRoi: number;
  liftPoints: number;
  abstentionMatched: boolean;
  lcbBlocksBad: boolean;
  lcbPassesGood: boolean;
  passes: boolean;
}

/**
 * Acceptance-gate helper: disagreement rule beats the single-threshold rule
 * by ≥2 selective-ROI points at matched abstention rate, and the LCB gate
 * blocks the known-bad candidate while passing the known-good one.
 */
export function disagreementGatePasses(
  disagreementRoi: number,
  thresholdRoi: number,
  abstentionDisagreement: number,
  abstentionThreshold: number,
  lcbBlocksBad: boolean,
  lcbPassesGood: boolean,
): DisagreementGate {
  const liftPoints = (disagreementRoi - thresholdRoi) * 100;
  const abstentionMatched = Math.abs(abstentionDisagreement - abstentionThreshold) <= 0.02;
  const passes = liftPoints >= 2 && abstentionMatched && lcbBlocksBad && lcbPassesGood;
  return {
    disagreementRoi,
    thresholdRoi,
    liftPoints,
    abstentionMatched,
    lcbBlocksBad,
    lcbPassesGood,
    passes,
  };
}
