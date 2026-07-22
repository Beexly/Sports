#!/usr/bin/env node
/**
 * NOVA convergence inventory verifier (directive section 3).
 *
 * Re-derives the deterministic inventory artifacts from the SHAs recorded in
 * the committed receipt, then compares:
 *
 *   1. the sha256 of the regenerated INVENTORY.json/md against the hashes
 *      recorded in NOVA_CONVERGENCE_RECEIPT.json, and
 *   2. the sha256 of the committed artifact files on disk against the same
 *      recorded hashes.
 *
 * Any mismatch (or any inability to re-derive) exits nonzero. This makes the
 * committed evidence self-checking: a model may interpret the receipt, but it
 * cannot silently rewrite it.
 *
 * Exit codes:
 *   0 — receipt, committed artifacts, and re-derived artifacts all agree
 *   1 — hash mismatch (evidence does not match repository facts)
 *   2 — re-derivation was incomplete (unparsable file) — fail closed
 *   3 — usage / environment error (missing receipt, bad refs, etc.)
 */

import { readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  ARTIFACT_NAMES,
  buildInventory,
  deriveArtifacts,
  sha256Hex,
} from "./build-convergence-inventory.mjs";

const EXIT = Object.freeze({ OK: 0, MISMATCH: 1, INCOMPLETE: 2, USAGE: 3 });

export function verify({ repoPath, outDir, manifestPath }) {
  const failures = [];
  const receiptPath = join(outDir, ARTIFACT_NAMES.receiptJson);
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch (err) {
    return { exitCode: EXIT.USAGE, failures: [`cannot read receipt ${receiptPath}: ${err.message}`] };
  }

  const { baseSha, headSha } = receipt.refs ?? {};
  if (!baseSha || !headSha) {
    return { exitCode: EXIT.USAGE, failures: [`receipt ${receiptPath} missing refs.baseSha/headSha`] };
  }

  let buildResult;
  try {
    buildResult = buildInventory({
      repoPath,
      baseRef: baseSha,
      headRef: headSha,
      manifestPath,
    });
  } catch (err) {
    return { exitCode: EXIT.USAGE, failures: [`re-derivation failed: ${err.message}`] };
  }
  if (!buildResult.scanComplete) {
    return {
      exitCode: EXIT.INCOMPLETE,
      failures: buildResult.inventory.unparsedFiles.map(
        (u) => `re-derivation incomplete (fail closed): ${u.path} — ${u.reason}`,
      ),
    };
  }

  const rederived = deriveArtifacts(buildResult);
  const expected = new Map([
    [ARTIFACT_NAMES.inventoryJson, sha256Hex(rederived.inventoryJson)],
    [ARTIFACT_NAMES.inventoryMd, sha256Hex(rederived.inventoryMd)],
  ]);

  const recorded = new Map();
  for (const a of receipt.artifacts ?? []) {
    recorded.set(a.path.split("/").pop(), a.sha256);
  }

  for (const [name, freshHash] of expected) {
    const recordedHash = recorded.get(name);
    if (!recordedHash) {
      failures.push(`receipt has no artifact hash for ${name}`);
      continue;
    }
    if (recordedHash !== freshHash) {
      failures.push(
        `receipt hash for ${name} (${recordedHash}) != re-derived hash (${freshHash})`,
      );
    }
    let committedHash;
    try {
      committedHash = sha256Hex(readFileSync(join(outDir, name), "utf8"));
    } catch (err) {
      failures.push(`cannot read committed artifact ${name}: ${err.message}`);
      continue;
    }
    if (committedHash !== freshHash) {
      failures.push(
        `committed ${name} hash (${committedHash}) != re-derived hash (${freshHash})`,
      );
    }
  }

  return { exitCode: failures.length === 0 ? EXIT.OK : EXIT.MISMATCH, failures };
}

function main() {
  let repoPath;
  let outDir;
  let manifestPath;
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        repo: { type: "string", default: process.cwd() },
        out: { type: "string", default: "reports/nova/convergence" },
        manifest: { type: "string" },
      },
    });
    repoPath = resolve(values.repo);
    outDir = isAbsolute(values.out) ? values.out : join(repoPath, values.out);
    manifestPath = values.manifest
      ? resolve(values.manifest)
      : join(repoPath, "scripts/nova/convergence-owners.json");
  } catch (err) {
    process.stderr.write(`[convergence-verify] usage error: ${err.message}\n`);
    process.exit(EXIT.USAGE);
  }

  const { exitCode, failures } = verify({ repoPath, outDir, manifestPath });
  if (exitCode === EXIT.OK) {
    process.stderr.write("[convergence-verify] OK — receipt, committed artifacts, and re-derived artifacts agree\n");
  } else {
    for (const f of failures) process.stderr.write(`[convergence-verify] FAIL: ${f}\n`);
  }
  process.exit(exitCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
