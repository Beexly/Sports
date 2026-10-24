#!/usr/bin/env node
/**
 * census-engine-reachability.mjs — import-graph reachability of prediction-engine modules.
 *
 * Implements PR-4 reachability census and CI verification gate.
 * Traverses ESM import dependencies from production entries.
 *
 * Usage:
 *   node scripts/ops/census-engine-reachability.mjs
 *   node scripts/ops/census-engine-reachability.mjs --check
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PE_DIR = join(ROOT, "packages", "prediction-engine", "src");

function loadFiles(dir) {
  const files = new Map();
  function walk(current) {
    for (const ent of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, ent.name);
      if (ent.isDirectory()) {
        if (["node_modules", ".git", "dist"].includes(ent.name)) continue;
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith(".ts") && !ent.name.endsWith(".test.ts")) {
        const rel = relative(dir, full).replace(/\\/g, "/");
        const modKey = rel.slice(0, -3); // remove .ts
        files.set(modKey, full);
      }
    }
  }
  if (existsSync(dir)) walk(dir);
  return files;
}

function buildDeps(files) {
  const depMap = new Map();
  const importRegex = /from\s+["'](\.[^"']+)["']/g;

  for (const [mod, filePath] of files.entries()) {
    const deps = new Set();
    try {
      const code = readFileSync(filePath, "utf8");
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        let target = match[1].replace(/^\.\//, "");
        if (target.endsWith(".js") || target.endsWith(".ts")) {
          target = target.slice(0, -3);
        }
        if (files.has(target)) {
          deps.add(target);
        } else if (files.has(target + "/index")) {
          deps.add(target + "/index");
        }
      }
    } catch {
      // ignore read error
    }
    depMap.set(mod, Array.from(deps));
  }
  return depMap;
}

function computeReachability(files, depMap, entryPoints) {
  const reachable = new Set();
  const stack = [...entryPoints];

  while (stack.length > 0) {
    const mod = stack.pop();
    if (!mod || reachable.has(mod) || !files.has(mod)) continue;
    reachable.add(mod);
    const deps = depMap.get(mod) || [];
    for (const d of deps) {
      stack.push(d);
    }
  }
  return reachable;
}

const peFiles = loadFiles(PE_DIR);
const depMap = buildDeps(peFiles);

const PROD_ENTRIES = [
  "scoring",
  "edge-engine",
  "game-context",
  "index",
  "settlement",
  "ranking-prob",
  "historical-replay",
  "readiness",
  "calibration-apply",
  "published-line",
  "proof-of-record",
  "pick-proof-receipt",
];

const reachable = computeReachability(peFiles, depMap, PROD_ENTRIES);
const isArxiv = (m) => /(^|\/)\d{4}-\d{5}/.test(m);

const total = peFiles.size;
const reachableCount = reachable.size;
const unreachable = [];
const arxivReachable = [];
const arxivUnreachable = [];

for (const mod of peFiles.keys()) {
  const reached = reachable.has(mod);
  const arxiv = isArxiv(mod);
  if (reached) {
    if (arxiv) arxivReachable.push(mod);
  } else {
    unreachable.push(mod);
    if (arxiv) arxivUnreachable.push(mod);
  }
}

const report = {
  total_modules: total,
  reachable_from_prod: reachableCount,
  unreachable_total: unreachable.length,
  arxiv_reachable: arxivReachable.length,
  arxiv_unreachable: arxivUnreachable.length,
};

console.log("=== ENGINE REACHABILITY CENSUS");
console.log(`    Total non-test modules:         ${total}`);
console.log(`    Reachable from prod entries:    ${reachableCount}`);
console.log(`    Unreachable total:              ${unreachable.length}`);
console.log(`    arXiv-derived reachable:        ${arxivReachable.length}`);
console.log(`    arXiv-derived unreachable:      ${arxivUnreachable.length}`);

if (process.argv.includes("--check")) {
  const expectedPath = join(ROOT, "reconciliation", "reachability.json");
  if (existsSync(expectedPath)) {
    const expected = JSON.parse(readFileSync(expectedPath, "utf8")).prediction_engine_src;
    if (expected) {
      console.log("\nVerifying against baseline reconciliation/reachability.json:");
      console.log(`  Expected unreachable: ${expected.unreachable_total}, Measured: ${unreachable.length}`);
      if (unreachable.length > expected.unreachable_total) {
        console.error(`REGRESSION: unreachable modules increased from ${expected.unreachable_total} to ${unreachable.length}`);
        process.exit(1);
      }
      console.log("  OK: No reachability regressions detected.");
    }
  }
}
