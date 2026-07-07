import type { SourceRightsEnvelope } from "./metric-asset.js";
import { GSE_METRIC_SOURCE_RIGHTS_POLICIES } from "./source-rights-registry-fixtures.js";

export {
  metricSourceRightsPoliciesFromRegistry,
  metricSourceRightsPolicyFromRegistryEntry,
  type MetricSourceRightsRegistryEntry,
} from "./source-rights-registry-adapter.js";
export {
  GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  GSE_METRIC_SOURCE_RIGHTS_REGISTRY_FIXTURES,
} from "./source-rights-registry-fixtures.js";

export type MetricSourceRightsUse =
  | "model_training"
  | "validation"
  | "derived_metric"
  | "content_display"
  | "storage"
  | "raw_api"
  | "derived_api";

export type MetricSourceRightsStatus =
  | "approved_open_license"
  | "approved_api"
  | "approved_public_logged_off"
  | "approved_written_permission"
  | "manual_research_only"
  | "permission_required"
  | "blocked_technical_controls"
  | "vendor_candidate"
  | "excluded";

export interface MetricSourceRightsPermissionSet {
  readonly modelTraining: boolean;
  readonly validation: boolean;
  readonly derivedMetric: boolean;
  readonly contentDisplay: boolean;
  readonly storage: boolean;
  readonly rawApi: boolean;
  readonly derivedApi: boolean;
}

export interface MetricSourceAttributionPolicy {
  readonly required: boolean;
  readonly text: string | null;
}

export interface MetricSourceRightsPolicy {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly registrySourceId: string;
  readonly status: MetricSourceRightsStatus;
  readonly permissions: MetricSourceRightsPermissionSet;
  readonly attribution: MetricSourceAttributionPolicy;
  readonly evidenceRefs: readonly string[];
  readonly notes: readonly string[];
}

export interface MetricSourceRightsInput {
  readonly policies: readonly MetricSourceRightsPolicy[];
  readonly sourceIds: readonly string[];
  readonly use: MetricSourceRightsUse;
}

export interface MetricSourceRightsDecision {
  readonly allowed: boolean;
  readonly violations: readonly string[];
  readonly requiredAttribution: readonly string[];
  readonly notes: readonly string[];
}

export function metricSourceRightsPolicy(
  policies: readonly MetricSourceRightsPolicy[],
  sourceId: string,
): MetricSourceRightsPolicy | null {
  return policies.find((policy) => policy.sourceId === sourceId) ?? null;
}

export function evaluateMetricSourceRights(input: MetricSourceRightsInput): MetricSourceRightsDecision {
  if (input.sourceIds.length === 0) {
    return {
      allowed: false,
      notes: [],
      requiredAttribution: [],
      violations: ["missing source-rights policy: no source ids provided"],
    };
  }

  const violations: string[] = [];
  const requiredAttribution: string[] = [];
  const notes: string[] = [];

  for (const sourceId of input.sourceIds) {
    const policy = metricSourceRightsPolicy(input.policies, sourceId);
    if (policy === null) {
      violations.push(`${sourceId} missing source-rights policy`);
      continue;
    }

    if (!permitsUse(policy, input.use)) {
      violations.push(`${policy.sourceId} blocks ${useLabel(input.use)}`);
    }
    if (policy.attribution.required && policy.attribution.text !== null) {
      requiredAttribution.push(policy.attribution.text);
    }
    notes.push(...policy.notes);
  }

  return {
    allowed: violations.length === 0,
    notes: unique(notes),
    requiredAttribution: unique(requiredAttribution),
    violations,
  };
}

export function sourceRightsEnvelopeFromPolicy(policy: MetricSourceRightsPolicy): SourceRightsEnvelope {
  const base = {
    mayExposeDerived: policy.permissions.derivedApi,
    mayExposeRaw: policy.permissions.rawApi,
    mayUseForModeling: policy.permissions.modelTraining,
    mayValidateAgainst: policy.permissions.validation,
    notes: policy.notes,
    sourceId: policy.sourceId,
  };
  if (!policy.attribution.required || policy.attribution.text === null) return base;
  return { ...base, attributionRequired: policy.attribution.text };
}

function permitsUse(policy: MetricSourceRightsPolicy, use: MetricSourceRightsUse): boolean {
  switch (use) {
    case "model_training":
      return policy.permissions.modelTraining;
    case "validation":
      return policy.permissions.validation;
    case "derived_metric":
      return policy.permissions.derivedMetric;
    case "content_display":
      return policy.permissions.contentDisplay;
    case "storage":
      return policy.permissions.storage;
    case "raw_api":
      return policy.permissions.rawApi;
    case "derived_api":
      return policy.permissions.derivedApi;
    default:
      return assertNever(use);
  }
}

function useLabel(use: MetricSourceRightsUse): string {
  switch (use) {
    case "model_training":
      return "model training";
    case "validation":
      return "validation";
    case "derived_metric":
      return "derived metric use";
    case "content_display":
      return "content display";
    case "storage":
      return "storage";
    case "raw_api":
      return "raw API exposure";
    case "derived_api":
      return "derived API exposure";
    default:
      return assertNever(use);
  }
}

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}

function assertNever(value: never): never {
  throw new Error(`Unhandled metric source-rights variant: ${value}`);
}
