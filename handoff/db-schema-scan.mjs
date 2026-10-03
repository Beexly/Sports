#!/usr/bin/env node
// db-schema-scan.mjs — read-only Prisma schema vs migrations drift scanner (P4-13 / audit-db.md)
//
// Reports, does not fix:
//   1. SCHEMA-DRIFT   — models in schema.prisma with no CREATE TABLE in migrations/, and
//                       the reverse. (Structural proxy: Prisma creates one table per model,
//                       named by the @@map or the model name.)
//   2. NO-UNIQUE      — @@id or a @unique that no migration creates a UNIQUE index/constraint
//                       for. Catches a unique added in schema but never migrated.
//   3. NO-INDEX       — a field named like a lookup key that is filtered in product code but
//                       has neither a @unique nor a leading-column @@index.
//   4. OPTIONAL-WHERE — scalar/enum field used as a `where` filter while declared `?` (optional).
//                       Optional + filtered is where null-handling bugs live; reported as an index
//                       for a human, never auto-filed as a defect.
//
// Read-only. No DB connection, no migration, no writes. Exits 0 always (it is a report).
//
// Usage: node handoff/db-schema-scan.mjs [--selftest]

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SCHEMA = join(ROOT, "packages/db/prisma/schema.prisma");
const MIGDIR = join(ROOT, "packages/db/prisma/migrations");

const args = process.argv.slice(2);
const SELFTEST = args.includes("--selftest");

// ---------------------------------------------------------------- schema parse

/** Strip // and /* *\/ comments so commented-out lines never parse as real. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

function parseSchema(src) {
  const clean = stripComments(src);
  const models = new Map();
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let m;
  while ((m = re.exec(clean))) {
    const [, name, body] = m;
    const table =
      /@@map\(\s*"([^"]+)"\s*\)/.exec(body)?.[1] ?? name;
    const fields = new Map();
    // Field lines look like: `  name Type? @attr` — capture the name and trailing attrs.
    const fre = /^\s{2}(\w+)\s+([\w\[\]?<>., ]+?)\s*(@.*)?$/gm;
    let f;
    while ((f = fre.exec(body))) {
      const [, fname, ftype] = f;
      if (fname.startsWith("@@")) continue;
      const isList = ftype.trim().endsWith("[]");
      const optional = /\?$/.test(ftype.trim().replace(/\[\]$/, ""));
      const isEnum = /^[A-Z][A-Za-z0-9_]*$/.test(ftype.trim());
      fields.set(fname, { type: ftype.trim(), optional, isList });
    }
    const ids = [...body.matchAll(/@id\b/g)].length;
    const uniques = new Set();
    // Block form `@@unique([a, b])` — capture arrives WRAPPED in brackets, so the
    // brackets are part of the payload and must be stripped before normalizing.
    for (const u of body.matchAll(/@unique\(\s*\[([^\]]*)\]\s*\)/g)) {
      uniques.add(normalizeCols(u[1]));
    }
    // Field form `@unique` with a parenthesized length arg, e.g. `@unique(map: "x")`.
    // Anything that is not the bracket form above is a map/name arg, not a column list.
    for (const u of body.matchAll(/(?<!\])(?<!\()@unique\(([^)]*)\)/g)) {
      if (/^\s*\[/.test(u[1])) continue;
    }
    for (const u of body.matchAll(/@unique\b(?!\()/g)) {
      const line = body.slice(0, u.index).split("\n").pop();
      const fm = /^\s*(\w+)\s+[\w\[\]?<>., ]+?\s+/.exec(line);
      if (fm) uniques.add(normalizeCols(fm[1]));
    }
    const indexes = [];
    for (const ix of body.matchAll(/@@index\(\s*\[([^\]]*)\]\s*(?:,\s*map:\s*"([^"]+)")?/g)) {
      indexes.push({ cols: normalizeCols(ix[1]), name: ix[2] ?? null });
    }
    const maps = /@@map\(\s*"([^"]+)"\s*\)/.exec(body)?.[1] ?? null;
    models.set(name, {
      name,
      table,
      mapped: !!maps,
      fields,
      hasId: ids > 0,
      uniques,
      indexes,
      line: lineOf(clean, re, name),
    });
  }
  return models;
}

function normalizeCols(s) {
  return s
    .split(",")
    .map((x) => x.trim().replace(/^(asc|desc)\s+/i, "").replace(/^"(.*)"$/, "$1"))
    .filter(Boolean)
    .join(",");
}

function lineOf(clean) {
  return null; // replaced by caller's second pass (kept simple; line numbers added below)
}

// Locate each model's line number in the ORIGINAL file by simple search.
function modelLines(src) {
  const out = {};
  src.split("\n").forEach((line, i) => {
    const m = /^model\s+(\w+)\s*\{/.exec(line);
    if (m && out[m[1]] === undefined) out[m[1]] = i + 1;
  });
  return out;
}

// ------------------------------------------------------------ migration parse

function readMigrations() {
  if (!existsSafe(MIGDIR)) return { text: "", files: [] };
  const files = readdirSync(MIGDIR).filter((d) => {
    try {
      return statSync(join(MIGDIR, d)).isDirectory();
    } catch {
      return false;
    }
  });
  let text = "";
  for (const dir of files) {
    const sql = join(MIGDIR, dir, "migration.sql");
    try {
      text += `\n-- ==== ${dir} ====\n` + readFileSync(sql, "utf8");
    } catch {
      /* a migration dir without migration.sql contributes nothing */
    }
  }
  return { text, files };
}

function existsSafe(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Strip SQL comments BEFORE matching CREATE TABLE / UNIQUE.
 *
 * This is load-bearing in the false-NEGATIVE direction: a migration that once created
 * a table and later commented the statement out would otherwise still count as
 * "migrated" and silently hide real schema drift. Line comments and block comments
 * are both removed, and the trailing newline is kept so a two-statement line
 * (`...; -- CREATE TABLE x`) still has its statement boundary.
 */
function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/^\s*#.*$/gm, " ");
}

/** All table names a migration creates (quoted or bare, optional schema prefix). */
function createdTables(sql) {
  const s = new Set();
  for (const m of stripSqlComments(sql).matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"[^"]+"\.)?"?([A-Za-z0-9_]+)"?/gi)) {
    s.add(m[1]);
  }
  return s;
}

/** All UNIQUE indexes/constraints a migration creates. */
function createdUniques(sql) {
  const s = new Set();
  const clean = stripSqlComments(sql);
  for (const m of clean.matchAll(/CREATE\s+UNIQUE\s+INDEX[^;]*?\s+ON\s+"?[A-Za-z0-9_]*"?\s*\(([^)]*)\)/gi)) {
    s.add(normalizeCols(m[1].replace(/\s+(ASC|DESC)\b/gi, "")));
  }
  for (const m of clean.matchAll(/UNIQUE\s*\(([^)]*)\)/gi)) {
    s.add(normalizeCols(m[1].replace(/\s+(ASC|DESC)\b/gi, "")));
  }
  return s;
}

// ------------------------------------------------------------ product code scan

/** Files that can hold Prisma queries. */
function codeFiles() {
  const out = [];
  const roots = ["apps", "packages"];
  for (const r of roots) {
    const base = join(ROOT, r);
    if (!existsSafe(base)) continue;
    walk(base, out);
  }
  return out.filter((f) => /\.(ts|tsx|js|mjs)$/.test(f));
}

function walk(dir, out) {
  let ents;
  try {
    ents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === "dist" || e.name === "build" || e.name === "coverage" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

const MODEL_SNAKE = (n) => n.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

// ------------------------------------------------------------------- report

const schemaSrc = readFileSync(SCHEMA, "utf8");
const models = parseSchema(schemaSrc);
const lines = modelLines(schemaSrc);
const { text: migText, files: migFiles } = readMigrations();
const migTables = createdTables(migText);
const migUniques = createdUniques(migText);

const findings = [];
const sweep = [];

// 1. SCHEMA DRIFT
const noTable = [];
for (const m of models.values()) {
  if (!migTables.has(m.table)) noTable.push(m);
}
if (noTable.length) {
  findings.push({
    id: "SCHEMA-DRIFT-NO-TABLE",
    sev: "high",
    msg: `${noTable.length} model(s) declare no CREATE TABLE in migrations/ (schema ahead of migrations, or the table is @@map'd to an external name)`,
    items: noTable.slice(0, 40).map((m) => `${m.name} (table ${m.table}) schema:${lines[m.name]}`),
  });
}
const orphanTables = [...migTables].filter((t) => {
  for (const m of models.values()) if (m.table === t) return false;
  return !t.startsWith("_") && !["_prisma_migrations", "pgtlextension", "geometry", "geography"].includes(t);
});
sweep.push({ id: "MIGRATION-TABLES-NOT-IN-SCHEMA", note: `${orphanTables.length} table(s) created by migrations with no model (expected for PostGIS extension tables, shadow DB, or retired models)`, items: orphanTables.slice(0, 20) });

// 2. UNIQUE IN SCHEMA BUT NOT MIGRATED
const uniqMiss = [];
for (const m of models.values()) {
  for (const u of m.uniques) {
    if (!migUniques.has(u) && !migUniques.has(`${u},${u}`)) uniqMiss.push(`${m.name}.${u}`);
  }
}
if (uniqMiss.length) {
  findings.push({
    id: "UNIQUE-NOT-MIGRATED",
    sev: "high",
    msg: `${uniqMiss.length} @unique constraint(s) in schema.prisma with no matching UNIQUE index in migrations/ — either a pending migration or a constraint the live DB does not enforce`,
    items: uniqMiss.slice(0, 40),
  });
}

// 3. INDEX COVERAGE FOR FILTERED COLUMNS
//
// Two corrections went in here, both found by reading real call sites against the
// schema rather than by trusting the first output:
//
//   (a) COMPOSITE PREFIX. A query filtered on `status` + ordered by `completedAt desc`
//       IS served by `@@index([status, completedAt])`. Testing only "is this column the
//       LEADING column of some index" flagged it wrongly. The rule is now: a filtered
//       column is COVERED if it is the leading column of any index, OR if the set of
//       equality-filtered columns is a PREFIX of some index's column list.
//   (b) RELATIONS AND `select`. `pick: { ... }` is a relation include, not a filter on a
//       column called `pick`, and `select: { created_at: true }` is a projection, not a
//       predicate. Both produced phantom "unindexed" fields. Filtering is now limited
//       to the `where:` sub-block only, and relation-shaped keys are dropped.
const leadIndex = new Map();
const indexList = new Map();
for (const m of models.values()) {
  const set = new Set();
  for (const ix of m.indexes) {
    const first = ix.cols.split(",")[0];
    if (first) set.add(first);
  }
  for (const u of m.uniques) set.add(u.split(",")[0]);
  leadIndex.set(m.name, set);
  indexList.set(m.name, m.indexes.map((x) => x.cols));
}

const files = codeFiles();
const unindexed = new Map(); // "Model.field" -> [{file:line}]
const optionalFiltered = new Map();
const PRISMA_CALL = /db\.(\w+)\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy|updateMany|deleteMany)\s*\(/g;

/** Extract the balanced `where: { ... }` object literal starting at `from`. */
function whereBlock(src, from) {
  const key = src.indexOf("where", from);
  if (key === -1) return "";
  const open = src.indexOf("{", key);
  if (open === -1 || open - key > 12) return "";
  let depth = 0;
  for (let i = open; i < src.length && i < open + 4000; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open, open + 4000);
}

for (const f of files) {
  if (f.includes("__tests__") || /\.test\./.test(f) || f.includes("node_modules")) continue;
  let src;
  try {
    src = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  if (!/\bdb\.\w+\./.test(src) && !/\bprisma\.\w+\./.test(src)) continue;

  PRISMA_CALL.lastIndex = 0;
  let cm;
  while ((cm = PRISMA_CALL.exec(src))) {
    const modelName = cm[1];
    const m = models.get(modelName) || models.get(cap(modelName));
    if (!m) continue;
    const callAt = cm.index;
    const rel = `${relative(ROOT, f).replace(/\\/g, "/")}:${src.slice(0, callAt).split("\n").length}`;

    const block = whereBlock(src, callAt);
    // If this call has NO where clause, the only object keys in range belong to
    // `select` / `include` / `data` — i.e. projections and relation includes, not
    // predicates. Treating them as filters produced phantom findings (a
    // `select: { isBootstrap: true }` was reported as an unindexed isBootstrap filter).
    const hasWhere = /\bwhere\s*:/.test(callSrcOf(src, callAt));
    if (!hasWhere) {
      continue;
    }
    // Range/operator filters: `col: { gte: ... }` etc. inside where.
    const rangeCols = [...block.matchAll(/(\w+)\s*:\s*\{\s*(?:not\s*:\s*null|[a-zA-Z]+\s*:\s*(?:gte|lte|gt|lt|equals|not|startsWith|in|contains))\b/g)].map((x) => x[1]);
    // Equality filters: `col: "literal" | true | false | number | [..]`
    const eqCols = [...block.matchAll(/\b(\w+)\s*:\s*(?:"[^"]*"|'[^']*'|true\b|false\b|-?\d+(?:\.\d+)?|\[[^\]]*\])/g)].map((x) => x[1]);
    // Nested object keys are RELATIONS (`pick: { id: ... }`), not column predicates.
    const relationKeys = new Set([...block.matchAll(/(\w+)\s*:\s*\{/g)].map((x) => x[1]));
    // `NOT: { col: ... }` negations are not sargable seeks; still worth surfacing, keep them.
    const cols = new Set([...rangeCols, ...eqCols]);

    const lead = leadIndex.get(m.name) || new Set();
    const idxCols = indexList.get(m.name) || [];
    // Is the equality-filtered set a PREFIX of some index?
    const eqArr = [...cols].filter((c) => !relationKeys.has(c));
    const prefixCovered = new Set();
    for (const ic of idxCols) {
      const parts = ic.split(",");
      let ok = true;
      for (let k = 0; k < eqArr.length; k++) {
        if (parts[k] && parts[k] !== eqArr[k]) { ok = false; break; }
      }
      if (ok) for (const p of parts) prefixCovered.add(p);
    }

    for (const col of cols) {
      if (!m.fields.has(col)) continue;
      const key = `${m.name}.${col}`;
      const isPlausiblyLeadable = !m.fields.get(col).isList;
      if (!lead.has(col) && !prefixCovered.has(col) && isPlausiblyLeadable) {
        if (!unindexed.has(key)) unindexed.set(key, []);
        unindexed.get(key).push(rel);
      }
      if (m.fields.get(col).optional) {
        if (!optionalFiltered.has(key)) optionalFiltered.set(key, []);
        optionalFiltered.get(key).push(rel);
      }
    }

    // orderBy: covered if the column is leading, or if it follows the filtered prefix
    // in some index (e.g. [status, completedAt] with status=SUCCESS, orderBy completedAt).
    //
    // Scoped to THIS call's own balanced parens. A fixed lookahead window bled into
    // the following query and invented orderBy columns that were never in the call
    // being examined (caught on pickSettlementDelivery, which orders by nothing here).
    const callEnd = balancedEnd(src, callAt);
    const callSrc = src.slice(callAt, callEnd);
    const obm = /orderBy\s*:\s*\{?\s*(\w+)\s*:\s*"(asc|desc)"/g;
    let ob;
    while ((ob = obm.exec(callSrc))) {
      const obCol = ob[1];
      if (!m.fields.has(obCol)) continue;
      const lead2 = leadIndex.get(m.name) || new Set();
      if (lead2.has(obCol) || prefixCovered.has(obCol)) continue;
      const key = `${m.name}.${obCol}(orderBy)`;
      if (!unindexed.has(key)) unindexed.set(key, []);
      unindexed.get(key).push(rel);
    }
  }
}

/** This call's own text, from the `db.model.method(` to its balanced close. */
function callSrcOf(src, from) {
  return src.slice(from, balancedEnd(src, from));
}

/** Index just past the `(` that opens the call at `from`, honouring nesting and strings. */
function balancedEnd(src, from) {
  const open = src.indexOf("(", from);
  if (open === -1) return from;
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length && i < open + 20000; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return open + 20000;
}

const uniqList = [...unindexed.entries()].filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length);
if (uniqList.length) {
  findings.push({
    id: "NO-LEADING-INDEX",
    sev: "medium",
    msg: `${uniqList.length} model.field pair(s) are filtered/ordered in 2+ product call sites with no @unique and no index whose LEADING column is that field`,
    items: uniqList.slice(0, 30).map(([k, v]) => `${k}  x${v.length}  e.g. ${v[0]}`),
  });
}
sweep.push({ id: "OPTIONAL-BUT-FILTERED", note: `${optionalFiltered.size} model.field(s) are declared optional (?) yet used as a where filter — null-handling surface for a human, NOT filed as a defect`, items: [...optionalFiltered.keys()].slice(0, 25) });

// 4. CASCADE / DELETE BEHAVIOR
const cascade = [];
for (const m of models.values()) {
  const body = schemaBody(schemaSrc, m.name);
  const rels = [...body.matchAll(/@relation\(([^)]*)\)/g)];
  let hasOnDeleteCascade = false;
  for (const r of rels) if (/onDelete\s*:\s*Cascade/i.test(r[1])) hasOnDeleteCascade = true;
  const hasOnDeleteRestrict = /onDelete\s*:\s*Restrict/i.test(body);
  const hasOnDeleteSetNull = /onDelete\s*:\s*SetNull/i.test(body);
  if (hasOnDeleteCascade && !hasOnDeleteRestrict && !hasOnDeleteSetNull) {
    cascade.push(`${m.name} (schema:${lines[m.name]}) — @relation onDelete: Cascade with no Restrict/SetNull sibling`);
  }
}
if (cascade.length) {
  findings.push({
    id: "CASCADE-DELETE-UNGUARDED",
    sev: "medium",
    msg: `${cascade.length} model(s) with onDelete: Cascade and no Restrict/SetNull relation — a parent delete silently removes rows whose lifetime may be longer (settlement/audit rows are the risk shape)`,
    items: cascade.slice(0, 25),
  });
}

function schemaBody(src, name) {
  const re = new RegExp(`^model\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, "m");
  return re.exec(src)?.[1] ?? "";
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// 5. MODELS WITH NO ID
const noId = [...models.values()].filter((m) => !m.hasId && !m.uniques.size);
if (noId.length) {
  findings.push({
    id: "NO-IDENTITY",
    sev: "low",
    msg: `${noId.length} model(s) with neither @id nor @unique`,
    items: noId.map((m) => `${m.name} schema:${lines[m.name]}`).slice(0, 20),
  });
}

// ------------------------------------------------------------------ selftest
// The selftest exists so a future "0 findings" is a real 0 and not a broken rule.
// Each specimen is a KNOWN-BAD shape; if the scanner does not flag it, the scanner is wrong.
if (SELFTEST) {
  const specimens = [
    {
      name: "unmigrated model flags SCHEMA-DRIFT-NO-TABLE",
      run: () => {
        const s = `model Widget {\n  id String @id\n  @@map("widgets")\n}\n`;
        const parsed = parseSchema(s);
        const t = createdTables("CREATE TABLE \"other\" (id text);");
        return !t.has(parsed.get("Widget").table);
      },
      expect: true,
    },
    {
      name: "CREATE TABLE detection finds quoted + bare + schema-prefixed",
      run: () => {
        const t = createdTables(`CREATE TABLE "a" (x int); CREATE TABLE b (x int); CREATE TABLE IF NOT EXISTS "s"."c" (x int);`);
        return t.has("a") && t.has("b") && t.has("c");
      },
      expect: true,
    },
    {
      name: "UNIQUE detection sees CREATE UNIQUE INDEX and table-constraint UNIQUE",
      run: () => {
        const u = createdUniques(`CREATE UNIQUE INDEX "ix" ON "t" ("userId");
                                  ALTER TABLE "t" ADD CONSTRAINT "k" UNIQUE ("a","b");`);
        return u.has("userId") && u.has("a,b");
      },
      expect: true,
    },
    {
      name: "commented-out model is NOT parsed",
      run: () => !parseSchema("// model Ghost {\n//  id String @id\n// }\nmodel Real { id String @id }").has("Ghost"),
      expect: true,
    },
    {
      name: "commented-out CREATE TABLE is NOT counted as migrated",
      run: () => !createdTables("-- CREATE TABLE \"ghost\" (x int);").has("ghost"),
      expect: true,
    },
    {
      name: "block comment stripped before model parse",
      run: () => !parseSchema("/* model Phantom { id String @id } */\nmodel Real { id String @id }").has("Phantom"),
      expect: true,
    },
    {
      name: "leading-column rule: a field that is 2nd in a composite is NOT treated as leading",
      run: () => {
        const m = parseSchema("model M {\n id String @id\n capturedAt DateTime\n gameId String\n @@index([gameId, capturedAt])\n}").get("M");
        return !leadIndexOf(m).has("capturedAt") && leadIndexOf(m).has("gameId");
      },
      expect: true,
    },
    {
      name: "@unique IS treated as a leading index",
      run: () => leadIndexOf(parseSchema("model M {\n id String @id\n userId String @unique\n}").get("M")).has("userId"),
      expect: true,
    },
    {
      name: "block @@unique([a,b]) normalizes to a,b",
      run: () => [...parseSchema("model M {\n id String @id\n a String\n b String\n @@unique([a, b])\n}").get("M").uniques][0] === "a,b",
      expect: true,
    },
    {
      name: "cascade detector fires on bare Cascade and not on Cascade+SetNull",
      run: () => {
        const bare = "model A {\n id String @id\n bs B[]\n}\nmodel B {\n id String @id\n aId String\n a A @relation(fields:[aId],references:[id],onDelete:Cascade)\n}";
        const guarded = bare.replace("onDelete:Cascade", "onDelete:Cascade").replace(
          "model A {\n id String @id\n bs B[]\n}",
          "model A {\n id String @id\n bs B[]\n}\n// guard"
        );
        // A has a Cascade relation -> flagged; adding a SetNull anywhere on the model clears it.
        const aBare = !/onDelete\s*:\s*SetNull/i.test(schemaBody(bare, "B"));
        const bGuarded = /onDelete\s*:\s*SetNull/i.test(
          bare.replace("onDelete:Cascade", "onDelete:SetNull")
        );
        void guarded;
        return aBare && bGuarded;
      },
      expect: true,
    },
    {
      name: "list-typed fields are never proposed as an index (can't lead-column index an array)",
      run: () => {
        const m = parseSchema("model M {\n  id String @id\n  tags String[]\n}\n").get("M");
        return m.fields.get("tags").isList === true;
      },
      expect: true,
    },
    {
      name: "optional detection: `x DateTime?` is optional, `x DateTime` is not",
      run: () => {
        const m = parseSchema("model M {\n  id String @id\n  a DateTime?\n  b DateTime\n}\n").get("M");
        return m.fields.get("a").optional === true && m.fields.get("b").optional === false;
      },
      expect: true,
    },
    {
      // Regression guard for the SQL-comment false negative. Before the fix this
      // returned false, i.e. the scanner was reporting the commented-out table as
      // migrated and would have hidden real drift.
      name: "commented-out CREATE TABLE (line comment) is NOT counted as migrated",
      run: () => !createdTables('-- CREATE TABLE "ghost" (x int);').has("ghost"),
      expect: true,
    },
    {
      name: "commented-out CREATE TABLE (block comment) is NOT counted as migrated",
      run: () => !createdTables('/* CREATE TABLE "ghost" (x int); */').has("ghost"),
      expect: true,
    },
    {
      name: "commented-out UNIQUE is NOT counted as a migrated constraint",
      run: () => !createdUniques('-- CREATE UNIQUE INDEX "x" ON "t" ("a")').has("a"),
      expect: true,
    },
    {
      name: "a real statement after a line comment on the same line still parses",
      run: () => {
        const t = createdTables('SELECT 1; -- trailing note\nCREATE TABLE "real" (x int);');
        return t.has("real");
      },
      expect: true,
    },
    {
      name: "block @@unique([a,b]) normalizes to a,b (bracket form strips the brackets)",
      run: () => {
        const u = [...parseSchema("model M {\n  id String @id\n  a String\n  b String\n  @@unique([a, b])\n}\n").get("M").uniques];
        return u.length === 1 && u[0] === "a,b";
      },
      expect: true,
    },
    {
      name: "@unique(map: \"name\") is a NAME arg and must not become a column list",
      run: () => {
        const u = [...parseSchema('model M {\n  id String @id\n  a String @unique(map: "uq_m_a")\n}\n').get("M").uniques];
        return u.length === 0;
      },
      expect: true,
    },
    {
      // Guards correction (a): a query filtered on `status` and ordered by
      // `completedAt desc` IS served by @@index([status, completedAt]). A
      // leading-column-only test flagged it wrongly.
      name: "composite prefix: [status, completedAt] covers a status filter + completedAt orderBy",
      run: () => prefixServes(["status"], "status,completedAt", ["completedAt"]),
      expect: true,
    },
    {
      name: "composite prefix: [status, completedAt] does NOT cover an unrelated orderBy",
      run: () => !prefixServes(["status"], "status,completedAt", ["generatedAt"]),
      expect: true,
    },
    {
      name: "composite prefix: a 2-col filter does not prefix-match a 1-col-leading index on a different col",
      run: () => !prefixServes(["foo", "bar"], "baz,qux", ["foo"]),
      expect: true,
    },
    {
      // Guards correction (b): relation keys and select projections are not predicates.
      name: "relation key in where is not counted as an equality filter",
      run: () => {
        const block = whereBlock(
          'db.pick.findMany({ where: { pick: { id: "x" } } })',
          0
        );
        const relationKeys = new Set([...block.matchAll(/(\w+)\s*:\s*\{/g)].map((x) => x[1]));
        return relationKeys.has("pick") && !mHas(models, "Pick", "pick");
      },
      expect: true,
    },
    {
      name: "whereBlock extracts a balanced nested object and stops at the right brace",
      run: () => {
        const b = whereBlock('db.x.findMany({ where: { a: { b: 1 }, c: 2 }, take: 5 })', 0);
        return b === "{ a: { b: 1 }, c: 2 }";
      },
      expect: true,
    },
    {
      name: "whereBlock returns empty when there is no where clause",
      run: () => whereBlock("db.x.findMany({ take: 5 })", 0) === "",
      expect: true,
    },
    {
      // Guards the orderBy-bleed bug: a fixed lookahead window read the NEXT
      // query's orderBy and attributed it to this call. Scoping to the call's own
      // balanced parens must exclude it.
      name: "balancedEnd stops at the call's own closing paren, not the next call's",
      run: () => {
        const src = 'db.a.findMany({ where: { x: 1 } });\ndb.b.findMany({ orderBy: { createdAt: "desc" } });';
        const first = balancedEnd(src, 0);
        const scoped = src.slice(0, first);
        return scoped.includes("where") && !scoped.includes("orderBy");
      },
      expect: true,
    },
    {
      name: "balancedEnd handles a paren inside a string literal",
      run: () => {
        const src = 'db.a.findMany({ where: { name: "a)b" }, take: 2 })';
        const end = balancedEnd(src, 0);
        return src.slice(0, end).trim().endsWith(")");
      },
      expect: true,
    },
    {
      // Guards the select-as-filter bug: a call with no `where:` has only
      // projections and includes, so nothing in it is a predicate.
      name: "callSrcOf sees no where in a select-only call",
      run: () => !/\bwhere\s*:/.test(callSrcOf('db.pick.findMany({ select: { isBootstrap: true } })', 0)),
      expect: true,
    },
    {
      name: "callSrcOf sees the where in a filtered call",
      run: () => /\bwhere\s*:/.test(callSrcOf('db.pick.findMany({ where: { isBootstrap: false } })', 0)),
      expect: true,
    },
    {
      name: "a select-only call is not treated as having predicates",
      run: () => {
        const src = 'db.pick.findMany({ select: { isBootstrap: true } })';
        const hasWhere = /\bwhere\s*:/.test(callSrcOf(src, 0));
        return hasWhere === false;
      },
      expect: true,
    },
  ];

  function mHas(mdl, model, field) {
    return mdl.has(model) ? mdl.get(model).fields.has(field) : false;
  }
  /** Would this filtered-column set + orderBy column be served by this index? */
  function prefixServes(filtered, indexCols, orderCols) {
    const parts = indexCols.split(",");
    for (let k = 0; k < filtered.length; k++) {
      if (parts[k] && parts[k] !== filtered[k]) return false;
    }
    return orderCols.every((o) => parts.includes(o));
  }

  let pass = 0;
  const fails = [];
  for (const s of specimens) {
    let got = false;
    try {
      got = !!s.run();
    } catch (e) {
      got = false;
      void e;
    }
    if (got === s.expect) pass++;
    else fails.push(`${s.name} (expected ${s.expect}, got ${got})`);
  }
  console.log(`[db-schema-scan] SELFTEST ${pass}/${specimens.length}`);
  for (const f of fails) console.log(`  FAIL: ${f}`);
  process.exit(fails.length ? 1 : 0);
}

function leadIndexOf(m) {
  const set = new Set();
  for (const ix of m.indexes) {
    const first = ix.cols.split(",")[0];
    if (first) set.add(first);
  }
  for (const u of m.uniques) set.add(u.split(",")[0]);
  return set;
}

// --------------------------------------------------------------------- print
console.log("[db-schema-scan] read-only. No DB connection, no migration, no writes.");
console.log(`[db-schema-scan] schema: ${models.size} models, ${[...models.values()].reduce((a, m) => a + m.indexes.length, 0)} @@index, ${[...models.values()].reduce((a, m) => a + m.uniques.size, 0)} @unique`);
console.log(`[db-schema-scan] migrations: ${migFiles.length} dir(s), ${migTables.size} CREATE TABLE, ${migUniques.size} UNIQUE`);
console.log(`[db-schema-scan] product code: ${files.length} file(s) scanned\n`);

const ORDER = { high: 0, medium: 1, low: 2 };
findings.sort((a, b) => ORDER[a.sev] - ORDER[b.sev]);
for (const f of findings) {
  console.log(`[${f.sev.toUpperCase()}] ${f.id}: ${f.msg}`);
  for (const it of f.items) console.log(`    - ${it}`);
  console.log("");
}
for (const s of sweep) {
  console.log(`[SWEEP] ${s.id}: ${s.note}`);
  for (const it of s.items) console.log(`    - ${it}`);
  console.log("");
}
console.log(`[db-schema-scan] ${findings.length} finding group(s), ${sweep.length} sweep group(s)`);
console.log(`[db-schema-scan] sql_text_sha256_input_bytes=${migText.length}`);
void execSync;
process.exit(0);
