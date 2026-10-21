/**
 * MUTATION SWEEP for the T6 gate -- the adversary red-team interception.
 *
 * THE QUESTION. The T6 gate (test/adversary-red-team.t6.spec.ts) passes. A passing gate
 * is not evidence that the gate pins what it claims. The audit rule is: a test that
 * passes for the wrong reason reports a guarantee the code does not provide.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. T6 is a set of FIVE CUT-OFFS, and the spec's
 * line is not symmetric:
 *
 *     point E-value   <  1.35     a floor:  1.35 itself PASSES
 *     CI E-value      <  1.10     a floor:  1.10 itself PASSES
 *     placebo leak    >  0.005    a ceiling: 0.005 itself PASSES
 *     entity-swap     >= 0.02     a limit:  0.02 itself FAILS
 *     CausalPhys RA   <  0.85     a floor:  0.85 itself PASSES
 *
 * So the interesting failures are not "the gate blocks a bad chain" -- they are:
 *
 *   - the gate's cut-off MOVES (a threshold is 0.5, or 2.0, or off by a hair);
 *   - the gate's cut-off moves in the DIRECTION that matters: `<` becomes `<=`, or `>=`
 *     becomes `>`, so a chain sitting EXACTLY ON the boundary is admitted or refused
 *     differently from the spec's wording. A gate that is one comparison operator away
 *     from the spec is a gate that lets a chain at the limit publish itself;
 *   - the gate reports only the FIRST criterion that fired, so a caller cannot tell how
 *     far from publishable the chain is;
 *   - an UNMEASURED criterion is treated as a pass -- the failure mode this repository
 *     cares about most, because "an unmeasured robustness is not a robustness that
 *     passed";
 *   - the E-value is no longer DERIVED from the arms by the shared machinery, or the
 *     explicit measurement no longer wins over the derived one;
 *   - the gate's E-value floor is a PRIVATE COPY rather than the engine-wide constant
 *     the rest of the engine enforces, so the two can drift apart silently.
 *
 * THE PHASES.
 *   Phase 1 -- MOVE A CUT-OFF. Change a threshold; the named boundary test must fail.
 *   Phase 2 -- FLIP A COMPARISON. Turn `<` into `<=` (or `>=` into `>`); the named
 *              boundary test must fail. This is the phase that pins the boundary itself.
 *   Phase 3 -- BREAK THE VERDICT. Report one criterion instead of all, drop the reasons,
 *              treat an unmeasured criterion as a pass, kill the derivation, or let the
 *              derived value override the explicit one; the named test must fail.
 *   Phase 4 -- BREAK THE WIRING. Re-point the T6 module's E-value floors at the WRONG
 *              shared constant; the named test must fail. This is what proves the T6
 *              floor is WIRED to the engine-wide constant and is not a private copy.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a failed test
 * as `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which
 * is how the FCI sweep's first version reported "NOT PINNED" for every rule while every
 * test was in fact pinned. Detection is "the named test did not PASS", which covers an
 * assertion failure, a crash, and a test that never ran.
 *
 * ---------------------------------------------------------------------------
 * THIS SWEEP MUTATES THE WORKING TREE, SO IT IS BUILT NOT TO LIE AND NOT TO
 * LEAVE A MESS.
 * ---------------------------------------------------------------------------
 *
 * 1. IT IS FAIL-CLOSED. Every failure -- an undetected mutation, a mutation whose
 *    fragment no longer matches the source, a red baseline, a restore that is not
 *    byte-exact -- is pushed onto FAILURES, and the exit code is derived from
 *    FAILURES.length and from nothing else. A sweep that prints failures and exits 0
 *    is a gate that reports a false signal, which is worse than no gate at all.
 *
 * 2. IT REFUSES TO RUN AGAINST A RED BASELINE. If the unmutated suite is not green,
 *    every "detection" below is meaningless -- the named test may already be failing
 *    for an unrelated reason, so a mutation would look "detected" when it changed
 *    nothing. So the sweep ABORTS before touching anything, and says so. This is not
 *    a nicety: a previous version of this sweep ran against a tree that still carried
 *    a mutation from an interrupted run, and reported "12/18 detected" with a red
 *    baseline -- numbers that describe nothing.
 *
 * 3. IT CANNOT LEAVE A MUTATION IN THE TREE. Every file is backed up before it is
 *    mutated, the backup is restored in a `finally` and on SIGINT/SIGTERM, and a
 *    backup left over by a KILLED run is recovered on the next start. The final step
 *    re-reads every file and compares it byte for byte against the pristine text, and
 *    a mismatch is a failure.
 *
 * 4. ONLY ONE SWEEP AT A TIME. A lock file makes a second concurrent run refuse to
 *    start rather than interleave its writes with this one's. Two mutators
 *    interleaving on the same files is how a mutation gets left behind: each restores
 *    the snapshot IT took, which may already contain the other's mutation.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, openSync, closeSync } from "node:fs";

const GATE = "src/causal/adversary-red-team.ts";
const TESTS = ["test/adversary-red-team.t6.spec.ts"];
const VITEST = "../../node_modules/vitest/vitest.mjs";
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t6_sweep_report.json";
const LOCK = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t6_sweep.lock";

/**
 * THE FILES THIS SWEEP IS ALLOWED TO TOUCH.
 *
 * ONLY the T6 module. Not hcid-mediator-expansion.ts, even though the shared E-value
 * constants live there.
 *
 * Two reasons, and both of them are about not breaking other people's work.
 *
 *   - A sweep that mutates a file OTHER test files import creates a RACE. The package
 *     suite runs test files in parallel, so a file importing hcid-mediator-expansion.ts
 *     during the mutation window would read a drifted constant and fail for a reason
 *     that has nothing to do with what is being tested. A sweep that makes other tests
 *     flaky is not a gate.
 *   - A sweep that WRITES a file it does not own can clobber a concurrent edit to it.
 *     The restore step writes the file back byte for byte, and if someone changed it
 *     legitimately in the meantime, that change is destroyed.
 *
 * The T6 module is imported by exactly one spec file -- the gate -- so mutating it is
 * safe. The wiring to the shared constants is proved in PHASE 4 by re-pointing the
 * IMPORT inside the T6 module, which is a property of the T6 module alone.
 */
const MUTABLE_FILES = [GATE];

/** The backup suffix that makes a killed run recoverable. */
const BACKUP_SUFFIX = ".t6-sweepbak";

/**
 * THE FILE'S LINE ENDING, so a mutation can be applied and undone EXACTLY.
 *
 * The repo mandates LF (`.gitattributes`: `* text=auto eol=lf`), but a Windows
 * checkout with `core.autocrlf=true` can still deliver CRLF, and a fragment written
 * with a bare newline then matches nothing -- which the sweep reports as "the fragment
 * occurs 0 times". A sweep that fails on a CRLF checkout is a sweep that fails for a
 * reason that has nothing to do with the code under test.
 *
 * So: the fragment is matched against the file's ACTUAL line ending, and the file is
 * written back with the ending it already had. The mutation is still exact, and the
 * byte-for-byte restore check still holds.
 */
function fileEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/** Rewrite a fragment's line endings to the file's own. */
function withEol(fragment, eol) {
  return eol === "\n" ? fragment : fragment.replace(/\n/g, "\r\n");
}

/**
 * EVERY FAILURE, IN ONE PLACE.
 *
 * The exit code is derived from this array and from nothing else, so there is no path
 * by which this sweep can report a failure and still exit 0.
 */
const FAILURES = [];

/** Record a failure. Every failure path in this file goes through here. */
function fail(message) {
  FAILURES.push(message);
  console.log(`FAIL ${message}`);
}

/**
 * Recover a mutation left behind by a KILLED run.
 *
 * If a previous sweep was killed between "mutate" and "restore", the tree still carries
 * the mutation and every number this sweep reports would be about a corrupted source.
 * The backup file is the way back.
 */
function recoverFromBackup(file) {
  const backup = file + BACKUP_SUFFIX;
  let backupText = null;
  try {
    backupText = readFileSync(backup, "utf8");
  } catch {
    return false;
  }
  writeFileSync(file, backupText);
  rmSync(backup, { force: true });
  console.log(`RECOVERED ${file} from a backup left by an interrupted run`);
  return true;
}

/** Back a file up before it is mutated, so a kill is recoverable. */
function backUp(file, text) {
  writeFileSync(file + BACKUP_SUFFIX, text);
}

/** Restore a file from its backup and drop the backup. */
function restoreFromBackup(file) {
  const backup = file + BACKUP_SUFFIX;
  try {
    writeFileSync(file, readFileSync(backup, "utf8"));
  } catch {
    /* no backup: the file was never mutated */
  }
  rmSync(backup, { force: true });
}

/**
 * The pristine text of EVERY file a mutation may touch.
 *
 * A mutation names its own target with `file` (defaulting to the gate). Each is restored
 * from this map, not from a single global snapshot, so a mutation to the SHARED
 * constant file cannot be undone by restoring the gate -- and, more importantly, so a
 * mutation to the gate is restored exactly, with no residue from the previous round.
 */
const ORIGINALS = new Map();

// ---------------------------------------------------------------------------
// PHASE 1: move a cut-off. The named boundary test must not pass.
// ---------------------------------------------------------------------------
const MOVE = [
  {
    name: "the point E-value floor is moved",
    from: "export const MIN_POINT_E_VALUE = MIN_EXPANSION_E_VALUE;",
    to: "export const MIN_POINT_E_VALUE = 0.5; // MUTANT: the point E-value floor is moved",
    expect: "the point E-value cut-off is exact: 1.35 passes, 1.3499 is refused",
  },
  {
    name: "the CI E-value floor is moved",
    from: "export const MIN_CI_E_VALUE = MIN_EXPANSION_CI_E_VALUE;",
    to: "export const MIN_CI_E_VALUE = 0.5; // MUTANT: the CI E-value floor is moved",
    expect: "the CI E-value cut-off is exact: 1.1 passes, 1.0999 is refused",
  },
  {
    name: "the placebo ceiling is moved",
    from: "export const MAX_PLACEBO_LEAK = 0.005;",
    to: "export const MAX_PLACEBO_LEAK = 0.5; // MUTANT: the placebo ceiling is moved",
    expect: "the placebo cut-off is exact: 0.005 passes, 0.0051 is refused",
  },
  {
    name: "the entity-swap limit is moved",
    from: "export const MAX_ENTITY_SWAP_DIVERGENCE = 0.02;",
    to: "export const MAX_ENTITY_SWAP_DIVERGENCE = 0.5; // MUTANT: the entity-swap limit is moved",
    expect: "the entity-swap cut-off is exact: 0.02 is refused, 0.0199 passes",
  },
  {
    name: "the CausalPhys RA floor is moved",
    from: "export const MIN_CAUSALPHYS_RA = 0.85;",
    to: "export const MIN_CAUSALPHYS_RA = 0.5; // MUTANT: the CausalPhys RA floor is moved",
    expect: "the CausalPhys RA cut-off is exact: 0.85 passes, 0.8499 is refused",
  },
];

// ---------------------------------------------------------------------------
// PHASE 2: flip a comparison. The named boundary test must not pass.
//
// THIS IS THE PHASE THAT PINS THE CUT-OFF. Moving a threshold by half an order of
// magnitude is a gross error any boundary test catches. Flipping `<` to `<=` is a
// one-character error that admits a chain sitting exactly on the floor -- and it is
// invisible to a test that only asserts "a bad chain is refused".
// ---------------------------------------------------------------------------
const FLIP = [
  {
    name: "the point E-value floor becomes inclusive",
    from: "pointEValue < MIN_POINT_E_VALUE;",
    to: "pointEValue <= MIN_POINT_E_VALUE; // MUTANT: the floor now refuses the value AT the floor",
    expect: "the point E-value cut-off is exact: 1.35 passes, 1.3499 is refused",
  },
  {
    name: "the CI E-value floor becomes inclusive",
    from: "ciEValue < MIN_CI_E_VALUE;",
    to: "ciEValue <= MIN_CI_E_VALUE; // MUTANT: the floor now refuses the value AT the floor",
    expect: "the CI E-value cut-off is exact: 1.1 passes, 1.0999 is refused",
  },
  {
    name: "the placebo ceiling becomes inclusive",
    from: "placeboLeak > MAX_PLACEBO_LEAK;",
    to: "placeboLeak >= MAX_PLACEBO_LEAK; // MUTANT: the ceiling now refuses the value AT the ceiling",
    expect: "the placebo cut-off is exact: 0.005 passes, 0.0051 is refused",
  },
  {
    name: "the entity-swap limit becomes exclusive",
    from: "entitySwapDivergence >= MAX_ENTITY_SWAP_DIVERGENCE;",
    to: "entitySwapDivergence > MAX_ENTITY_SWAP_DIVERGENCE; // MUTANT: the limit now admits the value AT the limit",
    expect: "the entity-swap cut-off is exact: 0.02 is refused, 0.0199 passes",
  },
  {
    name: "the CausalPhys RA floor becomes inclusive",
    from: "causalPhysRa < MIN_CAUSALPHYS_RA;",
    to: "causalPhysRa <= MIN_CAUSALPHYS_RA; // MUTANT: the floor now refuses the value AT the floor",
    expect: "the CausalPhys RA cut-off is exact: 0.85 passes, 0.8499 is refused",
  },
];

// ---------------------------------------------------------------------------
// PHASE 3: break the shape of the verdict. The named test must not pass.
// ---------------------------------------------------------------------------
const BREAK = [
  {
    name: "only the FIRST fired criterion is reported",
    from: "    reasons,\n    measurements,\n    criteria,\n  };",
    to: "    reasons,\n    measurements,\n    criteria: criteria.slice(0, 1), // MUTANT: only the first criterion is reported\n  };",
    expect: "every fired criterion is reported, not just the first",
  },
  {
    name: "the reasons are dropped from the verdict",
    from: "  const reasons = criteria.map((c) => c.reason);",
    to: "  const reasons: string[] = []; // MUTANT: the reasons are dropped",
    expect: "an unmeasured criterion is refused, not passed",
  },
  {
    name: "an UNMEASURED criterion is treated as a pass",
    from: "  const pointEValueMissing = pointEValue === null;",
    to: "  const pointEValueMissing = false; // MUTANT: an unmeasured criterion passes",
    expect: "an unmeasured criterion is refused, not passed",
  },
  {
    name: "the E-values are never derived from the arms",
    from: "      ? measureChainEValues(input.treatedSamples, input.controlSamples)",
    to: "      ? { pointEValue: null, ciEValue: null } // MUTANT: the arms are never measured",
    expect: "the E-values are derived from the arms with the shared machinery",
  },
  {
    name: "the DERIVED E-value overrides the EXPLICIT one",
    from: "  const pointEValue = input.pointEValue ?? derived.pointEValue;",
    to: "  const pointEValue = derived.pointEValue ?? input.pointEValue; // MUTANT: the derived value wins",
    expect: "an explicit E-value wins over the derived one",
  },
  {
    name: "the below-floor refusal code is mislabelled",
    from: "            T6_REFUSAL.pointEValueBelowFloor,",
    to: "            T6_REFUSAL.pointEValueUnmeasured, // MUTANT: the refusal code is mislabelled",
    expect: "the point E-value cut-off is exact: 1.35 passes, 1.3499 is refused",
  },
];

// ---------------------------------------------------------------------------
// PHASE 4: break the WIRING to the engine-wide constants.
//
// The T6 floors must be the SAME numbers the rest of the engine enforces
// (MIN_EXPANSION_E_VALUE and MIN_EXPANSION_CI_E_VALUE in
// hcid-mediator-expansion.ts), not private copies. A private copy is a second number
// in this repository that can drift away from the first without anybody noticing.
//
// THE MUTATION IS ON THE T6 MODULE, NOT ON THE SHARED FILE, and that is deliberate.
// These two mutations re-point T6's floors at the WRONG shared constant, which the
// "the thresholds are the spec's numbers and the shared constants" test must catch
// (1.35 is not 1.10, and 1.10 is not 1.35).
//
// Why not mutate hcid-mediator-expansion.ts itself, which would prove the wiring even
// more directly? Because a sweep that mutates a file OTHER test files import creates a
// race: the package suite runs test files in parallel, and a second file importing
// hcid-mediator-expansion.ts during the mutation window would read a drifted constant
// and fail for a reason that has nothing to do with what is being tested. A sweep that
// makes other tests flaky is not a gate. The T6 module is imported by exactly one spec
// file -- this one -- so mutating it is safe.
// ---------------------------------------------------------------------------
const DRIFT = [
  {
    name: "the point E-value floor is wired to the WRONG shared constant",
    from: "  MIN_EXPANSION_E_VALUE,\n  MIN_EXPANSION_CI_E_VALUE,\n} from \"./hcid-mediator-expansion.js\";",
    to: "  MIN_EXPANSION_CI_E_VALUE as MIN_EXPANSION_E_VALUE,\n  MIN_EXPANSION_CI_E_VALUE,\n} from \"./hcid-mediator-expansion.js\"; // MUTANT: the point floor is wired to the wrong shared constant",
    expect: "the thresholds are the spec's numbers and the shared constants",
  },
  {
    name: "the CI E-value floor is wired to the WRONG shared constant",
    from: "  MIN_EXPANSION_E_VALUE,\n  MIN_EXPANSION_CI_E_VALUE,\n} from \"./hcid-mediator-expansion.js\";",
    to: "  MIN_EXPANSION_E_VALUE,\n  MIN_EXPANSION_E_VALUE as MIN_EXPANSION_CI_E_VALUE,\n} from \"./hcid-mediator-expansion.js\"; // MUTANT: the CI floor is wired to the wrong shared constant",
    expect: "the thresholds are the spec's numbers and the shared constants",
  },
];

/**
 * Run the suite and return the set of PASSED test titles.
 *
 * THE PASS SET, NOT THE FAILED SET: a mutation is DETECTED when the named test did not
 * PASS, which covers an assertion failure, a crash, and a test that never ran.
 *
 * T6_SWEEP_CHILD is set so the gate's own "run the sweep" test does not recurse when
 * the sweep runs the gate.
 */
function passedTitles() {
  rmSync(REPORT, { force: true });
  try {
    execFileSync("node", [VITEST, "run", "--reporter=json", `--outputFile=${REPORT}`, ...TESTS], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, T6_SWEEP_CHILD: "1" },
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
  "a chain that clears every criterion is NOT blocked",
  "the point E-value cut-off is exact: 1.35 passes, 1.3499 is refused",
  "the CI E-value cut-off is exact: 1.1 passes, 1.0999 is refused",
  "the placebo cut-off is exact: 0.005 passes, 0.0051 is refused",
  "the entity-swap cut-off is exact: 0.02 is refused, 0.0199 passes",
  "the CausalPhys RA cut-off is exact: 0.85 passes, 0.8499 is refused",
  "every fired criterion is reported, not just the first",
  "an unmeasured criterion is refused, not passed",
  "the E-values are derived from the arms with the shared machinery",
  "an explicit E-value wins over the derived one",
  "the thresholds are the spec's numbers and the shared constants",
  "the sweep is fail-closed -- a failure makes it exit non-zero",
];

const PHASES = [
  ["P1", MOVE],
  ["P2", FLIP],
  ["P3", BREAK],
  ["P4", DRIFT],
];

let detectedCount = 0;
let total = 0;

/**
 * Take the lock, or refuse to start. Two mutators must not interleave.
 *
 * THE STALE RULE IS AN AGE, NOT A PID. A PID check is the obvious way to tell a live
 * sweep from a dead one, but PID REUSE means a dead sweep's PID can name a completely
 * unrelated live process -- and the sweep then refuses to start forever, against a
 * lock nobody owns. So the lock carries the owner's PID AND the time it was taken,
 * and a lock is stale when it is OLDER THAN THE STALE AFTER SECONDS. A live sweep
 * finishes its rounds in well under that; a killed one is recovered on the next run.
 */
const LOCK_STALE_AFTER_MS = 15 * 60 * 1000;

function takeLock() {
  const acquire = () => {
    const fd = openSync(LOCK, "wx");
    writeFileSync(LOCK, JSON.stringify({ pid: process.pid, at: Date.now() }));
    closeSync(fd);
  };
  try {
    acquire();
    return true;
  } catch {
    // A lock exists. If its owner is gone, or it is simply too old, it is stale.
    let info = null;
    try {
      info = JSON.parse(readFileSync(LOCK, "utf8"));
    } catch {
      info = null;
    }
    const age = info && typeof info.at === "number" ? Date.now() - info.at : Infinity;
    if (info && info.pid !== process.pid && age < LOCK_STALE_AFTER_MS) {
      // Try the PID as well, but only to CONFIRM a live owner. A PID that names a live
      // process is not proof of ownership (PIDs are reused), so age is the real rule.
      let alive = false;
      try {
        process.kill(info.pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
      if (alive) return false; // the owner is alive and the lock is fresh
    }
    rmSync(LOCK, { force: true });
    acquire();
    console.log("RECOVERED a stale sweep lock from a killed run");
    return true;
  }
}

let lockHeld = false;

try {
  if (!takeLock()) {
    console.log("FAIL another T6 sweep is already running against this tree; refusing to start");
    process.exit(1);
  }
  lockHeld = true;

  // ---- recover a mutation left behind by a KILLED run --------------------
  for (const file of MUTABLE_FILES) recoverFromBackup(file);

  // ---- snapshot the pristine text of every file a mutation may touch -----
  for (const file of MUTABLE_FILES) {
    ORIGINALS.set(file, readFileSync(file, "utf8"));
  }

  // ---- PRE-CHECK: the suite is green BEFORE anything is mutated ----------
  // A red baseline makes every "detection" below meaningless, so the sweep
  // refuses to run against one.
  console.log("=== PRE-CHECK: the unmutated suite must be green ===");
  const prePassed = passedTitles();
  const preNotPassed = EXPECTED_BASELINE_PASS.filter((t) => !prePassed.has(t));
  const preExtra = [...prePassed].filter((t) => !EXPECTED_BASELINE_PASS.includes(t));
  if (preNotPassed.length > 0) {
    fail(
      `pre-check: these did not pass with the unmutated source, so no mutation result would mean anything: ${preNotPassed.join(" | ")}`,
    );
  } else {
    console.log(
      `OK   pre-check: all ${prePassed.size} tests pass with the unmutated source`,
    );
  }
  if (preExtra.length > 0) {
    fail(
      `pre-check: the suite reports tests this sweep does not know about: ${preExtra.join(" | ")}`,
    );
  }

  if (FAILURES.length === 0) {
    for (const [phase, mutations] of PHASES) {
      console.log(`\n=== PHASE ${phase}: the named test MUST NOT PASS ===`);
      for (const mut of mutations) {
        total++;
        const target = mut.file ?? GATE;
        const pristine = ORIGINALS.get(target);
        if (pristine === undefined) {
          fail(`unknown target file for ${mut.name}: ${target}`);
          continue;
        }
        // The fragment is matched against the file's ACTUAL line ending, so a CRLF
        // checkout does not turn every multi-line fragment into "0 occurrences".
        const eol = fileEol(pristine);
        const from = withEol(mut.from, eol);
        const to = withEol(mut.to, eol);
        const occurrences = pristine.split(from).length - 1;
        if (occurrences !== 1) {
          fail(
            `the fragment for ${mut.name} occurs ${occurrences} times in ${target}, expected exactly 1 -- the mutation cannot be applied`,
          );
          continue;
        }
        backUp(target, pristine);
        writeFileSync(target, pristine.replace(from, to));
        const passed = passedTitles();
        const detected = !passed.has(mut.expect);
        if (detected) {
          detectedCount++;
          console.log(
            `OK   [${phase}] ${mut.name}: "${mut.expect}" -> did not pass, as required`,
          );
        } else {
          fail(
            `[${phase}] ${mut.name}: "${mut.expect}" STILL PASSED -- the test does not pin this`,
          );
        }
        // Restore EVERY file, so a mutation never leaks into the next round.
        for (const file of MUTABLE_FILES) restoreFromBackup(file);
        for (const [file, text] of ORIGINALS) writeFileSync(file, text);
      }
    }
  } else {
    console.log(
      "\n=== PHASES SKIPPED: the pre-check was red, so no mutation result would mean anything ===",
    );
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
  // Restore every file from its backup, on success and on error alike, and prove the
  // result is byte-exact rather than merely "probably fine".
  for (const file of MUTABLE_FILES) restoreFromBackup(file);
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
