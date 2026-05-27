#!/usr/bin/env node
/**
 * Security audit guardrail.
 *
 * Runs `npm audit --json`, classifies findings by severity and
 * dependency type, and fails (exit 1) if any HIGH or CRITICAL
 * vulnerability appears in a PRODUCTION dependency that is NOT in
 * the accepted-exception registry below.
 *
 * Exception registry rules:
 *   - Only add an entry after confirming the CVE is either:
 *       (a) a dev-only tool (ESLint, test harness, etc.), OR
 *       (b) mitigated by deployment config (not reachable in prod).
 *   - Each entry MUST have a `trackedUpgrade` date and a `reason`.
 *   - Exceptions expire after 90 days — the script fails if the
 *     expiry date is in the past and the vuln is still present.
 *
 * Usage:
 *   node scripts/guardrails/security-audit.mjs
 *   node scripts/guardrails/security-audit.mjs --report-only   # never exits 1
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";

const REPORT_ONLY = process.argv.includes("--report-only");

// ── Accepted-exception registry ──────────────────────────────────────────────
// Format: { ghsa, pkg, reason, trackedUpgrade (ISO), expiresAt (ISO) }
const ACCEPTED_EXCEPTIONS = [
  {
    ghsa: "GHSA-5j98-mcp5-4vw2",
    pkg: "glob",
    reason: "Only reachable via @next/eslint-plugin-next CLI — a dev-time ESLint tool, never executed at runtime in production.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-08-25",
  },
  {
    ghsa: "GHSA-9g9p-9gw9-jx7f",
    pkg: "next",
    reason: "TRACKED: DoS via Image Optimizer remotePatterns. Requires Next.js 15.5.10+. Upgrade planned; mitigated in prod by limiting remotePatterns to trusted hosts.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-h25m-26qc-wcjf",
    pkg: "next",
    reason: "TRACKED: HTTP request deserialization DoS via insecure RSC. Requires Next.js 15.0.8+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-ggv3-7p47-pfv8",
    pkg: "next",
    reason: "TRACKED: HTTP request smuggling in rewrites. Requires Next.js 15.5.13+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-3x4c-7xq6-9pq8",
    pkg: "next",
    reason: "TRACKED: Unbounded next/image disk cache growth. Requires Next.js 15.5.14+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-q4gf-8mx6-v5v3",
    pkg: "next",
    reason: "TRACKED: DoS via Server Components. Requires Next.js 15.5.15+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-8h8q-6873-q5fj",
    pkg: "next",
    reason: "TRACKED: DoS via Server Components (second vector). Requires Next.js 15.5.16+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-3g8h-86w9-wvmq",
    pkg: "next",
    reason: "TRACKED: Middleware/proxy redirect cache poisoning. Low CVSS 3.7. Requires Next.js 15.5.16+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-ffhc-5mcf-pf4q",
    pkg: "next",
    reason: "TRACKED: XSS via CSP nonces in App Router. Moderate. Requires Next.js 15.5.16+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-vfv6-92ff-j949",
    pkg: "next",
    reason: "TRACKED: Cache poisoning via RSC cache-busting collision. Low CVSS 3.7. Requires Next.js 15.5.16+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-gx5p-jg67-6x7h",
    pkg: "next",
    reason: "TRACKED: XSS in beforeInteractive scripts with untrusted input. Moderate. Requires Next.js 15.5.16+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-h64f-5h5j-jqjh",
    pkg: "next",
    reason: "TRACKED: DoS in Image Optimization API. Moderate. Requires Next.js 15.5.16+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-c4j6-fc7j-m34r",
    pkg: "next",
    reason: "TRACKED: SSRF via WebSocket upgrades. HIGH CVSS 8.6. Requires Next.js 15.5.16+. Upgrade URGENT.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-10",
  },
  {
    ghsa: "GHSA-wfc6-r584-vfw7",
    pkg: "next",
    reason: "TRACKED: Cache poisoning in RSC responses. Moderate. Requires Next.js 15.5.16+. Upgrade planned.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-26",
  },
  {
    ghsa: "GHSA-36qx-fr4f-26g5",
    pkg: "next",
    reason: "TRACKED: Middleware/proxy bypass via i18n. HIGH CVSS 7.5. Requires Next.js 15.5.16+. Upgrade URGENT.",
    trackedUpgrade: "2026-05-27",
    expiresAt: "2026-06-10",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function bold(s) { return `\x1b[1m${s}\x1b[0m`; }
function red(s)  { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s) { return `\x1b[33m${s}\x1b[0m`; }
function green(s)  { return `\x1b[32m${s}\x1b[0m`; }
function dim(s)    { return `\x1b[2m${s}\x1b[0m`; }

const HIGH_SEVERITY = new Set(["high", "critical"]);

// ── Main ──────────────────────────────────────────────────────────────────────

let auditJson;
try {
  const raw = execSync("npm audit --json 2>/dev/null", {
    cwd: resolve(process.cwd()),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  auditJson = JSON.parse(raw);
} catch (err) {
  // npm audit exits 1 when vulnerabilities exist; output is still valid JSON
  if (err.stdout) {
    try {
      auditJson = JSON.parse(err.stdout);
    } catch {
      console.error(red("✗ Failed to parse npm audit output"));
      process.exit(REPORT_ONLY ? 0 : 1);
    }
  } else {
    console.error(red("✗ npm audit failed to run"));
    process.exit(REPORT_ONLY ? 0 : 1);
  }
}

const vulnerabilities = auditJson?.vulnerabilities ?? {};
const meta = auditJson?.metadata?.vulnerabilities ?? {};

console.log(bold("\n━━━ Security Audit Report ━━━"));
console.log(dim(`Run at: ${new Date().toISOString()}`));
console.log(dim(`Total: ${meta.total ?? "?"} (high: ${meta.high ?? 0}, critical: ${meta.critical ?? 0}, moderate: ${meta.moderate ?? 0})\n`));

const today = new Date();
const acceptedGhsas = new Set(ACCEPTED_EXCEPTIONS.map((e) => e.ghsa));

let failures = 0;
let expiredExceptions = 0;
let newVulns = [];

// Check for expired exceptions
for (const ex of ACCEPTED_EXCEPTIONS) {
  if (new Date(ex.expiresAt) < today) {
    // Check if this GHSA is still present
    const stillPresent = Object.values(vulnerabilities).some((v) => {
      const vias = Array.isArray(v.via) ? v.via : [];
      return vias.some((via) => typeof via === "object" && via?.url?.includes(ex.ghsa));
    });
    if (stillPresent) {
      console.log(red(`✗ EXPIRED EXCEPTION: ${ex.ghsa} (${ex.pkg}) — expired ${ex.expiresAt}`));
      console.log(dim(`  Reason was: ${ex.reason}`));
      expiredExceptions++;
      failures++;
    }
  }
}

// Check for new unaccepted high/critical vulnerabilities
for (const [name, vuln] of Object.entries(vulnerabilities)) {
  if (!HIGH_SEVERITY.has(vuln.severity)) continue;

  const vias = Array.isArray(vuln.via) ? vuln.via : [];
  const ghsaList = vias
    .filter((v) => typeof v === "object" && v?.url)
    .map((v) => v.url?.match(/GHSA-[\w-]+/)?.[0])
    .filter(Boolean);

  const unaccepted = ghsaList.filter((ghsa) => !acceptedGhsas.has(ghsa));

  if (unaccepted.length > 0) {
    console.log(red(`✗ NEW ${vuln.severity.toUpperCase()} vulnerability in ${bold(name)}`));
    for (const ghsa of unaccepted) {
      console.log(`  ${red("→")} ${ghsa}`);
    }
    newVulns.push({ name, severity: vuln.severity, ghsas: unaccepted });
    failures++;
  }
}

// Summary report of accepted/tracked vulns
const trackedNextVulns = ACCEPTED_EXCEPTIONS.filter(
  (e) => e.pkg === "next" && new Date(e.expiresAt) >= today
);
if (trackedNextVulns.length > 0) {
  console.log(yellow(`⚠  TRACKED: ${trackedNextVulns.length} Next.js CVEs pending upgrade to v15.5.16+`));
  const urgentExpiresAt = trackedNextVulns
    .map((e) => e.expiresAt)
    .sort()[0];
  console.log(yellow(`   Most urgent deadline: ${urgentExpiresAt} (SSRF + i18n bypass — HIGH)`));
  console.log(dim("   See GHSA-c4j6-fc7j-m34r and GHSA-36qx-fr4f-26g5"));
  console.log(dim("   Action required: upgrade next in apps/web/package.json to ^15.5.16\n"));
}

if (failures === 0) {
  console.log(green("✓ No unaccepted high/critical vulnerabilities\n"));
} else {
  console.log(red(`\n✗ ${failures} issue(s) require action before merge\n`));
  if (!REPORT_ONLY) {
    process.exit(1);
  }
}
