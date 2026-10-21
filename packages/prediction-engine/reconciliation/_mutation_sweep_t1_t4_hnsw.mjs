/**
 * MUTATION SWEEP for the T1/T4 gate -- the literature bridge's proportional content-driven
 * delta and its class-A guard.
 *
 * THE QUESTION. The gate (test/arxiv-hnsw-bridge.t1t4.spec.ts) passes. A passing gate is not
 * evidence that the gate pins what it claims. The audit rule is: a test that passes for the
 * wrong reason reports a guarantee the code does not provide.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. The T1 probe is a COMPARISON -- the same premise
 * with one number changed -- so the interesting failures are not "the delta came out slightly
 * different". They are:
 *
 *   - the delta is NOT proportional to the in-quote claim (a fixed or clipped constant, or a
 *     non-linear function of the claim), so the engine's number is a decoration that happens
 *     to be nonzero;
 *   - the opposing-claim DEADBAND is not enforced, so a field whose premises contradict each
 *     other publishes a confident-looking average nobody believes;
 *   - the FIELD CLAMP is not applied, so a runaway delta escapes the band the spec set for it;
 *   - the audit prose carries a HARDCODED legacy string, so the reader is shown fair-odds and
 *     correlation numbers that no premise produced;
 *   - the EMPTY CORPUS publishes a delta, so the engine has a number with no literature
 *     behind it -- the exact failure the spec's critique names;
 *   - the CLASS-A ADMISSION gate is removed, so a premise whose quote is in no document at all
 *     can mint a literature finding.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a failed test as
 * `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which is how
 * the FCI sweep's first version reported "NOT PINNED" for every rule while every test was in
 * fact pinned. Detection is "the named test did not PASS", which covers an assertion failure,
 * a crash, and a test that never ran.
 *
 * THE FOUR THINGS THAT MAKE THIS SWEEP HONEST, and the incident each one prevents:
 *
 *   1. ONE FAILURE ARRAY DRIVES THE EXIT CODE. A counter incremented in one branch misses
 *      the branches that were not updated with it, and a sweep that reports failures and
 *      exits 0 is worse than no sweep: it is a gate that reports a false signal.
 *   2. A RED BASELINE ABORTS THE SWEEP. If the unmutated suite is not green, every
 *      "detection" is meaningless -- the named test may already be failing for an unrelated
 *      reason. So the baseline is checked FIRST, before anything is mutated, and a red
 *      baseline means the mutation phases are skipped entirely.
 *   3. EVERY MUTATED FILE IS BACKED UP AND RESTORED IN `finally`. A killed run otherwise
 *      leaves the mutation in the tree forever. A leftover backup from a killed run is
 *      recovered at startup, so a crash cannot poison the next run.
 *   4. THE TREE IS LOCKED BY A FILE WHOSE STALENESS IS MEASURED BY AGE. Two mutators
 *      interleaving is how a mutation gets left behind. Age, not PID: PIDs get reused, and a
 *      PID check then blocks forever against a lock nobody owns.
 *
 * Reproduce, from packages/prediction-engine:
 *   node reconciliation/_mutation_sweep_t1_t4_hnsw.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The package root, derived from this file's own location so the sweep runs from any cwd. */
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The module the T1/T4 gate is about. */
const MODULE = "src/literature/arxiv-hnsw-bridge.ts";

/** The gate that must stop passing. */
const GATE = "test/arxiv-hnsw-bridge.t1t4.spec.ts";

/** Vitest, from the workspace root's node_modules. */
const VITEST = resolve(PKG, "..", "..", "node_modules", "vitest", "vitest.mjs");

/** Where the JSON report lands. */
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t1t4_hnsw_sweep_report.json";

/** The lock file, so two sweeps cannot interleave their mutations. */
const LOCK = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t1t4_hnsw_sweep.lock";

/** A lock older than this is stale, however old its PID is. */
const LOCK_STALE_MS = 30 * 60 * 1000;

/** Where the pristine copies of the mutated files live while the sweep runs. */
const BACKUP_DIR = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t1t4_hnsw_backup";

/**
 * The files this sweep may mutate.
 *
 * A mutation names its own target with `file` (defaulting to the module). Each is restored
 * from its OWN pristine text, not from a single global snapshot, so a mutation to one file
 * cannot be undone by restoring another -- and, more importantly, so each mutation is
 * restored exactly, with no residue from the previous round.
 */
const TARGETS = [MODULE, GATE];

/**
 * The mutations.
 *
 * `from` must occur EXACTLY ONCE in the pristine file, and the file is checked for that
 * before the mutation is applied: a fragment that occurs twice would make the sweep mutate
 * an arbitrary one of the two, and the result would be a coin toss rather than a fact.
 *
 * `expect` is the NAME of a test in the gate. The mutation is DETECTED when that test did not
 * pass.
 */
const MUTATIONS = [
  {
    name: "the delta is quadratic in the claim instead of linear",
    from: "const rawDelta = sign * magnitude * deltaX;",
    to: "const rawDelta = sign * magnitude * magnitude * deltaX; // MUTANT: the delta is quadratic in the claim",
    expect: "T1: the total delta scales exactly 2.000000x with the in-quote numeric claim",
  },
  {
    name: "the opposing-claim deadband is not enforced",
    from: "consensusRatio >= MIN_CONSENSUS_RATIO && Math.abs(barDelta) >= MIN_APPLIED_MAGNITUDE;",
    to: "true && Math.abs(barDelta) >= MIN_APPLIED_MAGNITUDE; // MUTANT: the deadband is gone",
    expect: "T1: opposing claims below the consensus deadband are neutralized to zero",
  },
  {
    name: "the field clamp is not applied",
    from: "const finalDelta = published ? clampFieldDelta(barDelta) : 0;",
    to: "const finalDelta = published ? barDelta : 0; // MUTANT: the field clamp is gone",
    expect: "T1: a delta beyond the field clamp is saturated at the clamp bound",
  },
  {
    name: "the audit prose carries a hardcoded legacy string",
    from: "const appliedText = formatDelta(record.applied_delta);",
    to: 'const appliedText = "+395 fair odds"; // MUTANT: the prose carries a hardcoded legacy string',
    expect: "T1: the rendered audit prose carries no legacy hardcoded strings",
  },
  {
    name: "the empty corpus publishes a delta",
    from: "if (corpus.length === 0) return emptyEvaluation();",
    to: 'if (corpus.length === 0) return { total_delta: 0.5, adjustments: [], rendered_prose: "", audit_trail: [] }; // MUTANT: the empty corpus publishes a delta',
    expect: "T4: an empty corpus publishes a zero total delta, an empty audit trail and empty prose",
  },
  {
    name: "an inert mutation that no test can possibly detect",
    from: "const finalDelta = published ? clampFieldDelta(barDelta) : 0;",
    to: "const finalDelta = published ? clampFieldDelta(barDelta) : 0; // MUTANT: inert, changes nothing",
    expect: "T1: a delta beyond the field clamp is saturated at the clamp bound",
  },
  {
    name: "the class-A admission gate is removed",
    from: "return row.record_class === CITABLE_CLASS && row.status === ACTIVE_STATUS;",
    to: "return true; // MUTANT: the class-A admission gate is gone",
    expect: "T4: the bridge refuses HONESTLY_UNCITED_PRIOR and DERIVED_MARKET_SYNTHESIS rows",
  },
];

/** Every test title in the gate, verbatim. The baseline requires ALL of them. */
const EXPECTED_BASELINE_PASS = [
  "T1: the total delta scales exactly 2.000000x with the in-quote numeric claim",
  "T1: the rendered audit prose reports the computed delta and changes with the claim",
  "T1: the rendered audit prose carries no legacy hardcoded strings",
  "T1: a delta beyond the field clamp is saturated at the clamp bound",
  "T1: opposing claims below the consensus deadband are neutralized to zero",
  "T1: the published field total and the audit trail agree with the computed deltas",
  "T1: the module publishes the spec's thresholds and the epistemic weight table",
  "T4: an empty corpus publishes a zero total delta, an empty audit trail and empty prose",
  "T4: the empty corpus result carries no legacy hardcoded strings",
  "T4: the bridge refuses HONESTLY_UNCITED_PRIOR and DERIVED_MARKET_SYNTHESIS rows",
  "T4: the literature retrieval function filters on the citable class and the active status",
  "T4: the class-A coverage guard still exits 0 and reports zero gaps",
  "T1: the mutation sweep for T1 and T4 is present and targets this gate",
];

/**
 * THE FAILURE ARRAY. The exit code is derived from THIS and nothing else.
 *
 * A counter incremented in one branch misses the branches that were not updated with it, and
 * a sweep that reports failures and exits 0 is worse than no sweep: it is a gate that reports
 * a false signal.
 */
const FAILURES = [];

/** The pristine text of every target file, read once at startup. */
const ORIGINALS = new Map();

/** Write a target file's pristine text back. */
function restore(file) {
  const text = ORIGINALS.get(file);
  if (text !== undefined) writeFileSync(resolve(PKG, file), text);
}

/** Restore every target file. */
function restoreAll() {
  for (const file of TARGETS) restore(file);
}

/**
 * Run the gate and return the set of PASSED test titles and the set of titles that RAN.
 *
 * THE PASS SET, NOT THE FAILED SET: a mutation is DETECTED when the named test did not PASS,
 * which covers an assertion failure, a crash, and a test that never ran.
 *
 * `only` restricts the run to the tests whose title matches, which is what makes the sweep
 * affordable: the gate's class-A guard test walks the whole repository, and running that on
 * every one of the six mutation rounds would spend most of the sweep's time re-proving a
 * fact that no mutation can change. The baseline runs the WHOLE gate, so the sweep still
 * proves every test passes on the unmutated source.
 */
function runGate(only) {
  rmSync(REPORT, { force: true });
  const args = [VITEST, "run", "--reporter=json", `--outputFile=${REPORT}`];
  if (only) args.push(`--testNamePattern=${escapeRegExp(only)}`);
  args.push(GATE);
  try {
    execFileSync("node", args, { encoding: "utf8", cwd: PKG, stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    // A non-zero exit is EXPECTED for a mutation that breaks a test; the report still lands.
  }
  const report = JSON.parse(readFileSync(REPORT, "utf8"));
  const passed = new Set();
  const ran = new Set();
  for (const file of report.testResults) {
    for (const a of file.assertionResults) {
      ran.add(a.title);
      if (a.status === "passed") passed.add(a.title);
    }
  }
  return { passed, ran };
}

/** Escape a test title for use as a --testNamePattern regular expression. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * RECOVER FROM A KILLED RUN.
 *
 * A sweep that was killed mid-mutation leaves its backup behind. Restoring from that backup
 * is the only way the next run can trust its own baseline: without it, the "pristine" text
 * the sweep captures at startup would be a mutated file, and every detection would be
 * meaningless.
 */
function recoverLeftoverBackup() {
  if (!existsSync(BACKUP_DIR)) return;
  for (const file of TARGETS) {
    const backup = resolve(BACKUP_DIR, file.replace(/[\\/]/g, "__"));
    if (existsSync(backup)) {
      writeFileSync(resolve(PKG, file), readFileSync(backup, "utf8"));
      console.log(`recovered ${file} from a leftover backup`);
    }
  }
  rmSync(BACKUP_DIR, { recursive: true, force: true });
}

let lockHeld = false;

try {
  // RECOVER FIRST. A leftover backup means a previous run was killed mid-mutation.
  recoverLeftoverBackup();

  // TAKE THE LOCK, OR REFUSE TO START. Two sweeps mutating the same source at once would
  // interleave their mutations and produce results that mean nothing.
  if (existsSync(LOCK)) {
    const age = Date.now() - statSync(LOCK).mtimeMs;
    if (age < LOCK_STALE_MS) {
      console.error(`another sweep holds the lock (${LOCK}); refusing to interleave mutations`);
      process.exit(1);
    }
    rmSync(LOCK, { force: true });
  }
  writeFileSync(LOCK, `pid=${process.pid} started=${new Date().toISOString()}\n`);
  lockHeld = true;

  // CAPTURE THE PRISTINE TEXT, AND BACK IT UP TO DISK.
  mkdirSync(BACKUP_DIR, { recursive: true });
  for (const file of TARGETS) {
    const text = readFileSync(resolve(PKG, file), "utf8");
    ORIGINALS.set(file, text);
    const backup = resolve(BACKUP_DIR, file.replace(/[\\/]/g, "__"));
    writeFileSync(backup, text);
  }

  // ====================================================================
  // PHASE 0: THE BASELINE. A RED BASELINE ABORTS THE SWEEP.
  //
  // This runs BEFORE anything is mutated, and if it is not green the mutation phases are
  // SKIPPED entirely. A "detection" against a red baseline proves nothing: the named test may
  // already have been failing for an unrelated reason, and a sweep that reports those as
  // detections is a gate that reports a false signal.
  // ====================================================================
  console.log("=== PHASE 0: baseline (no mutation): EVERY test MUST pass ===");
  const { passed: baselinePassed, ran: baselineRan } = runGate();
  const baselineNotPassed = EXPECTED_BASELINE_PASS.filter((t) => !baselinePassed.has(t));
  if (baselineNotPassed.length > 0) {
    FAILURES.push(
      `baseline: these did not pass: ${baselineNotPassed.join(" | ")} -- the mutation phases are skipped, because a detection against a red baseline proves nothing`,
    );
  } else if (baselinePassed.size !== EXPECTED_BASELINE_PASS.length) {
    FAILURES.push(
      `baseline: ${baselinePassed.size} passed but ${EXPECTED_BASELINE_PASS.length} were expected`,
    );
  } else {
    console.log(`OK baseline: all ${baselinePassed.size} tests pass`);
  }
  // A test that did not RUN is not a pass, whatever the report says about the others.
  for (const title of EXPECTED_BASELINE_PASS) {
    if (!baselineRan.has(title)) {
      FAILURES.push(`baseline: "${title}" did not run at all`);
    }
  }

  // ====================================================================
  // PHASE 1: BREAK A PROPERTY; THE NAMED TEST MUST NOT PASS.
  // ====================================================================
  if (FAILURES.length === 0) {
    console.log("\n=== PHASE 1: break a property; the named test MUST NOT PASS ===");
    for (const mut of MUTATIONS) {
      const target = mut.file ?? MODULE;
      const pristine = ORIGINALS.get(target);
      if (pristine === undefined) {
        FAILURES.push(`unknown target file for ${mut.name}: ${target}`);
        continue;
      }
      const occurrences = pristine.split(mut.from).length - 1;
      if (occurrences !== 1) {
        FAILURES.push(`fragment for ${mut.name} occurs ${occurrences} times, expected exactly 1`);
        continue;
      }
      writeFileSync(resolve(PKG, target), pristine.replace(mut.from, mut.to));
      // Only the named test is run, because a mutation cannot change any other test's outcome
      // and the whole-gate run costs a repository-wide scan per round. The test MUST have run:
      // a title that did not run at all would be reported as "detected" without proving
      // anything, so an absent title is a failure of the sweep, not a detection.
      const { passed, ran } = runGate(mut.expect);
      if (!ran.has(mut.expect)) {
        FAILURES.push(`${mut.name}: "${mut.expect}" did not run at all -- the sweep is broken`);
        restoreAll();
        continue;
      }
      const detected = !passed.has(mut.expect);
      if (!detected) {
        FAILURES.push(`${mut.name}: "${mut.expect}" STILL PASSED -- the test does not pin this`);
      }
      console.log(
        `${detected ? "OK  " : "FAIL"} ${mut.name}: "${mut.expect}" -> ${
          detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this"
        }`,
      );
      // Restore EVERY file, so a mutation never leaks into the next round.
      restoreAll();
    }
  } else {
    console.log("\n=== PHASE 1: SKIPPED -- the baseline is red ===");
  }

  // ASSERT THE SWEEP'S OWN OUTPUT, not just its exit code. A sweep whose fragments no
  // longer match can exit 0 having checked nothing.
  const gateSource = ORIGINALS.get(GATE) ?? "";
  for (const title of EXPECTED_BASELINE_PASS) {
    if (!gateSource.includes(title)) {
      FAILURES.push(`the gate file does not contain the expected test title: "${title}"`);
    }
  }
} finally {
  // RESTORE EVERY MUTATED FILE, however this run ended.
  restoreAll();
  rmSync(REPORT, { force: true });
  rmSync(BACKUP_DIR, { recursive: true, force: true });
  if (lockHeld) rmSync(LOCK, { force: true });
  console.log("\nsource restored");
}

if (FAILURES.length > 0) {
  console.log(`\n=== ${FAILURES.length} FAILURE(S) ===`);
  for (const failure of FAILURES) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log("\n=== SWEEP PASSED: every mutation was detected and the baseline is green ===");
process.exit(0);
