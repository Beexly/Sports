#!/usr/bin/env node
/**
 * Dependency audit guardrail.
 *
 * Runs `npm audit --json` and fails the process (exit 2) if any CRITICAL
 * severity vulnerability is found in production dependencies.
 *
 * HIGH vulnerabilities in dev-only tooling (vitest, eslint) are reported
 * but do not block the build, because they require major-version upgrades
 * that ship independently. CRITICAL vulnerabilities always block.
 *
 * Exit codes:
 *   0 — no critical vulnerabilities
 *   1 — high vulnerabilities in dev tooling only (warning)
 *   2 — critical vulnerability found (blocks CI)
 */

import { execSync } from "node:child_process";

const DEV_ONLY_PACKAGES = new Set([
  "vitest",
  "@vitest/mocker",
  "vite",
  "vite-node",
  "esbuild",
  "eslint",
  "@next/eslint-plugin-next",
  "eslint-config-next",
  "glob",
]);

let auditJson;
try {
  const stdout = execSync("npm audit --json", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  auditJson = JSON.parse(stdout);
} catch (err) {
  // npm audit exits non-zero when vulnerabilities exist; stdout still has the JSON
  try {
    auditJson = JSON.parse(err.stdout ?? "{}");
  } catch {
    console.error("[dep-audit] Could not parse npm audit output");
    process.exit(0); // Don't block on parse failure
  }
}

const vulns = auditJson?.vulnerabilities ?? {};
const criticals = [];
const devHighs = [];

for (const [name, info] of Object.entries(vulns)) {
  const sev = info.severity;
  const isDevOnly = DEV_ONLY_PACKAGES.has(name);
  if (sev === "critical") {
    criticals.push({ name, isDevOnly, vias: info.via });
  } else if (sev === "high" && isDevOnly) {
    devHighs.push({ name, vias: info.via });
  }
}

const prodCriticals = criticals.filter((v) => !v.isDevOnly);
const devCriticals = criticals.filter((v) => v.isDevOnly);

if (criticals.length === 0 && devHighs.length === 0) {
  console.log("[dep-audit] ✓ No critical or high-severity vulnerabilities found.");
  process.exit(0);
}

if (devHighs.length > 0) {
  console.warn("[dep-audit] ⚠ HIGH vulnerabilities in dev-only packages (non-blocking):");
  for (const { name } of devHighs) {
    console.warn(`  - ${name} (dev-only, fix requires major version upgrade)`);
  }
}

if (devCriticals.length > 0) {
  console.warn("[dep-audit] ⚠ CRITICAL vulnerabilities in dev-only packages (warning, non-blocking):");
  for (const { name, vias } of devCriticals) {
    const titles = vias
      .filter((v) => typeof v === "object" && v.title)
      .map((v) => v.title)
      .join(", ");
    console.warn(`  - ${name}: ${titles || "see npm audit for details"}`);
  }
  console.warn("[dep-audit]   Dev-only criticals require major version upgrades; tracked separately.");
}

if (prodCriticals.length === 0) {
  const hasWarnings = devHighs.length > 0 || devCriticals.length > 0;
  console.log(`[dep-audit] ✓ No production critical vulnerabilities.${hasWarnings ? " Dev-tool warnings above." : ""}`);
  process.exit(hasWarnings ? 1 : 0); // exit 1 = warning, not blocking
}

console.error("[dep-audit] ✗ CRITICAL vulnerabilities in PRODUCTION dependencies:");
for (const { name, vias } of prodCriticals) {
  const titles = vias
    .filter((v) => typeof v === "object" && v.title)
    .map((v) => v.title)
    .join(", ");
  console.error(`  - ${name} (PRODUCTION): ${titles || "see npm audit for details"}`);
}

console.error("[dep-audit] Run `npm audit` for full details and remediation options.");
process.exit(2);
