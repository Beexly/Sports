import type { GseMetricAsset, MetricApiExposure, SourceRightsEnvelope } from "./metric-asset.js";

export type MetricGraduationStatus =
  | "BLOCKED_SOURCE_RIGHTS"
  | "BLOCKED_MODEL_CARD"
  | "BLOCKED_SAMPLE"
  | "BLOCKED_VALIDATION"
  | "BLOCKED_DRIFT"
  | "REVIEW_READY"
  | "APPROVED_FOR_CONTENT"
  | "APPROVED_FOR_API";

export interface MetricGraduationInput {
  readonly asset: GseMetricAsset;
  readonly requestedExposure: MetricApiExposure;
  readonly minimumSampleSize?: number;
}

export interface MetricGraduationDecision {
  readonly status: MetricGraduationStatus;
  readonly reasons: readonly string[];
  readonly approvedExposure: MetricApiExposure;
}

export function evaluateMetricGraduation(input: MetricGraduationInput): MetricGraduationDecision {
  const sourceRightsReasons = sourceRightsBlocks(input.asset.sourceRights, input.requestedExposure);
  if (sourceRightsReasons.length > 0) {
    return blocked("BLOCKED_SOURCE_RIGHTS", sourceRightsReasons);
  }
  const minimumSampleSize = input.minimumSampleSize ?? input.asset.validationReport.minimumSampleSize;
  if (input.asset.validationReport.sampleSize < minimumSampleSize) {
    return blocked("BLOCKED_SAMPLE", [
      `sample_size ${input.asset.validationReport.sampleSize} is below minimum ${minimumSampleSize}`,
    ]);
  }
  if (input.asset.modelCard.status !== "READY") {
    return blocked("BLOCKED_MODEL_CARD", [`model_card_status ${input.asset.modelCard.status} is not READY`]);
  }
  if (input.asset.validationReport.status !== "PASS") {
    return blocked("BLOCKED_VALIDATION", [
      `validation_status ${input.asset.validationReport.status} is not PASS`,
    ]);
  }
  if (input.asset.driftCard.status === "MISSING" || input.asset.driftCard.status === "SEVERE") {
    return blocked("BLOCKED_DRIFT", [`drift_status ${input.asset.driftCard.status} blocks graduation`]);
  }
  if (isApiExposure(input.requestedExposure) && input.asset.birthCertificate.status === "SHADOW") {
    return blocked("BLOCKED_VALIDATION", ["SHADOW metrics cannot be exposed through API routes"]);
  }
  if (input.requestedExposure === "API_FULL" || input.requestedExposure === "API_LIMITED") {
    return { approvedExposure: input.requestedExposure, reasons: ["all API graduation gates passed"], status: "APPROVED_FOR_API" };
  }
  if (input.requestedExposure === "CONTENT_AGGREGATE") {
    return {
      approvedExposure: "CONTENT_AGGREGATE",
      reasons: ["content aggregate graduation gates passed"],
      status: "APPROVED_FOR_CONTENT",
    };
  }
  return {
    approvedExposure: input.requestedExposure,
    reasons: ["internal review gates passed"],
    status: "REVIEW_READY",
  };
}

function sourceRightsBlocks(
  sourceRights: readonly SourceRightsEnvelope[],
  requestedExposure: MetricApiExposure,
): readonly string[] {
  if (sourceRights.length === 0) return ["missing source-rights envelope"];
  const modelingBlocks = sourceRights
    .filter((source) => !source.mayUseForModeling)
    .map((source) => `${source.sourceId} blocks modeling`);
  const apiBlocks = isApiExposure(requestedExposure)
    ? sourceRights.filter((source) => !source.mayExposeDerived).map((source) => `${source.sourceId} blocks derived API exposure`)
    : [];
  return [...modelingBlocks, ...apiBlocks];
}

function isApiExposure(exposure: MetricApiExposure): boolean {
  return exposure === "API_FULL" || exposure === "API_LIMITED";
}

function blocked(status: MetricGraduationStatus, reasons: readonly string[]): MetricGraduationDecision {
  return { approvedExposure: "NONE", reasons, status };
}
