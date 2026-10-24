#!/usr/bin/env node
/**
 * IS THE CONTROL ARM REALLY EXERCISED?
 *
 * The G3 integration test's first run PASSED for the wrong reason:
 * the control arm was empty, so the function bailed out early and the
 * test proved nothing. The fixture was fixed (control rows strictly
 * below doValue) and the commit message says so.
 *
 * But a claim that a fixture is fixed is a claim, not a result. This
 * MUTATES the fixture and checks that the suite goes RED -- which is
 * the only evidence that the control arm is load-bearing.
 *
 * Two mutations, one per failure mode:
 *
 *   1. Put the control rows AT doValue. The split test is
 *      `activation_score >= doValue`, so a control row exactly at
 *      doValue lands in the treated arm and the control arm empties.
 *      This is the ORIGINAL bug. The suite must go red.
 *
 *   2. Make the outcome rates IDENTICAL in both arms. The E-value is
 *      computed from the outcome RATE RATIO; a rate ratio of 1 gives
 *      an E-value of 1 and no effect to be robust about, so the test
 *      would be measuring the gate refusing everything rather than the
 *      gate working. The suite must go red.
 *
 * If a mutation leaves the suite GREEN, the control arm is not
 * load-bearing and the "the fix works" claim is false.
 *
 * Reproduce: node reconciliation/_verify_control_arm.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEST = join(
  root,
  "packages/prediction-engine/src/literature/__tests__/gate-g3-integration.test.ts",
);
const PKG = join(root, "packages/prediction-engine");

const original = readFileSync(TEST, "utf8");

function runSuite() {
  try {
    const out = execFileSync(
      process.execPath,
      [
        join(root, "node_modules/vitest/vitest.mjs"),
        "run",
        "src/literature/__tests__/gate-g3-integration.test.ts",
      ],
      { cwd: PKG, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

const MUTATIONS = [
  {
    name: "control rows AT doValue (the original bug: empty control arm)",
    from: "activation_score: i < 20 ? 0.9 : 0.0001,",
    to: "activation_score: i < 20 ? 0.9 : 0.001,",
  },
  {
    name: "identical outcome rates in both arms (rate ratio 1, E-value 1)",
    from: "outcome_correct: i < 20 ? i % 10 !== 0 : i % 10 === 0,",
    to: "outcome_correct: i % 10 !== 0,",
  },
];

console.log("=== BASELINE: the suite as committed ===");
const base = runSuite();
const basePass = /(\d+) passed/.exec(base.out);
console.log(
  `  ${base.ok ? "GREEN" : "RED"}  ${basePass ? basePass[1] + " passed" : "see output"}`,
);
if (!base.ok) {
  console.log(base.out.slice(-2500));
  console.log("\n  The baseline is RED, so the mutations prove nothing.");
  process.exit(1);
}

let allGood = true;
for (const m of MUTATIONS) {
  console.log(`\n=== MUTATION: ${m.name} ===`);
  if (!original.includes(m.from)) {
    console.log("  SKIPPED -- the anchor text is not in the file. The");
    console.log("  fixture has changed and this mutation no longer applies.");
    allGood = false;
    continue;
  }
  writeFileSync(TEST, original.replace(m.from, m.to), "utf8");
  const res = runSuite();
  const passed = /(\d+) passed/.exec(res.out);
  const failed = /(\d+) failed/.exec(res.out);
  writeFileSync(TEST, original, "utf8");
  if (res.ok) {
    console.log(
      `  STILL GREEN (${passed ? passed[1] : "?"} passed) -- THE CONTROL ARM IS NOT`,
    );
    console.log("  LOAD-BEARING. The mutation did not change the outcome,");
    console.log("  so the test does not actually exercise what it claims.");
    allGood = false;
  } else {
    console.log(
      `  RED as it must be (${failed ? failed[1] : "?"} failed) -- the control arm IS load-bearing`,
    );
  }
}

// Restore, and prove it.
writeFileSync(TEST, original, "utf8");
console.log("\n=== RESTORED ===");
const after = runSuite();
console.log(
  `  ${after.ok ? "GREEN" : "RED"}  the file is back to its committed state`,
);

console.log("");
if (allGood && after.ok) {
  console.log("=== VERDICT: the control arm is genuinely exercised ===");
  console.log("    Both mutations that should break the suite DO break it,");
  console.log("    so the 'the fixture is fixed' claim is a measurement.");
  process.exit(0);
} else {
  console.log("=== VERDICT: NOT VERIFIED ===");
  process.exit(1);
}
