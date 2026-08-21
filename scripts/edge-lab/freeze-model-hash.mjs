#!/usr/bin/env node
/**
 * freeze-model-hash — mechanical model-hash freeze for the MVE and the
 * prospective MLB-totals track.
 *
 * A pre-registration that says "frozen model hash: [to be recorded]" and never
 * explains HOW it is recorded is not frozen. Anyone can type a plausible hex
 * string in later, and nobody can prove the model that produced a capital path
 * is the model the protocol named. This script removes that latitude.
 *
 * It SHA-256s every file in a fixed MANIFEST, then SHA-256s the sorted
 * "path  digest" lines into one composite digest. The manifest deliberately
 * covers BOTH the code (model, e-process, runner) and the protocol documents,
 * so editing either one moves the hash.
 *
 * Usage:
 *   node scripts/edge-lab/freeze-model-hash.mjs            # print the manifest + composite
 *   node scripts/edge-lab/freeze-model-hash.mjs --check X  # exit non-zero unless composite === X
 *
 * Exit codes: 0 clean · 1 missing manifest file or --check mismatch.
 *
 * A missing file is a HARD failure, never a skipped line. Hashing a partial
 * manifest would produce a real-looking digest over a model that does not
 * exist, which is the exact failure this file is here to prevent.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** Fixed freeze manifest. Adding or removing a path is a protocol change. */
export const MANIFEST = Object.freeze([
  "packages/prediction-engine/src/research/mve-eprocess.ts",
  "packages/prediction-engine/src/research/efron-morris-js.ts",
  "scripts/edge-lab/run-mve.ts",
  "docs/ops/edge/2026-08-20-mve-prereg-v2.md",
  "docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md",
]);

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * Hash a manifest under `root`. Pure: no printing, no process.exit, so the
 * test suite can drive it over fixtures.
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
    console.error(`\n[freeze-model-hash] FAIL — ${missing.length} manifest file(s) missing:`);
    for (const m of missing) console.error(`  ${m}`);
    console.error("\nThe model hash is NOT recorded until every manifest file exists.");
    return 1;
  }

  console.log(`\ncomposite  ${composite}`);

  const checkIdx = argv.indexOf("--check");
  if (checkIdx !== -1) {
    const expected = (argv[checkIdx + 1] ?? "").trim().toLowerCase();
    if (!expected) {
      console.error("[freeze-model-hash] FAIL — --check needs a digest argument.");
      return 1;
    }
    if (expected !== composite) {
      console.error(`[freeze-model-hash] FAIL — expected ${expected}, got ${composite}.`);
      console.error("The model or the protocol moved. The track is void from the point of the change.");
      return 1;
    }
    console.log("[freeze-model-hash] OK — composite matches the recorded digest.");
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
