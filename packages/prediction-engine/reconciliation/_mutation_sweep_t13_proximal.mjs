/**
 * MUTATION SWEEP for the T13 gate -- the proximal route on an unbreakable bow-arc.
 *
 * THE QUESTION. The T13 gate (test/proximal-bridge-id.t13.spec.ts) passes 5/5. A passing gate
 * is not evidence that the gate pins what it claims. The audit rule is: a test that passes for
 * the wrong reason reports a guarantee the code does not provide.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. The gate sits on the path where the ordinary
 * identification FAILS, so the interesting failures are not "the effect came out slightly
 * different" -- they are:
 *
 *   - the gate IGNORES the proximal data, so the bow-arc is refused no matter what the
 *     proxies say (the proximal route silently dead);
 *   - the gate publishes the proximal number under the ORDINARY formula label, so a reader
 *     believes the g-formula identified it when the proximal bridge did;
 *   - the gate swallows the proximal REFUSAL, so a caller cannot tell "we tried and the
 *     condition number was 40,000" from "we declined to try";
 *   - the gate publishes the proximal number when the bridge was ILL-POSED -- the dangerous
 *     one, because that is a causal claim resting on a bridge that could not be inverted.
 *
 * THE PHASES.
 *   Phase 1 -- DISABLE THE ROUTE. Comment out the call that runs the proximal solver; the
 *              tests that need the proximal route must fail.
 *   Phase 2 -- BREAK A PROPERTY. Mislabel the formula, swallow the refusal, or publish an
 *              ill-posed bridge; the named test must fail.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a failed test as
 * `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which is how
 * the FCI sweep's first version reported "NOT PINNED" for every rule while every test was in
 * fact pinned. Detection is "the named test did not PASS", which covers an assertion
 * failure, a crash, and a test that never ran.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const GATE = "src/causal/causal-claim-gate.ts";
const SOLVER = "src/causal/proximal-bridge-id.ts";
const TESTS = ["test/proximal-bridge-id.t13.spec.ts"];
const VITEST = "../../node_modules/vitest/vitest.mjs";
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t13_sweep_report.json";

/**
 * The pristine text of EVERY file a mutation may touch.
 *
 * A mutation names its own target with `file` (defaulting to the gate). Each is restored from
 * this map, not from a single global snapshot, so a mutation to the SOLVER cannot be undone
 * by restoring the gate -- and, more importantly, so a mutation to the gate is restored
 * exactly, with no residue from the previous round.
 */
const ORIGINALS = new Map([
  [GATE, readFileSync(GATE, "utf8")],
  [SOLVER, readFileSync(SOLVER, "utf8")],
]);

/** Phase 1: disable the route. The named test must not pass. */
const DISABLE = [
  {
    name: "the proximal solver is never run",
    from: "  const proximalAttempt = runProximalAttempt(query);",
    to: "  const proximalAttempt = null; // MUTANT: the proximal route is dead",
    expect: "the SAME bow-arc is published CAUSAL by the proximal g-formula when proxies are supplied",
  },
];

/** Phase 2: break a property of the route. The named test must not pass. */
const BREAK = [
  {
    name: "the formula is mislabelled as the ordinary g-formula",
    from: '      formula_class: "PROXIMAL_BRIDGE",',
    to: '      formula_class: "BACKDOOR_G_FORMULA", // MUTANT: the proximal number is published under the wrong label',
    expect: "the SAME bow-arc is published CAUSAL by the proximal g-formula when proxies are supplied",
  },
  {
    name: "an ill-posed bridge is published anyway",
    from: "  if (proximalAttempt !== null && proximalAttempt.admitted) {",
    to: "  if (proximalAttempt !== null) { // MUTANT: a refused bridge is published as causal",
    expect: "the proximal route REFUSES on an ill-posed bridge, and the verdict says why",
  },
  {
    name: "the proximal REFUSAL is swallowed from the reason",
    // The gate appends a note saying the proximal route was tried and why it declined. If
    // that note is dropped, a caller cannot tell "we tried and the condition number was
    // 40,000" from "we declined to try" -- and the attempt itself still rides along in
    // `proximal_attempt`, so only the PROSE is lost. The test below asserts the refusal
    // code and the condition number, which live on the attempt, so this mutation is caught
    // by the assertion that the verdict REPORTS the failure rather than silently omitting
    // it.
    from: "  const proximalNote =\n    proximalAttempt !== null",
    to: "  const proximalNote =\n    false && proximalAttempt !== null // MUTANT: the refusal is dropped from the reason",
    expect: "the proximal route REFUSES on an ill-posed bridge, and the verdict says why",
  },
  {
    name: "the sample-size floor is not enforced",
    from: "  if (n < MIN_PROXIMAL_SAMPLE_SIZE) {",
    to: "  if (false) { // MUTANT: the sample-size floor is gone",
    expect: "a too-small proximal dataset is refused through the gate, and reported",
    file: "src/causal/proximal-bridge-id.ts",
  },
];

/**
 * Run the suite and return the set of PASSED test titles.
 *
 * THE PASS SET, NOT THE FAILED SET: a mutation is DETECTED when the named test did not PASS,
 * which covers an assertion failure, a crash, and a test that never ran.
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

/** Every test title in the gate, verbatim. The baseline requires ALL of them. */
const EXPECTED_BASELINE_PASS = [
  "a bow-arc with 0 mediators is refused on the ordinary path",
  "the SAME bow-arc is published CAUSAL by the proximal g-formula when proxies are supplied",
  "the proximal route REFUSES on an ill-posed bridge, and the verdict says why",
  "the SAME graph with and without proxies gives DIFFERENT verdicts",
  "a too-small proximal dataset is refused through the gate, and reported",
];

let broken = 0;

try {
  console.log("=== PHASE 1: disable the route; the named test MUST NOT PASS ===");
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
    console.log(`OK   baseline: all ${baselinePassed.size} tests pass with the unmutated source`);
  }
} finally {
  for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  rmSync(REPORT, { force: true });
  console.log("\nsource restored");
}

process.exit(broken === 0 ? 0 : 1);
