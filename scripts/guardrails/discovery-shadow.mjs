#!/usr/bin/env node
/**
 * Discovery-shadow guardrail.
 *
 * Enforces the load-bearing safety property of the nightly discovery loop: it may
 * PROPOSE, but it can never APPLY a change or flip a gate. Three checks, any failure
 * gates the merge (exit 1):
 *
 *   1. STATUS TYPE IS A LITERAL. discovery-engine.ts must declare
 *      `DiscoveryProposalStatus = "PROPOSED"` and must NOT introduce an
 *      "IMPLEMENTED"/"APPLIED" status — so an applied artifact is unconstructible.
 *
 *   2. NO APPLY PATH / NO GATE-WRITER IMPORT. Neither the discovery engine nor the
 *      worker may import a gate-writer (pricing phases, the publish flag, the prisma
 *      client) or export an apply()/implement()/persist()/flip() function.
 *
 *   3. EMITTED ARTIFACTS ARE PROPOSED-ONLY. Every proposals.json under the repo
 *      (outside node_modules) must contain only proposals whose status is "PROPOSED".
 *
 * Local-state only; no git history required. Mirrors scripts/guardrails/model-freeze.mjs.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const ENGINE = resolve(ROOT, "packages/prediction-engine/src/discovery-engine.ts");
const WORKER = resolve(ROOT, "workers/nightly-discovery/src/dry-run.ts");

// Import-path fragments a discovery module must never pull in (gate-writers).
const FORBIDDEN_IMPORTS = [
  "pricing/pricing-phases",
  "pricing-phases",
  "canPublishProjections",
  "@sports/db",
  "prisma",
  "calibration-apply",
];
// Exported function names that would imply an apply path.
const FORBIDDEN_EXPORT_RE =
  /export\s+(?:async\s+)?function\s+(apply|implement|persist|writeGate|flip|enable|activate)\w*/i;

const failures = [];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function checkStatusLiteral() {
  const text = await readFile(ENGINE, "utf8");
  if (!/export\s+type\s+DiscoveryProposalStatus\s*=\s*["']PROPOSED["']\s*;?/.test(text)) {
    failures.push(
      `${ENGINE}: DiscoveryProposalStatus must be the literal "PROPOSED" (found a different definition).`,
    );
  }
  // Guard against an applied status sneaking into the proposal vocabulary.
  for (const banned of ["IMPLEMENTED", "APPLIED"]) {
    if (new RegExp(`status\\s*:\\s*["']${banned}["']`).test(text)) {
      failures.push(`${ENGINE}: emits a proposal with status "${banned}" — discovery may only PROPOSE.`);
    }
  }
}

async function checkNoApplyPath() {
  for (const file of [ENGINE, WORKER]) {
    if (!(await exists(file))) {
      failures.push(`${file}: expected discovery file is missing.`);
      continue;
    }
    const text = await readFile(file, "utf8");
    for (const frag of FORBIDDEN_IMPORTS) {
      // Only flag it inside an import statement, not in a comment.
      const importLines = text
        .split("\n")
        .filter((l) => /^\s*import\b/.test(l) || /\bfrom\s+["']/.test(l));
      if (importLines.some((l) => l.includes(frag))) {
        failures.push(`${file}: imports a forbidden gate-writer "${frag}".`);
      }
    }
    if (FORBIDDEN_EXPORT_RE.test(text)) {
      failures.push(`${file}: exports an apply/implement-style function — discovery may not apply changes.`);
    }
  }
}

async function findProposalsJson(dir, acc) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === ".next") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await findProposalsJson(full, acc);
    else if (e.name === "proposals.json") acc.push(full);
  }
  return acc;
}

async function checkEmittedArtifacts() {
  const files = await findProposalsJson(ROOT, []);
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch {
      failures.push(`${file}: not valid JSON.`);
      continue;
    }
    const proposals = Array.isArray(parsed) ? parsed : (parsed.proposals ?? []);
    for (const p of proposals) {
      if (p && typeof p === "object" && "status" in p && p.status !== "PROPOSED") {
        failures.push(`${file}: contains a proposal with status "${p.status}" (must be "PROPOSED").`);
      }
    }
  }
}

async function main() {
  if (!(await exists(ENGINE))) {
    console.log("[discovery-shadow] discovery-engine.ts not present — nothing to guard. OK.");
    process.exit(0);
  }
  await checkStatusLiteral();
  await checkNoApplyPath();
  await checkEmittedArtifacts();

  if (failures.length === 0) {
    console.log("[discovery-shadow] OK — discovery loop is PROPOSED-only with no apply path or gate-writer import.");
    process.exit(0);
  }
  console.error("[discovery-shadow] FAIL — the discovery loop must never apply a change or flip a gate:");
  for (const f of failures) console.error(`  • ${f}`);
  console.error("\nThe owner alone flips a live gate. Keep discovery emitting PROPOSED artifacts only.");
  process.exit(1);
}

main().catch((err) => {
  console.error("[discovery-shadow] unexpected error:", err);
  process.exit(2);
});
