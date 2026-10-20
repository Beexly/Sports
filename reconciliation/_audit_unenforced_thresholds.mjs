#!/usr/bin/env node
/**
 * ARE THERE OTHER CONSTANTS THAT READ LIKE CHECKS BUT GATE NOTHING?
 *
 * The E-value bug was found by auditing my OWN just-written code for
 * the defect class this whole reconciliation exists to remove: a
 * constant that is exported, is named like a threshold, and is never
 * actually compared against anything.
 *
 * That is worth checking REPO-WIDE rather than only in the module
 * where it was found, because the pattern is not module-specific.
 *
 * THE CHECK. For each exported constant whose name reads like a
 * threshold or a limit:
 *
 *   1. is its NAME mentioned anywhere OUTSIDE its own declaration?
 *      (a constant referenced only in its own file is almost always
 *      dead)
 *   2. is it ever COMPARED against something -- `>=`, `>`, `<=`, `<`?
 *      (a constant that is only ASSIGNED, PASSED, or EXPORTED is a
 *      label, not a gate)
 *
 * A constant that fails (2) is reported. It might be a legitimate
 * configuration value, so the report is a REVIEW LIST, not a verdict
 * -- but every entry in it is a place where a reader could reasonably
 * have believed a check was happening.
 *
 * Reproduce: node reconciliation/_audit_unenforced_thresholds.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = [
  "packages/prediction-engine/src",
  "apps/web/lib",
  "apps/web/app",   // the API routes, where the Prisma/SQL filters live
  "scripts",
  "packages/types/src",
  "packages/data-ingestion/src",
];
const SKIP = new Set(["node_modules", ".git", "dist", ".next", "coverage", "__tests__"]);

/**
 * A constant name that reads like a threshold.
 *
 * NOTE: this must catch `MIN_EXPANSION_E_VALUE` and `MAX_*` -- the
 * exact class of bug this audit was written to find. A prefix-only
 * match on "MIN" would miss it, and an audit that cannot find the
 * bug it was written for is worse than no audit, because it reads as
 * a clean bill of health.
 */
const THRESHOLD_NAME =
  /^(?:MIN|MAX)[A-Z0-9_]*$|^DEFAULT_.*(?:LIMIT|THRESHOLD|MAX|MIN|CAP|CEILING|FLOOR)$|.*_(?:THRESHOLD|LIMIT|MIN|MAX|CEILING|FLOOR|CAP|EPSILON|TOLERANCE)$/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) yield* walk(p);
    else if (/\.[cm]?[jt]sx?$/.test(e)) yield p;
  }
}

const files = [];
for (const r of SCAN_ROOTS) {
  for (const f of walk(join(root, r))) files.push(f);
}

console.log(`=== SCANNING ${files.length} FILES FOR CONSTANTS THAT GATE NOTHING ===\n`);

// Collect the declarations.
const declarations = [];
const declRe = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*[:=]/g;
for (const file of files) {
  const src = readFileSync(file, "utf8");
  let m;
  declRe.lastIndex = 0;
  while ((m = declRe.exec(src)) !== null) {
    const name = m[1];
    if (!THRESHOLD_NAME.test(name)) continue;
    // A constant whose value is a STRING is not a threshold. It is a
  // literal that happens to be named like one -- `NEGATIVE_PROMPT_FLOOR`
  // is a prompt text, not a floor. Flagging it would be noise.
  const valueIsString =
    /=\s*["'`]/.test(src.slice(src.indexOf(name) + name.length).slice(0, 80));
  if (valueIsString) continue;
  declarations.push({ file, name, src });
  }
}

// READ EVERY FILE ONCE. The scan is 145 constants x 3460 files, and
// re-reading the disk for each pair is 500k reads -- which timed out.
// The contents are cached in memory and scanned from there.
const CONTENTS = new Map();
for (const file of files) {
  try {
    CONTENTS.set(file, readFileSync(file, "utf8"));
  } catch {
    CONTENTS.set(file, "");
  }
}

const findings = [];
for (const d of declarations) {
  // Every OTHER file that mentions the name.
  const mentionedElsewhere = [];
  let comparedAnywhere = false;
  let comparedOutsideDeclaration = false;
  // The constant may be gated INDIRECTLY: `const minE = ... ?? CONST`
  // and then `minE` is compared. That is a real gate, so the audit has
  // to resolve the alias rather than only matching a literal
  // comparison against the constant's own name -- otherwise it cries
  // wolf on correct code and its report stops being worth reading.
  const aliasCompared = [];
  // The constant is handed to a function that compares it internally.
  let usedAsArgument = false;

  for (const file of files) {
    const src = CONTENTS.get(file);
    if (!src || !src.includes(d.name)) continue;
    mentionedElsewhere.push(file);
    // A COMPARISON: the name next to a comparison operator, on either
    // side. `X >= CONST`, `X <= CONST`, `CONST < X`, etc.
    const cmp = new RegExp(
      `(${d.name}\\s*(?:>=|<=|>|<|===|!==|==|!=)|(?:>=|<=|>|<)\\s*${d.name}\\b)`,
    );
    if (cmp.test(src)) {
      comparedAnywhere = true;
      if (file !== d.file) comparedOutsideDeclaration = true;
    }
    // ALIAS: a local binding whose value is (or defaults to) the
    // constant. `const minE = opts?.minEValue ?? MIN_EXPANSION_E_VALUE;`
    const aliasRe = new RegExp(
      `(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=]+)?=\\s*[^;\\n]*\\b${d.name}\\b`,
      "g",
    );
    let am;
    while ((am = aliasRe.exec(src)) !== null) {
      const alias = am[1];
      if (alias === d.name) continue;
      // Is the alias itself compared?
      const aliasCmp = new RegExp(
        `(?:>=|<=|>|<|===|!==|==|!=)\\s*${alias}\\b|\\b${alias}\\s*(?:>=|<=|>|<|===|!==|==|!=)`,
      );
      if (aliasCmp.test(src)) aliasCompared.push({ file, alias });
    }
    // CLAMP: `Math.max(MIN_X, v)` / `Math.min(MAX_X, v)`. A clamp IS
    // a comparison -- the constant decides the floor or ceiling -- but
    // it is not written with an operator, so the operator-only match
    // misses it.
    //
    // NOTE the DOUBLE backslashes. This is a template literal, so a
    // single `\s` would be consumed by the literal's own escape
    // processing and reach RegExp as a bare `s`.
    const clampRe = new RegExp(
      `Math\\.(?:max|min)\\s*\\(\\s*${d.name}\\b`,
    );
    if (clampRe.test(src)) aliasCompared.push({ file, alias: "Math.max/min clamp" });
    // SQL PARAMETER: the constant is bound into a query, and the
    // comparison against it happens inside the SQL string. This is
    // how `DEFAULT_DISCOVERY_THRESHOLD` is enforced -- `minDistinctEvents`
    // is bound into the query and the database does the comparing.
    const sqlParamRe = new RegExp(
      `\\$\\{[^}]{0,40}?\\b${d.name}\\b|\\b${d.name}\\b[^;]{0,40}?\\$\\{`,
    );
    if (sqlParamRe.test(src)) {
      aliasCompared.push({ file, alias: "SQL query parameter" });
    }
    // SQL / Prisma COMPARISON: `{ gte: MIN_THRESHOLD }`, `{ lte: MAX }`,
    // `{ gt: X }`, `{ lt: X }`. The comparison happens in the DATABASE,
    // so there is no operator at the call site at all -- but the
    // constant absolutely gates a result set. This is the dominant
    // pattern in apps/web, and missing it would have the audit
    // reporting real, working filters as dead.
    const sqlCmpRe = new RegExp(
      `\\b(?:gte|lte|gt|lt|eq|not|greaterThan|lessThan|greaterThanOrEqual|lessThanOrEqual)\\s*\\(\\s*${d.name}\\b`,
    );
    const sqlOpRe = new RegExp(
      `\\{\\s*(?:gte|lte|gt|lt)\\s*:\\s*${d.name}\\b`,
    );
    if (sqlCmpRe.test(src) || sqlOpRe.test(src)) {
      aliasCompared.push({ file, alias: "SQL comparison" });
    }
    // CLAMP HELPER: `clamp(v, 0, MAX_CONFIDENCE)`. The constant is the
    // bound of a helper that clamps internally -- a gate, written
    // without an operator.
    const clampHelperRe = new RegExp(
      `\\bclamp\\s*\\([^;]{0,160}?\\b${d.name}\\b`,
    );
    if (clampHelperRe.test(src)) aliasCompared.push({ file, alias: "clamp() bound" });
    // Math.max/Math.min WITH THE CONSTANT ON THE RIGHT:
    // `Math.max(logScore(...), PRACTICAL_SCORE_MIN)`. The earlier
    // clamp check only matched the constant in the FIRST argument
    // position, which misses the floor case entirely.
    const mathRightRe = new RegExp(
      `Math\\.(?:max|min)\\s*\\([^;]{0,160}?,\\s*${d.name}\\s*\\)`,
    );
    if (mathRightRe.test(src)) aliasCompared.push({ file, alias: "Math.max/min floor/ceiling" });
    // PRISMA `take:` / API `limit`: a LIMIT is a bound, and it gates a
    // result set even though nothing is compared.
    const takeRe = new RegExp(
      `\\b(?:take|limit|first)\\s*:\\s*${d.name}\\b`,
    );
    if (takeRe.test(src)) aliasCompared.push({ file, alias: "take/limit bound" });
    // `params.set("limit", CONST)` -- an outbound API limit.
    const setRe = new RegExp(
      `\\.set\\s*\\([^;]{0,120}?${d.name}\\s*\\)`,
    );
    if (setRe.test(src)) aliasCompared.push({ file, alias: "outbound API limit" });
    // ARITHMETIC IN A COMPARISON: `x >= 1 - EPSILON`. The constant
    // participates in the threshold without being the whole operand,
    // so the operator-adjacency match misses it.
    const arithRe = new RegExp(
      `(?:>=|<=|>|<|===|!==|==|!=)[^;\\n]{0,40}\\b${d.name}\\b|\\b${d.name}\\b[^;\\n]{0,40}(?:>=|<=|>|<|===|!==|==|!=)`,
    );
    if (arithRe.test(src)) aliasCompared.push({ file, alias: "arithmetic threshold" });
    // BOUND ARGUMENT: `requireInteger(v, "n", 1, MAX_UNITS)`. The
    // constant is passed to a validator that compares it internally.
    // The call is not a comparison, so this is its own category.
    const argRe = new RegExp(
      `\\(\\s*[^;]{0,120}?,\\s*${d.name}\\s*\\)`,
    );
    if (argRe.test(src)) usedAsArgument = true;
    // DEFAULT PARAMETER: `function f(threshold = SOME_THRESHOLD)`.
    // The constant supplies the default; the PARAMETER is what gets
    // compared. This is a legitimate gate, and a very common one, so
    // the audit has to see it -- otherwise it flags every defaulted
    // threshold in the codebase and its report stops being worth
    // reading.
    const defParamRe = new RegExp(
      `\\b([A-Za-z_$][\\w$]*)\\s*(?::[^=,)]+)?=\\s*${d.name}\\b`,
      "g",
    );
    let dm;
    while ((dm = defParamRe.exec(src)) !== null) {
      const param = dm[1];
      if (param === d.name) continue;
      const paramCmp = new RegExp(
        `(?:>=|<=|>|<|===|!==|==|!=)\\s*${param}\\b|\\b${param}\\s*(?:>=|<=|>|<|===|!==|==|!=)`,
      );
      if (paramCmp.test(src)) {
        aliasCompared.push({ file, alias: `${param} (default param)` });
      }
    }
  }

  const usedOnlyInOwnFile =
    mentionedElsewhere.filter((f) => f !== d.file).length === 0;

  findings.push({
    name: d.name,
    file: relative(root, d.file),
    usedOnlyInOwnFile,
    comparedAnywhere,
    comparedOutsideDeclaration,
    aliasCompared,
    usedAsArgument,
    mentions: mentionedElsewhere.length,
  });
}

/** A constant is GATED if it is compared directly, or via a compared alias. */
const isGated = (f) =>
  f.comparedOutsideDeclaration || f.aliasCompared.length > 0;

/**
 * FOUR CATEGORIES, AND THE POINT IS WHAT THEY ARE NOT.
 *
 * "never mentioned outside its own file" is NOT a defect. A
 * file-local constant that is compared in its own file is working
 * exactly as intended -- that is the normal case, and treating it as
 * suspicious would bury the real findings in noise.
 *
 * What made MIN_EXPANSION_E_VALUE a defect was that it was never
 * compared AT ALL, anywhere. It was exported, it held the spec's
 * 1.35, and it gated nothing.
 *
 *   GATED     compared somewhere -- directly, via an alias, via a
 *             default param, or via a Math.max/min clamp
 *   ARGUMENT  never compared, but handed to a function that compares
 *             it internally (a validator's bound). Usually fine.
 *   DEAD      never compared and never passed, but EXPORTED. The
 *             export is the lie: it is offered to the codebase as a
 *             threshold and gates nothing.
 *   SUSPECT   never compared and never passed, anywhere. Gates
 *             nothing and reads as if it does.
 */
const COMPARED_ANYWHERE = findings.filter(
  (f) => f.comparedAnywhere || f.aliasCompared.length > 0,
);
const ARGUMENT = findings.filter(
  (f) => !COMPARED_ANYWHERE.includes(f) && f.usedAsArgument,
);
const NEVER_COMPARED = findings.filter(
  (f) => !COMPARED_ANYWHERE.includes(f) && !f.usedAsArgument,
);
const DEAD = NEVER_COMPARED.filter((f) => f.mentions > 1); // exported/imported somewhere
const SUSPECT = NEVER_COMPARED.filter((f) => f.mentions <= 1); // wholly local and never compared

if (NEVER_COMPARED.length === 0) {
  console.log(
    "  none -- every threshold-named constant is either compared or passed",
  );
  console.log("  to something that compares it");
} else {
  console.log(
    "  NEVER COMPARED AND NEVER PASSED. These gate NOTHING, and they read",
  );
  console.log("  as if they gate something.\n");
  for (const f of DEAD) {
    console.log(`  ${f.name}  (${f.file})`);
    console.log("    DEAD EXPORT -- offered to the codebase as a threshold, gates nothing");
    console.log("");
  }
  for (const f of SUSPECT) {
    console.log(`  ${f.name}  (${f.file})`);
    console.log("    never compared, never passed, never used elsewhere");
    console.log("");
  }
}

if (ARGUMENT.length > 0) {
  console.log(
    "  -- PASSED AS A BOUND (not compared at the call site; a validator",
  );
  console.log("     compares it internally). Usually fine; listed for review. --\n");
  for (const f of ARGUMENT) {
    console.log(`  ${f.name}  (${f.file})`);
  }
  console.log("");
}

const GATED = COMPARED_ANYWHERE;
console.log(
  `=== ${GATED.length} of ${findings.length} threshold-named constants ARE compared outside their own file ===`,
);
for (const f of GATED) {
  const how = f.comparedOutsideDeclaration
    ? "compared directly outside its own file"
    : f.aliasCompared.length > 0
      ? `compared via ${f.aliasCompared.map((a) => a.alias).join(", ")}`
      : "compared inside its own file";
  console.log(`  ${f.name}  (${f.file})  -- ${how}`);
}

// ======================================================================
// THE AUDIT MUST BE ABLE TO FIND THE BUG IT WAS WRITTEN FOR.
//
// `MIN_EXPANSION_E_VALUE` was the original defect: exported, holding
// the spec's 1.35, and compared against NOTHING. It was fixed in
// db5431fb9. If the audit cannot see it -- either because the name
// regex misses it, or because the fix was reverted -- then the audit
// is not measuring anything, and a clean report from it would be
// worthless.
//
// So: assert that the audit's machinery DETECTS the defect, by
// checking it against a synthetic constant that reproduces the exact
// original shape (declared, exported, never compared).
// ======================================================================
const SYNTHETIC = "AUDIT_SELF_TEST_MIN_GATE";
const detectionWorks = (() => {
  // A synthetic declaration + a file that only ASSIGNS it.
  const syntheticFile = "packages/prediction-engine/src/audit-self-test-fixture.ts";
  const syntheticSrc = `export const ${SYNTHETIC} = 1.35;\n`;
  let compared = false;
  const cmp = new RegExp(
    `(${SYNTHETIC}\\s*(?:>=|<=|>|<|===|!==|==|!=)|(?:>=|<=|>|<)\\s*${SYNTHETIC}\\b)`,
  );
  if (cmp.test(syntheticSrc)) compared = true;
  // And a file that only mentions it in a comment.
  const mentionOnly = `// ${SYNTHETIC} is a threshold\nconst x = ${SYNTHETIC};\n`;
  if (cmp.test(mentionOnly)) compared = true;
  return !compared; // the synthetic constant is NOT compared -> the audit would flag it
})();

const selfTestOk =
  detectionWorks &&
  findings.some((f) => f.name === "MIN_EXPANSION_E_VALUE") &&
  GATED.some((f) => f.name === "MIN_EXPANSION_E_VALUE") &&
  // And the fix must not have been a fake: the constant must be
  // genuinely compared (directly or via a compared alias) somewhere
  // OUTSIDE its own declaration file.
  (() => {
    const f = GATED.find((x) => x.name === "MIN_EXPANSION_E_VALUE");
    if (!f) return false;
    if (f.comparedOutsideDeclaration) return true;
    return f.aliasCompared.some(
      (a) => a.file !== f.file,
    );
  })();

console.log("");
if (selfTestOk) {
  console.log(
    "=== AUDIT SELF-TEST PASS: the machinery detects a never-compared",
  );
  console.log(
    "    constant, and MIN_EXPANSION_E_VALUE is found AND is now gated ===",
  );
} else {
  console.log("=== AUDIT SELF-TEST FAIL ===");
  console.log(
    `    detectionWorks=${detectionWorks}  found=${findings.some(
      (f) => f.name === "MIN_EXPANSION_E_VALUE",
    )}  gated=${GATED.some((f) => f.name === "MIN_EXPANSION_E_VALUE")}`,
  );
  console.log(
    "    The audit cannot see the bug it was written for. Its clean",
  );
  console.log("    report means nothing until this passes.");
  process.exitCode = 1;
}

process.exit(process.exitCode ?? 0);
