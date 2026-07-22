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
});
