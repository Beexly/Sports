#!/usr/bin/env node
/**
 * IS THE E-VALUE GATE LOAD-BEARING?
 *
 * The E-value bug was: `MIN_EXPANSION_E_VALUE` was exported, held the
 * spec's 1.35, and was compared against NOTHING. The activation filter
 * checked `eligible && breaksHedge` alone.
 *
 * The fix adds the E-value as a second, independent condition. This
 * script MUTATES the fix and checks the suite goes RED -- because the
 * presence of a passing test named "a WEAK E-value does NOT activate
 * it" is not evidence that the gate is enforced. Only a mutation is.
 *
 * Three mutations:
 *
 *   1. Remove the E-value from the activation condition. The suite
 *      must go red -- otherwise the low-E-value test proves nothing.
 *   2. Lower the threshold to 0, so every E-value passes. The suite
 *      must go red -- otherwise the threshold is decorative.
 *   3. Make an UNKNOWN E-value count as a pass. The suite must go
 *      red -- otherwise "unknown" is silently treated as "fine".
 *
 * Reproduce: node reconciliation/_verify_e_value_gate.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "packages/prediction-engine/src/causal/hcid-mediator-expansion.ts");
const PKG = join(root, "packages/prediction-engine");
const TEST_REL = "src/causal/__tests__/hcid-mediator-expansion.test.ts";

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
    name: "the E-value is dropped from the activation condition",
    from: "const activating = eValuePasses ? breaksHedge : [];",
    to: "const activating = breaksHedge;",
  },
  {
    name: "the threshold is lowered to 0, so every E-value passes",
    from: "const minE = opts?.minEValue ?? MIN_EXPANSION_E_VALUE;",
    to: "const minE = 0;",
  },
  {
    name: "an UNKNOWN E-value is treated as a pass",
    from: "const eValuePasses = eValue !== null && eValue >= minE;",
    to: "const eValuePasses = eValue === null || eValue >= minE;",
  },
];

console.log("=== BASELINE: the suite as committed ===");
const base = runSuite();
const bp = /(\d+) passed/.exec(base.out);
console.log(`  ${base.ok ? "GREEN" : "RED"}  ${bp ? bp[1] + " passed" : ""}`);
if (!base.ok) {
  console.log(base.out.slice(-2500));
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
    console.log("  STILL GREEN -- THE E-VALUE GATE IS NOT LOAD-BEARING.");
    allGood = false;
  } else {
    console.log(
      `  RED as it must be (${failed ? failed[1] : "?"} failed) -- the gate IS load-bearing`,
    );
  }
}

writeFileSync(SRC, original, "utf8");
const after = runSuite();
console.log(`\n=== RESTORED: ${after.ok ? "GREEN" : "RED"} ===`);

console.log("");
if (allGood && after.ok) {
  console.log("=== VERDICT: the E-value gate is genuinely enforced ===");
  console.log("    All three mutations break the suite, so the low-E-value");
  console.log("    test is measuring the gate rather than restating it.");
  process.exit(0);
} else {
  console.log("=== VERDICT: NOT VERIFIED ===");
  process.exit(1);
}
