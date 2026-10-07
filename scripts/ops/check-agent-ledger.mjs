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
 *     "I finished it" falsifiable. In a shallow clone (CI's test job holds one
 *     commit) a local miss is not proof of absence, so the guard fetches the
 *     cited SHA from origin (`git fetch --depth=1 origin <sha>` — GitHub serves
 *     fetch-by-sha) and retries; a SHA origin does not have IS a violation.
 *     Only a repo with no origin remote at all (true offline) degrades to an
 *     "unverified" warning instead of a verdict.
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
 * `fetch-depth: 0`.
 *
 * Shallowness does NOT excuse the check, though. GitHub serves fetch-by-sha, so
 * a shallow clone with an origin remote can pull exactly the cited commit
 * (`git fetch --depth=1 origin <sha>`) and adjudicate for real. A SHA that
 * origin cannot serve either was never pushed or is wrong — a violation. Only a
 * repo with no origin remote at all (true offline) routes to "unverified",
 * because there absence genuinely cannot be tested. Without the fetch fallback,
 * a fabricated DONE SHA would pass in CI — the one environment that enforces
 * the ledger.
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

/** True when this repo has an `origin` remote to fetch missing SHAs from. */
function hasOriginRemote(cwd) {
  try {
    execFileSync("git", ["remote", "get-url", "origin"], { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch exactly one commit by hash from origin. GitHub serves fetch-by-sha, so
 * this lets a shallow clone adjudicate a SHA its truncated history cannot see.
 * Returns false when origin does not have the commit.
 */
function fetchShaFromOrigin(sha, cwd) {
  try {
    execFileSync("git", ["fetch", "--quiet", "--depth=1", "origin", sha], {
      cwd,
      stdio: "ignore",
    });
    return true;
  } catch {
    // Fetch-by-hash is not universally served. GitHub rejects a `want` for an
    // object it has not advertised as a ref tip unless the repo enables
    // allowAnySHA1InWant, so a perfectly real commit can fail here purely
    // because it sits mid-branch. Deepening the advertised refs is the
    // fallback: those ARE advertised, and the cited commit is reachable from
    // one of them if it was ever pushed.
    return deepenOriginRefs(cwd);
  }
}

/**
 * Widen a shallow clone once per process by deepening the advertised branch
 * refs, then let the caller re-resolve.
 *
 * Memoised because this is the expensive path and every unresolved SHA in the
 * ledger would otherwise re-run it. Returns true only if the deepen actually
 * succeeded, so a genuine connectivity failure still reaches the caller as a
 * failure rather than being silently swallowed.
 */
let _deepened = null;
function deepenOriginRefs(cwd) {
  if (_deepened !== null) return _deepened;
  try {
    execFileSync(
      "git",
      ["fetch", "--quiet", "--depth=250", "origin", "+refs/heads/*:refs/remotes/origin/*"],
      { cwd, stdio: "ignore" },
    );
    _deepened = true;
  } catch {
    _deepened = false;
  }
  return _deepened;
}

/**
 * Can we reach origin at all right now?
 *
 * This is the distinction the guard was missing. A failed fetch previously meant
 * two very different things collapsed into one verdict: "origin does not have
 * this commit" (a real violation) and "we could not talk to origin" (an
 * infrastructure problem that says nothing about the evidence). Conflating them
 * makes the guard cry wolf, and a guard that cries wolf gets switched off.
 *
 * `ls-remote` only lists advertised refs, so it is a clean connectivity probe:
 * it succeeds whenever the remote is reachable and authorised, independent of
 * whether any particular object is served.
 */
function originReachable(cwd) {
  try {
    execFileSync("git", ["ls-remote", "--exit-code", "--quiet", "origin", "HEAD"], {
      cwd,
      stdio: "ignore",
      timeout: 20_000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param opts.resolveSha - inject for tests; defaults to a real `git cat-file`.
 *   Pass `null` to skip resolution entirely.
 * @param opts.shallow - inject for tests; defaults to probing the real repo.
 *   When true, a SHA that fails to resolve locally is fetched by hash from
 *   origin and re-resolved before any verdict — see `isShallowRepo`.
 * @param opts.fetchSha - inject for tests, exactly like resolveSha, so unit
 *   tests never touch the network; defaults to a real
 *   `git fetch --depth=1 origin <sha>` when the repo has an origin remote.
 *   Pass `null` to model a repo with NO origin remote (true offline): only
 *   then does an unresolvable SHA degrade to "unverified" instead of a
 *   violation.
 * @param opts.unverified - optional array; collects `{ id, sha }` for SHAs that
 *   could not be checked, so the caller can report coverage honestly.
 */
export function validate(rows, opts = {}) {
  const violations = [];
  const resolveSha = opts.resolveSha === undefined ? (s) => shaExists(s, REPO_ROOT) : opts.resolveSha;
  const shallow = opts.shallow === undefined ? isShallowRepo(REPO_ROOT) : opts.shallow;
  const fetchSha =
    opts.fetchSha !== undefined
      ? opts.fetchSha
      : shallow && hasOriginRemote(REPO_ROOT)
        ? (s) => fetchShaFromOrigin(s, REPO_ROOT)
        : null;
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
            // A shallow clone's local miss is not proof of absence — but origin
            // can still adjudicate: fetch the cited SHA by hash and re-resolve.
            if (shallow && fetchSha) {
              const recovered = candidates.some((c) => fetchSha(c) && resolveSha(c));
              if (!recovered) {
                // Distinguish "origin does not have it" from "we could not
                // reach origin". Only the first is evidence about the ledger;
                // the second is an infrastructure fact and must not be reported
                // as a fabricated SHA.
                if (opts.originUp === undefined ? originReachable(REPO_ROOT) : opts.originUp) {
                  violations.push(
                    `${where}: DONE cites ${candidates.join(", ")} — none resolve locally, and origin ` +
                      `does not serve any of them. Either the work was never committed or the hash is wrong.`,
                  );
                } else {
                  unverified.push({ id: row.id, sha: candidates[0] });
                }
              }
            } else if (shallow) {
              // No origin remote: truly offline, absence cannot be tested here.
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
      `[agent-ledger] shallow clone with NO origin remote — ${unverified.length} DONE SHA(s) not ` +
        `verifiable offline: ${unverified.map((u) => `${u.id}:${u.sha}`).join(", ")}`,
    );
    console.warn(
      `[agent-ledger] with an origin remote these would be fetched by hash and adjudicated; ` +
        `add one (or run from a full clone) for a full check.\n`,
    );
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
