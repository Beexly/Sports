/**
 * Calibration compute.
 *
 * Pure, outcome-anchored analysis. This module does not change model weights
 * and does not write proposals to the database. It produces the evidence a
 * human operator can review before any deliberate model-version bump.
 */

import { wilsonInterval } from "@sports/prediction-engine";

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
  /** 95% Wilson lower bound on the observed win rate — the defensible floor. */
  readonly wilsonLow: number;
  /** 95% Wilson upper bound on the observed win rate. */
  readonly wilsonHigh: number;
}

/**
 * Discrimination ("rank quality") of the confidence score.
 *
 * Brier score and per-bucket deltas measure ABSOLUTE calibration — they assume
 * `confidence/100` is a win probability. That assumption holds for moneyline
 * picks (confidence is derived from the vig-free fair probability) but NOT for
 * spread/total picks, which are priced to ~50% by construction: a well-built
 * spread model can be perfectly useful yet still win ~52-54% at the top of the
 * confidence range. Judged on absolute calibration alone, every spread/total
 * pick looks "overconfident."
 *
 * Discrimination sidesteps that by asking a different, market-neutral question:
 * does the OBSERVED win rate rise as confidence rises? If higher-confidence
 * buckets win more often than lower-confidence buckets, the score is doing its
 * job as a ranking signal even when its absolute level is not a probability.
 * This is evidence only — like every other field here, it never changes weights.
 */
export interface CalibrationDiscrimination {
  /** improving = win rate rises with confidence; inverted = it falls; flat = no signal. */
  readonly trend: "improving" | "flat" | "inverted" | "insufficient-data";
  /** Buckets with enough settled picks to count toward the trend. */
  readonly populatedBucketCount: number;
  readonly lowestBucketLabel: string | null;
  readonly highestBucketLabel: string | null;
  readonly lowestBucketWinRate: number | null;
  readonly highestBucketWinRate: number | null;
  /** highestBucketWinRate − lowestBucketWinRate (positive = confidence ranks correctly). */
  readonly spread: number | null;
  /** True when every step from low to high confidence is non-decreasing (within tolerance). */
  readonly monotonic: boolean;
  readonly note: string;
}

export interface CalibrationReport {
  readonly buckets: readonly CalibrationBucket[];
  readonly proposals: readonly CalibrationProposal[];
  readonly sampleSize: number;
  readonly brierScore: number | null;
  readonly discrimination: CalibrationDiscrimination;
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
// Discrimination needs less sample than a weight-change proposal: it is a
// directional ranking signal, not a basis for altering the model. A bucket
// counts toward the trend once it has this many settled picks.
const MIN_DISCRIMINATION_SAMPLE = 20;
// Tolerance band (win-rate units) for calling the trend flat vs. directional.
const DISCRIMINATION_EPSILON = 0.02;

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
        wilsonLow: 0,
        wilsonHigh: 1,
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

    const { low: wilsonLow, high: wilsonHigh } = wilsonInterval(observed, rows.length);

    buckets.push({
      label: bucket.label,
      confidenceMin: bucket.min,
      confidenceMax: bucket.max,
      sampleSize: rows.length,
      observedWinRate: round(observed),
      expectedWinRate: round(expected),
      delta: round(observed - expected),
      brierScore: round(brier),
      wilsonLow: round(wilsonLow),
      wilsonHigh: round(wilsonHigh),
    });
  }

  const proposals = computeCalibrationProposals(buckets);
  const discrimination = computeDiscrimination(buckets);
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
    discrimination,
    note:
      settled.length === 0
        ? "No settled canonical picks were provided. Calibration remains collecting."
        : "Calibration is evidence only. Proposals require human review and a model-version bump.",
  };
}

/**
 * Compute the discrimination (rank-quality) signal from confidence buckets.
 *
 * Market-neutral: it asks whether observed win rate rises with confidence,
 * regardless of whether confidence is an absolute probability. Exported for
 * direct unit testing in the same style as `computeCalibrationProposals`.
 */
export function computeDiscrimination(
  buckets: readonly CalibrationBucket[] = []
): CalibrationDiscrimination {
  const populated = buckets
    .filter((bucket) => bucket.sampleSize >= MIN_DISCRIMINATION_SAMPLE)
    .slice()
    // BUCKETS are defined ascending by confidence; sort explicitly so the
    // trend is order-independent of how callers build the bucket array.
    .sort((a, b) => a.confidenceMin - b.confidenceMin);

  if (populated.length < 2) {
    const only = populated[0] ?? null;
    return {
      trend: "insufficient-data",
      populatedBucketCount: populated.length,
      lowestBucketLabel: only?.label ?? null,
      highestBucketLabel: only?.label ?? null,
      lowestBucketWinRate: only?.observedWinRate ?? null,
      highestBucketWinRate: only?.observedWinRate ?? null,
      spread: null,
      monotonic: false,
      note:
        `Need at least two confidence buckets with ${MIN_DISCRIMINATION_SAMPLE}+ settled ` +
        "picks to judge whether higher confidence ranks into higher win rates.",
    };
  }

  const low = populated[0]!;
  const high = populated[populated.length - 1]!;
  const spread = round(high.observedWinRate - low.observedWinRate);

  let monotonic = true;
  for (let i = 1; i < populated.length; i++) {
    if (populated[i]!.observedWinRate < populated[i - 1]!.observedWinRate - DISCRIMINATION_EPSILON) {
      monotonic = false;
      break;
    }
  }

  const trend: CalibrationDiscrimination["trend"] =
    spread > DISCRIMINATION_EPSILON
      ? "improving"
      : spread < -DISCRIMINATION_EPSILON
        ? "inverted"
        : "flat";

  const note =
    trend === "improving"
      ? `Observed win rate rises from ${Math.round(low.observedWinRate * 100)}% (${low.label}) to ` +
        `${Math.round(high.observedWinRate * 100)}% (${high.label}) across ${populated.length} buckets` +
        `${monotonic ? "" : " (with a local dip)"} — confidence is ranking picks correctly. ` +
        "For spread/total markets, absolute win rates near 50% are expected by construction; " +
        "rank quality is the calibration signal that matters."
      : trend === "inverted"
        ? `Observed win rate FALLS from ${Math.round(low.observedWinRate * 100)}% (${low.label}) to ` +
          `${Math.round(high.observedWinRate * 100)}% (${high.label}) — higher confidence is winning ` +
          "less often. Treat as a red flag for the scoring weights before promoting confidence to users."
        : `Observed win rate is essentially flat from ${low.label} to ${high.label} ` +
          `(spread ${spread >= 0 ? "+" : ""}${Math.round(spread * 100)} pts) — confidence is not yet ` +
          "discriminating between stronger and weaker picks.";

  return {
    trend,
    populatedBucketCount: populated.length,
    lowestBucketLabel: low.label,
    highestBucketLabel: high.label,
    lowestBucketWinRate: low.observedWinRate,
    highestBucketWinRate: high.observedWinRate,
    spread,
    monotonic,
    note,
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
