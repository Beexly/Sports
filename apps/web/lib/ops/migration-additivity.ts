/**
 * Migration additivity classifier — the invariant the rollback story rests on.
 *
 * WHY THIS EXISTS
 *
 * Prisma has no down-migrations. `prisma migrate deploy` applies forward only;
 * there is no generated inverse and no `migrate down` in this repo's toolchain
 * (see `packages/db/package.json` — only `deploy`, `status`, `dev`). So the
 * ONLY thing that makes a deploy rollback safe is that the schema a rolled-back
 * app meets is a strict SUPERSET of the schema it was built against.
 *
 * That property holds today: every migration in `packages/db/prisma/migrations`
 * is additive. It is not enforced anywhere, and it is exactly the kind of
 * property that dies quietly — one `DROP COLUMN` in one PR among dozens and
 * "promote the previous deployment" silently stops being a recovery path,
 * with nothing failing until the day someone needs it.
 *
 * `migrate-if-configured.mjs` runs `prisma migrate deploy` inside the Vercel
 * PRODUCTION build (`vercel.json` buildCommand), so a schema change lands
 * with the build that carries it. Vercel's Instant Rollback / Promote reuses a
 * prior BUILD ARTIFACT and does not re-run that build — meaning the schema
 * stays forward while the app goes back. Old app + new schema is only a safe
 * state while migrations are additive. This module is that guarantee, made
 * mechanical.
 *
 * WHAT COUNTS AS DESTRUCTIVE
 *
 * Anything that removes or narrows something an already-deployed app version
 * may still be reading or writing:
 *   - dropping a table / type / view / schema, or a column
 *   - renaming anything (a rename is a drop + an add to an older client)
 *   - narrowing a column: SET NOT NULL, or a type change
 *   - row-level DML that mutates existing data (UPDATE / DELETE / TRUNCATE)
 *   - ADD COLUMN ... NOT NULL with no DEFAULT — on a non-empty table this
 *     fails outright, and even where it succeeds an older client's INSERT
 *     (which does not know the column) then fails
 *   - an UNGUARDED `DROP CONSTRAINT` — `DROP CONSTRAINT IF EXISTS` immediately
 *     followed by re-adding the same constraint is this repo's re-appliability
 *     idiom (see 20260722140000_add_ai_control_plane_ledger) and is allowed;
 *     an unguarded drop is a real removal
 *
 * Deliberately NOT flagged: `DROP NOT NULL` and `DROP DEFAULT` (both widen —
 * an older client keeps working), and `CREATE ... IF NOT EXISTS` of any kind.
 *
 * This module only READS `packages/db/prisma/migrations`. It never writes to
 * it, and it is not a substitute for review — a migration can be additive and
 * still be a bad idea (see `lockRiskNotes`).
 */

/** The kind of destructive statement found. */
export type DestructiveKind =
  | "drop_object"
  | "drop_column"
  | "rename"
  | "set_not_null"
  | "alter_column_type"
  | "truncate"
  | "delete_rows"
  | "update_rows"
  | "unguarded_drop_constraint"
  | "add_notnull_column_without_default";

export interface AdditivityViolation {
  /** Migration directory name, e.g. "20260603120000_add_pick_clv". */
  readonly migration: string;
  readonly kind: DestructiveKind;
  /** The offending SQL, collapsed to one line and truncated for readability. */
  readonly statement: string;
}

/** Human-readable reason per kind, used in assertion messages. */
export const DESTRUCTIVE_REASON: Record<DestructiveKind, string> = {
  drop_object: "drops a table/type/view/schema — a rolled-back app that still reads it breaks",
  drop_column: "drops a column — a rolled-back app that still selects it breaks",
  rename: "renames an object — to an older client a rename is a drop plus an add",
  set_not_null: "narrows a column to NOT NULL — an older client's INSERT omitting it now fails",
  alter_column_type: "changes a column type — an older client's reads/writes may no longer fit",
  truncate: "deletes every row in a table",
  delete_rows: "deletes existing rows",
  update_rows: "rewrites existing rows in place",
  unguarded_drop_constraint:
    "drops a constraint without IF EXISTS — not the re-appliability idiom, so this is a real removal",
  add_notnull_column_without_default:
    "adds NOT NULL with no DEFAULT — fails on a non-empty table, and breaks an older client's INSERT",
};

/**
 * Strip SQL comments so commented-out DDL is not mistaken for real DDL.
 * Several migrations document their manual inverse in a `--` comment
 * (20260722130000_add_checkout_attempt notes `DROP TABLE IF EXISTS ...`),
 * which is documentation, not a statement.
 */
export function stripSqlComments(sql: string): string {
  // Block comments first, then line comments. Neither nests in these files.
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/**
 * Remove foreign-key referential actions before scanning for DML. Without
 * this, `ON DELETE RESTRICT ON UPDATE CASCADE` — present in nearly every
 * CREATE TABLE here — reads as a DELETE and an UPDATE.
 */
function stripReferentialActions(sql: string): string {
  return sql.replace(/\bON\s+(DELETE|UPDATE)\s+(NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT|CASCADE|RESTRICT)/gi, " ");
}

/** Collapse whitespace and truncate, for a readable assertion message. */
function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * Split an `ADD COLUMN` clause list at top level, ignoring commas inside
 * parentheses so `TIMESTAMP(3)` and `NUMERIC(10, 2)` stay intact.
 */
function topLevelClauses(sql: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if ((ch === "," || ch === ";") && depth === 0) {
      out.push(sql.slice(start, i));
      start = i + 1;
    }
  }
  out.push(sql.slice(start));
  return out;
}

/** Patterns that are destructive wherever they appear (including inside DO $$ blocks). */
const PATTERNS: ReadonlyArray<{ kind: DestructiveKind; re: RegExp }> = [
  // `DROP TABLE|TYPE|VIEW|MATERIALIZED VIEW|SCHEMA|DATABASE` — with or without IF EXISTS.
  { kind: "drop_object", re: /\bDROP\s+(?:IF\s+EXISTS\s+)?(?:TABLE|TYPE|VIEW|MATERIALIZED\s+VIEW|SCHEMA|DATABASE)\b/gi },
  { kind: "drop_column", re: /\bDROP\s+COLUMN\b/gi },
  { kind: "rename", re: /\bRENAME\s+(?:TO|COLUMN|CONSTRAINT)\b/gi },
  { kind: "set_not_null", re: /\bALTER\s+(?:COLUMN\s+)?"?[A-Za-z0-9_]+"?\s+SET\s+NOT\s+NULL\b/gi },
  {
    kind: "alter_column_type",
    re: /\bALTER\s+(?:COLUMN\s+)?"?[A-Za-z0-9_]+"?\s+(?:SET\s+DATA\s+)?TYPE\b/gi,
  },
  { kind: "truncate", re: /\bTRUNCATE\b/gi },
  { kind: "delete_rows", re: /\bDELETE\s+FROM\b/gi },
  // `UPDATE <target> SET` — the FK `ON UPDATE` form is stripped before this runs,
  // and `update: {}` style Prisma-client code never appears in a .sql file.
  { kind: "update_rows", re: /\bUPDATE\s+(?:ONLY\s+)?"?[A-Za-z0-9_.]+"?\s+SET\b/gi },
  // Allowed: DROP CONSTRAINT IF EXISTS (the re-appliability idiom). Not: a bare drop.
  { kind: "unguarded_drop_constraint", re: /\bDROP\s+CONSTRAINT\s+(?!IF\s+EXISTS\b)/gi },
];

/**
 * Classify one migration's SQL. Pure — the caller owns file I/O, so this is
 * provable against synthetic input without touching the read-only
 * `packages/db/prisma/migrations` tree.
 */
export function findAdditivityViolations(
  migration: string,
  rawSql: string,
): AdditivityViolation[] {
  const sql = stripReferentialActions(stripSqlComments(rawSql));
  const violations: AdditivityViolation[] = [];

  for (const { kind, re } of PATTERNS) {
    // Fresh lastIndex per call: these regexes are module-level and /g.
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(sql)) !== null) {
      // Show a window around the hit rather than just the keyword.
      const from = Math.max(0, match.index - 40);
      violations.push({
        migration,
        kind,
        statement: excerpt(sql.slice(from, match.index + 120)),
      });
      if (match.index === re.lastIndex) re.lastIndex += 1; // zero-width guard
    }
  }

  // `ADD COLUMN ... NOT NULL` with no DEFAULT, checked clause by clause so a
  // sibling column's DEFAULT cannot mask a missing one.
  const addColumn = /\bADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi;
  addColumn.lastIndex = 0;
  let hit: RegExpExecArray | null;
  while ((hit = addColumn.exec(sql)) !== null) {
    const [clause] = topLevelClauses(sql.slice(hit.index));
    if (clause === undefined) continue;
    if (/\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)) {
      violations.push({
        migration,
        kind: "add_notnull_column_without_default",
        statement: excerpt(clause),
      });
    }
  }

  return violations;
}

/**
 * Migrations that are additive but still take a lock worth planning around.
 * A plain `CREATE INDEX` (not CONCURRENTLY) holds a SHARE lock for the
 * duration of the build: reads continue, WRITES to that table block. On an
 * empty, brand-new table that is instant and irrelevant; on a large existing
 * table it is write downtime. Reported separately from violations because it
 * is a scheduling question, not a correctness one.
 */
export function lockRiskNotes(
  migration: string,
  rawSql: string,
): Array<{ migration: string; table: string }> {
  const sql = stripSqlComments(rawSql);
  const created = new Set<string>();
  const createTable = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi;
  let t: RegExpExecArray | null;
  while ((t = createTable.exec(sql)) !== null) {
    if (t[1]) created.add(t[1]);
  }

  const notes: Array<{ migration: string; table: string }> = [];
  const createIndex =
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?[A-Za-z0-9_]+"?\s+ON\s+"?([A-Za-z0-9_]+)"?/gi;
  let m: RegExpExecArray | null;
  while ((m = createIndex.exec(sql)) !== null) {
    const concurrently = Boolean(m[1]);
    const table = m[2];
    if (!table || concurrently) continue;
    // An index on a table this same migration just created cannot block anyone.
    if (created.has(table)) continue;
    notes.push({ migration, table });
  }
  return notes;
}
