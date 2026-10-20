#!/usr/bin/env node
/**
 * IS THE PLACEBO CONJUNCT LOAD-BEARING?
 *
 * The spec's G4 has THREE conjuncts:
 *
 *     min E-value(RR*) >= 1.35
 *     AND min E-value(LL) >= 1.10
 *     AND |Delta_placebo| <= 0.005
 *
 * The third was absent. The fix adds it. A passing test is not
 * evidence the gate is enforced, so the gate is MUTATED and the suite
 * must go RED.
 *
 * Three mutations:
 *
 *   1. The placebo comparison is removed -- the effect is published
 *      regardless of what the placebo says.
 *   2. The ceiling is raised to 1.0, so every placebo passes.
 *   3. The placebo is computed from the REAL arm assignment rather
 *      than a random one -- which would make the placebo reproduce the
 *      real effect and therefore always refuse. This is the
 *      "permutation that is not a permutation" failure, and it must
 *      be caught.
 *
 * Reproduce: node reconciliation/_verify_placebo_gate.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "packages/prediction-engine/src/literature/literature-retrieval.ts");
const PKG = join(root, "packages/prediction-engine");
const TEST_REL = "src/literature/__tests__/gate-g3-integration.test.ts";

const original = readFileSync(SRC, "utf8");

function runSuite() {
  try {
    const out = execFileSync(
      process.execPath,
      [join(root, "node_modules/vitest/vitest.mjs"), "run", TEST_REL],
      { cwd: PKG, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

const MUTATIONS = [
  {
    name: "the placebo comparison is removed",
    from: `    if (
      adversaryRefusal === null &&
      placeboDelta !== null &&
      placeboDelta > maxPlaceboDelta
    ) {`,
    to: `    if (false) {`,
  },
  {
    // The suite pins the constant's VALUE directly, because no
    // fixture can tell 0.005 from 1.0 by whether it refuses -- a
    // sound fixture's placebo is ~0, so both accept. The mutation
    // therefore changes the constant the default reads from.
    name: "the ceiling constant is raised to 1.0",
    from: "export const MAX_PLACEBO_DELTA = 0.005;",
    to: "export const MAX_PLACEBO_DELTA = 1.0;",
  },
  {
    // A permutation that is not a permutation: the placebo then
    // reproduces the REAL effect, and the conjunct refuses
    // everything.
    name: "the placebo uses the REAL signal (a permutation that is not a permutation)",
    from: `      const permuted: number[] = permuteRows<number>(scores, placeboSeed + perm);`,
    to: `      const permuted: number[] = scores.slice();`,
  },
];

console.log("=== BASELINE: the suite as committed ===");
const base = runSuite();
const bp = /(\d+) passed/.exec(base.out);
console.log(`  ${base.ok ? "GREEN" : "RED"}  ${bp ? bp[1] + " passed" : ""}`);
if (!base.ok) {
  console.log(base.out.slice(-3000));
  console.log("\n  The baseline is RED, so the mutations prove nothing.");
  process.exit(1);
}

let allGood = true;
for (const m of MUTATIONS) {
  console.log(`\n=== MUTATION: ${m.name} ===`);
  if (!original.includes(m.from)) {
    console.log("  SKIPPED -- the anchor is not in the file.");
    allGood = false;
    continue;
  }
  writeFileSync(SRC, original.replace(m.from, m.to), "utf8");
  const res = runSuite();
  const failed = /(\d+) failed/.exec(res.out);
  writeFileSync(SRC, original, "utf8");
  if (res.ok) {
    console.log("  STILL GREEN -- the placebo conjunct is NOT load-bearing.");
    allGood = false;
  } else {
    console.log(
      `  RED as it must be (${failed ? failed[1] : "?"} failed) -- the placebo conjunct IS load-bearing`,
    );
  }
}

writeFileSync(SRC, original, "utf8");
const after = runSuite();
console.log(`\n=== RESTORED: ${after.ok ? "GREEN" : "RED"} ===`);

console.log("");
if (allGood && after.ok) {
  console.log("=== VERDICT: the placebo conjunct is genuinely enforced ===");
  process.exit(0);
} else {
  console.log("=== VERDICT: NOT VERIFIED ===");
  process.exit(1);
}
