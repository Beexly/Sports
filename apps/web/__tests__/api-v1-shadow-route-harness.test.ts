import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createApiV1MemoryPersistenceStore,
  handleApiV1ShadowRouteRequest,
  hashApiV1Key,
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const RAW_KEY = "gse_v1_shadow_ABCDEFGHIJKLMNOP";
const NOW = "2026-07-05T12:00:00.000Z";

function consumer(overrides: Partial<ApiV1ShadowConsumerRecord> = {}): ApiV1ShadowConsumerRecord {
  return {
    active: true,
    allowedOrigins: ["partner.gse.test"],
    consumerId: "consumer_shadow_route_1",
    displayName: "Shadow Route Consumer",
    expiresAt: "2026-12-31T00:00:00.000Z",
    issuedAt: "2026-07-01T00:00:00.000Z",
    keyHash: hashApiV1Key(RAW_KEY),
    keyId: "gse_v1_shadow_route_1",
    monthlyQuota: 3,
    notes: "Local route harness fixture only.",
    ownerApprovedForLiveUse: false,
    rotateAfter: null,
    scopes: ["evidence:read"],
    status: "shadow_active",
    usedThisMonth: 1,
    ...overrides,
  };
}

function authHeaders(overrides: Record<string, string | null> = {}) {
  return {
    authorization: `Bearer ${RAW_KEY}`,
    origin: "https://partner.gse.test/dashboard",
    ...overrides,
  };
}

describe("API v1 shadow route harness", () => {
  it("simulates the full happy-path route lifecycle without exposing a route tree", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const result = handleApiV1ShadowRouteRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: authHeaders({ xGseRequestId: "req-shadow-route-1", xIdempotencyKey: "idem-shadow-1" }),
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      responseData: { evidenceId: "ev_1", summary: "Public-safe evidence summary." },
      store,
    });

    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.routeExposed).toBe(false);
    expect(result.requestId).toBe("req-shadow-route-1");
    expect(result.idempotencyKey).toBe("idem-shadow-1");
    expect(result.rateLimit).toMatchObject({
      allowed: true,
      policy: "monthly_shadow_quota",
      quotaDebited: true,
      quotaRemainingAfter: 1,
      quotaRemainingBefore: 2,
    });
    expect(result.usageEvent).toMatchObject({
      decision: "allow",
      quotaDebited: true,
      quotaRemaining: 1,
      type: "request_allowed",
    });
    expect(result.auditEvent.payload).toMatchObject({
      consumerId: "consumer_shadow_route_1",
      decision: "allow",
      endpointId: "evidence.record.read",
      keyId: "gse_v1_shadow_route_1",
      quotaRemaining: 1,
    });
    expect(result.snapshot.auditReport.valid).toBe(true);
    expect(result.snapshot.consumers[0]?.usedThisMonth).toBe(2);
    expect(result.envelope.meta.requestId).toBe("req-shadow-route-1");
    expect(result.envelope.meta.shadow).toBe(true);
    expect(result.envelope.ok).toBe(true);
    if (!result.envelope.ok) throw new Error("Expected a shadow route success envelope.");
    expect(result.envelope.data.routeExposed).toBe(false);
    expect(result.envelope.data.responseData).toEqual({
      evidenceId: "ev_1",
      summary: "Public-safe evidence summary.",
    });
    expect(existsSync(join(process.cwd(), "app/api/v1"))).toBe(false);
  });

  it("fails closed on missing auth while still recording a denied usage event", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const result = handleApiV1ShadowRouteRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: { xGseRequestId: "req-no-auth" },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      store,
    });

    expect(result.status).toBe(401);
    expect(result.ok).toBe(false);
    expect(result.envelope.ok).toBe(false);
    expect(result.envelope.errors.map((entry) => entry.code)).toContain("missing_api_key");
    expect(result.usageEvent).toMatchObject({
      decision: "deny",
      quotaDebited: false,
      quotaRemaining: null,
      type: "request_denied",
    });
    expect(result.auditEvent.payload).toMatchObject({
      consumerId: null,
      decision: "deny",
      keyId: null,
      quotaRemaining: null,
    });
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
  });

  it("denies overscoped consumers without debiting quota", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer({ scopes: ["metrics:read"] })] });
    const result = handleApiV1ShadowRouteRequest({
      endpointId: "signals.summary.read",
      generatedAt: NOW,
      headers: authHeaders({ xGseRequestId: "req-scope-deny" }),
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      store,
    });

    expect(result.status).toBe(403);
    expect(result.rateLimit.quotaDebited).toBe(false);
    expect(result.envelope.ok).toBe(false);
    expect(result.envelope.errors.map((entry) => entry.code)).toContain("insufficient_scope");
    expect(result.auditEvent.payload.reasonCodes).toEqual(["insufficient_scope"]);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
  });

  it("blocks unsafe payload rights and does not leak response payload data on denial", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const result = handleApiV1ShadowRouteRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: authHeaders({ xGseRequestId: "req-payload-deny" }),
      payload: {
        includesRawVendorPayload: true,
        intendedUse: "commercial_display",
        sourceIds: ["espn-public-api"],
      },
      responseData: { protectedSourceValue: "must-not-appear" },
      store,
    });

    expect(result.status).toBe(403);
    expect(result.abuse.deniedResponsesLeakPayload).toBe(false);
    expect(result.envelope.ok).toBe(false);
    expect(result.envelope.data).toBeNull();
    expect(JSON.stringify(result.envelope)).not.toContain("must-not-appear");
    expect(result.envelope.errors.map((entry) => entry.code)).toContain("payload_rights_blocked");
    expect(result.auditEvent.payload.reasonCodes).toEqual(["payload_rights_blocked"]);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
  });

  it("treats quota exhaustion as the route-level rate-limit denial", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer({ usedThisMonth: 3 })] });
    const result = handleApiV1ShadowRouteRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: authHeaders({ xGseRequestId: "req-rate-limit" }),
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      store,
    });

    expect(result.status).toBe(429);
    expect(result.rateLimit).toMatchObject({
      allowed: false,
      policy: "monthly_shadow_quota",
      quotaDebited: false,
      quotaRemainingAfter: 0,
      quotaRemainingBefore: 0,
    });
    expect(result.envelope.errors.map((entry) => entry.code)).toContain("quota-exhausted");
    expect(result.auditEvent.payload.reasonCodes).toEqual(["quota-exhausted"]);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(3);
  });

  it("returns abuse responses for malformed route controls without leaking payloads or debiting quota", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const result = handleApiV1ShadowRouteRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: authHeaders({ xGseRequestId: "bad id", xIdempotencyKey: "bad idem" }),
      method: "POST",
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      responseData: { protectedSourceValue: "must-not-appear" },
      store,
    });

    expect(result.status).toBe(405);
    expect(result.abuse).toMatchObject({
      blocked: true,
      deniedResponsesLeakPayload: false,
      reasonCodes: ["malformed_request_id", "malformed_idempotency_key", "method_not_allowed"],
    });
    expect(result.envelope.ok).toBe(false);
    expect(result.envelope.data).toBeNull();
    expect(JSON.stringify(result.envelope)).not.toContain("must-not-appear");
    expect(result.auditEvent.payload.reasonCodes).toEqual([
      "malformed_request_id",
      "malformed_idempotency_key",
      "method_not_allowed",
    ]);
    expect(result.rateLimit.quotaDebited).toBe(false);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
  });
});
