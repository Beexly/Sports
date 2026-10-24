#!/usr/bin/env node
/**
 * IS THE G4 DUAL E-VALUE CONDITION LOAD-BEARING?
 *
 * The spec's G4 is a CONJUNCTION over TWO numbers with TWO thresholds:
 *
 *     E-value(RR*)  >= 1.35   the point estimate
 *     E-value(LL)   >= 1.10   the CI lower limit
 *
 * The code collapsed them into one (`eCi ?? ePoint` against 1.35).
 * The fix adds the second condition. A passing test is not evidence
 * the gate is enforced, so the gate is MUTATED and the suite must go
 * RED.
 *
 * Three mutations, one per failure mode:
 *
 *   1. Drop the POINT condition. A gate that only checks the CI would
 *      pass a claim whose point E-value is 1.0.
 *   2. Drop the CI condition. A gate that only checks the point would
 *      pass a claim whose CI E-value is 1.0.
 *   3. Give the CI the POINT's threshold (1.35 instead of 1.10) --
 *      the exact confusion that was there before, and it must be
 *      caught.
 *
 * Reproduce: node reconciliation/_verify_g4_dual_e_value.mjs
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
    name: "the POINT condition is dropped (only the CI is checked)",
    from: `    if (ePoint !== null && ePoint < minEValue) {
      adversaryRefusal = "REFUSED_ADVERSARY_E_VALUE_TOO_LOW";
    }`,
    to: `    if (false) {
      adversaryRefusal = "REFUSED_ADVERSARY_E_VALUE_TOO_LOW";
    }`,
  },
  {
    name: "the CI condition is dropped (only the point is checked)",
    from: `    if (
      adversaryRefusal === null &&
      eCi !== null &&
      eCi < minEValueCi
    ) {
      adversaryRefusal = "REFUSED_ADVERSARY_E_VALUE_CI_TOO_LOW";
    }`,
    to: `    if (false) {
      adversaryRefusal = "REFUSED_ADVERSARY_E_VALUE_CI_TOO_LOW";
    }`,
  },
  {
    name: "the CI is given the POINT's threshold (1.35 instead of 1.10)",
    from: "const minEValueCi = opts?.minEValueCi ?? 1.1;",
    to: "const minEValueCi = opts?.minEValueCi ?? 1.35;",
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
    console.log("  STILL GREEN -- the dual condition is NOT load-bearing.");
    allGood = false;
  } else {
    console.log(
      `  RED as it must be (${failed ? failed[1] : "?"} failed) -- the dual condition IS load-bearing`,
    );
  }
}

writeFileSync(SRC, original, "utf8");
const after = runSuite();
console.log(`\n=== RESTORED: ${after.ok ? "GREEN" : "RED"} ===`);

console.log("");
if (allGood && after.ok) {
  console.log("=== VERDICT: G4's two conditions are both genuinely enforced ===");
  process.exit(0);
} else {
  console.log("=== VERDICT: NOT VERIFIED ===");
  process.exit(1);
}
