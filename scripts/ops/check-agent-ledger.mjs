#!/usr/bin/env node
/**
 * Agent-ledger guard.
 *
 * Validates docs/ops/AGENT_LEDGER.md — the single shared task ledger four
 * different agents (hermes, copilot, browser, claude) coordinate through. Git is
 * the only substrate all four can reach, so the ledger is a file and this script
 * is what makes it binding rather than advisory.
 *
 * The checks are chosen from failures that actually happened, not from a general
 * idea of tidiness:
 *
 *   - DUPLICATE TITLE. Copilot and Hermes independently built the same fabricated
 *     signup-workflow feature. Two rows describing one unit of work is precisely
 *     the collision this file exists to surface.
 *   - DONE WITHOUT RESOLVABLE EVIDENCE. Both a "completed" report citing no commit
 *     and a report citing work that was never committed have shipped this week. A
 *     SHA in the Evidence column is resolved against the repo with `git cat-file`;
 *     a hash that does not exist fails the build. This is the check that makes
 *     "I finished it" falsifiable.
 *   - CLAIMED BY NOBODY / DONE BY NOBODY. A row that reports progress with no owner
 *     cannot be chased.
 *
 * Exit 0 = clean. Exit 1 = violations, printed one per line.
 *
 * Runs in CI through apps/web/__tests__/agent-ledger.test.ts rather than a new
 * workflow file, so it needs no .github change to be enforced.
 *
 * Usage:
 *   node scripts/ops/check-agent-ledger.mjs [path-to-ledger]
 */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_LEDGER = join(REPO_ROOT, "docs", "ops", "AGENT_LEDGER.md");

export const OWNERS = ["hermes", "copilot", "browser", "claude", "founder", "—"];
export const STATUSES = ["OPEN", "CLAIMED", "BLOCKED", "UNPUSHED", "DONE", "CANCELLED"];

const BEGIN = "<!-- LEDGER:BEGIN -->";
const END = "<!-- LEDGER:END -->";

/**
 * Hex runs that might be commit SHAs, and `#123` PR references.
 *
 * SHA_RE is deliberately permissive (any 7-40 hex run, digits-only included) and
 * the DONE check resolves EVERY candidate, succeeding if any one names a real
 * commit. Two prior heuristics both produced confident, wrong verdicts:
 *
 *   - Plain first-match parsing read the date stamp `20260818` in a prose note
 *     as a commit and failed the row.
 *   - "Require a hex letter" (the fix for that) then rejected commit 9627379 —
 *     a REAL seven-digit SHA. Roughly 1 in 27 abbreviated SHAs contain no
 *     letter; the guard cried wolf on genuine evidence within hours.
 *
 * Spelling cannot distinguish a date from a SHA. Resolution can: a real SHA
 * resolves via `git cat-file`, a date stamp does not. So candidates are only
 * *candidates* — `git cat-file` is the judge, and prose around them is free to
 * contain dates, counts, and row totals.
 */
const SHA_RE = /\b[0-9a-f]{7,40}\b/g;
const PR_RE = /#\d+/;

/**
 * Parse the fenced ledger table into rows.
 *
 * Deliberately strict: a row that does not split into exactly five cells is a
 * violation rather than something to coerce. A ledger that silently drops a
 * malformed row would let the very claims this guard checks slip past it.
 */
export function parseLedger(markdown) {
  const errors = [];
  const start = markdown.indexOf(BEGIN);
  const end = markdown.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    return { rows: [], errors: [`ledger markers ${BEGIN} / ${END} not found in order`] };
  }

  const body = markdown.slice(start + BEGIN.length, end);
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  const rows = [];
  for (const [i, line] of lines.entries()) {
    // Cells between the outer pipes. A trailing pipe yields a trailing empty
    // string, so slice both ends rather than filtering — filtering would hide an
    // genuinely empty cell.
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 5) {
      errors.push(`row ${i + 1}: expected 5 columns, found ${cells.length} — "${line}"`);
      continue;
    }
    const [id, title, owner, status, evidence] = cells;
    if (id === "ID" && title === "Title") continue; // header
    if (/^-+$/.test(id)) continue; // separator
    rows.push({ id, title, owner, status, evidence, line: i + 1 });
  }
  return { rows, errors };
}

/** True when `ref` names an object this repo actually has. */
function shaExists(sha, cwd) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
      cwd,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * True when this working copy has truncated history.
 *
 * This matters because in a shallow clone a missing commit is not evidence that
 * the commit does not exist — it is evidence that this clone cannot see it. CI's
 * `test` job uses a bare `actions/checkout@v4`, which defaults to `fetch-depth: 1`
 * and therefore holds exactly one commit; only the `model-freeze` job sets
 * `fetch-depth: 0`. Resolving SHAs strictly there would fail every historical row
 * and make this guard a permanent red light for a condition it invented.
 *
 * `.github/**` is owner-gated, so the fix belongs here rather than in the
 * workflow.
 */
function isShallowRepo(cwd) {
  try {
    return (
      execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
        cwd,
        encoding: "utf8",
      }).trim() === "true"
    );
  } catch {
    return false;
  }
}

/**
 * @param opts.resolveSha - inject for tests; defaults to a real `git cat-file`.
 *   Pass `null` to skip resolution entirely.
 * @param opts.shallow - inject for tests; defaults to probing the real repo.
 *   When true, a SHA that fails to resolve is reported as unverifiable rather
 *   than as a violation — see `isShallowRepo`.
 * @param opts.unverified - optional array; collects `{ id, sha }` for SHAs that
 *   could not be checked, so the caller can report coverage honestly.
 */
export function validate(rows, opts = {}) {
  const violations = [];
  const resolveSha = opts.resolveSha === undefined ? (s) => shaExists(s, REPO_ROOT) : opts.resolveSha;
  const shallow = opts.shallow === undefined ? isShallowRepo(REPO_ROOT) : opts.shallow;
  const unverified = opts.unverified ?? [];

  const seenIds = new Map();
  const seenTitles = new Map();

  for (const row of rows) {
    const where = `${row.id || "(no id)"}`;

    if (!row.id) violations.push(`row ${row.line}: empty ID`);
    if (!row.title) violations.push(`${where}: empty Title`);

    if (seenIds.has(row.id)) {
      violations.push(`${where}: duplicate ID (also row ${seenIds.get(row.id)})`);
    } else {
      seenIds.set(row.id, row.line);
    }

    // Duplicate work is the collision this ledger exists to catch, so compare
    // titles case- and whitespace-insensitively rather than exactly.
    const titleKey = row.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (titleKey && seenTitles.has(titleKey)) {
      violations.push(
        `${where}: duplicate Title "${row.title}" — already claimed as ${seenTitles.get(titleKey)}. ` +
          `Two rows for one unit of work is the collision this ledger exists to prevent.`,
      );
    } else if (titleKey) {
      seenTitles.set(titleKey, row.id);
    }

    if (!OWNERS.includes(row.owner)) {
      violations.push(`${where}: unknown Owner "${row.owner}" (expected one of ${OWNERS.join(", ")})`);
    }
    if (!STATUSES.includes(row.status)) {
      violations.push(`${where}: unknown Status "${row.status}" (expected one of ${STATUSES.join(", ")})`);
    }

    const unowned = row.owner === "—";
    const hasEvidence = row.evidence !== "—" && row.evidence !== "";

    switch (row.status) {
      case "OPEN":
        // An OPEN row may name an intended owner (an assignment) or none at all.
        // CLAIMED is the signal that work has actually begun, so OPEN carries no
        // ownership requirement in either direction.
        break;

      case "CLAIMED":
      case "BLOCKED":
        if (unowned) violations.push(`${where}: ${row.status} requires an Owner — an unowned claim cannot be chased`);
        break;

      case "UNPUSHED": {
        // Work that is finished but lives only on one machine. Hermes is
        // instructed never to push, so its deliverables sit on a local branch and
        // their SHAs are unresolvable from any other clone. That is legitimate,
        // but it must not be recorded as DONE: a single laptop is then the only
        // copy, and nobody else can verify or build on it. Making the state
        // visible is the point.
        if (unowned) violations.push(`${where}: UNPUSHED requires an Owner`);
        if (!hasEvidence) {
          violations.push(
            `${where}: UNPUSHED requires Evidence naming where the work lives ` +
              `(local branch + SHA, or a path), so it can be recovered`,
          );
        }
        break;
      }

      case "DONE": {
        if (unowned) violations.push(`${where}: DONE requires an Owner`);
        if (!hasEvidence) {
          violations.push(`${where}: DONE requires Evidence — a commit SHA or #PR, not a claim of completion`);
          break;
        }
        const candidates = [...row.evidence.matchAll(SHA_RE)].map((m) => m[0]);
        const pr = row.evidence.match(PR_RE)?.[0];
        if (candidates.length === 0 && !pr) {
          violations.push(
            `${where}: DONE Evidence "${row.evidence}" contains no commit SHA (7+ hex) or #PR reference`,
          );
          break;
        }
        // Any ONE resolving candidate is sufficient evidence; a date stamp
        // sitting next to a real SHA must not fail the row (nor, first-match
        // style, shadow it).
        if (candidates.length > 0 && resolveSha) {
          const anyResolves = candidates.some((c) => resolveSha(c));
          if (!anyResolves && !pr) {
            // Absence only proves absence when the clone holds full history.
            if (shallow) {
              unverified.push({ id: row.id, sha: candidates[0] });
            } else {
              violations.push(
                `${where}: DONE cites ${candidates.join(", ")} — none resolve to a commit in this ` +
                  `repository. Either the work was never committed or the hash is wrong.`,
              );
            }
          }
        }
        break;
      }

      case "CANCELLED":
        if (!hasEvidence) {
          violations.push(`${where}: CANCELLED requires a reason in Evidence, so the decision is not relitigated`);
        }
        break;

      default:
        break; // unknown status already reported
    }
  }

  return violations;
}

export function checkLedgerFile(path = DEFAULT_LEDGER, opts = {}) {
  if (!existsSync(path)) return [`ledger not found at ${path}`];
  const { rows, errors } = parseLedger(readFileSync(path, "utf8"));
  return [...errors, ...validate(rows, opts)];
}

/** Same as checkLedgerFile, but also reports which SHAs could not be checked. */
export function inspectLedgerFile(path = DEFAULT_LEDGER, opts = {}) {
  if (!existsSync(path)) return { violations: [`ledger not found at ${path}`], rows: [], unverified: [] };
  const { rows, errors } = parseLedger(readFileSync(path, "utf8"));
  const unverified = [];
  const violations = [...errors, ...validate(rows, { ...opts, unverified })];
  return { violations, rows, unverified };
}

// CLI
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const target = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_LEDGER;
  const { violations, rows, unverified } = inspectLedgerFile(target);
  if (unverified.length > 0) {
    // Never silent: a run that verified less than it appears to must say so,
    // otherwise a green line reads as "every DONE is proven" when it is not.
    console.warn(
      `[agent-ledger] shallow clone — ${unverified.length} DONE SHA(s) not verifiable here: ` +
        `${unverified.map((u) => `${u.id}:${u.sha}`).join(", ")}`,
    );
    console.warn(`[agent-ledger] run \`git fetch --unshallow\` for a full check.\n`);
  }
  if (violations.length > 0) {
    console.error(`[agent-ledger] FAIL — ${violations.length} violation(s):\n`);
    for (const v of violations) console.error(`  ${v}`);
    console.error("\nSee the Rules section of docs/ops/AGENT_LEDGER.md.");
    process.exit(1);
  }
  const byStatus = STATUSES.map((s) => `${s}=${rows.filter((r) => r.status === s).length}`).join(" ");
  const coverage = unverified.length > 0 ? ` [${unverified.length} SHA(s) unverified]` : "";
  console.log(`[agent-ledger] OK — ${rows.length} rows (${byStatus})${coverage}`);
}
