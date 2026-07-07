import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  createApiV1MemoryPersistenceStore,
  createApiV1MockTransactionalPersistenceStore,
  hashApiV1Key,
  parseApiV1Credential,
  runApiV1DurableAdapterConformanceSuite,
  type ApiV1DurableAdapterConformanceFixture,
  type ApiV1QuotaAuditInput,
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const apiV1RouteTree = path.join(repoRoot, "apps/web/app/api/v1");
const migrationsDir = path.join(repoRoot, "packages/db/prisma/migrations");
const prismaSchemaPath = path.join(repoRoot, "packages/db/prisma/schema.prisma");

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

function fixture(): ApiV1DurableAdapterConformanceFixture {
  return {
    consumer: consumer(),
    invalidCredential: parseApiV1Credential({ authorization: `Bearer ${OTHER_KEY}` }),
    now: NOW,
    validCredential: parseApiV1Credential({ authorization: `Bearer ${RAW_KEY}` }),
  };
}

function quotaAuditInput(eventId: string): ApiV1QuotaAuditInput {
  return {
    credential: parseApiV1Credential({ authorization: `Bearer ${RAW_KEY}` }),
    eventId,
    occurredAt: NOW,
    payload: {
      decision: "allow",
      endpointId: "evidence.record.read",
      reasonCodes: [],
      sourceIds: ["nflverse"],
    },
    now: NOW,
  };
}

function migrationNames(): string[] {
  return fs.readdirSync(migrationsDir).filter((entry) => {
    const migrationPath = path.join(migrationsDir, entry, "migration.sql");
    return fs.existsSync(migrationPath);
  });
}

describe("API v1 durable adapter conformance harness", () => {
  it("passes the conformance suite against the memory shadow store", () => {
    const report = runApiV1DurableAdapterConformanceSuite({
      adapterName: "memory_shadow",
      createStore: createApiV1MemoryPersistenceStore,
      fixture: fixture(),
    });

    expect(report.passed).toBe(true);
    expect(report.cases).toHaveLength(5);
    expect(report.cases.map((entry) => entry.passed)).toEqual([true, true, true, true, true]);
    expect(report.requiredBehaviors).toEqual(
      expect.arrayContaining([
        "increments quota usage exactly once on allowed requests",
        "does not increment quota usage for rejected requests",
        "preserves a valid hash-chained audit ledger",
      ])
    );
  });

  it("passes the same suite against the mocked transaction adapter", () => {
    const report = runApiV1DurableAdapterConformanceSuite({
      adapterName: "mock_transactional_store",
      createStore: createApiV1MockTransactionalPersistenceStore,
      fixture: fixture(),
    });

    expect(report.passed).toBe(true);
    expect(report.cases.every((entry) => entry.error === null)).toBe(true);
  });

  it("stages quota and audit writes before committing the mocked transaction", () => {
    const store = createApiV1MockTransactionalPersistenceStore({ consumers: [consumer()] });
    const result = store.recordQuotaAndAudit(quotaAuditInput("evt_mock_commit"));
    const log = store.transactionLog();

    expect(result.ok).toBe(true);
    expect(result.snapshot.adapterKind).toBe("planned_durable_store");
    expect(store.snapshot().adapterKind).toBe("planned_durable_store");
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(2);
    expect(store.readAuditLedger()).toHaveLength(1);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      operation: "record_quota_and_audit",
      status: "committed",
    });
    expect(log[0]?.before).toMatchObject({ auditEventCount: 0, totalUsedThisMonth: 1 });
    expect(log[0]?.staged).toMatchObject({ auditEventCount: 1, totalUsedThisMonth: 2 });
    expect(log[0]?.after).toMatchObject({ auditEventCount: 1, totalUsedThisMonth: 2 });
  });

  it("rolls back the mocked transaction without leaking quota or audit mutations", () => {
    const store = createApiV1MockTransactionalPersistenceStore({ consumers: [consumer()] });
    const before = store.snapshot();

    store.injectNextCommitFailure("simulated durable commit failure");

    expect(() => store.recordQuotaAndAudit(quotaAuditInput("evt_mock_rollback"))).toThrow(
      "API v1 mock transaction rolled back: simulated durable commit failure"
    );

    const after = store.snapshot();
    const log = store.transactionLog();

    expect(after.consumers).toEqual(before.consumers);
    expect(after.auditLedger).toEqual(before.auditLedger);
    expect(after.auditReport).toEqual(before.auditReport);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
    expect(store.readAuditLedger()).toHaveLength(0);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      operation: "record_quota_and_audit",
      reason: "simulated durable commit failure",
      status: "rolled_back",
    });
    expect(log[0]?.before).toMatchObject({ auditEventCount: 0, totalUsedThisMonth: 1 });
    expect(log[0]?.staged).toMatchObject({ auditEventCount: 1, totalUsedThisMonth: 2 });
    expect(log[0]?.after).toMatchObject({ auditEventCount: 0, totalUsedThisMonth: 1 });
  });

  it("keeps the harness slice route-free, migration-free, schema-free, and env-free", () => {
    const schema = fs.readFileSync(prismaSchemaPath, "utf8");
    const envText = [
      fs.existsSync(path.join(repoRoot, ".env.example")) ? fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8") : "",
      fs.existsSync(path.join(repoRoot, "apps/web/.env.example"))
        ? fs.readFileSync(path.join(repoRoot, "apps/web/.env.example"), "utf8")
        : "",
    ].join("\n");

    expect(fs.existsSync(apiV1RouteTree)).toBe(false);
    expect(migrationNames().filter((name) => /api[_-]?v1/i.test(name))).toEqual([]);
    expect(schema).not.toContain("model ApiV1Consumer ");
    expect(schema).not.toContain("model ApiV1AuditEvent ");
    expect(schema).not.toContain("model ApiV1QuotaMonth ");
    expect(envText).not.toMatch(/^(GSE_API_KEY|GSE_API_V1_|API_V1_)/im);
  });
});
