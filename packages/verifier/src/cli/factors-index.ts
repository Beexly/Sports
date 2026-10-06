#!/usr/bin/env tsx
/**
 * npm run factors:index
 *
 * Reads docs/factors/*.yaml, validates pre-registration, writes INDEX.md.
 * Refuses to write when any scored spec fails pre-registration (§4.1).
 */

import path from "node:path";
import { buildFactGraph } from "../factgraph";

function repoRootFromCwd(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(path.join("packages", "verifier"))) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

function main(): number {
  const repoRoot = repoRootFromCwd();
  const factorsDir = path.join(repoRoot, "docs", "factors");
  const result = buildFactGraph(factorsDir, { write: true });
  if (!result.ok) {
    console.error("[factors:index] pre-registration failed — INDEX.md not written:");
    for (const c of result.checks) {
      for (const e of c.check.errors) console.error(`  ${c.id}: ${e}`);
    }
    return 1;
  }
  console.log(
    `[factors:index] wrote ${path.join(factorsDir, "INDEX.md")} (${result.specs.length} specs)`,
  );
  for (const c of result.checks) {
    for (const w of c.check.warnings) console.warn(`  warn ${c.id}: ${w}`);
  }
  return 0;
}

process.exit(main());
