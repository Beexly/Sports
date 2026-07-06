import { playableWindowScore, type PlayableWindowScoreInput } from "../decision/playable-window-score.js";
import { marketMirageScore, type MarketMirageScoreInput } from "../market/market-mirage-score.js";
import { roleVolatilityIndex, type RoleVolatilityIndexInput } from "../role/role-volatility-index.js";
import {
  requireMetricAsset,
  type MetricApiExposure,
  type MetricLicensingStatus,
} from "./metric-asset.js";
import {
  evaluateMetricSourceRights,
  GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  metricSourceRightsPolicy,
  type MetricSourceRightsPolicy,
} from "./source-rights.js";
import type { MetricLifecycleStatus, MetricSourcePolicy, MetricSourceStatus } from "./validation.js";

export type HistoricalValidationMetricId =
  | "role-volatility-index"
  | "playable-window-score"
  | "market-mirage-score";
export type HistoricalValidationAdapterStatus = "ADAPTED" | "NEEDS_MANUAL_REVIEW" | "BLOCKED_BY_SOURCE_RIGHTS";

export interface HistoricalValidationSourceReview {
  readonly status: HistoricalValidationAdapterStatus;
  readonly sourceIds: readonly string[];
  readonly requiredAttribution: readonly string[];
  readonly violations: readonly string[];
  readonly notes: readonly string[];
}

export interface HistoricalRoleStabilityRecord {
  readonly metricId: "role-volatility-index";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<RoleVolatilityIndexInput, "sourcePolicy">;
}

export interface HistoricalDecisionWindowRecord {
  readonly metricId: "playable-window-score";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<PlayableWindowScoreInput, "sourcePolicy">;
}

export interface HistoricalMarketMirageRecord {
  readonly metricId: "market-mirage-score";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<MarketMirageScoreInput, "sourcePolicy">;
}

export type HistoricalValidationRecord =
  | HistoricalRoleStabilityRecord
  | HistoricalDecisionWindowRecord
  | HistoricalMarketMirageRecord;

export interface HistoricalValidationAdapterResult {
  readonly metricId: HistoricalValidationMetricId;
  readonly splitId: string;
  readonly status: HistoricalValidationAdapterStatus;
  readonly lifecycleStatus: MetricLifecycleStatus;
  readonly apiExposure: MetricApiExposure;
  readonly licensingStatus: MetricLicensingStatus;
  readonly publicApiAllowed: false;
  readonly observedBand: string | null;
  readonly score: number | null;
  readonly allowed: boolean;
  readonly sourceReview: HistoricalValidationSourceReview;
  readonly notes: readonly string[];
}

export function adaptHistoricalValidationRecord(
  record: HistoricalValidationRecord,
  policies: readonly MetricSourceRightsPolicy[] = GSE_METRIC_SOURCE_RIGHTS_POLICIES,
): HistoricalValidationAdapterResult {
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
    return {
      ...base,
      allowed: false,
      notes: [record.description, "Historical-shaped input was not adapted because source clearance is incomplete."],
      observedBand: null,
      score: null,
      status: sourceReview.status,
    };
  }

  const sourcePolicy = metricSourcePoliciesForIds(record.sourceIds, policies);
  const observed = runAdaptedMetric(record, sourcePolicy);
  return {
    ...base,
    allowed: observed.allowed,
    notes: [record.description, "Source-rights-reviewed historical-shaped input adapted locally for shadow validation."],
    observedBand: observed.band,
    score: observed.score,
    status: "ADAPTED",
  };
}

export function reviewHistoricalValidationSources(
  sourceIds: readonly string[],
  policies: readonly MetricSourceRightsPolicy[] = GSE_METRIC_SOURCE_RIGHTS_POLICIES,
): HistoricalValidationSourceReview {
  const validation = evaluateMetricSourceRights({ policies, sourceIds, use: "validation" });
  const derivedMetric = evaluateMetricSourceRights({ policies, sourceIds, use: "derived_metric" });
  const selectedPolicies = sourceIds.map((sourceId) => metricSourceRightsPolicy(policies, sourceId));
  const missingPolicy = selectedPolicies.some((policy) => policy === null);
  const needsManualReview = selectedPolicies.some((policy) => policy !== null && !isFullyClearedForAdapter(policy));
  const violations = [...validation.violations, ...derivedMetric.violations];
  const status =
    missingPolicy || violations.length > 0
      ? "BLOCKED_BY_SOURCE_RIGHTS"
      : needsManualReview
        ? "NEEDS_MANUAL_REVIEW"
        : "ADAPTED";

  return {
    notes: [...validation.notes, ...derivedMetric.notes],
    requiredAttribution: [...new Set([...validation.requiredAttribution, ...derivedMetric.requiredAttribution])],
    sourceIds,
    status,
    violations,
  };
}

export function runHistoricalValidationAdapterRecords(
  records: readonly HistoricalValidationRecord[],
  policies: readonly MetricSourceRightsPolicy[] = GSE_METRIC_SOURCE_RIGHTS_POLICIES,
): readonly HistoricalValidationAdapterResult[] {
  return records.map((record) => adaptHistoricalValidationRecord(record, policies));
}

function runAdaptedMetric(
  record: HistoricalValidationRecord,
  sourcePolicy: readonly MetricSourcePolicy[],
): { readonly allowed: boolean; readonly band: string; readonly score: number } {
  switch (record.metricId) {
    case "role-volatility-index": {
      const metric = roleVolatilityIndex({ ...record.input, sourcePolicy });
      return { allowed: metric.roleSignalAllowed, band: metric.volatilityBand, score: metric.volatilityIndex };
    }
    case "playable-window-score": {
      const metric = playableWindowScore({ ...record.input, sourcePolicy });
      return { allowed: metric.decisionWindowAllowed, band: metric.band, score: metric.score };
    }
    case "market-mirage-score": {
      const metric = marketMirageScore({ ...record.input, sourcePolicy });
      return { allowed: metric.marketInterpretationAllowed, band: metric.band, score: metric.score };
    }
    default:
      return assertNever(record);
  }
}

function metricSourcePoliciesForIds(
  sourceIds: readonly string[],
  policies: readonly MetricSourceRightsPolicy[],
): readonly MetricSourcePolicy[] {
  return sourceIds.map((sourceId) => {
    const policy = metricSourceRightsPolicy(policies, sourceId);
    if (policy === null) return { allowedForModeling: false, sourceId, status: "unknown" };
    return {
      allowedForModeling: policy.permissions.modelTraining || policy.permissions.derivedMetric,
      attributionRequired: policy.attribution.text ?? undefined,
      sourceId: policy.sourceId,
      status: metricSourceStatusFromRights(policy),
    };
  });
}

function isFullyClearedForAdapter(policy: MetricSourceRightsPolicy): boolean {
  return (
    policy.permissions.validation &&
    policy.permissions.derivedMetric &&
    (policy.status === "approved_open_license" ||
      policy.status === "approved_api" ||
      policy.status === "approved_written_permission")
  );
}

function metricSourceStatusFromRights(policy: MetricSourceRightsPolicy): MetricSourceStatus {
  if (
    policy.status === "approved_open_license" ||
    policy.status === "approved_api" ||
    policy.status === "approved_written_permission"
  ) {
    return "approved";
  }
  if (policy.status === "excluded") return "excluded";
  if (policy.status === "blocked_technical_controls") return "blocked";
  if (policy.status === "permission_required") return "permission_required";
  return "manual_review";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled historical validation record: ${JSON.stringify(value)}`);
}
