export type UncertaintyReasonCode = "HIGH_ERROR" | "UNDER_COVERED" | "WIDE_INTERVAL";

export interface UncertaintyMapSample {
  readonly id: string;
  readonly segmentId: string;
  readonly segmentLabel: string;
  readonly predictedValue: number;
  readonly actualValue: number;
  readonly intervalLower: number;
  readonly intervalUpper: number;
  readonly position?: string | null;
  readonly featureFamily?: string | null;
}

export interface UncertaintyMapOptions {
  readonly targetCoverage?: number;
  readonly minSampleSize?: number;
  readonly wideIntervalThreshold?: number;
  readonly highErrorThreshold?: number;
  readonly maxRows?: number;
}

export interface UncertaintyMapRow {
  readonly rank: number;
  readonly segmentId: string;
  readonly segmentLabel: string;
  readonly sampleSize: number;
  readonly meanAbsoluteError: number;
  readonly intervalCoverage: number;
  readonly meanIntervalWidth: number;
  readonly missRate: number;
  readonly priorityScore: number;
  readonly reasonCodes: readonly UncertaintyReasonCode[];
  readonly recommendedAction: "COLLECT_MORE_DATA" | "WIDEN_INTERVALS" | "REVIEW_FEATURES";
}

export interface ActiveLearningUncertaintyMap {
  readonly status: "SHADOW";
  readonly draftOnly: true;
  readonly priced: false;
  readonly generatedAt: string;
  readonly targetCoverage: number;
  readonly rows: readonly UncertaintyMapRow[];
  readonly droppedSegments: number;
  readonly note: string;
}

interface SegmentAccumulator {
  readonly id: string;
  readonly label: string;
  readonly errors: number[];
  readonly widths: number[];
  covered: number;
}

const DEFAULT_TARGET_COVERAGE = 0.8;
const DEFAULT_MIN_SAMPLE_SIZE = 2;
const DEFAULT_WIDE_INTERVAL_THRESHOLD = 10;
const DEFAULT_HIGH_ERROR_THRESHOLD = 5;
const DEFAULT_MAX_ROWS = 50;

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isUsable(sample: UncertaintyMapSample): boolean {
  return (
    sample.segmentId.length > 0 &&
    finite(sample.predictedValue) &&
    finite(sample.actualValue) &&
    finite(sample.intervalLower) &&
    finite(sample.intervalUpper) &&
    sample.intervalUpper >= sample.intervalLower
  );
}

function actionFor(reasons: readonly UncertaintyReasonCode[]): UncertaintyMapRow["recommendedAction"] {
  if (reasons.includes("UNDER_COVERED")) return "WIDEN_INTERVALS";
  if (reasons.includes("HIGH_ERROR")) return "REVIEW_FEATURES";
  return "COLLECT_MORE_DATA";
}

function scoreSegment(
  accumulator: SegmentAccumulator,
  rank: number,
  targetCoverage: number,
  wideIntervalThreshold: number,
  highErrorThreshold: number
): UncertaintyMapRow {
  const sampleSize = accumulator.errors.length;
  const meanAbsoluteError = mean(accumulator.errors);
  const meanIntervalWidth = mean(accumulator.widths);
  const intervalCoverage = accumulator.covered / sampleSize;
  const coverageGap = Math.max(0, targetCoverage - intervalCoverage);
  const missRate = 1 - intervalCoverage;
  const reasonCodes: UncertaintyReasonCode[] = [];

  if (meanAbsoluteError >= highErrorThreshold) reasonCodes.push("HIGH_ERROR");
  if (coverageGap > 0) reasonCodes.push("UNDER_COVERED");
  if (meanIntervalWidth >= wideIntervalThreshold) reasonCodes.push("WIDE_INTERVAL");

  return {
    intervalCoverage: round(intervalCoverage),
    meanAbsoluteError: round(meanAbsoluteError),
    meanIntervalWidth: round(meanIntervalWidth),
    missRate: round(missRate),
    priorityScore: round(meanAbsoluteError + meanIntervalWidth * 0.15 + coverageGap * 10),
    rank,
    reasonCodes,
    recommendedAction: actionFor(reasonCodes),
    sampleSize,
    segmentId: accumulator.id,
    segmentLabel: accumulator.label,
  };
}

export function buildActiveLearningUncertaintyMap(
  samples: readonly UncertaintyMapSample[],
  now = new Date(),
  options: UncertaintyMapOptions = {}
): ActiveLearningUncertaintyMap {
  const targetCoverage = options.targetCoverage ?? DEFAULT_TARGET_COVERAGE;
  const minSampleSize = options.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
  const wideIntervalThreshold = options.wideIntervalThreshold ?? DEFAULT_WIDE_INTERVAL_THRESHOLD;
  const highErrorThreshold = options.highErrorThreshold ?? DEFAULT_HIGH_ERROR_THRESHOLD;
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const bySegment = new Map<string, SegmentAccumulator>();

  for (const sample of samples) {
    if (!isUsable(sample)) continue;
    const accumulator =
      bySegment.get(sample.segmentId) ??
      {
        covered: 0,
        errors: [],
        id: sample.segmentId,
        label: sample.segmentLabel,
        widths: [],
      };
    accumulator.errors.push(Math.abs(sample.predictedValue - sample.actualValue));
    accumulator.widths.push(sample.intervalUpper - sample.intervalLower);
    if (sample.actualValue >= sample.intervalLower && sample.actualValue <= sample.intervalUpper) {
      accumulator.covered += 1;
    }
    bySegment.set(sample.segmentId, accumulator);
  }

  const eligible = [...bySegment.values()].filter((segment) => segment.errors.length >= minSampleSize);
  const ranked = eligible
    .map((segment) => scoreSegment(segment, 0, targetCoverage, wideIntervalThreshold, highErrorThreshold))
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        b.meanAbsoluteError - a.meanAbsoluteError ||
        b.meanIntervalWidth - a.meanIntervalWidth ||
        a.segmentLabel.localeCompare(b.segmentLabel)
    )
    .slice(0, maxRows)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    draftOnly: true,
    droppedSegments: bySegment.size - eligible.length,
    generatedAt: now.toISOString(),
    note: "Active-learning uncertainty map is a shadow queue for data/model review; it does not retrain or route projections.",
    priced: false,
    rows: ranked,
    status: "SHADOW",
    targetCoverage,
  };
}
