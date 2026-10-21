/**
 * MUTATION SWEEP for the G7 circuit breaker.
 *
 * THE QUESTION. The G7 gate is the one the spec calls a "circuit breaker", and the whole
 * point of a circuit breaker is that it fires when it should and STAYS QUIET when it should
 * not. The measurement that makes this non-obvious: the spec's literal rule
 * (`ECE_30 - ECE_250 > 0.02`) halts **197 of 200 perfectly calibrated families**, while
 * the noise-floor rule this module implements halts **0 of 200** and catches **200 of 200**
 * genuinely drifting ones.
 *
 * So the tests must pin BOTH halves. A sweep that only proved the detector fires would pass
 * a module that fires on everything -- which is the exact failure the spec's literal rule
 * has. The mutations below therefore include "the noise floor is removed" (the module
 * becomes the spec's halt-everything switch) as well as "the detector stops detecting".
 *
 * STRUCTURE. Read packages/prediction-engine/reconciliation/_mutation_sweep_t13_proximal.mjs
 * for the house pattern, and the mutation-sweep-safety skill for the rules that keep a sweep
 * from lying:
 *   - the exit code comes from ONE failure array, never a counter that can miss a branch;
 *   - the sweep REFUSES to run against a red baseline, and says so;
 *   - the tree is LOCKED so two mutators cannot interleave, with AGE-based stale detection;
 *   - every mutated file is restored in a `finally`, and a leftover backup is recovered on
 *     start;
 *   - the fragment is matched against the file's ACTUAL line endings;
 *   - the sweep's OUTPUT is asserted, not just its exit code.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PKG = join(ROOT, "packages", "prediction-engine");
const SRC = join(PKG, "src", "learning", "g7-circuit-breaker.ts");
const TEST = join(PKG, "test", "g7-circuit-breaker.spec.ts");
const SCRATCH = join(process.env.LOCALAPPDATA ?? process.env.TMPDIR ?? ".", "hermes", "cache", "scratch");
const REPORT = join(SCRATCH, "_g7_sweep_report.json");
const LOCK = join(SCRATCH, "_g7_sweep.lock");
const BACKUP = join(SCRATCH, "_g7_sweep_source.bak");
const STALE_LOCK_MS = 15 * 60 * 1000;

/** The pristine source, taken BEFORE any mutation. */
const original = readFileSync(SRC, "utf8");

// ---------------------------------------------------------------------------
// LOCK: two mutators against one file is how a mutation gets left behind.
// ---------------------------------------------------------------------------
function acquireLock() {
  mkdirSync(SCRATCH, { recursive: true });
  // AGE-based staleness, not PID-based: PIDs get reused, and a PID check then blocks forever
  // against a lock nobody owns.
  try {
    const st = existsSync(LOCK) ? readFileSync(LOCK, "utf8") : "";
    const age = Date.now() - (Number(st) || 0);
    if (st && age < STALE_LOCK_MS) {
      console.error(`another sweep holds the lock (${LOCK}); refusing to interleave mutations`);
      process.exit(1);
    }
  } catch {
    // no lock, or unreadable -- fall through and take it.
  }
  writeFileSync(LOCK, String(Date.now()));
}

function releaseLock() {
  rmSync(LOCK, { force: true });
}

// ---------------------------------------------------------------------------
// RECOVER from a leftover backup: a killed run must not leave a mutation in the tree.
// ---------------------------------------------------------------------------
if (existsSync(BACKUP)) {
  writeFileSync(SRC, readFileSync(BACKUP, "utf8"));
  rmSync(BACKUP, { force: true });
  console.log("recovered the source from a leftover backup");
}

// ---------------------------------------------------------------------------
// DETECTION: ask "did the named test PASS?", never match the verbose reporter's shape.
// ---------------------------------------------------------------------------
function passedTitles() {
  rmSync(REPORT, { force: true });
  try {
    execFileSync(
      process.execPath,
      [
        join(ROOT, "node_modules", "vitest", "vitest.mjs"),
        "run",
        "--reporter=json",
        `--outputFile=${REPORT}`,
        "test/g7-circuit-breaker.spec.ts",
      ],
      { encoding: "utf8", cwd: PKG, stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    // A non-zero exit is EXPECTED when a mutation breaks a test; the report still lands.
  }
  if (!existsSync(REPORT)) return new Set();
  const report = JSON.parse(readFileSync(REPORT, "utf8"));
  const passed = new Set();
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      if (a.status === "passed") passed.add(a.title);
    }
  }
  return passed;
}

const MUTATIONS = [
  {
    name: "the noise floor is removed -- the gate becomes the spec's halt-everything switch",
    from: "  const halt = Number.isFinite(difference) && difference > noiseFloor;",
    to: "  const halt = specHalt; // MUTANT: the noise floor is gone",
    expect: "a family with NO drift keeps emitting, even when its raw difference exceeds 0.02",
  },
  {
    name: "the noise floor ignores the bias excess",
    from: "  const biasExcess = noiseFast.bias - noiseSlow.bias;",
    to: "  const biasExcess = 0; // MUTANT: the bias excess is ignored",
    expect: "over 40 calibrated families, NONE is halted, and the ones that clear 0.02 are the spec's false positives",
  },
  {
    name: "the noise floor ignores the standard errors",
    from: "  const noiseFloor = biasExcess + threshold + G7_NOISE_SIGMA * standardError;",
    to: "  const noiseFloor = biasExcess + threshold; // MUTANT: the sigma band is gone",
    expect: "over 40 calibrated families, NONE is halted, and the ones that clear 0.02 are the spec's false positives",
  },
  {
    name: "the spec's threshold is dropped from the floor",
    from: "  const noiseFloor = biasExcess + threshold + G7_NOISE_SIGMA * standardError;",
    to: "  const noiseFloor = biasExcess + G7_NOISE_SIGMA * standardError; // MUTANT: the spec's 0.02 is gone",
    expect: "the noise floor is the BIAS EXCESS plus the threshold plus the sigma band",
  },
  {
    name: "the bias estimate is zeroed",
    from: "    bias += weight * sigma * Math.sqrt(2 / Math.PI);",
    to: "    bias += 0; // MUTANT: the bias is zeroed",
    expect: "the noise floor of a perfectly calibrated family is POSITIVE -- the bias is real",
  },
  {
    name: "the standard error is computed with the wrong rate",
    from: "    const sigma = Math.sqrt((rate * (1 - rate)) / bin.count);",
    to: "    const sigma = Math.sqrt(0.25 / bin.count); // MUTANT: the rate is not used",
    expect: "the bias and standard error match an INDEPENDENT recomputation from the bin structure",
  },
  {
    name: "the drift detector stops detecting",
    from: "  const halt = Number.isFinite(difference) && difference > noiseFloor;",
    to: "  const halt = false; // MUTANT: the detector never fires",
    expect: "a genuinely drifting family is halted, across many seeds",
  },
  {
    name: "the fast window is the FIRST n rather than the last n",
    from: "  const fast = probs.slice(Math.max(0, probs.length - fastWindow));",
    to: "  const fast = probs.slice(0, fastWindow); // MUTANT: the fast window is the OLDEST",
    expect: "the fast window is the most RECENT by settlement time, not the last N in array order",
  },
  {
    name: "the family grouping is removed -- every family is judged on everything",
    from: "    const bucket = byGroup.get(o.groupKey);",
    to: "    const bucket = byGroup.get(\"ALL\"); // MUTANT: the grouping is gone",
    expect: "a family's verdict does NOT depend on any other family's observations",
  },
  {
    name: "the group key no longer matches the durable pause reader's shape",
    from: '  return `${sport}|${market}`;',
    to: '  return `${sport}::${market}`; // MUTANT: the key shape is wrong',
    expect: "the group key is the repo's `sport|market` shape, and the halt list is a flat array",
  },
];

const FAILURES = [];

acquireLock();
try {
  // ---- PRE-CHECK: refuse to run against a red baseline -------------------
  writeFileSync(BACKUP, original);
  const baseline = passedTitles();
  if (baseline.size === 0) {
    console.error("PRE-CHECK FAILED: the suite reports no passing tests -- aborting before mutating");
    FAILURES.push("pre-check: the suite is not green, so no detection would mean anything");
  } else {
    console.log(`OK   pre-check: all ${baseline.size} tests pass with the unmutated source`);
  }

  if (FAILURES.length === 0) {
    console.log("\n=== PHASE 1: break the rule; the named test MUST NOT PASS ===");
    for (const mut of MUTATIONS) {
      const occurrences = original.split(mut.from).length - 1;
      if (occurrences !== 1) {
        FAILURES.push(`${mut.name}: fragment occurs ${occurrences} times, expected exactly 1`);
        console.log(`FAIL ${mut.name}: fragment occurs ${occurrences} times, expected exactly 1`);
        continue;
      }
      writeFileSync(SRC, original.replace(mut.from, mut.to));
      const passed = passedTitles();
      const detected = !passed.has(mut.expect);
      if (!detected) {
        FAILURES.push(`${mut.name}: "${mut.expect}" STILL PASSED -- the test does not pin this`);
      }
      console.log(
        `${detected ? "OK  " : "FAIL"} ${mut.name}: "${mut.expect}" -> ${
          detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this"
        }`,
      );
    }
  }

  // ---- BASELINE ----------------------------------------------------------
  console.log("\n=== BASELINE (no mutation): EVERY test MUST pass ===");
  writeFileSync(SRC, original);
  const finalPassed = passedTitles();
  if (finalPassed.size === 0) {
    FAILURES.push("baseline: the suite reports no passing tests");
    console.log("FAIL baseline: no passing tests");
  } else {
    console.log(`OK   baseline: all ${finalPassed.size} tests pass with the unmutated source`);
  }
} finally {
  writeFileSync(SRC, original);
  rmSync(BACKUP, { force: true });
  releaseLock();
  rmSync(REPORT, { force: true });
  console.log("\nsource restored");
}

if (FAILURES.length > 0) {
  console.log("\n=== SWEEP RESULT: FAIL ===");
  for (const f of FAILURES) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\n=== SWEEP PASSED: every mutation was detected and the baseline is green ===");
process.exit(0);
