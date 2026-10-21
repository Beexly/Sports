/**
 * MUTATION SWEEP for the T15 gate -- the constitutional CRPS circuit breaker
 * and the NGS public-surface route fence.
 *
 * THE QUESTION. The T15 tests pass. A passing test is not evidence that the
 * test pins what it claims. The audit rule is: a test that passes for the
 * wrong reason reports a guarantee the code does not provide. This sweep
 * mutates the source under test and asserts that a NAMED test stops passing.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. The constitutional gate is the last
 * thing between a walk-forward result that never cleared its bar and a board
 * full of picks minted from it. The interesting failures are not "the number
 * came out slightly different" -- they are:
 *
 *   - the CRPS CHECK IS DROPPED, so the 7.099 bar stops being enforced and a
 *     model above the bar clears the gate (this is the ORIGINAL defect: the
 *     old gate read passed === true and nothing else);
 *   - the CRPS CHECK PASSES WHEN THE CRPS IS NULL, so a branch that never
 *     computed the CRPS at all is treated as having cleared the bar -- the
 *     "never reproduced" finding the gate exists to distinguish;
 *   - the CRPS COMPARISON IS INVERTED, so the bar becomes a floor instead of
 *     a ceiling;
 *   - the DELTA CHECK IS DROPPED, so a model that merely TIES the Gaussian
 *     baseline clears a bar that requires BEATING it by 0.01;
 *   - the n CHECK IS DROPPED, so a model scored on a handful of games clears
 *     a bar that requires at least 150;
 *   - a MISSING FILE PASSES, so a tree with no artifact at all opens the
 *     gate instead of failing closed;
 *   - the UNFROZEN CROSS-CHECK COUNTS, so a model that only clears the bar
 *     on the unfrozen nflverse cross-check opens the gate -- which the spec
 *     artifact explicitly refuses ("does NOT count for the gate").
 *
 * THE PHASES.
 *   Phase 1 -- DROP A CRITERION. Remove one leg of the constitutional
 *              conjunction; the named test must fail.
 *   Phase 2 -- INVERT A CRITERION. Make a check pass in the wrong direction;
 *              the named test must fail.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a
 * failed test as `  x file.ts > describe > it`, and matching on the whole line
 * finds nothing -- which is how the FCI sweep's first version reported "NOT
 * PINNED" for every rule while every test was in fact pinned. Detection is
 * "the named test did not PASS", which covers an assertion failure, a crash,
 * and a test that never ran.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

/** The gate under test. */
const GATE = "src/walk-forward-emission-gate.ts";

/** The test file that must pin the constitutional condition. */
const TESTS = ["src/__tests__/walk-forward-emission-gate.t15.test.ts"];

const VITEST = "../../node_modules/vitest/vitest.mjs";
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t15_sweep_report.json";

/**
 * The pristine text of EVERY file a mutation may touch.
 *
 * A mutation names its own target with `file` (defaulting to the gate). Each
 * is restored from this map, not from a single global snapshot, so a mutation
 * to one file cannot be undone by restoring the other -- and, more
 * importantly, so a mutation is restored exactly, with no residue from the
 * previous round.
 */
const ORIGINALS = new Map([
  [GATE, readFileSync(GATE, "utf8")],
]);

/** Phase 1: drop a leg of the constitutional conjunction. The named test must not pass. */
const DISABLE = [
  {
    name: "the CRPS check is dropped entirely",
    from: '  if (c.crps > MAX_EMISSION_CRPS) return "crps_above_bar";',
    to: "  // MUTANT: the CRPS bar is not enforced at all",
    expect: "CRPS just above 7.099 BLOCKS",
  },
  {
    name: "the delta-vs-Gaussian check is dropped entirely",
    from: '  if (c.deltaVsGaussian < MIN_DELTA_VS_GAUSSIAN) return "delta_below_minimum";',
    to: "  // MUTANT: the model need not beat the Gaussian baseline",
    expect: "delta just below 0.01 BLOCKS",
  },
  {
    name: "the sample-size floor is dropped entirely",
    from: '  if (c.n < MIN_GATE_N) return "n_below_minimum";',
    to: "  // MUTANT: a model scored on a handful of games counts",
    expect: "n of 149 BLOCKS",
  },
  {
    name: "a missing artifact file opens the gate",
    from: "  return {\n    blocked: true,\n    passed: false,",
    to: "  return {\n    blocked: false, // MUTANT: an unreadable artifact no longer blocks\n    passed: false,",
    expect: "a missing file BLOCKS with file_missing",
  },
];

/** Phase 2: invert a criterion. The named test must not pass. */
const BREAK = [
  {
    name: "the CRPS comparison is inverted (bar becomes a floor)",
    from: '  if (c.crps > MAX_EMISSION_CRPS) return "crps_above_bar";',
    to: '  if (c.crps < MAX_EMISSION_CRPS) return "crps_above_bar"; // MUTANT: inverted',
    // A model BELOW the bar is the one the inverted check rejects, so the
    // test that a satisfying model OPENS the gate is the one that must fail.
    expect: "opens when a frozen-manifest model satisfies all three criteria",
  },
  {
    name: "the CRPS check passes when the CRPS was never reproduced",
    from: '  if (c.crps === null) return "crps_not_reproduced";',
    to: "  // MUTANT: a null CRPS is treated as having cleared the bar",
    expect: "a null CRPS BLOCKS and says the bar was NEVER REPRODUCED",
  },
  {
    name: "the UNFROZEN nflverse cross-check counts toward clearing",
    from: "  const frozen = candidates.filter((c) => !c.unfrozen);",
    to: "  const frozen = candidates; // MUTANT: the unfrozen cross-check now counts",
    expect: "the UNFROZEN cross-check never counts toward clearing",
  },
];

/**
 * Run the suite and return the set of PASSED test titles.
 *
 * THE PASS SET, NOT THE FAILED SET: a mutation is DETECTED when the named
 * test did not PASS, which covers an assertion failure, a crash, and a test
 * that never ran.
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

/** Every test title in the T15 gate file, verbatim. The baseline requires ALL of them. */
const EXPECTED_BASELINE_PASS = [
  "opens when a frozen-manifest model satisfies all three criteria",
  "CRPS exactly 7.099 CLEARS the bar (the bar is inclusive)",
  "CRPS just above 7.099 BLOCKS",
  "delta exactly 0.01 CLEARS the bar (the bar is inclusive)",
  "delta just below 0.01 BLOCKS",
  "n exactly 150 CLEARS the bar (the bar is inclusive)",
  "n of 149 BLOCKS",
  "each criterion blocks on its own while the other two pass",
  "passed:false BLOCKS even when a frozen model clears every numeric criterion",
  "the spec-named artifact's own models.gate_cleared:false BLOCKS",
  "the UNFROZEN cross-check never counts toward clearing",
  "a missing file BLOCKS with file_missing",
  "an unparseable file BLOCKS with file_unparseable",
  "a non-object JSON file BLOCKS with file_unparseable",
  "a null CRPS BLOCKS and says the bar was NEVER REPRODUCED",
  "a missing CRPS BLOCKS as never reproduced",
  "a missing n BLOCKS as n_missing",
  "a missing delta BLOCKS as delta_missing",
  "a non-finite CRPS BLOCKS as crps_not_finite",
  "a non-numeric CRPS is a non-finite CRPS, not a reproduced one",
  "an empty frozen-manifest model map BLOCKS as no_model_candidates",
  "the artifact on disk BLOCKS and says the CRPS bar was never reproduced",
  "the on-disk artifact reads as the flat shape",
  "a bare { passed: true } override BLOCKS (the hole the old gate left)",
  "an override that carries the evidence OPENS the gate",
  "an override with passed:false BLOCKS however good the numbers are",
  "an override whose CRPS is above the bar BLOCKS",
];

let broken = 0;

try {
  console.log("=== PHASE 1: drop a leg of the conjunction; the named test MUST NOT PASS ===");
  for (const mut of [...DISABLE, ...BREAK]) {
    const target = mut.file ?? GATE;
    const pristine = ORIGINALS.get(target);
    if (pristine === undefined) {
      console.error(`ERROR: unknown target file for ${mut.name}: ${target}`);
      broken++;
      continue;
    }
    const occurrences = pristine.split(mut.from).length - 1;
    if (occurrences !== 1) {
      console.error(`ERROR: fragment for ${mut.name} occurs ${occurrences} times, expected exactly 1`);
      broken++;
      continue;
    }
    writeFileSync(target, pristine.replace(mut.from, mut.to));
    const passed = passedTitles();
    const detected = !passed.has(mut.expect);
    if (!detected) broken++;
    const phase = DISABLE.includes(mut) ? "P1" : "P2";
    console.log(
      `${detected ? "OK  " : "FAIL"} [${phase}] ${mut.name}: "${mut.expect}" -> ${
        detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this"
      }`,
    );
    // Restore EVERY file, so a mutation never leaks into the next round.
    for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  }

  console.log("\n=== BASELINE (no mutation): EVERY test MUST pass ===");
  for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  const baselinePassed = passedTitles();
  const notPassed = [...EXPECTED_BASELINE_PASS].filter((t) => !baselinePassed.has(t));
  if (notPassed.length > 0) {
    broken++;
    console.log(`FAIL baseline: these did not pass: ${notPassed.join(" | ")}`);
  } else if (baselinePassed.size !== EXPECTED_BASELINE_PASS.length) {
    broken++;
    console.log(
      `FAIL baseline: ${baselinePassed.size} passed but ${EXPECTED_BASELINE_PASS.length} were expected`,
    );
  } else {
    console.log(`OK   baseline: all ${baselinePassed.size} tests pass`);
  }
} finally {
  for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  rmSync(REPORT, { force: true });
  console.log("\nsource restored");
}

process.exit(broken === 0 ? 0 : 1);
