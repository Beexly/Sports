import { playableWindowScore } from "../decision/playable-window-score.js";
import { roleVolatilityIndex } from "../role/role-volatility-index.js";
import {
  DECISION_WINDOW_VALIDATION_SPLITS,
  ROLE_STABILITY_VALIDATION_SPLITS,
  type DecisionWindowValidationSplit,
  type RoleStabilityValidationSplit,
} from "./metric-validation-split-fixture-data.js";
import {
  requireMetricAsset,
  type MetricApiExposure,
  type MetricLicensingStatus,
} from "./metric-asset.js";
import type { MetricLifecycleStatus } from "./validation.js";

export type ValidationSplitMetricId = "role-volatility-index" | "playable-window-score";
export type ValidationSplitStatus = "PASS" | "WATCH" | "FAIL_CLOSED";
export type { DecisionWindowValidationSplit, RoleStabilityValidationSplit };
export { DECISION_WINDOW_VALIDATION_SPLITS, ROLE_STABILITY_VALIDATION_SPLITS };

export interface MetricValidationSplitResult {
  readonly metricId: ValidationSplitMetricId;
  readonly splitId: string;
  readonly status: ValidationSplitStatus;
  readonly lifecycleStatus: MetricLifecycleStatus;
  readonly apiExposure: MetricApiExposure;
  readonly licensingStatus: MetricLicensingStatus;
  readonly publicApiAllowed: boolean;
  readonly observedBand: string;
  readonly score: number;
  readonly allowed: boolean;
  readonly reasons: readonly string[];
  readonly notes: readonly string[];
}

export interface MetricValidationSplitSummary {
  readonly total: number;
  readonly pass: number;
  readonly watch: number;
  readonly failClosed: number;
  readonly publicApiAllowedCount: number;
}

export function runRoleStabilityValidationSplits(
  splits: readonly RoleStabilityValidationSplit[] = ROLE_STABILITY_VALIDATION_SPLITS,
): readonly MetricValidationSplitResult[] {
  return splits.map((split) => {
    const metric = roleVolatilityIndex(split.input);
    const asset = requireMetricAsset("role-volatility-index");
    const reasons = roleReasons(metric);
    return {
      allowed: metric.roleSignalAllowed,
      apiExposure: asset.apiExposure,
      lifecycleStatus: metric.status,
      licensingStatus: asset.licensingStatus,
      metricId: "role-volatility-index",
      notes: [split.description, `Observed role band ${metric.volatilityBand}.`],
      observedBand: metric.volatilityBand,
      publicApiAllowed: publicApiAllowed(asset.apiExposure),
      reasons,
      score: metric.volatilityIndex,
      splitId: split.splitId,
      status: splitStatusFromRole(metric.roleSignalAllowed, metric.volatilityBand, metric.uncertaintyBand),
    };
  });
}

export function runDecisionWindowValidationSplits(
  splits: readonly DecisionWindowValidationSplit[] = DECISION_WINDOW_VALIDATION_SPLITS,
): readonly MetricValidationSplitResult[] {
  return splits.map((split) => {
    const metric = playableWindowScore(split.input);
    const asset = requireMetricAsset("playable-window-score");
    return {
      allowed: metric.decisionWindowAllowed,
      apiExposure: asset.apiExposure,
      lifecycleStatus: metric.status,
      licensingStatus: asset.licensingStatus,
      metricId: "playable-window-score",
      notes: [split.description, `Observed decision-window band ${metric.band}.`],
      observedBand: metric.band,
      publicApiAllowed: publicApiAllowed(asset.apiExposure),
      reasons: metric.blockReasons,
      score: metric.score,
      splitId: split.splitId,
      status: splitStatusFromDecisionWindow(metric.decisionWindowAllowed, metric.band, metric.uncertaintyBand),
    };
  });
}

export function runMetricValidationSplitFixtures(): readonly MetricValidationSplitResult[] {
  return [...runRoleStabilityValidationSplits(), ...runDecisionWindowValidationSplits()];
}

export function summarizeMetricValidationSplitResults(
  results: readonly MetricValidationSplitResult[],
): MetricValidationSplitSummary {
  return {
    failClosed: results.filter((result) => result.status === "FAIL_CLOSED").length,
    pass: results.filter((result) => result.status === "PASS").length,
    publicApiAllowedCount: results.filter((result) => result.publicApiAllowed).length,
    total: results.length,
    watch: results.filter((result) => result.status === "WATCH").length,
  };
}

function splitStatusFromRole(
  allowed: boolean,
  band: string,
  uncertaintyBand: string,
): ValidationSplitStatus {
  if (!allowed || band === "BLOCK") return "FAIL_CLOSED";
  if (band !== "LOW" || uncertaintyBand !== "LOW") return "WATCH";
  return "PASS";
}

function splitStatusFromDecisionWindow(
  allowed: boolean,
  band: string,
  uncertaintyBand: string,
): ValidationSplitStatus {
  if (!allowed || band === "CLOSED") return "FAIL_CLOSED";
  if (band !== "OPEN" || uncertaintyBand !== "LOW") return "WATCH";
  return "PASS";
}

function roleReasons(metric: ReturnType<typeof roleVolatilityIndex>): readonly string[] {
  const reasons: string[] = [];
  if (metric.staleUsage) reasons.push("stale_usage");
  if (metric.sourcePosture === "BLOCKED") reasons.push("source_policy_blocks_modeling");
  if (metric.volatilityBand === "HIGH") reasons.push("high_role_volatility");
  if (metric.uncertaintyBand === "HIGH") reasons.push("high_uncertainty");
  return reasons;
}

function publicApiAllowed(apiExposure: MetricApiExposure): boolean {
  return apiExposure === "API_LIMITED" || apiExposure === "API_FULL";
}
