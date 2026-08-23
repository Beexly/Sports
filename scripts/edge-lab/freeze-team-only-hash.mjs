#!/usr/bin/env node
/**
 * freeze-team-only-hash — mechanical model-hash freeze for the team-only
 * forward MLB totals track (T01 / Path B).
 *
 * This is a DISTINCT manifest from the killed H-F5 cycle. It MUST NOT include
 * docs/ops/edge/2026-08-20-mve-prereg-v2.md or mve-model-js.ts (those are the
 * voided H-F5 hash). The prereg (T02) is added here once it exists; T01 hashes
 * only the two code files so the work can lock before the prereg is written.
 *
 * T01+T02 composite MANIFEST (locked — editing any of these moves the hash):
 *   packages/prediction-engine/src/research/mve-team-only-js.ts
 *   scripts/edge-lab/freeze-team-only-hash.mjs
 *   docs/ops/edge/2026-08-20-prereg-team-only-forward.md
 *
 * Usage:
 *   node scripts/edge-lab/freeze-team-only-hash.mjs            # print manifest + composite
 *   node scripts/edge-lab/freeze-team-only-hash.mjs --check X  # exit non-zero unless composite === X
 *
 * Exit codes: 0 clean · 1 missing manifest file or --check mismatch.
 * A missing file is a HARD failure, never a skipped line.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T01+T02 manifest: the code paths plus the forward prereg that defines the
 * unused shot's prospective track. T01 locked the two code files; T02
 * extends the manifest once the prereg exists so the protocol is bound too.
 */
export const MANIFEST = Object.freeze([
  "packages/prediction-engine/src/research/mve-team-only-js.ts",
  "scripts/edge-lab/freeze-team-only-hash.mjs",
  "docs/ops/edge/2026-08-20-prereg-team-only-forward.md",
]);

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * Hash a manifest under `root`. Pure: no printing, no process.exit, so the
 * test suite (or T02) can drive it over fixtures / extended manifests.
 */
export function computeFreeze(root, manifest = MANIFEST) {
  const entries = [];
  const missing = [];
  for (const rel of manifest) {
    const abs = resolve(root, rel);
    if (!existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    entries.push({ path: rel, digest: sha256(readFileSync(abs)) });
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const composite =
    missing.length > 0
      ? null
      : sha256(entries.map((e) => `${e.path}  ${e.digest}\n`).join(""));
  return { entries, missing, composite };
}

function main(argv) {
  const root = process.cwd();
  const { entries, missing, composite } = computeFreeze(root);

  for (const e of entries) console.log(`${e.digest}  ${e.path}`);

  if (missing.length > 0) {
    console.error(`\n[freeze-team-only-hash] FAIL — ${missing.length} manifest file(s) missing:`);
    for (const m of missing) console.error(`  ${m}`);
    console.error("\nThe model hash is NOT recorded until every manifest file exists.");
    return 1;
  }

  console.log(`\ncomposite  ${composite}`);

  const checkIdx = argv.indexOf("--check");
  if (checkIdx !== -1) {
    const expected = (argv[checkIdx + 1] ?? "").trim().toLowerCase();
    if (!expected) {
      console.error("[freeze-team-only-hash] FAIL — --check needs a digest argument.");
      return 1;
    }
    if (expected !== composite) {
      console.error(`[freeze-team-only-hash] FAIL — expected ${expected}, got ${composite}.`);
      console.error("The model or the protocol moved. The track is void from the point of the change.");
      return 1;
    }
    console.log("[freeze-team-only-hash] OK — composite matches the recorded digest.");
  }
  return 0;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  process.exit(main(process.argv.slice(2)));
}
