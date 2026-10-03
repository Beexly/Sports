import { idempotencyKeyFor } from "@/lib/api-auth/idempotency";
import { sha256Hex } from "@/lib/api-auth/hash";

import { parseApiV1Credential } from "./api-key";
import { handleApiV1ShadowRouteRequest, type ApiV1ShadowRouteHarnessResult, type ApiV1ShadowRouteRequest } from "./shadow-route-harness";
import { findApiV1Endpoint } from "./scopes";

export type ApiV1ShadowRouteReplayRecord = {
  readonly replayKey: string;
  readonly endpointId: string;
  readonly keyId: string;
  readonly externalIdempotencyKey: string;
  readonly requestPayloadHash: string;
  readonly storedAt: string;
  readonly result: ApiV1ShadowRouteHarnessResult;
};

export type ApiV1ShadowRouteReplayStore = {
  readonly find: (replayKey: string) => ApiV1ShadowRouteReplayRecord | null;
  readonly recordSuccess: (record: ApiV1ShadowRouteReplayRecord) => ApiV1ShadowRouteReplayRecord;
  readonly list: () => readonly ApiV1ShadowRouteReplayRecord[];
};

export type ApiV1ShadowRouteReplayMetadata = {
  readonly replayed: boolean;
  readonly replayKey: string | null;
  readonly quotaDebitedByThisCall: boolean;
  readonly originalUsageEventId: string | null;
  readonly storedSuccessCount: number;
  readonly routeExposed: false;
  readonly durablePersistenceEnabled: false;
};

export type ApiV1ShadowRouteReplayResult = ApiV1ShadowRouteHarnessResult & {
  readonly replay: ApiV1ShadowRouteReplayMetadata;
};

export type ApiV1ShadowRouteReplayRequest = ApiV1ShadowRouteRequest<Record<string, unknown>> & {
  readonly replayStore: ApiV1ShadowRouteReplayStore;
};

type ReplayCandidate = {
  readonly replayKey: string;
  readonly keyId: string;
  readonly externalIdempotencyKey: string;
  readonly requestPayloadHash: string;
};

const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

export function createApiV1MemoryShadowRouteReplayStore(
  records: readonly ApiV1ShadowRouteReplayRecord[] = [],
): ApiV1ShadowRouteReplayStore {
  let replayRecords = [...records];

  function find(replayKey: string): ApiV1ShadowRouteReplayRecord | null {
    return replayRecords.find((record) => record.replayKey === replayKey) ?? null;
  }

  function recordSuccess(record: ApiV1ShadowRouteReplayRecord): ApiV1ShadowRouteReplayRecord {
    const existing = find(record.replayKey);
    if (existing !== null) return existing;
    replayRecords = [...replayRecords, record];
    return record;
  }

  return {
    find,
    list: () => [...replayRecords],
    recordSuccess,
  };
}

export function handleApiV1ShadowRouteReplayRequest(
  input: ApiV1ShadowRouteReplayRequest,
): ApiV1ShadowRouteReplayResult {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const candidate = replayCandidateFor(input);
  const stored = candidate === null ? null : input.replayStore.find(candidate.replayKey);
  if (stored !== null) {
    return {
      ...stored.result,
      replay: {
        durablePersistenceEnabled: false,
        originalUsageEventId: stored.result.usageEvent.eventId,
        quotaDebitedByThisCall: false,
        replayed: true,
        replayKey: stored.replayKey,
        routeExposed: false,
        storedSuccessCount: input.replayStore.list().length,
      },
      snapshot: input.store.snapshot(),
    };
  }

  const result = handleApiV1ShadowRouteRequest(input);
  if (result.ok && candidate !== null) {
    input.replayStore.recordSuccess({
      endpointId: input.endpointId,
      externalIdempotencyKey: candidate.externalIdempotencyKey,
      keyId: candidate.keyId,
      replayKey: candidate.replayKey,
      requestPayloadHash: candidate.requestPayloadHash,
      result,
      storedAt: generatedAt,
    });
  }

  return {
    ...result,
    replay: {
      durablePersistenceEnabled: false,
      originalUsageEventId: null,
      quotaDebitedByThisCall: result.rateLimit.quotaDebited,
      replayed: false,
      replayKey: candidate?.replayKey ?? null,
      routeExposed: false,
      storedSuccessCount: input.replayStore.list().length,
    },
  };
}

function replayCandidateFor(input: ApiV1ShadowRouteReplayRequest): ReplayCandidate | null {
  const externalIdempotencyKey = normalizeToken(input.idempotencyKey ?? input.headers.xIdempotencyKey);
  if (externalIdempotencyKey === null) return null;
  const credential = parseApiV1Credential(input.headers);
  if (!credential.ok) return null;
  const endpoint = findApiV1Endpoint(input.endpointId);
  const method = input.method ?? endpoint.method;
  const requestPayloadHash = sha256Hex(JSON.stringify(input.payload), "gse-api-v1-shadow-payload");
  return {
    externalIdempotencyKey,
    keyId: credential.keyId,
    replayKey: idempotencyKeyFor({
      bodyHash: requestPayloadHash,
      externalKey: `${credential.keyId}:${externalIdempotencyKey}`,
      method,
      path: endpoint.path,
    }),
    requestPayloadHash,
  };
}

function normalizeToken(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) return null;
  return SAFE_TOKEN_PATTERN.test(trimmed) ? trimmed : null;
}
