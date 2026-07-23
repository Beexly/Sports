/**
 * W6 ablation counters — acceptance against REAL Postgres.
 *
 * Gated on DATABASE_URL, same convention as the other *-pg.test.ts files.
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   FORCE_REAL_PRISMA=true \
 *     DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     ../../node_modules/.bin/vitest run ai-control-plane-ablation-counters-pg
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import { computeAblationCounters } from "@/lib/ai-control-plane/ablation-counters";
import { recordFormalIncidentReview } from "@/lib/ai-control-plane/formal-incident";
import type { ControlSqlClient } from "@/lib/ai-control-plane/control-store";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "ablation_counters_acceptance";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "packages", "db", "prisma", "migrations");

suite("W6 ablation counters against real Postgres", () => {
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
      "20260723140000_add_formal_incident_review_outcome",
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
    await pool.query(`TRUNCATE "formal_incident"`);
  });

  async function insertIncident(
    id: string,
    violationKind: string,
    createdAt: Date,
    reviewOutcome: string | null,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO "formal_incident" ("id", "violationKind", "abstractState", "eventIds", "status", "createdAt", "reviewOutcome")
       VALUES ($1, $2, '{}'::jsonb, '[]'::jsonb, 'open', $3, $4)`,
      [id, violationKind, createdAt, reviewOutcome],
    );
  }

  it("computes correct per-kind and overall counters, excluding rows outside the window", async () => {
    const inWindow = new Date();
    const before = new Date(inWindow.getTime() - 60 * 60 * 1000);
    const since = new Date(inWindow.getTime() - 30 * 60 * 1000);
    const until = new Date(inWindow.getTime() + 30 * 60 * 1000);

    await insertIncident(randomUUID(), "GE2_PENDING", inWindow, "true_positive");
    await insertIncident(randomUUID(), "GE2_PENDING", inWindow, "true_positive");
    await insertIncident(randomUUID(), "GE2_PENDING", inWindow, null);
    await insertIncident(randomUUID(), "REJECTED_FP_UNBOUND", inWindow, "false_positive");
    await insertIncident(randomUUID(), "REJECTED_FP_UNBOUND", inWindow, null);
    // Outside the window — must be excluded from every count.
    await insertIncident(randomUUID(), "GE2_PENDING", before, "true_positive");

    const report = await computeAblationCounters(sql, { sinceInclusive: since, untilExclusive: until });

    expect(report.overall.total).toBe(5);
    expect(report.overall.reviewed).toBe(3);
    expect(report.overall.truePositives).toBe(2);
    expect(report.overall.falsePositives).toBe(1);
    expect(report.overall.precision).toBeCloseTo(2 / 3, 5);
    expect(report.reviewCoveragePct).toBeCloseTo(60, 5);

    const ge2 = report.byKind.find((k) => k.violationKind === "GE2_PENDING")!;
    expect(ge2).toMatchObject({
      total: 3,
      reviewed: 2,
      unreviewed: 1,
      truePositives: 2,
      falsePositives: 0,
      precision: 1,
    });

    const rejected = report.byKind.find((k) => k.violationKind === "REJECTED_FP_UNBOUND")!;
    expect(rejected).toMatchObject({
      total: 2,
      reviewed: 1,
      unreviewed: 1,
      truePositives: 0,
      falsePositives: 1,
      precision: 0,
    });
  });

  it("returns precision:null when nothing in a kind has been reviewed (not 0, not NaN)", async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 60_000);
    const until = new Date(now.getTime() + 60_000);
    await insertIncident(randomUUID(), "GE2_PENDING", now, null);
    await insertIncident(randomUUID(), "GE2_PENDING", now, null);

    const report = await computeAblationCounters(sql, { sinceInclusive: since, untilExclusive: until });
    expect(report.overall.precision).toBeNull();
    expect(report.byKind[0]!.precision).toBeNull();
  });

  it("an empty window returns total:0, precision:null, reviewCoveragePct:null, byKind:[]", async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 60_000);
    const until = new Date(now.getTime() + 60_000);

    const report = await computeAblationCounters(sql, { sinceInclusive: since, untilExclusive: until });
    expect(report.overall.total).toBe(0);
    expect(report.overall.precision).toBeNull();
    expect(report.reviewCoveragePct).toBeNull();
    expect(report.byKind).toEqual([]);
  });

  it("computeAblationCounters is read-only: running it twice never changes row content", async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 60_000);
    const until = new Date(now.getTime() + 60_000);
    await insertIncident(randomUUID(), "GE2_PENDING", now, "true_positive");

    const before = await pool.query(`SELECT * FROM "formal_incident" ORDER BY "id"`);
    await computeAblationCounters(sql, { sinceInclusive: since, untilExclusive: until });
    await computeAblationCounters(sql, { sinceInclusive: since, untilExclusive: until });
    const after = await pool.query(`SELECT * FROM "formal_incident" ORDER BY "id"`);

    expect(after.rows).toEqual(before.rows);
  });

  it("recordFormalIncidentReview labels a row, which computeAblationCounters then reflects", async () => {
    const id = randomUUID();
    const now = new Date();
    const since = new Date(now.getTime() - 60_000);
    const until = new Date(now.getTime() + 60_000);
    await insertIncident(id, "GE2_PENDING", now, null);

    let report = await computeAblationCounters(sql, { sinceInclusive: since, untilExclusive: until });
    expect(report.overall.unreviewed).toBe(1);

    await recordFormalIncidentReview(sql, { id, outcome: "true_positive", reviewedBy: "test-operator" });

    report = await computeAblationCounters(sql, { sinceInclusive: since, untilExclusive: until });
    expect(report.overall.truePositives).toBe(1);
    expect(report.overall.unreviewed).toBe(0);

    const row = await pool.query(`SELECT "reviewOutcome", "reviewedBy", "reviewedAt" FROM "formal_incident" WHERE "id" = $1`, [id]);
    expect(row.rows[0].reviewOutcome).toBe("true_positive");
    expect(row.rows[0].reviewedBy).toBe("test-operator");
    expect(row.rows[0].reviewedAt).not.toBeNull();
  });
});
