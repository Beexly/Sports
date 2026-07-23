/**
 * M6 — online CTI-candidate miner. Two layers:
 *
 *   A. PURE (no DB, always runs): the abstract-successor relation
 *      (`abstractSuccessors`), the inductive-invariant-violation predicate
 *      (`isIndInvViolation`), and the pure mining core
 *      (`mineCandidatesFromStates`) — a synthetic state one step from GE2 has a
 *      `StartPending` successor that violates; a fully-safe state yields none.
 *
 *   B. REAL POSTGRES (gated on DATABASE_URL): the miner reads a real ledger
 *      window, projects it, and writes exactly ONE `cti_candidate` row for a
 *      window one step from GE2; a second identical run writes NONE (dedup on
 *      the deterministic id); a fully-safe window writes ZERO.
 *
 * The miner is detection/mining-only: it writes ONLY `cti_candidate` rows and
 * never edits a spec or gates a control-plane decision.
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   FORCE_REAL_PRISMA=true \
 *     DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     ../../node_modules/.bin/vitest run ai-control-plane-cti-miner-pg
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import {
  abstractSuccessors,
  isIndInvViolation,
  mineCandidatesFromStates,
  runCtiMinerPass,
  type ControlSqlClient,
} from "@/lib/ai-control-plane/internal";
import type { AbstractControlState } from "@/lib/ai-control-plane/srqc-projection";

// ─── Layer A: pure, always-runs ─────────────────────────────────────────────

const ONE_PENDING: AbstractControlState = {
  invocationId: "inv-1",
  claimPhase: "OPEN",
  exposurePhase: "HELD",
  pendingCountClass: "ONE",
  fingerprintBound: true,
  hasRejectedFp: false,
};

const SAFE_TERMINAL: AbstractControlState = {
  invocationId: "inv-2",
  claimPhase: "TERMINAL",
  exposurePhase: "NONE",
  pendingCountClass: "ZERO",
  fingerprintBound: true,
  hasRejectedFp: false,
};

describe("cti-miner pure abstract-successor relation", () => {
  it("a ONE-pending state has a StartPending successor that violates the invariant (GE2)", () => {
    expect(isIndInvViolation(ONE_PENDING)).toBe(false);
    const successors = abstractSuccessors(ONE_PENDING);
    const start = successors.find((x) => x.action === "StartPending");
    expect(start).toBeDefined();
    expect(start!.next.pendingCountClass).toBe("GE2");
    expect(isIndInvViolation(start!.next)).toBe(true);
  });

  it("mineCandidatesFromStates yields exactly one candidate from a ONE-pending state", () => {
    const candidates = mineCandidatesFromStates([ONE_PENDING]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.action).toBe("StartPending");
    expect(candidates[0]!.before).toEqual(ONE_PENDING);
    expect(candidates[0]!.after.pendingCountClass).toBe("GE2");
  });

  it("a fully-safe terminal state yields zero candidates and no violating successor", () => {
    expect(isIndInvViolation(SAFE_TERMINAL)).toBe(false);
    for (const { next } of abstractSuccessors(SAFE_TERMINAL)) {
      expect(isIndInvViolation(next)).toBe(false);
    }
    expect(mineCandidatesFromStates([SAFE_TERMINAL])).toHaveLength(0);
  });

  it("RejectFp is only enabled when fingerprintBound (RejectedImpliesBound) and never manufactures the unbound-rejected violation", () => {
    const successors = abstractSuccessors(ONE_PENDING);
    const reject = successors.find((x) => x.action === "RejectFp");
    expect(reject).toBeDefined();
    // Guard held (bound), so the successor is bound+rejected — NOT a violation.
    expect(isIndInvViolation(reject!.next)).toBe(false);

    // On an (abstractly) unbound state, RejectFp is disabled — no successor,
    // so the miner can never step INTO hasRejectedFp && !fingerprintBound.
    const unbound: AbstractControlState = { ...ONE_PENDING, fingerprintBound: false };
    expect(abstractSuccessors(unbound).some((x) => x.action === "RejectFp")).toBe(false);
  });

  it("abstractSuccessors is total and never mutates its input", () => {
    const snapshot = JSON.stringify(ONE_PENDING);
    abstractSuccessors(ONE_PENDING);
    expect(JSON.stringify(ONE_PENDING)).toBe(snapshot);
    // Total on a GE2 (already-violating) input too — no throw.
    expect(() =>
      abstractSuccessors({ ...ONE_PENDING, pendingCountClass: "GE2" }),
    ).not.toThrow();
  });
});

// ─── Layer B: real Postgres ─────────────────────────────────────────────────

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "cti_miner_acceptance";

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

suite("cti-miner against real Postgres", () => {
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
      "20260722240000_add_cti_candidate",
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
    await pool.query(`TRUNCATE "control_event_ledger", "cti_candidate" CASCADE`);
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

  async function candidateRows(): Promise<
    ReadonlyArray<{ id: string; action: string; before: unknown; after: unknown }>
  > {
    const res = await pool.query(
      `SELECT "id", "action", "before", "after" FROM "cti_candidate" ORDER BY "createdAt" ASC`,
    );
    return res.rows;
  }

  it("a window one step from GE2 writes exactly one candidate; re-running writes none (dedup)", async () => {
    // ONE attempt started, invocation still OPEN => projected state is ONE-pending,
    // which is NOT a violation but has a StartPending successor that IS (GE2).
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

    const first = await runCtiMinerPass(sql, { sinceInclusive: since, untilExclusive: until });
    expect(first.candidatesFound).toBe(1);
    expect(first.candidatesWritten).toBe(1);

    const afterFirst = await candidateRows();
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]!.action).toBe("StartPending");
    expect((afterFirst[0]!.before as { pendingCountClass: string }).pendingCountClass).toBe("ONE");
    expect((afterFirst[0]!.after as { pendingCountClass: string }).pendingCountClass).toBe("GE2");
    expect((afterFirst[0]!.before as { invocationId: string }).invocationId).toBe(invocationId);

    // Re-run the identical window: candidate still found, but no NEW row.
    const second = await runCtiMinerPass(sql, { sinceInclusive: since, untilExclusive: until });
    expect(second.candidatesFound).toBe(1);
    expect(second.candidatesWritten).toBe(0);
    expect(await candidateRows()).toHaveLength(1);
  });

  it("a fully-safe window (attempt started then finalized) writes zero candidates", async () => {
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
      `${att1}:ATTEMPT_FAILED`,
      "ai_attempt",
      att1,
      "ATTEMPT_FAILED",
      { invocationId, attemptId: att1, status: "FAILED" },
      new Date(base.getTime() + 1_000),
    );
    await insertEvent(
      `${invocationId}:FINALIZED_SUCCESS`,
      "ai_invocation",
      invocationId,
      "FINALIZED_SUCCESS",
      { invocationId },
      new Date(base.getTime() + 2_000),
    );

    const summary = await runCtiMinerPass(sql, { sinceInclusive: since, untilExclusive: until });
    // Terminal claim with ZERO pending => no StartPending/EndPending successor
    // that can reach GE2, and RejectFp stays bound => no candidate.
    expect(summary.candidatesFound).toBe(0);
    expect(summary.candidatesWritten).toBe(0);
    expect(await candidateRows()).toHaveLength(0);
  });
});
