import { createHash } from "node:crypto";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

export type ReplayableProvenanceStatus = "FLAGGED_OFF" | "SHADOW_READY";

export type ReplayableProvenanceEventType =
  | "PREGAME_COMMIT"
  | "SETTLED_PICK"
  | "CALIBRATION_REPLAY";

export type ReplayableSettledResult = "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";

export interface ReplayableSettledPickPayload {
  readonly kind: "settled-pick";
  readonly pickId: string;
  readonly confidence: number;
  readonly result: ReplayableSettledResult;
  readonly sport?: string | null;
  readonly pickType?: string | null;
  readonly riskLevel?: string | null;
  readonly dataQualityScore?: number | null;
  readonly factorKeys?: readonly string[];
}

export interface ReplayablePreGameCommitPayload {
  readonly kind: "pre-game-commit";
  readonly pickId: string;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly payloadHash: string;
}

export interface ReplayableCalibrationReplayPayload {
  readonly kind: "calibration-replay";
  readonly replayId: string;
  readonly sourceTipHash: string;
  readonly sampleSize: number;
}

export type ReplayableProvenancePayload =
  | ReplayableSettledPickPayload
  | ReplayablePreGameCommitPayload
  | ReplayableCalibrationReplayPayload;

export interface ReplayableHashChainEvent {
  readonly sequence: number;
  readonly id: string;
  readonly type: ReplayableProvenanceEventType;
  readonly occurredAt: string;
  readonly previousHash: string | null;
  readonly payloadHash: string;
  readonly payload: ReplayableProvenancePayload;
  readonly hash: string;
}

export interface CreateReplayableEventInput {
  readonly sequence: number;
  readonly id: string;
  readonly type: ReplayableProvenanceEventType;
  readonly occurredAt: string;
  readonly previousHash: string | null;
  readonly payload: ReplayableProvenancePayload;
}

export interface ReplayableChainVerification {
  readonly valid: boolean;
  readonly totalEvents: number;
  readonly tipHash: string | null;
  readonly appliedSettledPicks: number;
  readonly errors: readonly string[];
}

export interface ReplayableProvenanceOptions {
  readonly enabled?: boolean;
  readonly flagKey?: string;
  readonly maxPublicRows?: number;
}

export interface ReplayableProvenanceRow {
  readonly eventId: string;
  readonly sequence: number;
  readonly pickId: string;
  readonly confidence: number;
  readonly result: ReplayableSettledResult;
  readonly payloadHash: string;
  readonly eventHash: string;
}

export interface ReplayableProvenanceFeed {
  readonly status: ReplayableProvenanceStatus;
  readonly flagKey: string;
  readonly enabled: boolean;
  readonly draftOnly: true;
  readonly priced: false;
  readonly generatedAt: string;
  readonly chain: ReplayableChainVerification;
  readonly calibration: ReturnType<typeof computeCalibration>;
  readonly rows: readonly ReplayableProvenanceRow[];
  readonly note: string;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const DEFAULT_FLAG_KEY = "REPLAYABLE_PROVENANCE_ENDPOINT";
const DEFAULT_MAX_PUBLIC_ROWS = 50;

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function isJsonObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  if (isJsonObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function optionalString(value: string | null | undefined): JsonValue | undefined {
  return value === undefined ? undefined : value;
}

function optionalNumber(value: number | null | undefined): JsonValue | undefined {
  return value === undefined ? undefined : value;
}

function withOptional(base: Record<string, JsonValue>, key: string, value: JsonValue | undefined): void {
  if (value !== undefined) base[key] = value;
}

function payloadToJson(payload: ReplayableProvenancePayload): JsonValue {
  if (payload.kind === "settled-pick") {
    const value: Record<string, JsonValue> = {
      confidence: payload.confidence,
      kind: payload.kind,
      pickId: payload.pickId,
      result: payload.result,
    };
    withOptional(value, "sport", optionalString(payload.sport));
    withOptional(value, "pickType", optionalString(payload.pickType));
    withOptional(value, "riskLevel", optionalString(payload.riskLevel));
    withOptional(value, "dataQualityScore", optionalNumber(payload.dataQualityScore));
    if (payload.factorKeys !== undefined) value.factorKeys = [...payload.factorKeys].sort();
    return value;
  }

  if (payload.kind === "pre-game-commit") {
    return {
      generatedAt: payload.generatedAt,
      kind: payload.kind,
      modelVersion: payload.modelVersion,
      payloadHash: payload.payloadHash,
      pickId: payload.pickId,
    };
  }

  return {
    kind: payload.kind,
    replayId: payload.replayId,
    sampleSize: payload.sampleSize,
    sourceTipHash: payload.sourceTipHash,
  };
}

function eventBodyToJson(input: CreateReplayableEventInput, payloadHash: string): JsonValue {
  return {
    id: input.id,
    occurredAt: input.occurredAt,
    payloadHash,
    previousHash: input.previousHash,
    sequence: input.sequence,
    type: input.type,
  };
}

export function replayablePayloadHash(payload: ReplayableProvenancePayload): string {
  return sha256(canonicalJson(payloadToJson(payload)));
}

export function replayableEventHash(input: CreateReplayableEventInput): string {
  const payloadHash = replayablePayloadHash(input.payload);
  return sha256(canonicalJson(eventBodyToJson(input, payloadHash)));
}

export function createReplayableProvenanceEvent(
  input: CreateReplayableEventInput
): ReplayableHashChainEvent {
  const payloadHash = replayablePayloadHash(input.payload);
  return {
    ...input,
    payloadHash,
    hash: sha256(canonicalJson(eventBodyToJson(input, payloadHash))),
  };
}

export function verifyReplayableHashChain(
  events: readonly ReplayableHashChainEvent[]
): ReplayableChainVerification {
  const errors: string[] = [];
  let previousHash: string | null = null;
  let lastSequence = 0;
  let appliedSettledPicks = 0;

  for (const event of events) {
    if (event.sequence <= lastSequence) {
      errors.push(`event ${event.id} sequence is not strictly increasing`);
    }

    if (event.previousHash !== previousHash) {
      errors.push(`event ${event.id} previousHash does not match chain tip`);
    }

    const expectedPayloadHash = replayablePayloadHash(event.payload);
    if (event.payloadHash !== expectedPayloadHash) {
      errors.push(`event ${event.id} payloadHash mismatch`);
    }

    const expectedHash = replayableEventHash({
      id: event.id,
      occurredAt: event.occurredAt,
      payload: event.payload,
      previousHash: event.previousHash,
      sequence: event.sequence,
      type: event.type,
    });
    if (event.hash !== expectedHash) {
      errors.push(`event ${event.id} event hash mismatch`);
    }

    if (event.payload.kind === "settled-pick" && event.payload.result !== "PENDING") {
      appliedSettledPicks += 1;
    }

    previousHash = event.hash;
    lastSequence = event.sequence;
  }

  return {
    valid: errors.length === 0,
    totalEvents: events.length,
    tipHash: events.length === 0 ? null : events[events.length - 1]!.hash,
    appliedSettledPicks,
    errors,
  };
}

function toCalibrationInput(event: ReplayableHashChainEvent): CalibrationPickInput | null {
  if (event.payload.kind !== "settled-pick") return null;
  if (event.payload.result === "PENDING") return null;

  return {
    id: event.payload.pickId,
    confidence: event.payload.confidence,
    dataQualityScore: event.payload.dataQualityScore,
    factorKeys: event.payload.factorKeys,
    pickType: event.payload.pickType,
    result: event.payload.result,
    riskLevel: event.payload.riskLevel,
    sport: event.payload.sport,
  };
}

function toPublicRow(event: ReplayableHashChainEvent): ReplayableProvenanceRow | null {
  if (event.payload.kind !== "settled-pick") return null;

  return {
    confidence: event.payload.confidence,
    eventHash: event.hash,
    eventId: event.id,
    payloadHash: event.payloadHash,
    pickId: event.payload.pickId,
    result: event.payload.result,
    sequence: event.sequence,
  };
}

export function buildReplayableProvenanceFeed(
  events: readonly ReplayableHashChainEvent[],
  now = new Date(),
  options: ReplayableProvenanceOptions = {}
): ReplayableProvenanceFeed {
  const chain = verifyReplayableHashChain(events);
  const enabled = options.enabled === true;
  const maxPublicRows = options.maxPublicRows ?? DEFAULT_MAX_PUBLIC_ROWS;
  const calibrationRows = chain.valid
    ? events.flatMap((event) => {
        const row = toCalibrationInput(event);
        return row === null ? [] : [row];
      })
    : [];

  const rows = chain.valid
    ? events
        .flatMap((event) => {
          const row = toPublicRow(event);
          return row === null ? [] : [row];
        })
        .slice(-maxPublicRows)
    : [];

  return {
    calibration: computeCalibration(calibrationRows),
    chain,
    draftOnly: true,
    enabled,
    flagKey: options.flagKey ?? DEFAULT_FLAG_KEY,
    generatedAt: now.toISOString(),
    note: enabled
      ? "Replayable provenance is shadow-ready; public activation still requires owner and data approval."
      : "Replayable provenance endpoint is present but flagged off; no public calibration claim is activated.",
    priced: false,
    rows,
    status: enabled ? "SHADOW_READY" : "FLAGGED_OFF",
  };
}
