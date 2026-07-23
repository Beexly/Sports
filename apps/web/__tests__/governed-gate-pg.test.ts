/**
 * Real-Postgres regression for createGovernedSrqcGate's ledger window read.
 *
 * Codex finding (PR #188): the gate read ONLY `source: "ai_invocation"`
 * events, but the GE2 (two-concurrently-pending) violation is built from
 * `ATTEMPT_STARTED`/`ATTEMPT_FAILED`, which are `source: "ai_attempt"` — so
 * a real two-pending window was filtered out before `admitUnderSRQC` ever
 * saw it, and the gate ADMITted instead of REFUSEd under `SRQC_ENFORCE=1`.
 * This test seeds exactly that window and asserts the gate now REFUSEs.
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   FORCE_REAL_PRISMA=true \
 *     DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     ../../node_modules/.bin/vitest run governed-gate-pg
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import { createGovernedSrqcGate } from "@/lib/ai-control-plane/governed-gate";
import type { ControlSqlClient } from "@/lib/ai-control-plane/internal";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "governed_gate_pg_test";
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

suite("createGovernedSrqcGate against real Postgres", () => {
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
    await pool.query(`TRUNCATE "control_event_ledger" CASCADE`);
  });

  async function insertEvent(
    eventId: string,
    source: string,
    sourceId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO "control_event_ledger" ("eventId", "source", "sourceId", "eventType", "payload", "createdAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, now())`,
      [eventId, source, sourceId, eventType, JSON.stringify(payload)],
    );
  }

  it("REFUSEs under SRQC_ENFORCE=1 for a real two-pending-attempt window (ai_attempt events)", async () => {
    // Inject the env instead of mutating global process.env — a global
    // mutation would race against any other test file reading/resetting
    // SRQC_ENFORCE concurrently under a parallel test runner.
    const invocationId = randomUUID();
    const att1 = randomUUID();
    const att2 = randomUUID();

    // Two attempts started, neither terminal => GE2 (two concurrently
    // pending). Both events are source:"ai_attempt", NOT "ai_invocation".
    await insertEvent(`${att1}:ATTEMPT_STARTED`, "ai_attempt", att1, "ATTEMPT_STARTED", {
      invocationId,
      attemptId: att1,
    });
    await insertEvent(`${att2}:ATTEMPT_STARTED`, "ai_attempt", att2, "ATTEMPT_STARTED", {
      invocationId,
      attemptId: att2,
    });

    const gate = createGovernedSrqcGate({ sql, env: { SRQC_ENFORCE: "1" } });
    const result = await gate({ tool: "ai.invoke", args: {}, ctx: { agentId: "agent-1" } });

    expect(result.decision).toBe("REFUSE");
    expect(result.reasons.some((r) => r.includes("GE2"))).toBe(true);
  });

  it("SHADOW (no SRQC_ENFORCE) never REFUSEs, even for the same GE2 window", async () => {
    const invocationId = randomUUID();
    const att1 = randomUUID();
    const att2 = randomUUID();
    await insertEvent(`${att1}:ATTEMPT_STARTED`, "ai_attempt", att1, "ATTEMPT_STARTED", {
      invocationId,
      attemptId: att1,
    });
    await insertEvent(`${att2}:ATTEMPT_STARTED`, "ai_attempt", att2, "ATTEMPT_STARTED", {
      invocationId,
      attemptId: att2,
    });

    const gate = createGovernedSrqcGate({ sql, env: {} });
    const result = await gate({ tool: "ai.invoke", args: {}, ctx: { agentId: "agent-1" } });

    expect(result.decision).toBe("ADMIT");
  });

  it("non-gated tools ADMIT without touching the ledger", async () => {
    const gate = createGovernedSrqcGate({ sql, env: { SRQC_ENFORCE: "1" } });
    const result = await gate({ tool: "tool.read", args: {}, ctx: { agentId: "agent-1" } });
    expect(result).toEqual({ decision: "ADMIT", reasons: [] });
  });
});
