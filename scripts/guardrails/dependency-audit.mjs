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
 * Usage:
 *   node scripts/guardrails/dependency-audit.mjs           # prod deps (CI gate)
 *   node scripts/guardrails/dependency-audit.mjs --all      # include devDependencies
 *   node scripts/guardrails/dependency-audit.mjs --json     # machine-readable
 */
import { execFileSync } from "node:child_process";

const FAIL_ON = new Set(["critical", "high"]);

/**
 * Explicitly accepted findings. Every entry MUST carry a reason and a reviewBy
 * date. An entry that no longer matches anything is reported as stale and fails
 * the run — suppressions are not allowed to outlive the vulnerability.
 */
const ACCEPTED = [
  {
    package: "next",
    reason:
      "Fix requires next@16.3.0, a semver-major jump from the pinned 14.2.x line. " +
      "Tracked as its own migration; not shippable as a patch bump.",
    reviewBy: "2026-11-01",
  },
  {
    package: "postcss",
    reason:
      "Only the copy bundled inside next/node_modules is affected; it is remediated " +
      "by the same next@16 major upgrade. The top-level postcss is already patched.",
    reviewBy: "2026-11-01",
  },
];

const args = new Set(process.argv.slice(2));
const includeDev = args.has("--all");
const asJson = args.has("--json");

function runAudit() {
  try {
    const out = execFileSync(
      "npm",
      ["audit", "--json", ...(includeDev ? [] : ["--omit=dev"])],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" },
    );
    return JSON.parse(out);
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    const stdout = error?.stdout;
    if (typeof stdout === "string" && stdout.trim().startsWith("{")) {
      try {
        return JSON.parse(stdout);
      } catch {
        /* fall through */
      }
    }
    console.error("[dependency-audit] FAIL — could not run or parse `npm audit`.");
    console.error(error?.message ?? String(error));
    process.exit(2);
  }
}

const report = runAudit();
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

const acceptedByPkg = new Map(ACCEPTED.map((a) => [a.package, a]));
const blocking = offenders.filter((o) => !acceptedByPkg.has(o.name));
const waived = offenders.filter((o) => acceptedByPkg.has(o.name));
const stale = ACCEPTED.filter((a) => !offenders.some((o) => o.name === a.package));
const expired = ACCEPTED.filter((a) => a.reviewBy < new Date().toISOString().slice(0, 10));

if (asJson) {
  console.log(JSON.stringify({ blocking, waived, stale, expired }, null, 2));
}

const scope = includeDev ? "all dependencies" : "production dependencies";

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
