/**
 * Real-Postgres integration proof for the trusted-actor hardening
 * (directive 4.5: cross-instance limiter on the REAL PG store, migration
 * artifacts in place, receipt table writable).
 *
 * GATED: runs only when PR159_PG_URL points at a DISPOSABLE Postgres whose
 * schema was pushed from this branch (scripts/dev/disposable-postgres.sh or an
 * equivalent unique-port instance). Without the env var every test is skipped
 * — the suite stays green in environments without a database, and no test
 * fabricates a pass.
 *
 *   PR159_PG_URL=postgresql://postgres@127.0.0.1:5437/sports_test npx vitest run \
 *     __tests__/actor-hardening-db.integration.test.ts
 */
import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

import {
  PostgresDurableRateLimiter,
  pruneExpiredRateLimitCounters,
} from "@/lib/community/durable-rate-limiter";

const PG_URL = process.env["PR159_PG_URL"];

const clients: PrismaClient[] = [];
function newClient(): PrismaClient {
  const client = new PrismaClient({
    datasources: { db: { url: PG_URL } },
  });
  clients.push(client);
  return client;
}

afterAll(async () => {
  await Promise.all(clients.map((c) => c.$disconnect()));
});

describe.skipIf(!PG_URL)("durable limiter on real Postgres (cross-instance)", () => {
  it("two limiter instances over two CONNECTIONS enforce one atomic quota under concurrency", async () => {
    const a = new PostgresDurableRateLimiter(newClient());
    const b = new PostgresDurableRateLimiter(newClient());
    const now = new Date();
    const key = `it-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        (i % 2 === 0 ? a : b).consume({
          scope: "integration:cross-instance",
          key,
          limit: 9,
          windowMs: 60 * 60 * 1000,
          now,
        })
      )
    );
    const allowed = results.filter((r) => r.allowed);
    expect(allowed).toHaveLength(9);
    // The stored counter never exceeds the limit (denials do not extend it).
    const max = Math.max(...allowed.map((r) => r.count ?? 0));
    expect(max).toBe(9);
  });

  it("a fresh window resets the quota; pruning removes expired counters", async () => {
    const client = newClient();
    const limiter = new PostgresDurableRateLimiter(client);
    const key = `win-${Date.now()}`;
    const windowMs = 60_000;
    const t0 = new Date("2026-07-22T10:00:30.000Z");
    const t1 = new Date("2026-07-22T10:01:01.000Z"); // next fixed window

    expect(
      (await limiter.consume({ scope: "integration:window", key, limit: 1, windowMs, now: t0 }))
        .allowed
    ).toBe(true);
    expect(
      (await limiter.consume({ scope: "integration:window", key, limit: 1, windowMs, now: t0 }))
        .allowed
    ).toBe(false);
    expect(
      (await limiter.consume({ scope: "integration:window", key, limit: 1, windowMs, now: t1 }))
        .allowed
    ).toBe(true);

    // Retention: prune everything older than 0ms relative to far future.
    await pruneExpiredRateLimitCounters(client, 0, new Date("2030-01-01T00:00:00Z"));
    const left = await client.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "rate_limit_counters" WHERE "scope" = $1`,
      "integration:window"
    );
    expect((left as Array<{ n: number }>)[0]!.n).toBe(0);
  });

  it("zero-limit consume never authorizes and writes nothing", async () => {
    const client = newClient();
    const limiter = new PostgresDurableRateLimiter(client);
    const key = `zero-${Date.now()}`;
    const decision = await limiter.consume({
      scope: "integration:zero",
      key,
      limit: 0,
      windowMs: 60_000,
    });
    expect(decision.allowed).toBe(false);
    const rows = await client.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "rate_limit_counters" WHERE "key" = $1`,
      key
    );
    expect((rows as Array<{ n: number }>)[0]!.n).toBe(0);
  });
});

describe.skipIf(!PG_URL)("actor receipts on real Postgres", () => {
  it("actor_receipts accepts the full audit contract and audit tables carry the receipt columns", async () => {
    const client = newClient();
    const receipt = await client.actorReceipt.create({
      data: {
        actorType: "SERVICE",
        subjectId: "service:settlement-worker",
        authMethod: "SERVICE_CREDENTIAL",
        authorityScope: "SERVICE",
        tenant: null,
        project: null,
        requestId: null,
        runId: "run-integration-1",
        observedAt: new Date(),
        emailSnapshot: null,
        policyVersion: "1b",
        operation: "settlement:run",
        credentialMethod: "TEST_HARNESS",
      },
    });
    expect(receipt.id).toBeTruthy();

    // The receipt-reference columns exist on every audit table (migration proof
    // at the SQL level, not just Prisma's view).
    const cols = (await client.$queryRawUnsafe(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE (table_name, column_name) IN (
         ('moderation_reports','reporterReceiptId'),
         ('moderation_actions','actorReceiptId'),
         ('moderation_appeals','appellantReceiptId'),
         ('moderation_appeals','reviewerReceiptId'),
         ('agent_handoffs','actor_receipt_id'),
         ('subagent_runs','actor_receipt_id'),
         ('subagent_runs','reviewer_receipt_id')
       )`
    )) as Array<{ table_name: string; column_name: string }>;
    expect(cols).toHaveLength(7);
  });
});
