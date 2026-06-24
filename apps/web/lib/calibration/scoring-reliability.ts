import type { CalibrationBucket, CalibrationReport } from "@/lib/calibration/compute";

export interface ReliabilityDiagramPoint {
  readonly label: string;
  readonly sampleSize: number;
  readonly expectedWinRate: number;
  readonly observedWinRate: number;
  readonly absoluteGap: number;
  readonly brierScore: number;
}

export interface ScoringReliabilityReport {
  readonly status: "COLLECTING" | "READY";
  readonly draftOnly: true;
  readonly priced: false;
  readonly sampleSize: number;
  readonly brierScore: number | null;
  readonly expectedCalibrationError: number | null;
  readonly maximumCalibrationError: number | null;
  readonly reliabilityPoints: readonly ReliabilityDiagramPoint[];
  readonly note: string;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pointFromBucket(bucket: CalibrationBucket): ReliabilityDiagramPoint | null {
  if (bucket.sampleSize <= 0) return null;
  return {
    absoluteGap: round(Math.abs(bucket.delta)),
    brierScore: bucket.brierScore,
    expectedWinRate: bucket.expectedWinRate,
    label: bucket.label,
    observedWinRate: bucket.observedWinRate,
    sampleSize: bucket.sampleSize,
  };
}

function weightedMean(points: readonly ReliabilityDiagramPoint[]): number | null {
  const total = points.reduce((sum, point) => sum + point.sampleSize, 0);
  if (total === 0) return null;
  const weighted = points.reduce((sum, point) => sum + point.absoluteGap * point.sampleSize, 0);
  return round(weighted / total);
}

function maxGap(points: readonly ReliabilityDiagramPoint[]): number | null {
  if (points.length === 0) return null;
  return round(Math.max(...points.map((point) => point.absoluteGap)));
}

export function buildScoringReliabilityReport(
  calibration: CalibrationReport & { readonly isCollecting?: boolean }
): ScoringReliabilityReport {
  const reliabilityPoints = calibration.buckets.flatMap((bucket) => {
    const point = pointFromBucket(bucket);
    return point === null ? [] : [point];
  });
  const hasRows = calibration.sampleSize > 0 && reliabilityPoints.length > 0 && calibration.isCollecting !== true;

  return {
    brierScore: calibration.brierScore,
    draftOnly: true,
    expectedCalibrationError: weightedMean(reliabilityPoints),
    maximumCalibrationError: maxGap(reliabilityPoints),
    note: hasRows
      ? "Reliability diagram is computed from settled canonical picks only."
      : "Reliability diagram is gated until settled canonical calibration rows exist.",
    priced: false,
    reliabilityPoints,
    sampleSize: calibration.sampleSize,
    status: hasRows ? "READY" : "COLLECTING",
  };
}
