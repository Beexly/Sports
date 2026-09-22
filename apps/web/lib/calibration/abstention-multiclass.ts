/**
 * Multiclass classification with a reject option — arXiv 1505.04137v1
 * ("Consistent Algorithms for Multiclass Classification with a Reject Option").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * picks and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: abstain unless some class clears the tau bar, where tau is
 * set from the abstention cost alpha (staking economics). Gives a principled
 * "don't bet this market" action for many-class markets (e.g. anytime-TD
 * scorer: top-12 names + field = 13 classes + abstain).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT multi-outcome abstention only if
 * (a) it beats fixed-threshold abstention on 2024 ROI at >=2 abstention rates,
 * (b) BEP and OVA agree on >=80% of abstain decisions, and (c) the abstain
 * rate does not collapse to 0 or 1 on any single team/season slice.
 */

export const ABSTAIN = -1;

export interface AbstentionDecision {
  /** Predicted class index, or ABSTAIN (-1). */
  readonly prediction: number;
  readonly abstained: boolean;
  readonly maxProb: number;
}

/**
 * Tau-bar abstention rule: predict argmax class iff its probability clears
 * tau, else abstain. tau in (0, 1].
 */
export function abstainDecision(
  classProbs: readonly number[],
  tau: number,
): AbstentionDecision {
  if (classProbs.length === 0) {
    return { prediction: ABSTAIN, abstained: true, maxProb: 0 };
  }
  let best = 0;
  let maxProb = classProbs[0]!;
  for (let i = 1; i < classProbs.length; i++) {
    if (classProbs[i]! > maxProb) {
      maxProb = classProbs[i]!;
      best = i;
    }
  }
  if (maxProb >= tau) return { prediction: best, abstained: false, maxProb };
  return { prediction: ABSTAIN, abstained: true, maxProb };
}

/**
 * Tau from abstention cost: abstain unless the top class clears 1 - alpha.
 * alpha ~ 0.2-0.3 per the ledger (set from staking economics).
 */
export function tauFromCost(alpha: number): number {
  const a = Math.min(Math.max(alpha, 0), 1);
  return 1 - a;
}

/**
 * Calibrate tau on validation class-prob rows to hit a target abstention
 * rate. Returns the smallest tau achieving abstention rate >= target, or 1.
 */
export function calibrateTauForAbstentionRate(
  validationRows: ReadonlyArray<readonly number[]>,
  targetRate: number,
): number {
  if (validationRows.length === 0) return 1;
  const maxes = validationRows
    .map((r) => (r.length === 0 ? 0 : Math.max(...r)))
    .sort((a, b) => a - b);
  const idx = Math.min(
    maxes.length - 1,
    Math.floor(targetRate * maxes.length),
  );
  return maxes[idx]!;
}

/** Abstention rate of the tau rule on validation rows. */
export function abstentionRate(
  validationRows: ReadonlyArray<readonly number[]>,
  tau: number,
): number {
  if (validationRows.length === 0) return 0;
  let n = 0;
  for (const r of validationRows) {
    if (abstainDecision(r, tau).abstained) n++;
  }
  return n / validationRows.length;
}

/**
 * Agreement fraction between two surrogate abstain policies (e.g. OVA-hinge
 * vs BEP) on the same rows: fraction of rows where both abstain or both bet.
 * Gate (b) requires >= 0.80.
 */
export function abstainAgreement(
  policyA: ReadonlyArray<boolean>,
  policyB: ReadonlyArray<boolean>,
): number {
  if (policyA.length === 0 || policyA.length !== policyB.length) return 0;
  let agree = 0;
  for (let i = 0; i < policyA.length; i++) {
    if (policyA[i] === policyB[i]) agree++;
  }
  return agree / policyA.length;
}
