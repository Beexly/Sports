#!/usr/bin/env node
/**
 * Storefront smoke & Chrome DevTools MCP audit target verifier
 * (`ChromeDevTools/chrome-devtools-mcp` companion check).
 *
 * Usage:
 *   node scripts/ops/cdp-storefront-smoke.mjs --offline-static-check
 *   node scripts/ops/cdp-storefront-smoke.mjs --live-url=http://localhost:3000
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const liveArg = process.argv.find((arg) => arg.startsWith("--live-url="));
const liveUrl = liveArg ? liveArg.slice("--live-url=".length).replace(/\/+$/, "") : null;

const STATIC_TARGETS = [
  {
    route: "/",
    file: "apps/web/app/page.tsx",
    requiredTokens: ['id="main-content"', "DoctrineBoardView", "RedlineWorld"],
    forbiddenTokens: ["do not buy today"],
  },
  {
    route: "/packages/[slug]",
    file: "apps/web/app/packages/[slug]/page.tsx",
    requiredTokens: ['id="main-content"', "loadActiveSealedSlate", "verifyPackagePurchase"],
    forbiddenTokens: ["do not buy today"],
  },
  {
    route: "/props",
    file: "apps/web/app/props/page.tsx",
    requiredTokens: ['id="main-content"', "loadActiveSealedSlate", "SealedTable"],
    forbiddenTokens: ["do not buy today"],
  },
  {
    route: "/fantasy/dfs",
    file: "apps/web/app/fantasy/dfs/page.tsx",
    requiredTokens: ["FantasyShell", "LineupDoctorPanel", "loadCurrentDfsSlate"],
    forbiddenTokens: ["do not buy today"],
  },
];

function runStaticChecks() {
  const failures = [];
  for (const target of STATIC_TARGETS) {
    const absPath = resolve(REPO_ROOT, target.file);
    if (!existsSync(absPath)) {
      failures.push(`${target.route}: missing file ${target.file}`);
      continue;
    }
    const content = readFileSync(absPath, "utf8");
    for (const token of target.requiredTokens) {
      if (!content.includes(token)) {
        failures.push(`${target.route}: missing expected marker ${JSON.stringify(token)}`);
      }
    }
    for (const banned of target.forbiddenTokens) {
      if (content.toLowerCase().includes(banned.toLowerCase())) {
        failures.push(`${target.route}: found forbidden stale copy ${JSON.stringify(banned)}`);
      }
    }
  }
  return failures;
}

async function runLiveChecks(baseUrl) {
  const routes = ["/", "/packages", "/props", "/fantasy/dfs"];
  const results = [];
  for (const route of routes) {
    const res = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    results.push({ route, status: res.status, ok: res.status >= 200 && res.status < 400 });
  }
  return results;
}

async function main() {
  const staticFailures = runStaticChecks();
  if (staticFailures.length > 0) {
    console.error("[cdp-storefront-smoke] Static checks FAILED:");
    for (const err of staticFailures) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(
    `[cdp-storefront-smoke] Static landmark & storefront checks OK (${STATIC_TARGETS.length} routes verified).`,
  );

  if (liveUrl) {
    const liveResults = await runLiveChecks(liveUrl);
    console.log("[cdp-storefront-smoke] Live HTTP probes:", JSON.stringify(liveResults));
    if (liveResults.some((r) => !r.ok)) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("[cdp-storefront-smoke] Unexpected error:", err);
  process.exit(1);
});
