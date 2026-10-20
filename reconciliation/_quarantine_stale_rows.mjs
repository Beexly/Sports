#!/usr/bin/env node
/**
 * QUARANTINE THE STALE ROWS THAT PREDATE THE CLASS FILTER.
 *
 * The code now filters every read of the delta chain, so no NEW
 * unverified row can be written or read. But the rows that were
 * written BEFORE the filter existed are still in the database:
 *
 *   781  lit.activation         641 HONESTLY_UNCITED_PRIOR
 *                                140 DERIVED_MARKET_SYNTHESIS
 *    16  lit.causal_edge         all HONESTLY_UNCITED_PRIOR
 *    69  lit.premise_score       all non-class-A
 *   295  lit.residual            all non-class-A
 *    38  lit.intervention_test   all non-class-A
 *
 * Every one of the 781 activations is 'active'. The activation_score
 * IS the magnitude of the delta, so these are numbers that look like
 * measurements and are not grounded in a document.
 *
 * The code fix prevents the next row. This removes the ones that are
 * already there, because a filter that only governs the future leaves
 * the past in place, and a reader of the table cannot tell which is
 * which.
 *
 * WHAT IS DELETED, AND WHY IT IS SAFE:
 *
 *   lit.activation        -- the activation rows of a non-class-A
 *                            premise. The retrieval function will
 *                            re-create the class-A ones on the next
 *                            retrieval event; the unverified ones can
 *                            never be re-created, because the
 *                            function filters.
 *   lit.residual          -- the graded outcomes for those
 *                            activations. They are the measurement
 *                            of a premise that may not be measured.
 *   lit.premise_score     -- the scorecard computed from those
 *                            residuals.
 *   lit.intervention_test -- the shock evaluations run on edges whose
 *                            premise is not class-A.
 *
 * lit.causal_edge is NOT deleted -- the 16 rows are already 'retired',
 * and deleting them would destroy the record of what was once
 * promoted. The code now retires any PROMOTED edge whose premise has
 * lost class-A, so this state cannot recur.
 *
 * Reproduce: node reconciliation/_quarantine_stale_rows.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { Client } = require(resolve(root, "node_modules/pg"));

const PROJECT = "summer-brook-99380762";
const BRANCH = process.env.LIT_BRANCH || "dev-lit-vectors-2026-10";

function neon(args) {
  return execSync(`neonctl ${args}`, { encoding: "utf8", cwd: root }).trim();
}
function connString(branch, role) {
  return neon(`connection-string ${branch} --project-id ${PROJECT} --role-name ${role}`)
    .replace(/"/g, "")
    .trim();
}

const c = new Client({ connectionString: connString(BRANCH, "neondb_owner") });
await c.connect();
await c.query(readFileSync(resolve(root, "reconciliation/schema_literature.sql"), "utf8"));

const NOT_CLASS_A = `(p.record_class <> 'CITABLE_VERIFIED' OR p.status <> 'ACTIVE')`;

const STEPS = [
  {
    label: "lit.intervention_test  (the shock evaluations of non-class-A edges)",
    sql: `DELETE FROM lit.intervention_test t
           USING lit.causal_edge e, lit.premise p
          WHERE t.edge_id = e.id AND e.premise_id = p.id AND ${NOT_CLASS_A}`,
  },
  {
    label: "lit.residual  (the graded outcomes of non-class-A premises)",
    sql: `DELETE FROM lit.residual r
           USING lit.premise p
          WHERE r.premise_id = p.id AND ${NOT_CLASS_A}`,
  },
  {
    label: "lit.activation  (the activations of non-class-A premises)",
    sql: `DELETE FROM lit.activation a
           USING lit.premise p
          WHERE a.premise_id = p.id AND ${NOT_CLASS_A}`,
  },
  {
    label: "lit.premise_score  (the scorecards of non-class-A premises)",
    sql: `DELETE FROM lit.premise_score s
           USING lit.premise p
          WHERE s.premise_id = p.id AND ${NOT_CLASS_A}`,
  },
  {
    label: "lit.causal_edge  (PROMOTED edges whose premise is not class-A)",
    sql: `UPDATE lit.causal_edge ce
              SET status = 'retired', retired_at = now()
             FROM lit.premise p
            WHERE ce.premise_id = p.id AND ce.status = 'promoted' AND ${NOT_CLASS_A}`,
  },
];

console.log("=== QUARANTINING THE STALE ROWS ===");
for (const step of STEPS) {
  const res = await c.query(step.sql);
  console.log(`  ${String(res.rowCount).padStart(5)}  ${step.label}`);
}

console.log("\n=== THE CHAIN, AFTER ===");
const HOPS = [
  ["lit.activation", `SELECT a.id FROM lit.activation a JOIN lit.premise p ON p.id=a.premise_id WHERE ${NOT_CLASS_A}`],
  ["lit.causal_edge (promoted)", `SELECT ce.id FROM lit.causal_edge ce JOIN lit.premise p ON p.id=ce.premise_id WHERE ce.status='promoted' AND ${NOT_CLASS_A}`],
  ["lit.premise_score", `SELECT s.premise_id FROM lit.premise_score s JOIN lit.premise p ON p.id=s.premise_id WHERE ${NOT_CLASS_A}`],
  ["lit.residual", `SELECT r.id FROM lit.residual r JOIN lit.premise p ON p.id=r.premise_id WHERE ${NOT_CLASS_A}`],
  ["lit.intervention_test", `SELECT t.id FROM lit.intervention_test t JOIN lit.causal_edge e ON e.id=t.edge_id JOIN lit.premise p ON p.id=e.premise_id WHERE ${NOT_CLASS_A}`],
];
let leaks = 0;
for (const [label, sql] of HOPS) {
  const r = await c.query(sql);
  if (r.rows.length === 0) console.log(`  CLEAN  ${label}`);
  else {
    leaks++;
    console.log(`  LEAK   ${label}  (${r.rows.length} rows)`);
  }
}

console.log("\n=== THE CLASS-A ROWS SURVIVED? ===");
const kept = await c.query(
  `SELECT p.record_class, p.status, count(*)::int n
     FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
    GROUP BY 1, 2 ORDER BY 3 DESC`,
);
for (const r of kept.rows) console.log(`  ${String(r.n).padStart(5)}  ${r.record_class} / ${r.status}`);

await c.end();
console.log(
  leaks === 0
    ? "\nVERDICT: no unverified row remains anywhere on the delta chain"
    : `\nVERDICT: ${leaks} LEAK(S) remain`,
);
process.exit(leaks === 0 ? 0 : 1);
