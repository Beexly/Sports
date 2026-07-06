import {
  runHistoricalValidationAdapterRecords,
  type HistoricalValidationAdapterResult,
  type HistoricalValidationRecord,
} from "./metric-historical-validation-adapter.js";

export interface HistoricalValidationAdapterSummary {
  readonly total: number;
  readonly adapted: number;
  readonly manualReview: number;
  readonly blocked: number;
  readonly publicApiAllowedCount: number;
}

export const HISTORICAL_VALIDATION_ADAPTER_FIXTURES: readonly HistoricalValidationRecord[] = [
  {
    description: "Rights-cleared nflverse role history can adapt into a local RVI split.",
    input: {
      depthChartShock: false,
      routeShareDelta: 0.04,
      sampleGames: 10,
      snapShareDelta: 0.04,
      targetShareDelta: 0.03,
      usageAgeDays: 2,
      usageFreshnessTtlDays: 7,
    },
    metricId: "role-volatility-index",
    sourceIds: ["nflverse"],
    splitId: "historical_role_nflverse_adapted",
  },
  {
    description: "Rights-cleared derived market and open football context can adapt into a local PWS split.",
    input: {
      calibrationDebt: 12,
      driftPressure: 15,
      evidenceHealth: 88,
      marketGravityIndex: 78,
      marketSignalAllowed: true,
      modelAgreement: 0.78,
      noBetPressure: 18,
      qbBurdenIndex: 28,
      roleVolatilityIndex: 22,
      signalIntegrityIndex: 84,
      staleLineRiskScore: 16,
    },
    metricId: "playable-window-score",
    sourceIds: ["nflverse", "the-odds-api"],
    splitId: "historical_decision_window_market_adapted",
  },
  {
    description: "Rights-cleared derived market source can adapt into a local MMS split.",
    input: {
      bookDispersionIndex: 28,
      calibrationDebt: 16,
      driftPressure: 18,
      explainabilityScore: 72,
      marketGravityIndex: 76,
      marketSignalAllowed: true,
      noBetPressure: 22,
      publicNarrativeHeat: 32,
      sourceContradictionPressure: 18,
      staleLineRiskScore: 20,
    },
    metricId: "market-mirage-score",
    sourceIds: ["the-odds-api"],
    splitId: "historical_market_mirage_odds_adapted",
  },
  {
    description: "Logged-off fantasy source remains manual review and is not adapted automatically.",
    input: {
      routeShareDelta: 0.08,
      sampleGames: 8,
      snapShareDelta: 0.06,
      targetShareDelta: 0.05,
      usageAgeDays: 2,
      usageFreshnessTtlDays: 7,
    },
    metricId: "role-volatility-index",
    sourceIds: ["sleeper-api"],
    splitId: "historical_role_sleeper_manual_review",
  },
  {
    description: "Permission-required market source blocks historical validation adaptation.",
    input: {
      bookDispersionIndex: 24,
      calibrationDebt: 10,
      driftPressure: 12,
      explainabilityScore: 66,
      marketGravityIndex: 72,
      marketSignalAllowed: true,
      noBetPressure: 15,
      publicNarrativeHeat: 28,
      sourceContradictionPressure: 12,
      staleLineRiskScore: 15,
    },
    metricId: "market-mirage-score",
    sourceIds: ["scores24-live"],
    splitId: "historical_market_mirage_permission_blocked",
  },
];

export function runHistoricalValidationAdapterFixtures(): readonly HistoricalValidationAdapterResult[] {
  return runHistoricalValidationAdapterRecords(HISTORICAL_VALIDATION_ADAPTER_FIXTURES);
}

export function summarizeHistoricalValidationAdapterResults(
  results: readonly HistoricalValidationAdapterResult[],
): HistoricalValidationAdapterSummary {
  return {
    adapted: results.filter((result) => result.status === "ADAPTED").length,
    blocked: results.filter((result) => result.status === "BLOCKED_BY_SOURCE_RIGHTS").length,
    manualReview: results.filter((result) => result.status === "NEEDS_MANUAL_REVIEW").length,
    publicApiAllowedCount: results.filter((result) => result.publicApiAllowed).length,
    total: results.length,
  };
}
