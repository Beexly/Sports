import { evaluateMetricSourceRights } from "./source-rights.js";
import type { MetricSourceRightsPolicy, MetricSourceRightsUse } from "./source-rights.js";

export type MetricPayloadExposure = "INTERNAL" | "CONTENT" | "API";
export type MetricPayloadFieldKind =
  | "DERIVED_METRIC"
  | "PUBLIC_DRIVER"
  | "AGGREGATE_SUMMARY"
  | "RAW_SOURCE_VALUE"
  | "PROTECTED_WEIGHT"
  | "PROVIDER_IDENTIFIER"
  | "UNSUPPORTED_PROBABILITY_CLAIM";

export interface MetricPayloadField {
  readonly path: string;
  readonly description: string;
  readonly kind: MetricPayloadFieldKind;
  readonly exposure: MetricPayloadExposure;
  readonly sourceIds: readonly string[];
}

export interface MetricPayloadRightsInput {
  readonly fields: readonly MetricPayloadField[];
  readonly policies: readonly MetricSourceRightsPolicy[];
  readonly exposure: MetricPayloadExposure;
}

export interface MetricPayloadRightsDecision {
  readonly allowed: boolean;
  readonly approvedFields: readonly string[];
  readonly blockedFields: readonly string[];
  readonly requiredAttribution: readonly string[];
  readonly violations: readonly string[];
}

export function evaluateMetricPayloadRights(input: MetricPayloadRightsInput): MetricPayloadRightsDecision {
  const approvedFields: string[] = [];
  const blockedFields: string[] = [];
  const requiredAttribution: string[] = [];
  const violations: string[] = [];

  for (const field of input.fields) {
    const fieldViolations = evaluateField(field, input);
    if (fieldViolations.length > 0) {
      blockedFields.push(field.path);
      violations.push(...fieldViolations);
      continue;
    }

    const sourceDecision = evaluateMetricSourceRights({
      policies: input.policies,
      sourceIds: field.sourceIds,
      use: sourceUseForField(field, input.exposure),
    });
    if (!sourceDecision.allowed) {
      blockedFields.push(field.path);
      violations.push(...sourceDecision.violations.map((violation) => `${field.path}: ${violation}`));
      continue;
    }

    approvedFields.push(field.path);
    requiredAttribution.push(...sourceDecision.requiredAttribution);
  }

  return {
    allowed: violations.length === 0,
    approvedFields,
    blockedFields,
    requiredAttribution: unique(requiredAttribution),
    violations,
  };
}

function evaluateField(field: MetricPayloadField, input: MetricPayloadRightsInput): readonly string[] {
  const violations: string[] = [];

  if (exposureRank(field.exposure) < exposureRank(input.exposure)) {
    violations.push(`${field.path}: field exposure ${field.exposure} is below requested ${input.exposure}`);
  }
  if (field.kind === "PROTECTED_WEIGHT" && input.exposure !== "INTERNAL") {
    violations.push(`${field.path}: protected weights cannot be exposed outside internal review`);
  }
  if (field.kind === "RAW_SOURCE_VALUE" && input.exposure === "API") {
    violations.push(
      `${field.path}: raw source value from ${field.sourceIds.join(", ")} cannot be exposed through metric API payloads`,
    );
  }
  if (field.kind === "UNSUPPORTED_PROBABILITY_CLAIM") {
    violations.push(
      `${field.path}: unsupported probability claims cannot be exposed through metric payloads`,
    );
  }

  return violations;
}

function sourceUseForField(field: MetricPayloadField, exposure: MetricPayloadExposure): MetricSourceRightsUse {
  if (field.kind === "RAW_SOURCE_VALUE" || field.kind === "PROVIDER_IDENTIFIER") {
    return exposure === "API" ? "raw_api" : "content_display";
  }
  switch (exposure) {
    case "INTERNAL":
      return "storage";
    case "CONTENT":
      return "derived_metric";
    case "API":
      return "derived_api";
    default:
      return assertNever(exposure);
  }
}

function exposureRank(exposure: MetricPayloadExposure): number {
  switch (exposure) {
    case "INTERNAL":
      return 0;
    case "CONTENT":
      return 1;
    case "API":
      return 2;
    default:
      return assertNever(exposure);
  }
}

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}

function assertNever(value: never): never {
  throw new Error(`Unhandled metric payload-rights variant: ${value}`);
}
