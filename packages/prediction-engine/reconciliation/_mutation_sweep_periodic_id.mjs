/**
 * MUTATION SWEEP for periodic-timeseries-id.ts -- the Jahn/Karnik/Schulman (2025) window.
 *
 * WHY THIS EXISTS. The module was written by a delegate and its 24 tests passed. Per the
 * audit's own rule -- "a subagent's passing test suite is evidence about the subagent's tests,
 * not about the requirement" -- a passing suite is not evidence that the module computes the
 * Proposition 1 bound, refuses rather than truncates, and rejects the unsound inputs. This
 * sweep is the measurement.
 *
 * THIS MODULE'S FAILURE MODE IS NOT A WRONG ANSWER, IT IS A SILENTLY SMALLER ANSWER. The
 * bound C is exponential in the width, so a window that is too small does not produce a wrong
 * number -- it produces a CONFIDENT "identifiable" verdict for an effect that is not
 * identifiable, because the hedge that proves unidentifiability lives outside the truncated
 * window and is never seen. So the sweep's Phase 2 is weighted towards the refusals.
 *
 * THE PHASES.
 *   Phase 1 -- THE COMPUTED VALUES. Break the arithmetic (the bound, the window edges, the
 *              node count, the verdict) and require the named test to fail.
 *   Phase 2 -- THE REFUSALS. Remove a guard, or replace a refusal with a silent truncation,
 *              and require the named test to fail. A guard that can be deleted without any
 *              test noticing is a guard that is not there.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER, NOT FROM SCRAPING TEXT. The verbose reporter
 * prints a failed test as `  x file.ts > describe > it`, and matching on the whole line finds
 * nothing -- which is how the FCI sweep's first version reported "NOT PINNED" for every rule
 * while every test was in fact pinned. The JSON reporter gives per-test status directly.
 *
 * EVERY ROUND IS EXIT-CODE DRIVEN, and every mutation fragment is asserted to occur EXACTLY
 * ONCE in the source before it is applied -- a fragment that appears twice would silently
 * mutate the wrong function.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const SRC = "src/causal/periodic-timeseries-id.ts";
const TESTS = ["src/causal/periodic-timeseries-id.test.ts"];
const VITEST = "../../node_modules/vitest/vitest.mjs";
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_periodic_sweep_report.json";

const original = readFileSync(SRC, "utf8");

/** Phase 1: the computed values. Break the arithmetic; the named test must fail. */
const COMPUTED = [
  {
    name: "the bound's exponent (2*L*w+2 -> 2*L*w)",
    from: "return BigInt(latency) * twoPowLw * base ** exponent;",
    to: "return BigInt(latency) * twoPowLw * base ** (2n * lw); // MUTANT: wrong exponent",
    expect: "is C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2), exactly",
  },
  {
    name: "the window's lower edge (no clamp at 0)",
    from: "const tLo = Math.max(rawLower, 0);",
    to: "const tLo = rawLower; // MUTANT: the lower edge is no longer clamped at 0",
    expect: "is clamped at 0 when t_min(X) is at or below C",
  },
  {
    name: "the node count (timeSteps, not timeSteps*width)",
    from: "nodeCount: timeSteps * width,",
    to: "nodeCount: timeSteps, // MUTANT: the width is dropped from the node count",
    expect: "produces k*w nodes for k time steps of width w",
  },
  {
    name: "the verdict (always identifiable)",
    from: "identifiable: idResult.ok,",
    to: "identifiable: true, // MUTANT: the verdict ignores the engine",
    expect: "reports a bow arc that survives into the window as UNIDENTIFIABLE",
  },
];

/** Phase 2: the refusals. Remove a guard or replace a refusal; the named test must fail. */
const REFUSALS = [
  {
    name: "the node budget guard (the node budget is effectively inflated)",
    // A million extra nodes of slack, so a 34-node window against a 10-node budget is ALLOWED.
    // The mutation is deliberately an INFLATION rather than a deletion: deleting the guard
    // outright lets the w = 3 blow-up test allocate 1,572,870 nodes, which kills the vitest
    // worker with an out-of-memory crash. That crash is also a detection, but it takes the
    // whole run down with it, and a sweep that can take the machine out is a sweep that does
    // not belong in CI. The inflation detects the same defect -- the budget not being
    // consulted -- without the blast radius.
    from: "if (window.nodeCount > maxNodes || window.timeSteps > maxTimeSteps) {",
    to: "if (window.nodeCount > maxNodes + 1_000_000 || window.timeSteps > maxTimeSteps) { // MUTANT: the node budget is inflated",
    expect: "REFUSES a window over the caller's node budget, with a clear error",
  },
  {
    name: "silent truncation (the window is capped instead of refused)",
    from: "const timeSteps = tHi - tLo + 1;",
    to: "const timeSteps = Math.min(tHi - tLo + 1, 2); // MUTANT: the window is silently truncated",
    expect: "never silently truncates: the window used is the FULL window",
  },
  {
    name: "the latency-match guard",
    from: "if (maxLag !== graph.latency) {",
    to: "if (false) { // MUTANT: a latency mismatch is accepted",
    expect: "requires the declared latency to match the template's maximum lag",
  },
  {
    name: "the out-of-scope refusal (an intervention after the outcome)",
    from: "if (hasIntervention && tMinX > tMaxY) {",
    to: "if (false) { // MUTANT: an uncovered query is answered anyway",
    expect: "refuses a query the paper's window does not cover",
  },
  {
    name: "the too-large-bound refusal (rounds instead of refusing)",
    from: "if (exact > BigInt(Number.MAX_SAFE_INTEGER)) {",
    to: "if (false) { // MUTANT: an inexactly-representable bound is rounded",
    expect: "refuses a bound that is too large to be exact, rather than rounding it",
  },
  {
    name: "the empty-outcome refusal",
    from: "if (query.y.length === 0) {",
    to: "if (false) { // MUTANT: an empty outcome set is accepted",
    expect: "refuses a malformed graph or query",
  },
];

/**
 * EVERY test title in the module's test file, verbatim.
 *
 * The baseline round requires ALL of them to pass, and requires the count to match. Without
 * this list the baseline could pass on a run where the worker crashed after the first few
 * tests, and a broken detection logic would look correct. It is the check that the detection
 * logic is not simply inverted.
 *
 * THE TITLES ARE COPIED FROM THE JSON REPORTER, NOT RE-TYPED FROM THE SOURCE. An earlier
 * version of this sweep misspelled one -- "(L*w+1)" instead of "(L*w + 1)" -- and the
 * misspelling made the mutation look undetected when the test had in fact failed. A title
 * that does not match the report is a title that matches nothing.
 */
const EXPECTED_BASELINE_PASS = [
  "is C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2), exactly",
  "agrees with the exact BigInt form",
  "is NOT the goal spec's 2|V_slice|, which does not appear in the paper",
  "grows exponentially in the width",
  "refuses absurd inputs",
  "refuses a bound that is too large to be exact, rather than rounding it",
  "is not clamped when t_min(X) is greater than C",
  "is clamped at 0 when t_min(X) is at or below C",
  "reports its size without unrolling anything",
  "scales with the width, so the size report catches the exponential blow-up",
  "produces k*w nodes for k time steps of width w",
  "lays the template over every time step of the window",
  "hands the engine a topological order",
  "reports an identifiable effect as identifiable",
  "reports a bow arc that survives into the window as UNIDENTIFIABLE",
  "is the same verdict the existing Shpitser-Pearl engine gives on the unrolled window",
  "handles a contemporaneous (lag 0) edge in the same slice",
  "REFUSES a window over the caller's node budget, with a clear error",
  "never silently truncates: the window used is the FULL window",
  "refuses the exponential blow-up by default, and the size report shows it in advance",
  "requires the declared latency to match the template's maximum lag",
  "refuses a query the paper's window does not cover",
  "refuses a malformed graph or query",
  "is deterministic on a randomly generated periodic template",
];

/**
 * Run the suite against the current source and return the set of PASSED test titles.
 *
 * THE PASS SET, NOT THE FAILED SET. This is the second version of this sweep's detection
 * logic, and the first version was wrong in a way that made a real defect look like a clean
 * bill of health. It looked for `status === "failed"` and required the named test to be
 * there. But a mutation that makes the module allocate a 1.5-million-node window CRASHES THE
 * WORKER -- the run dies with "Worker exited unexpectedly", the test never reports, and its
 * title appears in NEITHER the failed nor the passed set. Requiring a "failed" entry then
 * reports "STILL PASSED" for a mutation that actually broke the suite, which is exactly
 * backwards.
 *
 * A mutation is DETECTED when the named test did not PASS. That covers all three ways a
 * mutation can be caught: an assertion failure, a crash, and a test that never ran. The
 * converse -- the baseline requiring every named test to pass -- is the check that this
 * detection logic is not simply inverted.
 *
 * The JSON reporter is the source of truth. The verbose reporter prints a failed test as
 * `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which is
 * how the FCI sweep's first version reported "NOT PINNED" for every rule while every test
 * was in fact pinned.
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

let broken = 0;

try {
  console.log("=== PHASE 1: break the computed values; the named test MUST NOT PASS ===");
  for (const mut of COMPUTED) {
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
        detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this"
      }`,
    );
  }

  console.log("\n=== PHASE 2: remove a refusal; the named test MUST NOT PASS ===");
  for (const mut of REFUSALS) {
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
        detected ? "did not pass, as required" : "STILL PASSED -- the refusal is not pinned by a test"
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
