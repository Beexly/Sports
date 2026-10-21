/**
 * MUTATION SWEEP for the Zhang (2008) R5-R10 implementation.
 *
 * THE QUESTION. The tests in src/causal/fci-pag-r5-r10.test.ts pass. That is necessary but NOT
 * sufficient: a test that passes for the wrong reason is worse than no test, because it
 * reports a guarantee the code does not provide. The rules COMPETE -- `completeAncestral` and
 * R2 can fire on exactly the configuration R8 or R9 needs -- so a test that runs the whole
 * fixpoint can pass even when the rule it names has been deleted.
 *
 * PHASE 1 -- DISABLE THE RULE. Disable exactly one rule per round by commenting out its CALL
 * in applyOrientationRules, run the suite, and record which tests failed. A test that pins rule
 * X MUST fail when X is disabled. (The tests now apply ONE rule each, via orientPag's `rules`
 * argument, so a disabled call site really does remove that rule from the run.)
 *
 * PHASE 2 -- BREAK THE ANTECEDENT. Phase 1 says the test depends on the rule; it does not say
 * the test pins the rule's PRECONDITION. Phase 2 removes one guard condition from each rule's
 * antecedent -- the specific condition the named negative test is built around -- and requires
 * that test to then FAIL. A negative test that survives its own antecedent being removed is not
 * testing the antecedent.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER, NOT FROM SCRAPING TEXT. An earlier version of
 * this script parsed the verbose reporter's output and reported "NOT PINNED" for every rule
 * while every test was in fact pinned: the reporter prints a failed test as
 *   `  x file.ts > describe > it`
 * and matching on the whole line finds nothing. The JSON reporter gives per-test status
 * directly, so a parsing mistake cannot masquerade as a verification result.
 *
 * EVERY ROUND IS EXIT-CODE DRIVEN. The script exits non-zero if any expected test fails to
 * fail, so a broken sweep cannot report success.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const SRC = "src/causal/fci-pag.ts";
const TESTS = ["src/causal/fci-pag-r5-r10.test.ts"];
const VITEST = "../../node_modules/vitest/vitest.mjs";
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_mutation_sweep_report.json";

const original = readFileSync(SRC, "utf8");

/** Phase 1: the rule to disable, and the test that must fail when it is. */
const DISABLE = [
  { name: "R5", call: 'on("R5") && ruleR5(g, d)', expect: "turns an uncovered circle cycle into undirected edges" },
  { name: "R6", call: 'on("R6") && ruleR6(g)', expect: "turns the circle at beta into a tail when beta has an undirected edge" },
  { name: "R7", call: 'on("R7") && ruleR7(g)', expect: "turns the circle at beta into a tail when alpha and gamma are non-adjacent" },
  { name: "R8", call: 'on("R8") && ruleR8(g)', expect: "turns alpha o-> gamma into alpha -> gamma given a directed path" },
  { name: "R9", call: 'on("R9") && ruleR9(g, d)', expect: "turns alpha o-> gamma into alpha -> gamma given an uncovered p.d. path" },
  { name: "R10", call: 'on("R10") && ruleR10(g, d)', expect: "turns alpha o-> gamma into alpha -> gamma given two non-adjacent p.d. paths" },
];

/**
 * Phase 2: the guard to remove from the rule's antecedent, and the test that must then fail.
 *
 * EACH `from` IS AN EXACT SOURCE FRAGMENT AND MUST BE UNIQUE IN THE FILE -- the script
 * replaces the first occurrence, and a fragment that appears twice would silently mutate the
 * wrong function. The uniqueness is asserted below rather than assumed.
 *
 * THE PAIRS ARE CHOSEN SO THAT THE MUTATION IS THE ONLY THING THAT CAN STOP THE RULE ON THAT
 * GRAPH. Several of Zhang's clauses are implied by others on small graphs; where a clause is
 * implied, removing it changes nothing and the test cannot pin it. The graphs in the test file
 * are sized so that each clause stands alone.
 */
const BREAK_ANTECEDENT = [
  {
    name: "R5 (uncovered path)",
    from: "if (path.length >= 2) {\n          const prev = path[path.length - 2]!;\n          if (isAdj(g, prev, nb)) continue; // every consecutive triple must be unshielded\n        }",
    to: "if (path.length >= 2) {\n          const prev = path[path.length - 2]!;\n          if (isAdj(g, prev, nb) && false) continue; // MUTANT: the unshielded-triple condition is gone\n        }",
    expect: "does NOT fire when a consecutive triple on the path is shielded",
  },
  {
    name: "R5 (alpha/theta non-adjacent)",
    from: "if (extended.length >= 4 && !isAdj(g, a, theta) && !isAdj(g, b, gamma)) return extended;",
    to: "if (extended.length >= 4) return extended; // MUTANT: the wrap-around conditions are gone",
    expect: "does NOT fire when alpha and theta are adjacent",
  },
  {
    name: "R6 (circle at beta)",
    from: 'if (markAt(g, beta, gamma) !== "circle") continue; // beta o-* gamma\n      let hasUndirected = false;',
    to: 'if (markAt(g, beta, gamma) !== "circle" && markAt(g, beta, gamma) !== "arrowhead") continue; // MUTANT: one mark too many is accepted\n      let hasUndirected = false;',
    expect: "does NOT fire when beta has no circle",
  },
  {
    name: "R7 (alpha/gamma non-adjacent)",
    from: "if (isAdj(g, alpha, gamma)) continue; // alpha, gamma must be non-adjacent",
    to: "// MUTANT: the non-adjacency condition is gone",
    expect: "does NOT fire when alpha and gamma are adjacent",
  },
  {
    name: "R8 (alpha -> beta step)",
    from: 'if (markAt(g, alpha, beta) !== "tail") continue; // alpha -> beta, or alpha -o beta',
    to: 'if (markAt(g, alpha, beta) === "arrowhead") continue; // MUTANT: any circle-at-alpha is allowed',
    expect: "does NOT fire without a directed path from alpha",
  },
  {
    name: "R9 (gamma/beta non-adjacent)",
    from: "if (isAdj(g, beta, gamma)) continue; // gamma and beta must be non-adjacent",
    to: "// MUTANT: the non-adjacency condition is gone",
    expect: "does NOT fire when the second vertex is adjacent to gamma",
  },
  {
    name: "R10 (mu/omega non-adjacent)",
    from: "if (isAdj(g, mu, omega)) continue;",
    to: "// MUTANT: the non-adjacency condition is gone",
    expect: "does NOT fire when the two paths start at adjacent vertices",
  },
];

/**
 * Run the suite against the current source and return the set of PASSED test titles.
 *
 * THE PASS SET, NOT THE FAILED SET. A mutation is DETECTED when the named test did not PASS.
 * That covers all three ways a mutation can be caught: an assertion failure, a crash, and a
 * test that never ran.
 *
 * WHY THIS MATTERS, AND WHY IT WAS CHANGED. This sweep originally looked for
 * `status === "failed"` and required the named test to be there. That is the fragile kind of
 * detection: a mutation that makes the module CRASH the vitest worker produces no "failed"
 * entry at all -- the test never reports, so its title is in neither the failed nor the passed
 * set -- and requiring a "failed" entry then reports "STILL PASSED" for a mutation that did
 * break the suite. That is exactly backwards, and it is the bug the periodic-ID sweep's first
 * run exposed (there, the budget-guard mutation allocated 1,572,870 nodes and killed the
 * worker).
 *
 * This sweep's own mutations are all rule-level -- they change marks in a small hand-built
 * graph -- so none of them can OOM a worker, and its 14/14 result stands as measured. But the
 * logic is the fragile kind, so it is fixed the same way.
 *
 * The JSON reporter is the source of truth. The verbose reporter prints a failed test as
 * `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which is how
 * this sweep's first version reported "NOT PINNED" for every rule while every test was in fact
 * pinned.
 */
function passedTitles() {
  rmSync(REPORT, { force: true });
  try {
    execFileSync("node", [VITEST, "run", "--reporter=json", `--outputFile=${REPORT}`, ...TESTS], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    // A non-zero exit is EXPECTED for a mutation that breaks a test; the report still lands.
  }
  const report = JSON.parse(readFileSync(REPORT, "utf8"));
  const passed = new Set();
  for (const file of report.testResults) {
    for (const a of file.assertionResults) {
      if (a.status === "passed") passed.add(a.title);
    }
  }
  return passed;
}

/**
 * EVERY test title in the rule test file, verbatim.
 *
 * The baseline round requires ALL of them to pass AND the count to match, so the detection
 * logic cannot be merely inverted: a run where the worker crashed after the first few tests
 * would not satisfy it.
 */
const EXPECTED_BASELINE_PASS = [
  "turns an uncovered circle cycle into undirected edges",
  "does NOT fire when the cycle is shielded",
  "does NOT fire when a consecutive triple on the path is shielded",
  "does NOT fire when alpha and theta are adjacent",
  "turns the circle at beta into a tail when beta has an undirected edge",
  "does NOT fire when beta has no circle",
  "does NOT fire when the circle is at the far end of the edge",
  "turns the circle at beta into a tail when alpha and gamma are non-adjacent",
  "does NOT fire when alpha and gamma are adjacent",
  "turns alpha o-> gamma into alpha -> gamma given a directed path",
  "does NOT fire without a directed path from alpha",
  "turns alpha o-> gamma into alpha -> gamma given an uncovered p.d. path",
  "does NOT fire when the second vertex is adjacent to gamma",
  "turns alpha o-> gamma into alpha -> gamma given two non-adjacent p.d. paths",
  "does NOT fire when the two paths start at adjacent vertices",
];

let broken = 0;

try {
  console.log("=== PHASE 1: disable the rule; the pinning test MUST NOT PASS ===");
  for (const rule of DISABLE) {
    const needle = `if (${rule.call}) changed = true;`;
    if (!original.includes(needle)) {
      console.error(`ERROR: call site not found for ${rule.name}: ${needle}`);
      broken++;
      continue;
    }
    writeFileSync(SRC, original.replace(needle, `/* MUTANT: ${rule.name} disabled */`));
    const passed = passedTitles();
    const detected = !passed.has(rule.expect);
    if (!detected) broken++;
    console.log(
      `${detected ? "OK  " : "FAIL"} ${rule.name}: "${rule.expect}" -> ${
        detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this rule"
      }`,
    );
  }

  console.log("\n=== PHASE 2: break the antecedent; the named test MUST NOT PASS ===");
  for (const mut of BREAK_ANTECEDENT) {
    const occurrences = original.split(mut.from).length - 1;
    if (occurrences !== 1) {
      console.error(`ERROR: fragment for ${mut.name} occurs ${occurrences} times, expected exactly 1`);
      broken++;
      continue;
    }
    writeFileSync(SRC, original.replace(mut.from, mut.to));
    const passed = passedTitles();
    const detected = !passed.has(mut.expect);
    if (!detected) broken++;
    console.log(
      `${detected ? "OK  " : "FAIL"} ${mut.name}: "${mut.expect}" -> ${
        detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin the antecedent"
      }`,
    );
  }

  console.log("\n=== BASELINE (no mutation): EVERY test MUST pass ===");
  writeFileSync(SRC, original);
  const baselinePassed = passedTitles();
  // Every test in the file must pass, and the count must be the whole file. A baseline that
  // passes only SOME of the tests would let a broken detection logic look correct.
  const notPassed = [...EXPECTED_BASELINE_PASS].filter((t) => !baselinePassed.has(t));
  if (notPassed.length > 0) {
    broken++;
    console.log(`FAIL baseline: these did not pass: ${notPassed.join(" | ")}`);
  } else if (baselinePassed.size !== EXPECTED_BASELINE_PASS.length) {
    broken++;
    console.log(
      `FAIL baseline: ${baselinePassed.size} passed but ${EXPECTED_BASELINE_PASS.length} were expected -- ` +
        "the report and the expectation disagree, so the detection logic cannot be trusted",
    );
  } else {
    console.log(`OK   baseline: all ${baselinePassed.size} tests pass with the unmutated source`);
  }
} finally {
  writeFileSync(SRC, original);
  rmSync(REPORT, { force: true });
  console.log("\nsource restored");
}

process.exit(broken === 0 ? 0 : 1);
