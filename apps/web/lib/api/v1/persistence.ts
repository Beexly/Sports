import {
  appendApiV1AuditEvent,
  verifyApiV1AuditLedger,
  type ApiV1AuditEvent,
  type ApiV1AuditEventType,
  type ApiV1AuditPayload,
  type ApiV1AuditVerification,
} from "./audit-ledger";
import {
  resolveApiV1Consumer,
  validateApiV1ConsumerRegistry,
  type ApiV1ConsumerRegistryReport,
  type ApiV1ConsumerResolution,
  type ApiV1ShadowConsumerRecord,
} from "./consumer-registry";
import type { ApiV1ParsedCredential } from "./types";

export type ApiV1PersistenceAdapterKind = "memory_shadow" | "planned_durable_store";

export type ApiV1PersistenceSnapshot = {
  readonly adapterKind: ApiV1PersistenceAdapterKind;
  readonly consumers: readonly ApiV1ShadowConsumerRecord[];
  readonly auditLedger: readonly ApiV1AuditEvent[];
  readonly registryReport: ApiV1ConsumerRegistryReport;
  readonly auditReport: ApiV1AuditVerification;
};

export type ApiV1AuditAppendInput = {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly type: ApiV1AuditEventType;
  readonly payload: ApiV1AuditPayload;
};

export type ApiV1QuotaAuditInput = {
  readonly credential: ApiV1ParsedCredential;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly payload: Omit<ApiV1AuditPayload, "consumerId" | "keyId" | "quotaRemaining">;
  readonly now?: string;
};

export type ApiV1QuotaAuditResult =
  | {
      readonly ok: true;
      readonly consumer: ApiV1ShadowConsumerRecord;
      readonly auditEvent: ApiV1AuditEvent;
      readonly quotaRemainingBefore: number;
      readonly quotaRemainingAfter: number;
      readonly snapshot: ApiV1PersistenceSnapshot;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly message: string;
      readonly consumer: ApiV1ShadowConsumerRecord | null;
      readonly auditEvent: ApiV1AuditEvent;
      readonly quotaRemainingBefore: number;
      readonly quotaRemainingAfter: number;
      readonly snapshot: ApiV1PersistenceSnapshot;
    };

export type ApiV1ShadowPersistenceStore = {
  readonly kind: ApiV1PersistenceAdapterKind;
  readonly listConsumers: () => readonly ApiV1ShadowConsumerRecord[];
  readonly readAuditLedger: () => readonly ApiV1AuditEvent[];
  readonly snapshot: () => ApiV1PersistenceSnapshot;
  readonly resolveConsumer: (credential: ApiV1ParsedCredential, now?: string) => ApiV1ConsumerResolution;
  readonly putConsumer: (consumer: ApiV1ShadowConsumerRecord) => ApiV1PersistenceSnapshot;
  readonly appendAuditEvent: (input: ApiV1AuditAppendInput) => ApiV1PersistenceSnapshot;
  readonly recordQuotaAndAudit: (input: ApiV1QuotaAuditInput) => ApiV1QuotaAuditResult;
};

export type ApiV1PersistencePromotionPlan = {
  readonly storage: "none" | "memory_shadow" | "database_planned" | "database_live";
  readonly rawKeysStored: boolean;
  readonly hashesOnly: boolean;
  readonly appendOnlyAudit: boolean;
  readonly quotaAndAuditSameTransaction: boolean;
  readonly ownerApprovedForLiveUse: boolean;
  readonly routeExposed: boolean;
  readonly migrationIncluded: boolean;
  readonly rollbackPlan: string | null;
  readonly deniedResponsesLeakPayload: boolean;
  readonly openApiGeneratedInCi: boolean;
};

export type ApiV1PersistencePromotionReport = {
  readonly allowed: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
};

function cloneConsumers(consumers: readonly ApiV1ShadowConsumerRecord[]): ApiV1ShadowConsumerRecord[] {
  return consumers.map((consumer) => ({
    ...consumer,
    allowedOrigins: consumer.allowedOrigins === undefined ? undefined : [...consumer.allowedOrigins],
    scopes: [...consumer.scopes],
  }));
}

function cloneLedger(events: readonly ApiV1AuditEvent[]): ApiV1AuditEvent[] {
  return events.map((event) => ({
    ...event,
    payload: {
      ...event.payload,
      reasonCodes: [...event.payload.reasonCodes],
      sourceIds: [...event.payload.sourceIds],
    },
  }));
}

function buildSnapshot(
  adapterKind: ApiV1PersistenceAdapterKind,
  consumers: readonly ApiV1ShadowConsumerRecord[],
  auditLedger: readonly ApiV1AuditEvent[]
): ApiV1PersistenceSnapshot {
  return {
    adapterKind,
    auditLedger: cloneLedger(auditLedger),
    auditReport: verifyApiV1AuditLedger(auditLedger),
    consumers: cloneConsumers(consumers),
    registryReport: validateApiV1ConsumerRegistry(consumers),
  };
}

function updateConsumerUsage(
  consumer: ApiV1ShadowConsumerRecord,
  usedThisMonth: number
): ApiV1ShadowConsumerRecord {
  return {
    ...consumer,
    usedThisMonth,
  };
}

export function createApiV1MemoryPersistenceStore(input: {
  readonly consumers?: readonly ApiV1ShadowConsumerRecord[];
  readonly auditLedger?: readonly ApiV1AuditEvent[];
} = {}): ApiV1ShadowPersistenceStore {
  let consumers = cloneConsumers(input.consumers ?? []);
  let auditLedger: readonly ApiV1AuditEvent[] = cloneLedger(input.auditLedger ?? []);
  const kind: ApiV1PersistenceAdapterKind = "memory_shadow";

  function snapshot(): ApiV1PersistenceSnapshot {
    return buildSnapshot(kind, consumers, auditLedger);
  }

  function putConsumer(consumer: ApiV1ShadowConsumerRecord): ApiV1PersistenceSnapshot {
    consumers = [
      ...consumers.filter((candidate) => candidate.consumerId !== consumer.consumerId),
      {
        ...consumer,
        allowedOrigins: consumer.allowedOrigins === undefined ? undefined : [...consumer.allowedOrigins],
        scopes: [...consumer.scopes],
      },
    ];
    return snapshot();
  }

  function appendAuditEvent(inputEvent: ApiV1AuditAppendInput): ApiV1PersistenceSnapshot {
    auditLedger = appendApiV1AuditEvent(auditLedger, inputEvent);
    return snapshot();
  }

  function resolveConsumer(credential: ApiV1ParsedCredential, now?: string): ApiV1ConsumerResolution {
    return resolveApiV1Consumer(credential, consumers, now);
  }

  function recordQuotaAndAudit(inputRecord: ApiV1QuotaAuditInput): ApiV1QuotaAuditResult {
    const resolved = resolveConsumer(inputRecord.credential, inputRecord.now);
    const quotaRemainingBefore = resolved.quotaRemaining;
    const denyPayload: ApiV1AuditPayload = {
      ...inputRecord.payload,
      consumerId: resolved.consumer?.consumerId ?? null,
      decision: "deny",
      keyId: resolved.consumer?.keyId ?? null,
      quotaRemaining: quotaRemainingBefore,
      reasonCodes: resolved.ok ? inputRecord.payload.reasonCodes : [resolved.code, ...inputRecord.payload.reasonCodes],
    };

    if (!resolved.ok) {
      auditLedger = appendApiV1AuditEvent(auditLedger, {
        eventId: inputRecord.eventId,
        occurredAt: inputRecord.occurredAt,
        payload: denyPayload,
        type: "request_denied",
      });
      const auditEvent = auditLedger.at(-1);
      if (auditEvent === undefined) {
        throw new Error("API v1 persistence failed to append deny audit event.");
      }
      return {
        auditEvent,
        code: resolved.code,
        consumer: resolved.consumer,
        message: resolved.message,
        ok: false,
        quotaRemainingAfter: quotaRemainingBefore,
        quotaRemainingBefore,
        snapshot: snapshot(),
      };
    }

    const updated = updateConsumerUsage(resolved.consumer, resolved.consumer.usedThisMonth + 1);
    const nextConsumers = consumers.map((consumer) => (consumer.consumerId === updated.consumerId ? updated : consumer));
    const quotaRemainingAfter = Math.max(0, updated.monthlyQuota - updated.usedThisMonth);

    const nextAuditLedger = appendApiV1AuditEvent(auditLedger, {
      eventId: inputRecord.eventId,
      occurredAt: inputRecord.occurredAt,
      payload: {
        ...inputRecord.payload,
        consumerId: updated.consumerId,
        decision: inputRecord.payload.decision,
        keyId: updated.keyId,
        quotaRemaining: quotaRemainingAfter,
      },
      type: inputRecord.payload.decision === "allow" ? "request_allowed" : "quota_checked",
    });
    const auditEvent = nextAuditLedger.at(-1);
    if (auditEvent === undefined) {
      throw new Error("API v1 persistence failed to append allow audit event.");
    }
    consumers = nextConsumers;
    auditLedger = nextAuditLedger;

    return {
      auditEvent,
      consumer: updated,
      ok: true,
      quotaRemainingAfter,
      quotaRemainingBefore,
      snapshot: snapshot(),
    };
  }

  return {
    appendAuditEvent,
    kind,
    listConsumers: () => cloneConsumers(consumers),
    putConsumer,
    readAuditLedger: () => cloneLedger(auditLedger),
    recordQuotaAndAudit,
    resolveConsumer,
    snapshot,
  };
}

export function validateApiV1PersistencePromotionPlan(
  plan: ApiV1PersistencePromotionPlan
): ApiV1PersistencePromotionReport {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (plan.storage === "database_live") {
    blockers.push("Live database storage is blocked until owner approval and route exposure are explicitly approved.");
  }
  if (plan.rawKeysStored) blockers.push("Raw API keys must never be stored.");
  if (!plan.hashesOnly) blockers.push("Persistence must store hashes only, never raw key material.");
  if (!plan.appendOnlyAudit) blockers.push("Audit persistence must be append-only.");
  if (!plan.quotaAndAuditSameTransaction) {
    blockers.push("Quota decrement and audit append must be committed in the same transaction.");
  }
  if (plan.routeExposed) blockers.push("No API v1 route can be exposed in the shadow persistence slice.");
  if (plan.deniedResponsesLeakPayload) blockers.push("Denied responses must not leak protected payload data.");
  if (plan.migrationIncluded && plan.rollbackPlan === null) {
    blockers.push("Any migration plan must include a rollback plan.");
  }
  if (!plan.openApiGeneratedInCi) warnings.push("OpenAPI generation should be added to CI before live route promotion.");
  if (!plan.ownerApprovedForLiveUse) warnings.push("Owner approval remains required before live API use.");
  if (plan.storage === "none" || plan.storage === "memory_shadow") {
    warnings.push("Storage is local shadow only; no durable consumer registry exists yet.");
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings,
  };
}
