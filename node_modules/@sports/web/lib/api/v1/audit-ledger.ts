import { createHash } from "node:crypto";

import type { ApiV1EndpointId } from "./types";

export type ApiV1AuditEventType =
  | "consumer_registered"
  | "consumer_revoked"
  | "key_rotated"
  | "quota_checked"
  | "request_allowed"
  | "request_denied"
  | "scope_changed";

export type ApiV1AuditPayload = {
  readonly consumerId: string | null;
  readonly keyId: string | null;
  readonly endpointId: ApiV1EndpointId | null;
  readonly decision: "allow" | "deny" | "record";
  readonly reasonCodes: readonly string[];
  readonly quotaRemaining: number | null;
  readonly sourceIds: readonly string[];
};

export type ApiV1AuditEventInput = {
  readonly sequence: number;
  readonly eventId: string;
  readonly type: ApiV1AuditEventType;
  readonly occurredAt: string;
  readonly previousHash: string | null;
  readonly payload: ApiV1AuditPayload;
};

export type ApiV1AuditEvent = ApiV1AuditEventInput & {
  readonly payloadHash: string;
  readonly hash: string;
};

export type ApiV1AuditVerification = {
  readonly valid: boolean;
  readonly totalEvents: number;
  readonly tipHash: string | null;
  readonly allowCount: number;
  readonly denyCount: number;
  readonly recordCount: number;
  readonly errors: readonly string[];
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

function isJsonObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (isJsonObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function payloadToJson(payload: ApiV1AuditPayload): JsonValue {
  return {
    consumerId: payload.consumerId,
    decision: payload.decision,
    endpointId: payload.endpointId,
    keyId: payload.keyId,
    quotaRemaining: payload.quotaRemaining,
    reasonCodes: [...payload.reasonCodes].sort(),
    sourceIds: [...payload.sourceIds].sort(),
  };
}

function eventBodyToJson(input: ApiV1AuditEventInput, payloadHash: string): JsonValue {
  return {
    eventId: input.eventId,
    occurredAt: input.occurredAt,
    payloadHash,
    previousHash: input.previousHash,
    sequence: input.sequence,
    type: input.type,
  };
}

export function apiV1AuditPayloadHash(payload: ApiV1AuditPayload): string {
  return sha256(canonicalJson(payloadToJson(payload)));
}

export function apiV1AuditEventHash(input: ApiV1AuditEventInput): string {
  return sha256(canonicalJson(eventBodyToJson(input, apiV1AuditPayloadHash(input.payload))));
}

export function createApiV1AuditEvent(input: ApiV1AuditEventInput): ApiV1AuditEvent {
  const payloadHash = apiV1AuditPayloadHash(input.payload);
  return {
    ...input,
    hash: sha256(canonicalJson(eventBodyToJson(input, payloadHash))),
    payloadHash,
  };
}

export function appendApiV1AuditEvent(
  ledger: readonly ApiV1AuditEvent[],
  input: Omit<ApiV1AuditEventInput, "previousHash" | "sequence">
): readonly ApiV1AuditEvent[] {
  const previous = ledger.at(-1) ?? null;
  const event = createApiV1AuditEvent({
    ...input,
    previousHash: previous?.hash ?? null,
    sequence: ledger.length + 1,
  });
  return [...ledger, event];
}

export function verifyApiV1AuditLedger(events: readonly ApiV1AuditEvent[]): ApiV1AuditVerification {
  const errors: string[] = [];
  let previousHash: string | null = null;
  let lastSequence = 0;
  let allowCount = 0;
  let denyCount = 0;
  let recordCount = 0;
  const eventIds = new Set<string>();

  for (const event of events) {
    if (event.sequence <= lastSequence) errors.push(`event ${event.eventId} sequence is not strictly increasing`);
    if (event.previousHash !== previousHash) errors.push(`event ${event.eventId} previousHash does not match chain tip`);
    if (eventIds.has(event.eventId)) errors.push(`event ${event.eventId} is duplicated`);
    eventIds.add(event.eventId);

    const expectedPayloadHash = apiV1AuditPayloadHash(event.payload);
    if (event.payloadHash !== expectedPayloadHash) errors.push(`event ${event.eventId} payloadHash mismatch`);

    const expectedEventHash = apiV1AuditEventHash(event);
    if (event.hash !== expectedEventHash) errors.push(`event ${event.eventId} hash mismatch`);

    if (event.payload.decision === "allow") allowCount++;
    if (event.payload.decision === "deny") denyCount++;
    if (event.payload.decision === "record") recordCount++;

    previousHash = event.hash;
    lastSequence = event.sequence;
  }

  return {
    allowCount,
    denyCount,
    errors,
    recordCount,
    tipHash: events.at(-1)?.hash ?? null,
    totalEvents: events.length,
    valid: errors.length === 0,
  };
}
