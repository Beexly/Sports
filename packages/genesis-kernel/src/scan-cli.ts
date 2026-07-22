#!/usr/bin/env node
/**
 * `npm run genesis:scan` — emits the Codebase Twin summary + collision report.
 * Impure shell only: all logic lives in codebase-twin.ts (pure). Not exported
 * from index.ts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCodebaseTwin } from "./codebase-twin";
import { REPO_EVIDENCE } from "./repo-evidence";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../../tmp/genesis");
const OUT_FILE = resolve(OUT_DIR, "codebase-twin.json");

function main(): void {
  const twin = buildCodebaseTwin(REPO_EVIDENCE);

  console.log(`Codebase Twin v0 — ${twin.capabilities.length} capabilities, ${twin.collisions.length} collision findings`);
  console.log(`twinHash: ${twin.twinHash}\n`);
  for (const cap of twin.capabilities) {
    console.log(`  [${cap.effectiveState}] ${cap.id} (${cap.kind}) — ${cap.owner}`);
  }
  console.log("");
  for (const c of twin.collisions) {
    console.log(`  COLLISION ${c.collisionId} [${c.risk}]: ${c.capability} -> ${c.safeDisposition}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(twin, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${OUT_FILE}`);
}

main();
