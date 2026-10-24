#!/usr/bin/env node
/**
 * DOES THE RETRIEVAL PATH WRITE ONLY CLASS-A ACTIVATIONS?
 *
 * The quarantine emptied lit.activation: all 781 rows pointed at
 * premises that were not class-A, and the code now filters every read
 * of the delta chain. The claim was that the next retrieval event
 * repopulates the table -- through the filtered function, so with
 * class-A rows only.
 *
 * That claim was ASSERTED, not MEASURED. This measures it: it runs
 * the real `retrieveForEvent` against the real database with a real
 * vector taken from the index, and then asks what class the rows it
 * wrote are.
 *
 * The probe is a separate .mts file because it needs top-level await
 * and an ESM import of the engine's TypeScript -- neither works from
 * a .mjs file in this repository.
 *
 * Reproduce: node reconciliation/_verify_retrieval_repopulates.mjs
 */
import { execSync, spawnSync } from "node:child_process";
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

const before = await c.query(`SELECT count(*)::int n FROM lit.activation`);
console.log(`activations before: ${before.rows[0].n}`);

// Run the probe. It is a .mts file because it needs top-level await
// and an ESM import of the engine's TypeScript.
const probe = resolve(root, "reconciliation/_retrieval_probe.mts");
let out = "";
// spawnSync, not execSync: on this platform execSync with an explicit
// stdio array returns an EMPTY stdout, and the child looked like it
// had produced nothing. spawnSync returns the streams as Buffers and
// the child's own stderr, so a failure is visible.
const res = spawnSync("node", [resolve(root, "node_modules/tsx/dist/cli.mjs"), probe], {
  cwd: root,
  encoding: "utf8",
});
out = res.stdout ?? "";
if (res.status !== 0) {
  console.error("the probe failed:");
  console.error(String(res.stderr ?? "").slice(0, 1200));
  await c.end();
  process.exit(1);
}

const line = out.trim().split("\n").filter((l) => l.startsWith("{"))[0];
if (!line) {
  console.log("the retrieval did not report -- INCONCLUSIVE");
  console.log(out.slice(0, 900));
  await c.end();
  process.exit(0);
}
const r = JSON.parse(line);
if (r.error) {
  console.log(`the probe reported: ${r.error} -- INCONCLUSIVE`);
  await c.end();
  process.exit(0);
}
console.log(
  `retrieval: hit_count=${r.hit_count} activated=${r.activated} refused=${r.refused}`,
);

const after = await c.query(`SELECT count(*)::int n FROM lit.activation`);
console.log(`activations after:  ${after.rows[0].n}`);

console.log("\n=== WHAT DID THE RETRIEVAL WRITE? ===");
const written = await c.query(
  `SELECT p.record_class, p.status, count(*)::int n
     FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
    GROUP BY 1, 2 ORDER BY 3 DESC`,
);
if (written.rows.length === 0) console.log("  (nothing written)");
for (const w of written.rows) console.log(`  ${String(w.n).padStart(4)}  ${w.record_class} / ${w.status}`);

const leak = await c.query(
  `SELECT a.id, p.record_class, p.status
     FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
    WHERE p.record_class <> 'CITABLE_VERIFIED' OR p.status <> 'ACTIVE'`,
);
console.log(
  leak.rows.length === 0
    ? "\nVERDICT: the retrieval wrote class-A activations only"
    : `\nVERDICT: LEAK -- ${leak.rows.length} activation(s) point at a non-class-A premise`,
);

await c.end();
process.exit(leak.rows.length === 0 ? 0 : 1);
