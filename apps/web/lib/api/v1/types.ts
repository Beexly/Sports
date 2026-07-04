export const API_V1_SHADOW_VERSION = "gse-api-v1-shadow" as const;

export const API_V1_SCOPES = [
  "evidence:read",
  "signals:read",
  "metrics:read",
  "revenue:read",
  "admin:shadow",
] as const;

export type ApiV1Scope = (typeof API_V1_SCOPES)[number];

export type ApiV1EndpointId =
  | "evidence.record.read"
  | "signals.summary.read"
  | "metrics.birth_certificate.read"
  | "revenue.partner_summary.read";

export type ApiV1EndpointContract = {
  readonly id: ApiV1EndpointId;
  readonly method: "GET";
  readonly path: string;
  readonly summary: string;
  readonly requiredScopes: readonly ApiV1Scope[];
  readonly dataClasses: readonly string[];
  readonly status: "shadow_only";
};

export type ApiV1AuthHeaders = {
  readonly authorization?: string | null;
  readonly xGseApiKey?: string | null;
  readonly xApiKey?: string | null;
};

export type ApiV1CredentialTransport = "authorization_bearer" | "x-gse-api-key" | "x-api-key";

export type ApiV1AuthFailureCode =
  | "missing_api_key"
  | "conflicting_api_keys"
  | "invalid_authorization_scheme"
  | "malformed_api_key";

export type ApiV1ParsedCredential =
  | {
      readonly ok: true;
      readonly keyHash: string;
      readonly keyId: string;
      readonly keyPrefix: "gse_v1_shadow" | "gse_v1_test" | "gse_v1_live";
      readonly transport: ApiV1CredentialTransport;
      readonly redacted: string;
    }
  | {
      readonly ok: false;
      readonly code: ApiV1AuthFailureCode;
      readonly message: string;
      readonly transport: ApiV1CredentialTransport | "none" | "multiple" | "authorization";
    };

export type ApiV1ScopeDecision = {
  readonly allowed: boolean;
  readonly requiredScopes: readonly ApiV1Scope[];
  readonly grantedScopes: readonly ApiV1Scope[];
  readonly missingScopes: readonly ApiV1Scope[];
  readonly blockers: readonly string[];
};

export type ApiV1PayloadUse =
  | "commercial_display"
  | "derived_feature"
  | "raw_storage"
  | "partner_sharing"
  | "model_training"
  | "public_display";

export type ApiV1PayloadRightsDecision = {
  readonly sourceId: string;
  readonly sourceName: string | null;
  readonly allowed: boolean;
  readonly status: "allowed" | "conditional" | "blocked" | "unknown";
  readonly blockers: readonly string[];
  readonly attributionRequired: boolean;
  readonly attributionText: string | null;
};

export type ApiV1PayloadRightsReport = {
  readonly allowed: boolean;
  readonly intendedUse: ApiV1PayloadUse;
  readonly sourceDecisions: readonly ApiV1PayloadRightsDecision[];
  readonly blockers: readonly string[];
  readonly attributions: readonly string[];
};

export type ApiV1RegisteredConsumer = {
  readonly keyId: string;
  readonly keyHash: string;
  readonly active: boolean;
  readonly scopes: readonly ApiV1Scope[];
  readonly allowedOrigins?: readonly string[];
};

export type ApiV1EnvelopeError = {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
};

export type ApiV1EnvelopeMeta = {
  readonly version: typeof API_V1_SHADOW_VERSION;
  readonly requestId: string;
  readonly generatedAt: string;
  readonly shadow: true;
  readonly endpointId: ApiV1EndpointId;
  readonly warnings: readonly string[];
};

export type ApiV1SuccessEnvelope<T> = {
  readonly ok: true;
  readonly data: T;
  readonly errors: readonly [];
  readonly meta: ApiV1EnvelopeMeta;
};

export type ApiV1ErrorEnvelope = {
  readonly ok: false;
  readonly data: null;
  readonly errors: readonly ApiV1EnvelopeError[];
  readonly meta: ApiV1EnvelopeMeta;
};

export type ApiV1Envelope<T> = ApiV1SuccessEnvelope<T> | ApiV1ErrorEnvelope;
