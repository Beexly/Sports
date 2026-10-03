/**
 * 1725 Evaluation of the phi-3-mini SLM for identification of texts related to medicine, health, and sports injuries
 *
 * arXiv:2504.08764 · lane:nlp · verdict:ADAPT · owner:Hermes · doctrine:SITUATIONAL
 *
 * Improvement (record): Build a recall-oriented news-cascade triage scaffold with calibrated raw scores, multiplicative reporter-specialty priors, threshold selection against labeled examples, and an explicit cost comparison to a BERT baseline. The module does not call an SLM or train a classifier.
 *
 * ACCEPTANCE GATE:
 * ADAPT strictly as a recall-oriented triage filter in a cascade — never as a standalone labeler. ADAPT proceeds if the reproducible test shows recall ≥ 0.95 at an affordable operating point.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Pure module: no I/O, no network, no credentials. The classifier remains a disabled external dependency.
 */

export const ARXIV_ID = "2504.08764" as const;
export const LANE = "nlp" as const;
export const VERDICT = "ADAPT" as const;
export const ENABLED = false;

export const ACCEPTANCE_GATE = `ADAPT strictly as a recall-oriented triage filter in a cascade — never as a standalone labeler. ADAPT proceeds if the reproducible test shows recall ≥ 0.95 at an affordable operating point.`;

export interface CalibrationPoint {
  readonly rawScore: number;
  readonly probability: number;
}

export interface TriageEvaluation {
  readonly threshold: number;
  readonly recall: number;
  readonly precision: number;
  readonly positives: number;
  readonly selected: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calibrateTriageScore(
  rawScore: number,
  calibration: readonly CalibrationPoint[],
): number | null {
  if (!isFiniteNumber(rawScore) || calibration.length === 0) return null;
  if (!calibration.every((point) => isFiniteNumber(point.rawScore) && isFiniteNumber(point.probability) && point.probability >= 0 && point.probability <= 1)) return null;
  const points = [...calibration].sort((a, b) => a.rawScore - b.rawScore);
  const first = points[0] as CalibrationPoint;
  const last = points[points.length - 1] as CalibrationPoint;
  if (rawScore <= first.rawScore) return first.probability;
  if (rawScore >= last.rawScore) return last.probability;
  for (let index = 1; index < points.length; index += 1) {
    const right = points[index] as CalibrationPoint;
    const left = points[index - 1] as CalibrationPoint;
    if (rawScore <= right.rawScore) {
      const fraction = (rawScore - left.rawScore) / (right.rawScore - left.rawScore);
      return left.probability + fraction * (right.probability - left.probability);
    }
  }
  return last.probability;
}

export function applyReporterSpecialtyPrior(calibratedProbability: number, reporterPrior: number): number | null {
  if (!isFiniteNumber(calibratedProbability) || !isFiniteNumber(reporterPrior)) return null;
  if (calibratedProbability < 0 || calibratedProbability > 1 || reporterPrior < 0 || reporterPrior > 1) return null;
  return calibratedProbability * reporterPrior;
}

export function chooseRecallThreshold(
  scores: readonly number[],
  labels: readonly number[],
  targetRecall = 0.95,
): TriageEvaluation | null {
  if (scores.length === 0 || scores.length !== labels.length || !isFiniteNumber(targetRecall) || targetRecall <= 0 || targetRecall > 1) return null;
  if (!scores.every(isFiniteNumber) || !labels.every((label) => label === 0 || label === 1)) return null;
  const positives = labels.reduce<number>((sum, label) => sum + label, 0);
  if (positives === 0) return null;
  const thresholds = [...new Set(scores)].sort((a, b) => a - b);
  for (const threshold of thresholds) {
    const selected = scores.map((score, index) => score >= threshold);
    const truePositives = selected.reduce((sum, value, index) => sum + (value && labels[index] === 1 ? 1 : 0), 0);
    const recall = truePositives / positives;
    if (recall >= targetRecall) {
      const selectedCount = selected.filter(Boolean).length;
      const precision = selectedCount === 0 ? 0 : truePositives / selectedCount;
      return { threshold, recall, precision, positives, selected: selectedCount };
    }
  }
  return null;
}

export function evaluateTriageGate(
  evaluation: TriageEvaluation | null,
  slmInferenceCost: number,
  bertInferenceCost: number,
  maxCostRatio = 0.1,
): { readonly recallGate: boolean; readonly affordable: boolean; readonly passes: boolean } {
  const valid = isFiniteNumber(slmInferenceCost) && isFiniteNumber(bertInferenceCost) && slmInferenceCost >= 0 && bertInferenceCost > 0 && isFiniteNumber(maxCostRatio) && maxCostRatio > 0;
  if (!valid || evaluation === null) return { recallGate: false, affordable: false, passes: false };
  const recallGate = evaluation.recall >= 0.95;
  const affordable = slmInferenceCost / bertInferenceCost <= maxCostRatio;
  return { recallGate, affordable, passes: recallGate && affordable };
}
