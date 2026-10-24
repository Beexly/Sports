#!/usr/bin/env node
/**
 * ARE THE SUBAGENTS' CONSTANTS ACTUALLY GATED?
 *
 * The three frontier modules were written by subagents. The house
 * convention -- the one this whole codebase is being audited for --
 * is that every threshold-named constant must be COMPARED against
 * something. A constant that is exported and never compared is a
 * label that reads like a check and gates nothing.
 *
 * A passing test suite proves the module does what its own tests say.
 * It does NOT prove the constants gate anything: a module can be
 * internally consistent and still export a decorative threshold.
 *
 * So this is the same sweep as
 * reconciliation/_audit_unenforced_thresholds.mjs, run over the three
 * new modules, with the same rules:
 *
 *   GATED     compared directly, via an alias that is compared, via a
 *             Math.max/min clamp, via a default parameter whose
 *             parameter is compared, via a SQL comparison, or as a
 *             bound passed to a validator
 *   SUSPECT   never compared, and never passed anywhere
 *
 * Reproduce: node reconciliation/_audit_frontier_constants.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODULES = [
  "packages/prediction-engine/src/causal/proximal-bridge-id.ts",
  "packages/prediction-engine/src/causal/semiparametric-estimand-solver.ts",
  "packages/prediction-engine/src/calibration/itcr-orca-gate.ts",
];
const THRESHOLD_NAME =
  /^(?:MIN|MAX)[A-Z0-9_]*$|^DEFAULT_.*(?:LIMIT|THRESHOLD|MAX|MIN|CAP|CEILING|FLOOR)$|.*_(?:THRESHOLD|LIMIT|MIN|MAX|CEILING|FLOOR|CAP|EPSILON|TOLERANCE)$/;

console.log("=== SCANNING THE THREE FRONTIER MODULES ===\n");

const findings = [];
for (const rel of MODULES) {
  const src = readFileSync(join(root, rel), "utf8");

  // The declarations.
  const declRe = /export\s+const\s+([A-Z][A-Z0-9_]*)\s*[:=]/g;
  const names = [];
  let m;
  while ((m = declRe.exec(src)) !== null) {
    if (THRESHOLD_NAME.test(m[1])) names.push(m[1]);
  }

  for (const name of names) {
    let compared = false;
    let comparedOutside = false;
    const how = [];

    // 1. A direct comparison.
    const cmp = new RegExp(
      `(${name}\\s*(?:>=|<=|>|<|===|!==|==|!=)|(?:>=|<=|>|<|===|!==|==|!=)\\s*${name}\\b)`,
    );
    if (cmp.test(src)) {
      compared = true;
      how.push("compared directly");
    }
    // 2. A Math.max/min clamp, with the constant in EITHER position.
    if (
      new RegExp(`Math\\.(?:max|min)\\s*\\(\\s*${name}\\b`).test(src) ||
      new RegExp(`Math\\.(?:max|min)\\s*\\([^;]{0,160}?,\\s*${name}\\s*\\)`).test(src)
    ) {
      compared = true;
      how.push("Math.max/min clamp");
    }
    // 3. An alias that is compared.
    const aliasRe = new RegExp(
      `(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=]+)?=\\s*[^;\\n]*\\b${name}\\b`,
      "g",
    );
    let am;
    while ((am = aliasRe.exec(src)) !== null) {
      const alias = am[1];
      if (alias === name) continue;
      if (
        new RegExp(
          `(?:>=|<=|>|<|===|!==|==|!=)\\s*${alias}\\b|\\b${alias}\\s*(?:>=|<=|>|<|===|!==|==|!=)`,
        ).test(src)
      ) {
        compared = true;
        how.push(`alias ${alias} compared`);
      }
    }
    // 4. A default parameter whose parameter is compared.
    const defRe = new RegExp(
      `\\b([A-Za-z_$][\\w$]*)\\s*(?::[^=,)]+)?=\\s*${name}\\b`,
      "g",
    );
    let dm;
    while ((dm = defRe.exec(src)) !== null) {
      const param = dm[1];
      if (param === name) continue;
      if (
        new RegExp(
          `(?:>=|<=|>|<|===|!==|==|!=)\\s*${param}\\b|\\b${param}\\s*(?:>=|<=|>|<|===|!==|==|!=)`,
        ).test(src)
      ) {
        compared = true;
        how.push(`default param ${param} compared`);
      }
    }
    // 5. A bound passed to a validator (the LAST argument of a call
    //    whose name suggests a bound).
    if (
      new RegExp(
        `(?:require|check|validate|assert|ensure|clamp|bound|limit)[A-Za-z]*\\s*\\([^;]{0,120}?,\\s*${name}\\s*\\)`,
        "i",
      ).test(src)
    ) {
      compared = true;
      how.push("passed as a validator bound");
    }

    findings.push({ module: rel, name, compared, how });
  }
}

const suspect = findings.filter((f) => !f.compared);
const gated = findings.filter((f) => f.compared);

console.log("=== THE CONSTANTS AND HOW THEY GATE ===\n");
for (const f of findings) {
  const mark = f.compared ? "GATED  " : "SUSPECT";
  console.log(`  ${mark} ${f.name}`);
  console.log(`         ${f.module}`);
  console.log(
    `         ${f.compared ? f.how.join("; ") : "NEVER COMPARED -- it gates nothing"}`,
  );
}

console.log(
  `\n=== ${gated.length} of ${findings.length} threshold constants are COMPARED ===`,
);
if (suspect.length > 0) {
  console.log(
    `\n=== ${suspect.length} SUSPECT: exported but never compared ===`,
  );
  for (const f of suspect) {
    console.log(`  ${f.name}  (${f.module})`);
  }
  process.exit(1);
} else {
  console.log("\n=== VERDICT: every threshold constant in the three modules GATES ===");
  console.log("    something. None of them is a decorative label.");
}
