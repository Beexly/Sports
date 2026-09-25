import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Tripwire for the two forward migrations added on 2026-09-02 (the first ones
 * after the squashed baseline). CI now replays the history blocking and runs a
 * drift check against schema.prisma; this test fails earlier and names the
 * exact line, so a schema edit without its migration (or the reverse) never
 * reaches CI as a bare "drift detected".
 */
const root = resolve(__dirname, "../../..");
const schema = readFileSync(resolve(root, "packages/db/prisma/schema.prisma"), "utf8");
const migrationsDir = resolve(root, "packages/db/prisma/migrations");
const folders = readdirSync(migrationsDir).filter((f) => /^\d{14}_/.test(f)).sort();
const sqlOf = (folder: string) => readFileSync(resolve(migrationsDir, folder, "migration.sql"), "utf8");

describe("forward migrations agree with schema.prisma", () => {
  it("the baseline is first and the 2026-09 forward migrations follow it", () => {
    expect(folders[0]).toBe("20260101000000_baseline");
    expect(folders).toContain("20260902230000_game_merge_alias");
    expect(folders).toContain("20260902231000_week1_hot_path_indexes");
    expect(folders).toContain("20260924190000_pick_signal_snapshot_ngs");
    expect(folders).toContain("20260924191000_research_artifact_source_kind");
  });

  it("Game.mergedIntoGameId (alias tombstone) exists in both the schema and its migration", () => {
    expect(schema).toMatch(/mergedIntoGameId\s+String\?/);
    expect(schema).toMatch(/@@index\(\[mergedIntoGameId\]\)/);
    expect(schema).toMatch(/@relation\("GameMerge"/);
    const sql = sqlOf("20260902230000_game_merge_alias");
    expect(sql).toMatch(/ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "mergedIntoGameId" TEXT/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS "games_mergedIntoGameId_idx" ON "games"\("mergedIntoGameId"\)/);
    expect(sql).toMatch(/games_mergedIntoGameId_fkey/);
    expect(sql).toMatch(/ON DELETE SET NULL/);
    // Idempotent by construction: every statement guarded.
    expect(sql).not.toMatch(/^\s*ALTER TABLE "games" ADD COLUMN "mergedIntoGameId"/m);
  });

  it("the Week 1 board index exists in both the schema and its migration", () => {
    expect(schema).toMatch(/@@index\(\[isPublished, isBootstrap, generatedAt\]\)/);
    const sql = sqlOf("20260902231000_week1_hot_path_indexes");
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS "picks_isPublished_isBootstrap_generatedAt_idx"\s+ON "picks"\("isPublished", "isBootstrap", "generatedAt"\)/,
    );
  });

  it("the immutable NGS snapshot flag exists in schema and migration", () => {
    expect(schema).toMatch(/hadNgsSignal\s+Boolean\s+@default\(false\)/);
    const sql = sqlOf("20260924190000_pick_signal_snapshot_ngs");
    expect(sql).toMatch(
      /ALTER TABLE "pick_signal_snapshots"\s+ADD COLUMN IF NOT EXISTS "hadNgsSignal" BOOLEAN NOT NULL DEFAULT false/,
    );
  });

  it("research artifacts use a distinct enum and stable source identity", () => {
    expect(schema).toMatch(/enum SourceSnapshotKind \{[\s\S]*RESEARCH_ARTIFACT/);
    expect(schema).toMatch(/@@unique\(\[provider, sourceKind, externalId\]\)/);
    const sql = sqlOf("20260924191000_research_artifact_source_kind");
    expect(sql).toMatch(/ALTER TYPE "SourceSnapshotKind" ADD VALUE IF NOT EXISTS 'RESEARCH_ARTIFACT'/);
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS "source_snapshots_provider_sourceKind_externalId_key"\s+ON "source_snapshots" \("provider", "sourceKind", "externalId"\)/,
    );
  });

  it("no forward migration uses CONCURRENTLY (Prisma runs migrations in a transaction)", () => {
    for (const folder of folders.slice(1)) {
      const statementsOnly = sqlOf(folder).replace(/--.*$/gm, "");
      expect(statementsOnly).not.toMatch(/CONCURRENTLY/i);
    }
  });
});
