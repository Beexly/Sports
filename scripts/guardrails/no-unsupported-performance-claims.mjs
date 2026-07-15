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
import { collapseStringJoins, normalizeScanText } from "./scan-normalize.mjs";

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
const PUBLIC_APP_ROOT = "apps/web/app";
const RENDERED_ROUTE_FILES = new Set([
  "page.tsx",
  "layout.tsx",
  "template.tsx",
  "error.tsx",
  "not-found.tsx",
  "loading.tsx",
  "opengraph-image.tsx",
]);
const PRIVATE_ROUTE_ROOTS = new Set(["api", "admin", "cockpit"]);
const NUMERIC_CLAIM_PATTERNS = [
  ["percent-performance", /\b\d{1,3}(?:\.\d+)?%\s*(?:win|hit|roi|accuracy|success)\b/i],
  ["percent-performance", /\b(?:win|hit|success)(?:\s|-)rate of \d{1,3}(?:\.\d+)?%/i],
  ["units-won", /\b(?:up|won|\+)\s?\d+(?:\.\d+)?\s?units\b/i],
  ["streak-claim", /\b(?:hit|won|cash(?:ed)?) \d+ of (?:the )?last \d+\b/i],
  ["record-claim", /\b\d+[-–]\d+\s+(?:ats|run|streak|record)\b/i],
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

async function walkRenderedRoutes(dir, isRoot = true, files = []) {
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
      if (isRoot && PRIVATE_ROUTE_ROOTS.has(entry.name)) continue;
      await walkRenderedRoutes(full, false, files);
    } else if (entry.isFile() && RENDERED_ROUTE_FILES.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function lineViews(line) {
  const normalized = normalizeScanText(line).toLowerCase().trim();
  const collapsed = collapseStringJoins(normalized);
  return normalized === collapsed ? [normalized] : [normalized, collapsed];
}

function pairView(lines, index) {
  if (index + 1 >= lines.length) return null;
  return normalizeScanText(
    `${collapseStringJoins(lines[index])} ${collapseStringJoins(lines[index + 1])}`,
  ).toLowerCase();
}

function scanLine(line, relPath, lineNumber) {
  const normalized = normalizeScanText(line).toLowerCase().trim();
  if (normalized.length === 0 || SAFE_CONTEXT.test(normalized)) return [];
  return CLAIMS.filter((claim) => phraseRegex(claim).test(normalized)).map((claim) => ({
    claim,
    file: relPath,
    line: lineNumber,
    snippet: line.trim().slice(0, 220),
  }));
}

function scanNumericClaimLine(lines, index, relPath) {
  const subjects = lineViews(lines[index]);
  const paired = pairView(lines, index);
  const candidates = paired === null ? subjects : [...subjects, paired];
  const hits = [];
  for (const [label, pattern] of NUMERIC_CLAIM_PATTERNS) {
    const unsupported = candidates.some(
      (subject) => pattern.test(subject) && !SAFE_CONTEXT.test(subject),
    );
    if (unsupported) {
      hits.push({
        claim: `hardcoded-numeric:${label}`,
        file: relPath,
        line: index + 1,
        snippet: lines[index].trim().slice(0, 220),
      });
    }
  }
  return hits;
}

async function main() {
  const hits = [];
  let scanned = 0;
  const deepScanned = new Set();
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
      if (deepScanned.has(file) || shouldSkipFile(file)) continue;
      deepScanned.add(file);
      scanned++;
      const text = await readFile(file, "utf8");
      const relPath = rel(file);
      text.split(/\r?\n/).forEach((line, index) => hits.push(...scanLine(line, relPath, index + 1)));
    }
  }

  const renderedRoutes = await walkRenderedRoutes(resolve(ROOT, PUBLIC_APP_ROOT));
  for (const file of renderedRoutes) {
    if (shouldSkipFile(file)) continue;
    if (!deepScanned.has(file)) scanned++;
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    const relPath = rel(file);
    lines.forEach((_line, index) =>
      hits.push(...scanNumericClaimLine(lines, index, relPath)),
    );
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
