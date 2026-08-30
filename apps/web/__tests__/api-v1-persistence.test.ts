import { describe, expect, it } from "vitest";

import {
  createApiV1MemoryPersistenceStore,
  hashApiV1Key,
  parseApiV1Credential,
  validateApiV1PersistencePromotionPlan,
  type ApiV1AuditEvent,
  type ApiV1PersistencePromotionPlan,
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const RAW_KEY = "gse_v1_shadow_ABCDEFGHIJKLMNOP";
const OTHER_KEY = "gse_v1_shadow_QRSTUVWXYZabcdef";
const NOW = "2026-07-04T00:00:00.000Z";

function consumer(overrides: Partial<ApiV1ShadowConsumerRecord> = {}): ApiV1ShadowConsumerRecord {
  return {
    active: true,
    allowedOrigins: ["partner.gse.test"],
    consumerId: "consumer_1",
    displayName: "Partner Shadow Consumer",
    expiresAt: "2026-12-31T00:00:00.000Z",
    issuedAt: "2026-07-01T00:00:00.000Z",
    keyHash: hashApiV1Key(RAW_KEY),
    keyId: "gse_v1_shadow_consumer_1",
    monthlyQuota: 3,
    notes: "Local shadow contract only.",
    ownerApprovedForLiveUse: false,
    rotateAfter: "2026-08-01T00:00:00.000Z",
    scopes: ["evidence:read"],
    status: "shadow_active",
    usedThisMonth: 1,
    ...overrides,
  };
}

function credential(rawKey = RAW_KEY) {
  return parseApiV1Credential({ authorization: `Bearer ${rawKey}` });
}

function basePromotionPlan(overrides: Partial<ApiV1PersistencePromotionPlan> = {}): ApiV1PersistencePromotionPlan {
  return {
    appendOnlyAudit: true,
    deniedResponsesLeakPayload: false,
    hashesOnly: true,
    migrationIncluded: false,
    openApiGeneratedInCi: true,
    ownerApprovedForLiveUse: false,
    quotaAndAuditSameTransaction: true,
    rawKeysStored: false,
    rollbackPlan: null,
    routeExposed: false,
    storage: "memory_shadow",
    ...overrides,
  };
}

describe("API v1 shadow persistence adapter", () => {
  it("validates seeded state through the registry and audit reports", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const snapshot = store.snapshot();

    expect(snapshot.adapterKind).toBe("memory_shadow");
    expect(snapshot.registryReport.ok).toBe(true);
    expect(snapshot.auditReport.valid).toBe(true);
    expect(snapshot.consumers).toHaveLength(1);
    expect(snapshot.auditLedger).toHaveLength(0);
  });

  it("returns defensive snapshots so callers cannot mutate internal state", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const listed = store.listConsumers();
    const mutated = listed[0] as ApiV1ShadowConsumerRecord;

    expect(mutated).toBeDefined();
    const externalMutation = { ...mutated, usedThisMonth: 99 };
    expect(externalMutation.usedThisMonth).toBe(99);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
  });

  it("atomically increments usage and appends an allow audit event", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const result = store.recordQuotaAndAudit({
      credential: credential(),
      eventId: "evt_allow_1",
      occurredAt: NOW,
      payload: {
        decision: "allow",
        endpointId: "evidence.record.read",
        reasonCodes: [],
        sourceIds: ["nflverse"],
      },
      now: NOW,
    });

    expect(result.ok).toBe(true);
    expect(result.quotaRemainingBefore).toBe(2);
    expect(result.quotaRemainingAfter).toBe(1);
    expect(result.consumer?.usedThisMonth).toBe(2);
    expect(result.auditEvent.type).toBe("request_allowed");
    expect(result.auditEvent.payload).toMatchObject({
      consumerId: "consumer_1",
      decision: "allow",
      keyId: "gse_v1_shadow_consumer_1",
      quotaRemaining: 1,
    });
    expect(result.snapshot.auditReport.valid).toBe(true);
    expect(store.readAuditLedger()).toHaveLength(1);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(2);
  });

  it("fails closed and appends a deny audit event without incrementing usage", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const result = store.recordQuotaAndAudit({
      credential: credential(OTHER_KEY),
      eventId: "evt_deny_1",
      occurredAt: NOW,
      payload: {
        decision: "allow",
        endpointId: "evidence.record.read",
        reasonCodes: [],
        sourceIds: ["nflverse"],
      },
      now: NOW,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "consumer-not-found" });
    expect(result.quotaRemainingBefore).toBe(0);
    expect(result.quotaRemainingAfter).toBe(0);
    expect(result.auditEvent.type).toBe("request_denied");
    expect(result.auditEvent.payload.reasonCodes).toContain("consumer-not-found");
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
    expect(store.readAuditLedger()).toHaveLength(1);
  });

  it("records quota exhaustion as a denial with the consumer id present", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer({ usedThisMonth: 3 })] });
    const result = store.recordQuotaAndAudit({
      credential: credential(),
      eventId: "evt_deny_quota",
      occurredAt: NOW,
      payload: {
        decision: "allow",
        endpointId: "evidence.record.read",
        reasonCodes: ["preflight"],
        sourceIds: ["nflverse"],
      },
      now: NOW,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "quota-exhausted" });
    expect(result.auditEvent.payload).toMatchObject({
      consumerId: "consumer_1",
      decision: "deny",
      keyId: "gse_v1_shadow_consumer_1",
      quotaRemaining: 0,
    });
    expect(result.auditEvent.payload.reasonCodes).toEqual(["quota-exhausted", "preflight"]);
  });

  it("putConsumer replaces by consumer id and keeps registry validation visible", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const snapshot = store.putConsumer(consumer({ monthlyQuota: 5, usedThisMonth: 0 }));

    expect(snapshot.consumers).toHaveLength(1);
    expect(snapshot.consumers[0]?.monthlyQuota).toBe(5);
    expect(snapshot.registryReport.ok).toBe(true);

    const badSnapshot = store.putConsumer(consumer({ keyHash: "gse_v1_shadow_raw" }));
    expect(badSnapshot.registryReport.ok).toBe(false);
    expect(badSnapshot.registryReport.issues.map((issue) => issue.code)).toContain("raw-key-leak");
  });

  it("appendAuditEvent preserves the hash chain across manual events", () => {
    const store = createApiV1MemoryPersistenceStore();
    store.appendAuditEvent({
      eventId: "evt_record_1",
      occurredAt: NOW,
      payload: {
        consumerId: "consumer_1",
        decision: "record",
        endpointId: null,
        keyId: "gse_v1_shadow_consumer_1",
        quotaRemaining: 2,
        reasonCodes: [],
        sourceIds: [],
      },
      type: "consumer_registered",
    });
    const snapshot = store.appendAuditEvent({
      eventId: "evt_record_2",
      occurredAt: NOW,
      payload: {
        consumerId: "consumer_1",
        decision: "record",
        endpointId: null,
        keyId: "gse_v1_shadow_consumer_1",
        quotaRemaining: 2,
        reasonCodes: [],
        sourceIds: [],
      },
      type: "scope_changed",
    });

    const ledger = snapshot.auditLedger as readonly ApiV1AuditEvent[];
    expect(snapshot.auditReport.valid).toBe(true);
    expect(snapshot.auditReport.recordCount).toBe(2);
    expect(ledger[1]?.previousHash).toBe(ledger[0]?.hash);
  });
});
describe("API v1 persistence promotion plan", () => {
  it("allows only a shadow-safe memory plan and still warns about non-durable storage", () => {
    const report = validateApiV1PersistencePromotionPlan(basePromotionPlan());

    expect(report.allowed).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.warnings.join(" ")).toMatch(/Owner approval/);
    expect(report.warnings.join(" ")).toMatch(/local shadow only/);
  });

  it("blocks live storage, raw keys, non-atomic quota/audit, route exposure, and payload leakage", () => {
    const report = validateApiV1PersistencePromotionPlan(
      basePromotionPlan({
        appendOnlyAudit: false,
        deniedResponsesLeakPayload: true,
        hashesOnly: false,
        migrationIncluded: true,
        quotaAndAuditSameTransaction: false,
        rawKeysStored: true,
        routeExposed: true,
        storage: "database_live",
      })
    );

    expect(report.allowed).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Live database storage is blocked until owner approval and route exposure are explicitly approved.",
        "Raw API keys must never be stored.",
        "Persistence must store hashes only, never raw key material.",
        "Audit persistence must be append-only.",
        "Quota decrement and audit append must be committed in the same transaction.",
        "No API v1 route can be exposed in the shadow persistence slice.",
        "Denied responses must not leak protected payload data.",
        "Any migration plan must include a rollback plan.",
      ])
    );
  });
});
