// ============================================================
// Controlled abstention for cover/no-cover classification
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the abstention head is
 * trained with L_NW below (a training-system call), and activation requires
 * the gate (>=2pp covered accuracy, p<0.05, >= DAC) to pass, plus a human
 * call.
 */
export const ENABLED = false;

/**
 * arXiv: 2104.08281v1 — "Controlled Abstention Neural Networks for Identifying Skillful Predictions for Classification Problems"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: add an abstention output to the classification head and
 * train with L_NW = −log(p_correct + p_abstain) − alpha·log(1 − p_abstain);
 * alpha is PID-controlled to hold a target publish fraction. At decision
 * time, publish iff the argmax is not the abstain class. The paper's
 * NotWrong loss beats the DAC variant on their benchmarks.
 *
 * IMPROVEMENT (from ledger): Add an abstention output to GSE's
 * cover/no-cover classification head; train with L_NW = -log(p_correct +
 * p_abstain) - alpha log(1 - p_abstain), alpha PID-controlled to GSE's
 * target publish fraction; publish rule: publish iff argmax != abstain
 * class (equivalently p_abstain below calibrated tau); A/B against
 * baseline + post-hoc likelihood thresholding and the DAC loss variant;
 * LRP/gradient-based attribution on abstained games to check what's
 * driving abstention.
 *
 * ACCEPTANCE GATE: ADAPT if the abstention model beats the baseline on
 * test-window covered-set accuracy by >=2pp with p<0.05 AND >= the DAC
 * variant (replicating the paper's NotWrong > DAC ordering); reject if it
 * doesn't beat the baseline -- then post-hoc thresholding stands and the
 * extra machinery is dropped.
 */

export interface CoverHeadOutputs {
  pCover: number;
  pNoCover: number;
  pAbstain: number;
}

/**
 * NotWrong loss: L_NW = -log(p_correct + p_abstain) - alpha·log(1 - p_abstain).
 * Abstention absorbs uncertain mass without being scored as a wrong answer.
 */
export function notWrongLoss(pCorrect: number, pAbstain: number, alpha: number): number {
  const pC = Math.min(Math.max(pCorrect, 1e-12), 1);
  const pA = Math.min(Math.max(pAbstain, 0), 1 - 1e-12);
  return -Math.log(pC + pA) - alpha * Math.log(1 - pA);
}

/** Publish rule: publish iff argmax != abstain class. */
export function coverPublishRule(o: CoverHeadOutputs): boolean {
  return o.pAbstain < Math.max(o.pCover, o.pNoCover);
}

/** Predicted side for published picks. */
export function coverPrediction(o: CoverHeadOutputs): "cover" | "no-cover" {
  return o.pCover >= o.pNoCover ? "cover" : "no-cover";
}

/**
 * Calibrate tau: the p_abstain threshold reproducing the target publish
 * fraction on validation outputs (publish iff p_abstain < tau).
 */
export function calibrateAbstainTau(validation: CoverHeadOutputs[], targetPublishFraction: number): number {
  if (validation.length === 0) return 0;
  const sorted = validation.map((o) => o.pAbstain).sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(targetPublishFraction * sorted.length));
  return sorted[idx]!;
}

/** Covered-set accuracy of published picks. */
export function coveredAccuracy(
  outputs: CoverHeadOutputs[],
  covered: boolean[],
  tau = Infinity,
): number {
  let correct = 0;
  let n = 0;
  for (let i = 0; i < outputs.length; i++) {
    const o = outputs[i]!;
    const published = tau === Infinity ? coverPublishRule(o) : o.pAbstain < tau;
    if (!published) continue;
    n++;
    if (covered[i] === (coverPrediction(o) === "cover")) correct++;
  }
  return n > 0 ? correct / n : 0;
}

/**
 * Attribution stub for abstained games: returns the input feature
 * contributions (placeholder for LRP/gradient attribution — a human/system
 * call on the trained network). Additive: ranks features by |value × weight|.
 */
export function abstentionAttribution(
  features: number[],
  featureNames: string[],
  weights: number[],
): { feature: string; contribution: number }[] {
  return features
    .map((v, i) => ({ feature: featureNames[i] ?? `f${i}`, contribution: Math.abs(v * (weights[i] ?? 0)) }))
    .sort((a, b) => b.contribution - a.contribution);
}

/**
 * Gate helper: covered accuracy beats baseline by >= 2pp (p<0.05 paired)
 * AND beats the DAC variant (NotWrong > DAC ordering).
 */
export function coverAbstentionGatePasses(
  accNotWrong: number,
  accBaseline: number,
  accDac: number,
  pairedDiffs: number[],
): boolean {
  if (accNotWrong - accBaseline < 0.02) return false;
  if (accNotWrong < accDac) return false;
  const n = pairedDiffs.length;
  if (n < 2) return false;
  const mean = pairedDiffs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(pairedDiffs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1));
  if (sd <= 0) return mean > 0;
  return mean / (sd / Math.sqrt(n)) > 1.645;
}
