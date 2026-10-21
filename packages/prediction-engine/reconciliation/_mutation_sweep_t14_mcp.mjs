#!/usr/bin/env node
/**
 * MUTATION SWEEP for the T14 gate -- the 50k MCP cognitive router's cross-equation
 * Jacobian, the Stein shrinkage, the 288-bit context mask, the SPEC-C compiler and the
 * Recall@20 floor.
 *
 * THE QUESTION. The gate (test/mcp-cognitive-router.t14.spec.ts) passes. A passing gate is
 * not evidence that the gate pins what it claims. The audit rule: a test that passes for
 * the wrong reason reports a guarantee the code does not provide.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. T14's headline is a claim about a MECHANISM --
 * "DB injury plus two-high shell retreat triggers negative perimeter cross-partial
 * coupling Gamma_ij < 0 AND reallocates target share to the TE/RB seam (P-SEA-DEN-015)".
 * So the interesting failures are not "the number came out slightly different":
 *
 *   - the coupling's SIGN is flipped, so the two mechanisms reinforce when the spec says
 *     they dampen;
 *   - the coupling is computed and then NEVER USED -- the share is never reallocated, and
 *     the gamma is a decoration on a result nobody reads;
 *   - the Stein shrinkage is removed, so the higher-order term is published at full
 *     strength with three or more concurrent interactions;
 *   - the Stein factor is applied to the reinforcing pair too, so the "dampen and
 *     redirect" reading collapses into "shrink the negative ones";
 *   - the sample floor is off by one, so a cell with 29 observations is admitted;
 *   - the 288-bit mask is a flat array of booleans, which is not a bitmask at all;
 *   - the settlement-learned promotion weight is not clipped, so one lucky settlement buys
 *     unbounded influence in the logarithmic term;
 *   - the Recall@20 floor is not enforced, so the zoom-in hands back 250 premises nobody
 *     measured.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a failed test
 * as `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which
 * is how the FCI sweep's first version reported "NOT PINNED" for every rule while every
 * rule was in fact pinned. Detection is "the named test did not PASS", which covers an
 * assertion failure, a crash, and a test that never ran.
 *
 * THE THINGS THAT MAKE THIS SWEEP HONEST, and the incident each one prevents:
 *
 *   1. ONE FAILURE ARRAY DRIVES THE EXIT CODE. A counter incremented in one branch misses
 *      the branches that were not updated with it, and a sweep that reports failures and
 *      exits 0 is worse than no sweep: it is a gate that reports a false signal.
 *   2. A RED BASELINE ABORTS THE SWEEP. If the unmutated suite is not green, every
 *      "detection" is meaningless -- the named test may already be failing for an unrelated
 *      reason. The baseline is checked FIRST, before anything is mutated, and a red
 *      baseline means the mutation phases are skipped entirely.
 *   3. EVERY MUTATED FILE IS BACKED UP AND RESTORED IN `finally`. A killed run otherwise
 *      leaves the mutation in the tree forever. A leftover backup from a killed run is
 *      recovered at startup, so a crash cannot poison the next run.
 *   4. THE TREE IS LOCKED BY A FILE WHOSE STALENESS IS MEASURED BY AGE. Two mutators
 *      interleaving is how a mutation gets left behind. Age, not PID: PIDs get reused, and
 *      a PID check then blocks forever against a lock nobody owns.
 *   5. FRAGMENTS ARE MATCHED AGAINST THE FILE'S ACTUAL LINE ENDINGS. A fragment written
 *      with \n matches nothing in a CRLF checkout, and the sweep then reports "0
 *      occurrences" -- a failure that has nothing to do with the code. This repo's
 *      .gitattributes mandates LF, but the sweep does not ASSUME LF: it reads the file and
 *      normalises the fragment to whatever that file actually uses.
 *   6. THE SWEEP'S OWN OUTPUT IS ASSERTED, not just its exit code. A sweep whose
 *      fragments no longer match can exit 0 having checked nothing.
 *
 * PROVING THE SWEEP CAN GO RED. A sweep that has never been observed failing is not a
 * sweep known to work. Two self-test modes prove it, and both are reported:
 *
 *   T14_SWEEP_SELF_TEST=baseline-red
 *       Breaks the source BEFORE the baseline runs. The baseline must come back red, the
 *       mutation phases must be SKIPPED, and the sweep must exit 1.
 *
 *   T14_SWEEP_SELF_TEST=inert
 *       Adds a mutation that changes nothing and points it at a test that will still pass.
 *       The sweep must report "STILL PASSED" and exit 1.
 *
 * Reproduce, from packages/prediction-engine:
 *   node reconciliation/_mutation_sweep_t14_mcp.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The package root, derived from this file's own location so the sweep runs from any cwd. */
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The module the T14 gate is about. */
const ROUTER = "src/mcp/mcp-cognitive-router.ts";
/** The 288-bit context mask and the signal-family registry. */
const FEATURES = "src/features/feature-matrix.ts";
/** The SPEC-C compiler for PIT dark-source proxies. */
const COMPILER = "src/bridge/non-stat-situational-compiler.ts";
/** The gate that must stop passing. */
const GATE = "test/mcp-cognitive-router.t14.spec.ts";

/** Vitest, from the workspace root's node_modules. */
const VITEST = resolve(PKG, "..", "..", "node_modules", "vitest", "vitest.mjs");

/** Where the JSON report lands. */
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t14_mcp_sweep_report.json";

/** The lock file, so two sweeps cannot interleave their mutations. */
const SWEEP_LOCK = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t14_mcp_sweep.lock";

/** A lock older than this is stale, however old its PID is. */
const LOCK_STALE_MS = 30 * 60 * 1000;

/** Where the pristine copies of the mutated files live while the sweep runs. */
const BACKUP_DIR = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t14_mcp_backup";

/** The self-test mode, if any. */
const SELF_TEST = process.env.T14_SWEEP_SELF_TEST ?? "";

/**
 * The files this sweep may mutate.
 *
 * A mutation names its own target with `file` (defaulting to the router). Each is restored
 * from its OWN pristine text, not from a single global snapshot, so a mutation to one file
 * cannot be undone by restoring another -- and, more importantly, so each mutation is
 * restored exactly, with no residue from the previous round.
 */
const TARGETS = [ROUTER, FEATURES, COMPILER, GATE];

/**
 * THE MUTATIONS.
 *
 * `from` must occur EXACTLY ONCE in the pristine file, and the file is checked for that
 * before the mutation is applied: a fragment that occurs twice would make the sweep mutate
 * an arbitrary one of the two, and the result would be a coin toss rather than a fact.
 *
 * `expect` is the NAME of a test in the gate. The mutation is DETECTED when that test did
 * not pass.
 */
const MUTATIONS = [
  {
    name: "the cross-partial coupling's sign is flipped",
    file: ROUTER,
    from: "  const sign = inner >= 0 ? 1 : -1;",
    to: "  const sign = inner >= 0 ? -1 : 1; // MUTANT: the coupling's sign is flipped",
    expect:
      "T14: the concurrent DB injury and two-high shell mechanisms dampen each other",
  },
  {
    name: "the target-share reallocation is a no-op",
    file: ROUTER,
    from:
      "    share[input.redirectZone] = (share[input.redirectZone] as number) + amount;",
    to:
      "    share[input.redirectZone] = (share[input.redirectZone] as number) + 0; // MUTANT: the reallocation is a no-op",
    expect:
      "T14: DB injury plus two-high shell gives a NEGATIVE coupling AND reallocates the share to the TE/RB seam",
  },
  {
    name: "the Stein shrinkage is removed",
    file: ROUTER,
    from: "  const factor = 1 - ((interactionCount - 2) * bootstrapTrace) / denominator;",
    to: "  const factor = 1; // MUTANT: the Stein shrinkage is removed",
    expect: "T14: the Stein shrinkage deflates the cross-delta when m >= 3",
  },
  {
    name: "the Stein factor is applied below three interactions",
    file: ROUTER,
    from:
      "  if (!Number.isFinite(interactionCount) || interactionCount < 3) return 1;",
    to:
      "  if (!Number.isFinite(interactionCount) || interactionCount < 1) return 1; // MUTANT: the factor is applied below three interactions",
    expect: "T14: the Stein factor is exactly 1.0 when m < 3",
  },
  {
    name: "the sample floor is exclusive at 30",
    file: FEATURES,
    from: "  return n >= floor;",
    to: "  return n > floor; // MUTANT: the sample floor is exclusive at 30",
    expect: "T14: Stage A prunes on the 288-bit mask and on the sample floor of 30",
  },
  {
    name: "the 288-bit mask is a flat array of per-bit flags",
    file: FEATURES,
    from:
      "    const words: number[] = [];\n    for (let word = 0; word < CONTEXT_MASK_WORD_COUNT; word += 1) {\n      words.push(Number((this.bits >> BigInt(word * CONTEXT_MASK_WORD_BITS)) & 0xffffffffn));\n    }\n    return words;",
    to:
      "    const words: number[] = [];\n    for (let bit = 0; bit < CONTEXT_MASK_BITS; bit += 1) {\n      words.push(this.hasBit(bit) ? 1 : 0);\n    }\n    return words; // MUTANT: the mask is a flat array of per-bit flags",
    expect: "T14: the 288-bit context mask is a real bitmask over 279 families",
  },
  {
    name: "the promotion weight is not clipped",
    file: ROUTER,
    from:
      "    const clipped = Math.min(promotionMax, Math.max(promotionMin, rawPromotion));",
    to:
      "    const clipped = rawPromotion; // MUTANT: the promotion weight is not clipped",
    expect:
      "T14: Stage C clips the settlement-learned promotion weight to [0.05, 3.00]",
  },
  {
    name: "the Recall@20 floor is not enforced",
    file: ROUTER,
    from: "  if (input.certification.recallAt20 < floor) {",
    to: "  if (input.certification.recallAt20 < 0) { // MUTANT: the Recall@20 floor is not enforced",
    expect:
      "T14: Stage B refuses a zoom-in that cannot clear the 0.992 Recall@20 floor",
  },
  {
    name: "the chain rule sums the path count instead of the products",
    file: ROUTER,
    from:
      "  const chainDerivative = chainPaths.reduce((sum, path) => sum + path.product, 0);",
    to:
      "  const chainDerivative = chainPaths.length; // MUTANT: the chain rule sums the path count",
    expect:
      "T14: the chain rule sums the product of the partials over the causal chains",
  },
];

/**
 * THE SELF-TEST MUTATIONS. They are NOT in the default list: a sweep that always fails is
 * not a gate. They are added only when the self-test mode asks for them, so the sweep can
 * be observed failing on purpose.
 */
const SELF_TEST_MUTATIONS = {
  baseline_red: {
    name: "SELF-TEST: the source is broken before the baseline runs",
    file: ROUTER,
    from: "  const sign = inner >= 0 ? 1 : -1;",
    to: "  const sign = inner >= 0 ? -1 : 1; // SELF-TEST: the source is broken",
    expect:
      "T14: the concurrent DB injury and two-high shell mechanisms dampen each other",
  },
  inert: {
    name: "SELF-TEST: an inert mutation that no test can possibly detect",
    file: ROUTER,
    from: "  const sign = inner >= 0 ? 1 : -1;",
    to: "  const sign = inner >= 0 ? 1 : -1; // SELF-TEST: inert, changes nothing",
    expect:
      "T14: the concurrent DB injury and two-high shell mechanisms dampen each other",
  },
};

/** Every test title in the gate, verbatim. The baseline requires ALL of them. */
const EXPECTED_BASELINE_PASS = [
  "T14: the router publishes the spec's funnel constants and thresholds",
  "T14: the 288-bit context mask is a real bitmask over 279 families",
  "T14: Stage A prunes on the 288-bit mask and on the sample floor of 30",
  "T14: Stage A keeps the conditioned, well-sampled premises and prunes the rest",
  "T14: Stage B refuses a zoom-in that cannot clear the 0.992 Recall@20 floor",
  "T14: Stage B uses ef_search 64 in-play and 128 pre-game",
  "T14: Stage C clips the settlement-learned promotion weight to [0.05, 3.00]",
  "T14: DB injury plus two-high shell gives a NEGATIVE coupling AND reallocates the share to the TE/RB seam",
  "T14: the concurrent DB injury and two-high shell mechanisms dampen each other",
  "T14: the Stein shrinkage deflates the cross-delta when m >= 3",
  "T14: a large bootstrap trace deflates the cross-delta to zero",
  "T14: the Stein factor is exactly 1.0 when m < 3",
  "T14: a reinforcing pair (gamma > 0) does NOT shrink",
  "T14: the Stein factor follows the spec's formula, not the sign of gamma",
  "T14: the chain rule sums the product of the partials over the causal chains",
  "T14: the SPEC-C compiler refuses a dark source that is not point-in-time",
  "T14: the whole funnel refuses to route without a Recall@20 certification",
  "T14: the mutation sweep for T14 is present and targets this gate",
];

/**
 * THE FAILURE ARRAY. The exit code is derived from THIS and nothing else.
 *
 * A counter incremented in one branch misses the branches that were not updated with it,
 * and a sweep that reports failures and exits 0 is worse than no sweep: it is a gate that
 * reports a false signal.
 */
const FAILURES = [];

/** Everything the sweep prints, so the sweep can assert on its OWN output. */
const OUTPUT = [];

/** The marker a DETECTED mutation prints. The output assertion uses the same constant. */
const OK_PREFIX = "OK  ";

/** Print a line and remember it. */
function log(line) {
  OUTPUT.push(line);
  console.log(line);
}

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
 * THE FILE'S ACTUAL LINE ENDINGS.
 *
 * The repo's .gitattributes mandates LF in the working tree, and the files here are LF.
 * The sweep does not ASSUME that: it reads the file and normalises the fragment to
 * whatever the file actually uses, so a fragment written with \n still matches a CRLF
 * checkout and a fragment written with \r\n still matches an LF one.
 */
function eolOf(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/** A fragment normalised to the line endings its target file actually uses. */
function needleFor(text, fragment) {
  return fragment.split("\n").join(eolOf(text));
}

/** How many times a fragment occurs in the text, matched against the text's own EOLs. */
function countOccurrences(text, fragment) {
  return text.split(needleFor(text, fragment)).length - 1;
}

/** Apply a fragment replacement, matched against the text's own EOLs. */
function applyFragment(text, from, to) {
  return text.replace(needleFor(text, from), needleFor(text, to));
}

/**
 * Run the gate and return the set of PASSED test titles and the set of titles that RAN.
 *
 * THE PASS SET, NOT THE FAILED SET: a mutation is DETECTED when the named test did not
 * PASS, which covers an assertion failure, a crash, and a test that never ran.
 *
 * `only` restricts the run to the tests whose title matches, which is what makes the
 * sweep affordable: the baseline runs the WHOLE gate, so the sweep still proves every
 * test passes on the unmutated source.
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
 * A sweep that was killed mid-mutation leaves its backup behind. Restoring from that
 * backup is the only way the next run can trust its own baseline: without it, the
 * "pristine" text the sweep captures at startup would be a mutated file, and every
 * detection would be meaningless.
 */
function recoverLeftoverBackup() {
  if (!existsSync(BACKUP_DIR)) return;
  for (const file of TARGETS) {
    const backup = resolve(BACKUP_DIR, file.replace(/[\\/]/g, "__"));
    if (existsSync(backup)) {
      writeFileSync(resolve(PKG, file), readFileSync(backup, "utf8"));
      log(`recovered ${file} from a leftover backup`);
    }
  }
  rmSync(BACKUP_DIR, { recursive: true, force: true });
}

let lockHeld = false;

try {
  // RECOVER FIRST. A leftover backup means a previous run was killed mid-mutation.
  recoverLeftoverBackup();

  // TAKE THE SWEEP_LOCK, OR REFUSE TO START. Two sweeps mutating the same source at once
  // would interleave their mutations and produce results that mean nothing.
  if (existsSync(SWEEP_LOCK)) {
    const age = Date.now() - statSync(SWEEP_LOCK).mtimeMs;
    if (age < LOCK_STALE_MS) {
      console.error(
        `another sweep holds the sweep mutex (${SWEEP_LOCK}); refusing to interleave mutations`,
      );
      process.exit(1);
    }
    rmSync(SWEEP_LOCK, { force: true });
  }
  writeFileSync(SWEEP_LOCK, `pid=${process.pid} started=${new Date().toISOString()}\n`);
  lockHeld = true;

  // CAPTURE THE PRISTINE TEXT, AND BACK IT UP TO DISK.
  mkdirSync(BACKUP_DIR, { recursive: true });
  for (const file of TARGETS) {
    const text = readFileSync(resolve(PKG, file), "utf8");
    ORIGINALS.set(file, text);
    const backup = resolve(BACKUP_DIR, file.replace(/[\\/]/g, "__"));
    writeFileSync(backup, text);
  }

  if (SELF_TEST === "baseline_red") {
    // BREAK THE SOURCE BEFORE THE BASELINE. The baseline must come back red, the
    // mutation phases must be skipped, and the sweep must exit 1.
    const mut = SELF_TEST_MUTATIONS.baseline_red;
    const pristine = ORIGINALS.get(mut.file);
    writeFileSync(resolve(PKG, mut.file), applyFragment(pristine, mut.from, mut.to));
    log("=== SELF-TEST: the source was broken BEFORE the baseline ===");
  }

  // ====================================================================
  // PHASE 0: THE BASELINE. A RED BASELINE ABORTS THE SWEEP.
  //
  // This runs BEFORE anything is mutated, and if it is not green the mutation phases are
  // SKIPPED entirely. A "detection" against a red baseline proves nothing: the named test
  // may already have been failing for an unrelated reason, and a sweep that reports those
  // as detections is a gate that reports a false signal.
  // ====================================================================
  log("=== PHASE 0: baseline (no mutation): EVERY test MUST pass ===");
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
    log(`OK baseline: all ${baselinePassed.size} tests pass`);
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
  const mutations = [...MUTATIONS];
  if (SELF_TEST === "inert") {
    mutations.push(SELF_TEST_MUTATIONS.inert);
    log("=== SELF-TEST: an inert mutation has been added; the sweep MUST report it ===");
  }

  if (FAILURES.length === 0) {
    log("");
    log("=== PHASE 1: break a property; the named test MUST NOT PASS ===");
    for (const mut of mutations) {
      const target = mut.file ?? ROUTER;
      const pristine = ORIGINALS.get(target);
      if (pristine === undefined) {
        FAILURES.push(`unknown target file for ${mut.name}: ${target}`);
        continue;
      }
      const occurrences = countOccurrences(pristine, mut.from);
      if (occurrences !== 1) {
        FAILURES.push(`fragment for ${mut.name} occurs ${occurrences} times, expected exactly 1`);
        continue;
      }
      writeFileSync(resolve(PKG, target), applyFragment(pristine, mut.from, mut.to));
      // Only the named test is run, because a mutation cannot change any other test's
      // outcome. The test MUST have run: a title that did not run at all would be
      // reported as "detected" without proving anything, so an absent title is a failure
      // of the sweep, not a detection.
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
      log(
        `${detected ? OK_PREFIX : "FAIL"} ${mut.name}: "${mut.expect}" -> ${
          detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this"
        }`,
      );
      // Restore EVERY file, so a mutation never leaks into the next round.
      restoreAll();
    }
  } else {
    log("");
    log("=== PHASE 1: SKIPPED -- the baseline is red ===");
  }

  // ====================================================================
  // PHASE 2: ASSERT THE SWEEP'S OWN OUTPUT, not just its exit code.
  //
  // A sweep whose fragments no longer match can exit 0 having checked nothing. So the
  // baseline line must be present, the pass count must be right, every mutation line must
  // be an OK, and the failure marker must be absent.
  // ====================================================================
  log("");
  log("=== PHASE 2: assert the sweep's own output ===");
  const printed = OUTPUT.join("\n");
  const expectedBaselineLine = `OK baseline: all ${EXPECTED_BASELINE_PASS.length} tests pass`;
  if (!printed.includes(expectedBaselineLine)) {
    FAILURES.push(`the sweep's output does not contain the baseline line: "${expectedBaselineLine}"`);
  }
  if (printed.includes("STILL PASSED")) {
    FAILURES.push('the sweep\'s output contains the failure marker "STILL PASSED"');
  }
  if (printed.includes("PHASE 1: SKIPPED")) {
    FAILURES.push("the sweep's output says the mutation phases were skipped");
  }
  for (const mut of mutations) {
    // The marker is built from the SAME constant the line was printed with, so the
    // assertion cannot drift away from the output it is checking.
    if (!printed.includes(`${OK_PREFIX} ${mut.name}:`)) {
      FAILURES.push(`the sweep's output does not report an OK for the mutation: ${mut.name}`);
    }
  }
  // The gate file itself must still contain every title the sweep expects, so a renamed
  // test cannot silently turn the sweep into a no-op.
  const gateSource = ORIGINALS.get(GATE) ?? "";
  for (const title of EXPECTED_BASELINE_PASS) {
    if (!gateSource.includes(title)) {
      FAILURES.push(`the gate file does not contain the expected test title: "${title}"`);
    }
  }
  log(
    `checked: baseline line present, ${mutations.length} mutation lines OK, no failure marker, ${EXPECTED_BASELINE_PASS.length} titles present in the gate`,
  );
} finally {
  // RESTORE EVERY MUTATED FILE, however this run ended.
  restoreAll();
  rmSync(REPORT, { force: true });
  rmSync(BACKUP_DIR, { recursive: true, force: true });
  if (lockHeld) rmSync(SWEEP_LOCK, { force: true });
  log("");
  log("source restored");
}

if (FAILURES.length > 0) {
  log("");
  log(`=== ${FAILURES.length} FAILURE(S) ===`);
  for (const failure of FAILURES) log(`  - ${failure}`);
  process.exit(1);
}
log("");
log("=== SWEEP PASSED: every mutation was detected and the baseline is green ===");
process.exit(0);
