/**
 * §9.8 acceptance against REAL Postgres: the atomic create-or-claim of
 * `ai_invocations` (§9.2) under true concurrency — proven by the database's
 * unique index + INSERT..ON CONFLICT + conditional UPDATE, not by a mock.
 *
 * Gated on AI_CLAIM_PG_URL (a disposable Postgres with the
 * 20260722140000_add_ai_control_plane_ledger migration applied):
 *
 *   PORT=5447 DATADIR=/tmp/ai-claim-pg scripts/dev/disposable-postgres.sh   # adapted
 *   psql "$URL" -f packages/db/prisma/migrations/20260722140000_add_ai_control_plane_ledger/migration.sql
 *   AI_CLAIM_PG_URL="postgresql://postgres@127.0.0.1:5447/sports_test" vitest run ai-control-plane-claim-pg
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import {
  createPgControlStore,
  claimRecoveryBatch,
  drainAiTelemetryRecovery,
  ObservabilitySink,
  type AuthoritativeControlStore,
  type ClaimInvocationInput,
  type ControlSqlClient,
} from "@/lib/ai-control-plane/internal";

const PG_URL = process.env["AI_CLAIM_PG_URL"];

const suite = PG_URL ? describe : describe.skip;

suite("§9.2 atomic claim against real Postgres", () => {
  let pool: Pool;
  let sql: ControlSqlClient;
  let store: AuthoritativeControlStore;
  const NOW = new Date();

  beforeAll(async () => {
    pool = new Pool({ connectionString: PG_URL, max: 30 });
    sql = {
      async query<T>(text: string, params: readonly unknown[]): Promise<T[]> {
        const res = await pool.query(text, params as unknown[]);
        return res.rows as T[];
      },
    };
    store = createPgControlStore(sql);
  });

  afterAll(async () => {
    await pool?.end();
  });

  function claimInput(
    overrides: Partial<ClaimInvocationInput> = {},
  ): ClaimInvocationInput {
    return {
      invocationId: randomUUID(),
      requestId: overrides.requestId ?? `req-${randomUUID()}`,
      taskClass: "brief.daily-summary",
      surface: "brief",
      entity: "GSE",
      dataClass: "internal,secret-prohibited",
      costMode: "CONFIRMED_CREDITS_ONLY",
      envClass: "test",
      envClassSource: "explicit",
      policyVersion: "2026-07-22.1",
      actorType: "SERVICE",
      actorSubjectId: "service:pg-claim-test",
      requestFingerprint: "f".repeat(64),
      ownerToken: randomUUID(),
      leaseMs: 120_000,
      now: NOW,
      ...overrides,
    };
  }

  it("100 concurrent identical claims → exactly ONE ACQUIRED (one dispatch)", async () => {
    const requestId = `req-concurrent-${randomUUID()}`;
    const outcomes = await Promise.all(
      Array.from({ length: 100 }, () =>
        store.claimInvocation(claimInput({ requestId })),
      ),
    );
    const acquired = outcomes.filter((o) => o.kind === "ACQUIRED");
    const inProgress = outcomes.filter((o) => o.kind === "IN_PROGRESS");
    expect(acquired).toHaveLength(1);
    expect(inProgress).toHaveLength(99);
    const rows = await sql.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "ai_invocations" WHERE "requestId" = $1`,
      [requestId],
    );
    expect(rows[0]!.count).toBe("1"); // one durable claim row, ever
  });

  it("active lease → IN_PROGRESS; expired lease → exactly one fenced steal among concurrent stealers", async () => {
    const requestId = `req-steal-${randomUUID()}`;
    const first = await store.claimInvocation(
      claimInput({ requestId, leaseMs: -1 }), // lease already expired
    );
    expect(first.kind).toBe("ACQUIRED");

    const stealers = await Promise.all(
      Array.from({ length: 20 }, () =>
        store.claimInvocation(claimInput({ requestId })),
      ),
    );
    const stolen = stealers.filter(
      (o) => o.kind === "ACQUIRED" && o.stolen === true,
    );
    expect(stolen).toHaveLength(1);
    expect(
      stealers.filter((o) => o.kind === "IN_PROGRESS"),
    ).toHaveLength(19);

    const rows = await sql.query<{ stealCount: number }>(
      `SELECT "stealCount" FROM "ai_invocations" WHERE "requestId" = $1`,
      [requestId],
    );
    expect(Number(rows[0]!.stealCount)).toBe(1);
  });

  it("the stale owner's finalize is fenced out after a steal", async () => {
    const requestId = `req-fence-${randomUUID()}`;
    const staleToken = randomUUID();
    const stale = await store.claimInvocation(
      claimInput({ requestId, ownerToken: staleToken, leaseMs: -1 }),
    );
    expect(stale.kind).toBe("ACQUIRED");
    if (stale.kind !== "ACQUIRED") return;

    const thief = await store.claimInvocation(claimInput({ requestId }));
    expect(thief.kind).toBe("ACQUIRED");

    const applied = await store.finalizeSuccess({
      invocationId: stale.invocationId,
      ownerToken: staleToken,
      attemptId: randomUUID(),
      providerUsed: "anthropic-direct",
      modelResolved: "m",
      providerRequestId: null,
      inputTokens: null,
      outputTokens: null,
      resultJson: JSON.stringify({ text: "stale" }),
      resultHash: "stale-hash",
      now: new Date(),
    });
    expect(applied).toBe(false);
  });

  it("same requestId + different fingerprint → FINGERPRINT_CONFLICT", async () => {
    const requestId = `req-conflict-${randomUUID()}`;
    await store.claimInvocation(claimInput({ requestId }));
    const conflicting = await store.claimInvocation(
      claimInput({ requestId, requestFingerprint: "0".repeat(64) }),
    );
    expect(conflicting.kind).toBe("FINGERPRINT_CONFLICT");
  });

  it("terminal SUCCEEDED replay returns the persisted result without a new claim", async () => {
    const requestId = `req-replay-${randomUUID()}`;
    const ownerToken = randomUUID();
    const claim = await store.claimInvocation(claimInput({ requestId, ownerToken }));
    expect(claim.kind).toBe("ACQUIRED");
    if (claim.kind !== "ACQUIRED") return;

    await store.startAttempt({
      attemptId: randomUUID(),
      invocationId: claim.invocationId,
      ownerToken,
      ordinal: 0,
      providerRequested: "anthropic-direct",
      modelRequested: "claude-sonnet-4-6",
      requestFingerprint: "f".repeat(64),
      policyVersion: "2026-07-22.1",
      attemptNonce: randomUUID(),
      now: new Date(),
    });
    const attemptRows = await sql.query<{ id: string }>(
      `SELECT "id" FROM "ai_attempts" WHERE "invocationId" = $1`,
      [claim.invocationId],
    );
    const applied = await store.finalizeSuccess({
      invocationId: claim.invocationId,
      ownerToken,
      attemptId: attemptRows[0]!.id,
      providerUsed: "anthropic-direct",
      modelResolved: "claude-sonnet-4-6",
      providerRequestId: "vendor-123",
      inputTokens: 10,
      outputTokens: 20,
      resultJson: JSON.stringify({ text: "the original answer" }),
      resultHash: "h".repeat(64),
      now: new Date(),
    });
    expect(applied).toBe(true);

    const replay = await store.claimInvocation(claimInput({ requestId }));
    expect(replay.kind).toBe("REPLAY_TERMINAL");
    if (replay.kind !== "REPLAY_TERMINAL") return;
    expect(replay.status).toBe("SUCCEEDED");
    expect(replay.output).toEqual({ text: "the original answer" });
    expect(replay.attempts).toHaveLength(1);
    expect(replay.attempts[0]!.status).toBe("SUCCEEDED");
  });

  it("§9.5 DB constraints: confirmed fields without reconciledAt and negative billed are rejected", async () => {
    const requestId = `req-attr-${randomUUID()}`;
    const claim = await store.claimInvocation(claimInput({ requestId }));
    expect(claim.kind).toBe("ACQUIRED");
    if (claim.kind !== "ACQUIRED") return;
    await store.createAttribution({
      attributionId: randomUUID(),
      invocationId: claim.invocationId,
      estimatedGrossUsd: 0,
      fundingLabel: "CREDIT_ELIGIBLE_UNCONFIRMED",
    });
    // Duplicate current attribution is impossible (unique (invocationId, version)
    // + partial unique on isCurrent).
    await expect(
      sql.query(
        `INSERT INTO "ai_financial_attributions"
           ("id","invocationId","attemptId","estimatedGrossUsd","fundingLabel","version","isCurrent")
         VALUES ($1,$2,NULL,0,'CASH_EXPECTED',1,TRUE)`,
        [randomUUID(), claim.invocationId],
      ),
    ).rejects.toThrow();
    // Confirmed reconciliation fields require reconciledAt.
    await expect(
      sql.query(
        `UPDATE "ai_financial_attributions"
            SET "reconciledLabel" = 'CASH_CHARGED_CONFIRMED', "billedUsd" = 1
          WHERE "invocationId" = $1`,
        [claim.invocationId],
      ),
    ).rejects.toThrow();
    // Negative billed amounts are impossible.
    await expect(
      sql.query(
        `UPDATE "ai_financial_attributions"
            SET "reconciledLabel" = 'CASH_CHARGED_CONFIRMED', "billedUsd" = -1,
                "reconciledAt" = NOW()
          WHERE "invocationId" = $1`,
        [claim.invocationId],
      ),
    ).rejects.toThrow();
    // Confirmed credit label requires a grant reference.
    await expect(
      sql.query(
        `UPDATE "ai_financial_attributions"
            SET "reconciledLabel" = 'CREDIT_APPLIED_CONFIRMED', "billedUsd" = 0,
                "reconciledAt" = NOW()
          WHERE "invocationId" = $1`,
        [claim.invocationId],
      ),
    ).rejects.toThrow();
  });

  it("§9.6 BLOCKED rows are structurally non-dispatchable (CHECK constraint)", async () => {
    const requestId = `req-blocked-${randomUUID()}`;
    await store.recordBlockedInvocation({
      invocationId: randomUUID(),
      requestId,
      taskClass: "brief.daily-summary",
      surface: "brief",
      entity: "GSE",
      dataClass: "internal",
      costMode: "UNRESOLVED",
      envClass: "test",
      envClassSource: "explicit",
      policyVersion: "2026-07-22.1",
      actorType: "SERVICE",
      actorSubjectId: "service:pg-claim-test",
      requestFingerprint: "f".repeat(64),
      blockedReasonCode: "POLICY_BLOCKED",
      blockedDetail: "no fundable route",
    });
    // Attaching an owner token / lease to a BLOCKED row is impossible.
    await expect(
      sql.query(
        `UPDATE "ai_invocations"
            SET "executionOwnerToken" = 'x', "leaseExpiresAt" = NOW()
          WHERE "requestId" = $1`,
        [requestId],
      ),
    ).rejects.toThrow();
  });

  // ── Unproven-funds steal fence ──────────────────────────────────────────────

  it("a stale claim with a recorded AMBIGUOUS attempt is forced AMBIGUOUS on steal — never ACQUIRED (re-spend fence)", async () => {
    const requestId = `req-amb-steal-${randomUUID()}`;
    const crashedToken = randomUUID();
    const claim = await store.claimInvocation(
      claimInput({ requestId, ownerToken: crashedToken }),
    );
    expect(claim.kind).toBe("ACQUIRED");
    if (claim.kind !== "ACQUIRED") return;
    const attemptId = randomUUID();
    await store.startAttempt({
      attemptId,
      invocationId: claim.invocationId,
      ownerToken: crashedToken,
      ordinal: 0,
      providerRequested: "anthropic-direct",
      modelRequested: "claude-sonnet-4-6",
      requestFingerprint: "f".repeat(64),
      policyVersion: "2026-07-22.1",
      attemptNonce: randomUUID(),
      now: NOW,
    });
    await store.recordAttemptFailure({
      attemptId,
      invocationId: claim.invocationId,
      ownerToken: crashedToken,
      status: "AMBIGUOUS",
      providerUsed: "anthropic-direct",
      errorCode: "SOCKET_DROP",
      now: NOW,
    });
    // Owner dies BEFORE finalizeFailure. Lease expires; a replay arrives.
    const afterLease = new Date(NOW.getTime() + 200_000);
    const replay = await store.claimInvocation(
      claimInput({ requestId, now: afterLease }),
    );
    expect(replay.kind).toBe("REPLAY_TERMINAL");
    if (replay.kind !== "REPLAY_TERMINAL") return;
    expect(replay.status).toBe("AMBIGUOUS");
    const rows = await sql.query<{ status: string }>(
      `SELECT "status" FROM "ai_invocations" WHERE "id" = $1`,
      [claim.invocationId],
    );
    expect(rows[0]!.status).toBe("AMBIGUOUS"); // durable terminal, not RUNNING
    // Subsequent replays are terminal AMBIGUOUS too.
    const again = await store.claimInvocation(
      claimInput({ requestId, now: afterLease }),
    );
    expect(again.kind).toBe("REPLAY_TERMINAL");
  });

  it("a stale claim with an attempt still open in DISPATCHED is forced AMBIGUOUS on steal", async () => {
    const requestId = `req-open-steal-${randomUUID()}`;
    const crashedToken = randomUUID();
    const claim = await store.claimInvocation(
      claimInput({ requestId, ownerToken: crashedToken }),
    );
    expect(claim.kind).toBe("ACQUIRED");
    if (claim.kind !== "ACQUIRED") return;
    await store.startAttempt({
      attemptId: randomUUID(),
      invocationId: claim.invocationId,
      ownerToken: crashedToken,
      ordinal: 0,
      providerRequested: "anthropic-direct",
      modelRequested: "claude-sonnet-4-6",
      requestFingerprint: "f".repeat(64),
      policyVersion: "2026-07-22.1",
      attemptNonce: randomUUID(),
      now: NOW,
    });
    // Crash mid-transport: no failure record, no finalize.
    const afterLease = new Date(NOW.getTime() + 200_000);
    const replay = await store.claimInvocation(
      claimInput({ requestId, now: afterLease }),
    );
    expect(replay.kind).toBe("REPLAY_TERMINAL");
    if (replay.kind !== "REPLAY_TERMINAL") return;
    expect(replay.status).toBe("AMBIGUOUS");
  });

  it("a stale claim whose every attempt failed CLEANLY is still stolen for re-dispatch", async () => {
    const requestId = `req-clean-steal-${randomUUID()}`;
    const crashedToken = randomUUID();
    const claim = await store.claimInvocation(
      claimInput({ requestId, ownerToken: crashedToken }),
    );
    expect(claim.kind).toBe("ACQUIRED");
    if (claim.kind !== "ACQUIRED") return;
    const attemptId = randomUUID();
    await store.startAttempt({
      attemptId,
      invocationId: claim.invocationId,
      ownerToken: crashedToken,
      ordinal: 0,
      providerRequested: "anthropic-direct",
      modelRequested: "claude-sonnet-4-6",
      requestFingerprint: "f".repeat(64),
      policyVersion: "2026-07-22.1",
      attemptNonce: randomUUID(),
      now: NOW,
    });
    await store.recordAttemptFailure({
      attemptId,
      invocationId: claim.invocationId,
      ownerToken: crashedToken,
      status: "FAILED",
      providerUsed: "anthropic-direct",
      errorCode: "HTTP_500",
      now: NOW,
    });
    const afterLease = new Date(NOW.getTime() + 200_000);
    const steal = await store.claimInvocation(
      claimInput({ requestId, now: afterLease }),
    );
    expect(steal.kind).toBe("ACQUIRED");
    if (steal.kind !== "ACQUIRED") return;
    expect(steal.stolen).toBe(true);
    expect(steal.nextOrdinal).toBe(1);
  });

  // ── Atomic finalizeSuccess (single-statement CTE) ───────────────────────────

  it("finalizeSuccess commits invocation + attempt atomically; a fenced finalize touches NEITHER row", async () => {
    const requestId = `req-atomic-${randomUUID()}`;
    const ownerToken = randomUUID();
    const claim = await store.claimInvocation(claimInput({ requestId, ownerToken }));
    expect(claim.kind).toBe("ACQUIRED");
    if (claim.kind !== "ACQUIRED") return;
    const attemptId = randomUUID();
    await store.startAttempt({
      attemptId,
      invocationId: claim.invocationId,
      ownerToken,
      ordinal: 0,
      providerRequested: "anthropic-direct",
      modelRequested: "claude-sonnet-4-6",
      requestFingerprint: "f".repeat(64),
      policyVersion: "2026-07-22.1",
      attemptNonce: randomUUID(),
      now: NOW,
    });
    // Fenced (wrong token): NEITHER the invocation NOR the attempt changes.
    const fenced = await store.finalizeSuccess({
      invocationId: claim.invocationId,
      ownerToken: randomUUID(),
      attemptId,
      providerUsed: "anthropic-direct",
      modelResolved: "claude-sonnet-4-6",
      providerRequestId: "vendor-x",
      inputTokens: 1,
      outputTokens: 2,
      resultJson: JSON.stringify({ text: "fenced" }),
      resultHash: "x".repeat(64),
      now: NOW,
    });
    expect(fenced).toBe(false);
    const attemptAfterFence = await sql.query<{ status: string; providerUsed: string | null }>(
      `SELECT "status", "providerUsed" FROM "ai_attempts" WHERE "id" = $1`,
      [attemptId],
    );
    expect(attemptAfterFence[0]!.status).toBe("DISPATCHED");
    expect(attemptAfterFence[0]!.providerUsed).toBeNull();
    // Applied: BOTH rows change in one statement.
    const applied = await store.finalizeSuccess({
      invocationId: claim.invocationId,
      ownerToken,
      attemptId,
      providerUsed: "anthropic-direct",
      modelResolved: "claude-sonnet-4-6",
      providerRequestId: "vendor-y",
      inputTokens: 10,
      outputTokens: 20,
      resultJson: JSON.stringify({ text: "real" }),
      resultHash: "y".repeat(64),
      now: NOW,
    });
    expect(applied).toBe(true);
    const attempt = await sql.query<{ status: string; providerUsed: string | null }>(
      `SELECT "status", "providerUsed" FROM "ai_attempts" WHERE "id" = $1`,
      [attemptId],
    );
    expect(attempt[0]!.status).toBe("SUCCEEDED");
    expect(attempt[0]!.providerUsed).toBe("anthropic-direct");
    const inv = await sql.query<{ status: string }>(
      `SELECT "status" FROM "ai_invocations" WHERE "id" = $1`,
      [claim.invocationId],
    );
    expect(inv[0]!.status).toBe("SUCCEEDED");
  });

  // ── §9.6 CONFIGURATION_BLOCKED reclaim ──────────────────────────────────────

  it("a CONFIGURATION_BLOCKED row is reclaimed exactly once among concurrent retries, keeping the incident fields", async () => {
    const requestId = `req-cfg-reclaim-${randomUUID()}`;
    await store.recordBlockedInvocation({
      invocationId: randomUUID(),
      requestId,
      taskClass: "brief.daily-summary",
      surface: "brief",
      entity: "GSE",
      dataClass: "internal",
      costMode: "UNRESOLVED",
      envClass: "test",
      envClassSource: "UNRESOLVED",
      policyVersion: "UNRESOLVED",
      actorType: "SERVICE",
      actorSubjectId: "service:pg-claim-test",
      requestFingerprint: "f".repeat(64),
      blockedReasonCode: "CONFIGURATION_BLOCKED",
      blockedDetail: "env misconfig during deploy",
    });
    const retries = await Promise.all(
      Array.from({ length: 10 }, () =>
        store.claimInvocation(claimInput({ requestId })),
      ),
    );
    expect(retries.filter((o) => o.kind === "ACQUIRED")).toHaveLength(1);
    expect(retries.filter((o) => o.kind === "IN_PROGRESS")).toHaveLength(9);
    const rows = await sql.query<{
      status: string;
      blockedReasonCode: string | null;
    }>(
      `SELECT "status", "blockedReasonCode" FROM "ai_invocations" WHERE "requestId" = $1`,
      [requestId],
    );
    expect(rows[0]!.status).toBe("RUNNING");
    // Incident history survives the reclaim (widened CHECK permits this).
    expect(rows[0]!.blockedReasonCode).toBe("CONFIGURATION_BLOCKED");
  });

  it("POLICY_BLOCKED rows stay terminal: a later claim replays, never reclaims", async () => {
    const requestId = `req-policy-terminal-${randomUUID()}`;
    await store.recordBlockedInvocation({
      invocationId: randomUUID(),
      requestId,
      taskClass: "brief.daily-summary",
      surface: "brief",
      entity: "GSE",
      dataClass: "internal",
      costMode: "UNRESOLVED",
      envClass: "test",
      envClassSource: "explicit",
      policyVersion: "2026-07-22.1",
      actorType: "SERVICE",
      actorSubjectId: "service:pg-claim-test",
      requestFingerprint: "f".repeat(64),
      blockedReasonCode: "POLICY_BLOCKED",
      blockedDetail: "no fundable route",
    });
    const replay = await store.claimInvocation(claimInput({ requestId }));
    expect(replay.kind).toBe("REPLAY_TERMINAL");
    if (replay.kind !== "REPLAY_TERMINAL") return;
    expect(replay.status).toBe("BLOCKED");
  });
});

// ─── §9.7 recovery queue: enqueue → lease-fenced drain → terminal states ──────

suite("§9.7 recovery queue drain against real Postgres", () => {
  let pool: Pool;
  let sql: ControlSqlClient;
  let store: AuthoritativeControlStore;
  const NOW = new Date();

  beforeAll(async () => {
    pool = new Pool({ connectionString: PG_URL, max: 30 });
    sql = {
      async query<T>(text: string, params: readonly unknown[]): Promise<T[]> {
        const res = await pool.query(text, params as unknown[]);
        return res.rows as T[];
      },
    };
    store = createPgControlStore(sql);
  });

  afterAll(async () => {
    await pool?.end();
  });

  function claimInput(
    overrides: Partial<ClaimInvocationInput> = {},
  ): ClaimInvocationInput {
    return {
      invocationId: randomUUID(),
      requestId: overrides.requestId ?? `req-${randomUUID()}`,
      taskClass: "brief.daily-summary",
      surface: "brief",
      entity: "GSE",
      dataClass: "internal,secret-prohibited",
      costMode: "CONFIRMED_CREDITS_ONLY",
      envClass: "test",
      envClassSource: "explicit",
      policyVersion: "2026-07-22.1",
      actorType: "SERVICE",
      actorSubjectId: "service:pg-drain-test",
      requestFingerprint: "f".repeat(64),
      ownerToken: randomUUID(),
      leaseMs: 120_000,
      now: NOW,
      ...overrides,
    };
  }

  /** A RUNNING invocation with one DISPATCHED attempt; returns ids + token. */
  async function seedRunningInvocation(): Promise<{
    invocationId: string;
    attemptId: string;
    ownerToken: string;
  }> {
    const ownerToken = randomUUID();
    const claim = await store.claimInvocation(claimInput({ ownerToken }));
    if (claim.kind !== "ACQUIRED") throw new Error("seed claim not acquired");
    const attemptId = randomUUID();
    await store.startAttempt({
      attemptId,
      invocationId: claim.invocationId,
      ownerToken,
      ordinal: 0,
      providerRequested: "anthropic-direct",
      modelRequested: "claude-sonnet-4-6",
      requestFingerprint: "f".repeat(64),
      policyVersion: "2026-07-22.1",
      attemptNonce: randomUUID(),
      now: NOW,
    });
    return { invocationId: claim.invocationId, attemptId, ownerToken };
  }

  function successPayload(seed: {
    invocationId: string;
    attemptId: string;
    ownerToken: string;
  }): Record<string, unknown> {
    return {
      invocationId: seed.invocationId,
      ownerToken: seed.ownerToken,
      attemptId: seed.attemptId,
      providerUsed: "anthropic-direct",
      modelResolved: "claude-sonnet-4-6",
      providerRequestId: "vendor-recovered",
      inputTokens: 10,
      outputTokens: 20,
      resultJson: JSON.stringify({ text: "recovered answer" }),
      resultHash: "r".repeat(64),
      now: NOW.toISOString(),
    };
  }

  it("two concurrent drainers NEVER claim the same row (FOR UPDATE SKIP LOCKED)", async () => {
    const seeds = await Promise.all(
      Array.from({ length: 10 }, () => seedRunningInvocation()),
    );
    const sink = new ObservabilitySink(sql, () => {});
    for (const seed of seeds) {
      const ok = await sink.enqueueRecovery({
        id: randomUUID(),
        invocationId: seed.invocationId,
        kind: "FINALIZE_SUCCESS",
        payload: successPayload(seed),
      });
      expect(ok).toBe(true);
    }
    const [a, b] = await Promise.all([
      claimRecoveryBatch(sql, {
        drainerToken: "drainer-a",
        now: new Date(),
        leaseMs: 60_000,
        limit: 10,
      }),
      claimRecoveryBatch(sql, {
        drainerToken: "drainer-b",
        now: new Date(),
        leaseMs: 60_000,
        limit: 10,
      }),
    ]);
    const idsA = new Set(a.map((r) => r.id));
    for (const row of b) {
      expect(idsA.has(row.id)).toBe(false); // disjoint claims
    }
    expect(a.length + b.length).toBeGreaterThanOrEqual(10);
  });

  it("drain replays a stranded FINALIZE_SUCCESS: invocation + attempt finalized, entry delivered", async () => {
    const seed = await seedRunningInvocation();
    const sink = new ObservabilitySink(sql, () => {});
    const entryId = randomUUID();
    await sink.enqueueRecovery({
      id: entryId,
      invocationId: seed.invocationId,
      kind: "FINALIZE_SUCCESS",
      payload: successPayload(seed),
    });
    const summary = await drainAiTelemetryRecovery(sql, {
      limit: 200,
      now: () => new Date(),
    });
    expect(summary.claimed).toBeGreaterThanOrEqual(1);
    const inv = await sql.query<{ status: string; resultHash: string | null }>(
      `SELECT "status", "resultHash" FROM "ai_invocations" WHERE "id" = $1`,
      [seed.invocationId],
    );
    expect(inv[0]!.status).toBe("SUCCEEDED");
    expect(inv[0]!.resultHash).toBe("r".repeat(64));
    const attempt = await sql.query<{ status: string; providerUsed: string | null }>(
      `SELECT "status", "providerUsed" FROM "ai_attempts" WHERE "id" = $1`,
      [seed.attemptId],
    );
    expect(attempt[0]!.status).toBe("SUCCEEDED");
    expect(attempt[0]!.providerUsed).toBe("anthropic-direct");
    const entry = await sql.query<{ deliveredAt: Date | null }>(
      `SELECT "deliveredAt" FROM "ai_telemetry_recovery" WHERE "id" = $1`,
      [entryId],
    );
    expect(entry[0]!.deliveredAt).not.toBeNull();
  });

  it("drain upgrades a steal-forced AMBIGUOUS to SUCCEEDED when the stranded success record IS the proof", async () => {
    const seed = await seedRunningInvocation();
    // Force the steal fence's conservative AMBIGUOUS terminal.
    await sql.query(
      `UPDATE "ai_invocations" SET "status" = 'AMBIGUOUS', "leaseExpiresAt" = NULL WHERE "id" = $1`,
      [seed.invocationId],
    );
    const sink = new ObservabilitySink(sql, () => {});
    const entryId = randomUUID();
    await sink.enqueueRecovery({
      id: entryId,
      invocationId: seed.invocationId,
      kind: "FINALIZE_SUCCESS",
      payload: successPayload(seed),
    });
    await drainAiTelemetryRecovery(sql, { limit: 200, now: () => new Date() });
    const inv = await sql.query<{ status: string }>(
      `SELECT "status" FROM "ai_invocations" WHERE "id" = $1`,
      [seed.invocationId],
    );
    expect(inv[0]!.status).toBe("SUCCEEDED");
    const entry = await sql.query<{ deliveredAt: Date | null }>(
      `SELECT "deliveredAt" FROM "ai_telemetry_recovery" WHERE "id" = $1`,
      [entryId],
    );
    expect(entry[0]!.deliveredAt).not.toBeNull();
  });

  it("drain replays a stranded FINALIZE_AMBIGUOUS into a durable AMBIGUOUS terminal", async () => {
    const seed = await seedRunningInvocation();
    const sink = new ObservabilitySink(sql, () => {});
    const entryId = randomUUID();
    await sink.enqueueRecovery({
      id: entryId,
      invocationId: seed.invocationId,
      kind: "FINALIZE_AMBIGUOUS",
      payload: {
        invocationId: seed.invocationId,
        ownerToken: seed.ownerToken,
        status: "AMBIGUOUS",
        now: NOW.toISOString(),
      },
    });
    await drainAiTelemetryRecovery(sql, { limit: 200, now: () => new Date() });
    const inv = await sql.query<{ status: string }>(
      `SELECT "status" FROM "ai_invocations" WHERE "id" = $1`,
      [seed.invocationId],
    );
    expect(inv[0]!.status).toBe("AMBIGUOUS");
    const entry = await sql.query<{ deliveredAt: Date | null }>(
      `SELECT "deliveredAt" FROM "ai_telemetry_recovery" WHERE "id" = $1`,
      [entryId],
    );
    expect(entry[0]!.deliveredAt).not.toBeNull();
  });

  it("an entry that exhausts its attempt cap becomes an EXPLICIT abandonment, never a silent drop", async () => {
    const seed = await seedRunningInvocation();
    const entryId = randomUUID();
    // maxAttempts=1 and an undrainable kind: the single claim exhausts the cap.
    await sql.query(
      `INSERT INTO "ai_telemetry_recovery"
         ("id", "invocationId", "kind", "payload", "maxAttempts")
       VALUES ($1, $2, 'ATTEMPT_TELEMETRY', '{}'::jsonb, 1)`,
      [entryId, seed.invocationId],
    );
    // leaseMs < 0 → the drain lease is already expired when abandonment runs.
    const summary = await drainAiTelemetryRecovery(sql, {
      limit: 200,
      leaseMs: -1,
      now: () => new Date(),
    });
    expect(summary.abandoned).toBeGreaterThanOrEqual(1);
    const entry = await sql.query<{
      abandonedAt: Date | null;
      deliveredAt: Date | null;
    }>(
      `SELECT "abandonedAt", "deliveredAt" FROM "ai_telemetry_recovery" WHERE "id" = $1`,
      [entryId],
    );
    expect(entry[0]!.abandonedAt).not.toBeNull();
    expect(entry[0]!.deliveredAt).toBeNull();
  });

  it("deleting an invocation with undelivered recovery rows is impossible (RESTRICT, §6.2)", async () => {
    const seed = await seedRunningInvocation();
    const sink = new ObservabilitySink(sql, () => {});
    await sink.enqueueRecovery({
      id: randomUUID(),
      invocationId: seed.invocationId,
      kind: "FINALIZE_SUCCESS",
      payload: successPayload(seed),
    });
    // The attempt row already RESTRICTs; remove it to prove the recovery FK
    // ALONE blocks the delete (the BLOCKED-row deletion hole).
    await sql.query(`DELETE FROM "ai_attempts" WHERE "id" = $1`, [seed.attemptId]);
    await expect(
      sql.query(`DELETE FROM "ai_invocations" WHERE "id" = $1`, [seed.invocationId]),
    ).rejects.toThrow();
  });
});
