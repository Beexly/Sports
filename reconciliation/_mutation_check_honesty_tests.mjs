#!/usr/bin/env node
/**
 * MUTATION TEST: do the new regression tests actually FAIL when the
 * defects they name are reintroduced?
 *
 * A test that passes whether or not the bug is present is not a test.
 * This reintroduces each defect, runs the suite, and asserts it fails.
 *
 * Reproduce: node reconciliation/_mutation_check_honesty_tests.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "packages/prediction-engine/src/reasoning/mind-reasoning.ts");
const suite = resolve(
  root,
  "packages/prediction-engine/src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts",
);
const runner = resolve(root, "node_modules/tsx/dist/cli.mjs");
const pkgDir = resolve(root, "packages/prediction-engine");

const original = readFileSync(target, "utf8");

function runSuite() {
  try {
    execFileSync("node", [runner, "--test", "src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts"], {
      cwd: pkgDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { passed: true, out: "" };
  } catch (e) {
    return { passed: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const MUTANTS = [
  {
    name: "M1: restore the fabricated span fallback (start_char: 0, tier MSVH_S1_EXACT)",
    from: `    start_char: null,
    end_char: null,
    verification_tier: "MSVH_S0_UNCITED",
  };

  const mechSpan`,
    to: `    start_char: 0,
    end_char: evQuote.length,
    verification_tier: "MSVH_S1_EXACT",
  };

  const mechSpan`,
  },
  {
    name: "M2: remove the Class-A exclusivity filter at the delta site",
    from: `    if (!isClassACitable(rec)) continue;

    const vp = toVerifiedSituationalPrinciple(rec);`,
    to: `    const vp = toVerifiedSituationalPrinciple(rec);`,
  },
  {
    name: "M3: remove the Class-A exclusivity filter at the principle site",
    from: `    const matching = corpus.filter(
      (p) => p.citable && p.applicable_context_fields.includes(field),
    );`,
    to: `    const matching = corpus.filter((p) => p.applicable_context_fields.includes(field));`,
  },
  {
    name: "M4: make an unknown class citable (the optimistic default)",
    from: `  return rec.record_class === "CITABLE_VERIFIED" && rec.citable !== false;`,
    to: `  return rec.record_class !== "HONESTLY_UNCITED_PRIOR";`,
  },
];

console.log("=== MUTATION TEST: do the honesty regression tests fail without the fixes? ===\n");

let allGood = true;
// First: the unmutated suite must pass.
const clean = runSuite();
console.log(`baseline (unmutated): ${clean.passed ? "PASS" : "FAIL"}`);
if (!clean.passed) {
  console.log(clean.out.slice(-2000));
  allGood = false;
}

for (const m of MUTANTS) {
  if (!original.includes(m.from)) {
    console.log(`${m.name}\n  SKIPPED: the anchor text was not found (the file changed shape)`);
    allGood = false;
    continue;
  }
  const mutated = original.replace(m.from, m.to);
  writeFileSync(target, mutated, "utf8");
  const r = runSuite();
  const verdict = r.passed ? "!! STILL PASSES -- the test does NOT catch this" : "caught (suite failed as it must)";
  if (r.passed) allGood = false;
  console.log(`${m.name}\n  ${verdict}`);
  if (!r.passed) {
    // Show which probe caught it.
    const failing = r.out.match(/✖ (Probe T\d+[^\n(]*)/g);
    if (failing) for (const f of failing) console.log(`     ${f.trim()}`);
  }
  writeFileSync(target, original, "utf8");
}

// Restore and confirm.
const restored = readFileSync(target, "utf8");
console.log(`\nfile restored: ${restored === original ? "YES" : "NO -- restoring now"}`);
if (restored !== original) writeFileSync(target, original, "utf8");
const final = runSuite();
console.log(`final (restored): ${final.passed ? "PASS" : "FAIL"}`);

console.log(`\nVERDICT: ${allGood && final.passed ? "every defect is caught by a test" : "SOME DEFECTS ARE NOT CAUGHT"}`);
process.exit(allGood && final.passed ? 0 : 1);
