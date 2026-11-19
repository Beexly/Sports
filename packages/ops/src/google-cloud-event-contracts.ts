import { createHash } from "node:crypto";

/**
 * Versioned Pub/Sub and QStash event contracts for GSE worker/cloud offload.
 * Pure, stateless, deterministic idempotency keys and fail-closed validation.
 */

export const EVENT_SCHEMA_VERSION = "1.0" as const;

export type EventTransport = "gcp-pubsub" | "upstash-qstash";

export type GseEventName =
  | "odds.updated.v1"
  | "injury.designated.v1"
  | "slate.sealed.v1"
  | "game.settled.v1"
  | "clv.captured.v1";

export const EVENT_NAMES: readonly GseEventName[] = [
  "odds.updated.v1",
  "injury.designated.v1",
  "slate.sealed.v1",
  "game.settled.v1",
  "clv.captured.v1",
] as const;

export const GCP_FREE_TIER_PUBSUB_TOPICS = {
  oddsTicks: "gse-odds-ticks",
  injuryWire: "gse-injury-wire",
  intakeDlq: "gse-intake-dlq",
  monthlyFreeGib: 10,
  cloudRunMonthlyFreeRequests: 2_000_000,
} as const;

export interface DeadLetterPolicy {
  readonly maxDeliveryAttempts: number;
  readonly deadLetterTopic: string;
  readonly minBackoffSeconds: number;
  readonly maxBackoffSeconds: number;
  readonly ackDeadlineSeconds: number;
}

export interface EventContractSpec {
  readonly eventName: GseEventName;
  readonly schemaVersion: typeof EVENT_SCHEMA_VERSION;
  readonly transports: readonly EventTransport[];
  readonly pubsubTopic: string;
  readonly qstashTopic: string;
  readonly requiredPayloadFields: readonly string[];
  readonly deadLetterPolicy: DeadLetterPolicy;
}

export interface OddsUpdatedV1Payload {
  readonly sport: string;
  readonly gameId: string;
  readonly bookmaker: string;
  readonly market: string;
  readonly capturedAtIso: string;
  readonly spreadHome?: number;
  readonly totalLine?: number;
}

export interface InjuryDesignatedV1Payload {
  readonly sport: string;
  readonly gameId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly designation: "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "PROBABLE" | "ACTIVE";
  readonly practiceStatus: "DNP" | "LP" | "FP" | "UNKNOWN";
  readonly reportedAtIso: string;
}

export interface SlateSealedV1Payload {
  readonly season: number;
  readonly week: number;
  readonly gamesSealed: number;
  readonly projectionSha256: string;
}

export interface GameSettledV1Payload {
  readonly gameId: string;
  readonly finalAwayScore: number;
  readonly finalHomeScore: number;
  readonly settledPicksCount: number;
}

export interface ClvCapturedV1Payload {
  readonly pickId: string;
  readonly gameId: string;
  readonly entryPrice: number;
  readonly closingPrice: number;
  readonly clvCents: number;
  readonly capturedAtIso: string;
}

export interface GseEventPayloadMap {
  "odds.updated.v1": OddsUpdatedV1Payload;
  "injury.designated.v1": InjuryDesignatedV1Payload;
  "slate.sealed.v1": SlateSealedV1Payload;
  "game.settled.v1": GameSettledV1Payload;
  "clv.captured.v1": ClvCapturedV1Payload;
}

export const EVENT_CONTRACT_REGISTRY: Readonly<Record<GseEventName, EventContractSpec>> = {
  "odds.updated.v1": {
    eventName: "odds.updated.v1",
    schemaVersion: EVENT_SCHEMA_VERSION,
    transports: ["gcp-pubsub", "upstash-qstash"],
    pubsubTopic: "projects/gse-prod/topics/gse.odds.updated.v1",
    qstashTopic: "gse.odds.updated.v1",
    requiredPayloadFields: ["sport", "gameId", "bookmaker", "market", "capturedAtIso"],
    deadLetterPolicy: {
      maxDeliveryAttempts: 5,
      deadLetterTopic: "projects/gse-prod/topics/gse.odds.updated.v1.dlq",
      minBackoffSeconds: 10,
      maxBackoffSeconds: 300,
      ackDeadlineSeconds: 60,
    },
  },
  "injury.designated.v1": {
    eventName: "injury.designated.v1",
    schemaVersion: EVENT_SCHEMA_VERSION,
    transports: ["gcp-pubsub", "upstash-qstash"],
    pubsubTopic: "projects/gse-prod/topics/gse.injury.designated.v1",
    qstashTopic: "gse.injury.designated.v1",
    requiredPayloadFields: [
      "sport",
      "gameId",
      "playerId",
      "playerName",
      "designation",
      "practiceStatus",
      "reportedAtIso",
    ],
    deadLetterPolicy: {
      maxDeliveryAttempts: 5,
      deadLetterTopic: "projects/gse-prod/topics/gse.injury.designated.v1.dlq",
      minBackoffSeconds: 15,
      maxBackoffSeconds: 600,
      ackDeadlineSeconds: 60,
    },
  },
  "slate.sealed.v1": {
    eventName: "slate.sealed.v1",
    schemaVersion: EVENT_SCHEMA_VERSION,
    transports: ["gcp-pubsub", "upstash-qstash"],
    pubsubTopic: "projects/gse-prod/topics/gse.slate.sealed.v1",
    qstashTopic: "gse.slate.sealed.v1",
    requiredPayloadFields: ["season", "week", "gamesSealed", "projectionSha256"],
    deadLetterPolicy: {
      maxDeliveryAttempts: 6,
      deadLetterTopic: "projects/gse-prod/topics/gse.slate.sealed.v1.dlq",
      minBackoffSeconds: 20,
      maxBackoffSeconds: 600,
      ackDeadlineSeconds: 120,
    },
  },
  "game.settled.v1": {
    eventName: "game.settled.v1",
    schemaVersion: EVENT_SCHEMA_VERSION,
    transports: ["gcp-pubsub", "upstash-qstash"],
    pubsubTopic: "projects/gse-prod/topics/gse.game.settled.v1",
    qstashTopic: "gse.game.settled.v1",
    requiredPayloadFields: [
      "gameId",
      "finalAwayScore",
      "finalHomeScore",
      "settledPicksCount",
    ],
    deadLetterPolicy: {
      maxDeliveryAttempts: 5,
      deadLetterTopic: "projects/gse-prod/topics/gse.game.settled.v1.dlq",
      minBackoffSeconds: 30,
      maxBackoffSeconds: 900,
      ackDeadlineSeconds: 120,
    },
  },
  "clv.captured.v1": {
    eventName: "clv.captured.v1",
    schemaVersion: EVENT_SCHEMA_VERSION,
    transports: ["gcp-pubsub", "upstash-qstash"],
    pubsubTopic: "projects/gse-prod/topics/gse.clv.captured.v1",
    qstashTopic: "gse.clv.captured.v1",
    requiredPayloadFields: [
      "pickId",
      "gameId",
      "entryPrice",
      "closingPrice",
      "clvCents",
      "capturedAtIso",
    ],
    deadLetterPolicy: {
      maxDeliveryAttempts: 5,
      deadLetterTopic: "projects/gse-prod/topics/gse.clv.captured.v1.dlq",
      minBackoffSeconds: 15,
      maxBackoffSeconds: 600,
      ackDeadlineSeconds: 60,
    },
  },
};

export interface EventEnvelope<K extends GseEventName = GseEventName> {
  readonly eventName: K;
  readonly schemaVersion: typeof EVENT_SCHEMA_VERSION;
  readonly transport: EventTransport;
  readonly scopeKey: string;
  readonly occurredAtIso: string;
  readonly idempotencyKey: string;
  readonly payload: GseEventPayloadMap[K];
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      const entry = record[key];
      if (entry !== undefined) {
        out[key] = canonicalizeValue(entry);
      }
    }
    return out;
  }
  return value;
}

export function canonicalJsonString(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

export function buildEventIdempotencyKey(
  eventName: GseEventName,
  scopeKey: string,
  payload: unknown
): string {
  const normalizedScope = scopeKey.trim();
  if (!normalizedScope) {
    throw new Error("buildEventIdempotencyKey: scopeKey must be non-empty");
  }
  const canonical = canonicalJsonString({
    eventName,
    schemaVersion: EVENT_SCHEMA_VERSION,
    scopeKey: normalizedScope,
    payload,
  });
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `${eventName}:${digest}`;
}

export function createEventEnvelope<K extends GseEventName>(args: {
  readonly eventName: K;
  readonly scopeKey: string;
  readonly transport: EventTransport;
  readonly occurredAtIso: string;
  readonly payload: GseEventPayloadMap[K];
}): EventEnvelope<K> {
  const idempotencyKey = buildEventIdempotencyKey(
    args.eventName,
    args.scopeKey,
    args.payload
  );
  return {
    eventName: args.eventName,
    schemaVersion: EVENT_SCHEMA_VERSION,
    transport: args.transport,
    scopeKey: args.scopeKey.trim(),
    occurredAtIso: args.occurredAtIso,
    idempotencyKey,
    payload: args.payload,
  };
}

export interface EnvelopeValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

function isKnownEventName(name: unknown): name is GseEventName {
  return typeof name === "string" && EVENT_NAMES.includes(name as GseEventName);
}

export function validateEventEnvelope(candidate: unknown): EnvelopeValidationResult {
  const errors: string[] = [];
  if (candidate === null || typeof candidate !== "object") {
    return { valid: false, errors: ["envelope must be a non-null object"] };
  }
  const obj = candidate as Record<string, unknown>;
  const rawName = obj["eventName"];
  if (!isKnownEventName(rawName)) {
    errors.push(`unknown eventName: ${String(rawName)}`);
    return { valid: false, errors };
  }

  const contract = EVENT_CONTRACT_REGISTRY[rawName];
  if (obj["schemaVersion"] !== contract.schemaVersion) {
    errors.push(
      `schemaVersion mismatch: expected ${contract.schemaVersion}, got ${String(obj["schemaVersion"])}`
    );
  }
  const transport = obj["transport"];
  if (transport !== "gcp-pubsub" && transport !== "upstash-qstash") {
    errors.push(`unsupported transport: ${String(transport)}`);
  }
  if (typeof obj["scopeKey"] !== "string" || obj["scopeKey"].trim().length === 0) {
    errors.push("scopeKey must be a non-empty string");
  }
  if (typeof obj["occurredAtIso"] !== "string" || obj["occurredAtIso"].trim().length === 0) {
    errors.push("occurredAtIso must be a non-empty ISO string");
  }
  if (
    typeof obj["idempotencyKey"] !== "string" ||
    !obj["idempotencyKey"].startsWith(`${rawName}:`)
  ) {
    errors.push(`idempotencyKey must start with ${rawName}:`);
  }

  const payload = obj["payload"];
  if (payload === null || typeof payload !== "object") {
    errors.push("payload must be a non-null object");
  } else {
    const payloadObj = payload as Record<string, unknown>;
    for (const field of contract.requiredPayloadFields) {
      const value = payloadObj[field];
      if (value === undefined || value === null || value === "") {
        errors.push(`missing required payload field: ${field}`);
      } else if (typeof value === "number" && !Number.isFinite(value)) {
        errors.push(`payload field ${field} must be a finite number`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface IdempotencyStore {
  has(idempotencyKey: string): boolean | Promise<boolean>;
  add(idempotencyKey: string): void | Promise<void>;
}

export interface StatelessDispatchResult {
  readonly status: "acked" | "duplicate_ignored" | "retry" | "dead_lettered";
  readonly deadLettered: boolean;
  readonly idempotencyKey: string | null;
  readonly deadLetterTopic?: string;
  readonly retryAfterSeconds?: number;
  readonly reason?: string;
}

function computeBackoffSeconds(attempt: number, policy: DeadLetterPolicy): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const raw = policy.minBackoffSeconds * 2 ** (safeAttempt - 1);
  return Math.min(policy.maxBackoffSeconds, raw);
}

export function createStatelessEventHandler<K extends GseEventName>(
  expectedEventName: K,
  options: {
    readonly seenStore: IdempotencyStore;
    readonly onEvent: (envelope: EventEnvelope<K>) => Promise<void>;
  }
): (candidate: unknown, deliveryAttempt?: number) => Promise<StatelessDispatchResult> {
  const contract = EVENT_CONTRACT_REGISTRY[expectedEventName];
  const dlqPolicy = contract.deadLetterPolicy;

  return async (
    candidate: unknown,
    deliveryAttempt = 1
  ): Promise<StatelessDispatchResult> => {
    const validation = validateEventEnvelope(candidate);
    if (!validation.valid) {
      return {
        status: "dead_lettered",
        deadLettered: true,
        idempotencyKey: null,
        deadLetterTopic: dlqPolicy.deadLetterTopic,
        reason: `invalid envelope: ${validation.errors.join("; ")}`,
      };
    }

    const envelope = candidate as EventEnvelope<K>;
    if (envelope.eventName !== expectedEventName) {
      return {
        status: "dead_lettered",
        deadLettered: true,
        idempotencyKey: envelope.idempotencyKey,
        deadLetterTopic: dlqPolicy.deadLetterTopic,
        reason: `eventName mismatch: expected ${expectedEventName}, got ${String(envelope.eventName)}`,
      };
    }

    if (await options.seenStore.has(envelope.idempotencyKey)) {
      return {
        status: "duplicate_ignored",
        deadLettered: false,
        idempotencyKey: envelope.idempotencyKey,
      };
    }

    try {
      await options.onEvent(envelope);
      await options.seenStore.add(envelope.idempotencyKey);
      return {
        status: "acked",
        deadLettered: false,
        idempotencyKey: envelope.idempotencyKey,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (deliveryAttempt >= dlqPolicy.maxDeliveryAttempts) {
        return {
          status: "dead_lettered",
          deadLettered: true,
          idempotencyKey: envelope.idempotencyKey,
          deadLetterTopic: dlqPolicy.deadLetterTopic,
          reason,
        };
      }
      return {
        status: "retry",
        deadLettered: false,
        idempotencyKey: envelope.idempotencyKey,
        retryAfterSeconds: computeBackoffSeconds(deliveryAttempt, dlqPolicy),
        reason,
      };
    }
  };
}
