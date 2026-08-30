import { parseApiV1Credential } from "./api-key";
import { type ApiV1AuditEvent } from "./audit-ledger";
import { toApiV1RegisteredConsumer } from "./consumer-registry";
import { createApiV1ErrorEnvelope, createApiV1SuccessEnvelope } from "./envelope";
import { type ApiV1PersistenceSnapshot, type ApiV1ShadowPersistenceStore } from "./persistence";
import { findApiV1Endpoint } from "./scopes";
import { evaluateApiV1ShadowGateway, type ApiV1ShadowGatewayData } from "./shadow-gateway";
import type {
  ApiV1AuthHeaders,
  ApiV1EndpointId,
  ApiV1Envelope,
  ApiV1EnvelopeError,
  ApiV1PayloadUse,
} from "./types";

export type ApiV1ShadowRouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiV1ShadowRouteHeaders = ApiV1AuthHeaders & {
  readonly origin?: string | null;
  readonly xRequestId?: string | null;
  readonly xGseRequestId?: string | null;
  readonly xIdempotencyKey?: string | null;
};

export type ApiV1ShadowRoutePayload = {
  readonly sourceIds: readonly string[];
  readonly intendedUse: ApiV1PayloadUse;
  readonly includesRawVendorPayload?: boolean;
  readonly includesPersonalData?: boolean;
};

export type ApiV1ShadowRouteRequest<TData extends Record<string, unknown> = Record<string, never>> = {
  readonly store: ApiV1ShadowPersistenceStore;
  readonly endpointId: ApiV1EndpointId;
  readonly method?: ApiV1ShadowRouteMethod;
  readonly headers: ApiV1ShadowRouteHeaders;
  readonly origin?: string | null;
  readonly payload: ApiV1ShadowRoutePayload;
  readonly responseData?: TData;
  readonly generatedAt?: string;
  readonly requestId?: string | null;
  readonly idempotencyKey?: string | null;
};

export type ApiV1ShadowRouteSuccessData<TData extends Record<string, unknown> = Record<string, unknown>> =
  ApiV1ShadowGatewayData & {
    readonly consumerId: string;
    readonly idempotencyKey: string | null;
    readonly rateLimit: ApiV1ShadowRateLimitDecision;
    readonly quotaRemainingBefore: number;
    readonly quotaRemainingAfter: number;
    readonly responseData: TData | null;
    readonly routeExposed: false;
    readonly usageEventId: string;
  };

export type ApiV1ShadowRouteUsageEvent = {
  readonly eventId: string;
  readonly type: ApiV1AuditEvent["type"];
  readonly decision: "allow" | "deny";
  readonly quotaDebited: boolean;
  readonly quotaRemaining: number | null;
  readonly reasonCodes: readonly string[];
  readonly sourceIds: readonly string[];
};

export type ApiV1ShadowRouteAbuseResponse = {
  readonly blocked: boolean;
  readonly reasonCodes: readonly string[];
  readonly deniedResponsesLeakPayload: false;
};

export type ApiV1ShadowRateLimitDecision = {
  readonly policy: "monthly_shadow_quota";
  readonly allowed: boolean;
  readonly quotaDebited: boolean;
  readonly quotaRemainingBefore: number | null;
  readonly quotaRemainingAfter: number | null;
};

export type ApiV1ShadowRouteHarnessResult<TData extends Record<string, unknown> = Record<string, unknown>> = {
  readonly ok: boolean;
  readonly status: 200 | 400 | 401 | 403 | 405 | 429;
  readonly requestId: string;
  readonly idempotencyKey: string | null;
  readonly routeExposed: false;
  readonly envelope: ApiV1Envelope<ApiV1ShadowRouteSuccessData<TData>>;
  readonly auditEvent: ApiV1AuditEvent;
  readonly snapshot: ApiV1PersistenceSnapshot;
  readonly usageEvent: ApiV1ShadowRouteUsageEvent;
  readonly rateLimit: ApiV1ShadowRateLimitDecision;
  readonly abuse: ApiV1ShadowRouteAbuseResponse;
};

type RequestTokenDecision = {
  readonly value: string | null;
  readonly reasonCodes: readonly string[];
};

type DenyContext = {
  readonly status: 400 | 401 | 403 | 405 | 429;
  readonly endpointId: ApiV1EndpointId;
  readonly requestId: string;
  readonly generatedAt: string;
  readonly eventId: string;
  readonly reasonCodes: readonly string[];
  readonly errors: readonly ApiV1EnvelopeError[];
  readonly sourceIds: readonly string[];
  readonly consumerId: string | null;
  readonly keyId: string | null;
  readonly quotaRemaining: number | null;
  readonly abuseReasonCodes?: readonly string[];
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

function deterministicRequestId(endpointId: ApiV1EndpointId, generatedAt: string): string {
  const normalized = `${endpointId}:${generatedAt}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `shadow-route-${normalized.slice(0, 80)}`;
}

function normalizeOptionalHeader(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function requestIdDecision(input: {
  readonly headers: ApiV1ShadowRouteHeaders;
  readonly requestId?: string | null;
}): RequestTokenDecision {
  const candidate =
    normalizeOptionalHeader(input.requestId) ??
    normalizeOptionalHeader(input.headers.xGseRequestId) ??
    normalizeOptionalHeader(input.headers.xRequestId);
  if (candidate === null) return { reasonCodes: [], value: null };
  if (REQUEST_ID_PATTERN.test(candidate)) return { reasonCodes: [], value: candidate };
  return { reasonCodes: ["malformed_request_id"], value: null };
}

function idempotencyKeyDecision(input: {
  readonly headers: ApiV1ShadowRouteHeaders;
  readonly idempotencyKey?: string | null;
}): RequestTokenDecision {
  const candidate =
    normalizeOptionalHeader(input.idempotencyKey) ?? normalizeOptionalHeader(input.headers.xIdempotencyKey);
  if (candidate === null) return { reasonCodes: [], value: null };
  if (IDEMPOTENCY_KEY_PATTERN.test(candidate)) return { reasonCodes: [], value: candidate };
  return { reasonCodes: ["malformed_idempotency_key"], value: null };
}

function appendDenyAudit(
  store: ApiV1ShadowPersistenceStore,
  context: Pick<
    DenyContext,
    "endpointId" | "eventId" | "generatedAt" | "reasonCodes" | "sourceIds" | "consumerId" | "keyId" | "quotaRemaining"
  >
): { readonly auditEvent: ApiV1AuditEvent; readonly snapshot: ApiV1PersistenceSnapshot } {
  const snapshot = store.appendAuditEvent({
    eventId: context.eventId,
    occurredAt: context.generatedAt,
    payload: {
      consumerId: context.consumerId,
      decision: "deny",
      endpointId: context.endpointId,
      keyId: context.keyId,
      quotaRemaining: context.quotaRemaining,
      reasonCodes: uniqueStrings(context.reasonCodes),
      sourceIds: uniqueStrings(context.sourceIds),
    },
    type: "request_denied",
  });
  const auditEvent = snapshot.auditLedger.at(-1);
  if (auditEvent === undefined) {
    throw new Error("API v1 shadow route harness failed to append a deny audit event.");
  }
  return { auditEvent, snapshot };
}

function denyResult<TData extends Record<string, unknown>>(
  store: ApiV1ShadowPersistenceStore,
  context: DenyContext
): ApiV1ShadowRouteHarnessResult<TData> {
  const audit = appendDenyAudit(store, context);
  const envelope = createApiV1ErrorEnvelope(context.errors, {
    endpointId: context.endpointId,
    generatedAt: context.generatedAt,
    requestId: context.requestId,
  });

  return {
    abuse: {
      blocked: (context.abuseReasonCodes ?? []).length > 0,
      deniedResponsesLeakPayload: false,
      reasonCodes: context.abuseReasonCodes ?? [],
    },
    auditEvent: audit.auditEvent,
    envelope,
    idempotencyKey: null,
    ok: false,
    rateLimit: {
      allowed: false,
      policy: "monthly_shadow_quota",
      quotaDebited: false,
      quotaRemainingAfter: context.quotaRemaining,
      quotaRemainingBefore: context.quotaRemaining,
    },
    requestId: context.requestId,
    routeExposed: false,
    snapshot: audit.snapshot,
    status: context.status,
    usageEvent: {
      decision: "deny",
      eventId: audit.auditEvent.eventId,
      quotaDebited: false,
      quotaRemaining: context.quotaRemaining,
      reasonCodes: uniqueStrings(context.reasonCodes),
      sourceIds: uniqueStrings(context.sourceIds),
      type: audit.auditEvent.type,
    },
  };
}

function error(code: string, message: string, field?: string): ApiV1EnvelopeError {
  return field === undefined ? { code, message } : { code, field, message };
}

function statusForResolutionCode(code: string): 401 | 403 | 429 {
  if (code === "quota-exhausted") return 429;
  if (code === "consumer-not-found") return 401;
  return 403;
}

function statusForGatewayErrors(errors: readonly ApiV1EnvelopeError[]): 401 | 403 {
  const authCodes = new Set([
    "missing_api_key",
    "conflicting_api_keys",
    "invalid_authorization_scheme",
    "malformed_api_key",
    "api_key_not_registered",
    "api_key_hash_mismatch",
  ]);
  return errors.some((entry) => authCodes.has(entry.code)) ? 401 : 403;
}

function routeEventId(store: ApiV1ShadowPersistenceStore, requestId: string): string {
  const nextSequence = store.readAuditLedger().length + 1;
  return `api-v1-shadow-route:${nextSequence}:${requestId}`;
}

export function handleApiV1ShadowRouteRequest<TData extends Record<string, unknown> = Record<string, unknown>>(
  input: ApiV1ShadowRouteRequest<TData>
): ApiV1ShadowRouteHarnessResult<TData> {
  const endpoint = findApiV1Endpoint(input.endpointId);
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const requestToken = requestIdDecision(input);
  const requestId = requestToken.value ?? deterministicRequestId(input.endpointId, generatedAt);
  const idempotencyToken = idempotencyKeyDecision(input);
  const eventId = routeEventId(input.store, requestId);
  const sourceIds = uniqueStrings(input.payload.sourceIds);
  const credential = parseApiV1Credential(input.headers);

  if (!credential.ok) {
    return denyResult(input.store, {
      consumerId: null,
      endpointId: input.endpointId,
      errors: [error(credential.code, credential.message, "headers")],
      eventId,
      generatedAt,
      keyId: null,
      quotaRemaining: null,
      reasonCodes: [credential.code],
      requestId,
      sourceIds,
      status: 401,
    });
  }

  const resolved = input.store.resolveConsumer(credential, generatedAt);
  if (!resolved.ok) {
    return denyResult(input.store, {
      consumerId: resolved.consumer?.consumerId ?? null,
      endpointId: input.endpointId,
      errors: [error(resolved.code, resolved.message, "consumer")],
      eventId,
      generatedAt,
      keyId: resolved.consumer?.keyId ?? null,
      quotaRemaining: resolved.quotaRemaining,
      reasonCodes: [resolved.code],
      requestId,
      sourceIds,
      status: statusForResolutionCode(resolved.code),
    });
  }

  const method = input.method ?? "GET";
  const methodReasonCodes = method === endpoint.method ? [] : ["method_not_allowed"];
  const abuseReasonCodes = uniqueStrings([
    ...requestToken.reasonCodes,
    ...idempotencyToken.reasonCodes,
    ...methodReasonCodes,
  ]);
  if (abuseReasonCodes.length > 0) {
    const status: 400 | 405 = methodReasonCodes.length > 0 ? 405 : 400;
    const errors = [
      ...requestToken.reasonCodes.map((code) => error(code, "Request id must be 8-128 safe ASCII characters.", "requestId")),
      ...idempotencyToken.reasonCodes.map((code) =>
        error(code, "Idempotency key must be 8-128 safe ASCII characters.", "idempotencyKey")
      ),
      ...methodReasonCodes.map((code) =>
        error(code, `Endpoint ${endpoint.id} accepts ${endpoint.method}; received ${method}.`, "method")
      ),
    ];

    return denyResult(input.store, {
      abuseReasonCodes,
      consumerId: resolved.consumer.consumerId,
      endpointId: input.endpointId,
      errors,
      eventId,
      generatedAt,
      keyId: resolved.consumer.keyId,
      quotaRemaining: resolved.quotaRemaining,
      reasonCodes: abuseReasonCodes,
      requestId,
      sourceIds,
      status,
    });
  }

  const gatewayEnvelope = evaluateApiV1ShadowGateway({
    consumer: toApiV1RegisteredConsumer(resolved.consumer),
    endpointId: input.endpointId,
    generatedAt,
    headers: input.headers,
    origin: input.origin ?? input.headers.origin ?? null,
    payload: input.payload,
  });

  if (!gatewayEnvelope.ok) {
    const reasonCodes = uniqueStrings(gatewayEnvelope.errors.map((entry) => entry.code));
    return denyResult(input.store, {
      consumerId: resolved.consumer.consumerId,
      endpointId: input.endpointId,
      errors: gatewayEnvelope.errors,
      eventId,
      generatedAt,
      keyId: resolved.consumer.keyId,
      quotaRemaining: resolved.quotaRemaining,
      reasonCodes,
      requestId,
      sourceIds,
      status: statusForGatewayErrors(gatewayEnvelope.errors),
    });
  }

  const quotaAudit = input.store.recordQuotaAndAudit({
    credential,
    eventId,
    occurredAt: generatedAt,
    payload: {
      decision: "allow",
      endpointId: input.endpointId,
      reasonCodes: [],
      sourceIds,
    },
    now: generatedAt,
  });

  if (!quotaAudit.ok) {
    return denyResult(input.store, {
      consumerId: quotaAudit.consumer?.consumerId ?? null,
      endpointId: input.endpointId,
      errors: [error(quotaAudit.code, quotaAudit.message, "quota")],
      eventId: routeEventId(input.store, requestId),
      generatedAt,
      keyId: quotaAudit.consumer?.keyId ?? null,
      quotaRemaining: quotaAudit.quotaRemainingAfter,
      reasonCodes: [quotaAudit.code],
      requestId,
      sourceIds,
      status: statusForResolutionCode(quotaAudit.code),
    });
  }

  const data: ApiV1ShadowRouteSuccessData<TData> = {
    ...gatewayEnvelope.data,
    consumerId: quotaAudit.consumer.consumerId,
    idempotencyKey: idempotencyToken.value,
    rateLimit: {
      allowed: true,
      policy: "monthly_shadow_quota",
      quotaDebited: true,
      quotaRemainingAfter: quotaAudit.quotaRemainingAfter,
      quotaRemainingBefore: quotaAudit.quotaRemainingBefore,
    },
    quotaRemainingAfter: quotaAudit.quotaRemainingAfter,
    quotaRemainingBefore: quotaAudit.quotaRemainingBefore,
    responseData: input.responseData ?? null,
    routeExposed: false,
    usageEventId: quotaAudit.auditEvent.eventId,
  };
  const envelope = createApiV1SuccessEnvelope(data, {
    endpointId: input.endpointId,
    generatedAt,
    requestId,
    warnings: [...resolved.warnings, "API v1 route harness is shadow-only and does not expose a live route."],
  });

  return {
    abuse: {
      blocked: false,
      deniedResponsesLeakPayload: false,
      reasonCodes: [],
    },
    auditEvent: quotaAudit.auditEvent,
    envelope,
    idempotencyKey: idempotencyToken.value,
    ok: true,
    rateLimit: {
      allowed: true,
      policy: "monthly_shadow_quota",
      quotaDebited: true,
      quotaRemainingAfter: quotaAudit.quotaRemainingAfter,
      quotaRemainingBefore: quotaAudit.quotaRemainingBefore,
    },
    requestId,
    routeExposed: false,
    snapshot: quotaAudit.snapshot,
    status: 200,
    usageEvent: {
      decision: "allow",
      eventId: quotaAudit.auditEvent.eventId,
      quotaDebited: true,
      quotaRemaining: quotaAudit.quotaRemainingAfter,
      reasonCodes: [],
      sourceIds,
      type: quotaAudit.auditEvent.type,
    },
  };
}
