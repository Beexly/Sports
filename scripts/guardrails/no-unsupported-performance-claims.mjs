#!/usr/bin/env node
/**
 * Unsupported performance claim guardrail.
 *
 * Public performance language must be evidence-gated. This scanner flags
 * customer-facing claims about win rate, ROI, profit, CLV, calibration, or
 * market-beating language unless the line is clearly a policy/blocked/evidence
 * context. It deliberately avoids docs that define the policy.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());
const SCAN_TARGETS = [
  "apps/web/app/media-kit",
  "apps/web/app/partners",
  "apps/web/app/newsletter",
  "apps/web/app/content-lab",
  "apps/web/app/podcast",
  "apps/web/app/pricing",
  "apps/web/app/promotions",
  "apps/web/lib/media-revenue",
  "apps/web/lib/revenue",
];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set(["__tests__", "node_modules", ".next", "dist", "coverage"]);
const SKIP_PATH_PARTS = [
  "/lib/trust-claims",
  "/lib/media-revenue/claim-safety",
  "/lib/revenue/banned-copy",
  "/lib/revenue/disclosure-policy",
  "/lib/revenue/responsible-gaming-policy",
  "/lib/safety/content-safety",
  "/lib/promotions/copy-rules",
  "/lib/content-generator",
];

const CLAIMS = [
  "win rate",
  "roi",
  "profit",
  "profitable",
  "verified",
  "proven",
  "calibrated",
  "beats market",
  "beat the market",
  "closing line value",
  "clv",
  "positive expected value",
  "+ev",
];

const SAFE_CONTEXT =
  /\b(no|not|never|without|requires?|required|must|evidence|unsupported|fabricated|fake|avoid|block(?:ed|s)?|cannot|can't|do not|dont|unless|before|policy|rule|scanner|guardrail|claim governance|sample|window|model version|settled|threshold|public-claim approval)\b/i;

function rel(filePath) {
  return relative(ROOT, filePath).split(sep).join("/");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseRegex(phrase) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase)}([^a-z0-9]|$)`, "i");
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
  const normalized = line.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  if (normalized.length === 0 || SAFE_CONTEXT.test(normalized)) return [];
  return CLAIMS.filter((claim) => phraseRegex(claim).test(normalized)).map((claim) => ({
    claim,
    file: relPath,
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
    console.log(`[no-unsupported-performance-claims] OK - scanned ${scanned} file(s); no unsupported performance claims.`);
    return;
  }

  console.error(`[no-unsupported-performance-claims] FAIL - ${hits.length} unsupported performance claim hit(s):`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line} [${hit.claim}] "${hit.snippet}"`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("[no-unsupported-performance-claims] unexpected error:", error);
  process.exit(2);
});
