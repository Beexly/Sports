#!/usr/bin/env node
/**
 * Secret-scan guardrail (BS-040, brand-safety-rules-v2 §E).
 *
 * Backstop against accidentally committing a real credential inline.
 * `.gitignore` already keeps `.env*` and `.launch-secrets/` out of the
 * tree; this catches the other way a key leaks — pasted into a source
 * file, doc, or fixture.
 *
 * Modes:
 *   - no args  → scan files git has STAGED (pre-commit hook usage).
 *   - --all    → scan EVERY tracked file (`git ls-files`) — the CI gate, so a
 *                secret already committed to the tree is caught, not just one
 *                being newly staged. Without this, CI scans the empty stage and
 *                the gate is a no-op.
 *   - <paths>  → scan the given file paths (CI / manual / test usage).
 *
 * Exits 1 (and prints each hit) if any high-confidence secret is found,
 * 0 otherwise. High-confidence = a known provider prefix followed by a
 * long, high-entropy tail; short test tokens (`whsec_test`) and obvious
 * placeholders are intentionally NOT flagged.
 *
 * Keep in sync with the env contract in CLAUDE.md and LAUNCH_LEDGER.md §B.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());

// Each rule: a regex that matches a real secret (long tail required so that
// provider PREFIX strings used in code — e.g. "sk-ant-admin01-" in the key
// rotation script, or "whsec_test" in a webhook fixture — do not trip it).
const SECRET_RULES = [
  { id: "stripe.secret.live", re: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { id: "stripe.secret.test", re: /\bsk_test_[A-Za-z0-9]{20,}\b/ },
  { id: "stripe.restricted.live", re: /\brk_live_[A-Za-z0-9]{20,}\b/ },
  { id: "stripe.webhook", re: /\bwhsec_[A-Za-z0-9]{24,}\b/ },
  { id: "anthropic.key", re: /\bsk-ant-[A-Za-z0-9_-]{30,}\b/ },
  { id: "aws.access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "google.oauth.secret", re: /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/ },
  { id: "openai.key", re: /\bsk-proj-[A-Za-z0-9_-]{30,}\b/ },
  { id: "private-key-block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  // A Postgres/connection URL that embeds a password AND points at a real
  // remote host (not localhost / docker service names). Dev strings like
  // postgres://postgres:postgres@localhost are not flagged.
  {
    id: "db.url.with-password",
    re: /\bpostgres(?:ql)?:\/\/[^\s:/@]+:([^\s:/@]{6,})@([^\s:/?#]+)/,
    guard: (m) => {
      const pass = (m[1] || "").toLowerCase();
      const host = (m[2] || "").toLowerCase();
      const localHost =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "db" ||
        host === "postgres" ||
        host === "database" ||
        host.endsWith(".local") ||
        host.endsWith(".internal");
      const devPass = ["postgres", "password", "changeme", "secret", "example", "dev"].includes(pass);
      return !localHost && !devPass;
    },
  },
];

const PLACEHOLDER = /placeholder|example|dummy|redacted|changeme|your[-_]|xxxx|<[^>]+>|\.\.\./i;

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

// This scanner and the key-rotation helper legitimately contain provider
// prefixes as detection / construction strings.
const WHITELIST = new Set([
  "scripts/guardrails/secret-scan.mjs",
  "scripts/rotate-anthropic-key.mjs",
]);

function isSkipped(relNorm) {
  if (WHITELIST.has(relNorm)) return true;
  return relNorm.split("/").some((seg) => SKIP_DIRS.has(seg));
}

function stagedFiles() {
  const r = spawnSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACM"],
    { cwd: ROOT, encoding: "utf8" }
  );
  if (r.status !== 0) return [];
  return r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function allTrackedFiles() {
  const r = spawnSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) {
    console.error("[secret-scan] FAIL - could not list tracked files (git ls-files).");
    process.exit(1);
  }
  return r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function scanFile(absPath, relNorm) {
  const hits = [];
  let text;
  try {
    if (statSync(absPath).size > 2_000_000) return hits; // skip large/binary
    text = readFileSync(absPath, "utf8");
  } catch {
    return hits;
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of SECRET_RULES) {
      const m = rule.re.exec(line);
      if (!m) continue;
      if (PLACEHOLDER.test(m[0])) continue;
      if (rule.guard && !rule.guard(m)) continue;
      hits.push({ line: i + 1, rule: rule.id, snippet: line.trim().slice(0, 120) });
    }
  }
  return hits;
}

function main() {
  const rawArgs = process.argv.slice(2);
  const argPaths = rawArgs.filter((a) => !a.startsWith("--"));
  const scanAll = rawArgs.includes("--all");
  // --all (full tree) wins over explicit paths, which win over the staged set.
  const files = scanAll
    ? allTrackedFiles()
    : argPaths.length
      ? argPaths
      : stagedFiles();

  let allHits = [];
  let scanned = 0;
  for (const f of files) {
    const abs = resolve(ROOT, f);
    const relNorm = relative(ROOT, abs).split(sep).join("/");
    if (isSkipped(relNorm)) continue;
    scanned++;
    for (const hit of scanFile(abs, relNorm)) {
      allHits.push({ file: relNorm, ...hit });
    }
  }

  const mode = scanAll ? "all-tracked" : argPaths.length ? "paths" : "staged";
  if (allHits.length === 0) {
    console.log(
      "[secret-scan] OK - scanned " + scanned + " file(s) [" + mode + "]; no secrets detected."
    );
    process.exit(0);
  }

  console.error("[secret-scan] FAIL - " + allHits.length + " possible secret(s):");
  for (const h of allHits) {
    console.error("  " + h.file + ":" + h.line + "  [" + h.rule + "]  \"" + h.snippet + "\"");
  }
  console.error(
    "\nIf this is a real credential: remove it, rotate the key, and use an env var.\n" +
      "If it is a false positive: it is likely a placeholder — make it obviously so, or\n" +
      "add the file to the WHITELIST in scripts/guardrails/secret-scan.mjs with a reason."
  );
  process.exit(1);
}

main();
