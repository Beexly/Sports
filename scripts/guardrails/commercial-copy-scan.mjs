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

// O-3.x remainder: the safe-policy exemption for tout-slang is CLAUSE-scoped
// around the match, not line-wide — one "not" anywhere on a line used to
// excuse every banned phrase on it. The exemption word must sit in the SAME
// clause as the match (no sentence boundary between them): "not a lock" is
// excused, but "this is not hype. Guaranteed profit, easy money." is not —
// the "not" negates "hype", on the far side of the period.
const SAFE_WINDOW_BEFORE = 60;
const SAFE_WINDOW_AFTER = 24;
const CLAUSE_BOUNDARY = /[.!?;—]/;
function safeContextNear(subject, matchIndex, matchLength) {
  const winStart = Math.max(0, matchIndex - SAFE_WINDOW_BEFORE);
  const winEnd = Math.min(subject.length, matchIndex + matchLength + SAFE_WINDOW_AFTER);
  const before = subject.slice(winStart, matchIndex);
  const after = subject.slice(matchIndex + matchLength, winEnd);
  // Trim `before` back to the last clause boundary; trim `after` at the first.
  const lastBoundary = Math.max(
    before.lastIndexOf("."), before.lastIndexOf("!"),
    before.lastIndexOf("?"), before.lastIndexOf(";"), before.lastIndexOf("—"),
  );
  const beforeClause = lastBoundary >= 0 ? before.slice(lastBoundary + 1) : before;
  const firstBoundary = after.search(CLAUSE_BOUNDARY);
  const afterClause = firstBoundary >= 0 ? after.slice(0, firstBoundary) : after;
  return SAFE_POLICY_CONTEXT.test(`${beforeClause} ${afterClause}`);
}

// O-3.x remainder: only STRUCTURAL import/export shapes are exempt. The old
// startsWith("import ")/startsWith("export ") prefix excused any line that
// happened to begin with those words — including rendered markdown copy and
// `export const tagline = "..."` lines that carry real customer-facing text.
const STRUCTURAL_MODULE_LINE = [
  /^import\b[^"'`]*\bfrom\s*["']/, // import ... from "..."
  /^import\s*["']/, // side-effect import "..."
  /^export\s*\{[^}]*\}(?:\s*from\s*["'])?/, // export { A, B } [from "..."]
  /^export\s+\*\s+from\s*["']/, // export * from "..."
  /^export\s+type\b/, // export type ...
];
function isStructuralModuleLine(normalized) {
  return STRUCTURAL_MODULE_LINE.some((re) => re.test(normalized));
}

/** First match of a word-boundary phrase regex, with its true start index. */
function findPhrase(phrase, subject) {
  const m = new RegExp(`(^|[^a-z0-9])(${escapeRegex(phrase)})([^a-z0-9]|$)`, "i").exec(subject);
  if (!m) return null;
  return { index: m.index + m[1].length, length: m[2].length };
}

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

/** Normalized + join-collapsed views of a raw line (O-3.x shared pipeline). */
function viewsOf(line) {
  const normalized = normalizeScanLine(line).toLowerCase().trim();
  const joined = collapseStringJoins(normalized);
  return normalized === joined ? [normalized] : [normalized, joined];
}

/** Join view of `line` for cross-line pairing (normalized + collapsed). */
function joinView(line) {
  return collapseStringJoins(normalizeScanLine(line).toLowerCase());
}

// O-3.x remainder: the safe-context exemption is applied at two granularities.
// BANNED tout-slang uses a TIGHT window around the match (windowScoped) so a
// distant negation cannot excuse the crime ("this is not hype — guaranteed
// profit, easy money" — the "not" no longer covers the touts far down the
// line). EVIDENCE_REQUIRED terms are inherently DESCRIPTIVE ("calibrated
// against every settled result", "verified proof milestone") and legitimately
// carry a sentence-level disclaimer ("…, not a promise"), so they keep the
// line-wide safe context — and they cannot tout on their own (a real claim
// also trips a BANNED phrase or the hardcoded-numeric gate).
function isSafe(subject, match, windowScoped) {
  return windowScoped
    ? safeContextNear(subject, match.index, match.length)
    : SAFE_POLICY_CONTEXT.test(subject);
}

function scanPhraseList(phrases, claim, subjects, pairSubject, line, relPath, lineNumber, windowScoped) {
  const hits = [];
  for (const phrase of phrases) {
    let matched = null;
    for (const subject of subjects) {
      const m = findPhrase(phrase, subject);
      if (m && !isSafe(subject, m, windowScoped)) {
        matched = { snippet: line.trim().slice(0, 220) };
        break;
      }
    }
    // Cross-line: a multi-word phrase split over a line break re-forms in the
    // pair view (JSX renders adjacent text lines as one phrase).
    if (!matched && pairSubject !== null && phrase.includes(" ")) {
      const m = findPhrase(phrase, pairSubject);
      if (m && !isSafe(pairSubject, m, windowScoped)) {
        matched = { snippet: pairSubject.trim().slice(0, 220) };
      }
    }
    if (matched) hits.push({ claim, file: relPath, line: lineNumber, phrase, snippet: matched.snippet });
  }
  return hits;
}

function scanLine(rawLines, i, relPath) {
  const line = rawLines[i];
  const subjects = viewsOf(line);
  const normalized = subjects[0];
  if (isStructuralModuleLine(normalized)) return [];
  if (/^\s*[A-Z0-9_]+(?:\s+as\s+[A-Z0-9_]+)?,?\s*$/.test(line)) return [];
  if (normalized.length === 0) return [];
  const pairSubject =
    i + 1 < rawLines.length ? `${joinView(rawLines[i]).trimEnd()} ${joinView(rawLines[i + 1]).trimStart()}` : null;
  return [
    ...scanPhraseList(BANNED, "commercial-copy.banned", subjects, pairSubject, line, relPath, i + 1, true),
    ...scanPhraseList(EVIDENCE_REQUIRED, "commercial-copy.evidence-required", subjects, pairSubject, line, relPath, i + 1, false),
  ];
}

function scanToutLine(rawLines, i, relPath) {
  const line = rawLines[i];
  const subjects = viewsOf(line);
  const normalized = subjects[0];
  if (normalized.length === 0) return [];
  if (isStructuralModuleLine(normalized)) return [];
  const pairSubject =
    i + 1 < rawLines.length ? `${joinView(rawLines[i]).trimEnd()} ${joinView(rawLines[i + 1]).trimStart()}` : null;
  const hits = [];
  for (const [label, pattern] of TOUT_PATTERNS) {
    let snippet = null;
    for (const subject of subjects) {
      const m = pattern.exec(subject);
      if (m && !safeContextNear(subject, m.index, m[0].length)) {
        snippet = line.trim().slice(0, 220);
        break;
      }
    }
    if (snippet === null && pairSubject !== null) {
      const m = pattern.exec(pairSubject);
      if (m && !safeContextNear(pairSubject, m.index, m[0].length)) {
        snippet = pairSubject.trim().slice(0, 220);
      }
    }
    if (snippet !== null) {
      hits.push({ claim: "commercial-copy.tout", file: relPath, line: i + 1, phrase: label, snippet });
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
      const rawLines = text.split(/\r?\n/);
      rawLines.forEach((_line, index) => hits.push(...scanLine(rawLines, index, relPath)));
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
    const rawLines = text.split(/\r?\n/);
    rawLines.forEach((_line, index) => hits.push(...scanToutLine(rawLines, index, relPath)));
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
