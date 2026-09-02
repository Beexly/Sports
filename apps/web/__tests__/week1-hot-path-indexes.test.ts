import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Week 1 hot-path index drift guard.
 *
 * The two hottest public read paths — GET /api/picks (findMany + count) and
 * board/state.ts — all filter `isPublished: true, isBootstrap: false,
 * generatedAt: {gte, lte}`. The composite index covering that shape must exist
 * in BOTH the Prisma schema (so `prisma migrate diff` is clean) and the
 * checked-in migration (so it actually lands in Postgres). This test reads
 * both as text so the two can't silently drift apart.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const schema = readFileSync(resolve(repoRoot, "packages/db/prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(repoRoot, "packages/db/prisma/migrations/20260902120000_week1_hot_path_indexes/migration.sql"),
  "utf8"
);

const INDEX_NAME = "picks_isPublished_isBootstrap_generatedAt_idx";

/** Extract the body of `model Pick { ... }` from schema.prisma. */
function pickModelBody(source: string): string {
  const match = source.match(/^model Pick \{([\s\S]*?)^\}/m);
  if (!match) throw new Error("model Pick not found in schema.prisma");
  return match[1]!;
}

describe("Week 1 hot-path indexes — schema/migration drift guard", () => {
  it("schema.prisma declares @@index([isPublished, isBootstrap, generatedAt]) on Pick", () => {
    const pick = pickModelBody(schema);
    expect(pick).toMatch(/^\s*@@index\(\[isPublished, isBootstrap, generatedAt\]\)\s*$/m);
  });

  it("Pick is still mapped to the \"picks\" table (index name derives from it)", () => {
    const pick = pickModelBody(schema);
    expect(pick).toMatch(/@@map\("picks"\)/);
  });

  it("migration creates the composite index with Prisma's generated name", () => {
    expect(migration).toMatch(
      new RegExp(
        `^CREATE INDEX IF NOT EXISTS "${INDEX_NAME}" ON "picks"\\("isPublished", "isBootstrap", "generatedAt"\\);\\s*$`,
        "m"
      )
    );
  });

  it("migration does not use CONCURRENTLY (Prisma migrations run inside a transaction)", () => {
    expect(migration).not.toMatch(/CONCURRENTLY/i);
  });
});
