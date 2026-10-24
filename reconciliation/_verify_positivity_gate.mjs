#!/usr/bin/env node
/**
 * IS THE POSITIVITY CONDITION LOAD-BEARING?
 *
 * The spec's G3 is a CONJUNCTION:
 *
 *     the number of witnessing hedges is 0, AND
 *     P(x | Pa(X) \ X) >= 0.01
 *
 * The identifiability half was implemented; the positivity half was
 * ABSENT. The fix adds it. A passing test is not evidence the gate is
 * enforced, so the gate is MUTATED and the suite must go RED.
 *
 * Three mutations:
 *
 *   1. The positivity comparison is removed entirely -- the effect is
 *      identified and published regardless.
 *   2. The floor is lowered to 0, so every positivity passes.
 *   3. A MISSING positivity is treated as a pass -- which is the
 *      "unknown means fine" defect, and the one most likely to be
 *      reintroduced by a well-meaning refactor.
 *
 * Reproduce: node reconciliation/_verify_positivity_gate.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "packages/prediction-engine/src/causal/causal-claim-gate.ts");
const PKG = join(root, "packages/prediction-engine");
const TEST_REL = "src/causal/__tests__/causal-claim-gate.test.ts";

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
    name: "the positivity comparison is removed entirely",
    from: "    if (positivity < minPositivity) {",
    to: "    if (false) {",
  },
  {
    name: "the floor is lowered to 0, so every positivity passes",
    from: "const minPositivity = query.minPositivity ?? 0.01;",
    to: "const minPositivity = query.minPositivity ?? 0;",
  },
  {
    name: "a MISSING positivity is treated as a pass",
    from: `    if (positivity === null) {
      return refuse(
        G3_REFUSAL.positivityViolation,`,
    to: `    if (positivity === null) {
      return {
        publishable: true,
        refusal_code: null,
        conclusion: "CAUSAL",
        formula: formatSymbolicFactor(result.formula),
        formula_class: result.formulaClass,
        enabling_edges: [],
        hedge_forest_full: null,
        hedge_forest_sub: null,
        hedge_count: 0,
        activating_mediators: [],
        expansion_attempts: [],
        reason: "the effect is identified",
      };
    }
    if (false) {
      return refuse(
        G3_REFUSAL.positivityViolation,`,
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
    console.log("  STILL GREEN -- the positivity condition is NOT load-bearing.");
    allGood = false;
  } else {
    console.log(
      `  RED as it must be (${failed ? failed[1] : "?"} failed) -- the positivity condition IS load-bearing`,
    );
  }
}

writeFileSync(SRC, original, "utf8");
const after = runSuite();
console.log(`\n=== RESTORED: ${after.ok ? "GREEN" : "RED"} ===`);

console.log("");
if (allGood && after.ok) {
  console.log("=== VERDICT: the positivity condition is genuinely enforced ===");
  process.exit(0);
} else {
  console.log("=== VERDICT: NOT VERIFIED ===");
  process.exit(1);
}
