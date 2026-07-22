/**
 * Track B (exactly-once runtime handoff, 2026-07-22) — the formal-receipt
 * detection job and its cron route.
 *
 * Two halves, matching the established conventions in this test dir:
 *
 *  1. Route contract (auth gating, response shape) — mocked job, in
 *     isolation, same pattern as repair-checkout-attempts-cron-route.test.ts.
 *
 *  2. Job logic against REAL Postgres — gated on DATABASE_URL via the same
 *     HAS_DB convention as ai-control-plane-event-ledger-pg.test.ts, because
 *     the properties that matter (GE2 detectability, zero false positives on
 *     a legal sequential shape, and exactly-once log de-duplication across
 *     repeated runs over the SAME window) all depend on the real
 *     `control_event_ledger` / `processed_event` schema and its FOREIGN KEY,
 *     which a mock cannot meaningfully stand in for.
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh   # postgresql://postgres@127.0.0.1:5433/sports_test
 *   FORCE_REAL_PRISMA=true DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     npx vitest run formal-receipt-cron
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import type { ControlSqlClient } from "@/lib/ai-control-plane/control-store";

// ─── 1. Route contract (mocked job) ────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  runFormalReceiptPassProduction: vi.fn(),
}));

vi.mock("@/lib/ai-control-plane", () => ({
  runFormalReceiptPassProduction: mocks.runFormalReceiptPassProduction,
}));

const CLEAN_SUMMARY = {
  windowSinceInclusive: "2026-07-21T00:00:00.000Z",
  windowUntilExclusive: "2026-07-22T02:00:00.000Z",
  eventsExamined: 4,
  eventsNewlyMarkedProcessed: 4,
  violationsDetected: [],
  violationsNewlyLogged: 0,
};

function req(auth?: string): Request {
  return new Request(
    "http://localhost/api/cron/run-formal-receipt",
    auth ? { headers: { authorization: auth } } : undefined,
  );
}

describe("GET /api/cron/run-formal-receipt", () => {
  beforeEach(() => {
    mocks.runFormalReceiptPassProduction.mockReset();
    process.env["CRON_SECRET"] = "s3cret";
  });
  afterEach(() => {
    delete process.env["CRON_SECRET"];
  });

  it("rejects a missing/wrong bearer token with 401 and never runs the job", async () => {
    const { GET } = await import("@/app/api/cron/run-formal-receipt/route");
    for (const request of [req(), req("Bearer wrong")]) {
      const res = await GET(request);
      expect(res.status).toBe(401);
    }
    expect(mocks.runFormalReceiptPassProduction).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is unset (never an open cron)", async () => {
    delete process.env["CRON_SECRET"];
    const { GET } = await import("@/app/api/cron/run-formal-receipt/route");
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(mocks.runFormalReceiptPassProduction).not.toHaveBeenCalled();
  });

  it("runs the job and returns ok=true with the full summary on a clean pass", async () => {
    mocks.runFormalReceiptPassProduction.mockResolvedValue(CLEAN_SUMMARY);
    const { GET } = await import("@/app/api/cron/run-formal-receipt/route");
    const res = await GET(req("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.eventsExamined).toBe(4);
    expect(body.violationsDetected).toEqual([]);
  });

  it("ok=false when a violation was detected — an operator should look", async () => {
    mocks.runFormalReceiptPassProduction.mockResolvedValue({
      ...CLEAN_SUMMARY,
      violationsDetected: [
        {
          invocationId: "inv-x",
          pendingCountClass: "GE2",
          hasRejectedFp: false,
          fingerprintBound: true,
          witnessEventId: "att-2:ATTEMPT_STARTED",
        },
      ],
      violationsNewlyLogged: 1,
    });
    const { GET } = await import("@/app/api/cron/run-formal-receipt/route");
    const res = await GET(req("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.violationsDetected).toHaveLength(1);
  });

  it("fails closed (500) on a store problem — never a silently clean 200", async () => {
    mocks.runFormalReceiptPassProduction.mockRejectedValue(
      new Error("control_event_ledger read returned a non-array"),
    );
    const { GET } = await import("@/app/api/cron/run-formal-receipt/route");
    const res = await GET(req("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
  });
});

// ─── 2. Job logic against real Postgres ────────────────────────────────────

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "formal_receipt_job_acceptance";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "packages", "db", "prisma", "migrations");

suite("Track B — formal-receipt job against real Postgres", () => {
  let pool: Pool;
  let sql: ControlSqlClient;
  // Imported dynamically after the module mock above is already installed for
  // this file; runFormalReceiptPass itself is NOT mocked, only the
  // production wrapper used by the route half above.
  let runFormalReceiptPass: typeof import("@/lib/ai-control-plane/formal-receipt-job").runFormalReceiptPass;

  beforeAll(async () => {
    vi.resetModules();
    ({ runFormalReceiptPass } = await vi.importActual(
      "@/lib/ai-control-plane/formal-receipt-job",
    ));

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
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
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    // Each test uses a window keyed off `new Date()`, and windows inside the
    // same fast test run can overlap in wall-clock time — truncate between
    // tests so one test's rows can never leak into another's window.
    await pool.query(`TRUNCATE "processed_event", "control_event_ledger"`);
  });

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

  it("a legal sequential shape (attempt fails before the next starts) produces ZERO violations", async () => {
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
      `${att1}:ATTEMPT_FAILED`,
      "ai_attempt",
      att1,
      "ATTEMPT_FAILED",
      { invocationId, attemptId: att1, status: "FAILED" },
      new Date(base.getTime() + 1_000),
    );
    await insertEvent(
      `${att2}:ATTEMPT_STARTED`,
      "ai_attempt",
      att2,
      "ATTEMPT_STARTED",
      { invocationId, attemptId: att2, status: "DISPATCHED" },
      new Date(base.getTime() + 2_000),
    );
    await insertEvent(
      `${invocationId}:FINALIZED_SUCCESS`,
      "ai_invocation",
      invocationId,
      "FINALIZED_SUCCESS",
      { invocationId },
      new Date(base.getTime() + 3_000),
    );

    const summary = await runFormalReceiptPass(sql, {
      sinceInclusive: since,
      untilExclusive: until,
    });

    expect(summary.eventsExamined).toBe(4);
    expect(summary.violationsDetected).toHaveLength(0);
    expect(summary.violationsNewlyLogged).toBe(0);
  });

  it("a synthetic GE2 shape (two ATTEMPT_STARTED for one invocation, no terminal between) is detected", async () => {
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
      new Date(base.getTime() + 1_000), // started before att1 resolved — forbidden CTI shape
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const summary = await runFormalReceiptPass(sql, {
        sinceInclusive: since,
        untilExclusive: until,
      });

      expect(summary.eventsExamined).toBe(2);
      expect(summary.violationsDetected).toHaveLength(1);
      expect(summary.violationsDetected[0]!.invocationId).toBe(invocationId);
      expect(summary.violationsDetected[0]!.pendingCountClass).toBe("GE2");
      expect(summary.violationsDetected[0]!.witnessEventId).toBe(`${att2}:ATTEMPT_STARTED`);
      expect(summary.violationsNewlyLogged).toBe(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("running the SAME window twice logs the violation at most once (exactly-once via processed_event)", async () => {
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

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const first = await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });
      const second = await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });

      expect(first.violationsDetected).toHaveLength(1);
      expect(first.violationsNewlyLogged).toBe(1);

      // Second run over the identical window: the violation is still
      // DETECTED (it is a real, still-present projected state) but the log
      // line is NOT re-emitted, and no events are newly marked processed —
      // the pure no-op property the Pattern D idiom exists to guarantee.
      expect(second.violationsDetected).toHaveLength(1);
      expect(second.violationsNewlyLogged).toBe(0);
      expect(second.eventsNewlyMarkedProcessed).toBe(0);

      expect(errorSpy).toHaveBeenCalledTimes(1); // NOT twice
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("readRecentEvents source filter is unused here — a window with no events is a clean, zero-violation no-op", async () => {
    const since = new Date(Date.UTC(2020, 0, 1));
    const until = new Date(Date.UTC(2020, 0, 1, 0, 1));
    const summary = await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });
    expect(summary.eventsExamined).toBe(0);
    expect(summary.violationsDetected).toHaveLength(0);
  });
});
