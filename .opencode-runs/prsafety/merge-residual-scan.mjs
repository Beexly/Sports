#!/usr/bin/env node
/**
 * merge-residual-scan — does a PR do something to main that a line-count triage misses?
 *
 * WHY THIS EXISTS
 * The 30-PR triage was scored from `git diff origin/main...<pr>` (three-dot, the
 * PR's own contribution). That view is correct for "how big is this PR" and wrong
 * for "what does merging this do to main". Two real examples from the 2026-09-29
 * backlog:
 *
 *   #888  three-dot says AGENTS.md +7/-7. Merging it deletes 866 lines of
 *         AGENTS.md and, because the branch is 298 behind, its tree is missing
 *         3,206 files that main now has. The "small diff" was the tip of a revert.
 *   #913  three-dot says conformal-margin-set.ts +26/-18. Merging it introduces
 *         `Number.POSITIVE_INFINITY` into an interval that is persisted and
 *         serialised. JSON.stringify(Infinity) is `null` — the change is a real
 *         fail-closed improvement and also a silent data-shape change.
 *
 * Neither shows up if you only read the three-dot numstat. This guard reads the
 * 3-way MERGE result instead: `git merge-tree --write-tree` produces the tree that
 * would actually land, and diffing main against THAT is the true residual.
 *
 * WHAT IT FAILS ON
 *   1. main-parity      the merge would delete tracked files main has
 *   2. source-deletion  the merge removes lines from non-doc, non-test source
 *   3. doc-deletion     the merge removes lines from docs/ or *.md above a budget
 *   4. nonfinite-narrow adds Infinity/NaN to code that is persisted or serialised
 *   5. lockfile         a lockfile changes without the matching manifest change
 *   6. gate-shrink      a CI workflow step is removed, not just added
 *   7. secret-shape     added lines look like a live credential
 *
 * Fail means "a human must look", not "this PR is bad". Every finding prints the
 * exact command to reproduce it.
 *
 * Usage:
 *   node scripts/guardrails/merge-residual-scan.mjs 913
 *   node scripts/guardrails/merge-residual-scan.mjs 913 --base origin/main
 *   node scripts/guardrails/merge-residual-scan.mjs 913 --budget-docs 20 --json
 *   node scripts/guardrails/merge-residual-scan.mjs --selftest
 */
import { spawnSync } from "node:child_process";

function flag(name, dflt) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? dflt : hit.slice(name.length + 3);
}
const has = (name) => process.argv.includes(`--${name}`);

const BUDGET_DOC_LINES = Number(flag("budget-docs", "20"));
const BUDGET_SRC_LINES = Number(flag("budget-src", "0"));

const DOC = /(^|\/)(docs|handoff)\/|\.md$/i;
const TEST = /\.test\.|\.spec\.|__tests__\//i;
const SOURCE = /\.(ts|tsx|js|mjs|cjs|py|sql|json|ya?ml|sh)$/i;
const LOCKFILES = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.ya?ml|poetry\.lock|Cargo\.lock|Pipfile\.lock)$/i;
const MANIFESTS = /(^|\/)(package\.json|pyproject\.toml|Cargo\.toml|go\.mod)$/i;
const WORKFLOWS = /^\.github\/workflows\//;
const CI_STEP = /^\s*-\s*name:/;

const SECRET = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{30,}/,
  /gho_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{50,}/,
  /sk-[A-Za-z0-9]{32,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?:postgres|postgresql|mysql|redis|mongodb)(?:\+\w+)?:\/\/[^\s"']*:[^\s"'@]+@/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./,
  /AIza[0-9A-Za-z_-]{35}/,
];

function git(args, opts = {}) {
  const r = spawnSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });
  if (r.error) throw r.error;
  return r;
}

function numstatLine(l) {
  const t = l.split("\t");
  if (t.length !== 3) return null;
  const a = t[0] === "-" ? 0 : Number(t[0]);
  const d = t[1] === "-" ? 0 : Number(t[1]);
  if (!Number.isFinite(a) || !Number.isFinite(d)) return null;
  return { path: t[2], add: a, del: d };
}

/** Every CI step name in a given tree's ci.yml. */
function ciSteps(ref) {
  const raw = git(["show", `${ref}:.github/workflows/ci.yml`]);
  if (raw.status !== 0) return null;
  return raw.stdout
    .split("\n")
    .map((l) => l.match(CI_STEP))
    .filter(Boolean)
    .map((m) => m[0].replace(/^\s*-\s*name:\s*/, "").trim());
}

export function scan(prNumber, opts = {}) {
  const base = opts.base ?? "origin/main";
  const ref = opts.ref ?? `refs/remotes/pr/${prNumber}`;
  const budgetDocs = opts.budgetDocs ?? BUDGET_DOC_LINES;
  const budgetSrc = opts.budgetSrc ?? BUDGET_SRC_LINES;

  const findings = [];
  const add = (rule, severity, detail, repro) =>
    findings.push({ rule, severity, detail, repro });

  const headExists = git(["rev-parse", "--verify", "--quiet", ref]).status === 0;
  if (!headExists) {
    return {
      pr: prNumber,
      base,
      ok: false,
      findings: [
        {
          rule: "ref-missing",
          severity: "block",
          detail: `no local ref ${ref}. Fetch it first:
  git fetch origin refs/pull/${prNumber}/head:refs/remotes/pr/${prNumber}`,
          repro: `git fetch origin refs/pull/${prNumber}/head:refs/remotes/pr/${prNumber}`,
        },
      ],
    };
  }

  // `merge-tree --write-tree` prints the result tree on the FIRST line, then one
  // line per conflicted path. It exits 0 even when there are conflicts on git
  // >= 2.38, so the tree must be read from stdout, NOT inferred from exit status —
  // inferring it is what lets a conflicting PR (i.e. every dangerous one) skip the
  // residual analysis entirely and report clean.
  const mt = git(["merge-tree", "--write-tree", "--name-only", base, ref]);
  const lines = mt.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  const looksLikeTree = (s) => /^[0-9a-f]{40,64}$/.test(s);
  const resultTree = looksLikeTree(lines[0]) ? lines[0] : null;
  const conflicts = resultTree ? lines.slice(1) : [];
  if (conflicts.length > 0) {
    add(
      "conflicts",
      "warn",
      `${conflicts.length} conflicting path(s) — the merge will not land as-is and must be rebased first. ` +
        `The residual below is still measured, because a rebase can silently resolve a conflict in the wrong direction.`,
      `git merge-tree --write-tree --name-only ${base} ${ref}`,
    );
  } else if (!resultTree) {
    add(
      "merge-tree-failed",
      "block",
      `could not compute a merge result for ${base}...${ref}. git said:\n${(mt.stderr || mt.stdout).trim().slice(0, 300)}`,
      `git merge-tree --write-tree --name-only ${base} ${ref}`,
    );
  }

  let residual = [];
  let statusByPath = [];
  if (resultTree) {
    for (const l of git(["diff", "--numstat", base, resultTree]).stdout.split("\n")) {
      const p = numstatLine(l);
      if (p) residual.push(p);
    }
    for (const l of git(["diff", "--name-status", base, resultTree]).stdout.split("\n")) {
      const t = l.split("\t");
      if (t.length >= 2) statusByPath.push({ status: t[0], path: t[t.length - 1] });
    }
  }

  // 1. main-parity: files this merge would delete from main.
  const deleted = statusByPath.filter((f) => f.status === "D").map((f) => f.path);
  if (deleted.length > 0) {
    const srcDel = deleted.filter((p) => !DOC.test(p) && !TEST.test(p));
    add(
      "main-parity",
      srcDel.length > 0 ? "block" : "warn",
      `merge deletes ${deleted.length} tracked file(s) from main, ${srcDel.length} of them non-doc/non-test` +
        (srcDel.length ? `:\n${srcDel.slice(0, 20).map((p) => `      - ${p}`).join("\n")}` : ""),
      `git diff --name-status ${base} ${resultTree}`,
    );
  }

  // 2/3. source and doc deletions in the merge result.
  const srcLines = residual.filter((r) => r.del > 0 && SOURCE.test(r.path) && !DOC.test(r.path) && !TEST.test(r.path));
  if (srcLines.length > 0 && srcLines.reduce((s, r) => s + r.del, 0) > budgetSrc) {
    add(
      "source-deletion",
      "block",
      `merge removes ${srcLines.reduce((s, r) => s + r.del, 0)} line(s) from ${srcLines.length} source file(s):\n` +
        srcLines.slice(0, 20).map((r) => `      -${String(r.del).padStart(4)}  ${r.path}`).join("\n"),
      `git diff ${base} ${resultTree} -- ${srcLines[0].path}`,
    );
  }

  const docLines = residual.filter((r) => r.del > 0 && DOC.test(r.path));
  const docTotal = docLines.reduce((s, r) => s + r.del, 0);
  if (docTotal > budgetDocs) {
    add(
      "doc-deletion",
      docTotal > 500 ? "block" : "warn",
      `merge removes ${docTotal} doc line(s) across ${docLines.length} file(s) (budget ${budgetDocs}). ` +
        `Three-dot numstat will usually NOT show this.`,
      `git diff --stat ${base} ${resultTree} -- '*.md' 'docs/**'`,
    );
  }

  // 4. non-finite narrow: Infinity/NaN introduced into persisted/serialised code.
  const NONFINITE = /Number\.POSITIVE_INFINITY|Number\.NEGATIVE_INFINITY|\bInfinity\b|\bNaN\b/;
  for (const r of residual) {
    if (r.add === 0) continue;
    if (DOC.test(r.path) || TEST.test(r.path) || !SOURCE.test(r.path)) continue;
    const body = git(["diff", "-U0", base, resultTree, "--", r.path]).stdout;
    const added = body.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
    const hits = added.filter((l) => NONFINITE.test(l));
    if (hits.length > 0) {
      add(
        "nonfinite-narrow",
        "warn",
        `${r.path} introduces a non-finite value in ${hits.length} added line(s). ` +
          `JSON.stringify(Infinity) is null and Postgres numeric columns reject it — ` +
          `confirm every consumer of this value:\n` +
          hits.slice(0, 4).map((l) => `      ${l.slice(0, 140)}`).join("\n"),
        `git diff ${base} ${resultTree} -- ${r.path}`,
      );
    }
  }

  // 5. lockfile without a manifest change in the same merge.
  const changed = new Set(residual.map((r) => r.path));
  const locks = [...changed].filter((p) => LOCKFILES.test(p));
  const manifests = [...changed].filter((p) => MANIFESTS.test(p));
  if (locks.length > 0 && manifests.length === 0) {
    add(
      "lockfile",
      "warn",
      `${locks.join(", ")} changes with no package.json/manifest change in the same merge. ` +
        `A hand-edited lockfile is the classic silent supply-chain change.`,
      `git diff ${base} ${resultTree} -- ${locks[0]}`,
    );
  } else if (locks.length > 0) {
    add(
      "lockfile",
      "info",
      `${locks.join(", ")} + ${manifests.length} manifest change(s) — dependency bump. ` +
        `Confirm each bump is intentional and run \`npm ci\` locally.`,
      `git diff ${base} ${resultTree} -- ${locks[0]}`,
    );
  }

  // 6. gate-shrink: CI steps removed.
  if (resultTree) {
    const before = ciSteps(base);
    const after = ciSteps(resultTree);
    if (before && after) {
      const kept = new Set(after);
      const removed = before.filter((s) => !kept.has(s));
      if (removed.length > 0) {
        add(
          "gate-shrink",
          "block",
          `merge REMOVES ${removed.length} CI step(s) from .github/workflows/ci.yml:\n` +
            removed.map((s) => `      - ${s}`).join("\n") +
            `\n      Adding gates is safe. Removing one is a behaviour change to CI itself.`,
          `git diff ${base} ${resultTree} -- .github/workflows/ci.yml`,
        );
      }
    }
  }

  // 7. secret-shape in added lines.
  for (const r of residual) {
    if (r.add === 0) continue;
    const body = git(["diff", "-U0", base, resultTree, "--", r.path]).stdout;
    const added = body.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
    const hit = added.find((l) => SECRET.some((re) => re.test(l)));
    if (hit) {
      // A shell template with ${VAR} interpolation is not a credential.
      const interpolated = /\$\{[^}]+\}/.test(hit);
      add(
        "secret-shape",
        interpolated ? "info" : "block",
        `${r.path}: ${interpolated ? "credential-shaped template (interpolated var) — review" : "possible live credential"}\n      ${hit.slice(0, 140)}`,
        `git diff ${base} ${resultTree} -- ${r.path}`,
      );
    }
  }

  return {
    pr: prNumber,
    base,
    resultTree,
    conflicted: conflicts.length,
    files: residual.length,
    add: residual.reduce((s, r) => s + r.add, 0),
    del: residual.reduce((s, r) => s + r.del, 0),
    ok: findings.every((f) => f.severity !== "block"),
    findings,
  };
}

// --- selftest: each rule must fire on a real historical PR, or on a synthetic
// case built here. A guard that cannot fail is worse than no guard.
function selftest() {
  const cases = [
    { pr: 888, must: "main-parity|doc-deletion", why: "revert-shaped: 3206 files behind, 866 AGENTS.md lines" },
    { pr: 913, must: "source-deletion|nonfinite-narrow", why: "fail-closed change that persists Infinity" },
    { pr: 876, must: "lockfile|source-deletion", why: "dependency bump across 7 manifests" },
    { pr: 922, must: null, why: "clean docs-only PR: must NOT block" },
  ];
  let failed = 0;
  for (const c of cases) {
    let r;
    try {
      r = scan(c.pr);
    } catch (e) {
      console.log(`FAIL  #${c.pr} threw: ${e.message}`);
      failed++;
      continue;
    }
    const rules = r.findings.map((f) => f.rule).join(",");
    if (c.must === null) {
      const blockers = r.findings.filter((f) => f.severity === "block");
      console.log(
        `${blockers.length === 0 ? "PASS" : "FAIL"}  #${c.pr} expected clean, got: ${rules || "(none)"} — ${c.why}`,
      );
      if (blockers.length > 0) failed++;
    } else {
      const hit = c.must.split("|").some((m) => rules.includes(m));
      console.log(`${hit ? "PASS" : "FAIL"}  #${c.pr} expected ${c.must}, got: ${rules || "(none)"} — ${c.why}`);
      if (!hit) failed++;
    }
  }
  console.log(failed === 0 ? "\nselftest: all guards fire as expected" : `\nselftest: ${failed} case(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
}

if (has("selftest")) {
  selftest();
} else {
  const prs = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
  if (prs.length === 0) {
    console.error("usage: merge-residual-scan.mjs <pr-number>... [--base=origin/main] [--budget-docs=N] [--budget-src=N] [--json] [--selftest]");
    process.exit(2);
  }
  const reports = prs.map((n) => scan(n));
  if (has("json")) {
    console.log(JSON.stringify(reports, null, 2));
  } else {
    for (const r of reports) {
      console.log(`\n=== PR #${r.pr} vs ${r.base} ===`);
      if (r.conflicted) console.log(`  ${r.conflicted} conflicting path(s) — rebase required before any of this is measurable.`);
      if (r.resultTree) console.log(`  merge result: ${r.files} file(s), +${r.add}/-${r.del}`);
      if (r.findings.length === 0) console.log("  clean — no residual findings.");
      for (const f of r.findings) {
        console.log(`\n  [${f.severity.toUpperCase()}] ${f.rule}\n    ${f.detail}\n    repro: ${f.repro}`);
      }
      console.log(`\n  verdict: ${r.ok ? "PASS (no blockers)" : "BLOCKED — a human must clear each blocker above"}`);
    }
  }
  process.exit(reports.every((r) => r.ok) ? 0 : 1);
}
