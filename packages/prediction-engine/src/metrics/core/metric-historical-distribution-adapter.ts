import {
  calibrationIntegrityGrade,
  type CalibrationIntegrityGradeInput,
} from "../calibration/calibration-integrity-grade.js";
import { portfolioFitScore, type PortfolioFitScoreInput } from "../decision/portfolio-fit-score.js";
import {
  requireMetricAsset,
  type MetricApiExposure,
  type MetricDriftCardStatus,
  type MetricLicensingStatus,
} from "./metric-asset.js";
import {
  evaluateMetricPayloadRights,
  type MetricPayloadExposure,
  type MetricPayloadField,
  type MetricPayloadRightsDecision,
} from "./payload-rights.js";
import { GSE_METRIC_SOURCE_RIGHTS_POLICIES, type MetricSourceRightsPolicy } from "./source-rights.js";
import {
  reviewHistoricalValidationSources,
  type HistoricalValidationAdapterStatus,
  type HistoricalValidationSourceReview,
} from "./metric-historical-validation-adapter.js";
import type { MetricLifecycleStatus, MetricSourcePolicy } from "./validation.js";

export type HistoricalDistributionMetricId = "calibration-integrity-grade" | "portfolio-fit-score";
export type HistoricalDistributionPayloadProfile =
  | "safe_derived"
  | "raw_input_leak"
  | "unsupported_probability_claim";
export type HistoricalDistributionAdapterStatus =
  | HistoricalValidationAdapterStatus
  | "BLOCKED_BY_PAYLOAD_RIGHTS";

export interface HistoricalCalibrationDistributionRecord {
  readonly metricId: "calibration-integrity-grade";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<CalibrationIntegrityGradeInput, "sourcePolicy">;
  readonly baselineScore: number;
  readonly watchDelta: number;
  readonly severeDelta: number;
  readonly payloadProfile: HistoricalDistributionPayloadProfile;
}

export interface HistoricalPortfolioDistributionRecord {
  readonly metricId: "portfolio-fit-score";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<PortfolioFitScoreInput, "sourcePolicy">;
  readonly baselineScore: number;
  readonly watchDelta: number;
  readonly severeDelta: number;
  readonly payloadProfile: HistoricalDistributionPayloadProfile;
}

export type HistoricalDistributionRecord =
  | HistoricalCalibrationDistributionRecord
  | HistoricalPortfolioDistributionRecord;

export interface HistoricalDistributionAdapterResult {
  readonly metricId: HistoricalDistributionMetricId;
  readonly splitId: string;
  readonly status: HistoricalDistributionAdapterStatus;
  readonly lifecycleStatus: MetricLifecycleStatus;
  readonly apiExposure: MetricApiExposure;
  readonly licensingStatus: MetricLicensingStatus;
  readonly publicApiAllowed: false;
  readonly observedBand: string | null;
  readonly score: number | null;
  readonly allowed: boolean;
  readonly driftStatus: MetricDriftCardStatus;
  readonly scoreDelta: number | null;
  readonly sourceReview: HistoricalValidationSourceReview;
  readonly payloadRights: MetricPayloadRightsDecision | null;
  readonly notes: readonly string[];
}

interface BlockedHistoricalDistributionInput {
  readonly base: Omit<
    HistoricalDistributionAdapterResult,
    "allowed" | "driftStatus" | "notes" | "observedBand" | "payloadRights" | "score" | "scoreDelta" | "status"
  >;
  readonly description: string;
  readonly status: HistoricalDistributionAdapterStatus;
  readonly payloadRights: MetricPayloadRightsDecision | null;
}

export function adaptHistoricalDistributionRecord(
  record: HistoricalDistributionRecord,
  policies: readonly MetricSourceRightsPolicy[] = GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  exposure: MetricPayloadExposure = "API",
): HistoricalDistributionAdapterResult {
  const sourceReview = reviewHistoricalValidationSources(record.sourceIds, policies);
  const asset = requireMetricAsset(record.metricId);
  const base = {
    apiExposure: asset.apiExposure,
    lifecycleStatus: asset.birthCertificate.status,
    licensingStatus: asset.licensingStatus,
    metricId: record.metricId,
    publicApiAllowed: false as const,
    sourceReview,
    splitId: record.splitId,
  };
  if (sourceReview.status !== "ADAPTED") {
    return blockedResult({
      base,
      description: record.description,
      payloadRights: null,
      status: sourceReview.status,
    });
  }

  const payloadRights = evaluateMetricPayloadRights({
    exposure,
    fields: payloadFieldsForRecord(record),
    policies,
  });
  if (!payloadRights.allowed) {
    return blockedResult({
      base,
      description: record.description,
      payloadRights,
      status: "BLOCKED_BY_PAYLOAD_RIGHTS",
    });
  }

  const observed = runDistributionMetric(record, policies);
  return {
    ...base,
    allowed: observed.allowed,
    driftStatus: classifyDistributionDrift(observed.score, record),
    notes: [record.description, "Source and payload rights cleared before local historical adaptation."],
    observedBand: observed.band,
    payloadRights,
    score: observed.score,
    scoreDelta: roundDelta(observed.score - record.baselineScore),
    status: "ADAPTED",
  };
}

export function runHistoricalDistributionAdapterRecords(
  records: readonly HistoricalDistributionRecord[],
  policies: readonly MetricSourceRightsPolicy[] = GSE_METRIC_SOURCE_RIGHTS_POLICIES,
): readonly HistoricalDistributionAdapterResult[] {
  return records.map((record) => adaptHistoricalDistributionRecord(record, policies));
}

function runDistributionMetric(
  record: HistoricalDistributionRecord,
  policies: readonly MetricSourceRightsPolicy[],
): { readonly allowed: boolean; readonly band: string; readonly score: number } {
  const sourcePolicy: readonly MetricSourcePolicy[] = record.sourceIds.map((sourceId): MetricSourcePolicy => {
    const policy = policies.find((candidate) => candidate.sourceId === sourceId);
    return {
      allowedForModeling: policy?.permissions.derivedMetric ?? false,
      attributionRequired: policy?.attribution.text ?? undefined,
      sourceId,
      status: "approved",
    };
  });
  switch (record.metricId) {
    case "calibration-integrity-grade": {
      const metric = calibrationIntegrityGrade({ ...record.input, sourcePolicy });
      return { allowed: metric.calibrationUsable, band: metric.letterGrade, score: metric.score };
    }
    case "portfolio-fit-score": {
      const metric = portfolioFitScore({ ...record.input, sourcePolicy });
      return { allowed: metric.portfolioActionAllowed, band: metric.band, score: metric.score };
    }
    default:
      return assertNever(record);
  }
}

function payloadFieldsForRecord(record: HistoricalDistributionRecord): readonly MetricPayloadField[] {
  const basePath = record.metricId;
  const safeFields: readonly MetricPayloadField[] = [
    payloadField(`${basePath}.score`, "DERIVED_METRIC", record.sourceIds),
    payloadField(`${basePath}.band`, "AGGREGATE_SUMMARY", record.sourceIds),
    payloadField(`${basePath}.drivers`, "PUBLIC_DRIVER", record.sourceIds),
  ];
  if (record.payloadProfile === "safe_derived") return safeFields;
  if (record.payloadProfile === "raw_input_leak") {
    return [...safeFields, payloadField(`${basePath}.raw_input_snapshot`, "RAW_SOURCE_VALUE", record.sourceIds)];
  }
  return [...safeFields, payloadField(`${basePath}.probability_claim`, "UNSUPPORTED_PROBABILITY_CLAIM", record.sourceIds)];
}

function payloadField(
  path: string,
  kind: MetricPayloadField["kind"],
  sourceIds: readonly string[],
): MetricPayloadField {
  return {
    description: "Historical distribution adapter payload field.",
    exposure: "API",
    kind,
    path,
    sourceIds,
  };
}

function classifyDistributionDrift(
  score: number,
  record: HistoricalDistributionRecord,
): MetricDriftCardStatus {
  const delta = Math.abs(score - record.baselineScore);
  if (delta >= record.severeDelta) return "SEVERE";
  if (delta >= record.watchDelta) return "WATCH";
  return "STABLE";
}

function blockedResult(input: BlockedHistoricalDistributionInput): HistoricalDistributionAdapterResult {
  return {
    ...input.base,
    allowed: false,
    driftStatus: "MISSING",
    notes: [
      input.description,
      "Historical distribution input was not adapted because required rights gates did not pass.",
    ],
    observedBand: null,
    payloadRights: input.payloadRights,
    score: null,
    scoreDelta: null,
    status: input.status,
  };
}

function roundDelta(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled historical distribution record: ${JSON.stringify(value)}`);
}
