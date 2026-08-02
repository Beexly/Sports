#!/usr/bin/env node
/**
 * No raw NGS export guardrail.
 *
 * GSE can use cleared/open nflverse-derived aggregates where rights permit.
 * It must not claim official NFL/NGS equivalence, expose raw tracking rows, or
 * describe a public/API payload as a Next Gen Stats clone.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());
const SCAN_TARGETS = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
  "docs/api",
  "docs/ip",
  "docs/media",
  "docs/commercial",
];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".md"]);
const SKIP_DIRS = new Set(["__tests__", "node_modules", ".next", "dist", "coverage"]);
const SKIP_PATH_PARTS = [
  "/lib/ingestion/next-gen-stats",
  "/lib/nflverse/next-gen-stats",
  "/app/api/nflverse/next-gen-stats",
  "/docs/api/API_V1",
];

const BLOCKED_PATTERNS = [
  { id: "raw-ngs-export", pattern: /\b(raw\s+ngs|raw\s+next\s+gen\s+stats|raw\s+tracking\s+(?:feed|rows|data))\b/i },
  { id: "official-nfl-claim", pattern: /\bofficial\s+(?:nfl|next\s+gen\s+stats)\b/i },
  { id: "ngs-clone-claim", pattern: /\b(?:next\s+gen\s+stats|ngs)\s+(?:clone|same|replica|equivalent)\b/i },
  { id: "scraped-ngs", pattern: /\bscrap(?:e|ed|ing)\s+(?:nfl\.com|next\s+gen\s+stats|ngs)\b/i },
];

const SAFE_CONTEXT =
  /\b(no|not|never|without|blocked|avoid|policy|do not|dont|must not|cannot|can't|forbidden|guardrails?|source rights|rights permit|cleared|nflverse|aggregate|aggregates|not raw)\b/i;

function rel(filePath) {
  return relative(ROOT, filePath).split(sep).join("/");
}

function shouldSkipFile(filePath) {
  const normalized = `/${rel(filePath)}`;
  return SKIP_PATH_PARTS.some((part) => normalized.includes(part));
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

function scanLine(line, relPath, lineNumber) {
  const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length === 0 || SAFE_CONTEXT.test(normalized)) return [];
  return BLOCKED_PATTERNS.filter((entry) => entry.pattern.test(normalized)).map((entry) => ({
    file: relPath,
    id: entry.id,
    line: lineNumber,
    snippet: line.trim().slice(0, 220),
  }));
}

async function main() {
  const hits = [];
  let scanned = 0;
  for (const target of SCAN_TARGETS) {
    const abs = resolve(ROOT, target);
    let targetStat;
    try {
      targetStat = await stat(abs);
    } catch {
      continue;
    }
    const files = targetStat.isDirectory() ? await walk(abs) : [abs];
    for (const file of files) {
      if (shouldSkipFile(file)) continue;
      scanned++;
      const text = await readFile(file, "utf8");
      const relPath = rel(file);
      text.split(/\r?\n/).forEach((line, index) => hits.push(...scanLine(line, relPath, index + 1)));
    }
  }

  if (hits.length === 0) {
    console.log(`[no-raw-ngs-export] OK - scanned ${scanned} file(s); no raw NGS/export claims.`);
    return;
  }

  console.error(`[no-raw-ngs-export] FAIL - ${hits.length} raw NGS/export claim hit(s):`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line} [${hit.id}] "${hit.snippet}"`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("[no-raw-ngs-export] unexpected error:", error);
  process.exit(2);
});
