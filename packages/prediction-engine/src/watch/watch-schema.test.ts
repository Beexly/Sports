import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const sql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "watch-schema.sql"),
  "utf8",
);

/**
 * Guards the learning-store schema against drift: the Vercel ingest route
 * and the scheduler both assume these tables/columns exist. If you change
 * the DDL, update the writers in the same commit.
 */
describe("watch-schema.sql", () => {
  const tables = [
    "watch.games",
    "watch.frames",
    "watch.tracklets",
    "watch.field_positions",
    "watch.derived_metrics",
    "watch.scheduler_runs",
  ];

  it.each(tables)("creates table %s", (t) => {
    expect(sql).toMatch(
      new RegExp(`CREATE TABLE IF NOT EXISTS ${t.replace(".", "\\.")}\\b`),
    );
  });

  it("keys everything by game_id", () => {
    for (const t of ["watch.frames", "watch.tracklets", "watch.field_positions", "watch.derived_metrics"]) {
      const block = sql.slice(sql.indexOf(t));
      expect(block.slice(0, 1200)).toMatch(/game_id/);
    }
  });

  it("never stores raw frames (documents the no-pixels rule)", () => {
    expect(sql.toLowerCase()).toMatch(/raw frames.*never/i);
    expect(sql).not.toMatch(/BYTEA/i);
  });

  it("carries the branch-only testing rule", () => {
    expect(sql).toMatch(/throwaway/i);
    expect(sql).toMatch(/must NOT be applied to the default branch/i);
  });

  it("documents the field coordinate system", () => {
    expect(sql).toMatch(/0\.\.120/);
    expect(sql).toMatch(/0\.\.53\.3/);
  });

  it("has the adaptive-fps columns on frames", () => {
    expect(sql).toMatch(/fps\s+REAL/);
    expect(sql).toMatch(/burst\s+BOOLEAN/);
  });
});
