#!/usr/bin/env node
/**
 * silent-failure-scan.mjs — scanner for the "null/zero looks like a reading"
 * defect class that let the 2026-09-29 DB outage stay invisible for 8h.
 *
 * THE CLASS. A healthy production records a VALUE. A null, zero, empty string,
 * or literal constant renders in the same JSON shape, so a monitor or an
 * operator cannot tell "measured zero" from "never measured". The incident's
 * own tell was `operatorHint: "Failed to query IngestionRun"` beside a field
 * that should have held a number.
 *
 * RULES (each fires only on a shape that can produce an indistinguishable render):
 *   R1 zero-substitution   a `X ?? 0` / `X || 0` coercion fed to an evaluator
 *                          whose job is to judge a proof threshold.
 *   R2 null-as-healthy     a `null` reading coerced to a HEALTHY boolean by a
 *                          guard that treats absent as "not a problem".
 *   R3 empty-equals-ok     an aggregate over a possibly-empty collection whose
 *                          vacuous truth is `ok: true`.
 *   R4 constant-as-measure a literal constant in a field that otherwise carries
 *                          an observation, with no "unmeasured" state.
 *
 * Read-only. Exit 0 always (a scanner that exits 1 on findings cannot be wired
 * into a gate without also being a gate flip). `--selftest` proves each rule
 * can fire; a rule that cannot fire while reporting zero is a broken rule.
 *
 * node handoff/silent-failure-scan.mjs [--selftest] [--json]
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO = process.cwd();
const SKIP = new Set([
  "node_modules", ".next", ".git", "dist", "build", "coverage",
  ".vercel", "playwright-report", "test-results", "ds-bundle",
]);

function walk(dir, out = []) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) out.push(p);
  }
  return out;
}

/* ── rules ─────────────────────────────────────────────────────────────── */

// R1: a `?? 0` / `|| 0` whose left side is nullable, passed to a gate/evaluator.
const R1 = /\?\?\s*0\b|\|\|\s*0\b/g;
// The evaluators these zeros reach — a zero here is a PROOF verdict, not a count.
const PROOF_EVALUATORS = [
  "evaluateRevenueLadder", "evaluatePhaseAdvance", "evaluateRevenueLadder(",
  "loadCalibrationOpsSurface", "planAutonomyCycle", "evaluatePublicClvPolicy",
];

// R2: `X != null && X < T` where the null branch is the HEALTHY one. Structurally
// this is a null-guard whose short-circuit is indistinguishable from a healthy
// reading. A named constant (LOW_QUOTA_THRESHOLD) is fine; the defect is that
// the guard exists at all on a field the caller also feeds to a monitor.
// The capture must span dots (`res.oddsApiRemainingRequests`), or the
// backreference can never match and the rule silently reports zero.
const R2 = /([\w.]+)\s*!=\s*null\s*&&\s*\1\s*[<>]=?\s*/g;

// R3: `.every(` over a collection that can be empty.
const R3 = /(\w+)\s*=\s*\{\s*\}|\.values\((\w+)\)\s*\.every\(/g;

// R4: a bare literal (not a named constant) assigned to a measurement-shaped
// field. A named constant IS traceable; a bare `600` in the object is the
// literal that reads as a measurement with no "unmeasured" state.
const MEASUREMENT_FIELDS =
  "dailyBudget|budget|quota|threshold|maxDuration|limit|paceOk|withinSla|ageMinutes";
const R4 = new RegExp(`\\b(${MEASUREMENT_FIELDS})\\s*[:=]\\s*(\\d+|true|false)\\b`, "gi");

function scanText(text, file) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const n = i + 1;
    const rel = relative(REPO, file);

    // R1 — a zero that reaches a proof evaluator somewhere in this file.
    if (R1.test(line) && PROOF_EVALUATORS.some((e) => text.includes(e))) {
      if (/\?\?\s*0\b|\|\|\s*0\b/.test(line)) {
        findings.push({
          rule: "R1", file: rel, line: n, severity: "high",
          snippet: line.trim().slice(0, 160),
          why: "a nullable reading is coerced to 0 before a proof evaluator; " +
               "0 is indistinguishable from a real measured zero",
        });
      }
    }
    R1.lastIndex = 0;

    // R2 — a null reading that a guard maps to the healthy branch.
    R2.lastIndex = 0;
    if (R2.test(line)) {
      findings.push({
        rule: "R2", file: rel, line: n, severity: "high",
        snippet: line.trim().slice(0, 160),
        why: "null short-circuits to the healthy branch; an unmeasurable " +
             "reading renders identical to a healthy one",
      });
    }

    // R3 — vacuous truth over a collection.
    if (/\.every\(/.test(line) && /(checks|capabilities|results|items|entries)/.test(line)) {
      findings.push({
        rule: "R3", file: rel, line: n, severity: "medium",
        snippet: line.trim().slice(0, 160),
        why: "aggregate over a possibly-empty collection; empty passes vacuously",
      });
    }
    R3.lastIndex = 0;

    // R4 — literal constant in a measurement field.
    R4.lastIndex = 0;
    let m;
    while ((m = R4.exec(line)) !== null) {
      if (/^\s*(\/\/|\*)/.test(line)) continue; // a comment is not a value
      if (/\bconst\s/.test(line) && /=/.test(line)) continue; // a declaration is traceable
      findings.push({
        rule: "R4", file: rel, line: n, severity: "low",
        snippet: line.trim().slice(0, 160),
        why: `literal ${m[2]} in field "${m[1]}" with no unmeasured state`,
      });
    }
  });
  return findings;
}

/* ── selftest ───────────────────────────────────────────────────────────── */

const SPECIMENS = {
  R1: { good: "const n = sample?.canonicalSettled ?? 0;\nevaluateRevenueLadder({canonicalSettled: n});",
        bad:  "const n = 0;\nconst label = 'x';\n" },
  R2: { good: "return res.oddsApiRemainingRequests != null && res.oddsApiRemainingRequests < 10;",
        bad:  "return Math.min(a, b) > 0;" },
  R3: { good: "const allOk = Object.values(checks).every((c) => c.status === \"ok\");",
        bad:  "const total = a + b;" },
  R4: { good: "const t = {\n  dailyBudget: 600,\n};",
        bad:  "dailyBudget: DAILY_BUDGET," },
};

function selftest() {
  let pass = true;
  for (const [rule, s] of Object.entries(SPECIMENS)) {
    const fired = scanText(s.good, join(REPO, "SELFTEST.ts"));
    const clean = scanText(s.bad, join(REPO, "SELFTEST.ts"));
    const ok = fired.some((f) => f.rule === rule) && !clean.some((f) => f.rule === rule);
    if (!ok) pass = false;
    console.log(
      `  ${ok ? "PASS" : "FAIL"} ${rule}: specimen fires=${fired.some((f) => f.rule === rule)} ` +
      `control clean=${!clean.some((f) => f.rule === rule)}`,
    );
  }
  return pass;
}

/* ── main ──────────────────────────────────────────────────────────────── */

const asJson = process.argv.includes("--json");
const doSelftest = process.argv.includes("--selftest");

console.log("── selftest ──");
if (!selftest()) {
  console.error("SELFTEST FAILED — a rule cannot fire; the zero findings below are worthless.");
  process.exit(2);
}
if (doSelftest) {
  console.log("\nselftest passed; stopping before the repo sweep (pass --json to sweep too).");
  process.exit(0);
}

console.log("\n── repo sweep ──");
const roots = ["apps/web/app", "apps/web/lib", "packages", "lib", "workers"];
const files = roots.flatMap((r) => walk(join(REPO, r)));
const all = files.flatMap((f) => scanText(readFileSync(f, "utf8"), f));

const byRule = {};
for (const f of all) (byRule[f.rule] ??= []).push(f);

console.log(`scanned ${files.length} files (node_modules/.next/build skipped)\n`);
for (const rule of ["R1", "R2", "R3", "R4"]) {
  const hits = byRule[rule] ?? [];
  console.log(`${rule}: ${hits.length}`);
  if (asJson) for (const h of hits) console.log(`    ${h.file}:${h.line}  ${h.snippet}`);
}
console.log(`\ntotal: ${all.length}`);

// Dedupe to one finding per (rule, file) so the report is an index, not a dump.
const seen = new Set();
const index = all
  .filter((f) => { const k = `${f.rule}|${f.file}`; if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file));

if (asJson) console.log("\n" + JSON.stringify(index, null, 2));
else {
  console.log("\n── index (rule × file) ──");
  for (const f of index) console.log(`${f.rule}  ${f.severity.padEnd(6)}  ${f.file}:${f.line}`);
}
process.exit(0);
