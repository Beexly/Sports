/**
 * Calibration compute.
 *
 * Pure, outcome-anchored analysis. This module does not change model weights
 * and does not write proposals to the database. It produces the evidence a
 * human operator can review before any deliberate model-version bump.
 */

export type CalibrationProposalKind =
  | "CONFIDENCE_SHIFT"
  | "WEIGHT_ADJUSTMENT"
  | "THRESHOLD_CHANGE"
  | "FEATURE_DEPRECATION";

export interface CalibrationPickInput {
  readonly id: string;
  readonly confidence: number;
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";
  readonly sport?: string | null;
  readonly pickType?: string | null;
  readonly riskLevel?: string | null;
  readonly dataQualityScore?: number | null;
  readonly factorKeys?: readonly string[];
}

export interface CalibrationProposal {
  readonly id: string;
  readonly kind: CalibrationProposalKind;
  readonly title: string;
  readonly rationale: string;
  readonly sampleSize: number;
}

export interface CalibrationBucket {
  readonly label: string;
  readonly confidenceMin: number;
  readonly confidenceMax: number;
  readonly sampleSize: number;
  readonly observedWinRate: number;
  readonly expectedWinRate: number;
  readonly delta: number;
  readonly brierScore: number;
}

export interface CalibrationReport {
  readonly buckets: readonly CalibrationBucket[];
  readonly proposals: readonly CalibrationProposal[];
  readonly sampleSize: number;
  readonly brierScore: number | null;
  readonly note: string;
}

const BUCKETS = [
  { label: "50-59", min: 50, max: 59 },
  { label: "60-69", min: 60, max: 69 },
  { label: "70-79", min: 70, max: 79 },
  { label: "80-89", min: 80, max: 89 },
  { label: "90-100", min: 90, max: 100 },
] as const;

const MIN_BUCKET_SAMPLE = 30;
const PROPOSAL_DELTA = 0.12;

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function expectedFromConfidence(confidence: number): number {
  return Math.max(0.01, Math.min(0.99, confidence / 100));
}

function resultToOutcome(result: CalibrationPickInput["result"]): number | null {
  if (result === "WIN") return 1;
  if (result === "LOSS") return 0;
  if (result === "PUSH") return 0.5;
  return null;
}

function bucketFor(confidence: number): (typeof BUCKETS)[number] {
  return BUCKETS.find((bucket) => confidence >= bucket.min && confidence <= bucket.max) ?? BUCKETS[0]!;
}

export function computeCalibration(input: readonly CalibrationPickInput[] = []): CalibrationReport {
  const settled = input
    .map((pick) => ({ pick, outcome: resultToOutcome(pick.result) }))
    .filter((entry): entry is { pick: CalibrationPickInput; outcome: number } => entry.outcome !== null);

  const buckets: CalibrationBucket[] = [];
  for (const bucket of BUCKETS) {
    const rows = settled.filter(({ pick }) => bucketFor(pick.confidence).label === bucket.label);
    if (rows.length === 0) {
      buckets.push({
        label: bucket.label,
        confidenceMin: bucket.min,
        confidenceMax: bucket.max,
        sampleSize: 0,
        observedWinRate: 0,
        expectedWinRate: round((bucket.min + bucket.max) / 200),
        delta: 0,
        brierScore: 0,
      });
      continue;
    }

    const observed = rows.reduce((sum, row) => sum + row.outcome, 0) / rows.length;
    const expected =
      rows.reduce((sum, row) => sum + expectedFromConfidence(row.pick.confidence), 0) / rows.length;
    const brier =
      rows.reduce((sum, row) => {
        const expectedProb = expectedFromConfidence(row.pick.confidence);
        return sum + (expectedProb - row.outcome) ** 2;
      }, 0) / rows.length;

    buckets.push({
      label: bucket.label,
      confidenceMin: bucket.min,
      confidenceMax: bucket.max,
      sampleSize: rows.length,
      observedWinRate: round(observed),
      expectedWinRate: round(expected),
      delta: round(observed - expected),
      brierScore: round(brier),
    });
  }

  const proposals = computeCalibrationProposals(buckets);
  const brierScore =
    settled.length > 0
      ? round(
          settled.reduce((sum, row) => {
            const expectedProb = expectedFromConfidence(row.pick.confidence);
            return sum + (expectedProb - row.outcome) ** 2;
          }, 0) / settled.length
        )
      : null;

  return {
    buckets,
    proposals,
    sampleSize: settled.length,
    brierScore,
    note:
      settled.length === 0
        ? "No settled canonical picks were provided. Calibration remains collecting."
        : "Calibration is evidence only. Proposals require human review and a model-version bump.",
  };
}

export function computeCalibrationProposals(
  buckets: readonly CalibrationBucket[] = []
): readonly CalibrationProposal[] {
  return buckets
    .filter((bucket) => bucket.sampleSize >= MIN_BUCKET_SAMPLE)
    .filter((bucket) => Math.abs(bucket.delta) >= PROPOSAL_DELTA)
    .map((bucket) => ({
      id: `confidence-drift-${bucket.label}`,
      kind: "CONFIDENCE_SHIFT" as const,
      title:
        bucket.delta > 0
          ? `Confidence bucket ${bucket.label} is undercalling outcomes`
          : `Confidence bucket ${bucket.label} is overcalling outcomes`,
      rationale:
        `Observed ${Math.round(bucket.observedWinRate * 100)}% vs expected ` +
        `${Math.round(bucket.expectedWinRate * 100)}% across ${bucket.sampleSize} settled picks. ` +
        "Review before changing weights.",
      sampleSize: bucket.sampleSize,
    }));
}
