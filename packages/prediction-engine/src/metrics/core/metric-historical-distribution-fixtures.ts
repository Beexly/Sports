import {
  runHistoricalDistributionAdapterRecords,
  type HistoricalDistributionAdapterResult,
  type HistoricalDistributionRecord,
} from "./metric-historical-distribution-adapter.js";

export interface HistoricalDistributionAdapterSummary {
  readonly total: number;
  readonly adapted: number;
  readonly manualReview: number;
  readonly sourceBlocked: number;
  readonly payloadBlocked: number;
  readonly publicApiAllowedCount: number;
}

export const HISTORICAL_DISTRIBUTION_ADAPTER_FIXTURES: readonly HistoricalDistributionRecord[] = [
  {
    baselineScore: 88,
    description: "Rights-cleared historical calibration rollup can adapt into local CIG drift review.",
    input: {
      brierScore: 0.2,
      bucketCoverage: 0.86,
      calibrationDebt: 18,
      driftPressure: 22,
      expectedCalibrationError: 0.06,
      minimumSampleSize: 200,
      reliabilitySlope: 0.92,
      reportAgeDays: 3,
      reportFreshnessTtlDays: 14,
      sampleSize: 620,
    },
    metricId: "calibration-integrity-grade",
    payloadProfile: "safe_derived",
    severeDelta: 18,
    sourceIds: ["nflverse"],
    splitId: "historical_cig_nflverse_watch",
    watchDelta: 8,
  },
  {
    baselineScore: 63,
    description: "Rights-cleared portfolio composition rollup can adapt into local PFS drift review.",
    input: {
      bankrollFit: 82,
      calibrationDebt: 16,
      correlationRisk: 22,
      driftPressure: 14,
      duplicateThesisRisk: 18,
      edgeQualityScore: 72,
      liquidityFit: 76,
      marketTypeExposurePercent: 24,
      noBetPressure: 18,
      playableWindowScore: 78,
      playerExposurePercent: 20,
      slateExposurePercent: 28,
      teamExposurePercent: 18,
    },
    metricId: "portfolio-fit-score",
    payloadProfile: "safe_derived",
    severeDelta: 24,
    sourceIds: ["nflverse", "the-odds-api"],
    splitId: "historical_pfs_portfolio_stable",
    watchDelta: 12,
  },
  {
    baselineScore: 82,
    description: "Raw calibration input leakage blocks even when source rights are otherwise cleared.",
    input: {
      brierScore: 0.22,
      bucketCoverage: 0.76,
      calibrationDebt: 20,
      driftPressure: 18,
      expectedCalibrationError: 0.07,
      minimumSampleSize: 200,
      reliabilitySlope: 0.9,
      reportAgeDays: 2,
      reportFreshnessTtlDays: 14,
      sampleSize: 500,
    },
    metricId: "calibration-integrity-grade",
    payloadProfile: "raw_input_leak",
    severeDelta: 18,
    sourceIds: ["nflverse"],
    splitId: "historical_cig_raw_payload_blocked",
    watchDelta: 8,
  },
  {
    baselineScore: 60,
    description: "Logged-off fantasy source remains manual review and does not adapt into PFS.",
    input: {
      bankrollFit: 70,
      calibrationDebt: 18,
      correlationRisk: 30,
      driftPressure: 20,
      duplicateThesisRisk: 20,
      edgeQualityScore: 64,
      liquidityFit: 72,
      marketTypeExposurePercent: 28,
      noBetPressure: 22,
      playableWindowScore: 70,
      playerExposurePercent: 20,
      slateExposurePercent: 24,
      teamExposurePercent: 16,
    },
    metricId: "portfolio-fit-score",
    payloadProfile: "safe_derived",
    severeDelta: 24,
    sourceIds: ["sleeper-api"],
    splitId: "historical_pfs_sleeper_manual_review",
    watchDelta: 12,
  },
  {
    baselineScore: 58,
    description: "Permission-required market source blocks PFS historical distribution adaptation.",
    input: {
      bankrollFit: 68,
      calibrationDebt: 16,
      correlationRisk: 24,
      driftPressure: 18,
      duplicateThesisRisk: 18,
      edgeQualityScore: 62,
      liquidityFit: 70,
      marketTypeExposurePercent: 30,
      noBetPressure: 20,
      playableWindowScore: 68,
      playerExposurePercent: 22,
      slateExposurePercent: 26,
      teamExposurePercent: 20,
    },
    metricId: "portfolio-fit-score",
    payloadProfile: "safe_derived",
    severeDelta: 24,
    sourceIds: ["scores24-live"],
    splitId: "historical_pfs_permission_blocked",
    watchDelta: 12,
  },
];

export function runHistoricalDistributionAdapterFixtures(): readonly HistoricalDistributionAdapterResult[] {
  return runHistoricalDistributionAdapterRecords(HISTORICAL_DISTRIBUTION_ADAPTER_FIXTURES);
}

export function summarizeHistoricalDistributionAdapterResults(
  results: readonly HistoricalDistributionAdapterResult[],
): HistoricalDistributionAdapterSummary {
  return {
    adapted: results.filter((result) => result.status === "ADAPTED").length,
    manualReview: results.filter((result) => result.status === "NEEDS_MANUAL_REVIEW").length,
    payloadBlocked: results.filter((result) => result.status === "BLOCKED_BY_PAYLOAD_RIGHTS").length,
    publicApiAllowedCount: results.filter((result) => result.publicApiAllowed).length,
    sourceBlocked: results.filter((result) => result.status === "BLOCKED_BY_SOURCE_RIGHTS").length,
    total: results.length,
  };
}
