// Repair the loop log's fabricated timestamps.
//
// A red-team reviewer correctly caught that cycles 0-12 carried hand-written
// round utc values (00:05:00Z, 00:20:00Z, ...) while git records those commits
// at 04:09Z-04:42Z. The measured CONTENT of each row is traceable to its commit
// and test output; the timestamps were not evidence and must not be quoted.
//
// This rewrites each `utc` to the real author date of the commit that slice
// produced, and adds `utc_source` so a reader knows where the value came from
// and never has to guess whether it was measured.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const LOG = "data/reasoning/overnight-loop.jsonl";

/** slice -> commit whose author date is the measured time for that slice. */
const COMMIT_FOR_SLICE = {
  orient: "7cdf3aebe",
  "verify-hashes": "7cdf3aebe",
  "audit-bridge-premises": "7cdf3aebe",
  "production-guards": "b5b5b14f3",
  "production-guards/confidence-inversion": "b95faf9fb",
  "price-archive": "f7dd219d1",
  "extend-seasons": "71b45f778",
  joins: "34c9dd790",
  "unblock-typecheck": "4925b4adf",
  calibration: "4edf9a9ac",
  "feature-catalog-and-dashboard": "3291a6d89",
  "morning-report": "104838f29",
  "one-measurement": "e7625b861",
};

const lines = fs.readFileSync(LOG, "utf8").split("\n").filter((l) => l.trim());
const out = [];
let repaired = 0;
let skipped = 0;

for (const line of lines) {
  const row = JSON.parse(line);
  const sha = COMMIT_FOR_SLICE[row.slice];
  if (!sha) { skipped += 1; out.push(line); continue; }
  let iso;
  try {
    iso = execFileSync("git", ["show", "-s", "--format=%aI", sha], { encoding: "utf8" }).trim();
  } catch {
    skipped += 1; out.push(line); continue;
  }
  const utc = new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");
  if (row.utc !== utc) repaired += 1;
  // Field order matters only for readability; keep `session` first.
  const next = { ...row, utc, utc_source: `git author date of ${sha}` };
  out.push(JSON.stringify(next));
}

fs.writeFileSync(LOG, `${out.join("\n")}\n`, "utf8");
console.log(`rewrote ${out.length} loop lines: ${repaired} utc values corrected, ${skipped} left alone`);
for (const l of out) {
  const r = JSON.parse(l);
  console.log(`  cycle ${String(r.cycle).padStart(2)}  ${r.utc}  ${r.slice}`);
}
