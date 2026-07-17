#!/usr/bin/env node
/**
 * Sealed-holdout open-call guardrail.
 *
 * walk-forward.ts's sealHoldout() returns an openHoldout(token) getter that
 * now requires BOTH the literal founder token AND process.env
 * GSE_ALLOW_HOLDOUT_OPEN === "true" (SealedHoldoutError explains both — see
 * FIX 6 / handoff §2 P0). That runtime check is belt; this script is
 * suspenders: openHoldout is meant to be called by a HUMAN at founder
 * sign-off (interactively, or from edge-lab's own scripts/tests that a
 * human runs by hand), never from application code that could invoke it
 * programmatically in CI/prod where the env var — by design — is never set.
 * Any `openHoldout(` CALL SITE outside
 * packages/prediction-engine/src/edge-lab/ (including its __tests__) is a
 * guardrail failure: the seal must never be something ordinary application
 * code can even ATTEMPT to open, token or no token.
 *
 * Detection is textual (same style as affiliate-structural-separation.mjs
 * and no-raw-ngs-export.mjs): a call-site regex scanned line by line, not a
 * full module-resolution pass.
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(process.cwd());
const SCAN_TARGETS = ["apps", "packages", "workers", "scripts"];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);
const ALLOWED_PREFIX = "packages/prediction-engine/src/edge-lab/";
// These files necessarily talk ABOUT `openHoldout(` in comments, doc
// strings, and (for the guard's own test) synthetic fixture source embedded
// as string literals to exercise detection — none of these are real call
// sites, so both are excluded the same way affiliate-structural-separation's
// guard test lives outside that guard's (narrower) scan targets entirely.
const SELF_PATHS = new Set([
  "scripts/guardrails/sealed-holdout-open-scan.mjs",
  "apps/web/__tests__/sealed-holdout-open-scan-guard.test.ts",
]);

// Matches a CALL, not the property definition (`openHoldout: (token) => ...`
// in walk-forward.ts has a colon between the name and the parenthesis, so it
// never matches this pattern) — `.openHoldout(`, `openHoldout(` (destructured
// call), optional whitespace before the parenthesis.
const CALL_RE = /\bopenHoldout\s*\(/;

function rel(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function parseRootArg(argv) {
  const rootIndex = argv.indexOf("--root");
  if (rootIndex === -1) return DEFAULT_ROOT;
  const rootValue = argv[rootIndex + 1];
  return rootValue === undefined ? DEFAULT_ROOT : resolve(rootValue);
}

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else if (entry.isFile() && SOURCE_EXTS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

export async function collectSealedHoldoutOpenViolations(root = DEFAULT_ROOT) {
  const resolvedRoot = resolve(root);
  const hits = [];
  for (const target of SCAN_TARGETS) {
    const abs = resolve(resolvedRoot, target);
    const files = await walk(abs);
    for (const file of files) {
      const relPath = rel(resolvedRoot, file);
      if (relPath.startsWith(ALLOWED_PREFIX) || SELF_PATHS.has(relPath)) continue;
      let text;
      try {
        text = await readFile(file, "utf8");
      } catch {
        continue;
      }
      text.split(/\r?\n/).forEach((line, index) => {
        if (CALL_RE.test(line)) {
          hits.push({
            file: relPath,
            line: index + 1,
            message: `${relPath}:${index + 1} calls openHoldout( outside edge-lab's own module/tests: "${line.trim().slice(0, 220)}"`,
          });
        }
      });
    }
  }
  return hits;
}

async function main() {
  const root = parseRootArg(process.argv.slice(2));
  const hits = await collectSealedHoldoutOpenViolations(root);

  if (hits.length === 0) {
    console.log(
      "[sealed-holdout-open-scan] OK - openHoldout( is called only inside packages/prediction-engine/src/edge-lab/."
    );
    return;
  }

  console.error(`[sealed-holdout-open-scan] FAIL - ${hits.length} openHoldout( call site(s) outside edge-lab:`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line}`);
    console.error(`    ${hit.message}`);
  }
  process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error("[sealed-holdout-open-scan] unexpected error:", error);
    process.exit(2);
  });
}
