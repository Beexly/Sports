/**
 * §10.9 acceptance against REAL Postgres — the properties a mock can never
 * prove:
 *
 *   1. the DB cap CHECK itself fires (over-cap and negative rows are
 *      unrepresentable on an ACTIVE window; over-cap is representable ONLY
 *      with OVERAGE_LOCKED);
 *   2. the conditional-UPDATE reservation admits exactly the set of holds
 *      that fit (UPDATE 1 vs UPDATE 0);
 *   3. 100 CONCURRENT END-TO-END invocations through the real §9 pipeline
 *      (real claim store + real budget engine, fake transport) stay within
 *      the cap: exactly the set that fits authorizes, the rest are
 *      BUDGET_BLOCKED with NO attempt dispatched, and the post-storm
 *      invariant holds; AND (Decision A permanent-consume) a SECOND storm
 *      against the same window, after the first wave's successes settled,
 *      sees only the reduced spendable balance and admits strictly FEWER —
 *      settled spend is consumed from the cap forever, never re-admitted;
 *   4. §10.2 actual > hold: the real charge is preserved over-cap, the window
 *      locks, further reserves are refused;
 *   5. §10.9 crash recovery: a crash between reserve and dispatch frees the
 *      hold via the sweeper; a crash between dispatch and settle converts it
 *      to an unreleasable RECONCILIATION_HOLD.
 *
 * Gated on AI_BUDGET_PG_URL. CI sets it to the workflow's Postgres service,
 * making this suite MANDATORY there, and uploads the JSON acceptance
 * artifact this file emits (test-artifacts/ai-budget-acceptance.json).
 *
 * Local run:
 *   PORT=5434 DATADIR=/tmp/budget-pg scripts/dev/disposable-postgres.sh   # adapted
 *   AI_BUDGET_PG_URL="postgresql://postgres@127.0.0.1:5434/sports_test" \
 *     npx vitest run ai-control-plane-budget-pg
 *
 * The suite installs the ledger + budget migrations into a DEDICATED schema
 * (ai_budget_acceptance), dropped and recreated each run, so the CHECK
 * constraints are guaranteed present even when the shared database was
 * created by `prisma db push` (which emits no CHECKs).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import {
  reserve,
  settleProvisional,
  sweepExpired,
  createLedgeredDispatch,
  createPgControlStore,
  type AuthoritativeControlStore,
  type BudgetDb,
  type ControlSqlClient,
} from "@/lib/ai-control-plane/internal";
import { usdToMicros } from "@/lib/ai-control-plane/budget";
import type { AiDispatchPlan } from "@/lib/ai-control-plane/internal";
import type {
  AiTaskInvocationRequest,
  EffectiveAuthority,
} from "@/lib/ai-control-plane/contracts";
import { BudgetBlocked, AmbiguousCharge } from "@/lib/ai-control-plane/errors";
import { getTaskPolicy } from "@/lib/ai-control-plane/policy-registry";
import { resolveEffectiveAuthority } from "@/lib/ai-control-plane/validation";
import { serviceActor } from "@/lib/auth/actor";

const PG_URL = process.env["AI_BUDGET_PG_URL"];
const suite = PG_URL ? describe : describe.skip;

const SCHEMA = "ai_budget_acceptance";
const ACTOR = serviceActor({ subjectId: "service:budget-pg-test" });
const WINDOW_ID = "entity:GSE:daily:acceptance";

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

function pgBudgetDb(pool: Pool): BudgetDb {
  const over = (runner: Pool | PoolClient): BudgetDb => ({
    async $executeRawUnsafe(text: string, ...values: unknown[]) {
      const res = await runner.query(text, values as unknown[]);
      return res.rowCount ?? 0;
    },
    async $queryRawUnsafe<T = unknown>(text: string, ...values: unknown[]) {
      const res = await runner.query(text, values as unknown[]);
      return res.rows as T;
    },
    async $transaction<T>(fn: (tx: BudgetDb) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(over(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  });
  return over(pool);
}

suite("§10.9 budget acceptance against real Postgres", () => {
  let pool: Pool;
  let budgetDb: BudgetDb;
  let sql: ControlSqlClient;
  let store: AuthoritativeControlStore;
  const NOW = new Date();
  const artifact: Record<string, unknown> = {
    suite: "ai-control-plane-budget-pg",
    startedAt: NOW.toISOString(),
  };

  beforeAll(async () => {
    pool = new Pool({
      connectionString: PG_URL,
      max: 25,
      options: `-c search_path=${SCHEMA}`,
    });
    // Fresh dedicated schema with the REAL migration SQL (CHECKs included).
    await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await pool.query(`CREATE SCHEMA ${SCHEMA}`);
    for (const dir of [
      "20260722140000_add_ai_control_plane_ledger",
      "20260722150001_add_ai_budget_reservations",
    ]) {
      const ddl = readFileSync(join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
      await pool.query(ddl);
    }
    budgetDb = pgBudgetDb(pool);
    sql = {
      async query<T>(text: string, params: readonly unknown[]): Promise<T[]> {
        const res = await pool.query(text, params as unknown[]);
        return res.rows as T[];
      },
    };
    store = createPgControlStore(sql);
  }, 60_000);

  afterAll(async () => {
    artifact["finishedAt"] = new Date().toISOString();
    const dir = join(__dirname, "..", "test-artifacts");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "ai-budget-acceptance.json"),
      JSON.stringify(artifact, null, 2),
    );
    await pool?.end();
  });

  async function seedWindow(id: string, capUsd: string): Promise<void> {
    await pool.query(
      `INSERT INTO "ai_budget_windows" ("id", "scopeKind", "capUsd")
       VALUES ($1, 'DAILY', $2::numeric)
       ON CONFLICT ("id") DO NOTHING`,
      [id, capUsd],
    );
  }

  async function seedInvocation(id: string): Promise<void> {
    await pool.query(
      `INSERT INTO "ai_invocations"
         ("id", "requestId", "taskClass", "surface", "entity", "dataClass",
          "costMode", "envClass", "envClassSource", "policyVersion",
          "actorType", "actorSubjectId", "status", "requestFingerprint")
       VALUES ($1, $2, 'brief.daily-summary', 'brief', 'GSE', 'internal',
               'BUDGETED_CASH', 'test', 'explicit', '2026-07-22.1',
               'SERVICE', 'service:budget-pg-test', 'RUNNING', $3)`,
      [id, `req-${id}`, "a".repeat(64)],
    );
  }

  async function windowRow(id: string): Promise<{
    state: string;
    reservedUsd: string;
    provisionalUsd: string;
    confirmedBilledUsd: string;
    capUsd: string;
    invariant: boolean;
  }> {
    const res = await pool.query(
      `SELECT "state", "reservedUsd"::text AS "reservedUsd",
              "provisionalUsd"::text AS "provisionalUsd",
              "confirmedBilledUsd"::text AS "confirmedBilledUsd",
              "capUsd"::text AS "capUsd",
              ("reservedUsd" + "provisionalUsd" + "confirmedBilledUsd" <= "capUsd")
                AS "invariant"
         FROM "ai_budget_windows" WHERE "id" = $1`,
      [id],
    );
    return res.rows[0];
  }

  // ── 1. The DB CHECK constraints themselves (§10.2/§10.9) ───────────────────────

  it("DB cap CHECK: an over-cap write on an ACTIVE window is REJECTED by Postgres", async () => {
    await seedWindow("chk-cap", "1.000000");
    await expect(
      pool.query(
        `UPDATE "ai_budget_windows" SET "reservedUsd" = $1::numeric WHERE "id" = $2`,
        ["1.000001", "chk-cap"],
      ),
    ).rejects.toThrow(/ai_budget_windows_cap_check/);
    artifact["dbCapCheck"] = "over-cap UPDATE rejected by CHECK constraint";
  });

  it("DB CHECK: negative money is unrepresentable", async () => {
    await seedWindow("chk-neg", "1.000000");
    await expect(
      pool.query(
        `UPDATE "ai_budget_windows" SET "reservedUsd" = $1::numeric WHERE "id" = $2`,
        ["-0.000001", "chk-neg"],
      ),
    ).rejects.toThrow(/ai_budget_windows_nonneg_check/);
  });

  it("DB cap CHECK: over-cap IS representable together with OVERAGE_LOCKED (preserved real charge)", async () => {
    await seedWindow("chk-lock", "1.000000");
    await expect(
      pool.query(
        `UPDATE "ai_budget_windows"
            SET "provisionalUsd" = $1::numeric, "state" = 'OVERAGE_LOCKED'
          WHERE "id" = $2`,
        ["2.500000", "chk-lock"],
      ),
    ).resolves.toBeTruthy();
  });

  it("the conditional UPDATE admits a fitting hold (1 row) and refuses an over-cap one (0 rows)", async () => {
    await seedWindow("chk-cond", "1.000000");
    const fits = await pool.query(
      `UPDATE "ai_budget_windows"
          SET "reservedUsd" = "reservedUsd" + $1::numeric
        WHERE "id" = $2 AND "state" = 'ACTIVE'
          AND "reservedUsd" + "provisionalUsd" + "confirmedBilledUsd" + $1::numeric <= "capUsd"`,
      ["0.600000", "chk-cond"],
    );
    expect(fits.rowCount).toBe(1);
    const blocked = await pool.query(
      `UPDATE "ai_budget_windows"
          SET "reservedUsd" = "reservedUsd" + $1::numeric
        WHERE "id" = $2 AND "state" = 'ACTIVE'
          AND "reservedUsd" + "provisionalUsd" + "confirmedBilledUsd" + $1::numeric <= "capUsd"`,
      ["0.600000", "chk-cond"],
    );
    expect(blocked.rowCount).toBe(0);
    expect((await windowRow("chk-cond")).invariant).toBe(true);
  });

  it("unique (invocationId, windowId, reservationVersion) is DB-enforced", async () => {
    await seedWindow("chk-uniq", "5.000000");
    await seedInvocation("inv-uniq");
    const insert = (id: string) =>
      pool.query(
        `INSERT INTO "ai_budget_reservations"
           ("id", "invocationId", "windowId", "reservationVersion",
            "amountUsd", "state", "expiresAt")
         VALUES ($1, 'inv-uniq', 'chk-uniq', 1, $2::numeric, 'HELD', now())`,
        [id, "0.100000"],
      );
    await insert("chk-uniq-r1");
    await expect(insert("chk-uniq-r2")).rejects.toThrow(
      /ai_budget_reservations_invocation_window_version_key/,
    );
    // Clean up the raw HELD row so later sweeps see only engine-made holds
    // (this row bypassed the engine, so no window money backs it).
    await pool.query(
      `DELETE FROM "ai_budget_reservations" WHERE "windowId" = 'chk-uniq'`,
    );
  });

  it("window FK is RESTRICT: deleting a window can NEVER cascade away reservation evidence", async () => {
    await seedWindow("chk-fk-w", "5.000000");
    await seedInvocation("inv-fk-w");
    await pool.query(
      `INSERT INTO "ai_budget_reservations"
         ("id", "invocationId", "windowId", "reservationVersion",
          "amountUsd", "state", "expiresAt")
       VALUES ('chk-fk-r', 'inv-fk-w', 'chk-fk-w', 1, 0.100000, 'HELD', now())`,
    );
    await expect(
      pool.query(`DELETE FROM "ai_budget_windows" WHERE "id" = 'chk-fk-w'`),
    ).rejects.toThrow(/ai_budget_reservations_windowId_fkey/);
    // The reservation row survived the attempted delete.
    const survivors = await pool.query(
      `SELECT "id" FROM "ai_budget_reservations" WHERE "windowId" = 'chk-fk-w'`,
    );
    expect(survivors.rowCount).toBe(1);
    artifact["windowFkRestrict"] =
      "DELETE of a window with reservations rejected by RESTRICT FK";
    // Clean up the raw row (bypassed the engine; no window money backs it).
    await pool.query(
      `DELETE FROM "ai_budget_reservations" WHERE "windowId" = 'chk-fk-w'`,
    );
  });

  it("provisional-state CHECK is biconditional: a settled-without-an-amount row is unrepresentable", async () => {
    await seedWindow("chk-prov", "5.000000");
    await seedInvocation("inv-prov");
    // Direction 1: PROVISIONALLY_SETTLED MUST carry provisionalUsd.
    await expect(
      pool.query(
        `INSERT INTO "ai_budget_reservations"
           ("id", "invocationId", "windowId", "reservationVersion",
            "amountUsd", "state", "provisionalUsd", "expiresAt")
         VALUES ('chk-prov-r1', 'inv-prov', 'chk-prov', 1,
                 0.100000, 'PROVISIONALLY_SETTLED', NULL, now())`,
      ),
    ).rejects.toThrow(/ai_budget_reservations_provisional_state_check/);
    // Direction 2: a worst-case HELD row may NOT carry a provisional amount.
    await expect(
      pool.query(
        `INSERT INTO "ai_budget_reservations"
           ("id", "invocationId", "windowId", "reservationVersion",
            "amountUsd", "state", "provisionalUsd", "expiresAt")
         VALUES ('chk-prov-r2', 'inv-prov', 'chk-prov', 2,
                 0.100000, 'HELD', 0.050000, now())`,
      ),
    ).rejects.toThrow(/ai_budget_reservations_provisional_state_check/);
    artifact["provisionalStateCheckBiconditional"] =
      "both directions rejected by CHECK constraint";
  });

  // ── 2. §10.2 overage on real PG ────────────────────────────────

  it("actual > hold preserves the charge over-cap, locks the window, blocks further reserves", async () => {
    await seedWindow("ovr-w", "0.200000");
    await seedInvocation("inv-ovr");
    await reserve(budgetDb, {
      windowIds: ["ovr-w"],
      amountUsd: "0.200000",
      invocationId: "inv-ovr",
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 600_000),
    });
    const result = await settleProvisional(budgetDb, {
      invocationId: "inv-ovr",
      actualUsd: "0.750000",
      now: NOW,
    });
    expect(result.overage).toBe(true);
    const w = await windowRow("ovr-w");
    expect(w.state).toBe("OVERAGE_LOCKED");
    expect(usdToMicros(w.provisionalUsd)).toBe(usdToMicros("0.75")); // real charge kept
    await seedInvocation("inv-ovr-2");
    await expect(
      reserve(budgetDb, {
        windowIds: ["ovr-w"],
        amountUsd: "0.000001",
        invocationId: "inv-ovr-2",
        now: NOW,
        expiresAt: new Date(NOW.getTime() + 600_000),
      }),
    ).rejects.toBeInstanceOf(BudgetBlocked);
    artifact["overage"] = {
      heldUsd: "0.200000",
      actualUsd: "0.750000",
      windowState: w.state,
    };
  });

  // ── 3. 100 concurrent END-TO-END invocations (§10.9) ──────────────────

  function billablePlan(requestId: string): AiDispatchPlan {
    const request: AiTaskInvocationRequest = {
      taskClass: "brief.daily-summary",
      requestId,
      actor: ACTOR,
      entity: "GSE",
      input: { user: "summarize the slate", maxTokens: 32 },
    };
    const authority: EffectiveAuthority = resolveEffectiveAuthority(
      getTaskPolicy(request.taskClass),
      undefined,
    );
    return {
      request,
      authority,
      costMode: "BUDGETED_CASH",
      maxVendorCashUsd: 0.05,
      fundingLabel: "CASH_EXPECTED",
      envClass: "test",
      envClassSource: "explicit",
    };
  }

  it("100 concurrent end-to-end invocations stay within the cap", async () => {
    // Each plan's worst case: 2 billable routes × $0.05 = $0.10.
    // Cap $6.00 fits exactly 60 of the 100.
    await seedWindow(WINDOW_ID, "6.000000");
    // The pipeline resolves 'entity:GSE:daily:<utc-day>' from the registry
    // template — alias today's window id onto the acceptance window by
    // seeding the REAL resolved id instead.
    const utcDay = new Date().toISOString().slice(0, 10);
    const resolvedId = `entity:GSE:daily:${utcDay}`;
    await seedWindow(resolvedId, "6.000000");

    const dispatch = createLedgeredDispatch({
      store,
      observability: () => ({
        markDegraded: () => {},
        enqueueRecovery: async () => {},
      }) as never,
      dispatchers: {
        "anthropic-direct": async () => ({
          kind: "SUCCEEDED",
          providerUsed: "anthropic-direct",
          modelResolved: "acceptance-model",
          providerRequestId: randomUUID(),
          inputTokens: 10,
          outputTokens: 10,
          output: { text: "acceptance ok" },
        }),
        bedrock: async () => {
          throw new Error("fallback route must not be reached on success");
        },
        vertex: async () => {
          throw new Error("unreachable");
        },
        cerebras: async () => {
          throw new Error("unreachable");
        },
        local: async () => {
          throw new Error("unreachable");
        },
      },
      now: () => new Date(),
      budget: { db: budgetDb },
    });

    const outcomes = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) =>
        dispatch(billablePlan(`req-storm-${i}-${randomUUID().slice(0, 8)}`)),
      ),
    );
    const completed = outcomes.filter(
      (o) => o.status === "fulfilled" && o.value.kind === "COMPLETED",
    ).length;
    const budgetBlocked = outcomes.filter(
      (o) => o.status === "rejected" && o.reason instanceof BudgetBlocked,
    ).length;
    const otherErrors = outcomes.filter(
      (o) => o.status === "rejected" && !(o.reason instanceof BudgetBlocked),
    );

    expect(otherErrors).toEqual([]);
    expect(completed).toBe(60);
    expect(budgetBlocked).toBe(40);

    const w = await windowRow(resolvedId);
    // 60 successes × $0.05 provisional actual; all holds resolved.
    expect(usdToMicros(w.provisionalUsd)).toBe(usdToMicros("3.00"));
    expect(usdToMicros(w.reservedUsd)).toBe(0n);
    expect(w.invariant).toBe(true);

    // Every blocked invocation dispatched NOTHING and holds NOTHING.
    const holds = await pool.query(
      `SELECT count(*)::int AS n FROM "ai_budget_reservations"
        WHERE "state" = 'HELD' AND "windowId" = $1`,
      [resolvedId],
    );
    expect(holds.rows[0].n).toBe(0);

    // ── PERMANENT-CONSUME SECOND WAVE (Decision A) ──────────────────────
    // The first wave's 60 successes SETTLED $3.00 of provisional spend. That
    // settlement is a PERMANENT consumption of the window's cap — the atomic
    // cap guard admits a new hold only when
    //   reserved + provisional + confirmedBilled + amount <= cap,
    // so settled spend never returns headroom. A SECOND storm of 100 against
    // the SAME window must therefore see only the reduced $3.00 balance and
    // admit exactly 30 more (30 × $0.10 worst-case = the remaining $3.00),
    // never re-admitting the $3.00 already consumed. This is the real-Postgres
    // analog of the credit port's permanent-consume settled ledger: once
    // settled, spend is gone from the spendable balance forever.
    const outcomes2 = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) =>
        dispatch(billablePlan(`req-storm2-${i}-${randomUUID().slice(0, 8)}`)),
      ),
    );
    const completed2 = outcomes2.filter(
      (o) => o.status === "fulfilled" && o.value.kind === "COMPLETED",
    ).length;
    const budgetBlocked2 = outcomes2.filter(
      (o) => o.status === "rejected" && o.reason instanceof BudgetBlocked,
    ).length;
    const otherErrors2 = outcomes2.filter(
      (o) => o.status === "rejected" && !(o.reason instanceof BudgetBlocked),
    );

    expect(otherErrors2).toEqual([]);
    // The consumed $3.00 is gone: only $3.00 remains, funding 30 of 100 — the
    // second wave admits FEWER than the first (30 < 60), never re-admitting
    // the settled amount.
    expect(completed2).toBe(30);
    expect(budgetBlocked2).toBe(70);
    expect(completed2).toBeLessThan(completed);

    const w2 = await windowRow(resolvedId);
    // Cumulative settled: 90 successes × $0.05 = $4.50 provisional, never > cap.
    expect(usdToMicros(w2.provisionalUsd)).toBe(usdToMicros("4.50"));
    expect(usdToMicros(w2.reservedUsd)).toBe(0n);
    expect(w2.invariant).toBe(true);
    // No leaked holds survive the second wave either.
    const holds2 = await pool.query(
      `SELECT count(*)::int AS n FROM "ai_budget_reservations"
        WHERE "state" = 'HELD' AND "windowId" = $1`,
      [resolvedId],
    );
    expect(holds2.rows[0].n).toBe(0);

    artifact["concurrent100"] = {
      cap: "6.000000",
      perPlanWorstCase: "0.100000",
      completed,
      budgetBlocked,
      otherErrors: otherErrors.length,
      window: w,
      // Decision A permanent-consume proof: the settled first wave reduces the
      // spendable balance permanently, so the second wave admits fewer.
      permanentConsumeSecondWave: {
        completed: completed2,
        budgetBlocked: budgetBlocked2,
        otherErrors: otherErrors2.length,
        window: w2,
        provenReadmissionOfConsumedSpend: false,
      },
    };
  }, 120_000);

  // ── 4. §10.9 crash recovery ────────────────────────────────

  it("crash between reserve and dispatch: the sweeper frees the hold after proving a clean ledger", async () => {
    await seedWindow("crash-clean", "1.000000");
    await seedInvocation("inv-crash-clean");
    await reserve(budgetDb, {
      windowIds: ["crash-clean"],
      amountUsd: "0.400000",
      invocationId: "inv-crash-clean",
      now: new Date(NOW.getTime() - 120_000),
      expiresAt: new Date(NOW.getTime() - 60_000), // already stale
    });
    const sweep = await sweepExpired(budgetDb, new Date());
    expect(sweep.expiredReservationIds.length).toBeGreaterThanOrEqual(1);
    const w = await windowRow("crash-clean");
    expect(usdToMicros(w.reservedUsd)).toBe(0n);
    artifact["crashBetweenReserveAndDispatch"] = "hold released by sweeper";
  });

  it("crash between dispatch and settle: the sweeper converts the hold to an UNRELEASABLE reconciliation hold", async () => {
    await seedWindow("crash-dirty", "1.000000");
    await seedInvocation("inv-crash-dirty");
    await reserve(budgetDb, {
      windowIds: ["crash-dirty"],
      amountUsd: "0.400000",
      invocationId: "inv-crash-dirty",
      now: new Date(NOW.getTime() - 120_000),
      expiresAt: new Date(NOW.getTime() - 60_000),
    });
    // The authoritative ledger shows a DISPATCHED attempt (crashed mid-call).
    await pool.query(
      `INSERT INTO "ai_attempts"
         ("id", "invocationId", "ordinal", "providerRequested",
          "modelRequested", "status", "requestFingerprint", "policyVersion",
          "attemptNonce", "startedAt")
       VALUES ($1, 'inv-crash-dirty', 0, 'anthropic-direct',
               'acceptance-model', 'DISPATCHED', $2, '2026-07-22.1', $3, now())`,
      [randomUUID(), "a".repeat(64), randomUUID()],
    );
    const sweep = await sweepExpired(budgetDb, new Date());
    const w = await windowRow("crash-dirty");
    expect(usdToMicros(w.reservedUsd)).toBe(usdToMicros("0.40")); // money kept
    const res = await pool.query(
      `SELECT "state" FROM "ai_budget_reservations" WHERE "invocationId" = 'inv-crash-dirty'`,
    );
    expect(res.rows[0].state).toBe("RECONCILIATION_HOLD");
    // A later sweep still cannot free it.
    await sweepExpired(budgetDb, new Date(Date.now() + 86_400_000));
    expect(usdToMicros((await windowRow("crash-dirty")).reservedUsd)).toBe(
      usdToMicros("0.40"),
    );
    artifact["crashBetweenDispatchAndSettle"] = {
      sweptTo: "RECONCILIATION_HOLD",
      moved: sweep.movedToReconciliationIds.length,
    };
  });

  it("an ambiguous end-to-end invocation retains every hold (§10.1)", async () => {
    const utcDay = new Date().toISOString().slice(0, 10);
    const resolvedId = `entity:GSE:daily:${utcDay}`;
    await seedWindow(resolvedId, "1000"); // plenty (storm test may share it)
    const before = await windowRow(resolvedId);
    const dispatch = createLedgeredDispatch({
      store,
      observability: () => ({
        markDegraded: () => {},
        enqueueRecovery: async () => {},
      }) as never,
      dispatchers: {
        "anthropic-direct": async () => ({
          kind: "AMBIGUOUS",
          dispatched: true,
          errorCode: "socket-drop-mid-flight",
        }),
        bedrock: async () => {
          throw new Error("an ambiguous charge must never fall through");
        },
        vertex: async () => {
          throw new Error("unreachable");
        },
        cerebras: async () => {
          throw new Error("unreachable");
        },
        local: async () => {
          throw new Error("unreachable");
        },
      },
      now: () => new Date(),
      budget: { db: budgetDb },
    });
    await expect(
      dispatch(billablePlan(`req-amb-${randomUUID().slice(0, 8)}`)),
    ).rejects.toBeInstanceOf(AmbiguousCharge);
    const after = await windowRow(resolvedId);
    // The full plan hold ($0.10) is still reserved, mirrored as disputed.
    expect(
      usdToMicros(after.reservedUsd) - usdToMicros(before.reservedUsd),
    ).toBe(usdToMicros("0.10"));
    artifact["ambiguousRetainsHold"] = true;
  });
});
