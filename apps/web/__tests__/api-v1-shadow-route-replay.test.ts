import { describe, expect, it } from "vitest";

import {
  createApiV1MemoryPersistenceStore,
  createApiV1MemoryShadowRouteReplayStore,
  handleApiV1ShadowRouteReplayRequest,
  hashApiV1Key,
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const RAW_KEY = "gse_v1_shadow_ZYXWVUTSRQPONMLK";
const NOW = "2026-07-05T22:00:00.000Z";

function consumer(overrides: Partial<ApiV1ShadowConsumerRecord> = {}): ApiV1ShadowConsumerRecord {
  return {
    active: true,
    allowedOrigins: ["partner.gse.test"],
    consumerId: "consumer_shadow_replay_1",
    displayName: "Shadow Replay Consumer",
    expiresAt: "2026-12-31T00:00:00.000Z",
    issuedAt: "2026-07-01T00:00:00.000Z",
    keyHash: hashApiV1Key(RAW_KEY),
    keyId: "gse_v1_shadow_replay_1",
    monthlyQuota: 4,
    notes: "Local replay fixture only.",
    ownerApprovedForLiveUse: false,
    rotateAfter: null,
    scopes: ["evidence:read"],
    status: "shadow_active",
    usedThisMonth: 1,
    ...overrides,
  };
}

function authHeaders(idempotencyKey: string) {
  return {
    authorization: `Bearer ${RAW_KEY}`,
    origin: "https://partner.gse.test/dashboard",
    xIdempotencyKey: idempotencyKey,
  };
}

describe("API v1 shadow route replay simulation", () => {
  it("replays a successful idempotent request without double-counting usage", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const replayStore = createApiV1MemoryShadowRouteReplayStore();
    const first = handleApiV1ShadowRouteReplayRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: { ...authHeaders("idem-replay-1"), xGseRequestId: "req-replay-first" },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      replayStore,
      responseData: { evidenceId: "ev_1", summary: "Replay-safe evidence." },
      store,
    });
    const second = handleApiV1ShadowRouteReplayRequest({
      endpointId: "evidence.record.read",
      generatedAt: "2026-07-05T22:01:00.000Z",
      headers: { ...authHeaders("idem-replay-1"), xGseRequestId: "req-replay-second" },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      replayStore,
      responseData: { evidenceId: "ev_changed", summary: "This must not replace the stored envelope." },
      store,
    });

    expect(first.ok).toBe(true);
    expect(first.replay).toMatchObject({ quotaDebitedByThisCall: true, replayed: false, storedSuccessCount: 1 });
    expect(second.ok).toBe(true);
    expect(second.replay).toMatchObject({ quotaDebitedByThisCall: false, replayed: true, storedSuccessCount: 1 });
    expect(second.envelope).toEqual(first.envelope);
    expect(second.envelope.meta.requestId).toBe("req-replay-first");
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(2);
    expect(store.readAuditLedger()).toHaveLength(1);
  });

  it("does not store denied requests as reusable success records", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const replayStore = createApiV1MemoryShadowRouteReplayStore();
    const denied = handleApiV1ShadowRouteReplayRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: { ...authHeaders("idem-denied-1"), xGseRequestId: "req-denied" },
      payload: {
        includesRawVendorPayload: true,
        intendedUse: "commercial_display",
        sourceIds: ["espn-public-api"],
      },
      replayStore,
      responseData: { protectedSourceValue: "must-not-appear" },
      store,
    });

    expect(denied.ok).toBe(false);
    expect(denied.replay).toMatchObject({ quotaDebitedByThisCall: false, replayed: false, storedSuccessCount: 0 });
    expect(replayStore.list()).toHaveLength(0);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
    expect(JSON.stringify(denied.envelope)).not.toContain("must-not-appear");
  });

  it("treats same external idempotency key with different payload as a new request", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const replayStore = createApiV1MemoryShadowRouteReplayStore();
    const first = handleApiV1ShadowRouteReplayRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: { ...authHeaders("idem-payload-1"), xGseRequestId: "req-payload-first" },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      replayStore,
      responseData: { evidenceId: "ev_1" },
      store,
    });
    const second = handleApiV1ShadowRouteReplayRequest({
      endpointId: "evidence.record.read",
      generatedAt: "2026-07-05T22:02:00.000Z",
      headers: { ...authHeaders("idem-payload-1"), xGseRequestId: "req-payload-second" },
      payload: { includesPersonalData: false, intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      replayStore,
      responseData: { evidenceId: "ev_2" },
      store,
    });

    expect(first.replay.replayed).toBe(false);
    expect(second.replay.replayed).toBe(false);
    expect(first.replay.replayKey).not.toBe(second.replay.replayKey);
    expect(replayStore.list()).toHaveLength(2);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(3);
    expect(store.readAuditLedger()).toHaveLength(2);
  });

  it("does not create replay records for malformed idempotency keys", () => {
    const store = createApiV1MemoryPersistenceStore({ consumers: [consumer()] });
    const replayStore = createApiV1MemoryShadowRouteReplayStore();
    const result = handleApiV1ShadowRouteReplayRequest({
      endpointId: "evidence.record.read",
      generatedAt: NOW,
      headers: { ...authHeaders("bad idem"), xGseRequestId: "req-bad-idem" },
      payload: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      replayStore,
      store,
    });

    expect(result.ok).toBe(false);
    expect(result.replay).toMatchObject({ replayKey: null, replayed: false, storedSuccessCount: 0 });
    expect(replayStore.list()).toHaveLength(0);
    expect(store.listConsumers()[0]?.usedThisMonth).toBe(1);
  });
});
