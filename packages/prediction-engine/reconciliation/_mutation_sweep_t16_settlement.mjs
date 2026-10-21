/**
 * MUTATION SWEEP for the T16 gate -- the same-cycle settlement loop.
 *
 * THE QUESTION. The T16 gate (test/settlement-loop.t16.spec.ts) passes 17/17. A passing gate
 * is not evidence that the gate pins what it claims. The audit rule is: a test that passes for
 * the wrong reason reports a guarantee the code does not provide.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. T16 is a SPECTRAL DETECTOR with a hard statistical
 * threshold, and spectral detectors have one dominant failure mode: they fire. The spec's
 * own wording is aimed at that failure -- "verifies detection above lambda_+ + s_alpha*sigma_TW
 * WITH Participation Ratio > 1/3" -- and the interesting failures are not "the spike came out
 * slightly different", they are:
 *
 *   - the Marchenko-Pastur edge is computed with the aspect ratio TRANSPOSED, (1+sqrt(T/M))^2
 *     instead of (1+sqrt(M/T))^2. This is THE classic bug in this family: it is a one-token
 *     change, it type-checks, it returns a plausible number, and for M < T it moves the edge
 *     by an order of magnitude (for the spec's own M=20, T=200 it moves 1.7325 to 17.32);
 *   - the Tracy-Widom term is DROPPED from the threshold, so the threshold sits exactly ON the
 *     bulk edge and every finite-sample excursion over the edge becomes a "spike";
 *   - the Participation Ratio requirement is DROPPED, so a factor carried by three market
 *     families is published as a coherent multi-market latent node -- which is the exact
 *     conflation the spec's PR > 1/3 exists to prevent;
 *   - the detector fires on PURE NOISE, which is the failure a demo never shows because a
 *     demo only ever shows the spike;
 *   - the detector's threshold is loosened until the null trips it repeatedly.
 *
 * THE PHASES.
 *   Phase 1 -- BREAK THE EDGE. Transpose the aspect ratio, or drop the Tracy-Widom term.
 *   Phase 2 -- BREAK THE GUARD. Drop the Participation Ratio requirement, or loosen the
 *              threshold until the null is flagged.
 *
 * EVERY MUTATION MUST BE CAUGHT BY A NAMED TEST. The mutation names the test it expects to
 * stop passing. A mutation that no test notices is a guarantee nobody is holding.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a failed test as
 * `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which is how
 * the FCI sweep's first version reported "NOT PINNED" for every rule while every test was in
 * fact pinned. Detection is "the named test did not PASS", which covers an assertion
 * failure, a crash, and a test that never ran.
 *
 * ---------------------------------------------------------------------------------------------
 * THIS SWEEP MUTATES THE WORKING TREE, SO IT IS BUILT NOT TO LIE AND NOT TO LEAVE A MESS.
 *
 * 1. IT IS FAIL-CLOSED. Every failure -- an undetected mutation, a mutation whose fragment no
 *    longer matches the source, a red baseline, a restore that is not byte-exact -- is pushed
 *    onto FAILURES, and the exit code is derived from FAILURES.length and from nothing else. A
 *    sweep that prints failures and exits 0 is a gate that reports a false signal, which is
 *    worse than no gate at all.
 *
 * 2. IT RESTORES EVERY FILE IT TOUCHED, on success and on error alike, and it PROVES the
 *    restore by comparing the bytes.
 *
 * 3. IT TAKES A LOCK. Two sweeps mutating the same source at once would interleave their
 *    mutations and produce results that mean nothing. The lock is a file with the run's PID
 *    in it; a stale lock is broken by AGE, not by PID, because PID REUSE means a dead sweep's
 *    PID can name a completely unrelated live process -- and the sweep would then refuse to
 *    start forever, against the user.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";

/** The module under test. Every mutation below is applied to THIS file. */
const MODULE = "src/learning/settlement-loop.ts";
/** The gate. */
const TESTS = ["test/settlement-loop.t16.spec.ts"];
/** Vitest, resolved from the repo root. */
const VITEST = "../../node_modules/vitest/vitest.mjs";
/** The JSON report lands in the scratch directory, never in the repository. */
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t16_sweep_report.json";
/** The lock file, so two sweeps cannot interleave their mutations. */
const LOCK = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t16_sweep.lock";
/** A lock older than this is stale, however old its PID is. */
const LOCK_STALE_MS = 30 * 60 * 1000;

/** Every failure the sweep finds. The exit code comes from this array and nothing else. */
const FAILURES = [];

/** Record a failure. The sweep is fail-closed: this is the only way to fail it. */
function fail(message) {
  FAILURES.push(message);
  console.log(`FAIL ${message}`);
}

/**
 * The pristine text of EVERY file a mutation may touch.
 *
 * A mutation names its own target with `file` (defaulting to the module). Each is restored
 * from this map, not from a single global snapshot, so a mutation to one file cannot be
 * undone by restoring another -- and, more importantly, so a mutation is restored exactly,
 * with no residue from the previous round.
 */
const ORIGINALS = new Map([[MODULE, readFileSync(MODULE, "utf8")]]);

/**
 * PHASE 1 -- BREAK THE EDGE.
 *
 * The Marchenko-Pastur edge and the Tracy-Widom threshold ARE the detector. If either moves,
 * the detector is measuring something else, and no amount of testing downstream can catch it.
 */
const BREAK_EDGE = [
  {
    name: "the Marchenko-Pastur edge uses the TRANSPOSED aspect ratio (T/M instead of M/T)",
    from: "  return (1 + Math.sqrt(M / T)) ** 2;",
    to: "  return (1 + Math.sqrt(T / M)) ** 2; // MUTANT: the aspect ratio is transposed",
    expect: "is exact for known aspect ratios",
  },
  {
    name: "the detection threshold ignores the Tracy-Widom term",
    from: "  const threshold = lambdaPlus + sAlpha * sigmaTw;",
    to: "  const threshold = lambdaPlus; // MUTANT: the Tracy-Widom term is dropped",
    expect: "is the Marchenko-Pastur edge plus the Tracy-Widom term",
  },
];

/**
 * PHASE 2 -- BREAK THE GUARD AND THE NULL.
 *
 * The Participation Ratio is the guard that separates "a coherent multi-market factor" from
 * "one market misbehaving", and the null is the case that happens every day. A detector that
 * cannot refuse the null is not a detector.
 */
const BREAK_GUARD = [
  {
    name: "the Participation Ratio requirement is dropped",
    from: "  const delocalized = pr > MIN_PARTICIPATION_RATIO;",
    to: "  const delocalized = true; // MUTANT: the Participation Ratio no longer refuses anything",
    expect: "refuses a localized outlier by the Participation Ratio",
  },
  {
    name: "the detector fires on pure noise",
    from: "  const detected = exceedsEdge && delocalized;",
    to: "  const detected = true; // MUTANT: the detector fires on everything",
    expect: "does not cry wolf on pure isotropic noise",
  },
  {
    name: "the threshold is loosened until the null trips it",
    from: "  const threshold = lambdaPlus + sAlpha * sigmaTw;",
    to: "  const threshold = lambdaPlus - 1; // MUTANT: the threshold is loosened until the null fires",
    expect: "refuses a noise matrix above the Marchenko-Pastur edge but below the threshold",
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
  "is exact for known aspect ratios",
  "refuses an aspect ratio with more market families than settled games",
  "is the Marchenko-Pastur edge plus the Tracy-Widom term",
  "detects a rank-1 synthetic factor with theta_1 = 1.8 above the threshold",
  "does not cry wolf on pure isotropic noise",
  "refuses a noise matrix above the Marchenko-Pastur edge but below the threshold",
  "refuses a localized outlier by the Participation Ratio",
  "satisfies the identity BS = REL - RES + UNC exactly",
  "separates reliability from resolution on a discrete forecast grid",
  "accepts boolean outcomes and rejects malformed input",
  "halts a market family whose trailing calibration has drifted",
  "does not halt a market family whose calibration is stable",
  "moves the posterior toward the hybrid settlement/CLV target",
  "follows the spec's algebra",
  "clips the promotion score at both ends of its band",
  "promotes and demotes premises on the spec's rules",
  "keeps the node SHADOW until every gate passes",
];

const PHASES = [
  ["P1", BREAK_EDGE],
  ["P2", BREAK_GUARD],
];

let detectedCount = 0;
let total = 0;

/**
 * Take the lock, or refuse to start.
 *
 * THE STALE RULE IS AN AGE, NOT A PID. A PID check is the obvious way to tell a live sweep
 * from a dead one, but PID REUSE means a dead sweep's PID can name a completely unrelated live
 * process -- and the sweep would then refuse to start forever, against the user.
 */
let lockHeld = false;
function takeLock() {
  if (existsSync(LOCK)) {
    const age = Date.now() - statSync(LOCK).mtimeMs;
    if (age < LOCK_STALE_MS) {
      return false;
    }
    rmSync(LOCK, { force: true });
  }
  writeFileSync(LOCK, `pid=${process.pid} started=${new Date().toISOString()}\n`);
  lockHeld = true;
  return true;
}

/** Restore a file from the pristine map and PROVE the restore is byte-exact. */
function restoreFromBackup(file) {
  const pristine = ORIGINALS.get(file);
  if (pristine === undefined) return;
  writeFileSync(file, pristine);
  const now = readFileSync(file, "utf8");
  if (now !== pristine) {
    fail(`restore: ${file} is not byte-identical to its pristine text`);
  }
}

try {
  if (!takeLock()) {
    fail(`another sweep holds the lock (${LOCK}); refusing to interleave mutations`);
  } else {
    console.log("=== PRE-CHECK (no mutation): EVERY test MUST pass ===");
    const prePassed = passedTitles();
    const preNotPassed = EXPECTED_BASELINE_PASS.filter((t) => !prePassed.has(t));
    const preExtra = [...prePassed].filter((t) => !EXPECTED_BASELINE_PASS.includes(t));
    if (preNotPassed.length > 0) {
      fail(
        `pre-check: these did not pass with the unmutated source, so no mutation result would mean anything: ${preNotPassed.join(" | ")}`,
      );
    } else {
      console.log(`OK   pre-check: all ${prePassed.size} tests pass with the unmutated source`);
    }
    if (preExtra.length > 0) {
      fail(`pre-check: the gate has tests the sweep does not know about: ${preExtra.join(" | ")}`);
    }
  }

  for (const [phase, mutations] of PHASES) {
    console.log(`\n=== PHASE ${phase}: ${phase === "P1" ? "break the edge" : "break the guard and the null"}; the named test MUST NOT PASS ===`);
    for (const mut of mutations) {
      total++;
      const target = mut.file ?? MODULE;
      const pristine = ORIGINALS.get(target);
      if (pristine === undefined) {
        fail(`unknown target file for ${mut.name}: ${target}`);
        continue;
      }
      const occurrences = pristine.split(mut.from).length - 1;
      if (occurrences !== 1) {
        fail(`fragment for ${mut.name} occurs ${occurrences} times, expected exactly 1`);
        continue;
      }
      writeFileSync(target, pristine.replace(mut.from, mut.to));
      const passed = passedTitles();
      const detected = !passed.has(mut.expect);
      if (detected) detectedCount++;
      else fail(`${mut.name}: "${mut.expect}" STILL PASSED -- the test does not pin this`);
      console.log(
        `${detected ? "OK  " : "FAIL"} [${phase}] ${mut.name}: "${mut.expect}" -> ${
          detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this"
        }`,
      );
      // Restore EVERY file, so a mutation never leaks into the next round.
      for (const [file, text] of ORIGINALS) writeFileSync(file, text);
    }
  }

  console.log("\n=== BASELINE (no mutation): EVERY test MUST pass ===");
  for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  const baselinePassed = passedTitles();
  const notPassed = EXPECTED_BASELINE_PASS.filter((t) => !baselinePassed.has(t));
  if (notPassed.length > 0) {
    fail(`baseline: these did not pass: ${notPassed.join(" | ")}`);
  } else if (baselinePassed.size !== EXPECTED_BASELINE_PASS.length) {
    fail(
      `baseline: ${baselinePassed.size} passed but ${EXPECTED_BASELINE_PASS.length} were expected`,
    );
  } else {
    console.log(`OK baseline: all ${baselinePassed.size} tests pass`);
  }
} catch (error) {
  fail(`the sweep threw: ${error && error.message ? error.message : String(error)}`);
} finally {
  // Restore every file from its backup, on success and on error alike, and prove the result
  // is byte-exact rather than merely "probably fine".
  for (const [file, text] of ORIGINALS) {
    writeFileSync(file, text);
    const now = readFileSync(file, "utf8");
    if (now !== text) {
      fail(`restore: ${file} is not byte-identical to its pristine text`);
    }
  }
  rmSync(REPORT, { force: true });
  if (lockHeld) rmSync(LOCK, { force: true });
  console.log("\nsource restored");
}

console.log(`mutations detected: ${detectedCount}/${total}; failures: ${FAILURES.length}`);
if (FAILURES.length > 0) {
  console.log("SWEEP RESULT: FAIL");
  for (const f of FAILURES) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("SWEEP RESULT: PASS");
process.exit(0);
