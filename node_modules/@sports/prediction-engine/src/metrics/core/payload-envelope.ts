import {
  evaluateMetricPayloadRights,
  type MetricPayloadExposure,
  type MetricPayloadField,
  type MetricPayloadRightsDecision,
} from "./payload-rights.js";
import { GSE_METRIC_SOURCE_RIGHTS_POLICIES, type MetricSourceRightsPolicy } from "./source-rights.js";

export interface MetricPayloadEnvelopeField extends MetricPayloadField {
  readonly value: unknown;
}

export interface MetricPayloadEnvelopeInput {
  readonly fields: readonly MetricPayloadEnvelopeField[];
  readonly exposure?: MetricPayloadExposure;
  readonly policies?: readonly MetricSourceRightsPolicy[];
  readonly requestId?: string;
  readonly generatedAt?: string;
}

export interface MetricPayloadEnvelopeMeta {
  readonly exposure: MetricPayloadExposure;
  readonly generatedAt: string;
  readonly requestId: string | null;
  readonly shadow: true;
}

export interface MetricPayloadEnvelope {
  readonly ok: boolean;
  readonly payload: Record<string, unknown>;
  readonly approvedFields: readonly string[];
  readonly blockedFields: readonly string[];
  readonly requiredAttribution: readonly string[];
  readonly violations: readonly string[];
  readonly rightsDecision: MetricPayloadRightsDecision;
  readonly meta: MetricPayloadEnvelopeMeta;
}

export function filterMetricPayloadEnvelope(input: MetricPayloadEnvelopeInput): MetricPayloadEnvelope {
  const exposure = input.exposure ?? "API";
  const policies = input.policies ?? GSE_METRIC_SOURCE_RIGHTS_POLICIES;
  const rightsDecision = evaluateMetricPayloadRights({
    exposure,
    fields: input.fields,
    policies,
  });
  const approved = new Set(rightsDecision.approvedFields);
  const payload: Record<string, unknown> = {};

  for (const field of input.fields) {
    if (!approved.has(field.path)) continue;
    payload[field.path] = field.value;
  }

  return {
    approvedFields: rightsDecision.approvedFields,
    blockedFields: rightsDecision.blockedFields,
    meta: {
      exposure,
      generatedAt: input.generatedAt ?? new Date(0).toISOString(),
      requestId: input.requestId ?? null,
      shadow: true,
    },
    ok: rightsDecision.allowed,
    payload,
    requiredAttribution: rightsDecision.requiredAttribution,
    rightsDecision,
    violations: rightsDecision.violations,
  };
}
