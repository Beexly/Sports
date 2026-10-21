/**
 * MUTATION SWEEP for the T7 gate -- the 600-Test Conformal & TA-CQR Invariant Matrix.
 *
 * THE QUESTION. The T7 gate (test/conformal-copula-kelly.t7.spec.ts) passes 795/795. A
 * passing gate is not evidence that the gate pins what it claims. The audit rule is: a test
 * that passes for the wrong reason reports a guarantee the code does not provide. And a
 * GENERATED matrix is the most dangerous kind of test file, because a generator that emits
 * 795 assertions can also emit 795 assertions that all restate the same wrong line of
 * source. "795 tests" is a count, not a proof.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. T7 carries four laws, and each law has a
 * characteristic way of being quietly broken:
 *
 *   - the finite-sample rank LOSES its ceiling. ceil((n+1)(1-eps)) is not a formatting
 *     detail; the ceil is what makes the coverage guarantee finite-sample rather than
 *     asymptotic. Drop it and the rank becomes a fraction, and the "quantile" is not an
 *     order statistic of anything.
 *   - the TA-CQR score's max() BECOMES a sum. max(qLower - y, y - qUpper) and
 *     (qLower - y) + (y - qUpper) are different functions; the sum telescopes to
 *     qLower - qUpper, which is <= 0 for EVERY interval, so the "conformity score" would
 *     be negative for every point that is not wildly outside the interval. A negative
 *     conformity score silently inverts the quantile.
 *   - the Frechet-Hoeffding lower bound LOSES its clamp at zero. max(0, pa + pb - 1) is
 *     the bound; without the clamp the "lower bound" is negative and a joint probability
 *     of -0.3 becomes admissible.
 *   - the joint-probability check CLAMPS instead of REJECTING. This is the expensive one.
 *     A checker that clamps an out-of-bounds joint probability to the nearest bound
 *     returns a plausible-looking probability for a joint that no distribution can
 *     produce, and every downstream pricing, copula and sizing computation then acts on
 *     a number that was invented by the clamp. The test matrix must make the REJECTION
 *     observable, or the clamp is invisible.
 *   - the Kelly downside term LOSES its throttle. max(0, 1 - max(0, D - alpha)/alpha)
 *     scales the downside charge by the break-rate dial; dropping it makes the dial a
 *     decoration, and the break-rate monitor stops mattering to the stake.
 *
 * THE PHASES.
 *   Phase 1 -- THE LAWS. Break the arithmetic of the rank, the score and the bound, and
 *              require the named test to fail.
 *   Phase 2 -- THE REFUSALS AND THE DIALS. Turn the rejection into a clamp, and drop the
 *              downside throttle, and require the named test to fail.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a failed test as
 * `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which is how
 * the FCI sweep's first version reported "NOT PINNED" for every rule while every test was in
 * fact pinned. Detection is "the named test did not PASS", which covers an assertion
 * failure, a crash, and a test that never ran.
 *
 * THE NAMED TESTS ARE GENERATED, SO THEY ARE NAMED BY THEIR EXACT TITLE. A grid cell's
 * title is the only handle on it, so the titles below are quoted verbatim from the
 * generator, and each one is chosen to be STATIC -- that is,, to not depend on a bound
 * that the mutation itself moves. A title like "joint below_lower rejected pa=0.7 pb=0.6"
 * is only generated when bounds.lower > 0.01, so a mutation that changes the bounds would
 * change the test set, and the sweep would be chasing its own tail. Every named test below
 * has a title that is a pure function of the generator's constants.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const SRC = "src/calibration/conformal-copula-kelly.ts";
const TESTS = ["test/conformal-copula-kelly.t7.spec.ts"];
const VITEST = "../../node_modules/vitest/vitest.mjs";
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t7_sweep_report.json";

/** The number of tests the gate must contain for the matrix to be the matrix the spec asked for. */
const MIN_TEST_COUNT = 600;

/**
 * The pristine text of EVERY file a mutation may touch.
 *
 * A mutation names its own target with `file` (defaulting to the module). Each is restored
 * from this map, not from a single global snapshot, so a mutation to one file cannot be
 * undone by restoring another -- and, more importantly, so a mutation is restored exactly,
 * with no residue from the previous round.
 */
const ORIGINALS = new Map([[SRC, readFileSync(SRC, "utf8")]]);

/** Phase 1: the laws. Break the arithmetic; the named test must not pass. */
const LAWS = [
  {
    name: "the finite-sample rank loses its ceiling",
    from: "  return Math.ceil((n + 1) * (1 - epsilon));",
    to: "  return (n + 1) * (1 - epsilon); // MUTANT: the ceil is gone, so the rank is a fraction",
    expect: "T7/A1 rank n=13 eps=0.1",
  },
  {
    name: "the TA-CQR score's max() becomes a sum",
    from: "  return Math.max(qLower - y, y - qUpper);",
    to: "  return (qLower - y) + (y - qUpper); // MUTANT: the sum telescopes to qLower - qUpper",
    expect: "T7/B1 taCqrScore y=5 shape=under beta=0.01",
  },
  {
    name: "the Frechet-Hoeffding lower bound loses its clamp at zero",
    from: "  return { lower: Math.min(Math.max(0, pa + pb - 1), upper), upper };",
    to: "  return { lower: Math.min(pa + pb - 1, upper), upper }; // MUTANT: the lower bound is no longer clamped at 0",
    expect: "T7/C3 the lower bound is clamped at zero when pa + pb <= 1",
  },
];

/** Phase 2: the refusals and the dials. The named test must not pass. */
const REFUSALS = [
  {
    name: "an out-of-bounds joint probability is CLAMPED instead of rejected",
    // The expensive mutation. A clamp here returns a plausible-looking probability for a
    // joint that no distribution can produce, and every downstream consumer then acts on a
    // number the clamp invented. The test must see the REJECTION.
    from: "  if (!check.ok) {\n    throw new Error(`assertJointProbability: ${check.reason ?? \"joint probability is inadmissible\"}`);\n  }",
    to: "  if (!check.ok) {\n    return Math.min(Math.max(joint, check.bounds.lower), check.bounds.upper); // MUTANT: clamped instead of rejected\n  }",
    expect: "T7/C3 assertJointProbability does not clamp a violating joint probability",
  },
  {
    name: "the Kelly downside term loses the break-rate throttle",
    from: "  const downside = (1 - p) * b * (1 + kappaSigma * sigmaConf * sigmaConf) * throttle;",
    to: "  const downside = (1 - p) * b * (1 + kappaSigma * sigmaConf * sigmaConf); // MUTANT: the throttle is gone, so the break-rate dial does not scale the downside",
    expect: "T7/D1 conformalKellyStake p=0.55 sigma=0.2 dBreak=0.15",
  },
];

/**
 * Run the suite and return the PASSED test titles, plus the counts.
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
  return { passed, total: report.numTotalTests, failed: report.numFailedTests };
}

/**
 * The named tests the baseline must contain, verbatim.
 *
 * These are the tests the mutations are aimed at, plus the two structural guards. If one of
 * them is missing from the baseline, the sweep is aimed at a test that does not exist, and
 * every mutation would report "detected" for the wrong reason.
 */
const EXPECTED_BASELINE_PASS = [
  "T7/A1 rank n=13 eps=0.1",
  "T7/B1 taCqrScore y=5 shape=under beta=0.01",
  "T7/C3 the lower bound is clamped at zero when pa + pb <= 1",
  "T7/C3 assertJointProbability does not clamp a violating joint probability",
  "T7/D1 conformalKellyStake p=0.55 sigma=0.2 dBreak=0.15",
];

let broken = 0;

try {
  console.log("=== PHASE 1: the laws; the named test MUST NOT PASS ===");
  for (const mut of [...LAWS, ...REFUSALS]) {
    const target = mut.file ?? SRC;
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
    const { passed } = passedTitles();
    const detected = !passed.has(mut.expect);
    if (!detected) broken++;
    const phase = LAWS.includes(mut) ? "P1" : "P2";
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
  const baseline = passedTitles();
  const notPassed = EXPECTED_BASELINE_PASS.filter((t) => !baseline.passed.has(t));
  if (notPassed.length > 0) {
    broken++;
    console.log(`FAIL baseline: these did not pass: ${notPassed.join(" | ")}`);
  } else if (baseline.failed !== 0) {
    broken++;
    console.log(`FAIL baseline: ${baseline.failed} tests failed with the unmutated source`);
  } else if (baseline.total < MIN_TEST_COUNT) {
    broken++;
    console.log(
      `FAIL baseline: only ${baseline.total} tests ran; the spec's matrix needs at least ${MIN_TEST_COUNT}`,
    );
  } else {
    console.log(`OK baseline: all ${baseline.total} tests pass`);
  }
} finally {
  for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  rmSync(REPORT, { force: true });
  console.log("\nsource restored");
}

process.exit(broken === 0 ? 0 : 1);
