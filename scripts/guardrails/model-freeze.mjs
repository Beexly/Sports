#!/usr/bin/env node
/**
 * Model-freeze guardrail.
 *
 * Enforces: MODEL_VERSION (in packages/prediction-engine/src/constants.ts)
 * cannot be bumped unless the same change ALSO lands an IMPLEMENTED
 * CalibrationProposal artifact.
 *
 * Two evidence forms are accepted (either is sufficient):
 *
 *   1. A row in packages/db/prisma/seed.ts whose CalibrationProposal
 *      status === "IMPLEMENTED" and whose modelVersion matches the
 *      new MODEL_VERSION.
 *
 *   2. A file under docs/calibration-proposals/ whose front-matter or
 *      header declares status: IMPLEMENTED and modelVersion: <new>.
 *
 * If neither form exists, the script fails (exit 1). In CI this gates
 * the merge.
 *
 * The script is intentionally local-state-only: it does not require git
 * history. The current working tree must contain BOTH the new
 * MODEL_VERSION constant AND its matching implemented proposal.
 *
 * Rationale: a MODEL_VERSION bump is the only thing that re-labels
 * historical confidence numbers as "this is the model that produced
 * this pick." Allowing one without a paired, reviewed calibration
 * artifact is how spurious calibration claims sneak into production.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const CONSTANTS = resolve(ROOT, "packages/prediction-engine/src/constants.ts");
const SEED = resolve(ROOT, "packages/db/prisma/seed.ts");
const PROPOSALS_DIR = resolve(ROOT, "docs/calibration-proposals");

async function readModelVersion() {
  let text;
  try {
    text = await readFile(CONSTANTS, "utf8");
  } catch {
    throw new Error(`[model-freeze] cannot read ${CONSTANTS}`);
  }
  const m = text.match(/export\s+const\s+MODEL_VERSION\s*=\s*["']([^"']+)["']/);
  if (!m) {
    throw new Error(`[model-freeze] MODEL_VERSION not found in ${CONSTANTS}`);
  }
  return m[1];
}

async function hasSeedImplementedProposal(version) {
  let text;
  try {
    text = await readFile(SEED, "utf8");
  } catch {
    return false;
  }
  // Look for a CalibrationProposal object in seed.ts that names the
  // version explicitly AND marks status IMPLEMENTED. The match is
  // intentionally permissive (any pairing on the same record block).
  // We split the file into rough chunks by `{` `}` runs.
  const blocks = text.split(/\n\s*\n/);
  for (const block of blocks) {
    if (
      block.includes("CalibrationProposal") ||
      block.includes("calibrationProposal")
    ) {
      const hasVersion = block.includes(`"${version}"`) || block.includes(`'${version}'`);
      const hasImplemented =
        /status\s*:\s*["']IMPLEMENTED["']/i.test(block) ||
        /CalibrationProposalStatus\.IMPLEMENTED/.test(block);
      if (hasVersion && hasImplemented) return true;
    }
  }
  return false;
}

async function hasDocProposal(version) {
  let entries;
  try {
    entries = await readdir(PROPOSALS_DIR, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/\.(md|mdx)$/.test(entry.name)) continue;
    let text;
    try {
      text = await readFile(join(PROPOSALS_DIR, entry.name), "utf8");
    } catch {
      continue;
    }
    const versionMatch = new RegExp(`modelVersion\\s*:\\s*["']?${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?`, "i").test(text);
    const statusMatch = /status\s*:\s*["']?IMPLEMENTED["']?/i.test(text);
    if (versionMatch && statusMatch) return true;
  }
  return false;
}

async function main() {
  const version = await readModelVersion();
  console.log(`[model-freeze] current MODEL_VERSION = ${version}`);

  // Allow a permanently-frozen marker file to declare the current
  // version is the locked-in baseline (used when there is intentionally
  // no IMPLEMENTED proposal because no scoring weights changed since
  // the last frozen baseline).
  const FROZEN_MARKER = resolve(ROOT, "docs/calibration-proposals/FROZEN.md");
  let frozenMarkerLocks = false;
  try {
    const frozenText = await readFile(FROZEN_MARKER, "utf8");
    if (frozenText.includes(`frozen: ${version}`)) {
      frozenMarkerLocks = true;
    }
  } catch {
    // optional file
  }

  const okSeed = await hasSeedImplementedProposal(version);
  const okDoc = await hasDocProposal(version);

  if (okSeed || okDoc || frozenMarkerLocks) {
    console.log(
      `[model-freeze] OK — MODEL_VERSION ${version} backed by ${
        okSeed
          ? "seed.ts CalibrationProposal[IMPLEMENTED]"
          : okDoc
            ? "docs/calibration-proposals/*.md"
            : "FROZEN.md baseline marker"
      }`
    );
    process.exit(0);
  }

  console.error(`[model-freeze] FAIL — MODEL_VERSION ${version} has no IMPLEMENTED CalibrationProposal evidence.`);
  console.error("");
  console.error("To resolve:");
  console.error(`  1) Add a CalibrationProposal record to packages/db/prisma/seed.ts with`);
  console.error(`     modelVersion: "${version}", status: "IMPLEMENTED", and a real observation/proposedChange.`);
  console.error(`  2) OR add docs/calibration-proposals/<slug>.md with front-matter:`);
  console.error(`        modelVersion: ${version}`);
  console.error(`        status: IMPLEMENTED`);
  console.error(`  3) OR (only if no scoring weights changed) add docs/calibration-proposals/FROZEN.md`);
  console.error(`     with the line:  frozen: ${version}`);
  console.error("");
  console.error("MODEL_VERSION bumps without an implemented calibration artifact are blocked because they retroactively re-label historical confidence numbers.");
  process.exit(1);
}

main().catch((err) => {
  console.error("[model-freeze] unexpected error:", err);
  process.exit(2);
});
