#!/usr/bin/env node
/**
 * tsconfig-health guardrail.
 *
 * TypeScript 5.5+ emits TS5107 / TS5101 errors for deprecated options
 * (`moduleResolution: "node"`, `baseUrl` in bundler mode) that will be
 * removed in TypeScript 6.0. These errors break `npm run typecheck` in
 * CI.
 *
 * Invariant: every tsconfig.json in the repo must silence these by either:
 *
 *   1. Extending a config that already has `"ignoreDeprecations": "6.0"` set
 *      (e.g. extends ../../tsconfig.base.json), OR
 *   2. Declaring `"ignoreDeprecations": "6.0"` in its own compilerOptions, OR
 *   3. Not using any deprecated options (modern moduleResolution).
 *
 * This script checks condition (1) and (2) for every tsconfig that uses
 * a deprecated option. A new tsconfig that uses `moduleResolution: "node"`,
 * `moduleResolution: "node10"`, or `baseUrl` must either extend the shared
 * base or include `ignoreDeprecations` itself.
 *
 * Excluded: tsconfig.base.json itself (it sets the canonical value),
 *           node_modules, .next, dist.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "coverage", ".git"]);

const DEPRECATED_MODULE_RESOLUTIONS = new Set(["node", "node10"]);

/** Walk the tree and return all tsconfig.json paths. */
async function findTsconfigs(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findTsconfigs(full)));
    } else if (entry.isFile() && entry.name === "tsconfig.json") {
      results.push(full);
    }
  }
  return results;
}

/** Read and parse a JSON file, returning null on error. */
async function readJson(path) {
  try {
    const text = await readFile(path, "utf8");
    // Strip single-line comments (TypeScript tsconfigs allow them).
    const stripped = text.replace(/^\s*\/\/.*$/gm, "");
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

/** Return true if this config (or a chain of extends) has ignoreDeprecations set. */
async function hasIgnoreDeprecations(configPath, visited = new Set()) {
  if (visited.has(configPath)) return false;
  visited.add(configPath);

  const config = await readJson(configPath);
  if (!config) return false;

  if (config.compilerOptions?.ignoreDeprecations) return true;

  if (config.extends) {
    const baseExtends = Array.isArray(config.extends)
      ? config.extends
      : [config.extends];
    for (const ext of baseExtends) {
      const parentPath = resolve(configPath, "..", ext.replace(/\/$/, ""));
      const candidates = parentPath.endsWith(".json")
        ? [parentPath]
        : [`${parentPath}.json`, join(parentPath, "tsconfig.json")];
      for (const candidate of candidates) {
        try {
          await stat(candidate);
          if (await hasIgnoreDeprecations(candidate, visited)) return true;
        } catch {
          // file doesn't exist at this candidate path
        }
      }
    }
  }

  return false;
}

/** Return true if a config uses a deprecated option that requires ignoreDeprecations. */
function usesDeprecatedOption(config) {
  const opts = config.compilerOptions ?? {};
  const mr = (opts.moduleResolution ?? "").toLowerCase();
  if (DEPRECATED_MODULE_RESOLUTIONS.has(mr)) return true;
  // baseUrl is deprecated under bundler resolution; flag it when present.
  if ("baseUrl" in opts) return true;
  return false;
}

async function main() {
  const tsconfigs = await findTsconfigs(ROOT);

  // Exclude the canonical base itself.
  const BASE = resolve(ROOT, "tsconfig.base.json");
  const toCheck = tsconfigs.filter((p) => p !== BASE);

  const failures = [];

  for (const configPath of toCheck) {
    const config = await readJson(configPath);
    if (!config) continue;

    if (!usesDeprecatedOption(config)) continue;

    const ok = await hasIgnoreDeprecations(configPath);
    if (!ok) {
      failures.push(relative(ROOT, configPath));
    }
  }

  if (failures.length === 0) {
    console.log("✓ tsconfig-health: all tsconfigs with deprecated options have ignoreDeprecations set.");
    process.exit(0);
  }

  console.error("✗ tsconfig-health: the following tsconfigs use deprecated TypeScript options");
  console.error("  without suppression via ignoreDeprecations: \"6.0\".\n");
  for (const f of failures) {
    console.error(`  ${f}`);
  }
  console.error(
    "\nFix: add \"ignoreDeprecations\": \"6.0\" to compilerOptions, or extend tsconfig.base.json" +
    " (which already has it)."
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("tsconfig-health: unexpected error:", err);
  process.exit(1);
});
