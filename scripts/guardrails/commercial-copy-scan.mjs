#!/usr/bin/env node
/**
 * Commercial-copy guardrail.
 *
 * Scans public commercial/media surfaces for tout-style betting copy and
 * unsupported commercial proof claims. Policy documents may discuss banned
 * terms as rules; this guard focuses on launch-facing routes and reusable copy
 * libraries where the text could become customer-facing.
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
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".md"]);
const SKIP_PARTS = new Set(["__tests__", "node_modules", ".next", "dist", "coverage"]);
const SKIP_PATH_PARTS = [
  "/lib/media-revenue/claim-safety",
  "/lib/revenue/banned-copy",
  "/lib/revenue/disclosure-policy",
  "/lib/revenue/responsible-gaming-policy",
];

const BANNED = [
  "lock",
  "guaranteed",
  "guarantee",
  "risk free",
  "risk-free",
  "free money",
  "can't lose",
  "cant lose",
  "100% winner",
  "sure thing",
  "easy money",
  "mortgage play",
  "max bet",
  "all in",
  "hammer this",
  "printing money",
  "can't miss",
  "cant miss",
];

const EVIDENCE_REQUIRED = [
  "win rate",
  "roi",
  "profit",
  "profitable",
  "verified",
  "proven",
  "calibrated",
  "beats market",
  "closing line value",
  "clv",
  "positive expected value",
  "+ev",
];

const SAFE_POLICY_CONTEXT =
  /\b(no|not|never|without|requires?|required|must|evidence|unsupported|fabricated|fake|avoid|block(?:ed|s)?|cannot|can't|do not|dont|unless|before|policy|rule|scanner|guardrail|claim governance)\b/i;
const TOUT_PATTERNS = [
  ["lock", /\b(?:a|the|tonight'?s|today'?s|our) lock\b/i],
  ["lock", /\block of the (?:day|night|week|year)\b/i],
  ["lock", /\block it in\b/i],
  ["guarantee", /\bguaranteed? (?:a )?(?:win|winner|profit|cash|money|return)/i],
  ["guarantee", /\b(?:win|winner|profit)s? guaranteed\b/i],
  ["risk free", /\brisk[- ]?free\b/i],
  ["free money", /\bfree money\b/i],
  ["can't lose", /\bcan'?t lose\b/i],
  ["100% winner", /\b100% winners?\b/i],
  ["sure thing", /\bsure thing\b/i],
  ["easy money", /\beasy money\b/i],
  ["mortgage play", /\bmortgage play\b/i],
  ["max bet", /\bmax bet\b/i],
  ["hammer this", /\bhammer this\b/i],
  ["printing money", /\bprint(?:ing|s)? money\b/i],
  ["can't miss", /\bcan'?t miss\b/i],
  ["all in", /\b(?:go|going|goes|went) all[- ]?in\b/i],
];

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
      if (SKIP_PARTS.has(entry.name)) continue;
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
      if (SKIP_PARTS.has(entry.name)) continue;
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

function isSafeNear(subject, index, length) {
  const start = Math.max(0, index - 60);
  const end = Math.min(subject.length, index + length + 24);
  const window = subject.slice(start, end);
  const clauses = window.split(/[.!?;—]/);
  const relativeIndex = index - start;
  let offset = 0;
  for (const clause of clauses) {
    if (relativeIndex >= offset && relativeIndex <= offset + clause.length) {
      return SAFE_POLICY_CONTEXT.test(clause);
    }
    offset += clause.length + 1;
  }
  return false;
}

function scanLine(line, relPath, lineNumber) {
  const normalized = normalizeScanText(line).toLowerCase().trim();
  if (normalized.startsWith("import ") || normalized.startsWith("export ")) return [];
  if (/^\s*[A-Z0-9_]+(?:\s+as\s+[A-Z0-9_]+)?,?\s*$/.test(line)) return [];
  if (normalized.length === 0) return [];
  const hits = [];
  for (const phrase of BANNED) {
    if (phraseRegex(phrase).test(normalized) && !SAFE_POLICY_CONTEXT.test(normalized)) {
      hits.push({ claim: "commercial-copy.banned", file: relPath, line: lineNumber, phrase, snippet: line.trim().slice(0, 220) });
    }
  }
  for (const phrase of EVIDENCE_REQUIRED) {
    if (phraseRegex(phrase).test(normalized) && !SAFE_POLICY_CONTEXT.test(normalized)) {
      hits.push({
        claim: "commercial-copy.evidence-required",
        file: relPath,
        line: lineNumber,
        phrase,
        snippet: line.trim().slice(0, 220),
      });
    }
  }
  return hits;
}

function scanToutLine(lines, index, relPath) {
  const hits = [];
  const subjects = lineViews(lines[index]);
  const paired = pairView(lines, index);
  for (const [phrase, pattern] of TOUT_PATTERNS) {
    const candidates = paired === null ? subjects : [...subjects, paired];
    const unsafe = candidates.some((subject) => {
      const match = pattern.exec(subject);
      return match !== null && !isSafeNear(subject, match.index, match[0].length);
    });
    if (unsafe) {
      hits.push({
        claim: "commercial-copy.tout",
        file: relPath,
        line: index + 1,
        phrase,
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
    if (deepScanned.has(file) || shouldSkipFile(file)) continue;
    scanned++;
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    const relPath = rel(file);
    lines.forEach((_line, index) => hits.push(...scanToutLine(lines, index, relPath)));
  }

  if (hits.length === 0) {
    console.log(`[commercial-copy-scan] OK - scanned ${scanned} file(s); no unsafe commercial copy.`);
    return;
  }

  console.error(`[commercial-copy-scan] FAIL - ${hits.length} unsafe commercial copy hit(s):`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line} [${hit.claim}:${hit.phrase}] "${hit.snippet}"`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("[commercial-copy-scan] unexpected error:", error);
  process.exit(2);
});
