/**
 * W1 shadow metrics — acceptance against REAL Postgres.
 *
 * Proves three things a mock cannot:
 *   1. A GE2 window causes `runFormalReceiptPass` to write a
 *      `srqc_shadow_metric` row with `ge2Count: 1`, `admitWouldRefuse: 1`.
 *   2. A clean (legal sequential) window ALSO writes a shadow row —
 *      `ge2Count: 0`, `admitWouldRefuse: 0` — proving W1 records base rates
 *      on every pass, not just violation spikes (the property that
 *      distinguishes it from the violation-only `formal_incident` write).
 *   3. Re-running over the SAME window writes a SECOND shadow row (no
 *      dedup on window — see shadow-metrics.ts's doc comment), and,
 *      critically, the SHADOW admission decision over an equivalent GE2
 *      event set is still `ADMIT` even though a violation was recorded —
 *      the metric write is a pure side observation, never a gate.
 *
 * Gated on DATABASE_URL, same HAS_DB convention as the other *-pg.test.ts
 * files in this directory.
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   FORCE_REAL_PRISMA=true \
 *     DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     ../../node_modules/.bin/vitest run ai-control-plane-shadow-metrics-pg
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import { runFormalReceiptPass } from "@/lib/ai-control-plane/formal-receipt-job";
import { admitUnderSRQC } from "@/lib/ai-control-plane/srqc-projection";
import type { ControlSqlClient } from "@/lib/ai-control-plane/control-store";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "shadow_metrics_acceptance";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "packages", "db", "prisma", "migrations");

suite("W1 shadow metrics against real Postgres", () => {
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
      "20260722220000_add_control_event_ledger",
      "20260722230000_add_formal_incident_srqc_version",
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
      `TRUNCATE "processed_event", "control_event_ledger", "formal_incident", "srqc_version", "srqc_shadow_metric"`,
    );
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

  async function shadowRows(): Promise<
    ReadonlyArray<{
      eventsSeen: number;
      ge2Count: number;
      rejectedUnbound: number;
      admitWouldRefuse: number;
      srqcVersion: number | null;
    }>
  > {
    const res = await pool.query(
      `SELECT "eventsSeen", "ge2Count", "rejectedUnbound", "admitWouldRefuse", "srqcVersion"
         FROM "srqc_shadow_metric" ORDER BY "createdAt" ASC`,
    );
    return res.rows;
  }

  it("a GE2 window writes a shadow row with ge2Count:1, admitWouldRefuse:1, and SHADOW admission still ADMITs", async () => {
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
    let summary;
    try {
      summary = await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });
    } finally {
      errorSpy.mockRestore();
    }

    expect(summary.shadowMetric.eventsSeen).toBe(2);
    expect(summary.shadowMetric.ge2Count).toBe(1);
    expect(summary.shadowMetric.rejectedUnbound).toBe(0);
    expect(summary.shadowMetric.admitWouldRefuse).toBe(1);

    const rows = await shadowRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ eventsSeen: 2, ge2Count: 1, rejectedUnbound: 0, admitWouldRefuse: 1 });

    // The metric write is a pure side observation — it must never change the
    // SHADOW-mode admission decision. Evaluate the identical event shape
    // through admitUnderSRQC's own SHADOW path directly, independent of the
    // shadow-metrics write above, and assert it still ADMITs despite the
    // recorded violation.
    const admission = admitUnderSRQC(
      [
        {
          eventType: "ATTEMPT_STARTED",
          source: "ai_attempt",
          sourceId: att1,
          payload: { invocationId, attemptId: att1 },
        },
        {
          eventType: "ATTEMPT_STARTED",
          source: "ai_attempt",
          sourceId: att2,
          payload: { invocationId, attemptId: att2 },
        },
      ],
      "SHADOW",
    );
    expect(admission.decision).toBe("ADMIT");
    expect(admission.violations.length).toBe(1);
  });

  it("a clean (legal sequential) window also writes a shadow row, with zero counts", async () => {
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

    const summary = await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });

    expect(summary.violationsDetected).toHaveLength(0);
    expect(summary.shadowMetric.eventsSeen).toBe(2);
    expect(summary.shadowMetric.ge2Count).toBe(0);
    expect(summary.shadowMetric.rejectedUnbound).toBe(0);
    expect(summary.shadowMetric.admitWouldRefuse).toBe(0);

    const rows = await shadowRows();
    expect(rows).toHaveLength(1);
  });

  it("re-running over the SAME window writes a SECOND shadow row (no dedup on window)", async () => {
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

    await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });
    await runFormalReceiptPass(sql, { sinceInclusive: since, untilExclusive: until });

    const rows = await shadowRows();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ eventsSeen: 1, ge2Count: 0 });
    expect(rows[1]).toMatchObject({ eventsSeen: 1, ge2Count: 0 });
  });
});
