import {
  createApiV1MemoryPersistenceStore,
  type ApiV1ShadowPersistenceStore,
} from "./persistence";
import {
  createApiV1MemoryShadowRouteReplayStore,
  handleApiV1ShadowRouteReplayRequest,
  type ApiV1ShadowRouteReplayRecord,
} from "./shadow-route-replay";
import {
  handleApiV1ShadowRouteRequest,
  type ApiV1ShadowRouteHarnessResult,
  type ApiV1ShadowRoutePayload,
} from "./shadow-route-harness";
import { hashApiV1Key } from "./api-key";
import type { ApiV1ShadowConsumerRecord } from "./consumer-registry";
import type { LocalReviewQueueSnapshot } from "@/lib/workflows/local-review-queue-persistence";

export type ApiV1AbuseResponseFixtureCaseId =
  | "malformed_api_key"
  | "conflicting_api_keys"
  | "overscoped_consumer"
  | "quota_exhausted"
  | "unsafe_payload_rights"
  | "malformed_route_controls";

export type ApiV1AbuseResponseFixtureCase = {
  readonly id: ApiV1AbuseResponseFixtureCaseId;
  readonly passed: boolean;
  readonly status: ApiV1ShadowRouteHarnessResult["status"];
  readonly expectedStatus: ApiV1ShadowRouteHarnessResult["status"];
  readonly reasonCodes: readonly string[];
  readonly expectedReasonCodes: readonly string[];
  readonly quotaDebited: boolean;
  readonly payloadLeaked: boolean;
  readonly deniedResponsesLeakPayload: false;
  readonly routeExposed: false;
  readonly observations: readonly string[];
};

export type ApiV1ReplayPromotionConflict = {
  readonly conflictKey: string;
  readonly endpointId: string;
  readonly keyId: string;
  readonly externalIdempotencyKey: string;
  readonly payloadHashes: readonly string[];
  readonly replayKeys: readonly string[];
};

export type ApiV1AbuseResponseFixtureReportStatus =
  | "shadow_report_ready"
  | "abuse_fixture_failed"
  | "blocked_by_promotion_conflicts";

export type ApiV1AbuseResponseFixtureReport = {
  readonly schemaVersion: "api-v1-abuse-response-fixture-report-v1";
  readonly generatedAt: string;
  readonly status: ApiV1AbuseResponseFixtureReportStatus;
  readonly liveRoutePromotionAllowed: false;
  readonly commandsExecutableNow: false;
  readonly routeExposed: false;
  readonly databaseWritesAllowed: false;
  readonly abuseResponseCoveragePassed: boolean;
  readonly promotionGateEvidence: {
    readonly abuseResponseReviewed: boolean;
    readonly replayConflictsAbsent: boolean;
    readonly unresolvedReviewPacketsAbsent: boolean;
    readonly duplicatePromotionRequestsAbsent: boolean;
  };
  readonly cases: readonly ApiV1AbuseResponseFixtureCase[];
  readonly replayConflicts: readonly ApiV1ReplayPromotionConflict[];
  readonly unresolvedReviewPackets: readonly string[];
  readonly staleReviewPackets: readonly string[];
  readonly duplicatePromotionRequestIds: readonly string[];
  readonly promotionBlockers: readonly string[];
  readonly nextRequiredProof: readonly string[];
};

export type ApiV1AbuseResponseFixtureReportInput = {
  readonly generatedAt?: string;
  readonly replayRecords?: readonly ApiV1ShadowRouteReplayRecord[];
  readonly reviewQueueSnapshot?: LocalReviewQueueSnapshot;
  readonly promotionRequestIds?: readonly string[];
};

const RAW_KEY = "gse_v1_shadow_ABUSEFIXTURE0001";
const OTHER_RAW_KEY = "gse_v1_shadow_ABUSEFIXTURE0002";
const DEFAULT_NOW = "2026-07-06T00:00:00.000Z";
const PROTECTED_RESPONSE = { protectedSourceValue: "must-not-appear" } as const;

function consumer(overrides: Partial<ApiV1ShadowConsumerRecord> = {}): ApiV1ShadowConsumerRecord {
  return {
    active: true,
    allowedOrigins: ["partner.gse.test"],
    consumerId: "consumer_api_abuse_fixture",
    displayName: "API Abuse Fixture Consumer",
    expiresAt: "2026-12-31T00:00:00.000Z",
    issuedAt: "2026-07-01T00:00:00.000Z",
    keyHash: hashApiV1Key(RAW_KEY),
    keyId: "gse_v1_shadow_abuse_fixture",
    monthlyQuota: 2,
    notes: "Local API abuse-response fixture only.",
    ownerApprovedForLiveUse: false,
    rotateAfter: null,
    scopes: ["evidence:read"],
    status: "shadow_active",
    usedThisMonth: 0,
    ...overrides,
  };
}

function storeFor(overrides: Partial<ApiV1ShadowConsumerRecord> = {}): ApiV1ShadowPersistenceStore {
  return createApiV1MemoryPersistenceStore({ consumers: [consumer(overrides)] });
}

function authHeaders(overrides: Record<string, string | null> = {}) {
  return {
    authorization: `Bearer ${RAW_KEY}`,
    origin: "https://partner.gse.test/dashboard",
    ...overrides,
  };
}

function defaultPayload(overrides: Partial<ApiV1ShadowRoutePayload> = {}): ApiV1ShadowRoutePayload {
  return {
    intendedUse: "commercial_display",
    sourceIds: ["nflverse"],
    ...overrides,
  };
}

function casePassed(input: {
  readonly result: ApiV1ShadowRouteHarnessResult;
  readonly expectedStatus: ApiV1ShadowRouteHarnessResult["status"];
  readonly expectedReasonCodes: readonly string[];
  readonly payloadLeaked: boolean;
}): boolean {
  return (
    input.result.status === input.expectedStatus &&
    input.expectedReasonCodes.every((code) => input.result.usageEvent.reasonCodes.includes(code)) &&
    !input.result.rateLimit.quotaDebited &&
    !input.payloadLeaked &&
    input.result.abuse.deniedResponsesLeakPayload === false &&
    input.result.routeExposed === false
  );
}

function buildCase(input: {
  readonly id: ApiV1AbuseResponseFixtureCaseId;
  readonly result: ApiV1ShadowRouteHarnessResult;
  readonly expectedStatus: ApiV1ShadowRouteHarnessResult["status"];
  readonly expectedReasonCodes: readonly string[];
}): ApiV1AbuseResponseFixtureCase {
  const serializedEnvelope = JSON.stringify(input.result.envelope);
  const payloadLeaked = serializedEnvelope.includes(PROTECTED_RESPONSE.protectedSourceValue);
  const passed = casePassed({
    expectedReasonCodes: input.expectedReasonCodes,
    expectedStatus: input.expectedStatus,
    payloadLeaked,
    result: input.result,
  });

  return {
    deniedResponsesLeakPayload: false,
    expectedReasonCodes: input.expectedReasonCodes,
    expectedStatus: input.expectedStatus,
    id: input.id,
    observations: [
      `status=${input.result.status}`,
      `quotaDebited=${String(input.result.rateLimit.quotaDebited)}`,
      `reasonCodes=${input.result.usageEvent.reasonCodes.join(",") || "none"}`,
      `payloadLeaked=${String(payloadLeaked)}`,
    ],
    passed,
    payloadLeaked,
    quotaDebited: input.result.rateLimit.quotaDebited,
    reasonCodes: input.result.usageEvent.reasonCodes,
    routeExposed: false,
    status: input.result.status,
  };
}

function runAbuseResponseCases(generatedAt: string): readonly ApiV1AbuseResponseFixtureCase[] {
  const cases: ApiV1AbuseResponseFixtureCase[] = [];

  cases.push(
    buildCase({
      expectedReasonCodes: ["malformed_api_key"],
      expectedStatus: 401,
      id: "malformed_api_key",
      result: handleApiV1ShadowRouteRequest({
        endpointId: "evidence.record.read",
        generatedAt,
        headers: authHeaders({ authorization: "Bearer bad-key", xGseRequestId: "abuse-malformed-key" }),
        payload: defaultPayload(),
        responseData: PROTECTED_RESPONSE,
        store: storeFor(),
      }),
    }),
  );

  cases.push(
    buildCase({
      expectedReasonCodes: ["conflicting_api_keys"],
      expectedStatus: 401,
      id: "conflicting_api_keys",
      result: handleApiV1ShadowRouteRequest({
        endpointId: "evidence.record.read",
        generatedAt,
        headers: authHeaders({
          xApiKey: OTHER_RAW_KEY,
          xGseRequestId: "abuse-conflicting-keys",
        }),
        payload: defaultPayload(),
        responseData: PROTECTED_RESPONSE,
        store: storeFor(),
      }),
    }),
  );

  cases.push(
    buildCase({
      expectedReasonCodes: ["insufficient_scope"],
      expectedStatus: 403,
      id: "overscoped_consumer",
      result: handleApiV1ShadowRouteRequest({
        endpointId: "signals.summary.read",
        generatedAt,
        headers: authHeaders({ xGseRequestId: "abuse-overscope" }),
        payload: defaultPayload(),
        responseData: PROTECTED_RESPONSE,
        store: storeFor({ scopes: ["metrics:read"] }),
      }),
    }),
  );

  cases.push(
    buildCase({
      expectedReasonCodes: ["quota-exhausted"],
      expectedStatus: 429,
      id: "quota_exhausted",
      result: handleApiV1ShadowRouteRequest({
        endpointId: "evidence.record.read",
        generatedAt,
        headers: authHeaders({ xGseRequestId: "abuse-quota" }),
        payload: defaultPayload(),
        responseData: PROTECTED_RESPONSE,
        store: storeFor({ monthlyQuota: 2, usedThisMonth: 2 }),
      }),
    }),
  );

  cases.push(
    buildCase({
      expectedReasonCodes: ["payload_rights_blocked"],
      expectedStatus: 403,
      id: "unsafe_payload_rights",
      result: handleApiV1ShadowRouteRequest({
        endpointId: "evidence.record.read",
        generatedAt,
        headers: authHeaders({ xGseRequestId: "abuse-payload" }),
        payload: defaultPayload({
          includesRawVendorPayload: true,
          sourceIds: ["espn-public-api"],
        }),
        responseData: PROTECTED_RESPONSE,
        store: storeFor(),
      }),
    }),
  );

  cases.push(
    buildCase({
      expectedReasonCodes: ["malformed_request_id", "malformed_idempotency_key", "method_not_allowed"],
      expectedStatus: 405,
      id: "malformed_route_controls",
      result: handleApiV1ShadowRouteRequest({
        endpointId: "evidence.record.read",
        generatedAt,
        headers: authHeaders({
          xGseRequestId: "bad id",
          xIdempotencyKey: "bad idem",
        }),
        method: "POST",
        payload: defaultPayload(),
        responseData: PROTECTED_RESPONSE,
        store: storeFor(),
      }),
    }),
  );

  return cases;
}

export function buildApiV1ReplayConflictFixtureRecords(): readonly ApiV1ShadowRouteReplayRecord[] {
  const store = storeFor({ monthlyQuota: 4 });
  const replayStore = createApiV1MemoryShadowRouteReplayStore();

  handleApiV1ShadowRouteReplayRequest({
    endpointId: "evidence.record.read",
    generatedAt: DEFAULT_NOW,
    headers: authHeaders({
      xGseRequestId: "replay-conflict-first",
      xIdempotencyKey: "idem-conflict-1",
    }),
    payload: defaultPayload(),
    replayStore,
    responseData: { evidenceId: "ev_conflict_1" },
    store,
  });
  handleApiV1ShadowRouteReplayRequest({
    endpointId: "evidence.record.read",
    generatedAt: "2026-07-06T00:01:00.000Z",
    headers: authHeaders({
      xGseRequestId: "replay-conflict-second",
      xIdempotencyKey: "idem-conflict-1",
    }),
    payload: defaultPayload({ includesPersonalData: false }),
    replayStore,
    responseData: { evidenceId: "ev_conflict_2" },
    store,
  });

  return replayStore.list();
}

export function detectApiV1ReplayPromotionConflicts(
  records: readonly ApiV1ShadowRouteReplayRecord[],
): readonly ApiV1ReplayPromotionConflict[] {
  const grouped = new Map<string, readonly ApiV1ShadowRouteReplayRecord[]>();
  for (const record of records) {
    const conflictKey = `${record.endpointId}:${record.keyId}:${record.externalIdempotencyKey}`;
    grouped.set(conflictKey, [...(grouped.get(conflictKey) ?? []), record]);
  }

  const conflicts: ApiV1ReplayPromotionConflict[] = [];
  for (const [conflictKey, group] of grouped.entries()) {
    const payloadHashes = [...new Set(group.map((record) => record.requestPayloadHash))].sort();
    const first = group[0];
    if (first === undefined || payloadHashes.length < 2) continue;
    conflicts.push({
      conflictKey,
      endpointId: first.endpointId,
      externalIdempotencyKey: first.externalIdempotencyKey,
      keyId: first.keyId,
      payloadHashes,
      replayKeys: group.map((record) => record.replayKey).sort(),
    });
  }
  return conflicts;
}

function duplicateIds(values: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function promotionBlockersFor(input: {
  readonly abuseResponseCoveragePassed: boolean;
  readonly replayConflicts: readonly ApiV1ReplayPromotionConflict[];
  readonly unresolvedReviewPackets: readonly string[];
  readonly staleReviewPackets: readonly string[];
  readonly duplicatePromotionRequestIds: readonly string[];
}): readonly string[] {
  const blockers: string[] = [];
  if (!input.abuseResponseCoveragePassed) {
    blockers.push("Abuse-response fixture coverage failed.");
  }
  if (input.replayConflicts.length > 0) {
    blockers.push("Replay promotion conflict detected for reused idempotency keys with different payload hashes.");
  }
  if (input.unresolvedReviewPackets.length > 0) {
    blockers.push("Local review queue has unresolved blocker packets.");
  }
  if (input.staleReviewPackets.length > 0) {
    blockers.push("Local review queue has stale packets requiring owner review or archival.");
  }
  if (input.duplicatePromotionRequestIds.length > 0) {
    blockers.push("Duplicate API route promotion request IDs detected.");
  }
  return blockers;
}

function statusFor(input: {
  readonly abuseResponseCoveragePassed: boolean;
  readonly promotionBlockers: readonly string[];
}): ApiV1AbuseResponseFixtureReportStatus {
  if (!input.abuseResponseCoveragePassed) return "abuse_fixture_failed";
  if (input.promotionBlockers.length > 0) return "blocked_by_promotion_conflicts";
  return "shadow_report_ready";
}

export function buildApiV1AbuseResponseFixtureReport(
  input: ApiV1AbuseResponseFixtureReportInput = {},
): ApiV1AbuseResponseFixtureReport {
  const generatedAt = input.generatedAt ?? DEFAULT_NOW;
  const cases = runAbuseResponseCases(generatedAt);
  const abuseResponseCoveragePassed = cases.every((entry) => entry.passed);
  const replayConflicts = detectApiV1ReplayPromotionConflicts(input.replayRecords ?? []);
  const unresolvedReviewPackets = input.reviewQueueSnapshot?.unresolvedBlockerPackets ?? [];
  const staleReviewPackets = input.reviewQueueSnapshot?.stalePackets ?? [];
  const duplicatePromotionRequestIds = duplicateIds(input.promotionRequestIds ?? []);
  const promotionBlockers = promotionBlockersFor({
    abuseResponseCoveragePassed,
    duplicatePromotionRequestIds,
    replayConflicts,
    staleReviewPackets,
    unresolvedReviewPackets,
  });

  return {
    abuseResponseCoveragePassed,
    cases,
    commandsExecutableNow: false,
    databaseWritesAllowed: false,
    duplicatePromotionRequestIds,
    generatedAt,
    liveRoutePromotionAllowed: false,
    nextRequiredProof: [
      "Attach this report to the non-executable live-route promotion packet.",
      "Resolve replay conflicts before owner route review.",
      "Clear or archive unresolved/stale local review queue packets before owner route review.",
      "Keep OpenAPI security, payload-envelope, rate-limit, rollback, and raw-key absence gates separate.",
    ],
    promotionBlockers,
    promotionGateEvidence: {
      abuseResponseReviewed: abuseResponseCoveragePassed && promotionBlockers.length === 0,
      duplicatePromotionRequestsAbsent: duplicatePromotionRequestIds.length === 0,
      replayConflictsAbsent: replayConflicts.length === 0,
      unresolvedReviewPacketsAbsent: unresolvedReviewPackets.length === 0 && staleReviewPackets.length === 0,
    },
    replayConflicts,
    routeExposed: false,
    schemaVersion: "api-v1-abuse-response-fixture-report-v1",
    staleReviewPackets,
    status: statusFor({ abuseResponseCoveragePassed, promotionBlockers }),
    unresolvedReviewPackets,
  };
}
