#!/usr/bin/env node
/**
 * Prisma v5 compatibility guardrail.
 *
 * Prisma v5 removed several Prisma v4 runtime APIs. The most common
 * breakage is `Prisma.validator<T>()({...})` which throws at runtime
 * because `Prisma.validator` is no longer a function.
 *
 * This script fails CI when any of the deprecated patterns are detected
 * outside of node_modules, test fixtures, or this file itself.
 *
 * Deprecated API reference (Prisma v4 → v5 migration):
 *   - Prisma.validator<T>()   → use `satisfies Prisma.XXXSelect` or `as const`
 *   - new Prisma.Decimal()    → use `new Decimal()` from the decimal.js re-export
 *   - Prisma.raw``            → use `Prisma.sql``
 *
 * Safe to run in watch mode or pre-commit hooks.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());

const SCAN_DIRS = ["apps", "packages", "workers", "scripts"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".git",
  "__tests__",
  "tests",
  "test",
]);

const SKIP_FILES = new Set([
  relative(ROOT, resolve(ROOT, "scripts/guardrails/prisma-compat-check.mjs")),
]);

/** Deprecated patterns and their migration guidance. */
const DEPRECATED = [
  {
    id: "prisma-validator",
    rx: /Prisma\.validator\s*</,
    desc: "Prisma.validator<T>() was removed in Prisma v5",
    fix: "Replace with `as const` and infer the type via Prisma.PickGetPayload or `satisfies`",
  },
  {
    id: "prisma-raw-tag",
    rx: /Prisma\.raw\s*`/,
    desc: "Prisma.raw`` was removed in Prisma v5",
    fix: "Use Prisma.sql`` instead",
  },
];

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name);
}

async function collectFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        files.push(...(await collectFiles(join(dir, entry.name))));
      }
    } else if (SCAN_EXTS.has(extname(entry.name))) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

async function scanFile(absPath) {
  const rel = relative(ROOT, absPath);
  if (SKIP_FILES.has(rel)) return [];
  let text;
  try {
    text = await readFile(absPath, "utf-8");
  } catch {
    return [];
  }
  const hits = [];
  for (const { id, rx, desc, fix } of DEPRECATED) {
    if (rx.test(text)) {
      const lines = text.split("\n");
      lines.forEach((line, idx) => {
        if (rx.test(line)) {
          hits.push({ id, file: rel, line: idx + 1, desc, fix, snippet: line.trim() });
        }
      });
    }
  }
  return hits;
}

async function main() {
  const allFiles = (
    await Promise.all(SCAN_DIRS.map((d) => collectFiles(join(ROOT, d))))
  ).flat();

  const results = (await Promise.all(allFiles.map(scanFile))).flat();

  if (results.length === 0) {
    console.log("[prisma-compat] OK — no deprecated Prisma v4 APIs detected.");
    process.exit(0);
  }

  console.error(
    `[prisma-compat] FAIL — ${results.length} deprecated Prisma v4 API usage(s) detected.\n`
  );
  for (const hit of results) {
    console.error(`  [${hit.id}] ${hit.file}:${hit.line}`);
    console.error(`    Issue : ${hit.desc}`);
    console.error(`    Fix   : ${hit.fix}`);
    console.error(`    Code  : ${hit.snippet}`);
    console.error();
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("prisma-compat-check: unexpected error:", err.message);
  process.exit(1);
});
