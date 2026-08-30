#!/usr/bin/env node
/**
 * AI control-plane sealing guardrail (directive §8.2).
 *
 * The control plane's public surface is `apps/web/lib/ai-control-plane/index.ts`
 * and its single executable entry point is `executeAiTask(request)` — with env,
 * policy source, dispatch, and receipt store sealed inside `executor.ts`. The
 * dependency-injected factory (`createAiExecutor`) and the env-taking
 * resolvers (`resolveEnvClass` / `resolveCostMode` / `effectiveMode`) exist
 * ONLY for tests and control-plane-internal modules, exported via
 * `internal.ts`.
 *
 * This guard makes that boundary machine-enforced instead of convention:
 *
 *   1. No module outside `apps/web/__tests__/` or
 *      `apps/web/lib/ai-control-plane/` may import (statically, dynamically,
 *      or via require) any SEALED control-plane module:
 *      `internal`, `executor`, `cost-mode`, or `emergency` — whether through
 *      the `@/` alias or a relative path.
 *   2. The public index may not (re-)export any of the DI/env-resolver VALUES
 *      (type-only re-exports are fine).
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(process.cwd());
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
]);

/** Control-plane modules whose import is restricted to tests/internal. */
const SEALED_MODULES = new Set(["internal", "executor", "cost-mode", "emergency"]);

/** Values the public index must never expose (§8.2). */
const FORBIDDEN_PUBLIC_EXPORTS = [
  "createAiExecutor",
  "resolveEnvClass",
  "resolveCostMode",
  "effectiveMode",
  "failClosedReceiptStore",
  "verifyEmergencyOverride",
];

const CONTROL_PLANE_DIR = "apps/web/lib/ai-control-plane";
const ALLOWED_IMPORTER_PREFIXES = [
  "apps/web/__tests__/",
  `${CONTROL_PLANE_DIR}/`,
];

function rel(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function violation(id, file, message, line = null) {
  return { file, id, line, message };
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
    if (entry.isFile()) files.push(join(dir, entry.name));
  }
  return files;
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * All import specifiers in a source text: static import/export-from,
 * side-effect imports, dynamic import(), and require().
 */
function* importSpecifiers(text) {
  const patterns = [
    // import ... from "spec" / export ... from "spec"
    /(?:^|[^.\w])(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']/gm,
    // side-effect import "spec"
    /(?:^|[^.\w])import\s*["']([^"']+)["']/gm,
    // dynamic import("spec")
    /(?:^|[^.\w])import\s*\(\s*["']([^"']+)["']\s*\)/gm,
    // require("spec")
    /(?:^|[^.\w])require\s*\(\s*["']([^"']+)["']\s*\)/gm,
  ];
  for (const rx of patterns) {
    for (const match of text.matchAll(rx)) {
      yield { specifier: match[1], index: match.index ?? 0 };
    }
  }
}

/**
 * Resolves an import specifier to a repo-relative path (posix separators,
 * extension stripped), or null when it cannot target repo code (bare package
 * specifiers).
 */
function resolveSpecifier(root, fromFile, specifier) {
  let absolute;
  if (specifier.startsWith("@/")) {
    absolute = resolve(root, "apps/web", specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    absolute = resolve(dirname(fromFile), specifier);
  } else {
    return null;
  }
  let repoRel = rel(root, absolute);
  repoRel = repoRel.replace(/\.(?:ts|tsx|js|jsx|mjs|cjs)$/, "");
  return repoRel;
}

function isSealedControlPlaneModule(repoRelSpecifier) {
  if (repoRelSpecifier === null) return false;
  if (!repoRelSpecifier.startsWith(`${CONTROL_PLANE_DIR}/`)) return false;
  const moduleName = repoRelSpecifier.slice(CONTROL_PLANE_DIR.length + 1);
  return SEALED_MODULES.has(moduleName);
}

function isAllowedImporter(repoRelFile) {
  return ALLOWED_IMPORTER_PREFIXES.some((prefix) =>
    repoRelFile.startsWith(prefix),
  );
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

async function scanImports(root, hits) {
  const files = (await walkFiles(root)).filter(
    (file) => SOURCE_EXTS.has(extname(file)) && !file.endsWith(".d.ts"),
  );
  for (const file of files) {
    const repoRelFile = rel(root, file);
    if (isAllowedImporter(repoRelFile)) continue;
    const text = await readIfExists(file);
    if (text === null) continue;
    for (const { specifier, index } of importSpecifiers(text)) {
      const resolved = resolveSpecifier(root, file, specifier);
      if (!isSealedControlPlaneModule(resolved)) continue;
      hits.push(
        violation(
          "ai-control-plane-sealed-import",
          repoRelFile,
          `Production module imports sealed control-plane module "${specifier}" ` +
            `(resolved: ${resolved}). Only apps/web/__tests__/** and ` +
            `${CONTROL_PLANE_DIR}/** may import internal/executor/cost-mode/` +
            `emergency; production code must use "@/lib/ai-control-plane" ` +
            `(executeAiTask) only.`,
          lineOf(text, index),
        ),
      );
    }
  }
}

/**
 * The public index must not re-export DI factories or env-taking resolvers as
 * VALUES. Type-only exports (`export type {...}` or a `type ` prefix inside an
 * export block) are permitted.
 */
async function scanPublicIndexSurface(root, hits) {
  const indexPath = resolve(root, CONTROL_PLANE_DIR, "index.ts");
  const text = await readIfExists(indexPath);
  if (text === null) return; // Repo layouts without the package have nothing to seal.
  const exportBlockRx = /export\s*(type\s*)?\{([^}]*)\}/g;
  for (const match of text.matchAll(exportBlockRx)) {
    const wholeBlockIsTypeOnly = match[1] !== undefined;
    if (wholeBlockIsTypeOnly) continue;
    const names = match[2]
      .split(",")
      .map((raw) => raw.trim())
      .filter((raw) => raw.length > 0)
      .filter((raw) => !raw.startsWith("type "))
      .map((raw) => raw.split(/\s+as\s+/)[0].trim());
    for (const name of names) {
      if (!FORBIDDEN_PUBLIC_EXPORTS.includes(name)) continue;
      hits.push(
        violation(
          "ai-control-plane-public-di-export",
          rel(root, indexPath),
          `Public control-plane index exports "${name}" as a value; DI ` +
            `factories and env-taking resolvers may only be exported from ` +
            `internal.ts (§8.2).`,
          lineOf(text, match.index ?? 0),
        ),
      );
    }
  }
}

export async function collectAiControlPlaneSealingViolations(
  root = DEFAULT_ROOT,
) {
  const resolvedRoot = resolve(root);
  const hits = [];
  await scanImports(resolvedRoot, hits);
  await scanPublicIndexSurface(resolvedRoot, hits);
  return hits;
}

async function main() {
  const root = parseRootArg(process.argv.slice(2));
  const hits = await collectAiControlPlaneSealingViolations(root);
  if (hits.length === 0) {
    console.log(
      "[ai-control-plane-sealing] OK - control-plane DI/env surface is sealed.",
    );
    return;
  }

  console.error(
    `[ai-control-plane-sealing] FAIL - ${hits.length} sealing violation(s):`,
  );
  for (const hit of hits) {
    const location = hit.line === null ? hit.file : `${hit.file}:${hit.line}`;
    console.error(`  ${location}  [${hit.id}]`);
    console.error(`    ${hit.message}`);
  }
  process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error("[ai-control-plane-sealing] unexpected error:", error);
    process.exit(2);
  });
}
