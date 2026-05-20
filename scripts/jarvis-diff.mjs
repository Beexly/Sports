#!/usr/bin/env node
/**
 * jarvis-diff.mjs
 *
 * Operator helper: fetch two snapshots of /api/cockpit/jarvis (before
 * and after some operator action — e.g. flipping a gate, redeploying)
 * and print a compact diff so the change can be inspected without
 * loading the cockpit page in a browser.
 *
 * Usage:
 *
 *   # Capture the "before" snapshot:
 *   APP_URL=https://staging.example.com \
 *     ADMIN_COOKIE="next-auth.session-token=..." \
 *     node scripts/jarvis-diff.mjs --save /tmp/jarvis-before.json
 *
 *   # ...make the operator change...
 *
 *   # Compare against the live state:
 *   APP_URL=https://staging.example.com \
 *     ADMIN_COOKIE="next-auth.session-token=..." \
 *     node scripts/jarvis-diff.mjs --against /tmp/jarvis-before.json
 *
 * Exits non-zero if the launch status regressed (NOT_READY_* or any
 * GREEN→non-GREEN sectional change).
 */

import { writeFile, readFile } from "node:fs/promises";

const APP_URL = process.env.APP_URL;
const ADMIN_COOKIE = process.env.ADMIN_COOKIE;

if (!APP_URL || !ADMIN_COOKIE) {
  console.error("APP_URL and ADMIN_COOKIE env vars are required.");
  process.exit(2);
}

const args = new Map();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--save") args.set("save", argv[++i]);
  else if (a === "--against") args.set("against", argv[++i]);
}

async function fetchJarvis() {
  const res = await fetch(`${APP_URL}/api/cockpit/jarvis`, {
    headers: { Cookie: ADMIN_COOKIE, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`Jarvis fetch failed: ${res.status}`);
    process.exit(1);
  }
  return res.json();
}

const current = await fetchJarvis();

if (args.has("save")) {
  await writeFile(args.get("save"), JSON.stringify(current, null, 2), "utf8");
  console.log(`Saved current Jarvis snapshot to ${args.get("save")}`);
  process.exit(0);
}

if (!args.has("against")) {
  // No diff target — just print the assessment as-is.
  console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

const prevRaw = await readFile(args.get("against"), "utf8");
const previous = JSON.parse(prevRaw);

const prev = previous.assessment ?? previous;
const curr = current.assessment ?? current;

const changed = [];
const regressed = [];

if (prev.launchStatus !== curr.launchStatus) {
  changed.push(`launchStatus: ${prev.launchStatus} → ${curr.launchStatus}`);
  if (curr.launchStatus.startsWith("NOT_READY")) regressed.push("launchStatus regressed");
}

const SECTIONS = [
  "publicSurfaceStatus",
  "customerDashboardStatus",
  "picksStatus",
  "performanceStatus",
  "cockpitStatus",
  "historicalPickStatus",
  "ingestionStatus",
  "settlementStatus",
  "canonicalHistoryStatus",
  "bootstrapStatus",
  "signalCoverageStatus",
];

for (const k of SECTIONS) {
  if (prev[k] !== curr[k]) {
    changed.push(`${k}: ${prev[k]} → ${curr[k]}`);
    if (prev[k] === "GREEN" && curr[k] !== "GREEN") regressed.push(`${k} regressed`);
  }
}

const prevSafety = new Set(prev.safetyWarnings ?? []);
const currSafety = new Set(curr.safetyWarnings ?? []);
for (const w of currSafety) {
  if (!prevSafety.has(w)) {
    changed.push(`+ safety: ${w}`);
    regressed.push("new safety warning");
  }
}
for (const w of prevSafety) {
  if (!currSafety.has(w)) {
    changed.push(`- safety: ${w}`);
  }
}

if (changed.length === 0) {
  console.log("No changes since the saved snapshot.");
  process.exit(0);
}

console.log("Changes:");
for (const c of changed) console.log("  " + c);

if (regressed.length > 0) {
  console.log("\nRegression(s):");
  for (const r of regressed) console.log("  - " + r);
  process.exit(1);
}
console.log("\nNo regressions detected.");
process.exit(0);
