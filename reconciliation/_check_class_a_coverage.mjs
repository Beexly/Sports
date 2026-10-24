#!/usr/bin/env node
/**
 * CHECK EVERY WRITE PATH INTO lit.premise SETS A CLASS.
 *
 * CLASS-A EXCLUSIVITY (2026-10-20) is only real if EVERY insert path
 * writes the class. A path that omits it gets the column's DEFAULT --
 * 'HONESTLY_UNCITED_PRIOR' -- which means the premise is invisible to
 * the HNSW retrieval function and to the promotion gate. That is the
 * safe direction (an unclassified premise cannot inject a delta), but
 * it is also a silent one: the index would come up empty and nothing
 * would say why.
 *
 * So this checks both directions:
 *   1. every INSERT INTO lit.premise names record_class
 *   2. every SELECT that pulls premises for a REASONING path filters on
 *      record_class = 'CITABLE_VERIFIED'
 *
 * Reproduce: node reconciliation/_check_class_a_coverage.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SKIP = new Set(["node_modules", ".git", "dist", ".next", "coverage", ".next"]);

/**
 * Files that legitimately read a premise without it being a reasoning path.
 *
 * These are INSPECTION and MEASUREMENT scripts: they exist to look at
 * the premise table, including at the uncited premises, because that is
 * how the class distribution is measured. Filtering them would make
 * the audit blind to the very records the audit is about.
 *
 * The list is EXPLICIT rather than a pattern, because a pattern would
 * silently exempt a NEW script that happened to match.
 */
const EXEMPT_FILES = new Set([
  // Inspection scripts: they report what is in the table.
  "reconciliation/inspect_gradeable.cjs",
  "reconciliation/inspect_units.cjs",
  "reconciliation/verify_retrieval.cjs",
  // Measurement scripts: they measure the corpus, so they must see it all.
  "reconciliation/measure_concept_axis_coverage.mjs",
  "reconciliation/measure_direction_signal.mjs",
  "reconciliation/run_concept_grader.mjs",
  "scripts/literature/measure-coverage.cjs",
  // The schema verifier: it INSERTS the test rows the filter is supposed
  // to exclude, so it must not filter on them.
  "reconciliation/apply_and_verify_class_a_schema.mjs",
  // The scorecard inspector: it REPORTS what is in the score table,
  // including the rows that are not class-A. Its job is to show the
  // distribution, and a report that filtered would hide the leak it
  // exists to reveal.
  "reconciliation/inspect_scorecard.cjs",
  // The coverage checker itself: its SQL is the PATTERNS it matches,
  // not queries it runs.
  "reconciliation/_check_class_a_coverage.mjs",
  // The chain verifier: its queries are the LEAK QUERIES. It asks
  // "is there a row here whose premise is not class-A?", so it must
  // see every row -- filtering would make it report clean.
  "reconciliation/_verify_class_a_chain.mjs",
  // The insert-path verifier: it inserts rows the filter must exclude.
  "reconciliation/_verify_insert_paths.mjs",
  // The quarantine script: it DELETES the rows the filter must exclude.
  // It has to see them to remove them.
  "reconciliation/_quarantine_stale_rows.mjs",
  // The retrieval-repopulation verifier: it asks what class the rows
  // the retrieval WROTE are, so it must see every activated row.
  "reconciliation/_verify_retrieval_repopulates.mjs",
]);

/**
 * Files that must filter on the class, because they feed a REASONING
 * path: they write an activation, a score, a causal edge, or they
 * retrieve premises for the engine.
 */
const REASONING_PATHS = new Set([
  "packages/prediction-engine/src/literature/literature-retrieval.ts",
  "packages/prediction-engine/src/literature/literature-causal.ts",
  "packages/prediction-engine/src/literature/literature-index-builder.ts",
  "packages/prediction-engine/src/literature/literature-discovery.ts",
  "scripts/literature/build-index.cjs",
  "scripts/literature/run-discovery.cjs",
  "scripts/literature/run-loop.cjs",
  "reconciliation/schema_literature.sql",
]);

// TEST FILES ARE NOT READ SITES. A test's mock DB answers whatever
// the test tells it to, and a test's SQL is not a production query.
// Including them would bury the real gaps under dozens of false
// ones -- and a check that always reports gaps is a check nobody
// reads.
const TEST_FILE = /(^|[\\/])(__tests__|__mocks__|test|tests)[\\/]/i;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e)) continue;
    // A test file's SQL is not a production query.
    // A test file's SQL is not a production query. Both the FILE and
    // its DIRECTORY are checked: a test file can live outside a
    // __tests__ directory, and a file named *.test.ts can live
    // anywhere.
    if (TEST_FILE.test(e) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(e)) continue;
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      yield* walk(p);
    } else if (/\.(ts|tsx|cjs|mjs|js|sql)$/.test(e)) {
      yield p;
    }
  }
}

/**
 * The SQL STATEMENT a read site belongs to.
 *
 * A read site is a line matching `FROM lit.<reasoning table>`. The
 * question "is this query a report, an aggregate, a flag reconcile or
 * a delete?" is a question about the QUERY, and the query is the
 * statement -- from the first SQL keyword at or before the read site
 * through the statement's end.
 *
 * The end is the closing semicolon of the statement, or the end of
 * the file. The start is the last line at or before the read site
 * that begins a statement: SELECT, WITH, UPDATE, DELETE or INSERT.
 */
/**
 * The SQL QUERY a read site belongs to.
 *
 * A read site is a line matching `FROM lit.<reasoning table>`. The
 * question "is this query a report, an aggregate, a flag reconcile or
 * a delete?" is a question about the QUERY.
 *
 * THE QUERY IS THE STRING LITERAL it lives in. In TypeScript and
 * JavaScript the SQL is a template literal or a quoted string; in a
 * .sql file it is a semicolon-delimited statement. Scanning backwards
 * for "the last SQL keyword" does NOT work -- it stops at a nested
 * `SELECT 1` inside a subquery, which is not the start of the query.
 *
 * So: find the literal containing the read site with a small state
 * machine that skips comments and handles escapes, and use its text.
 */
function sqlQueryAround(text, offset, isSqlFile) {
  if (isSqlFile) {
    const before = text.lastIndexOf(";", offset);
    const after = text.indexOf(";", offset);
    return text.slice(before + 1, after === -1 ? text.length : after + 1);
  }
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    // Skip comments, so a quote inside a comment cannot open a literal.
    if ((c === "-" && text[i + 1] === "-") || (c === "/" && text[i + 1] === "/")) {
      const j = text.indexOf("\n", i);
      i = j === -1 ? text.length : j;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const j = text.indexOf("*/", i + 2);
      i = j === -1 ? text.length : j + 2;
      continue;
    }
    if (c === "`" || c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text[j] === quote) break;
        // A single- or double-quoted string does not span lines, so an
        // unterminated one ends at the newline.
        if (quote !== "`" && text[j] === "\n") break;
        j += 1;
      }
      const end = j < text.length ? j + 1 : text.length;
      if (offset > i && offset < end) {
        return text.slice(i + 1, j);
      }
      i = end;
      continue;
    }
    i += 1;
  }
  return "";
}

const inserts = [];
const selects = [];

for (const file of walk(root)) {
  const rel = relative(root, file).split("\\").join("/");
  const text = readFileSync(file, "utf8");

  // INSERT INTO lit.premise ... (column list)
  const insertRe = /INSERT\s+INTO\s+lit\.premise\s*\(([\s\S]*?)\)/gi;
  let m;
  while ((m = insertRe.exec(text)) !== null) {
    const cols = m[1];
    const hasClass = /record_class/i.test(cols);
    // The schema verifier INSERTS one premise with no class on purpose --
    // to prove the column's DEFAULT is the honest one -- so it is
    // exempt from the "every insert sets the class" rule.
    const exempt = EXEMPT_FILES.has(rel);
    inserts.push({ rel, hasClass: hasClass || exempt, cols: cols.replace(/\s+/g, " ").trim() });
  }
  // SELECTs that read premises.
  //
  // THE TABLES THAT CARRY A REASONING NUMBER, NOT JUST THE PREMISE
  // TABLE.
  //
  // The checker used to look only for `FROM lit.premise` and
  // `FROM lit.premise_score`. But the delta MAGNITUDE lives in
  // lit.activation (activation_score), and lit.residual carries the
  // graded outcome. A query written as
  //
  //   FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
  //
  // has `lit.activation` as its FROM, so the old pattern did not
  // fire on the line -- and the window that follows it (the JOIN and
  // the WHERE) is where the filter has to be.
  //
  // MEASURED: with the check narrowed to lit.premise, the sweep
  // reported "22 read sites, 0 gaps" while 781 lit.activation rows
  // pointed at unverified premises -- 641 HONESTLY_UNCITED_PRIOR and
  // 140 DERIVED_MARKET_SYNTHESIS, every one of them 'active'. The
  // checker was green and the leak was open.
  //
  // So every table that can carry a number into a reasoning path is
  // now a read site.
  const REASONING_TABLES = [
    "lit\\.premise\\b",
    "lit\\.premise_score\\b",
    "lit\\.activation\\b",
    "lit\\.causal_edge\\b",
    "lit\\.residual\\b",
  ];
  const READS_PREMISE = new RegExp(`FROM\\s+(?:${REASONING_TABLES.join("|")})`, "i");
  if (READS_PREMISE.test(text)) {
    const lines = text.split("\n");
    const isSqlFile = rel.endsWith(".sql");
    lines.forEach((line, i) => {
      if (READS_PREMISE.test(line)) {
        // The window has to be wide enough to reach the filter, and
        // the filter can be far from the FROM: a long explanatory
        // comment between them pushes it past a narrow window, and the
        // check then reports a gap that is not there. A FALSE GAP is
        // as bad as a missed one -- it teaches the reader to ignore
        // the check.
        //
        // 30 lines back and 30 forward covers the longest comment
        // block in the repo's literature queries.
        // THE STATEMENT, NOT THE WINDOW.
        //
        // The exemptions below are questions about a QUERY -- "does it
        // report the class distribution?", "does it return only
        // aggregates?", "is it a DELETE?". Answering them about a
        // 60-LINE WINDOW answers them about the NEIGHBOURS too.
        //
        // That is how a class report sitting next to a reasoning read
        // got reported as a gap, and how a reasoning read sitting next
        // to a `premise_key` mention got exempted. Both are false
        // gaps, and a false gap is as bad as a missed one -- it
        // teaches the reader to ignore the check.
        //
        // So each read site is analysed as the STATEMENT it belongs
        // to: from the first SQL keyword at or before it, through the
        // statement's end.
        const statement = sqlQueryAround(
          text,
          lines.slice(0, i).join("\n").length + (lines[i] ?? "").indexOf("FROM"),
          isSqlFile,
        );
        //
        // The comments are STRIPPED before the predicates look at the
        // statement. A .sql file can carry a forty-line comment banner
        // between two statements, and a predicate anchored at the start
        // of the statement would then be reading the banner instead of
        // the SQL.
        const sql = statement
          .replace(/--[^\n]*/g, "")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .trim();
        // The class filter is still looked for in the WINDOW, not the
        // statement: a filter can sit in a CTE well above the FROM
        // that reads the table, outside the statement's own keyword
        // range, and 30 lines back covers the longest comment block
        // in the repo's literature queries.
        //
        // The class filter is looked for IN THE QUERY -- in a CTE well
        // above the FROM, or in a WHERE below it, but still in the
        // same query. A filter in a NEIGHBOURING query does not filter
        // this one, so a window would let a real leak hide behind its
        // neighbour's filter.
        const hasFilter =
          /record_class\s*=\s*'CITABLE_VERIFIED'/i.test(sql) &&
          /status\s*=\s*'ACTIVE'/i.test(sql);
        // A query that GROUPS BY record_class, or SELECTs it, is a
        // REPORT of the class distribution, not a reasoning read. It
        // sees every premise on purpose, to show how many are citable.
        //
        // The tell is a GROUP BY record_class -- a reasoning read
        // never groups by the class, because it has already filtered
        // on it.
        //
        // A REPORT of the class distribution. It sees every premise on
        // purpose, to show how many are citable.
        //
        // The tell is that the query SELECTS record_class (or an alias
        // of it) and GROUPS BY it -- possibly by ordinal, as
        // `GROUP BY 1, 2` does. A reasoning read never groups by the
        // class, because it has already filtered on the class.
        //
        // So the test is: does the query project the class column and
        // group the result? Either spelling of the grouping counts.
        const selectsClass = /\brecord_class\b/i.test(sql);
        const groupsBy =
          /group\s+by\s+[\s\S]{0,60}record_class/i.test(sql) ||
          /group\s+by\s+[\d\s,]+/i.test(sql);
        const isClassReport = selectsClass && groupsBy;
        // A query that returns only AGGREGATES (count(*), min, max)
        // cannot leak a premise into a reasoning path: it returns
        // numbers about the table, not premises from it.
        const isAggregateOnly =
          /SELECT\s+count\s*\(\s*\*\s*\)/i.test(sql) &&
          !/\b(numeric_value|evidence_quote|mechanism_quote)\b/i.test(sql);
        // A site whose statement is an UPDATE is not a READ SITE.
        //
        // It RECONCILES a flag, or it RETIRES an edge -- it does not
        // return a premise to a reasoning path. The statements that
        // match here are:
        //
        //   UPDATE lit.causal_edge SET status='retired' ... EXISTS
        //     (SELECT 1 FROM lit.premise p WHERE p.record_class <> ...)
        //   UPDATE lit.premise_score SET promoted = EXISTS (... FROM
        //     lit.causal_edge ...)
        //
        // The first RETIRES edges whose premise is no longer class-A.
        // That is the class filter being ENFORCED, in the opposite
        // direction: it removes the edges rather than filtering them
        // at read time.
        //
        // An UPDATE is excluded only when it returns no reasoning
        // number. If it SELECTs a numeric_value or a residual, it is
        // not a reconcile and the site is reported.
        const isFlagReconcile =
          /^\s*UPDATE\b/i.test(sql) &&
          !/\bSELECT\s+(?!1\b)[\s\S]{0,200}\b(numeric_value|activation_score|mean_residual|residual|evidence_quote|mechanism_quote)\b/i.test(
            sql,
          );
        // A DELETE is not a READ SITE.
        //
        // A DELETE matches the read pattern because the statement
        // NAMES a reasoning table. But a delete cannot leak a premise
        // into a reasoning path: it can only take one out.
        //
        // The three that show up here are all DELETEs, and all three
        // are deliberate:
        //
        //   DELETE FROM lit.premise WHERE premise_key LIKE 'test:%'
        //     removes the fixtures the class filter is proved against
        //   DELETE FROM lit.premise WHERE premise_key = 'test:...'
        //     removes one fixture the constraint is proved against
        //   DELETE FROM lit.residual
        //     resets the graded state so a re-run is a clean
        //     measurement, not an accumulation
        //
        // A delete that RETURNED a premise would be a read; none of
        // these do, and the guard below still requires the statement
        // to select nothing.
        const isFixtureDelete =
          /^\s*DELETE\s+FROM\s+lit\.[a-z_]+/i.test(sql) &&
          !/\bRETURNING\b/i.test(sql);
        //
        // A COMMENTED-OUT query is not a query.
        //
        // The .sql files carry their verification queries in a comment
        // block, so the reader can paste them into psql. Once the
        // comments are stripped there is no SQL left -- and a line
        // that names lit.premise inside a comment is DOCUMENTATION,
        // not a read site. Reporting it would be a false gap.
        const isCommentedOut = sql.length === 0;
        const exempt =
          EXEMPT_FILES.has(rel) ||
          isCommentedOut ||
          isClassReport ||
          isAggregateOnly ||
          isFlagReconcile ||
          isFixtureDelete;
        selects.push({ rel, line: i + 1, hasFilter, exempt, isClassReport, isAggregateOnly });
      }
    });
  }
}

console.log("=== EVERY INSERT INTO lit.premise ===");
let badInserts = 0;
for (const i of inserts) {
  const status = i.hasClass ? "OK  " : "MISSING record_class";
  if (!i.hasClass) badInserts++;
  console.log(`  ${status}  ${i.rel}`);
  console.log(`        cols: ${i.cols.slice(0, 150)}`);
}
console.log(`  -> ${inserts.length} insert paths, ${badInserts} missing record_class`);

console.log("\n=== EVERY SELECT FROM lit.premise ===");
let badSelects = 0;
for (const s of selects) {
  if (s.exempt) {
    console.log(`  EXEMPT  ${s.rel}:${s.line}${s.isClassReport ? "  (class report)" : s.isAggregateOnly ? "  (aggregate only)" : ""}`);
    continue;
  }
  const status = s.hasFilter ? "OK  " : "MISSING record_class filter";
  if (!s.hasFilter) badSelects++;
  console.log(`  ${status}  ${s.rel}:${s.line}`);
}
console.log(`  -> ${selects.length} read sites, ${badSelects} without the class filter`);

const ok = badInserts === 0 && badSelects === 0;
console.log(`\nVERDICT: ${ok ? "every path sets and honours the class" : "GAPS FOUND"}`);
if (!ok) {
  process.exit(1);
}
process.exit(0);
