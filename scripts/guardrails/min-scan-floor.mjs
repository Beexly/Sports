/**
 * min-scan-floor — the coverage assertion every tree-walking guardrail needs.
 *
 * WHY THIS EXISTS
 * Every tree-walking guard in this directory shares one shape:
 *
 *     for (const scanDir of SCAN_DIRS) {
 *       try { s = await stat(abs); } catch { continue; }   // <-- silent
 *       ...
 *     }
 *     if (allHits.length === 0) { console.log("OK - scanned N file(s)"); exit(0); }
 *
 * A missing scan root is swallowed by `catch { continue }`, and `walk()` returns
 * `[]` for a directory it cannot read. So when a root is renamed or moved, the
 * guard scans fewer files — or none at all — and still prints OK and exits 0.
 * Demonstrated on trust-gate against a copy with SCAN_DIRS repointed:
 *
 *     --- baseline ---  [trust-gate] OK - scanned 2062 file(s)  EXIT=0
 *     --- probe    ---  [trust-gate] OK - scanned 0 file(s)     EXIT=0
 *
 * A directory rename silently disables the gate while CI stays green. The
 * repo already asserts non-trivial coverage in its *tests*
 * (apps/web/__tests__/phone-number-policy.test.ts:38 and
 * policy-only-winrate.test.ts:52 both pin "scans a non-trivial source tree").
 * This module mirrors that idiom into the .mjs guards.
 *
 * TWO CHECKS, BOTH FAIL-CLOSED
 *   1. Every configured scan root must still exist. This is the precise
 *      detector for the rename: the message names the root that vanished.
 *   2. The file count must clear a per-guard floor. This is the backstop for
 *      "the root still exists but the walk/filters now yield (almost) nothing".
 *
 * WHEN THE CHECK IS SKIPPED
 * Only when the guard is deliberately pointed somewhere other than this
 * repository — a `--root <fixture>` run, or the temp-dir sandboxes in
 * apps/web/__tests__/guardrails.test.ts that plant a two-file tree and run the
 * scanner with cwd there. Those runs are supposed to scan almost nothing, and
 * the guard's own fixture suite owns their verdicts. The discriminator is the
 * scan root's identity, derived from this file's own location — NOT a flag, an
 * env var, or a package.json field, so there is no lever that turns the floor
 * off for a real repository scan.
 */

import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve symlinks too. A checkout reached through a symlinked path would
 * otherwise compare unequal to this file's own location and skip the floor —
 * failing OPEN, which is the bug this module exists to prevent. Falls back to
 * the plain resolve when the path cannot be realpath'd.
 */
function canonical(path) {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch {
    return absolute;
  }
}

/** This repository's root: scripts/guardrails/min-scan-floor.mjs -> ../../.. */
export const GUARD_REPO_ROOT = canonical(
  resolve(fileURLToPath(import.meta.url), "../../.."),
);

/**
 * True only when `root` IS this repository's root — i.e. the guard is scanning
 * the tree it exists to protect, and a near-empty scan is therefore a defect
 * rather than the point of the run.
 */
export function isRepositoryScan(root) {
  return canonical(root) === GUARD_REPO_ROOT;
}

/**
 * Fail the guard when it did not actually scan the tree it protects.
 *
 * @param {object} options
 * @param {string} options.guard    Guard name, for the log prefix.
 * @param {string} [options.root]   Scan root (default: process.cwd()).
 * @param {string[]} [options.roots] Configured scan roots, relative to `root`.
 *                                   Each must still exist.
 * @param {number|null} [options.scanned] Files actually scanned this run.
 * @param {number|null} [options.floor]   Minimum acceptable `scanned`.
 * @param {boolean} [options.skip]  Caller-side opt-out for an explicit
 *                                   fixture mode that keeps cwd at the repo
 *                                   root (actor-minting-boundary --scan-root).
 */
export function assertScanFloor({
  guard,
  root = process.cwd(),
  roots = [],
  scanned = null,
  floor = null,
  skip = false,
}) {
  const base = resolve(root);
  if (skip) return;
  if (!isRepositoryScan(base)) return;

  /** @type {string[]} */
  const problems = [];

  const missing = roots.filter((entry) => !existsSync(resolve(base, entry)));
  if (missing.length > 0) {
    problems.push(
      `configured scan root(s) no longer exist: ${missing.join(", ")} ` +
        `(resolved against ${base})`,
    );
  }

  if (floor !== null && scanned !== null && scanned < floor) {
    problems.push(
      `scanned ${scanned} file(s), below this guard's minimum-coverage floor of ${floor}`,
    );
  }

  if (problems.length === 0) return;

  console.error(
    `[${guard}] FAIL - coverage check: the guard did not scan the tree it protects.`,
  );
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    "\n  A guard that scans nothing prints OK and exits 0 — the rule is off and CI stays green.\n" +
      "  If a scan root was deliberately renamed, moved, or removed, update this guard's root\n" +
      "  list AND re-derive its floor in the same change. Never leave a root dangling.",
  );
  process.exit(1);
}
