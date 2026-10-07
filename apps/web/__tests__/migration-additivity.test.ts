/**
 * Migration additivity guard.
 *
 * The rollback path for this product is Vercel Instant Rollback / Promote,
 * which reuses a prior BUILD ARTIFACT and therefore does NOT re-run the
 * production build — and the production build (`vercel.json` buildCommand →
 * `scripts/deploy/migrate-if-configured.mjs`) is the only thing that ever runs
 * `prisma migrate deploy`. So rolling the app back leaves the schema FORWARD.
 *
 * Prisma generates no down-migrations and `packages/db/package.json` exposes
 * no `migrate down`. The single property that makes "old app, new schema" a
 * safe state is that every migration is ADDITIVE: an older Prisma client
 * selects an explicit column list, so tables and columns it does not know
 * about are invisible to it. Remove that property once and the rollback path
 * stops existing — silently, with nothing failing until it is needed.
 *
 * This suite pins the property both ways:
 *   1. Every migration on disk today is additive (and every non-additive
 *      shape is proven catchable on synthetic SQL, so an all-clean corpus
 *      cannot make this vacuous).
 *   2. Index builds that would lock an existing table are surfaced, so a
 *      future one is a deliberate scheduling decision rather than a surprise.
 *
 * `packages/db/prisma/migrations` is READ ONLY here. This suite opens it and
 * never writes to it.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DESTRUCTIVE_REASON,
  findAdditivityViolations,
  lockRiskNotes,
  stripSqlComments,
  type DestructiveKind,
} from "@/lib/ops/migration-additivity";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const MIGRATIONS_DIR = resolve(REPO_ROOT, "packages", "db", "prisma", "migrations");

interface MigrationFile {
  readonly name: string;
  readonly sql: string;
}

function loadMigrations(): MigrationFile[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, file: join(MIGRATIONS_DIR, e.name, "migration.sql") }))
    .filter((m) => existsSync(m.file))
    .map((m) => ({ name: m.name, sql: readFileSync(m.file, "utf8") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const MIGRATIONS = loadMigrations();

describe("every Prisma migration is additive (the rollback invariant)", () => {
  it("finds the migrations directory and it is not empty", () => {
    // Without this, a moved directory would turn every assertion below into a
    // vacuous pass over an empty array.
    expect(MIGRATIONS.length).toBeGreaterThan(40);
  });

  it("contains no destructive statement in any migration", () => {
    const violations = MIGRATIONS.flatMap((m) => findAdditivityViolations(m.name, m.sql));
    const report = violations
      .map((v) => `  ${v.migration} [${v.kind}] ${DESTRUCTIVE_REASON[v.kind]}\n      ${v.statement}`)
      .join("\n");
    expect(
      violations,
      violations.length === 0
        ? ""
        : "A migration is NOT additive. Prisma has no down-migration, and Vercel's\n" +
            "Instant Rollback does not re-run the build, so rolling the app back would\n" +
            "leave it running against a schema that has removed or narrowed something\n" +
            `it still uses. Document the manual inverse in docs/ops/ROLLBACK.md before\nshipping this.\n\n${report}\n`,
    ).toEqual([]);
  });
});

describe("findAdditivityViolations catches each destructive shape", () => {
  // Proves the clean corpus above is a real result, not an inert matcher.
  const cases: ReadonlyArray<{ kind: DestructiveKind; sql: string }> = [
    { kind: "drop_object", sql: `DROP TABLE IF EXISTS "picks";` },
    { kind: "drop_object", sql: `DROP TYPE "LossRootCause";` },
    { kind: "drop_column", sql: `ALTER TABLE "picks" DROP COLUMN "clvValue";` },
    { kind: "rename", sql: `ALTER TABLE "picks" RENAME COLUMN "clvValue" TO "clv";` },
    { kind: "rename", sql: `ALTER TABLE "picks" RENAME TO "picks_old";` },
    { kind: "set_not_null", sql: `ALTER TABLE "picks" ALTER COLUMN "clvKind" SET NOT NULL;` },
    {
      kind: "alter_column_type",
      sql: `ALTER TABLE "picks" ALTER COLUMN "confidence" TYPE SMALLINT;`,
    },
    { kind: "truncate", sql: `TRUNCATE TABLE "odds";` },
    { kind: "delete_rows", sql: `DELETE FROM "picks" WHERE "settledAt" IS NULL;` },
    { kind: "update_rows", sql: `UPDATE "picks" SET "tier" = 'FREE';` },
    {
      kind: "unguarded_drop_constraint",
      sql: `ALTER TABLE "picks" DROP CONSTRAINT "picks_gameId_fkey";`,
    },
    {
      kind: "add_notnull_column_without_default",
      sql: `ALTER TABLE "picks" ADD COLUMN "ledgerSeq" INTEGER NOT NULL;`,
    },
  ];

  for (const { kind, sql } of cases) {
    it(`flags ${kind}: ${sql.trim()}`, () => {
      const found = findAdditivityViolations("synthetic", sql);
      expect(found.map((v) => v.kind)).toContain(kind);
    });
  }

  it("catches a destructive statement buried inside a DO $$ guard block", () => {
    const sql = `
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'picks') THEN
          ALTER TABLE "picks" DROP COLUMN "clvValue";
        END IF;
      END $$;
    `;
    expect(findAdditivityViolations("synthetic", sql).map((v) => v.kind)).toContain("drop_column");
  });
});

describe("findAdditivityViolations does not flag the additive idioms this repo uses", () => {
  it("allows a brand-new table with NOT NULL columns and foreign keys", () => {
    // Shape of 20260820090000_add_ledger_chain_entries (PR #601) and every
    // other new-table migration here.
    const sql = `
      CREATE TABLE IF NOT EXISTS "ledger_chain_entries" (
        "id" TEXT NOT NULL,
        "chainId" VARCHAR(32) NOT NULL DEFAULT 'glass-v1',
        "seq" INTEGER NOT NULL,
        "occurredAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ledger_chain_entries_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "lce_chainId_seq_key" ON "ledger_chain_entries"("chainId", "seq");
      ALTER TABLE "loss_autopsies" ADD CONSTRAINT "loss_autopsies_pickId_fkey"
        FOREIGN KEY ("pickId") REFERENCES "picks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `;
    expect(findAdditivityViolations("synthetic", sql)).toEqual([]);
  });

  it("allows the DROP CONSTRAINT IF EXISTS + re-ADD re-appliability idiom", () => {
    // 20260722140000_add_ai_control_plane_ledger's doctrine: a named constraint
    // is dropped-if-exists and immediately reinstalled so the file is byte-safe
    // to re-apply. Nothing is actually removed.
    const sql = `
      ALTER TABLE "ai_invocations" DROP CONSTRAINT IF EXISTS "ai_invocations_status_check";
      ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_status_check"
        CHECK ("status" IN ('CLAIMED','DONE'));
    `;
    expect(findAdditivityViolations("synthetic", sql)).toEqual([]);
  });

  it("allows widening: DROP NOT NULL and DROP DEFAULT", () => {
    const sql = `
      ALTER TABLE "picks" ALTER COLUMN "clvKind" DROP NOT NULL;
      ALTER TABLE "picks" ALTER COLUMN "tier" DROP DEFAULT;
    `;
    expect(findAdditivityViolations("synthetic", sql)).toEqual([]);
  });

  it("allows ADD COLUMN NOT NULL when it carries a DEFAULT", () => {
    const sql = `ALTER TABLE "ai_invocations" ADD COLUMN IF NOT EXISTS "stealCount" INTEGER NOT NULL DEFAULT 0;`;
    expect(findAdditivityViolations("synthetic", sql)).toEqual([]);
  });

  it("ignores destructive SQL that only appears in a comment", () => {
    // 20260722130000_add_checkout_attempt documents its own manual inverse in
    // a `--` comment. Documentation is not a statement.
    const sql = `
      -- Manual inverse (never run automatically):
      --   DROP TABLE IF EXISTS "checkout_attempts";
      /* DROP TYPE IF EXISTS "CheckoutAttemptStatus"; */
      CREATE TABLE IF NOT EXISTS "checkout_attempts" ("id" TEXT NOT NULL);
    `;
    expect(findAdditivityViolations("synthetic", sql)).toEqual([]);
    expect(stripSqlComments(sql)).not.toContain("DROP TABLE");
  });

  it("does not mistake a foreign key's ON DELETE / ON UPDATE for DML", () => {
    const sql = `
      ALTER TABLE "a" ADD CONSTRAINT "a_b_fkey" FOREIGN KEY ("bId")
        REFERENCES "b"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    expect(findAdditivityViolations("synthetic", sql)).toEqual([]);
  });
});

describe("index builds that would lock an existing table", () => {
  it("records which migrations build a non-CONCURRENT index on a pre-existing table", () => {
    // Not a failure — a scheduling fact. A plain CREATE INDEX holds a SHARE
    // lock on the target table for the duration of the build: reads continue,
    // WRITES block. All five below are already applied in production, and the
    // one that matters is the 2026-07-08 hot-path pass over `odds` (the
    // largest table in this schema — a 2026-08-19 census counted 1,368,288
    // rows, docs/ops/hermes/l14-label-census/RESULTS.md). This assertion pins
    // the set so a NEW entry has to be added here deliberately, with the write
    // window thought through, rather than discovered during a deploy.
    const notes = MIGRATIONS.flatMap((m) => lockRiskNotes(m.name, m.sql));
    const byMigration = [...new Set(notes.map((n) => `${n.migration}:${n.table}`))].sort();
    expect(byMigration).toEqual([
      "20260603120000_add_pick_clv:picks",
      "20260622180000_add_slate_commitment:pick_proof_receipts",
      "20260708000000_add_hot_path_indexes:ingestion_runs",
      "20260708000000_add_hot_path_indexes:odds",
      "20260708000000_add_hot_path_indexes:picks",
      "20260723140000_add_formal_incident_review_outcome:formal_incident",
      "20260807120000_jarvis_memory_scope_type_created_idx:jarvis_memory_events",
    ]);
  });

  it("lockRiskNotes ignores indexes on a table the same migration creates", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS "watchlists" ("id" TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS "watchlists_userId_idx" ON "watchlists"("userId");
    `;
    expect(lockRiskNotes("synthetic", sql)).toEqual([]);
  });

  it("lockRiskNotes flags a plain index on a table it did not create", () => {
    const sql = `CREATE INDEX "picks_settledAt_idx" ON "picks"("settledAt");`;
    expect(lockRiskNotes("synthetic", sql)).toEqual([{ migration: "synthetic", table: "picks" }]);
  });

  it("lockRiskNotes does not flag CREATE INDEX CONCURRENTLY", () => {
    const sql = `CREATE INDEX CONCURRENTLY "picks_settledAt_idx" ON "picks"("settledAt");`;
    expect(lockRiskNotes("synthetic", sql)).toEqual([]);
  });
});
