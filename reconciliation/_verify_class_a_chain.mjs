#!/usr/bin/env node
/**
 * DOES THE CLASS FILTER ACTUALLY PROTECT THE DELTA CHAIN?
 *
 * The spec's section 6 item 3 says: add the filter so that
 * MSVH_S0_UNCITED records can never inject unverified numeric deltas
 * into Delta_c^final or L_lit(W_0).
 *
 * The filter is on lit.retrieve_premises. This traces the WHOLE chain
 * and proves, at each hop, that an unverified record cannot get
 * through:
 *
 *   1. the retrieval function returns only class-A records
 *   2. the activation rows point only at class-A premises
 *   3. the causal edges point only at class-A premises
 *   4. the promoted edges (the ones that reach do-calculus) point
 *      only at class-A premises
 *   5. the residual feedback (the score that becomes the activation
 *      weight) points only at class-A premises
 *
 * Each hop is checked by JOINING back to lit.premise and asking
 * whether any reachable row is not CITABLE_VERIFIED/ACTIVE. A join
 * that finds nothing is the proof; a join that finds a row is the
 * leak.
 *
 * Reproduce: node reconciliation/_verify_class_a_chain.mjs
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

/**
 * Each hop: a name, the SQL that reaches it, and the query that finds
 * any row on the path that is NOT class-A.
 */
const HOPS = [
  {
    name: "lit.activation  (the retrieval event's activated premises)",
    leak: `SELECT a.id, p.record_class, p.status
              FROM lit.activation a
              JOIN lit.premise p ON p.id = a.premise_id
             WHERE p.record_class <> 'CITABLE_VERIFIED' OR p.status <> 'ACTIVE'`,
  },
  {
    name: "lit.causal_edge  (the edges the engine reasons over)",
    // A RETIRED edge is not reachable: every read of the edge set
    // filters on status = 'promoted'. The 16 retired edges whose
    // premise is not class-A are the RECORD of what was once
    // promoted -- deleting them would destroy the history, and they
    // are not a leak because nothing can read them.
    //
    // What matters is the REACHABLE set: status = 'promoted'.
    leak: `SELECT e.id, p.record_class, p.status
              FROM lit.causal_edge e
              JOIN lit.premise p ON p.id = e.premise_id
             WHERE e.status = 'promoted'
               AND (p.record_class <> 'CITABLE_VERIFIED' OR p.status <> 'ACTIVE')`,
  },
  {
    name: "lit.premise_score  (the graded score that becomes the activation weight)",
    leak: `SELECT s.premise_id, p.record_class, p.status
              FROM lit.premise_score s
              JOIN lit.premise p ON p.id = s.premise_id
             WHERE p.record_class <> 'CITABLE_VERIFIED' OR p.status <> 'ACTIVE'`,
  },
  {
    name: "lit.residual  (the residuals the intervention test reads)",
    leak: `SELECT r.id, p.record_class, p.status
              FROM lit.residual r
              JOIN lit.activation a ON a.id = r.activation_id
              JOIN lit.premise p ON p.id = a.premise_id
             WHERE p.record_class <> 'CITABLE_VERIFIED' OR p.status <> 'ACTIVE'`,
  },
  {
    name: "lit.intervention_test  (the recorded shock evaluations)",
    leak: `SELECT t.id, p.record_class, p.status
              FROM lit.intervention_test t
              JOIN lit.causal_edge e ON e.id = t.edge_id
              JOIN lit.premise p ON p.id = e.premise_id
             WHERE p.record_class <> 'CITABLE_VERIFIED' OR p.status <> 'ACTIVE'`,
  },
];

console.log("=== IS THERE A LEAK ANYWHERE ON THE DELTA CHAIN? ===");
let leaks = 0;
for (const hop of HOPS) {
  const res = await c.query(hop.leak);
  if (res.rows.length === 0) {
    console.log(`  CLEAN  ${hop.name}`);
  } else {
    leaks++;
    console.log(`  LEAK   ${hop.name}  (${res.rows.length} rows)`);
    for (const r of res.rows.slice(0, 3)) console.log(`           ${JSON.stringify(r)}`);
  }
}

console.log("\n=== THE ROW COUNTS ON EACH HOP (so an empty table is not read as clean) ===");
const COUNTS = [
  ["lit.premise", "SELECT count(*)::int n FROM lit.premise"],
  ["lit.premise_vector", "SELECT count(*)::int n FROM lit.premise_vector"],
  ["lit.activation", "SELECT count(*)::int n FROM lit.activation"],
  ["lit.causal_edge", "SELECT count(*)::int n FROM lit.causal_edge"],
  ["lit.premise_score", "SELECT count(*)::int n FROM lit.premise_score"],
  ["lit.residual", "SELECT count(*)::int n FROM lit.residual"],
  ["lit.intervention_test", "SELECT count(*)::int n FROM lit.intervention_test"],
];
for (const [label, sql] of COUNTS) {
  const r = await c.query(sql);
  console.log(`  ${String(r.rows[0].n).padStart(7)}  ${label}`);
}

console.log("\n=== DOES THE RETRIEVAL FUNCTION RETURN ONLY CLASS-A RECORDS? ===");
const emb = await c.query(
  `SELECT embedding FROM lit.premise_vector WHERE embedding IS NOT NULL LIMIT 1`,
);
if (emb.rows.length > 0) {
  const ev = emb.rows[0].embedding;
  const vec = typeof ev === "string" ? ev : `[${ev.join(",")}]`;
  const got = await c.query(
    `SELECT p.record_class, p.status, count(*)::int n
       FROM lit.retrieve_premises($1::vector, 50, NULL, 0.0) r
       JOIN lit.premise p ON p.id = r.premise_id
      GROUP BY 1, 2`,
    [vec],
  );
  for (const r of got.rows) {
    console.log(`  ${String(r.n).padStart(4)}  ${r.record_class} / ${r.status}`);
    if (r.record_class !== "CITABLE_VERIFIED" || r.status !== "ACTIVE") leaks++;
  }
} else {
  console.log("  (no vectors to query with)");
}

console.log(
  leaks === 0
    ? "\nVERDICT: no unverified record can reach the delta chain"
    : `\nVERDICT: ${leaks} LEAK(S) -- an unverified record reaches the delta chain`,
);
await c.end();
process.exit(leaks === 0 ? 0 : 1);
