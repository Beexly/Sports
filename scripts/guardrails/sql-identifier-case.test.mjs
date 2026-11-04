/**
 * Tests for sql-identifier-case.
 *
 * The guard exists because an unquoted camelCase identifier in DDL is a silent
 * no-op, so these tests care most about the two directions that matter:
 *   - it MUST catch a genuinely unquoted camelCase object name
 *   - it MUST NOT cry wolf on quoted names, lower-case names, comments, string
 *     literals, or storage-parameter keys
 *
 * A guard that flags everything gets switched off; a guard that flags nothing is
 * decoration.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  findCaseViolations,
  splitIdent,
  stripSqlComments,
  stripStringLiterals,
  collectSqlFiles,
} from "./sql-identifier-case.mjs";

const kinds = (sql) => findCaseViolations("t.sql", sql).map((v) => v.kind);

// --- the bug this guard exists for ---------------------------------------

test("flags an unquoted camelCase index in DROP INDEX", () => {
  const v = findCaseViolations("t.sql", "DROP INDEX IF EXISTS public.odds_gameId_idx;");
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, "drop-index");
  assert.equal(v[0].unquoted, "odds_gameId_idx");
});

test("the failure mode is a silent no-op, so IF EXISTS does not exempt it", () => {
  // IF EXISTS suppresses the error; the statement still exits 0 doing nothing.
  assert.equal(kinds("DROP INDEX IF EXISTS public.odds_gameId_idx;").length, 1);
  assert.equal(kinds("DROP INDEX CONCURRENTLY IF EXISTS public.odds_gameId_idx;").length, 1);
});

test("accepts the correctly quoted form", () => {
  assert.deepEqual(kinds('DROP INDEX CONCURRENTLY IF EXISTS public."odds_gameId_idx";'), []);
});

test("accepts an all-lowercase identifier", () => {
  assert.deepEqual(kinds("DROP INDEX IF EXISTS public.ingestion_runs_status_idx;"), []);
});

test("checks every part of a schema-qualified name", () => {
  // Schema is lower-case, object is not: still a violation.
  assert.equal(kinds("DROP TABLE public.SomeTable;").length, 1);
  // Both quoted: clean.
  assert.deepEqual(kinds('DROP TABLE "Public"."SomeTable";'), []);
});

// --- other DDL positions -------------------------------------------------

test("flags CREATE INDEX with an unquoted camelCase name", () => {
  assert.deepEqual(kinds('CREATE INDEX "ok" ON t (a);'), []);
  assert.equal(kinds("CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS badName ON t (a);").length, 1);
});

test("flags ALTER TABLE and TRUNCATE targets", () => {
  assert.equal(kinds("ALTER TABLE public.SomeTable SET (fillfactor = 70);").length, 1);
  assert.equal(kinds("TRUNCATE public.SomeTable;").length, 1);
});

test("does not flag storage-parameter keys in ALTER TABLE SET (...)", () => {
  // autovacuum_analyze_scale_factor is a key, not an object name.
  assert.deepEqual(
    kinds("ALTER TABLE public.odds SET (autovacuum_analyze_scaleFactor = 0.02);"),
    [],
  );
});

// --- false-positive resistance -------------------------------------------

test("ignores commented-out DDL", () => {
  assert.deepEqual(kinds('-- DROP INDEX public.odds_gameId_idx;\nSELECT 1;'), []);
  assert.deepEqual(kinds("/* DROP INDEX public.odds_gameId_idx; */ SELECT 1;"), []);
});

test("ignores DDL-looking text inside a string literal", () => {
  assert.deepEqual(kinds("SELECT 'DROP INDEX public.odds_gameId_idx;' AS note;"), []);
});

test("does not flag keywords that follow the DDL keyword", () => {
  assert.deepEqual(kinds("DROP INDEX CONCURRENTLY IF EXISTS public.lower_idx;"), []);
});

test("a multi-statement file flags only the bad ones", () => {
  const sql = [
    'DROP INDEX IF EXISTS public."goodName_idx";',
    "DROP INDEX IF EXISTS public.badName_idx;",
    'DROP INDEX IF EXISTS public.also_good_idx;',
  ].join("\n");
  const v = findCaseViolations("t.sql", sql);
  assert.equal(v.length, 1);
  assert.equal(v[0].unquoted, "badName_idx");
});

// --- helpers -------------------------------------------------------------

test("splitIdent handles dots and quotes", () => {
  assert.deepEqual(splitIdent('public."aB"'), ["public", '"aB"']);
  assert.deepEqual(splitIdent("a.b.c"), ["a", "b", "c"]);
});

test("stripSqlComments removes both comment forms", () => {
  assert.equal(stripSqlComments("a -- x\nb").includes("--"), false);
  assert.equal(stripSqlComments("a /* x */ b").includes("/*"), false);
});

test("stripStringLiterals blanks quoted content", () => {
  assert.equal(stripStringLiterals("'DROP INDEX x'").includes("DROP"), false);
});

// --- corpus --------------------------------------------------------------

test("the real repo has no unquoted camelCase DDL", () => {
  const files = collectSqlFiles();
  assert.ok(files.length > 0, "no .sql files found — the guard would report a false green");
  const all = [];
  for (const f of files) {
    all.push(...findCaseViolations(f, readFileSync(f, "utf8")));
  }
  assert.deepEqual(all, [], `violations: ${JSON.stringify(all.slice(0, 3))}`);
});
