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
// FULL PUBLIC-SURFACE SWEEP (adversarial finding O-2.1): the deep-scan
// targets above covered 7 of ~60 public app dirs — tout copy on the
// homepage, board, picks, or fantasy pages passed every gate. Every
// RENDERED route file under app/ is now swept (page/layout/template/
// error/not-found/loading/opengraph-image), excluding auth-gated operator
// surfaces and JSON API routes, whose response shapes are covered by
// dedicated tests and whose code comments legitimately discuss lock-time
// lines and CLV internals.
const PUBLIC_APP_ROOT = "apps/web/app";
const RENDERED_BASENAMES = new Set([
  "page.tsx",
  "layout.tsx",
  "template.tsx",
  "error.tsx",
  "not-found.tsx",
  "loading.tsx",
  "opengraph-image.tsx",
]);
const NON_PUBLIC_TOP_DIRS = new Set(["api", "admin", "cockpit"]);
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

// Tout-pattern detectors for the FULL public sweep. The strict single-word
// list above stays as-is on the commercial SCAN_TARGETS, but it cannot run
// over all 204 rendered routes: "lock" is core product vocabulary there
// (lock-time lines, the Merkle root committed at lock) and "guarantee"
// names the grandfathered-pricing promise. These patterns match the tout
// USAGE — "lock of the day", "guaranteed winner" — not the word.
const TOUT_PATTERNS = [
  ["lock", /\b(?:a|the|tonight'?s|today'?s|our) lock\b/i],
  ["lock", /\block of the (?:day|night|week|year)\b/i],
  ["lock", /\block it in\b/i],
  ["lock", /\bstone[- ]?cold lock\b/i],
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

/** All rendered route files under app/, excluding non-public top dirs. */
async function walkRenderedSurfaces(dir, isTop, files = []) {
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
      if (isTop && NON_PUBLIC_TOP_DIRS.has(entry.name)) continue;
      await walkRenderedSurfaces(full, false, files);
    } else if (entry.isFile() && RENDERED_BASENAMES.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function scanLine(line, relPath, lineNumber) {
  const normalized = line.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
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

function scanToutLine(line, relPath, lineNumber) {
  const normalized = line.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return [];
  if (normalized.startsWith("import ") || normalized.startsWith("export ")) return [];
  if (SAFE_POLICY_CONTEXT.test(normalized)) return [];
  const hits = [];
  for (const [label, pattern] of TOUT_PATTERNS) {
    if (pattern.test(normalized)) {
      hits.push({ claim: "commercial-copy.tout", file: relPath, line: lineNumber, phrase: label, snippet: line.trim().slice(0, 220) });
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

  // Public sweep: tout-usage patterns over every rendered route file. Files
  // already deep-scanned above are not re-scanned (the strict list subsumes
  // the tout patterns there).
  const sweepFiles = await walkRenderedSurfaces(resolve(ROOT, PUBLIC_APP_ROOT), true);
  for (const file of sweepFiles) {
    if (deepScanned.has(file) || shouldSkipFile(file)) continue;
    scanned++;
    const text = await readFile(file, "utf8");
    const relPath = rel(file);
    text.split(/\r?\n/).forEach((line, index) => hits.push(...scanToutLine(line, relPath, index + 1)));
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
