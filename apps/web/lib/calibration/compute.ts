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
  readonly modelProbability?: number | null;
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
  readonly probabilitySampleSize: number;
  readonly probabilityObservedWinRate: number | null;
  readonly expectedWinRate: number | null;
  readonly delta: number | null;
  readonly brierScore: number | null;
  /**
   * True once the bucket has enough settled picks to PUBLISH its observed win
   * rate on a public surface. `observedWinRate` is always computed for internal
   * use (proposals, discrimination, Brier), but a thin bucket — e.g. 2 settled
   * picks reading "100%" — must never render a win-rate number to users. Every
   * public renderer gates on this flag; see MIN_PUBLISH_BUCKET_SAMPLE.
   */
  readonly sufficientSample: boolean;
  readonly sufficientProbabilitySample: boolean;
}

/**
 * Discrimination ("rank quality") of the confidence score.
 *
 * Brier score and per-bucket deltas measure ABSOLUTE calibration and therefore
 * use only a frozen model probability. The 0–100 confidence field is a ranking
 * score, not a win probability, for every market type.
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
  readonly probabilitySampleSize: number;
  readonly brierScore: number | null;
  readonly discrimination: CalibrationDiscrimination;
  readonly note: string;
}

export interface ProjectionCalibrationInput {
  readonly id: string;
  readonly position: string;
  readonly predictedFantasyPoints: number;
  readonly actualFantasyPoints: number;
  readonly intervalLower: number;
  readonly intervalUpper: number;
  readonly marketFantasyPoints: number;
  readonly preGameCommittedAt?: string | null;
  readonly settledAt?: string | null;
  readonly modelWinProbability?: number | null;
  readonly marketWinProbability?: number | null;
  readonly outcome?: 0 | 1 | null;
  readonly modelStdDev?: number | null;
  readonly marketStdDev?: number | null;
}

export interface ProjectionPreGameCommit {
  readonly id: string;
  readonly status: "DRAFT_ONLY";
  readonly createdAt: string;
  readonly sampleSize: number;
  readonly fingerprint: string;
}

export interface PositionProjectionCalibration {
  readonly position: string;
  readonly sampleSize: number;
  readonly modelMae: number;
  readonly marketMae: number;
  readonly modelMaeEdge: number;
  readonly intervalCoverage: number;
  readonly coveredCount: number;
}

export interface ProjectionCalibrationScores {
  readonly brierScore: number | null;
  readonly marketBrierScore: number | null;
  readonly logLoss: number | null;
  readonly marketLogLoss: number | null;
  readonly crps: number | null;
  readonly marketCrps: number | null;
}

export interface CanPublishProjectionsCriteria {
  readonly minSampleSize: number;
  readonly maxModelMaeToMarketRatio: number;
  readonly minIntervalCoverage: number;
  readonly minRankCorrelation: number;
  readonly requireBetterCrpsThanMarket: boolean;
  readonly requireBetterBrierThanMarket: boolean;
  readonly requireBetterLogLossThanMarket: boolean;
}

export interface CanPublishProjectionsDraftResult {
  readonly criterionId: "canPublishProjections";
  readonly status: "DRAFT_ONLY";
  readonly eligibleIfOwnerApproves: boolean;
  readonly failedCriteria: readonly string[];
  readonly note: string;
}

export interface PublicProjectionArtifactRow {
  readonly id: string;
  readonly position: string;
  readonly predictedFantasyPoints: number;
  readonly actualFantasyPoints: number;
  readonly marketFantasyPoints: number;
  readonly intervalLower: number;
  readonly intervalUpper: number;
  readonly covered: boolean;
  readonly modelAbsoluteError: number;
  readonly marketAbsoluteError: number;
}

export interface PublicProjectionCalibrationArtifact {
  readonly status: "DRAFT_ONLY";
  readonly generatedAt: string;
  readonly preGameCommit: ProjectionPreGameCommit;
  readonly sampleSize: number;
  readonly maeByPosition: readonly PositionProjectionCalibration[];
  readonly overallModelMae: number | null;
  readonly overallMarketMae: number | null;
  readonly intervalCoverage: number | null;
  readonly rankCorrelation: number | null;
  readonly scores: ProjectionCalibrationScores;
  readonly canPublishProjections: CanPublishProjectionsDraftResult;
  readonly rows: readonly PublicProjectionArtifactRow[];
}

const BUCKETS = [
  { label: "50-59", min: 50, max: 59 },
  { label: "60-69", min: 60, max: 69 },
  { label: "70-79", min: 70, max: 79 },
  { label: "80-89", min: 80, max: 89 },
  { label: "90-100", min: 90, max: 100 },
] as const;

const MIN_BUCKET_SAMPLE = 30;
// Minimum settled picks before a bucket's observed win rate may be PUBLISHED on a
// public surface. Same floor as the /api/performance min-sample guard: a bucket
// below it is still computed (proposals/discrimination use observedWinRate), but
// renderers must withhold the percentage so a 2-pick "100%" never reaches users.
const MIN_PUBLISH_BUCKET_SAMPLE = 30;
const PROPOSAL_DELTA = 0.12;
// Discrimination needs less sample than a weight-change proposal: it is a
// directional ranking signal, not a basis for altering the model. A bucket
// counts toward the trend once it has this many settled picks.
const MIN_DISCRIMINATION_SAMPLE = 20;
// Tolerance band (win-rate units) for calling the trend flat vs. directional.
const DISCRIMINATION_EPSILON = 0.02;
const NORMAL_90_Z = 1.6448536269514722;
const DEFAULT_PROJECTION_PUBLISH_CRITERIA: CanPublishProjectionsCriteria = {
  minSampleSize: 50,
  maxModelMaeToMarketRatio: 0.999,
  minIntervalCoverage: 0.8,
  minRankCorrelation: 0.2,
  requireBetterCrpsThanMarket: true,
  requireBetterBrierThanMarket: true,
  requireBetterLogLossThanMarket: true,
};

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function finiteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function resultToOutcome(result: CalibrationPickInput["result"]): number | null {
  if (result === "WIN") return 1;
  if (result === "LOSS") return 0;
  if (result === "PUSH") return 0.5;
  return null;
}

function bucketFor(confidence: number): (typeof BUCKETS)[number] {
  // Buckets are contiguous via exclusive upper boundaries (the NEXT bucket's
  // min): a value belongs to bucket i when it is below bucket i+1's floor. This
  // closes the gaps in the integer [min,max] ranges (e.g. 69.3 / 89.5) that
  // previously fell through to the 50-59 bucket and corrupted the per-bucket
  // win rates. Values below the lowest floor clamp to the lowest bucket; the
  // top bucket absorbs 90-100 and anything above.
  for (let i = 0; i < BUCKETS.length; i++) {
    const next = BUCKETS[i + 1];
    if (!next || confidence < next.min) return BUCKETS[i]!;
  }
  return BUCKETS[BUCKETS.length - 1]!;
}

export function computeCalibration(input: readonly CalibrationPickInput[] = []): CalibrationReport {
  const settled = input
    .map((pick) => ({ pick, outcome: resultToOutcome(pick.result) }))
    .filter((entry): entry is { pick: CalibrationPickInput; outcome: number } => entry.outcome !== null);

  const buckets: CalibrationBucket[] = [];
  for (const bucket of BUCKETS) {
    const rows = settled.filter(({ pick }) => bucketFor(pick.confidence).label === bucket.label);
    const probabilityRows = rows.flatMap((row) =>
      finiteNumber(row.pick.modelProbability) &&
      row.pick.modelProbability >= 0 &&
      row.pick.modelProbability <= 1
        ? [{ ...row, probability: row.pick.modelProbability }]
        : [],
    );
    if (rows.length === 0) {
      buckets.push({
        label: bucket.label,
        confidenceMin: bucket.min,
        confidenceMax: bucket.max,
        sampleSize: 0,
        observedWinRate: 0,
        probabilitySampleSize: 0,
        probabilityObservedWinRate: null,
        expectedWinRate: null,
        delta: null,
        brierScore: null,
        sufficientSample: false,
        sufficientProbabilitySample: false,
      });
      continue;
    }

    const observed = rows.reduce((sum, row) => sum + row.outcome, 0) / rows.length;
    const probabilityObserved = probabilityRows.length > 0
      ? probabilityRows.reduce((sum, row) => sum + row.outcome, 0) / probabilityRows.length
      : null;
    const expected = probabilityRows.length > 0
      ? probabilityRows.reduce((sum, row) => sum + row.probability, 0) / probabilityRows.length
      : null;
    const brier = probabilityRows.length > 0
      ? probabilityRows.reduce(
          (sum, row) => sum + (row.probability - row.outcome) ** 2,
          0,
        ) / probabilityRows.length
      : null;

    buckets.push({
      label: bucket.label,
      confidenceMin: bucket.min,
      confidenceMax: bucket.max,
      sampleSize: rows.length,
      observedWinRate: round(observed),
      probabilitySampleSize: probabilityRows.length,
      probabilityObservedWinRate:
        probabilityObserved === null ? null : round(probabilityObserved),
      expectedWinRate: expected === null ? null : round(expected),
      delta:
        probabilityObserved === null || expected === null
          ? null
          : round(probabilityObserved - expected),
      brierScore: brier === null ? null : round(brier),
      sufficientSample: rows.length >= MIN_PUBLISH_BUCKET_SAMPLE,
      sufficientProbabilitySample:
        probabilityRows.length >= MIN_PUBLISH_BUCKET_SAMPLE,
    });
  }

  const proposals = computeCalibrationProposals(buckets);
  const discrimination = computeDiscrimination(buckets);
  const settledProbabilityRows = settled.flatMap((row) =>
    finiteNumber(row.pick.modelProbability) &&
    row.pick.modelProbability >= 0 &&
    row.pick.modelProbability <= 1
      ? [{ ...row, probability: row.pick.modelProbability }]
      : [],
  );
  const brierScore =
    settledProbabilityRows.length > 0
      ? round(
          settledProbabilityRows.reduce(
            (sum, row) => sum + (row.probability - row.outcome) ** 2,
            0,
          ) / settledProbabilityRows.length,
        )
      : null;

  return {
    buckets,
    proposals,
    sampleSize: settled.length,
    probabilitySampleSize: settledProbabilityRows.length,
    brierScore,
    discrimination,
    note:
      settled.length === 0
        ? "No settled canonical picks were provided. Calibration remains collecting."
        : settledProbabilityRows.length === 0
          ? "Confidence rank evidence is available; probability calibration remains unavailable until frozen model probabilities exist."
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
        `${monotonic ? "" : " (with a local dip)"}. Confidence is ranking picks correctly. ` +
        "For spread/total markets, absolute win rates near 50% are expected by construction; " +
        "rank quality is the calibration signal that matters."
      : trend === "inverted"
        ? `Observed win rate FALLS from ${Math.round(low.observedWinRate * 100)}% (${low.label}) to ` +
          `${Math.round(high.observedWinRate * 100)}% (${high.label}). Higher confidence is winning ` +
          "less often. Treat as a red flag for the scoring weights before promoting confidence to users."
        : `Observed win rate is essentially flat from ${low.label} to ${high.label} ` +
          `(spread ${spread >= 0 ? "+" : ""}${Math.round(spread * 100)} pts). Confidence is not yet ` +
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

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function projectionFingerprintRows(samples: readonly ProjectionCalibrationInput[]): string {
  return [...samples]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((row) =>
      [
        row.id,
        row.position,
        round(row.predictedFantasyPoints, 4),
        round(row.intervalLower, 4),
        round(row.intervalUpper, 4),
        round(row.marketFantasyPoints, 4),
        row.preGameCommittedAt ?? "",
      ].join("|")
    )
    .join("\n");
}

export function buildProjectionPreGameCommit(
  samples: readonly ProjectionCalibrationInput[] = [],
  createdAt: string | Date = new Date()
): ProjectionPreGameCommit {
  const fingerprint = stableHash(projectionFingerprintRows(samples));
  return {
    id: `projection-commit-${fingerprint}`,
    status: "DRAFT_ONLY",
    createdAt: typeof createdAt === "string" ? createdAt : createdAt.toISOString(),
    sampleSize: samples.length,
    fingerprint,
  };
}

function ranks(values: readonly number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);
  const output = new Array(values.length).fill(0);
  let start = 0;
  while (start < sorted.length) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1]!.value === sorted[start]!.value) end += 1;
    const averageRank = (start + end + 2) / 2;
    for (let i = start; i <= end; i++) output[sorted[i]!.index] = averageRank;
    start = end + 1;
  }
  return output;
}

function spearmanRankCorrelation(
  rows: readonly Pick<ProjectionCalibrationInput, "predictedFantasyPoints" | "actualFantasyPoints">[]
): number | null {
  if (rows.length < 2) return null;
  const predictedRanks = ranks(rows.map((row) => row.predictedFantasyPoints));
  const actualRanks = ranks(rows.map((row) => row.actualFantasyPoints));
  const predMean = predictedRanks.reduce((sum, value) => sum + value, 0) / predictedRanks.length;
  const actualMean = actualRanks.reduce((sum, value) => sum + value, 0) / actualRanks.length;
  let numerator = 0;
  let predDenom = 0;
  let actualDenom = 0;
  for (let i = 0; i < rows.length; i++) {
    const pred = predictedRanks[i]! - predMean;
    const actual = actualRanks[i]! - actualMean;
    numerator += pred * actual;
    predDenom += pred ** 2;
    actualDenom += actual ** 2;
  }
  if (predDenom === 0 || actualDenom === 0) return null;
  return round(numerator / Math.sqrt(predDenom * actualDenom));
}

function clampProbability(value: number): number {
  return Math.max(0.001, Math.min(0.999, value));
}

function logLoss(probability: number, outcome: 0 | 1): number {
  const p = clampProbability(probability);
  return outcome === 1 ? -Math.log(p) : -Math.log(1 - p);
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x));
  return sign * y;
}

function normalPdf(value: number): number {
  return Math.exp(-0.5 * value ** 2) / Math.sqrt(2 * Math.PI);
}

function normalCdf(value: number): number {
  return 0.5 * (1 + erf(value / Math.SQRT2));
}

function stdDevFromInterval(row: ProjectionCalibrationInput): number {
  if (finiteNumber(row.modelStdDev) && row.modelStdDev > 0) return row.modelStdDev;
  const intervalWidth = row.intervalUpper - row.intervalLower;
  if (intervalWidth > 0) return Math.max(0.1, intervalWidth / (2 * NORMAL_90_Z));
  return Math.max(1, Math.abs(row.predictedFantasyPoints) * 0.25);
}

function marketStdDev(row: ProjectionCalibrationInput): number {
  if (finiteNumber(row.marketStdDev) && row.marketStdDev > 0) return row.marketStdDev;
  return stdDevFromInterval(row);
}

function normalCrps(mean: number, stdev: number, actual: number): number {
  const sigma = Math.max(0.1, stdev);
  const z = (actual - mean) / sigma;
  const score = sigma * (z * (2 * normalCdf(z) - 1) + 2 * normalPdf(z) - 1 / Math.sqrt(Math.PI));
  return Math.max(0, score);
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isPreGameCommitted(row: ProjectionCalibrationInput): boolean {
  if (!row.preGameCommittedAt) return false;
  if (!row.settledAt) return true;
  return new Date(row.preGameCommittedAt).getTime() < new Date(row.settledAt).getTime();
}

export function buildProjectionSelfPublishingArtifact(
  input: readonly ProjectionCalibrationInput[] = [],
  options: {
    readonly generatedAt?: string | Date;
    readonly criteria?: Partial<CanPublishProjectionsCriteria>;
  } = {}
): PublicProjectionCalibrationArtifact {
  const criteria: CanPublishProjectionsCriteria = {
    ...DEFAULT_PROJECTION_PUBLISH_CRITERIA,
    ...options.criteria,
  };
  const generatedAt =
    options.generatedAt === undefined
      ? new Date().toISOString()
      : typeof options.generatedAt === "string"
        ? options.generatedAt
        : options.generatedAt.toISOString();
  const settled = input.filter(
    (row) =>
      finiteNumber(row.predictedFantasyPoints) &&
      finiteNumber(row.actualFantasyPoints) &&
      finiteNumber(row.intervalLower) &&
      finiteNumber(row.intervalUpper) &&
      finiteNumber(row.marketFantasyPoints)
  );
  const rows: PublicProjectionArtifactRow[] = settled.map((row) => {
    const modelAbsoluteError = Math.abs(row.predictedFantasyPoints - row.actualFantasyPoints);
    const marketAbsoluteError = Math.abs(row.marketFantasyPoints - row.actualFantasyPoints);
    return {
      id: row.id,
      position: row.position,
      predictedFantasyPoints: round(row.predictedFantasyPoints),
      actualFantasyPoints: round(row.actualFantasyPoints),
      marketFantasyPoints: round(row.marketFantasyPoints),
      intervalLower: round(row.intervalLower),
      intervalUpper: round(row.intervalUpper),
      covered: row.actualFantasyPoints >= row.intervalLower && row.actualFantasyPoints <= row.intervalUpper,
      modelAbsoluteError: round(modelAbsoluteError),
      marketAbsoluteError: round(marketAbsoluteError),
    };
  });

  const byPosition = new Map<string, PublicProjectionArtifactRow[]>();
  for (const row of rows) {
    const bucket = byPosition.get(row.position) ?? [];
    bucket.push(row);
    byPosition.set(row.position, bucket);
  }
  const maeByPosition = [...byPosition.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([position, positionRows]) => {
      const modelMae = mean(positionRows.map((row) => row.modelAbsoluteError)) ?? 0;
      const marketMae = mean(positionRows.map((row) => row.marketAbsoluteError)) ?? 0;
      const coveredCount = positionRows.filter((row) => row.covered).length;
      return {
        position,
        sampleSize: positionRows.length,
        modelMae,
        marketMae,
        modelMaeEdge: round(marketMae - modelMae),
        intervalCoverage: round(coveredCount / positionRows.length),
        coveredCount,
      };
    });

  const probabilityRows = settled.filter(
    (row): row is ProjectionCalibrationInput & {
      readonly modelWinProbability: number;
      readonly marketWinProbability: number;
      readonly outcome: 0 | 1;
    } =>
      finiteNumber(row.modelWinProbability) &&
      finiteNumber(row.marketWinProbability) &&
      (row.outcome === 0 || row.outcome === 1)
  );
  const modelBrier = mean(
    probabilityRows.map((row) => (clampProbability(row.modelWinProbability) - row.outcome) ** 2)
  );
  const marketBrier = mean(
    probabilityRows.map((row) => (clampProbability(row.marketWinProbability) - row.outcome) ** 2)
  );
  const modelLogLoss = mean(probabilityRows.map((row) => logLoss(row.modelWinProbability, row.outcome)));
  const marketLogLoss = mean(probabilityRows.map((row) => logLoss(row.marketWinProbability, row.outcome)));
  const modelCrps = mean(
    settled.map((row) => normalCrps(row.predictedFantasyPoints, stdDevFromInterval(row), row.actualFantasyPoints))
  );
  const marketCrps = mean(
    settled.map((row) => normalCrps(row.marketFantasyPoints, marketStdDev(row), row.actualFantasyPoints))
  );
  const overallModelMae = mean(rows.map((row) => row.modelAbsoluteError));
  const overallMarketMae = mean(rows.map((row) => row.marketAbsoluteError));
  const covered = rows.filter((row) => row.covered).length;
  const intervalCoverage = rows.length === 0 ? null : round(covered / rows.length);
  const rankCorrelation = spearmanRankCorrelation(settled);

  const failedCriteria: string[] = [];
  if (settled.length < criteria.minSampleSize) failedCriteria.push("min-sample-size");
  if (!settled.every(isPreGameCommitted)) failedCriteria.push("pre-game-commit");
  if (
    overallModelMae === null ||
    overallMarketMae === null ||
    overallModelMae >= overallMarketMae * criteria.maxModelMaeToMarketRatio
  ) {
    failedCriteria.push("model-mae-vs-market");
  }
  if (intervalCoverage === null || intervalCoverage < criteria.minIntervalCoverage) {
    failedCriteria.push("interval-coverage");
  }
  if (rankCorrelation === null || rankCorrelation < criteria.minRankCorrelation) {
    failedCriteria.push("rank-correlation");
  }
  if (criteria.requireBetterCrpsThanMarket && (modelCrps === null || marketCrps === null || modelCrps >= marketCrps)) {
    failedCriteria.push("crps-vs-market");
  }
  if (
    criteria.requireBetterBrierThanMarket &&
    (modelBrier === null || marketBrier === null || modelBrier >= marketBrier)
  ) {
    failedCriteria.push("brier-vs-market");
  }
  if (
    criteria.requireBetterLogLossThanMarket &&
    (modelLogLoss === null || marketLogLoss === null || modelLogLoss >= marketLogLoss)
  ) {
    failedCriteria.push("log-loss-vs-market");
  }

  return {
    status: "DRAFT_ONLY",
    generatedAt,
    preGameCommit: buildProjectionPreGameCommit(settled, generatedAt),
    sampleSize: settled.length,
    maeByPosition,
    overallModelMae,
    overallMarketMae,
    intervalCoverage,
    rankCorrelation,
    scores: {
      brierScore: modelBrier,
      marketBrierScore: marketBrier,
      logLoss: modelLogLoss,
      marketLogLoss,
      crps: modelCrps,
      marketCrps,
    },
    canPublishProjections: {
      criterionId: "canPublishProjections",
      status: "DRAFT_ONLY",
      eligibleIfOwnerApproves: failedCriteria.length === 0,
      failedCriteria,
      note:
        failedCriteria.length === 0
          ? "Draft criteria are satisfied; owner approval and a separate gate flip are still required."
          : "Draft criteria are not satisfied; keep projections shadow-only.",
    },
    rows,
  };
}

export function computeCalibrationProposals(
  buckets: readonly CalibrationBucket[] = []
): readonly CalibrationProposal[] {
  return buckets.flatMap((bucket) => {
    if (
      bucket.probabilitySampleSize < MIN_BUCKET_SAMPLE ||
      bucket.delta === null ||
      bucket.expectedWinRate === null ||
      bucket.probabilityObservedWinRate === null ||
      Math.abs(bucket.delta) < PROPOSAL_DELTA
    ) {
      return [];
    }
    return [{
      id: `confidence-drift-${bucket.label}`,
      kind: "CONFIDENCE_SHIFT" as const,
      title:
        bucket.delta > 0
          ? `Confidence bucket ${bucket.label} is undercalling outcomes`
          : `Confidence bucket ${bucket.label} is overcalling outcomes`,
      rationale:
        `Observed ${Math.round(bucket.probabilityObservedWinRate * 100)}% vs expected ` +
        `${Math.round(bucket.expectedWinRate * 100)}% across ${bucket.probabilitySampleSize} probability-committed picks. ` +
        "Review before changing weights.",
      sampleSize: bucket.probabilitySampleSize,
    }];
  });
}
