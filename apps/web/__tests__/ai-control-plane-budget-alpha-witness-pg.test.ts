/**
 * W5 second α consumer — acceptance against REAL Postgres.
 *
 * Proves the core claim: `budget_alpha_witness` and `formal-receipt-job.ts`
 * (Track B) independently consume the SAME ledger window through the SAME
 * `projectWindow` abstraction, via two distinct `processed_event` sinks that
 * never interfere with each other — the per-sink exactly-once primitive
 * genuinely supports more than one consumer of one event.
 *
 * Gated on DATABASE_URL, same convention as the other *-pg.test.ts files.
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   FORCE_REAL_PRISMA=true \
 *     DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     ../../node_modules/.bin/vitest run ai-control-plane-budget-alpha-witness-pg
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import { runFormalReceiptPass } from "@/lib/ai-control-plane/formal-receipt-job";
import { runBudgetAlphaWitnessPass, BUDGET_ALPHA_WITNESS_SINK } from "@/lib/ai-control-plane/budget-alpha-witness";
import type { ControlSqlClient } from "@/lib/ai-control-plane/control-store";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "budget_alpha_witness_acceptance";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "packages", "db", "prisma", "migrations");

suite("W5 budget_alpha_witness against real Postgres", () => {
  let pool: Pool;
  let sql: ControlSqlClient;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      options: `-c search_path=${SCHEMA}`,
    });
    await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await pool.query(`CREATE SCHEMA ${SCHEMA}`);
    for (const dir of [
      "20260722140000_add_ai_control_plane_ledger",
      "20260722150001_add_ai_budget_reservations",
      "20260722220000_add_control_event_ledger",
      "20260722230000_add_formal_incident_srqc_version",
      // W1 (#197, merged before this branch) — runFormalReceiptPass now
      // writes one SrqcShadowMetric row per pass (clean or not), see
      // shadow-metrics.ts. Needed since this test's "both consumers"
      // scenario calls runFormalReceiptPass directly.
      "20260723130000_add_srqc_shadow_metric",
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
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE "processed_event", "control_event_ledger", "formal_incident", "srqc_version", "srqc_shadow_metric", "ai_budget_reservations", "ai_budget_windows", "ai_attempts", "ai_invocations" CASCADE`,
    );
  });

  async function seedInvocation(id: string): Promise<void> {
    await pool.query(
      `INSERT INTO "ai_invocations"
         ("id", "requestId", "taskClass", "surface", "entity", "dataClass",
          "costMode", "envClass", "envClassSource", "policyVersion",
          "actorType", "actorSubjectId", "status", "requestFingerprint",
          "executionOwnerToken", "leaseExpiresAt")
       VALUES ($1, $2, 'brief.daily-summary', 'brief', 'GSE', 'internal',
               'NO_BILLABLE_EXTERNAL', 'test', 'explicit', '2026-07-22.1',
               'SERVICE', 'service:witness-test', 'RUNNING', $3,
               'owner-token-witness-test', now() + interval '1 hour')`,
      [id, `req-${id}`, "a".repeat(64)],
    );
  }

  async function seedBudgetWindow(id: string, capUsd: string): Promise<void> {
    await pool.query(
      `INSERT INTO "ai_budget_windows" ("id", "scopeKind", "capUsd") VALUES ($1, 'DAILY', $2::numeric)`,
      [id, capUsd],
    );
  }

  async function seedHeldReservation(invocationId: string, windowId: string): Promise<void> {
    await pool.query(
      `INSERT INTO "ai_budget_reservations"
         ("id", "invocationId", "windowId", "reservationVersion", "amountUsd", "state", "expiresAt")
       VALUES ($1, $2, $3, 1, 0.500000, 'HELD', now() + interval '1 hour')`,
      [randomUUID(), invocationId, windowId],
    );
  }

  async function insertEvent(
    eventId: string,
    source: string,
    sourceId: string,
    eventType: string,
    payload: Record<string, unknown>,
    createdAt: Date,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO "control_event_ledger" ("eventId", "source", "sourceId", "eventType", "payload", "createdAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [eventId, source, sourceId, eventType, JSON.stringify(payload), createdAt],
    );
  }

  it("both consumers independently observe the same GE2 window via two distinct processed_event sinks", async () => {
    const invocationId = randomUUID();
    const att1 = randomUUID();
    const att2 = randomUUID();
    const base = new Date();
    const since = new Date(base.getTime() - 60_000);
    const until = new Date(base.getTime() + 60_000);

    await seedInvocation(invocationId);
    await seedBudgetWindow("witness-window-1", "10.00");
    await seedHeldReservation(invocationId, "witness-window-1");

    await insertEvent(
      `${att1}:ATTEMPT_STARTED`,
      "ai_attempt",
      att1,
      "ATTEMPT_STARTED",
      { invocationId, attemptId: att1, status: "DISPATCHED" },
      base,
    );
    await insertEvent(
      `${att2}:ATTEMPT_STARTED`,
      "ai_attempt",
      att2,
      "ATTEMPT_STARTED",
      { invocationId, attemptId: att2, status: "DISPATCHED" },
      new Date(base.getTime() + 1_000),
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    let formalSummary, witnessSummary;
    try {
      formalSummary = await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });
      witnessSummary = await runBudgetAlphaWitnessPass(sql, { sinceInclusive: since, untilExclusive: until });
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }

    // 1. Both consumers detected the same invocation.
    expect(formalSummary.violationsDetected).toHaveLength(1);
    expect(formalSummary.violationsDetected[0]!.invocationId).toBe(invocationId);
    expect(witnessSummary.observationsDetected).toHaveLength(1);
    const observation = witnessSummary.observationsDetected[0]!;
    expect(observation.invocationId).toBe(invocationId);
    expect(observation.pendingCountClass).toBe("GE2");
    expect(observation.exposurePhase).toBe("HELD");
    expect(observation.liveBudgetReservationFound).toBe(true);

    const witnessEventId = observation.witnessEventId;
    expect(formalSummary.violationsDetected[0]!.witnessEventId).toBe(witnessEventId);

    // 2. Cross-sink independence: the witness eventId is recorded as
    // processed under THREE separate, non-colliding sinks — Track B's own
    // per-event "examined" bookkeeping ("formal_receipt"), Track B's
    // violation-log dedup ("formal_receipt_violation"), and this module's
    // own witness sink — proving a single eventId can be independently
    // marked by more than one consumer without collision.
    const sinkRows = await pool.query(
      `SELECT "sink" FROM "processed_event" WHERE "eventId" = $1 ORDER BY "sink"`,
      [witnessEventId],
    );
    expect(sinkRows.rows.map((r: { sink: string }) => r.sink)).toEqual([
      BUDGET_ALPHA_WITNESS_SINK,
      "formal_receipt",
      "formal_receipt_violation",
    ]);

    // 3. Idempotency re-run: a second pass over the same window logs zero
    // NEW observations/violations for either consumer.
    const formalSecond = await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });
    const witnessSecond = await runBudgetAlphaWitnessPass(sql, { sinceInclusive: since, untilExclusive: until });
    expect(formalSecond.violationsNewlyLogged).toBe(0);
    expect(witnessSecond.observationsNewlyLogged).toBe(0);
  });

  it("a legal sequential window (no violation) yields zero observations — not a false-positive generator", async () => {
    const invocationId = randomUUID();
    const att1 = randomUUID();
    const base = new Date();
    const since = new Date(base.getTime() - 60_000);
    const until = new Date(base.getTime() + 60_000);

    await insertEvent(
      `${att1}:ATTEMPT_STARTED`,
      "ai_attempt",
      att1,
      "ATTEMPT_STARTED",
      { invocationId, attemptId: att1, status: "DISPATCHED" },
      base,
    );
    await insertEvent(
      `${invocationId}:FINALIZED_SUCCESS`,
      "ai_invocation",
      invocationId,
      "FINALIZED_SUCCESS",
      { invocationId, attemptId: att1 },
      new Date(base.getTime() + 1_000),
    );

    const witnessSummary = await runBudgetAlphaWitnessPass(sql, { sinceInclusive: since, untilExclusive: until });
    expect(witnessSummary.observationsDetected).toHaveLength(0);
    expect(witnessSummary.observationsNewlyLogged).toBe(0);
  });

  it("a GE2 window with NO live budget reservation still witnesses, with liveBudgetReservationFound:false", async () => {
    const invocationId = randomUUID();
    const att1 = randomUUID();
    const att2 = randomUUID();
    const base = new Date();
    const since = new Date(base.getTime() - 60_000);
    const until = new Date(base.getTime() + 60_000);

    await insertEvent(
      `${att1}:ATTEMPT_STARTED`,
      "ai_attempt",
      att1,
      "ATTEMPT_STARTED",
      { invocationId, attemptId: att1, status: "DISPATCHED" },
      base,
    );
    await insertEvent(
      `${att2}:ATTEMPT_STARTED`,
      "ai_attempt",
      att2,
      "ATTEMPT_STARTED",
      { invocationId, attemptId: att2, status: "DISPATCHED" },
      new Date(base.getTime() + 1_000),
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    let witnessSummary;
    try {
      witnessSummary = await runBudgetAlphaWitnessPass(sql, { sinceInclusive: since, untilExclusive: until });
    } finally {
      warnSpy.mockRestore();
    }

    expect(witnessSummary.observationsDetected).toHaveLength(1);
    expect(witnessSummary.observationsDetected[0]!.liveBudgetReservationFound).toBe(false);
  });
});
