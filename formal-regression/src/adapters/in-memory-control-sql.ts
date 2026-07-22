/**
 * In-memory `ControlSqlClient` test double.
 *
 * TEST-DOUBLE / REFERENCE ADAPTER — clearly labeled. This is NOT the real
 * production SQL boundary; it is a hand-written in-memory stand-in for
 * Postgres that speaks the exact `ControlSqlClient` interface defined by
 * the REAL, unmodified `control-store.ts`
 * (`/workspace/wt/pr163/apps/web/lib/ai-control-plane/control-store.ts`).
 *
 * The code actually being tested by these property tests is
 * `createPgControlStore(sql)` from that real file, imported verbatim — this
 * adapter only stands in for the database rows/queries it issues. Every
 * query this adapter recognizes is pattern-matched against the EXACT SQL
 * text `control-store.ts` emits (copied as literal markers below, not
 * paraphrased), and the transition semantics (INSERT ... ON CONFLICT DO
 * NOTHING RETURNING, guarded conditional UPDATE ... WHERE ... RETURNING)
 * are implemented with the SAME atomicity property real Postgres gives:
 * every operation below runs to completion synchronously (no `await`
 * between reading and mutating a row), so concurrent `Promise.all(...)`
 * callers racing this adapter can only interleave BETWEEN operations, never
 * inside one — matching a single-statement round trip against a real
 * server. If `control-store.ts`'s SQL text ever changes, the markers below
 * will stop matching and every affected method throws a descriptive error
 * (`Unrecognized query`) rather than silently doing the wrong thing.
 */
import type { ControlSqlClient } from "../../../../../wt/pr163/apps/web/lib/ai-control-plane/control-store";

interface InvocationRow {
  id: string;
  requestId: string;
  taskClass: string;
  surface: string;
  entity: string;
  dataClass: string;
  costMode: string;
  envClass: string;
  envClassSource: string;
  policyVersion: string;
  actorType: string;
  actorSubjectId: string;
  status: string;
  telemetryStatus: string;
  requestFingerprint: string;
  executionOwnerToken: string | null;
  leaseExpiresAt: Date | null;
  heartbeatAt: Date;
  createdAt: Date;
  resultJson: unknown;
  resultHash: string | null;
  blockedReasonCode: string | null;
  blockedDetail: string | null;
  completedAt: Date | null;
  stealCount: number;
}

interface AttemptRow {
  id: string;
  invocationId: string;
  ordinal: number;
  providerRequested: string;
  providerUsed: string | null;
  modelRequested: string;
  modelResolved: string | null;
  status: string;
  startedAt: Date;
  requestFingerprint: string;
  policyVersion: string;
  attemptNonce: string;
  errorCode: string | null;
  endedAt: Date | null;
  providerRequestId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  resultHash: string | null;
}

export class InMemoryControlSql implements ControlSqlClient {
  readonly invocations = new Map<string, InvocationRow>();
  readonly attempts = new Map<string, AttemptRow>();
  readonly attributions = new Set<string>(); // `${invocationId}#${version}`

  /** Injectable fault: throw before the query runs at all (store-unavailable simulation). */
  faultBeforeQuery: (() => void) | null = null;

  private byRequestTaskClass(requestId: string, taskClass: string): InvocationRow | undefined {
    for (const row of this.invocations.values()) {
      if (row.requestId === requestId && row.taskClass === taskClass) return row;
    }
    return undefined;
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params: readonly unknown[],
  ): Promise<T[]> {
    if (this.faultBeforeQuery) this.faultBeforeQuery();

    // 1. claimInvocation: INSERT ... ON CONFLICT ("requestId","taskClass") DO NOTHING RETURNING "id"
    if (text.includes('INSERT INTO "ai_invocations"') && text.includes("ON CONFLICT")) {
      const [
        id,
        requestId,
        taskClass,
        surface,
        entity,
        dataClass,
        costMode,
        envClass,
        envClassSource,
        policyVersion,
        actorType,
        actorSubjectId,
        requestFingerprint,
        ownerToken,
        leaseExpiresAt,
        now,
      ] = params as [
        string, string, string, string, string, string, string, string, string,
        string, string, string, string, string, Date, Date,
      ];
      const existing = this.byRequestTaskClass(requestId, taskClass);
      if (existing) return [] as unknown as T[]; // ON CONFLICT DO NOTHING -> no RETURNING row
      const row: InvocationRow = {
        id, requestId, taskClass, surface, entity, dataClass, costMode, envClass,
        envClassSource, policyVersion, actorType, actorSubjectId,
        status: "RUNNING", telemetryStatus: "OK", requestFingerprint,
        executionOwnerToken: ownerToken, leaseExpiresAt, heartbeatAt: now, createdAt: now,
        resultJson: null, resultHash: null, blockedReasonCode: null, blockedDetail: null,
        completedAt: null, stealCount: 0,
      };
      this.invocations.set(id, row);
      return [{ id }] as unknown as T[];
    }

    // 2. readExisting: SELECT ... FROM "ai_invocations" WHERE "requestId" = $1 AND "taskClass" = $2
    if (text.includes('FROM "ai_invocations"') && text.includes('"requestId" = $1 AND "taskClass" = $2')) {
      const [requestId, taskClass] = params as [string, string];
      const row = this.byRequestTaskClass(requestId, taskClass);
      return (row ? [{ ...row }] : []) as unknown as T[];
    }

    // 3. readAttempts: SELECT ... FROM "ai_attempts" WHERE "invocationId" = $1 ORDER BY "ordinal" ASC
    if (text.includes('FROM "ai_attempts"') && text.includes("ORDER BY")) {
      const [invocationId] = params as [string];
      const rows = [...this.attempts.values()]
        .filter((a) => a.invocationId === invocationId)
        .sort((a, b) => a.ordinal - b.ordinal);
      return rows.map((r) => ({ ...r })) as unknown as T[];
    }

    // 4. nextFreeOrdinal: SELECT MAX("ordinal") AS max FROM "ai_attempts" WHERE "invocationId" = $1
    if (text.includes('MAX("ordinal")')) {
      const [invocationId] = params as [string];
      const rows = [...this.attempts.values()].filter((a) => a.invocationId === invocationId);
      const max = rows.length === 0 ? null : Math.max(...rows.map((r) => r.ordinal));
      return [{ max }] as unknown as T[];
    }

    // 5. reclaim BLOCKED/CONFIGURATION_BLOCKED -> RUNNING
    if (text.includes("'CONFIGURATION_BLOCKED'") && text.includes("SET \"status\" = 'RUNNING'")) {
      const [ownerToken, leaseExpiresAt, now, id] = params as [string, Date, Date, string];
      const row = this.invocations.get(id);
      if (!row || row.status !== "BLOCKED" || row.blockedReasonCode !== "CONFIGURATION_BLOCKED") {
        return [] as unknown as T[];
      }
      row.status = "RUNNING";
      row.executionOwnerToken = ownerToken;
      row.leaseExpiresAt = leaseExpiresAt;
      row.heartbeatAt = now;
      return [{ id }] as unknown as T[];
    }

    // 6. fenced steal: SET executionOwnerToken=.., stealCount = stealCount + 1 WHERE ...
    if (text.includes('"stealCount" = "stealCount" + 1')) {
      const [ownerToken, leaseExpiresAt, now, id, observedOwner] = params as [
        string, Date, Date, string, string | null,
      ];
      const row = this.invocations.get(id);
      if (!row) return [] as unknown as T[];
      const leaseGate = row.leaseExpiresAt === null || row.leaseExpiresAt.getTime() <= now.getTime();
      const ownerMatches =
        (row.executionOwnerToken === null && observedOwner === null) ||
        row.executionOwnerToken === observedOwner;
      if (row.status !== "RUNNING" || !ownerMatches || !leaseGate) {
        return [] as unknown as T[];
      }
      row.executionOwnerToken = ownerToken;
      row.leaseExpiresAt = leaseExpiresAt;
      row.heartbeatAt = now;
      row.stealCount += 1;
      return [{ id }] as unknown as T[];
    }

    // 7. unproven-funds fence: SET status='AMBIGUOUS'
    if (text.includes("SET \"status\" = 'AMBIGUOUS'")) {
      const [now, id, ownerToken] = params as [Date, string, string];
      const row = this.invocations.get(id);
      if (!row || row.status !== "RUNNING" || row.executionOwnerToken !== ownerToken) {
        return [] as unknown as T[];
      }
      row.status = "AMBIGUOUS";
      row.completedAt = now;
      row.leaseExpiresAt = null;
      return [{ id }] as unknown as T[];
    }

    // 8. startAttempt: INSERT INTO "ai_attempts" ... SELECT ... WHERE EXISTS(...) RETURNING "id"
    if (text.includes('INSERT INTO "ai_attempts"')) {
      const [
        attemptId, invocationId, ordinal, providerRequested, modelRequested,
        now, requestFingerprint, policyVersion, attemptNonce, ownerToken,
      ] = params as [
        string, string, number, string, string, Date, string, string, string, string,
      ];
      // "id" is the ai_attempts primary key in the real schema: a second
      // INSERT with an already-used attempt id is a unique-violation at the
      // DB level, not a silent no-op. This is exactly what makes
      // AtMostOneExternalDispatchPerAttempt hold for a duplicate-id race in
      // the real system: the SECOND concurrent racer's INSERT throws.
      if (this.attempts.has(attemptId)) {
        throw new Error(
          `InMemoryControlSql: unique_violation on "ai_attempts"."id" = ${attemptId} ` +
            "(duplicate attempt id — models a real Postgres PRIMARY KEY conflict)",
        );
      }
      const inv = this.invocations.get(invocationId);
      const eligible =
        inv !== undefined &&
        inv.status === "RUNNING" &&
        inv.executionOwnerToken === ownerToken &&
        inv.leaseExpiresAt !== null &&
        inv.leaseExpiresAt.getTime() > now.getTime();
      if (!eligible) return [] as unknown as T[];
      const row: AttemptRow = {
        id: attemptId, invocationId, ordinal, providerRequested, providerUsed: null,
        modelRequested, modelResolved: null, status: "DISPATCHED", startedAt: now,
        requestFingerprint, policyVersion, attemptNonce, errorCode: null, endedAt: null,
        providerRequestId: null, inputTokens: null, outputTokens: null, resultHash: null,
      };
      this.attempts.set(attemptId, row);
      return [{ id: attemptId }] as unknown as T[];
    }

    // 9. recordAttemptFailure: UPDATE "ai_attempts" a SET ... FROM "ai_invocations" i WHERE a."id" = $5 ...
    if (text.includes('UPDATE "ai_attempts" a')) {
      const [status, providerUsed, errorCode, now, attemptId, ownerToken] = params as [
        string, string | null, string | null, Date, string, string,
      ];
      const attempt = this.attempts.get(attemptId);
      const inv = attempt ? this.invocations.get(attempt.invocationId) : undefined;
      if (!attempt || !inv || inv.executionOwnerToken !== ownerToken) {
        return [] as unknown as T[];
      }
      attempt.status = status;
      attempt.providerUsed = providerUsed;
      attempt.errorCode = errorCode;
      attempt.endedAt = now;
      return [{ id: attemptId }] as unknown as T[];
    }

    // 10. createAttribution: INSERT INTO "ai_financial_attributions" ...
    if (text.includes('"ai_financial_attributions"')) {
      const [attributionId, invocationId] = params as [string, string, ...unknown[]];
      const key = `${invocationId}#1`;
      if (!this.attributions.has(key)) this.attributions.add(key);
      void attributionId;
      return [] as unknown as T[];
    }

    // 11. finalizeSuccess: WITH inv AS (UPDATE ... 'SUCCEEDED' ...) att AS (...) SELECT EXISTS(...) AS "invApplied"
    if (text.includes("'SUCCEEDED'")) {
      const [
        now, resultJson, resultHash, invocationId, ownerToken,
        providerUsed, modelResolved, providerRequestId, inputTokens, outputTokens, attemptId,
      ] = params as [
        Date, string, string, string, string, string, string, string | null,
        number | null, number | null, string,
      ];
      const inv = this.invocations.get(invocationId);
      const applied = inv !== undefined && inv.status === "RUNNING" && inv.executionOwnerToken === ownerToken;
      if (applied && inv) {
        inv.status = "SUCCEEDED";
        inv.completedAt = now;
        inv.resultJson = JSON.parse(resultJson);
        inv.resultHash = resultHash;
        inv.leaseExpiresAt = null;
        const attempt = this.attempts.get(attemptId);
        if (attempt) {
          attempt.status = "SUCCEEDED";
          attempt.providerUsed = providerUsed;
          attempt.modelResolved = modelResolved;
          attempt.providerRequestId = providerRequestId;
          attempt.inputTokens = inputTokens;
          attempt.outputTokens = outputTokens;
          attempt.endedAt = now;
          attempt.resultHash = resultHash;
        }
      }
      return [{ invApplied: applied }] as unknown as T[];
    }

    // 12. finalizeFailure: UPDATE "ai_invocations" SET "status" = $1 ... WHERE "status" = 'RUNNING'
    if (text.includes('SET "status" = $1') && text.includes("'RUNNING'")) {
      const [status, now, invocationId, ownerToken] = params as [string, Date, string, string];
      const inv = this.invocations.get(invocationId);
      if (!inv || inv.status !== "RUNNING" || inv.executionOwnerToken !== ownerToken) {
        return [] as unknown as T[];
      }
      inv.status = status;
      inv.completedAt = now;
      inv.leaseExpiresAt = null;
      return [{ id: invocationId }] as unknown as T[];
    }

    // 13. recordBlockedInvocation
    if (text.includes("'BLOCKED'")) {
      const [
        id, requestId, taskClass, surface, entity, dataClass, costMode, envClass,
        envClassSource, policyVersion, actorType, actorSubjectId, requestFingerprint,
        blockedReasonCode, blockedDetail,
      ] = params as [
        string, string, string, string, string, string, string, string, string,
        string, string, string, string, string, string,
      ];
      const existing = this.byRequestTaskClass(requestId, taskClass);
      if (existing) return [] as unknown as T[];
      const row: InvocationRow = {
        id, requestId, taskClass, surface, entity, dataClass, costMode, envClass,
        envClassSource, policyVersion, actorType, actorSubjectId,
        status: "BLOCKED", telemetryStatus: "OK", requestFingerprint,
        executionOwnerToken: null, leaseExpiresAt: null,
        heartbeatAt: new Date(), createdAt: new Date(),
        resultJson: null, resultHash: null, blockedReasonCode, blockedDetail,
        completedAt: null, stealCount: 0,
      };
      this.invocations.set(id, row);
      return [] as unknown as T[];
    }

    throw new Error(`InMemoryControlSql: unrecognized query, cannot fake it honestly:\n${text}`);
  }
}
