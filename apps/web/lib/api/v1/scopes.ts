import {
  API_V1_SCOPES,
  type ApiV1EndpointContract,
  type ApiV1EndpointId,
  type ApiV1Scope,
  type ApiV1ScopeDecision,
} from "./types";

export const API_V1_ENDPOINTS: readonly ApiV1EndpointContract[] = [
  {
    dataClasses: ["evidence_metadata", "source_rights_summary", "attribution"],
    id: "evidence.record.read",
    method: "GET",
    path: "/v1/evidence/{id}",
    requiredScopes: ["evidence:read"],
    status: "shadow_only",
    summary: "Read a public-safe evidence record summary after rights gates pass.",
  },
  {
    dataClasses: ["signal_summary", "calibration_state", "source_lineage"],
    id: "signals.summary.read",
    method: "GET",
    path: "/v1/signals/{gameId}",
    requiredScopes: ["signals:read", "evidence:read"],
    status: "shadow_only",
    summary: "Read a shadow signal summary without win-probability overclaiming.",
  },
  {
    dataClasses: ["metric_birth_certificate", "public_driver_summary"],
    id: "metrics.birth_certificate.read",
    method: "GET",
    path: "/v1/metrics/{metricId}/birth-certificate",
    requiredScopes: ["metrics:read"],
    status: "shadow_only",
    summary: "Read the public portion of a metric birth certificate.",
  },
  {
    dataClasses: ["partner_summary", "compliance_status", "disclosure_status"],
    id: "revenue.partner_summary.read",
    method: "GET",
    path: "/v1/revenue/partners/{partnerId}/summary",
    requiredScopes: ["revenue:read"],
    status: "shadow_only",
    summary: "Read a partner-safe commercial summary with disclosure gates.",
  },
];

const VALID_SCOPES = new Set<ApiV1Scope>(API_V1_SCOPES);

export function isApiV1Scope(value: string): value is ApiV1Scope {
  return VALID_SCOPES.has(value as ApiV1Scope);
}

export function normalizeApiV1Scopes(input: string | readonly string[]): readonly ApiV1Scope[] {
  const values: readonly string[] = typeof input === "string" ? input.split(/[\s,]+/) : input;
  const normalized: ApiV1Scope[] = [];

  values.forEach((value: string) => {
    const trimmed = value.trim();
    if (isApiV1Scope(trimmed) && !normalized.includes(trimmed)) normalized.push(trimmed);
  });

  return normalized;
}

export function findApiV1Endpoint(id: ApiV1EndpointId): ApiV1EndpointContract {
  const endpoint = API_V1_ENDPOINTS.find((candidate) => candidate.id === id);
  if (endpoint === undefined) {
    throw new Error(`Unknown API v1 endpoint contract: ${id}`);
  }
  return endpoint;
}

export function evaluateApiV1Scopes(
  grantedScopes: readonly ApiV1Scope[],
  requiredScopes: readonly ApiV1Scope[]
): ApiV1ScopeDecision {
  const granted = new Set(grantedScopes);
  const hasShadowAdmin = granted.has("admin:shadow");
  const missingScopes = hasShadowAdmin
    ? []
    : requiredScopes.filter((required) => !granted.has(required));

  const blockers: string[] = [];
  if (requiredScopes.length === 0) blockers.push("Endpoint contract has no required scopes.");
  if (grantedScopes.length === 0) blockers.push("Consumer has no granted scopes.");
  missingScopes.forEach((scope) => blockers.push(`Missing required scope: ${scope}.`));

  return {
    allowed: blockers.length === 0,
    blockers,
    grantedScopes,
    missingScopes,
    requiredScopes,
  };
}
