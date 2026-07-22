/**
 * Track A (exactly-once runtime handoff, 2026-07-22) acceptance against REAL
 * Postgres — the properties a mock can never prove:
 *
 *   1. A finalize/attempt-failure call that ACTUALLY APPLIES (passes the
 *      existing fencing guard unchanged) writes EXACTLY ONE
 *      `control_event_ledger` row, with a deterministic id.
 *   2. A call that is FENCED OUT (wrong owner token / already-terminal
 *      invocation) writes ZERO ledger rows — the ledger can never record a
 *      state transition that never happened. This is the specific
 *      correctness property the same-statement CTE design (folding the
 *      ledger INSERT into control-store.ts's existing fenced UPDATE/CTE)
 *      exists to guarantee, as opposed to a separate best-effort write that
 *      could drift from the real outcome.
 *   3. Double delivery — the exact same logical call repeated, both
 *      SEQUENTIALLY (simulating a caller retry after e.g. a network hiccup
 *      reading the first reply) and CONCURRENTLY (simulating two racing
 *      redelivery attempts of the same recovery-queue entry) — produces
 *      exactly one ledger row, never two, never a duplicate-key error
 *      surfaced to the caller.
 *   4. `alreadyProcessed` / `markProcessed` (the Pattern D read-side gate a
 *      future Formal Heartbeat / receipt-export consumer checks) is itself
 *      idempotent: marking the same (eventId, sink) pair twice leaves
 *      exactly one `processed_event` row.
 *
 * Gated on DATABASE_URL, matching the convention already used by
 * ai-control-plane-credit-admission.test.ts's real-Postgres integration
 * suite. CI sets DATABASE_URL to the workflow's Postgres service, making
 * this suite mandatory there.
 *
 * Local run:
 *   PORT=5434 DATADIR=/tmp/ledger-pg scripts/dev/disposable-postgres.sh
 *   DATABASE_URL="postgresql://postgres@127.0.0.1:5434/sports_test" \
 *     npx vitest run ai-control-plane-event-ledger-pg
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import {
  createPgControlStore,
  alreadyProcessed,
  markProcessed,
  deriveControlEventId,
  type AuthoritativeControlStore,
  type ControlSqlClient,
} from "@/lib/ai-control-plane/internal";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "ai_event_ledger_acceptance";
const OWNER_TOKEN = "owner-token-ledger-acceptance";

const MIGRATIONS_DIR = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "db",
  "prisma",
  "migrations",
);

suite("Track A — control event ledger acceptance against real Postgres", () => {
  let pool: Pool;
  let sql: ControlSqlClient;
  let store: AuthoritativeControlStore;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      options: `-c search_path=${SCHEMA}`,
    });
    await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await pool.query(`CREATE SCHEMA ${SCHEMA}`);
    for (const dir of [
      "20260722140000_add_ai_control_plane_ledger",
      "20260722220000_add_control_event_ledger",
    ]) {
      const ddl = readFileSync(join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
      await pool.query(ddl);
    }
    sql = {
      async query<T>(text: string, params: readonly unknown[]): Promise<T[]> {
        const res = await pool.query(text, params as unknown[]);
        return res.rows as T[];
      },
    };
    store = createPgControlStore(sql);
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
  });

  async function seedInvocation(
    id: string,
    overrides: { status?: string; ownerToken?: string | null } = {},
  ): Promise<void> {
    await pool.query(
      `INSERT INTO "ai_invocations"
         ("id", "requestId", "taskClass", "surface", "entity", "dataClass",
          "costMode", "envClass", "envClassSource", "policyVersion",
          "actorType", "actorSubjectId", "status", "requestFingerprint",
          "executionOwnerToken", "leaseExpiresAt")
       VALUES ($1, $2, 'brief.daily-summary', 'brief', 'GSE', 'internal',
               'NO_BILLABLE_EXTERNAL', 'test', 'explicit', '2026-07-22.1',
               'SERVICE', 'service:ledger-test', $3, $4, $5, now() + interval '1 hour')`,
      [
        id,
        `req-${id}`,
        overrides.status ?? "RUNNING",
        "a".repeat(64),
        overrides.ownerToken === undefined ? OWNER_TOKEN : overrides.ownerToken,
      ],
    );
  }

  async function seedAttempt(id: string, invocationId: string): Promise<void> {
    await pool.query(
      `INSERT INTO "ai_attempts"
         ("id", "invocationId", "ordinal", "providerRequested", "status",
          "startedAt", "modelRequested", "requestFingerprint", "policyVersion",
          "attemptNonce")
       VALUES ($1, $2, 0, 'anthropic-direct', 'DISPATCHED', now(), 'test-model',
               $3, '2026-07-22.1', $4)`,
      [id, invocationId, "a".repeat(64), randomUUID()],
    );
  }

  async function ledgerRows(eventId: string): Promise<readonly unknown[]> {
    const rows = await pool.query(
      `SELECT * FROM "control_event_ledger" WHERE "eventId" = $1`,
      [eventId],
    );
    return rows.rows;
  }

  it("finalizeSuccess: an applied call writes exactly one deterministic ledger row", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);

    const applied = await store.finalizeSuccess({
      invocationId,
      ownerToken: OWNER_TOKEN,
      attemptId,
      providerUsed: "anthropic-direct",
      modelResolved: "test-model",
      providerRequestId: null,
      inputTokens: null,
      outputTokens: null,
      resultJson: JSON.stringify({ ok: true }),
      resultHash: "hash-1",
      now: new Date(),
    });
    expect(applied).toBe(true);

    const expectedId = deriveControlEventId({
      sourceId: invocationId,
      eventType: "FINALIZED_SUCCESS",
    });
    const rows = await ledgerRows(expectedId);
    expect(rows).toHaveLength(1);
    expect((rows[0] as { source: string }).source).toBe("ai_invocation");
    expect((rows[0] as { eventType: string }).eventType).toBe("FINALIZED_SUCCESS");
  });

  it("finalizeSuccess: a FENCED call (wrong owner token) writes ZERO ledger rows", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);

    const applied = await store.finalizeSuccess({
      invocationId,
      ownerToken: "not-the-real-owner-token",
      attemptId,
      providerUsed: "anthropic-direct",
      modelResolved: "test-model",
      providerRequestId: null,
      inputTokens: null,
      outputTokens: null,
      resultJson: JSON.stringify({ ok: true }),
      resultHash: "hash-1",
      now: new Date(),
    });
    expect(applied).toBe(false); // fenced out — the invariant a real fenced-out finalize must uphold

    const expectedId = deriveControlEventId({
      sourceId: invocationId,
      eventType: "FINALIZED_SUCCESS",
    });
    expect(await ledgerRows(expectedId)).toHaveLength(0);
  });

  it("finalizeSuccess: sequential double delivery (retry of the same call) writes exactly one row", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);

    const call = () =>
      store.finalizeSuccess({
        invocationId,
        ownerToken: OWNER_TOKEN,
        attemptId,
        providerUsed: "anthropic-direct",
        modelResolved: "test-model",
        providerRequestId: null,
        inputTokens: null,
        outputTokens: null,
        resultJson: JSON.stringify({ ok: true }),
        resultHash: "hash-1",
        now: new Date(),
      });

    const first = await call();
    const second = await call(); // the retry: invocation is no longer RUNNING
    expect(first).toBe(true);
    expect(second).toBe(false);

    const expectedId = deriveControlEventId({
      sourceId: invocationId,
      eventType: "FINALIZED_SUCCESS",
    });
    expect(await ledgerRows(expectedId)).toHaveLength(1);
  });

  it("finalizeSuccess: CONCURRENT double delivery (racing redelivery) writes exactly one row", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);

    const call = () =>
      store.finalizeSuccess({
        invocationId,
        ownerToken: OWNER_TOKEN,
        attemptId,
        providerUsed: "anthropic-direct",
        modelResolved: "test-model",
        providerRequestId: null,
        inputTokens: null,
        outputTokens: null,
        resultJson: JSON.stringify({ ok: true }),
        resultHash: "hash-1",
        now: new Date(),
      });

    const [a, b] = await Promise.all([call(), call()]);
    // Exactly one of the two racing calls wins the fenced UPDATE; the other
    // observes the invocation already out of RUNNING.
    expect([a, b].filter((x) => x === true)).toHaveLength(1);

    const expectedId = deriveControlEventId({
      sourceId: invocationId,
      eventType: "FINALIZED_SUCCESS",
    });
    expect(await ledgerRows(expectedId)).toHaveLength(1);
  });

  it("finalizeFailure (AMBIGUOUS): applied vs fenced vs double-delivered ledger behavior", async () => {
    const invocationId = randomUUID();
    await seedInvocation(invocationId);

    const fenced = await store.finalizeFailure({
      invocationId,
      ownerToken: "wrong-token",
      status: "AMBIGUOUS",
      now: new Date(),
    });
    expect(fenced).toBe(false);
    const expectedId = deriveControlEventId({
      sourceId: invocationId,
      eventType: "FINALIZED_AMBIGUOUS",
    });
    expect(await ledgerRows(expectedId)).toHaveLength(0);

    const applied = await store.finalizeFailure({
      invocationId,
      ownerToken: OWNER_TOKEN,
      status: "AMBIGUOUS",
      now: new Date(),
    });
    expect(applied).toBe(true);
    expect(await ledgerRows(expectedId)).toHaveLength(1);

    // Retry after the fact — invocation is already AMBIGUOUS, not RUNNING.
    const retried = await store.finalizeFailure({
      invocationId,
      ownerToken: OWNER_TOKEN,
      status: "AMBIGUOUS",
      now: new Date(),
    });
    expect(retried).toBe(false);
    expect(await ledgerRows(expectedId)).toHaveLength(1); // still exactly one
  });

  it("recordAttemptFailure: an applied call writes one row; retried (idempotent-by-value) UPDATE still writes exactly one ledger row", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);

    const input = {
      attemptId,
      invocationId,
      ownerToken: OWNER_TOKEN,
      status: "FAILED" as const,
      providerUsed: "anthropic-direct",
      errorCode: "PROVIDER_ERROR",
      now: new Date(),
    };
    await store.recordAttemptFailure(input);
    await store.recordAttemptFailure(input); // same attemptId, called again

    const expectedId = deriveControlEventId({
      sourceId: attemptId,
      eventType: "ATTEMPT_FAILED",
    });
    expect(await ledgerRows(expectedId)).toHaveLength(1);
  });

  it("recordAttemptFailure: a FENCED call (wrong owner token) throws and writes zero ledger rows", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);

    await expect(
      store.recordAttemptFailure({
        attemptId,
        invocationId,
        ownerToken: "wrong-token",
        status: "FAILED",
        providerUsed: null,
        errorCode: "PROVIDER_ERROR",
        now: new Date(),
      }),
    ).rejects.toThrow();

    const expectedId = deriveControlEventId({
      sourceId: attemptId,
      eventType: "ATTEMPT_FAILED",
    });
    expect(await ledgerRows(expectedId)).toHaveLength(0);
  });

  it("alreadyProcessed / markProcessed (Pattern D gate): marking twice leaves exactly one processed_event row", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);
    await store.finalizeSuccess({
      invocationId,
      ownerToken: OWNER_TOKEN,
      attemptId,
      providerUsed: "anthropic-direct",
      modelResolved: "test-model",
      providerRequestId: null,
      inputTokens: null,
      outputTokens: null,
      resultJson: JSON.stringify({ ok: true }),
      resultHash: "hash-1",
      now: new Date(),
    });

    const eventId = deriveControlEventId({
      sourceId: invocationId,
      eventType: "FINALIZED_SUCCESS",
    });
    const sink = "formal_heartbeat";

    expect(await alreadyProcessed(sql, eventId, sink)).toBe(false);
    expect(await markProcessed(sql, eventId, sink)).toBe("marked");
    expect(await alreadyProcessed(sql, eventId, sink)).toBe(true);
    expect(await markProcessed(sql, eventId, sink)).toBe("already_marked");

    const rows = await pool.query(
      `SELECT count(*)::int AS n FROM "processed_event" WHERE "eventId" = $1 AND "sink" = $2`,
      [eventId, sink],
    );
    expect(rows.rows[0].n).toBe(1);

    // A DIFFERENT sink is a completely independent gate — the same event can
    // be processed once per sink, not once globally.
    expect(await alreadyProcessed(sql, eventId, "receipt_export")).toBe(false);
  });

  it("the Pattern D side-effect idiom is a true no-op on the second invocation", async () => {
    const invocationId = randomUUID();
    const attemptId = randomUUID();
    await seedInvocation(invocationId);
    await seedAttempt(attemptId, invocationId);
    await store.finalizeSuccess({
      invocationId,
      ownerToken: OWNER_TOKEN,
      attemptId,
      providerUsed: "anthropic-direct",
      modelResolved: "test-model",
      providerRequestId: null,
      inputTokens: null,
      outputTokens: null,
      resultJson: JSON.stringify({ ok: true }),
      resultHash: "hash-1",
      now: new Date(),
    });
    const eventId = deriveControlEventId({
      sourceId: invocationId,
      eventType: "FINALIZED_SUCCESS",
    });
    const sink = "receipt_export";

    let sideEffectRuns = 0;
    async function runSideEffectOnce(): Promise<void> {
      if (await alreadyProcessed(sql, eventId, sink)) return;
      sideEffectRuns += 1;
      await markProcessed(sql, eventId, sink);
    }

    await runSideEffectOnce();
    await runSideEffectOnce();
    await runSideEffectOnce();
    expect(sideEffectRuns).toBe(1);
  });
});
