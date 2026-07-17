#!/usr/bin/env node
/**
 * Affiliate structural-separation guardrail.
 *
 * The founder ruling (2026-07-16, reports/agent-handoffs/ACTIVE_AGENT_RELAY.md,
 * "FOUNDER RULINGS") turns affiliate revenue ON under a disclosed-conflict
 * model on one non-negotiable condition: pick generation stays structurally
 * separate from partner economics, machine-checked, not just promised. This
 * script IS that machine check.
 *
 * FORWARD direction — the engine/ingestion/worker layer must never read the
 * revenue side, so a partner deal can never quietly become a scoring input:
 *
 *   packages/prediction-engine/, packages/data-ingestion/,
 *   packages/ingestion-pipeline/, workers/*
 *     -> apps/web/lib/affiliate/, apps/web/lib/revenue/,
 *        apps/web/lib/cockpit/operator-registry.ts (the operator registry)
 *
 * REVERSE direction — the revenue side must never reach into the engine's
 * internals either, so the affiliate ledger / revenue-partner pipeline /
 * operator registry can never accidentally start driving scoring behavior:
 *
 *   apps/web/lib/affiliate/, apps/web/lib/revenue/,
 *   apps/web/lib/cockpit/operator-registry.ts
 *     -> packages/prediction-engine/, packages/data-ingestion/,
 *        packages/ingestion-pipeline/, workers/*
 *
 * Detection is textual/specifier-based, not a full module-resolution pass:
 * every import/require/dynamic-import specifier in the scanned source tree
 * is checked against forbidden path fragments. A relative specifier crossing
 * a package boundary always retains the literal "apps/web/lib/..." or
 * "packages/..."/"workers/..." path segment in between (see
 * workers/airwave-listener/src/dry-run.ts for a real example of this style
 * of cross-package relative import), so no module resolution is needed —
 * the same approach api-v1-boundary.mjs uses for its import scan.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(process.cwd());
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

// Matches the specifier string in `from "..."`, `require("...")`, and
// `import("...")` forms — covers static ESM imports, CJS requires, and
// dynamic imports.
const SPECIFIER_RE = /\b(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g;

const FORWARD_SOURCE_DIRS = [
  "packages/prediction-engine",
  "packages/data-ingestion",
  "packages/ingestion-pipeline",
  "workers",
];

const REVENUE_TARGETS = [
  {
    fragment: "apps/web/lib/affiliate",
    id: "engine-imports-affiliate-ledger",
    label: "apps/web/lib/affiliate/ (the affiliate payout ledger)",
  },
  {
    fragment: "apps/web/lib/revenue",
    id: "engine-imports-revenue-pipeline",
    label: "apps/web/lib/revenue/ (the revenue-partner pipeline)",
  },
  {
    fragment: "apps/web/lib/cockpit/operator-registry",
    id: "engine-imports-operator-registry",
    label: "apps/web/lib/cockpit/operator-registry.ts (the operator registry)",
  },
];

// Reverse-direction sources: the revenue side itself. A directory OR a single
// file may appear here (operator-registry.ts is one file, not a directory).
const REVENUE_SOURCE_PATHS = [
  "apps/web/lib/affiliate",
  "apps/web/lib/revenue",
  "apps/web/lib/cockpit/operator-registry.ts",
];

const ENGINE_TARGETS = [
  { fragment: "@sports/prediction-engine", id: "revenue-imports-prediction-engine", label: "@sports/prediction-engine" },
  { fragment: "packages/prediction-engine", id: "revenue-imports-prediction-engine-relative", label: "packages/prediction-engine (relative import)" },
  { fragment: "@sports/data-ingestion", id: "revenue-imports-data-ingestion", label: "@sports/data-ingestion" },
  { fragment: "packages/data-ingestion", id: "revenue-imports-data-ingestion-relative", label: "packages/data-ingestion (relative import)" },
  { fragment: "@sports/ingestion-pipeline", id: "revenue-imports-ingestion-pipeline", label: "@sports/ingestion-pipeline" },
  { fragment: "packages/ingestion-pipeline", id: "revenue-imports-ingestion-pipeline-relative", label: "packages/ingestion-pipeline (relative import)" },
  { fragment: "@sports/worker-", id: "revenue-imports-worker-package", label: "a worker package (@sports/worker-*)" },
  { fragment: "/workers/", id: "revenue-imports-workers-relative", label: "workers/ (relative import)" },
];

function rel(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function violation(id, file, line, message) {
  return { id, file, line, message };
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function statIfExists(filePath) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

function parseRootArg(argv) {
  const rootIndex = argv.indexOf("--root");
  if (rootIndex === -1) return DEFAULT_ROOT;
  const rootValue = argv[rootIndex + 1];
  return rootValue === undefined ? DEFAULT_ROOT : resolve(rootValue);
}

async function walkFiles(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkFiles(join(dir, entry.name), files);
      continue;
    }
    if (entry.isFile() && SOURCE_EXTS.has(extname(entry.name))) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

/** Resolve one REVENUE_SOURCE_PATHS entry (dir or single file) to a file list. */
async function resolveSourceFiles(root, sourcePath) {
  const abs = resolve(root, sourcePath);
  const st = await statIfExists(abs);
  if (!st) return [];
  if (st.isFile()) {
    return SOURCE_EXTS.has(extname(abs)) ? [abs] : [];
  }
  if (st.isDirectory()) {
    return walkFiles(abs);
  }
  return [];
}

function extractSpecifiers(text) {
  const specifiers = [];
  SPECIFIER_RE.lastIndex = 0;
  let match;
  while ((match = SPECIFIER_RE.exec(text)) !== null) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    specifiers.push({ specifier: match[1], line });
  }
  return specifiers;
}

async function scanFileForTargets(root, file, targets, hits) {
  const text = await readIfExists(file);
  if (text === null) return;
  const relPath = rel(root, file);
  for (const { specifier, line } of extractSpecifiers(text)) {
    const normalized = specifier.split(sep).join("/");
    for (const target of targets) {
      if (normalized.includes(target.fragment)) {
        hits.push(
          violation(
            target.id,
            relPath,
            line,
            `${relPath}:${line} imports ${target.label} via "${specifier}".`
          )
        );
      }
    }
  }
}

async function collectForwardViolations(root, hits) {
  for (const sourceDir of FORWARD_SOURCE_DIRS) {
    const abs = resolve(root, sourceDir);
    const files = await walkFiles(abs);
    for (const file of files) {
      await scanFileForTargets(root, file, REVENUE_TARGETS, hits);
    }
  }
}

async function collectReverseViolations(root, hits) {
  for (const sourcePath of REVENUE_SOURCE_PATHS) {
    const files = await resolveSourceFiles(root, sourcePath);
    for (const file of files) {
      await scanFileForTargets(root, file, ENGINE_TARGETS, hits);
    }
  }
}

export async function collectAffiliateStructuralSeparationViolations(root = DEFAULT_ROOT) {
  const resolvedRoot = resolve(root);
  const hits = [];
  await collectForwardViolations(resolvedRoot, hits);
  await collectReverseViolations(resolvedRoot, hits);
  return hits;
}

async function main() {
  const root = parseRootArg(process.argv.slice(2));
  const hits = await collectAffiliateStructuralSeparationViolations(root);

  if (hits.length === 0) {
    console.log(
      "[affiliate-structural-separation] OK - no coupling between the engine/ingestion/worker layer and the affiliate/revenue layer."
    );
    return;
  }

  console.error(`[affiliate-structural-separation] FAIL - ${hits.length} structural-separation violation(s):`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line}  [${hit.id}]`);
    console.error(`    ${hit.message}`);
  }
  process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error("[affiliate-structural-separation] unexpected error:", error);
    process.exit(2);
  });
}
