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
import { normalizeScanLine, collapseStringJoins } from "./scan-normalize.mjs";

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
// targets above covered 7 of ~60 public app dirs. The word-list CLAIMS
// cannot run over all rendered routes (the evidence surfaces — /clv,
// /calibration, /accountability — legitimately name these concepts on
// nearly every line), so the sweep instead hunts the actual crime:
// HARDCODED numeric performance claims in source. Real numbers on evidence
// surfaces arrive through variables from settled data; a literal
// "68% win rate" or "14-3 ATS run" in JSX is a fabricated stat wherever it
// appears (non-negotiable #2).
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

/** Normalized + join-collapsed views of a raw line (O-3.x shared pipeline). */
function viewsOf(line) {
  const normalized = normalizeScanLine(line).toLowerCase().trim();
  const joined = collapseStringJoins(normalized);
  return normalized === joined ? [normalized] : [normalized, joined];
}
function joinView(line) {
  return collapseStringJoins(normalizeScanLine(line).toLowerCase());
}
function pairSubjectOf(rawLines, i) {
  return i + 1 < rawLines.length
    ? `${joinView(rawLines[i]).trimEnd()} ${joinView(rawLines[i + 1]).trimStart()}`
    : null;
}

function scanLine(rawLines, i, relPath) {
  const line = rawLines[i];
  const subjects = viewsOf(line);
  const normalized = subjects[0];
  if (normalized.length === 0) return [];
  const pairSubject = pairSubjectOf(rawLines, i);
  const hits = [];
  for (const claim of CLAIMS) {
    const re = phraseRegex(claim);
    // Descriptive concept words carry a line-wide safe-context exemption (they
    // fire on legitimate evidence surfaces); the O-3.x hardening here is the
    // shared normalize (confusables), the join-collapse view (concat splits),
    // and cross-line pairing for multi-word claims.
    const inline = subjects.some((subj) => re.test(subj) && !SAFE_CONTEXT.test(subj));
    if (inline) {
      hits.push({ claim, file: relPath, line: i + 1, snippet: line.trim().slice(0, 220) });
      continue;
    }
    if (claim.includes(" ") && pairSubject !== null && re.test(pairSubject) && !SAFE_CONTEXT.test(pairSubject)) {
      hits.push({ claim, file: relPath, line: i + 1, snippet: pairSubject.trim().slice(0, 220) });
    }
  }
  return hits;
}

function scanNumericClaimLine(rawLines, i, relPath) {
  const line = rawLines[i];
  const subjects = viewsOf(line);
  const normalized = subjects[0];
  if (normalized.length === 0) return [];
  const pairSubject = pairSubjectOf(rawLines, i);
  const hits = [];
  for (const [label, pattern] of NUMERIC_CLAIM_PATTERNS) {
    const inline = subjects.some((subj) => pattern.test(subj) && !SAFE_CONTEXT.test(subj));
    if (inline) {
      hits.push({ claim: `hardcoded-numeric:${label}`, file: relPath, line: i + 1, snippet: line.trim().slice(0, 220) });
      continue;
    }
    // A stat split across a line break ("68%\n win rate") re-forms in the pair.
    if (pairSubject !== null && pattern.test(pairSubject) && !SAFE_CONTEXT.test(pairSubject)) {
      hits.push({ claim: `hardcoded-numeric:${label}`, file: relPath, line: i + 1, snippet: pairSubject.trim().slice(0, 220) });
    }
  }
  return hits;
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
      if (SKIP_DIRS.has(entry.name)) continue;
      if (isTop && NON_PUBLIC_TOP_DIRS.has(entry.name)) continue;
      await walkRenderedSurfaces(full, false, files);
    } else if (entry.isFile() && RENDERED_BASENAMES.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
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
      const rawLines = text.split(/\r?\n/);
      rawLines.forEach((_line, index) => hits.push(...scanLine(rawLines, index, relPath)));
    }
  }

  // Public sweep: hardcoded numeric performance claims over every rendered
  // route file (deep-scanned files also get the numeric pass — a literal
  // stat is a violation in the commercial dirs too).
  const sweepFiles = await walkRenderedSurfaces(resolve(ROOT, PUBLIC_APP_ROOT), true);
  for (const file of sweepFiles) {
    if (shouldSkipFile(file)) continue;
    if (!deepScanned.has(file)) scanned++;
    const text = await readFile(file, "utf8");
    const relPath = rel(file);
    const rawLines = text.split(/\r?\n/);
    rawLines.forEach((_line, index) => hits.push(...scanNumericClaimLine(rawLines, index, relPath)));
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
