import { describe, expect, it } from "vitest";

import {
  appendApiV1AuditEvent,
  createApiV1AuditEvent,
  hashApiV1Key,
  parseApiV1Credential,
  resolveApiV1Consumer,
  revokeApiV1ShadowConsumer,
  rotateApiV1ShadowConsumerKey,
  scopeSet,
  toApiV1RegisteredConsumer,
  validateApiV1ConsumerRegistry,
  verifyApiV1AuditLedger,
  evaluateApiV1ShadowGateway,
  type ApiV1AuditEvent,
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const RAW_KEY = "gse_v1_shadow_ABCDEFGHIJKLMNOP";
const ROTATED_KEY = "gse_v1_shadow_ROTATEDKEY000000";
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
    monthlyQuota: 100,
    notes: "Local shadow contract only.",
    ownerApprovedForLiveUse: false,
    rotateAfter: "2026-08-01T00:00:00.000Z",
    scopes: ["evidence:read"],
    status: "shadow_active",
    usedThisMonth: 10,
    ...overrides,
  };
}

function parsedCredential(rawKey = RAW_KEY) {
  return parseApiV1Credential({ authorization: `Bearer ${rawKey}` });
}

describe("API v1 shadow consumer registry", () => {
  it("accepts a well-formed shadow consumer and reports counts", () => {
    const report = validateApiV1ConsumerRegistry([consumer()]);

    expect(report.ok).toBe(true);
    expect(report.consumerCount).toBe(1);
    expect(report.activeCount).toBe(1);
    expect(report.issues).toEqual([]);
  });

  it("blocks raw key leaks, duplicate hashes, wildcard origins, and live approvals", () => {
    const bad = consumer({
      allowedOrigins: ["*.gse.test"],
      keyHash: `gse_v1_shadow_${hashApiV1Key(RAW_KEY)}`,
      ownerApprovedForLiveUse: true,
    });
    const duplicate = consumer({ consumerId: "consumer_2" });
    const duplicateHash = consumer({
      consumerId: "consumer_3",
      keyHash: hashApiV1Key(RAW_KEY),
      keyId: "gse_v1_shadow_consumer_3",
    });
    const report = validateApiV1ConsumerRegistry([bad, duplicate, duplicateHash]);
    const codes = report.issues.map((entry) => entry.code);

    expect(report.ok).toBe(false);
    expect(codes).toContain("raw-key-leak");
    expect(codes).toContain("origin-wildcard");
    expect(codes).toContain("live-approval-forbidden");
    expect(codes).toContain("key-id-duplicate");
    expect(codes).toContain("key-hash-duplicate");
  });

  it("requires revoked and suspended consumers to be inactive", () => {
    const revoked = consumer({ status: "shadow_revoked" });
    const suspended = consumer({
      consumerId: "consumer_2",
      keyHash: hashApiV1Key(ROTATED_KEY),
      keyId: "gse_v1_shadow_consumer_2",
      status: "shadow_suspended",
    });
    const report = validateApiV1ConsumerRegistry([revoked, suspended]);

    expect(report.ok).toBe(false);
    expect(report.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["revoked-active", "inactive-status-active"])
    );
  });

  it("resolves a credential to an active consumer with remaining quota and rotation warnings", () => {
    const result = resolveApiV1Consumer(
      parsedCredential(),
      [consumer({ rotateAfter: "2026-07-01T00:00:00.000Z" })],
      NOW
    );

    expect(result.ok).toBe(true);
    expect(result.quotaRemaining).toBe(90);
    expect(result.rotationDue).toBe(true);
    expect(result.warnings).toContain("API key rotation is due.");
  });

  it("fails closed for missing, inactive, expired, and quota-exhausted consumers", () => {
    expect(resolveApiV1Consumer(parsedCredential(ROTATED_KEY), [consumer()], NOW)).toMatchObject({
      code: "consumer-not-found",
      ok: false,
    });
    expect(resolveApiV1Consumer(parsedCredential(), [consumer({ active: false })], NOW)).toMatchObject({
      code: "consumer-inactive",
      ok: false,
    });
    expect(
      resolveApiV1Consumer(parsedCredential(), [consumer({ expiresAt: "2026-07-01T00:00:00.000Z" })], NOW)
    ).toMatchObject({ code: "consumer-expired", ok: false });
    expect(resolveApiV1Consumer(parsedCredential(), [consumer({ usedThisMonth: 100 })], NOW)).toMatchObject({
      code: "quota-exhausted",
      ok: false,
    });
  });

  it("turns a shadow record into the registered consumer shape used by the gateway", () => {
    const record = consumer();
    const gateway = evaluateApiV1ShadowGateway({
      consumer: toApiV1RegisteredConsumer(record),
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: { authorization: `Bearer ${RAW_KEY}` },
      origin: "https://partner.gse.test/widget",
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
    });

    expect(gateway.ok).toBe(true);
    expect(gateway.data?.consumerKeyId).toBe(record.keyId);
  });

  it("revokes and rotates without mutating the original record", () => {
    const original = consumer();
    const revoked = revokeApiV1ShadowConsumer(original, "Terms breach.");
    const rotated = rotateApiV1ShadowConsumerKey(original, {
      expiresAt: "2027-01-01T00:00:00.000Z",
      issuedAt: "2026-07-05T00:00:00.000Z",
      keyHash: hashApiV1Key(ROTATED_KEY),
      keyId: "gse_v1_shadow_rotated",
      rotateAfter: "2026-10-01T00:00:00.000Z",
    });

    expect(original.status).toBe("shadow_active");
    expect(revoked).toMatchObject({ active: false, notes: "Terms breach.", status: "shadow_revoked" });
    expect(rotated.keyHash).toBe(hashApiV1Key(ROTATED_KEY));
    expect(rotated.usedThisMonth).toBe(0);
  });

  it("scopeSet removes duplicates and unknown values", () => {
    expect(scopeSet(["evidence:read", "evidence:read", "signals:read", "not-a-scope"])).toEqual([
      "evidence:read",
      "signals:read",
    ]);
  });
});

describe("API v1 shadow audit ledger", () => {
  it("appends request decisions into a valid hash chain", () => {
    let ledger: readonly ApiV1AuditEvent[] = [];
    ledger = appendApiV1AuditEvent(ledger, {
      eventId: "evt_1",
      occurredAt: NOW,
      payload: {
        consumerId: "consumer_1",
        decision: "record",
        endpointId: null,
        keyId: "gse_v1_shadow_consumer_1",
        quotaRemaining: 90,
        reasonCodes: [],
        sourceIds: [],
      },
      type: "quota_checked",
    });
    ledger = appendApiV1AuditEvent(ledger, {
      eventId: "evt_2",
      occurredAt: NOW,
      payload: {
        consumerId: "consumer_1",
        decision: "allow",
        endpointId: "evidence.record.read",
        keyId: "gse_v1_shadow_consumer_1",
        quotaRemaining: 89,
        reasonCodes: [],
        sourceIds: ["nflverse"],
      },
      type: "request_allowed",
    });

    const verified = verifyApiV1AuditLedger(ledger);
    expect(verified.valid).toBe(true);
    expect(verified.totalEvents).toBe(2);
    expect(verified.allowCount).toBe(1);
    expect(verified.recordCount).toBe(1);
    expect(ledger[1]?.previousHash).toBe(ledger[0]?.hash);
  });

  it("detects payload tampering, broken links, duplicate ids, and sequence errors", () => {
    const first = createApiV1AuditEvent({
      eventId: "evt_dup",
      occurredAt: NOW,
      payload: {
        consumerId: "consumer_1",
        decision: "deny",
        endpointId: "evidence.record.read",
        keyId: "gse_v1_shadow_consumer_1",
        quotaRemaining: 0,
        reasonCodes: ["quota-exhausted"],
        sourceIds: ["nflverse"],
      },
      previousHash: null,
      sequence: 1,
      type: "request_denied",
    });
    const tampered: ApiV1AuditEvent = {
      ...first,
      payload: { ...first.payload, reasonCodes: ["changed"] },
      sequence: 1,
    };

    const verified = verifyApiV1AuditLedger([first, tampered]);
    expect(verified.valid).toBe(false);
    expect(verified.errors.join(" ")).toMatch(/duplicated/);
    expect(verified.errors.join(" ")).toMatch(/sequence/);
    expect(verified.errors.join(" ")).toMatch(/previousHash/);
    expect(verified.errors.join(" ")).toMatch(/payloadHash mismatch/);
    expect(verified.errors.join(" ")).toMatch(/hash mismatch/);
  });
});
