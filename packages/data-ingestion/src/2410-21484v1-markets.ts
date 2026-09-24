/**
 * A Systematic Review of Machine Learning in Sports Betting: Techniques, Challenges, and Future Directions
 *
 * arXiv:2410.21484v1 · lane:markets · verdict:ADAPT · owner:Motif-lab · doctrine:BASELINE
 *
 * Improvement (record): Treat the review as a pointer list only. Pool reported ROI only from retrievable primary studies with auditable experiments, apply a deterministic publication-bias trim, and expose calibration-versus-accuracy diagnostics for offline NFL evaluation.
 *
 * ACCEPTANCE GATE:
 * For the review as evidence: REJECT as a source of conclusions (narrative, unverified, no pooling) — accept only as a pointer list. Promote a cited primary paper to deep-read only if it is retrievable and contains an auditable experiment.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Pure module: no I/O, no network, no credentials. The review cannot authorize conclusions.
 */

export const ARXIV_ID = "2410.21484v1" as const;
export const LANE = "markets" as const;
export const VERDICT = "ADAPT" as const;
export const ENABLED = false;

export const ACCEPTANCE_GATE = `For the review as evidence: REJECT as a source of conclusions (narrative, unverified, no pooling) — accept only as a pointer list. Promote a cited primary paper to deep-read only if it is retrievable and contains an auditable experiment.`;

export interface ReviewStudy {
  readonly id: string;
  readonly retrievable: boolean;
  readonly primary: boolean;
  readonly auditableExperiment: boolean;
  readonly reportedRoi?: number;
}

export interface RoiPoolSummary {
  readonly n: number;
  readonly rawMean: number;
  readonly publicationBiasAdjustedMean: number;
  readonly median: number;
  readonly trimmedCount: number;
}

export interface ForecastSkill {
  readonly brier: number;
  readonly logLoss: number;
  readonly accuracy: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function isPromotablePrimaryStudy(study: ReviewStudy): boolean {
  return study.retrievable && study.primary && study.auditableExperiment;
}

export function buildReviewPointerList(studies: readonly ReviewStudy[]): {
  readonly studyIds: string[];
  readonly conclusionsAllowed: false;
} {
  return {
    studyIds: studies.filter(isPromotablePrimaryStudy).map((study) => study.id),
    conclusionsAllowed: false,
  };
}

export function poolReportedRoi(
  studies: readonly ReviewStudy[],
  trimFraction = 0.1,
): RoiPoolSummary | null {
  if (!isFiniteNumber(trimFraction) || trimFraction < 0 || trimFraction >= 0.5) return null;
  const eligible = studies
    .filter((study) => isPromotablePrimaryStudy(study) && study.reportedRoi !== undefined)
    .map((study) => study.reportedRoi as number)
    .filter(isFiniteNumber)
    .sort((a, b) => a - b);
  if (eligible.length === 0) return null;

  const rawMean = mean(eligible);
  const trim = Math.floor(eligible.length * trimFraction);
  const adjustedValues = trim === 0 ? eligible : eligible.slice(trim, eligible.length - trim);
  const adjustedMean = mean(adjustedValues);
  const middle = Math.floor(eligible.length / 2);
  const leftMiddle = eligible[middle - 1];
  const rightMiddle = eligible[middle];
  const median = eligible.length % 2 === 0 && leftMiddle !== undefined && rightMiddle !== undefined
    ? (leftMiddle + rightMiddle) / 2
    : rightMiddle;
  if (median === undefined || !Number.isFinite(median)) return null;

  return {
    n: eligible.length,
    rawMean,
    publicationBiasAdjustedMean: adjustedMean,
    median,
    trimmedCount: eligible.length - adjustedValues.length,
  };
}

export function evaluateForecastSkill(
  probabilities: readonly number[],
  outcomes: readonly number[],
): ForecastSkill | null {
  if (probabilities.length === 0 || probabilities.length !== outcomes.length) return null;
  if (!probabilities.every((probability) => isFiniteNumber(probability) && probability >= 0 && probability <= 1)) return null;
  if (!outcomes.every((outcome) => outcome === 0 || outcome === 1)) return null;

  const epsilon = 1e-15;
  const brier = mean(probabilities.map((probability, index) => {
    const outcome = outcomes[index] as number;
    return (probability - outcome) ** 2;
  }));
  const logLoss = -mean(probabilities.map((probability, index) => {
    const outcome = outcomes[index] as number;
    const safeProbability = Math.min(1 - epsilon, Math.max(epsilon, probability));
    return outcome === 1 ? Math.log(safeProbability) : Math.log(1 - safeProbability);
  }));
  const accuracy = mean(probabilities.map((probability, index) => {
    const outcome = outcomes[index] as number;
    return (probability >= 0.5 ? 1 : 0) === outcome ? 1 : 0;
  }));

  return { brier, logLoss, accuracy };
}
