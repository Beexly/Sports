#!/usr/bin/env node
/**
 * dependency-audit — fail CI on critical/high CVEs in PRODUCTION dependencies.
 *
 * Why this exists: `npm ci --no-audit` (used by every CI job here) only suppresses
 * the install-time audit *report*. npm install never fails a build on
 * vulnerabilities, so without this gate nothing in CI ever blocks a known CVE.
 * On 2026-08-12 the tree carried 2 critical + 6 high in production deps —
 * including a fail-open auth advisory in the library gating the paywall — and CI
 * was green throughout.
 *
 * Zero dependencies: shells out to `npm audit --json`, same as the other 24
 * guardrails shell out to node/grep. Nothing new enters package.json.
 *
 * ── Fail-closed invariants (added 2026-08-25) ─────────────────────────────────
 * A gate that no-ops on bad input is worse than no gate, because it reports OK.
 * Three ways this one used to no-op, all now hard failures:
 *
 *  1. UNUSABLE AUDIT REPORT. `npm audit --json` prints `{"message":...,"error":{}}`
 *     on stdout and exits 1 when it cannot reach the registry. The old catch
 *     block saw a string starting with `{`, parsed it, and handed back a report
 *     with no `vulnerabilities` key — which reads as "zero advisories". With a
 *     non-empty waiver list the stale-waiver check masked this (with a wrong
 *     diagnosis: "the vulnerability is gone"); with an empty waiver list it
 *     printed `OK` and exited 0 on a completely failed audit.
 *     `assertUsableAuditReport` now requires a real report shape.
 *
 *  2. MALFORMED WAIVER. Expiry was a bare string compare, so `reviewBy` values
 *     of undefined / "soon" / "2026-1-05" / "2026-13-45" all evaluated as
 *     NOT-expired — a silently permanent waiver. The header said reason and
 *     reviewBy were mandatory; nothing enforced it. `validateWaivers` now does,
 *     and rejects the entry list outright rather than skipping bad entries.
 *
 *  3. SEVERITY ESCALATION. A waiver keyed only by package name waived the
 *     package, not the advisory it was written for. A waiver accepting a high
 *     DoS in `next` would have silently absorbed a future critical RCE in
 *     `next`. Each waiver now declares the worst severity it accepts; anything
 *     above that is blocking even though the package is waived.
 *
 * Scope note: `npm audit` walks the whole resolved tree, so transitive deps are
 * covered (the `postcss` waiver below is transitive, via next). devDependencies
 * are deliberately out of scope for the CI gate — run with `--all` to include
 * them. That is a documented scope, not a silent skip; see `--all` below.
 *
 * Usage:
 *   node scripts/guardrails/dependency-audit.mjs           # prod deps (CI gate)
 *   node scripts/guardrails/dependency-audit.mjs --all      # include devDependencies
 *   node scripts/guardrails/dependency-audit.mjs --json     # machine-readable
 *
 * Tests: node --test scripts/guardrails/dependency-audit.test.mjs
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const FAIL_ON = new Set(["critical", "high"]);

/** npm advisory severities, least to most severe. */
const SEVERITY_ORDER = ["info", "low", "moderate", "high", "critical"];
const severityRank = (s) => SEVERITY_ORDER.indexOf(s);

/**
 * A waiver may not be parked further than this into the future. Catches
 * fat-fingered years ("2126-11-01" is a valid date and a 100-year waiver) and
 * enforces the principle that an accepted vulnerability gets re-argued on a
 * human timescale.
 */
const MAX_REVIEW_HORIZON_DAYS = 180;

/**
 * Explicitly accepted findings. Every entry MUST carry:
 *   package      — the npm package name as it appears in `npm audit` output
 *   reason       — why shipping with this is acceptable, in prose
 *   reviewBy     — YYYY-MM-DD; past this date the waiver blocks CI
 *   maxSeverity  — the worst severity this waiver accepts for that package.
 *                  Anything worse blocks, even though the package is waived.
 *
 * An entry that no longer matches anything is reported as stale and fails the
 * run — suppressions are not allowed to outlive the vulnerability.
 */
const ACCEPTED = [
  {
    package: "next",
    reason:
      "Fix requires next@16.3.0, a semver-major jump from the pinned 14.2.x line. " +
      "Tracked as its own migration; not shippable as a patch bump. " +
      "Re-verified 2026-08-25: installed 14.2.35 is the terminal release of the " +
      "14.2 line (it is the `next-14` dist-tag head), and every listed advisory's " +
      "vulnerable range spans all of 14.x, so no in-line patch exists.",
    reviewBy: "2026-11-01",
    maxSeverity: "high",
  },
  {
    package: "postcss",
    reason:
      "Only the copy bundled inside next/node_modules is affected; it is remediated " +
      "by the same next@16 major upgrade. The top-level postcss is already patched. " +
      "Re-verified 2026-08-25: next@14.2.35 pins postcss to an exact 8.4.31, so the " +
      "nested copy cannot be deduped or bumped without moving next; top-level " +
      "postcss resolves to 8.5.26, outside the advisory range.",
    reviewBy: "2026-11-01",
    maxSeverity: "high",
  },
];

const args = new Set(process.argv.slice(2));
const includeDev = args.has("--all");
const asJson = args.has("--json");

/** Fail-closed exit. Distinct from 1 (a real finding) so CI can tell them apart. */
function bail(lines) {
  for (const line of lines) console.error(line);
  process.exit(2);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for a real, canonically formatted calendar date. */
export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function daysBetween(fromIso, toIso) {
  const ms = new Date(`${toIso}T00:00:00Z`) - new Date(`${fromIso}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Structural validation of the waiver list. Returns an array of problem
 * strings; empty means the list is well-formed. Never "skips" a bad entry —
 * a malformed waiver list is a configuration failure, not a warning.
 */
export function validateWaivers(accepted, today) {
  const problems = [];
  if (!Array.isArray(accepted)) return ["ACCEPTED is not an array."];

  const seen = new Set();
  accepted.forEach((entry, i) => {
    const at = `ACCEPTED[${i}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      problems.push(`${at} is not an object.`);
      return;
    }

    const { package: pkg, reason, reviewBy, maxSeverity } = entry;

    if (typeof pkg !== "string" || pkg.trim() === "") {
      problems.push(`${at} has no package name.`);
    } else if (seen.has(pkg)) {
      problems.push(`${at} duplicates an earlier waiver for "${pkg}"; only one would take effect.`);
    } else {
      seen.add(pkg);
    }

    const label = typeof pkg === "string" && pkg ? `"${pkg}"` : at;

    if (typeof reason !== "string" || reason.trim().length < 20) {
      problems.push(`${label} needs a substantive \`reason\` (>= 20 chars) explaining why shipping this is acceptable.`);
    }

    if (!isIsoDate(reviewBy)) {
      problems.push(
        `${label} has an invalid \`reviewBy\` (${JSON.stringify(reviewBy)}); expected a real YYYY-MM-DD date. ` +
          `An unparseable date silently never expires.`,
      );
    } else {
      const horizon = daysBetween(today, reviewBy);
      if (horizon > MAX_REVIEW_HORIZON_DAYS) {
        problems.push(
          `${label} has \`reviewBy\` ${reviewBy}, ${horizon} days out; the maximum is ${MAX_REVIEW_HORIZON_DAYS}.`,
        );
      }
    }

    if (!FAIL_ON.has(maxSeverity)) {
      problems.push(
        `${label} needs \`maxSeverity\` set to one of ${[...FAIL_ON].join("/")} — the worst severity this waiver accepts. ` +
          `Without it the waiver would absorb any future advisory on that package.`,
      );
    }
  });

  return problems;
}

/**
 * Reject anything that is not a usable `npm audit --json` report. npm emits a
 * parseable JSON *error* object on registry failure; treating that as "no
 * vulnerabilities found" is the difference between a gate and a decoration.
 */
export function assertUsableAuditReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("`npm audit --json` did not return a JSON object.");
  }
  if (report.error !== undefined) {
    const summary =
      (report.error && (report.error.summary || report.error.detail)) || report.message || "(no detail)";
    throw new Error(`\`npm audit\` reported an error rather than a report: ${summary}`);
  }
  if (report.auditReportVersion === undefined) {
    throw new Error("`npm audit --json` output has no `auditReportVersion`; it is not an audit report.");
  }
  if (!report.vulnerabilities || typeof report.vulnerabilities !== "object") {
    throw new Error("`npm audit --json` output has no `vulnerabilities` object.");
  }
  const counts = report.metadata && report.metadata.vulnerabilities;
  if (!counts || typeof counts !== "object" || typeof counts.total !== "number") {
    throw new Error("`npm audit --json` output has no `metadata.vulnerabilities` summary; refusing to trust it.");
  }
  return report;
}

/** Pure evaluation: report + waivers in, verdict out. */
export function evaluate(report, accepted, today) {
  const vulns = report.vulnerabilities ?? {};

  const offenders = [];
  for (const [name, entry] of Object.entries(vulns)) {
    const severity = entry?.severity;
    if (!FAIL_ON.has(severity)) continue;
    const titles = (entry.via ?? [])
      .filter((v) => v && typeof v === "object" && v.title)
      .map((v) => v.title);
    offenders.push({ name, severity, titles, range: entry.range ?? "" });
  }

  const acceptedByPkg = new Map(accepted.map((a) => [a.package, a]));

  const escalated = [];
  const waived = [];
  const blocking = [];

  for (const o of offenders) {
    const waiver = acceptedByPkg.get(o.name);
    if (!waiver) {
      blocking.push(o);
      continue;
    }
    if (severityRank(o.severity) > severityRank(waiver.maxSeverity)) {
      // The package is waived, but not at this severity. Block, and say why.
      escalated.push({ ...o, acceptedMax: waiver.maxSeverity });
      blocking.push(o);
      continue;
    }
    waived.push(o);
  }

  const stale = accepted.filter((a) => !offenders.some((o) => o.name === a.package));
  const expired = accepted.filter((a) => a.reviewBy < today);

  return { blocking, waived, escalated, stale, expired };
}

function runAudit() {
  let raw;
  try {
    raw = execFileSync(
      "npm",
      ["audit", "--json", ...(includeDev ? [] : ["--omit=dev"])],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" },
    );
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    const stdout = error?.stdout;
    if (typeof stdout === "string" && stdout.trim().startsWith("{")) {
      raw = stdout;
    } else {
      bail([
        "[dependency-audit] FAIL — could not run `npm audit`.",
        String(error?.message ?? error),
      ]);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    bail([
      "[dependency-audit] FAIL — could not parse `npm audit --json` output.",
      String(error?.message ?? error),
    ]);
  }

  try {
    return assertUsableAuditReport(parsed);
  } catch (error) {
    bail([
      `[dependency-audit] FAIL — ${error.message}`,
      "  Refusing to report OK on an audit that did not actually run.",
      "  This is usually a registry/network failure in CI; re-run the job.",
    ]);
  }
}

function main() {
  const today = new Date().toISOString().slice(0, 10);

  // Validate the waiver list BEFORE spending a network round-trip on the audit:
  // a broken waiver list is a hard config failure regardless of the tree state.
  const waiverProblems = validateWaivers(ACCEPTED, today);
  if (waiverProblems.length > 0) {
    bail([
      `[dependency-audit] FAIL — ${waiverProblems.length} malformed waiver entrie(s) in ACCEPTED:`,
      ...waiverProblems.map((p) => `  - ${p}`),
      "  Every waiver needs package, reason, a real YYYY-MM-DD reviewBy, and maxSeverity.",
    ]);
  }

  const report = runAudit();
  const { blocking, waived, escalated, stale, expired } = evaluate(report, ACCEPTED, today);
  const scope = includeDev ? "all dependencies" : "production dependencies";

  if (asJson) {
    console.log(JSON.stringify({ blocking, waived, escalated, stale, expired }, null, 2));
  }

  const acceptedByPkg = new Map(ACCEPTED.map((a) => [a.package, a]));

  if (!asJson) {
    for (const o of waived) {
      const a = acceptedByPkg.get(o.name);
      console.log(`[dependency-audit] WAIVED  ${o.severity.toUpperCase()} ${o.name} — ${a.reason} (review by ${a.reviewBy})`);
    }
    for (const o of blocking) {
      console.error(`[dependency-audit] BLOCK   ${o.severity.toUpperCase()} ${o.name}  ${o.range}`);
      for (const t of o.titles.slice(0, 3)) console.error(`                    - ${t}`);
    }
  }

  let exitCode = 0;

  if (escalated.length > 0) {
    console.error(
      `[dependency-audit] FAIL — ${escalated.length} waived package(s) now carry a WORSE advisory than the waiver accepts: ` +
        escalated.map((e) => `${e.name} (${e.severity} > accepted ${e.acceptedMax})`).join(", "),
    );
    console.error("  The waiver was written for a lesser finding. Re-argue it or fix the dependency.");
    exitCode = 1;
  }

  if (stale.length > 0) {
    console.error(
      `[dependency-audit] FAIL — ${stale.length} stale waiver(s); the vulnerability is gone, so remove the entry: ` +
        stale.map((s) => s.package).join(", "),
    );
    exitCode = 1;
  }

  if (expired.length > 0) {
    console.error(
      `[dependency-audit] FAIL — ${expired.length} waiver(s) past reviewBy: ` +
        expired.map((e) => `${e.package} (due ${e.reviewBy})`).join(", "),
    );
    exitCode = 1;
  }

  if (blocking.length > 0) {
    console.error(
      `[dependency-audit] FAIL — ${blocking.length} unwaived critical/high advisorie(s) in ${scope}.`,
    );
    console.error("  Fix: `npm audit fix --package-lock-only` for non-breaking bumps.");
    console.error("  If a fix requires a major upgrade, add a documented, dated waiver to ACCEPTED.");
    exitCode = 1;
  }

  if (exitCode === 0) {
    console.log(
      `[dependency-audit] OK - no unwaived critical/high advisories in ${scope}` +
        (waived.length > 0 ? ` (${waived.length} documented waiver(s))` : "") +
        ".",
    );
  }

  process.exit(exitCode);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) main();
