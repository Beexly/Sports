#!/usr/bin/env node
/**
 * shell-defensive — ratchet guardrail for shell scripts.
 *
 * WHY
 * ---
 * Measured 2026-11-04 on this repo: 17 non-fixture tracked shell scripts,
 * 2 with strict mode, 0 with an ERR/EXIT trap, 1 piping curl into sh, and 4
 * with an unguarded `cd`. Two of those were not theoretical:
 *
 *   - docs/research/.../fetch.sh began with `cd ~/workspace/skills/github`
 *     and no `|| exit`. The directory did not exist, so the script ran from
 *     the caller's cwd, found no repos.txt, looped zero times, printed DONE
 *     and exited 0. A run that did nothing reported success.
 *   - docker/oracle-vps/deploy.sh ran `curl -fsSL https://get.docker.com | sh`.
 *     Under `set -e` a failed curl still feeds sh an empty script and the
 *     pipeline reports sh's status, so a download failure looked like success —
 *     and nothing was inspected before execution.
 *
 * DESIGN: a RATCHET, not a blanket demand. Demanding strict mode across every
 * existing script would be a false claim and would break scripts that rely on
 * unset variables. Instead the current violations are snapshotted into a
 * baseline; the gate fails only on a violation that is absent from it. Existing
 * debt is frozen, new debt is refused, and shrinking the baseline is a
 * deliberate act.
 *
 * Checks are restricted to three objective, low-noise rules. Heuristics such as
 * "rm -rf on an unvalidated variable" are deliberately NOT included: `rm -rf`
 * on a mktemp dir is correct, and a noisy gate gets switched off.
 *
 * USAGE
 *   node scripts/guardrails/shell-defensive.mjs            # gate (exit 1 on new)
 *   node scripts/guardrails/shell-defensive.mjs --update   # rewrite baseline
 *   node scripts/guardrails/shell-defensive.mjs --list     # print baseline
 *   node scripts/guardrails/shell-defensive.mjs --root <dir>
 *
 * EXIT: 0 clean | 1 new violation(s) | 2 cannot run
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, relative, sep } from "node:path";

const BASELINE = "scripts/guardrails/shell-defensive.baseline.json";
const TAG = "[shell-defensive]";

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Fixtures are intentionally non-compliant; they test other guards. */
function isFixture(relPath) {
  return relPath.split(sep).includes("fixtures");
}

async function listScripts(root) {
  let tracked = [];
  try {
    // `git ls-files` resolves the ENCLOSING repository, not necessarily `root`.
    // On a host where a parent directory is itself a repo (this one is), a
    // non-repo --root silently returns the parent's file list and the guard
    // passes a bad script. Verify the toplevel actually is `root` first.
    const toplevel = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const sameRepo =
      resolve(toplevel).toLowerCase() === resolve(root).toLowerCase();
    if (!sameRepo) throw new Error("root is not the git toplevel");

    const out = execFileSync("git", ["ls-files", "*.sh", "*.bash"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    tracked = out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    // Not the root of a git repo (or git absent): fall back to a bounded walk.
    tracked = await walk(root, root, 0);
  }
  return tracked.map((p) => p.split("/").join(sep)).filter((p) => !isFixture(p));
}

async function walk(dir, root, depth) {
  if (depth > 6) return [];
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, root, depth + 1)));
    else if (e.name.endsWith(".sh") || e.name.endsWith(".bash")) {
      out.push(relative(root, full));
    }
  }
  return out;
}

const STRICT_RE = /^\s*set\s+-[a-z]*e[a-z]*/m;
const CURL_PIPE_SH_RE = /\bcurl\b[^|\n]*\|\s*(?:ba|z|da)?sh\b/;
const CD_RE = /^\s*cd\s+(.+)$/;

/**
 * An unguarded cd is one whose line has no `||` and no `&&`. `cd x || exit 1`
 * and `cd x && do_thing` both fail safely; a bare `cd x` does not.
 */
function unguardedCdLines(lines) {
  const hits = [];
  lines.forEach((line, i) => {
    const m = CD_RE.exec(line);
    if (!m) return;
    if (line.includes("||") || line.includes("&&")) return;
    // `cd "$(dirname "$0")" && pwd` style is fine; already excluded above.
    hits.push(i + 1);
  });
  return hits;
}

function analyse(relPath, text) {
  const violations = [];
  const lines = text.split("\n");

  if (!STRICT_RE.test(text)) {
    violations.push({ file: relPath, check: "strict-mode", line: 1 });
  }

  lines.forEach((line, i) => {
    if (CURL_PIPE_SH_RE.test(line)) {
      violations.push({ file: relPath, check: "curl-pipe-sh", line: i + 1 });
    }
  });

  for (const line of unguardedCdLines(lines)) {
    violations.push({ file: relPath, check: "unguarded-cd", line });
  }

  return violations;
}

const key = (v) => `${v.file}::${v.check}`;

async function main() {
  const root = resolve(arg("--root", process.cwd()));
  const doUpdate = process.argv.includes("--update");
  const doList = process.argv.includes("--list");
  const baselinePath = join(root, BASELINE);

  let scripts;
  try {
    scripts = await listScripts(root);
  } catch (err) {
    console.error(`${TAG} cannot enumerate scripts: ${err.message}`);
    process.exit(2);
  }

  if (scripts.length === 0) {
    console.log(`${TAG} SKIP — no shell scripts found under ${root}`);
    process.exit(0);
  }

  const found = [];
  for (const rel of scripts) {
    const abs = join(root, rel);
    try {
      await stat(abs);
    } catch {
      continue; // tracked but deleted in the worktree
    }
    const text = await readFile(abs, "utf8");
    found.push(...analyse(rel, text));
  }

  const baseline = existsSync(baselinePath)
    ? JSON.parse(await readFile(baselinePath, "utf8"))
    : { violations: [] };

  if (doList) {
    console.log(`${TAG} baseline has ${baseline.violations.length} accepted violation(s):`);
    for (const v of baseline.violations) console.log(`  ${v.file}  ${v.check}`);
    process.exit(0);
  }

  if (doUpdate) {
    const payload = {
      note: "Frozen shell-script debt. The gate fails only on violations NOT listed here. Delete entries as you fix them.",
      count: found.length,
      violations: found
        .map((v) => ({ file: v.file, check: v.check }))
        .sort((a, b) => key(a).localeCompare(key(b))),
    };
    await writeFile(baselinePath, JSON.stringify(payload, null, 1) + "\n", "utf8");
    console.log(`${TAG} wrote baseline with ${found.length} violation(s) -> ${BASELINE}`);
    process.exit(0);
  }

  const known = new Set(baseline.violations.map(key));
  const fresh = found.filter((v) => !known.has(key(v)));

  if (fresh.length === 0) {
    console.log(
      `${TAG} PASS — ${scripts.length} script(s), ${found.length} frozen violation(s), 0 new`,
    );
    process.exit(0);
  }

  console.error(`${TAG} FAIL — ${fresh.length} NEW violation(s):`);
  for (const v of fresh) {
    const hint =
      v.check === "strict-mode"
        ? "add `set -euo pipefail` near the top"
        : v.check === "curl-pipe-sh"
          ? "download to a file, verify it, then execute — do not pipe into sh"
          : "guard the cd: `cd <dir> || exit 1`";
    console.error(`  ${v.file}:${v.line}  ${v.check} — ${hint}`);
  }
  console.error(
    `${TAG} If these are accepted for now: node scripts/guardrails/shell-defensive.mjs --update`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(`${TAG} crashed: ${err?.stack ?? err}`);
  process.exit(2);
});
