/**
 * MUTATION SWEEP for the T8 gate -- the pick pipeline: the compile-time phantom brand and the
 * nine runtime gates G1-G9.
 *
 * THE QUESTION. The T8 gate (test/pick-pipeline.t8.spec.ts) passes 60/60. A passing gate is not
 * evidence that the gate pins what it claims. The audit rule is: a test that passes for the wrong
 * reason reports a guarantee the code does not provide.
 *
 * WHAT COULD GO WRONG HERE, SPECIFICALLY. The T8 gate is the LAST gate before a pick reaches a
 * board, so the interesting failures are not "the probability came out slightly different" -- they
 * are:
 *
 *   - the brand accepts a certificate in a state that must not be publishable, so a WITHHELD
 *     conclusion is laundered into a published pick;
 *   - a gate is SKIPPED, so it never refuses, and the conjunction of nine looks like nine but is
 *     really eight;
 *   - the emit publishes a pick even though a gate failed, so the refusal codes are decoration.
 *
 * THE PHASES.
 *   Phase 1 -- DISABLE A MECHANISM. The brand check accepts a non-VALID state; a gate is skipped
 *               entirely so it never refuses. The named test must fail.
 *   Phase 2 -- BREAK A PROPERTY. The emit returns picks even when a gate failed. The named test
 *              must fail.
 *   Phase 3 -- THE COMPILE-TIME BARRIER. The brand TYPE is weakened so an unbranded object (and a
 *              WITHHELD / INSUFFICIENT / ASSOCIATION_ONLY certificate) becomes assignable. The
 *              `@ts-expect-error` directives in the test file then become UNUSED, and TypeScript
 *              says so (TS2578). This phase is checked with `tsc`, not with vitest, because the
 *              thing it proves is a COMPILE-TIME fact: no runtime assertion can observe it.
 *
 * THE RESULTS COME FROM VITEST'S JSON REPORTER. The verbose reporter prints a failed test as
 * `  x file.ts > describe > it`, and matching on the whole line finds nothing -- which is how the
 * FCI sweep's first version reported "NOT PINNED" for every rule while every test was in fact
 * pinned. Detection is "the named test did not PASS", which covers an assertion failure, a
 * crash, and a test that never ran.
 *
 * RUN IT FROM THE PACKAGE ROOT, the way the T13 sweep is run:
 *
 *   cd packages/prediction-engine && node reconciliation/_mutation_sweep_t8_picks.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const GATE = "src/picks/pick-pipeline.ts";
const TEST = "test/pick-pipeline.t8.spec.ts";
const TESTS = [TEST];
const VITEST = "../../node_modules/vitest/vitest.mjs";
const TSC = "../../node_modules/typescript/bin/tsc";
const REPORT = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/_t8_sweep_report.json";

/**
 * The compiler flags for the compile-time phase.
 *
 * The package tsconfig.json includes only the `src` tree, so `tsc -p` never looks at the test file
 * and the `@ts-expect-error` directives in it are never checked by the normal build. These flags
 * mirror tsconfig.base.json exactly, and the test file is named on the command line, so the
 * compile-time barrier is checked against the same strictness the source is.
 */
const TSC_FLAGS = [
  "--noEmit",
  "--strict",
  "--exactOptionalPropertyTypes",
  "false",
  "--noUncheckedIndexedAccess",
  "--noImplicitReturns",
  "--noFallthroughCasesInSwitch",
  "--esModuleInterop",
  "--skipLibCheck",
  "--forceConsistentCasingInFileNames",
  "--resolveJsonModule",
  "--isolatedModules",
  "--target",
  "ES2022",
  "--lib",
  "ES2022",
  "--module",
  "ESNext",
  "--moduleResolution",
  "bundler",
];

/**
 * The pristine text of EVERY file a mutation may touch.
 *
 * A mutation names its own target with `file` (defaulting to the gate). Each is restored from
 * this map, not from a single global snapshot, so a mutation to the TEST file cannot be undone
 * by restoring the gate -- and, more importantly, so a mutation to the gate is restored exactly,
 * with no residue from the previous round.
 */
const ORIGINALS = new Map([
  [GATE, readFileSync(GATE, "utf8")],
  [TEST, readFileSync(TEST, "utf8")],
]);

/** Phase 1: disable a mechanism. The named test must not pass. */
const DISABLE = [
  {
    name: "the brand accepts a certificate in a state that must not be publishable",
    from: '  if (certificate.state !== "VALID") {',
    to: '  if (certificate.state !== "VALID" && certificate.state !== "WITHHELD") { // MUTANT: the brand accepts a WITHHELD certificate',
    expect: "refuses a WITHHELD certificate with the WITHHELD code",
  },
  {
    name: "G5 is skipped entirely, so it never refuses",
    from: "  outcomes.push(gateG5(input));",
    to: "  outcomes.push({ gate: PickGate.G5, passed: true, refusal_code: null, reason: null }); // MUTANT: G5 is skipped, so it never refuses",
    expect: "G5 refuses an entity-swap divergence AT 0.02 -- the spec's inequality is strict",
  },
];

/** Phase 2: break a property of the pipeline. The named test must not pass. */
const BREAK = [
  {
    name: "the emit returns picks even though a gate failed",
    from: "  const failed = gates.find((outcome) => !outcome.passed);\n  if (failed !== undefined) {\n    return {\n      entries: [],",
    to: "  const failed = gates.find((outcome) => !outcome.passed);\n  if (failed !== undefined) {\n    return {\n      entries: [mintBoardOrParlayEntry(validation.trace)], // MUTANT: a failed gate still publishes",
    expect: "publishes ZERO picks when G1 fails",
  },
  {
    name: "the G9 fsync confirmation is not required",
    from: "  if (!commit.fsynced) {",
    to: "  if (false) { // MUTANT: the fsync confirmation is not required",
    expect: "G9 refuses a committed row whose durability was NOT confirmed by an fsync",
  },
  {
    name: "the G7 calibration-drift budget is not enforced",
    from: "  if (!(eceShort - eceLong <= MAX_CALIBRATION_DRIFT)) {",
    to: "  if (false) { // MUTANT: the calibration-drift budget is not enforced",
    expect: "G7 refuses a calibration drift above the 0.02 budget",
  },
];

/**
 * Phase 3: the COMPILE-TIME barrier.
 *
 * The brand type is weakened twice over: the certificate is no longer narrowed to "VALID", and the
 * brand property becomes optional. An unbranded object literal, and a WITHHELD / INSUFFICIENT /
 * ASSOCIATION_ONLY / MISSING certificate, then all become ASSIGNABLE to `ValidatedCausalTrace`.
 *
 * The detection is the reverse of the other phases, and necessarily so: the compiler is the thing
 * that changed, so the compiler is what must be asked. An `@ts-expect-error` directive that no
 * longer suppresses an error is reported as TS2578 ("Unused '@ts-expect-error' directive"), and
 * that is the signal that the compile-time barrier is gone. The BASELINE must report ZERO of
 * them, because a baseline that reported one would mean the directives were never load-bearing.
 */
const COMPILE = [
  {
    name: "the brand type is weakened, so an unbranded object and a non-VALID certificate are assignable",
    from: "export type ValidatedCausalTrace = {\n  readonly certificate: PublishableCertificate;\n  readonly [ValidatedCausalTraceBrand]: ValidatedCausalTraceBrandValue;\n};",
    to: "export type ValidatedCausalTrace = {\n  readonly certificate: CausalCertificate;\n  readonly [ValidatedCausalTraceBrand]?: ValidatedCausalTraceBrandValue;\n}; // MUTANT: the brand is optional and the certificate is not narrowed",
    expect: "the @ts-expect-error directives in the test file must stop erroring",
  },
];

/**
 * The line ending a file uses on disk.
 *
 * A Windows checkout can carry CRLF and a POSIX checkout LF, and the repo's .gitattributes
 * normalizes both to LF in the index. A multi-line mutation fragment written with "\n" would
 * therefore match on one platform and silently MISS on the other -- and a silently missed
 * fragment is the worst possible failure for a sweep, because it reports "NOT PINNED" for a
 * mutation that is in fact pinned. So the fragment is rewritten to the file's own convention
 * before it is matched.
 */
function eolOf(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/** Rewrite a fragment's newlines to the target file's convention. */
function withEol(fragment, eol) {
  return eol === "\r\n" ? fragment.replace(/\r?\n/g, "\r\n") : fragment.replace(/\r?\n/g, "\n");
}

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
      // T8_SWEEP_CHILD is set so the gate's own "run the sweep" test does not recurse when the
      // sweep runs the gate. Without it the sweep would spawn a gate that spawns the sweep.
      env: { ...process.env, T8_SWEEP_CHILD: "1" },
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
 * Type-check the TEST file and return the UNUSED `@ts-expect-error` directives in it.
 *
 * The count is the signal: zero in the baseline (the directives are load-bearing), and MORE THAN
 * ZERO once the brand is weakened (the directives no longer suppress anything, so the compiler
 * says they are unused).
 *
 * Only the TEST file's own directives are counted. The package's source tree carries pre-existing
 * type errors that are NOT this gate's business, and counting them would make the signal noise.
 */
function unusedExpectErrorDirectives() {
  let output = "";
  try {
    output = execFileSync("node", [TSC, ...TSC_FLAGS, TEST], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // tsc exits non-zero because the package's pre-existing source errors are in the program.
    // The diagnostics are what matter, and they are on stdout.
    output = typeof error.stdout === "string" ? error.stdout : "";
  }
  return output
    .split("\n")
    .filter((line) => line.includes("TS2578") && line.includes(TEST));
}

/** Every test title in the gate, verbatim. The baseline requires ALL of them. */
const EXPECTED_BASELINE_PASS = [
  "rejects an unbranded object and every non-publishable certificate at compile time",
  "refuses to type an unbranded object as a ValidatedCausalTrace",
  "accepts a VALID certificate and brands it",
  "refuses a MISSING certificate with the MISSING code",
  "refuses a WITHHELD certificate with the WITHHELD code",
  "refuses an INSUFFICIENT certificate with the INSUFFICIENT code",
  "refuses an ASSOCIATION_ONLY certificate with the ASSOCIATION_ONLY code",
  "refuses a certificate that declares itself MISSING",
  "gives each non-publishable state a DISTINCT refusal code",
  "throws rather than returning an unbranded value for a refused certificate",
  "treats undefined and null as the same MISSING state",
  "returns exactly nine outcomes, in the spec's order",
  "passes every gate on the all-pass input",
  "gives each gate a DISTINCT refusal code",
  "G1 refuses a premise with fewer than 30 samples",
  "G1 accepts exactly 30 samples",
  "G1 refuses a premise with NO DIRECTION -- the audit's measured gap",
  "G1 refuses a premise whose probability is not strictly inside (0,1)",
  "G1 refuses a signal coverage below 0.65 and accepts exactly 0.65",
  "G1 refuses when no active premise was supplied at all",
  "G2 refuses a literature premise that failed the L1-L4 conjunction",
  "G2 refuses a conflict consensus below 0.20 and accepts exactly 0.20",
  "G2 does not demand a consensus ratio when there is no conflict",
  "G3 refuses an effect blocked by a witnessing hedge",
  "G3 refuses a positivity below 0.01 and accepts exactly 0.01",
  "G3 refuses an UNMEASURED positivity -- unmeasured is not a pass",
  "G4 refuses a point E-value below 1.35 and accepts exactly 1.35",
  "G4 refuses a CI E-value below 1.10 and accepts exactly 1.10",
  "G4 refuses a placebo leak above 0.005 and accepts exactly 0.005",
  "G4 refuses an UNMEASURED E-value",
  "G5 refuses an entity-swap divergence AT 0.02 -- the spec's inequality is strict",
  "G5 refuses a rationale accuracy below 0.85 and accepts exactly 0.85",
  "G5 refuses an evidence faithfulness below 0.95 and accepts exactly 0.95",
  "G5 refuses a decision coherence below 0.90 and accepts exactly 0.90",
  "G5 refuses an UNMEASURED faithfulness term",
  "G6 refuses a conformal stop",
  "G6 refuses a copula joint outside the Frechet-Hoeffding bounds",
  "G6 refuses a nonconformity above the conformal threshold",
  "G6 accepts a copula joint exactly ON the Frechet-Hoeffding bound",
  "G7 refuses a calibration drift above the 0.02 budget",
  "G7 refuses a non-positive Brier Skill Score",
  "G7 refuses an ACI coverage instability above 0.03",
  "G8 refuses a trailing CLV below -0.002 and accepts exactly -0.002",
  "G8 refuses a conformal lower-bound edge that does not exceed 0.015",
  "G8 refuses when there are no CLV observations at all",
  "G9 refuses a price row that was never committed",
  "G9 refuses a committed row whose durability was NOT confirmed by an fsync",
  "G9 refuses a row the repository's own validator rejects",
  "publishes exactly one entry when every gate passes",
  "reports all nine gate outcomes even on the passing run",
  "publishes ZERO picks when G1 fails",
  "publishes ZERO picks when G9 fails",
  "publishes ZERO picks -- not a degraded pick -- when ANY ONE gate fails",
  "publishes ZERO picks when the certificate is not publishable",
  "reports the certificate refusal code, not a gate code, when the certificate is bad",
  "emits a branded trace when the conjunction holds",
  "emits a REFUSAL when a gate fails, and no trace",
  "emits a REFUSAL when the certificate is not publishable, and no trace",
  "mints a board entry from a branded trace, with the certificate's own numbers",
  "hashes two identical trails identically and two different trails differently",
  "the sweep is fail-closed -- a failure makes it exit non-zero",
];

let broken = 0;
let detectedCount = 0;
const TOTAL_MUTATIONS = DISABLE.length + BREAK.length + COMPILE.length;

try {
  console.log("=== PHASE 1: disable a mechanism; the named test MUST NOT PASS ===");
  for (const mut of [...DISABLE, ...BREAK]) {
    const target = mut.file ?? GATE;
    const pristine = ORIGINALS.get(target);
    if (pristine === undefined) {
      console.error(`ERROR: unknown target file for ${mut.name}: ${target}`);
      broken++;
      continue;
    }
    const eol = eolOf(pristine);
    const from = withEol(mut.from, eol);
    const occurrences = pristine.split(from).length - 1;
    if (occurrences !== 1) {
      console.error(`ERROR: fragment for ${mut.name} occurs ${occurrences} times, expected exactly 1`);
      broken++;
      continue;
    }
    writeFileSync(target, pristine.replace(from, withEol(mut.to, eol)));
    const passed = passedTitles();
    const detected = !passed.has(mut.expect);
    if (!detected) broken++;
    else detectedCount++;
    const phase = DISABLE.includes(mut) ? "P1" : "P2";
    console.log(
      `${detected ? "OK  " : "FAIL"} [${phase}] ${mut.name}: "${mut.expect}" -> ${
        detected ? "did not pass, as required" : "STILL PASSED -- the test does not pin this"
      }`,
    );
    // Restore EVERY file, so a mutation never leaks into the next round.
    for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  }

  console.log("\n=== PHASE 3: the compile-time barrier; the @ts-expect-error MUST stop erroring ===");
  for (const mut of COMPILE) {
    const target = mut.file ?? GATE;
    const pristine = ORIGINALS.get(target);
    if (pristine === undefined) {
      console.error(`ERROR: unknown target file for ${mut.name}: ${target}`);
      broken++;
      continue;
    }
    const eol = eolOf(pristine);
    const from = withEol(mut.from, eol);
    const occurrences = pristine.split(from).length - 1;
    if (occurrences !== 1) {
      console.error(`ERROR: fragment for ${mut.name} occurs ${occurrences} times, expected exactly 1`);
      broken++;
      continue;
    }
    writeFileSync(target, pristine.replace(from, withEol(mut.to, eol)));
    const unused = unusedExpectErrorDirectives();
    const detected = unused.length > 0;
    if (!detected) broken++;
    else detectedCount++;
    console.log(
      `${detected ? "OK  " : "FAIL"} [P3] ${mut.name}: "${mut.expect}" -> ${
        detected
          ? `${unused.length} unused '@ts-expect-error' directive(s) reported, as required`
          : "NO unused directive reported -- the compile-time barrier is not pinned"
      }`,
    );
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
    console.log(`OK baseline: all ${baselinePassed.size} tests pass with the unmutated source`);
  }

  console.log("\n=== BASELINE (no mutation): the compile-time directives MUST all be load-bearing ===");
  const baselineUnused = unusedExpectErrorDirectives();
  if (baselineUnused.length > 0) {
    broken++;
    console.log(
      `FAIL baseline: ${baselineUnused.length} unused '@ts-expect-error' directive(s) in the unmutated source`,
    );
    for (const line of baselineUnused) console.log(`     ${line}`);
  } else {
    console.log(
      "OK baseline: every '@ts-expect-error' in the test file suppresses a real error",
    );
  }
} finally {
  for (const [file, text] of ORIGINALS) writeFileSync(file, text);
  rmSync(REPORT, { force: true });
  console.log("\nsource restored");
}

console.log(`mutations detected: ${detectedCount}/${TOTAL_MUTATIONS}; failures: ${broken}`);
if (broken === 0) {
  console.log("SWEEP RESULT: PASS");
} else {
  console.log("SWEEP RESULT: FAIL");
}

process.exit(broken === 0 ? 0 : 1);
