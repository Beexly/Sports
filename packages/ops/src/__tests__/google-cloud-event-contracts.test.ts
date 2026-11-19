import { describe, expect, it } from "vitest";
import {
  EVENT_CONTRACT_REGISTRY,
  EVENT_NAMES,
  GCP_FREE_TIER_PUBSUB_TOPICS,
  buildEventIdempotencyKey,
  createEventEnvelope,
  createStatelessEventHandler,
  validateEventEnvelope,
  type GseEventName,
} from "../index.js";

describe("Google Cloud Pub/Sub and QStash versioned event contracts", () => {
  it("exports all 5 required versioned event contracts with schemaVersion and deadLetterPolicy", () => {
    const expected: readonly GseEventName[] = [
      "odds.updated.v1",
      "injury.designated.v1",
      "slate.sealed.v1",
      "game.settled.v1",
      "clv.captured.v1",
    ];
    expect([...EVENT_NAMES].sort()).toEqual([...expected].sort());

    for (const name of expected) {
      const contract = EVENT_CONTRACT_REGISTRY[name];
      expect(contract.eventName).toBe(name);
      expect(contract.schemaVersion).toBe("1.0");
      expect(contract.deadLetterPolicy.maxDeliveryAttempts).toBeGreaterThanOrEqual(3);
      expect(contract.deadLetterPolicy.deadLetterTopic).toContain("dlq");
      expect(contract.deadLetterPolicy.minBackoffSeconds).toBeGreaterThan(0);
      expect(contract.deadLetterPolicy.maxBackoffSeconds).toBeGreaterThanOrEqual(
        contract.deadLetterPolicy.minBackoffSeconds
      );
      expect(contract.deadLetterPolicy.ackDeadlineSeconds).toBeGreaterThanOrEqual(30);
      expect(contract.transports).toContain("gcp-pubsub");
      expect(contract.transports).toContain("upstash-qstash");
    }
  });

  it("computes deterministic idempotency keys across identical inputs and separates distinct scopes", () => {
    const k1 = buildEventIdempotencyKey("odds.updated.v1", "nfl:2026:w11:IND@HOU", {
      bookmaker: "draftkings",
      spreadHome: -12.5,
      capturedAtIso: "2026-11-19T00:00:00Z",
    });
    const k2 = buildEventIdempotencyKey("odds.updated.v1", "nfl:2026:w11:IND@HOU", {
      capturedAtIso: "2026-11-19T00:00:00Z",
      spreadHome: -12.5,
      bookmaker: "draftkings",
    });
    const k3 = buildEventIdempotencyKey("odds.updated.v1", "nfl:2026:w11:MIA@BUF", {
      bookmaker: "draftkings",
      spreadHome: -12.5,
      capturedAtIso: "2026-11-19T00:00:00Z",
    });
    const k4 = buildEventIdempotencyKey("clv.captured.v1", "nfl:2026:w11:IND@HOU", {
      bookmaker: "draftkings",
      spreadHome: -12.5,
      capturedAtIso: "2026-11-19T00:00:00Z",
    });

    expect(k1).toBe(k2);
    expect(k1).toMatch(/^odds\.updated\.v1:[0-9a-f]{64}$/);
    expect(k1).not.toBe(k3);
    expect(k1).not.toBe(k4);
  });

  it("validates event envelopes and executes stateless handler deduplication and dead-letter routing", async () => {
    const envelope = createEventEnvelope({
      eventName: "slate.sealed.v1",
      scopeKey: "nfl:2026:w11",
      transport: "gcp-pubsub",
      occurredAtIso: "2026-11-19T04:00:00Z",
      payload: {
        season: 2026,
        week: 11,
        gamesSealed: 13,
        projectionSha256:
          "a2aca13a763e7fce3ab38d5ef5f996b7e41b3e0034ffebfd4f587faa2632c30b",
      },
    });

    const validation = validateEventEnvelope(envelope);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    const seen = new Set<string>();
    const processed: string[] = [];
    const handler = createStatelessEventHandler("slate.sealed.v1", {
      seenStore: {
        has: (key) => seen.has(key),
        add: (key) => {
          seen.add(key);
        },
      },
      onEvent: async (env) => {
        processed.push(env.idempotencyKey);
      },
    });

    const first = await handler(envelope, 1);
    expect(first.status).toBe("acked");
    expect(processed).toHaveLength(1);

    const dup = await handler(envelope, 2);
    expect(dup.status).toBe("duplicate_ignored");
    expect(processed).toHaveLength(1);

    const badHandler = createStatelessEventHandler("game.settled.v1", {
      seenStore: {
        has: () => false,
        add: () => undefined,
      },
      onEvent: async () => {
        throw new Error("Transient DB error");
      },
    });
    const settledEnvelope = createEventEnvelope({
      eventName: "game.settled.v1",
      scopeKey: "nfl:2026:w10:KC@DEN",
      transport: "upstash-qstash",
      occurredAtIso: "2026-11-18T05:00:00Z",
      payload: {
        gameId: "401873055",
        finalAwayScore: 24,
        finalHomeScore: 21,
        settledPicksCount: 6,
      },
    });

    const retryResult = await badHandler(settledEnvelope, 1);
    expect(retryResult.status).toBe("retry");
    expect(retryResult.deadLettered).toBe(false);

    const maxAttempts = EVENT_CONTRACT_REGISTRY["game.settled.v1"].deadLetterPolicy.maxDeliveryAttempts;
    const dlqResult = await badHandler(settledEnvelope, maxAttempts);
    expect(dlqResult.status).toBe("dead_lettered");
    expect(dlqResult.deadLettered).toBe(true);
    expect(dlqResult.deadLetterTopic).toBe(
      EVENT_CONTRACT_REGISTRY["game.settled.v1"].deadLetterPolicy.deadLetterTopic
    );
  });

  it("rejects mismatched schemaVersion or missing required payload fields fail-closed", () => {
    const broken = {
      eventName: "injury.designated.v1",
      schemaVersion: "2.0",
      transport: "gcp-pubsub",
      idempotencyKey: "injury.designated.v1:bad",
      scopeKey: "nfl:2026:w11:IND@HOU",
      occurredAtIso: "2026-11-19T01:00:00Z",
      payload: { playerId: "00-0039163" },
    };
    const res = validateEventEnvelope(broken);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("exposes GCP Path 36 always-free Pub/Sub topic names and ceilings", () => {
    expect(GCP_FREE_TIER_PUBSUB_TOPICS.oddsTicks).toBe("gse-odds-ticks");
    expect(GCP_FREE_TIER_PUBSUB_TOPICS.injuryWire).toBe("gse-injury-wire");
    expect(GCP_FREE_TIER_PUBSUB_TOPICS.intakeDlq).toBe("gse-intake-dlq");
    expect(GCP_FREE_TIER_PUBSUB_TOPICS.monthlyFreeGib).toBe(10);
    expect(GCP_FREE_TIER_PUBSUB_TOPICS.cloudRunMonthlyFreeRequests).toBe(2_000_000);
  });
});
