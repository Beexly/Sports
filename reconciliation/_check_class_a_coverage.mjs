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
        const window = lines.slice(Math.max(0, i - 30), i + 30).join("\n");
        const hasFilter =
          /record_class\s*=\s*'CITABLE_VERIFIED'/i.test(window) &&
          /status\s*=\s*'ACTIVE'/i.test(window);
        // A query that GROUPS BY record_class, or SELECTs it, is a
        // REPORT of the class distribution, not a reasoning read. It
        // sees every premise on purpose, to show how many are citable.
        const isClassReport =
          /group\s+by[\s\S]{0,80}record_class/i.test(window) ||
          /select[\s\S]{0,200}record_class[\s\S]{0,120}from\s+lit\.premise/i.test(window);
        // A query that returns only AGGREGATES (count(*), min, max)
        // cannot leak a premise into a reasoning path: it returns
        // numbers about the table, not premises from it. Such a site
        // is a report, whatever its SELECT list looks like.
        const isAggregateOnly =
          !/\b(premise_key|premise_id|numeric_value|evidence_quote|p\.(id|title|numeric_value))\b/i.test(
            window,
          );
        // A site that only UPDATES a flag derived from the edge set
        // is not reading a reasoning number: it is reconciling a
        // boolean. The edge set is already class-filtered at its own
        // read sites.
        const isFlagReconcile =
          /UPDATE\s+lit\.(premise_score|causal_edge)/i.test(window) &&
          !/SELECT\s+[\s\S]{0,200}(numeric_value|activation_score|mean_residual|residual)/i.test(
            window,
          );
        const exempt =
          EXEMPT_FILES.has(rel) || isClassReport || isAggregateOnly || isFlagReconcile;
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
process.exit(ok ? 0 : 1);
