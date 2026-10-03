import { isApiV1Scope } from "./scopes";
import type { ApiV1ParsedCredential, ApiV1RegisteredConsumer, ApiV1Scope } from "./types";

export const API_V1_CONSUMER_STATUSES = [
  "shadow_active",
  "shadow_suspended",
  "shadow_revoked",
  "shadow_expired",
] as const;

export type ApiV1ConsumerStatus = (typeof API_V1_CONSUMER_STATUSES)[number];

export type ApiV1ShadowConsumerRecord = ApiV1RegisteredConsumer & {
  readonly consumerId: string;
  readonly displayName: string;
  readonly status: ApiV1ConsumerStatus;
  readonly monthlyQuota: number;
  readonly usedThisMonth: number;
  readonly issuedAt: string;
  readonly expiresAt: string | null;
  readonly rotateAfter: string | null;
  readonly ownerApprovedForLiveUse: boolean;
  readonly notes: string;
};

export type ApiV1RegistryIssue = {
  readonly code: string;
  readonly path: string;
  readonly message: string;
};

export type ApiV1ConsumerRegistryReport = {
  readonly ok: boolean;
  readonly consumerCount: number;
  readonly activeCount: number;
  readonly revokedCount: number;
  readonly suspendedCount: number;
  readonly issues: readonly ApiV1RegistryIssue[];
};

export type ApiV1ConsumerResolution =
  | {
      readonly ok: true;
      readonly consumer: ApiV1ShadowConsumerRecord;
      readonly quotaRemaining: number;
      readonly rotationDue: boolean;
      readonly warnings: readonly string[];
    }
  | {
      readonly ok: false;
      readonly consumer: ApiV1ShadowConsumerRecord | null;
      readonly code: string;
      readonly message: string;
      readonly quotaRemaining: number;
      readonly rotationDue: boolean;
      readonly warnings: readonly string[];
    };

function issue(code: string, path: string, message: string): ApiV1RegistryIssue {
  return { code, message, path };
}

function isIsoDateTime(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && value.includes("T");
}

function hasWildcardOrigin(origin: string): boolean {
  return origin.includes("*") || origin.trim() === "";
}

function rotationDue(consumer: ApiV1ShadowConsumerRecord, now: string): boolean {
  return consumer.rotateAfter !== null && Date.parse(consumer.rotateAfter) <= Date.parse(now);
}

function expired(consumer: ApiV1ShadowConsumerRecord, now: string): boolean {
  return consumer.expiresAt !== null && Date.parse(consumer.expiresAt) <= Date.parse(now);
}

export function validateApiV1ConsumerRegistry(
  consumers: readonly ApiV1ShadowConsumerRecord[]
): ApiV1ConsumerRegistryReport {
  const issues: ApiV1RegistryIssue[] = [];
  const keyIds = new Map<string, string>();
  const keyHashes = new Map<string, string>();

  consumers.forEach((consumer, index) => {
    const path = `consumers.${index}.${consumer.consumerId}`;
    if (consumer.consumerId.trim().length === 0) {
      issues.push(issue("consumer-id-empty", path, "Consumer id is required."));
    }
    if (consumer.displayName.trim().length === 0) {
      issues.push(issue("display-name-empty", path, "Display name is required."));
    }
    if (!API_V1_CONSUMER_STATUSES.includes(consumer.status)) {
      issues.push(issue("status-invalid", path, "Consumer status is not part of the API v1 shadow contract."));
    }
    if (!isIsoDateTime(consumer.issuedAt)) {
      issues.push(issue("issued-at-invalid", path, "issuedAt must be an ISO date-time."));
    }
    if (consumer.expiresAt !== null && !isIsoDateTime(consumer.expiresAt)) {
      issues.push(issue("expires-at-invalid", path, "expiresAt must be null or an ISO date-time."));
    }
    if (consumer.rotateAfter !== null && !isIsoDateTime(consumer.rotateAfter)) {
      issues.push(issue("rotate-after-invalid", path, "rotateAfter must be null or an ISO date-time."));
    }
    if (consumer.keyHash.trim().length !== 64) {
      issues.push(issue("key-hash-invalid", path, "keyHash must be a 64-character SHA-256 hex string."));
    }
    if (consumer.keyHash.includes("gse_v1_")) {
      issues.push(issue("raw-key-leak", path, "keyHash must not contain raw API key material."));
    }
    if (consumer.monthlyQuota < 0 || !Number.isInteger(consumer.monthlyQuota)) {
      issues.push(issue("quota-invalid", path, "monthlyQuota must be a non-negative integer."));
    }
    if (consumer.usedThisMonth < 0 || !Number.isInteger(consumer.usedThisMonth)) {
      issues.push(issue("usage-invalid", path, "usedThisMonth must be a non-negative integer."));
    }
    if (consumer.usedThisMonth > consumer.monthlyQuota) {
      issues.push(issue("usage-exceeds-quota", path, "usedThisMonth cannot exceed monthlyQuota."));
    }
    if (consumer.ownerApprovedForLiveUse !== false) {
      issues.push(issue("live-approval-forbidden", path, "Shadow records cannot be owner-approved for live use."));
    }
    if (consumer.status === "shadow_revoked" && consumer.active) {
      issues.push(issue("revoked-active", path, "Revoked consumers must have active=false."));
    }
    if (consumer.status !== "shadow_active" && consumer.active) {
      issues.push(issue("inactive-status-active", path, "Only shadow_active consumers may have active=true."));
    }
    if (consumer.scopes.length === 0) {
      issues.push(issue("scopes-empty", path, "At least one scope is required."));
    }
    consumer.scopes.forEach((scope) => {
      if (!isApiV1Scope(scope)) {
        issues.push(issue("scope-invalid", `${path}.scopes`, `Unknown scope: ${scope}.`));
      }
    });
    (consumer.allowedOrigins ?? []).forEach((origin) => {
      if (hasWildcardOrigin(origin)) {
        issues.push(issue("origin-wildcard", `${path}.allowedOrigins`, "Wildcard or blank origins are forbidden."));
      }
    });

    const existingKeyId = keyIds.get(consumer.keyId);
    if (existingKeyId !== undefined) {
      issues.push(issue("key-id-duplicate", path, `keyId duplicates ${existingKeyId}.`));
    }
    keyIds.set(consumer.keyId, consumer.consumerId);

    const existingHash = keyHashes.get(consumer.keyHash);
    if (existingHash !== undefined) {
      issues.push(issue("key-hash-duplicate", path, `keyHash duplicates ${existingHash}.`));
    }
    keyHashes.set(consumer.keyHash, consumer.consumerId);
  });

  return {
    activeCount: consumers.filter((consumer) => consumer.status === "shadow_active").length,
    consumerCount: consumers.length,
    issues,
    ok: issues.length === 0,
    revokedCount: consumers.filter((consumer) => consumer.status === "shadow_revoked").length,
    suspendedCount: consumers.filter((consumer) => consumer.status === "shadow_suspended").length,
  };
}

export function toApiV1RegisteredConsumer(record: ApiV1ShadowConsumerRecord): ApiV1RegisteredConsumer {
  return {
    active: record.active && record.status === "shadow_active",
    allowedOrigins: record.allowedOrigins,
    keyHash: record.keyHash,
    keyId: record.keyId,
    scopes: record.scopes,
  };
}

export function resolveApiV1Consumer(
  credential: ApiV1ParsedCredential,
  consumers: readonly ApiV1ShadowConsumerRecord[],
  now = new Date(0).toISOString()
): ApiV1ConsumerResolution {
  if (!credential.ok) {
    return {
      code: credential.code,
      consumer: null,
      message: credential.message,
      ok: false,
      quotaRemaining: 0,
      rotationDue: false,
      warnings: [],
    };
  }

  const consumer = consumers.find((candidate) => candidate.keyHash === credential.keyHash) ?? null;
  if (consumer === null) {
    return {
      code: "consumer-not-found",
      consumer: null,
      message: "No shadow consumer is registered for this API key hash.",
      ok: false,
      quotaRemaining: 0,
      rotationDue: false,
      warnings: [],
    };
  }

  const quotaRemaining = Math.max(0, consumer.monthlyQuota - consumer.usedThisMonth);
  const warnings = rotationDue(consumer, now) ? ["API key rotation is due."] : [];

  if (!consumer.active || consumer.status !== "shadow_active") {
    return {
      code: "consumer-inactive",
      consumer,
      message: `Consumer status is ${consumer.status}.`,
      ok: false,
      quotaRemaining,
      rotationDue: rotationDue(consumer, now),
      warnings,
    };
  }

  if (expired(consumer, now)) {
    return {
      code: "consumer-expired",
      consumer,
      message: "Consumer API key is expired.",
      ok: false,
      quotaRemaining,
      rotationDue: rotationDue(consumer, now),
      warnings,
    };
  }

  if (quotaRemaining <= 0) {
    return {
      code: "quota-exhausted",
      consumer,
      message: "Consumer monthly quota is exhausted.",
      ok: false,
      quotaRemaining,
      rotationDue: rotationDue(consumer, now),
      warnings,
    };
  }

  return {
    consumer,
    ok: true,
    quotaRemaining,
    rotationDue: rotationDue(consumer, now),
    warnings,
  };
}

export function revokeApiV1ShadowConsumer(
  consumer: ApiV1ShadowConsumerRecord,
  note: string
): ApiV1ShadowConsumerRecord {
  return {
    ...consumer,
    active: false,
    notes: note.trim().length > 0 ? note : "Revoked in shadow registry.",
    status: "shadow_revoked",
  };
}

export function rotateApiV1ShadowConsumerKey(
  consumer: ApiV1ShadowConsumerRecord,
  key: Pick<ApiV1ShadowConsumerRecord, "keyId" | "keyHash" | "issuedAt" | "rotateAfter" | "expiresAt">
): ApiV1ShadowConsumerRecord {
  return {
    ...consumer,
    expiresAt: key.expiresAt,
    issuedAt: key.issuedAt,
    keyHash: key.keyHash,
    keyId: key.keyId,
    rotateAfter: key.rotateAfter,
    usedThisMonth: 0,
  };
}

export function scopeSet(scopes: readonly string[]): readonly ApiV1Scope[] {
  return [...new Set(scopes)].filter(isApiV1Scope);
}
