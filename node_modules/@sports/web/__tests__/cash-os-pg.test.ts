/**
 * Cash OS (R1) acceptance against REAL Postgres — the properties a mock
 * cannot prove: `recordActivation`'s upsert semantics and
 * `computeCashSnapshot`'s aggregation over real rows.
 *
 * Gated on DATABASE_URL, same HAS_DB convention as
 * ai-control-plane-formal-incident-pg.test.ts.
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   FORCE_REAL_PRISMA=true \
 *     DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     ../../node_modules/.bin/vitest run cash-os-pg
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import {
  recordActivation,
  computeCashSnapshot,
  utcDayFloor,
  type CashSqlClient,
} from "@/lib/growth/cash-os";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "cash_os_acceptance";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "packages", "db", "prisma", "migrations");

suite("Cash OS — recordActivation + computeCashSnapshot against real Postgres", () => {
  let pool: Pool;
  let sql: CashSqlClient;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      options: `-c search_path=${SCHEMA}`,
    });
    await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await pool.query(`CREATE SCHEMA ${SCHEMA}`);
    const ddl = readFileSync(
      join(MIGRATIONS_DIR, "20260723000000_add_cash_os_revenue_activation", "migration.sql"),
      "utf8",
    );
    await pool.query(ddl);
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
    await pool.query(`TRUNCATE "revenue_event", "product_activation"`);
  });

  it("first call inserts count=1", async () => {
    const userId = randomUUID();
    const now = new Date("2026-07-23T10:00:00.000Z");
    await recordActivation(sql, userId, "board", now);

    const rows = await pool.query(
      `SELECT "count", "surface" FROM "product_activation" WHERE "userId" = $1`,
      [userId],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].count).toBe(1);
    expect(rows.rows[0].surface).toBe("board");
  });

  it("second call same (userId, day, surface) increments to 2", async () => {
    const userId = randomUUID();
    const now = new Date("2026-07-23T10:00:00.000Z");
    await recordActivation(sql, userId, "board", now);
    await recordActivation(sql, userId, "board", new Date("2026-07-23T18:00:00.000Z"));

    const rows = await pool.query(`SELECT "count" FROM "product_activation" WHERE "userId" = $1`, [userId]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].count).toBe(2);
  });

  it("a different surface the same day inserts a new row", async () => {
    const userId = randomUUID();
    const now = new Date("2026-07-23T10:00:00.000Z");
    await recordActivation(sql, userId, "board", now);
    await recordActivation(sql, userId, "optimizer", now);

    const rows = await pool.query(
      `SELECT "surface", "count" FROM "product_activation" WHERE "userId" = $1 ORDER BY "surface"`,
      [userId],
    );
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.map((r) => r.surface)).toEqual(["board", "optimizer"]);
    expect(rows.rows.every((r) => r.count === 1)).toBe(true);
  });

  it("a different day for the same surface inserts a new row", async () => {
    const userId = randomUUID();
    await recordActivation(sql, userId, "board", new Date("2026-07-23T10:00:00.000Z"));
    await recordActivation(sql, userId, "board", new Date("2026-07-24T10:00:00.000Z"));

    const rows = await pool.query(`SELECT "day" FROM "product_activation" WHERE "userId" = $1`, [userId]);
    expect(rows.rows).toHaveLength(2);
  });

  it("utcDayFloor truncates to UTC midnight", () => {
    const d = utcDayFloor(new Date("2026-07-23T23:59:59.999Z"));
    expect(d.toISOString()).toBe("2026-07-23T00:00:00.000Z");
  });

  it("computeCashSnapshot aggregates real revenue_event + product_activation rows", async () => {
    const now = new Date("2026-07-23T12:00:00.000Z");
    const userA = randomUUID();
    const userB = randomUUID();

    async function insertRevenue(kind: string, amountCents: number, at: Date, userId: string | null) {
      await pool.query(
        `INSERT INTO "revenue_event" ("id", "at", "kind", "amountCents", "userId") VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), at, kind, amountCents, userId],
      );
    }

    // This week's MRR contributions.
    await insertRevenue("sub_start", 5000, new Date("2026-07-22T00:00:00.000Z"), userA);
    await insertRevenue("sub_renew", 3000, new Date("2026-07-21T00:00:00.000Z"), userB);
    // Last week's MRR contributions (for trend comparison).
    await insertRevenue("sub_renew", 2000, new Date("2026-07-15T00:00:00.000Z"), userA);
    // Non-MRR kinds.
    await insertRevenue("affiliate_cpa", 700, new Date("2026-07-20T00:00:00.000Z"), null);
    await insertRevenue("affiliate_revshare", 300, new Date("2026-07-20T00:00:00.000Z"), null);
    await insertRevenue("pilot_invoice", 10_000, new Date("2026-07-20T00:00:00.000Z"), null);
    await insertRevenue("sub_cancel", 0, new Date("2026-07-20T00:00:00.000Z"), userB);
    // Stale (outside 30d) — must not count anywhere.
    await insertRevenue("sub_start", 99_999, new Date("2026-01-01T00:00:00.000Z"), userA);

    await recordActivation(sql, userA, "board", now);
    await recordActivation(sql, userB, "tracker", now);
    await recordActivation(sql, userA, "board", new Date("2026-06-01T00:00:00.000Z")); // stale, outside 7d

    const snapshot = await computeCashSnapshot(sql, now);

    expect(snapshot.mrrCents).toBe(5000 + 3000 + 2000); // all within trailing 30d
    expect(snapshot.mrrTrend7d).toBe(5000 + 3000 - 2000); // this-week minus last-week
    expect(snapshot.activations7d).toBe(2); // board + tracker rows in the last 7d, stale excluded
    expect(snapshot.affiliateCents30d).toBe(1000);
    expect(snapshot.pilotCents30d).toBe(10_000);
    expect(snapshot.payingUsers).toBe(2); // userA and userB each have a sub_start/sub_renew in 30d
  });
});
