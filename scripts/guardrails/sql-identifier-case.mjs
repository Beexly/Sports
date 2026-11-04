#!/usr/bin/env node
/**
 * sql-identifier-case — an unquoted camelCase identifier in DDL is a SILENT
 * no-op, and `IF EXISTS` makes it look like success.
 *
 * WHY THIS EXISTS
 *
 * This schema uses camelCase columns and index names throughout: "gameId",
 * "fetchedAt", "odds_gameId_idx", "signals_entityType_entityId_idx". Postgres
 * folds an unquoted identifier to lower case, so
 *
 *     DROP INDEX IF EXISTS public.odds_gameId_idx;
 *
 * looks for `oddsgameid_idx`, which does not exist. `IF EXISTS` suppresses the
 * error, Postgres still prints the `DROP INDEX` command tag, and the statement
 * exits 0 having done nothing.
 *
 * MEASURED, not theorised (Neon branch, 2026-11-04):
 *
 *     DROP INDEX IF EXISTS public.odds_gameId_idx;
 *       -> DROP INDEX                                   (command tag)
 *       -> SELECT count(*) ... relname='odds_gameId_idx' -> 1   (still there)
 *
 *     DROP INDEX CONCURRENTLY IF EXISTS public."odds_gameId_idx";
 *       -> DROP INDEX
 *       -> count -> 0                                   (actually dropped)
 *
 * The first draft of db/ops/2026-11-04_odds_index_cleanup.sql had eleven of
 * sixteen drop statements in this shape. All eleven reported success. All
 * eleven were no-ops. It was caught only by asserting the post-condition, which
 * is why every block in that file now ends with a verification query.
 *
 * This guard makes the mistake impossible to reintroduce silently: any unquoted
 * identifier containing an upper-case letter in a DDL object position fails.
 *
 * NOT FLAGGED: quoted identifiers, lower-case identifiers, column names inside
 * `ALTER TABLE ... SET (option = value)` storage parameters, and anything inside
 * a string literal or a comment.
 *
 * Usage:
 *   node scripts/guardrails/sql-identifier-case.mjs
 *   node scripts/guardrails/sql-identifier-case.mjs --update
 *   node scripts/guardrails/sql-identifier-case.mjs --json
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "sql-identifier-case";
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASELINE_PATH = resolve(
  REPO_ROOT,
  "scripts/guardrails/sql-identifier-case.baseline.json",
);

/** Directories that may hold applied SQL. Every one is scanned. */
const SQL_ROOTS = ["db", "reconciliation", "docs", "scripts", "packages", "apps"];

/** Never descend into these. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo",
]);

/**
 * DDL statements whose object name follows the keyword group.
 * `name` is captured loosely and validated afterwards, because an identifier may
 * be schema-qualified and each part may independently be quoted.
 */
const DDL_PATTERNS = [
  { kind: "drop-index", re: /\bDROP\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?/gi },
  {
    kind: "create-index",
    re: /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?/gi,
  },
  { kind: "drop-table", re: /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?/gi },
  { kind: "alter-table", re: /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?/gi },
  { kind: "truncate", re: /\bTRUNCATE\s+(?:TABLE\s+)?(?:ONLY\s+)?/gi },
];

/** `[schema.]name`, where each part is `bare` or `"quoted"`. */
const IDENT_RE = /^(?:(?:"[^"]*"|[A-Za-z0-9_$]+)\s*\.\s*)*(?:"[^"]*"|[A-Za-z0-9_$]+)$/;

/** Words that can legitimately follow these keywords and are not object names. */
const NOT_AN_IDENT = new Set([
  "concurrently", "if", "not", "exists", "only", "unique", "index", "table",
  "and", "or", "set", "where", "using", "on", "add", "drop", "alter", "column",
]);

export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

/** Remove single-quoted literals so DDL-looking text inside them is ignored. */
export function stripStringLiterals(sql) {
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}

/**
 * Split an identifier into its dotted parts, respecting double quotes.
 * Returns [] when the token is not a well-formed identifier.
 */
export function splitIdent(token) {
  if (!IDENT_RE.test(token)) return [];
  const parts = [];
  for (const raw of token.split(".")) {
    parts.push(raw.trim());
  }
  return parts;
}

/**
 * Find every unquoted identifier part that contains an upper-case letter.
 * Pure — the caller owns file I/O, so this is provable on synthetic SQL.
 */
export function findCaseViolations(file, rawSql) {
  const sql = stripStringLiterals(stripSqlComments(rawSql));
  const violations = [];

  for (const { kind, re } of DDL_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(sql)) !== null) {
      const rest = sql.slice(m.index + m[0].length);
      const token = rest.split(/[\s;,()]/)[0] ?? "";
      if (!token || NOT_AN_IDENT.has(token.toLowerCase())) continue;
      const parts = splitIdent(token);
      if (parts.length === 0) continue;

      for (const part of parts) {
        if (part.startsWith('"')) continue; // explicitly quoted: correct
        if (/[A-Z]/.test(part)) {
          violations.push({
            file,
            kind,
            identifier: token.replace(/\s+/g, ""),
            unquoted: part,
          });
          break;
        }
      }
    }
  }

  return violations;
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile() && full.toLowerCase().endsWith(".sql")) out.push(full);
  }
}

export function collectSqlFiles(root = REPO_ROOT) {
  const files = [];
  for (const rel of SQL_ROOTS) {
    const dir = join(root, rel);
    if (existsSync(dir)) walk(dir, files);
  }
  return [...new Set(files)].sort();
}

const key = (v) => `${v.file}::${v.kind}::${v.identifier}`;

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const update = args.includes("--update");

  const files = collectSqlFiles();
  if (files.length === 0) {
    console.error(`${TAG} FAIL — no .sql files found; a guard that scans nothing reports a false green`);
    process.exit(2);
  }

  const found = [];
  for (const file of files) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    let sql;
    try {
      sql = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    found.push(...findCaseViolations(rel, sql));
  }

  if (update) {
    writeFileSync(
      BASELINE_PATH,
      JSON.stringify({ frozen: found.map(key).sort() }, null, 2) + "\n",
    );
    console.log(`${TAG} baseline updated — ${found.length} frozen violation(s)`);
    process.exit(0);
  }

  const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")).frozen ?? []
    : [];
  const known = new Set(baseline);
  const fresh = found.filter((v) => !known.has(key(v)));

  if (json) {
    console.log(JSON.stringify({ scanned: files.length, found, fresh, baseline: known.size }, null, 2));
  }

  if (fresh.length === 0) {
    console.log(
      `${TAG} PASS — ${files.length} sql file(s), ${found.length} frozen violation(s), 0 new`,
    );
    process.exit(0);
  }

  console.error(`${TAG} FAIL — ${fresh.length} NEW unquoted camelCase identifier(s):`);
  for (const v of fresh) {
    console.error(
      `  ${v.file}  ${v.kind}  "${v.identifier}" — '${v.unquoted}' folds to ` +
        `'${v.unquoted.toLowerCase()}'; quote it: "${v.unquoted}"`,
    );
  }
  console.error(
    `${TAG} An unquoted camelCase name with IF EXISTS is a SILENT no-op that still ` +
      `prints the command tag. Always assert the post-condition.`,
  );
  console.error(
    `${TAG} If these are accepted for now: node scripts/guardrails/sql-identifier-case.mjs --update`,
  );
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (err) {
    console.error(`${TAG} crashed: ${err?.stack ?? err}`);
    process.exit(2);
  }
}
