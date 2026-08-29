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
import { pathToFileURL } from "node:url";
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
  // The `\+?` closes a real gap (S2, 2026-08-22): "60%+ win rate" is the
  // classic sportsbook-tout ceiling-exceeding framing, and the plain "%"
  // version of this pattern did not match it — the "+" sat between the
  // percent sign and the required whitespace, so `%\s*` never fired.
  // Confirmed before the fix: /%(\s*)(?:win|hit|...)/i.test("60%+ win rate")
  // === false. The fixed pattern still requires the keyword to directly
  // follow (optional "+" then optional whitespace), so legitimate CI-band
  // copy like "95% CP 52.1-68.3%" and unrelated "15% off" promo copy are
  // unaffected — neither is followed by win/hit/roi/accuracy/success.
  ["percent-performance", /\b\d{1,3}(?:\.\d+)?%\+?\s*(?:win|hit|roi|accuracy|success)\b/i],
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

// GB-6: ALLOWED vocabulary — forward-looking band-definition language and
// receipts language. This ADDITIVE section exempts legitimate Green Board
// surface copy (GB-5 /green page, trust-gate-compliant band definitions)
// while keeping all performance-claim bans fully intact. The dispatch
// (docs/ops/hermes/GREEN-BOARD-DISPATCH-2026-08-28.md, GB-6) authorizes
// this extension. Never remove from FORBIDDEN lists — only add the distinction.
const ALLOWED_PHRASES = [
  // Band-definition language (forward-looking probability-threshold statements)
  "fires only when",
  "fires when",
  "probability threshold",
  "probability band",
  "confidence threshold",
  "band range",
  "threshold band",
  "mathematically true",
  "when winning is at least",
  "fires at",
  "tier fires",
  // Receipts language (ledger/record transparency copy)
  "record in progress",
  "ledger readout",
  "ticker is a ledger readout",
  "verified record",
  "settled record",
  "counterfactual",
  "internal counterfactual",
  "not a track record",
  "public record starts at",
  "wilson",
  "wilson ci",
  "wilson 95",
  "expected rate",
  "average expected",
  "selection alpha",
  "realized vs expected",
  "gap",
];

const SAFE_CONTEXT =
  /\b(no|not|never|without|requires?|required|must|evidence|unsupported|fabricated|fake|avoid|block(?:ed|s)?|cannot|can't|do not|dont|unless|before|policy|rule|scanner|guardrail|claim governance|sample|window|model version|settled|threshold|public-claim approval)\b/i;

// Numeric pass exemption: SAFE_CONTEXT minus the evidence vocabulary
// (settled/sample/window/threshold/model version) — those are evidence
// NOUNS a tout can borrow, not negations. Clause-scoped, never line-wide.
const NUMERIC_SAFE_CONTEXT =
  /\b(no|not|never|without|requires?|required|must|evidence|unsupported|fabricated|fake|avoid|block(?:ed|s)?|cannot|can't|do not|dont|unless|before|policy|rule|scanner|guardrail|claim governance|public-claim approval)\b/i;

// O-3.x remainder (ported from commercial-copy-scan.mjs's safeContextNear):
// the numeric-pass exemption must be CLAUSE-scoped around the match, not
// line-wide — one evidence word anywhere on the line used to excuse every
// hardcoded stat on it, which is exactly the bug this hardens (a fabricated
// "68% win rate across 500 settled picks" borrowed "settled" from clear
// across the sentence to exempt itself).
const SAFE_WINDOW_BEFORE = 60;
const SAFE_WINDOW_AFTER = 24;
const CLAUSE_BOUNDARY = /[.!?;—]/;
export function numericSafeContextNear(subject, matchIndex, matchLength) {
  const winStart = Math.max(0, matchIndex - SAFE_WINDOW_BEFORE);
  const winEnd = Math.min(subject.length, matchIndex + matchLength + SAFE_WINDOW_AFTER);
  const before = subject.slice(winStart, matchIndex);
  const after = subject.slice(matchIndex + matchLength, winEnd);
  const lastBoundary = Math.max(
    before.lastIndexOf("."), before.lastIndexOf("!"),
    before.lastIndexOf("?"), before.lastIndexOf(";"), before.lastIndexOf("—"),
  );
  const beforeClause = lastBoundary >= 0 ? before.slice(lastBoundary + 1) : before;
  const firstBoundary = after.search(CLAUSE_BOUNDARY);
  const afterClause = firstBoundary >= 0 ? after.slice(0, firstBoundary) : after;
  return NUMERIC_SAFE_CONTEXT.test(`${beforeClause} ${afterClause}`);
}

// Numeric-sweep extra roots (claims audit findings 2/5/7): bot output and
// text-serving surfaces that are NOT rendered app/ route files, so
// walkRenderedSurfaces() never reaches them, but a hardcoded stat in a tweet
// template or a humans.txt-style text endpoint is the same fabrication.
const NUMERIC_EXTRA_ROOTS = [
  "apps/web/components",
  "workers",
  "apps/web/lib/twitter-bot",
  "apps/web/lib/discord-bot",
  "apps/web/lib/bot-outbox",
  "apps/web/lib/proof",
  "apps/web/app/humans.txt",
  "apps/web/app/llms.txt",
  "apps/web/app/ai.txt",
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

export function scanLine(rawLines, i, relPath) {
  const line = rawLines[i];
  const subjects = viewsOf(line);
  const normalized = subjects[0];
  if (normalized.length === 0) return [];
  const pairSubject = pairSubjectOf(rawLines, i);

  // GB-6: ALLOWED vocabulary check — if any ALLOWED_PHRASE appears in the
  // line or pair-subject, suppress CLAIMS hits (band-definition/receipts
  // language is evidence-gated copy, not a performance claim).
  const allowedInline = (subj) =>
    ALLOWED_PHRASES.some((p) => new RegExp(`\\b${escapeRegex(p)}\\b`, "i").test(subj));
  const lineIsAllowed =
    subjects.some(allowedInline) || (pairSubject !== null && allowedInline(pairSubject));

  const hits = [];
  for (const claim of CLAIMS) {
    const re = phraseRegex(claim);
    // Descriptive concept words carry a line-wide safe-context exemption (they
    // fire on legitimate evidence surfaces); the O-3.x hardening here is the
    // shared normalize (confusables), the join-collapse view (concat splits),
    // and cross-line pairing for multi-word claims.
    const inline = subjects.some((subj) => re.test(subj) && !SAFE_CONTEXT.test(subj));
    if (inline && !lineIsAllowed) {
      hits.push({ claim, file: relPath, line: i + 1, snippet: line.trim().slice(0, 220) });
      continue;
    }
    if (
      claim.includes(" ") &&
      pairSubject !== null &&
      re.test(pairSubject) &&
      !SAFE_CONTEXT.test(pairSubject) &&
      !lineIsAllowed
    ) {
      hits.push({ claim, file: relPath, line: i + 1, snippet: pairSubject.trim().slice(0, 220) });
    }
  }
  return hits;
}

export function scanNumericClaimLine(rawLines, i, relPath) {
  const line = rawLines[i];
  const subjects = viewsOf(line);
  const normalized = subjects[0];
  if (normalized.length === 0) return [];
  const pairSubject = pairSubjectOf(rawLines, i);
  const hits = [];
  for (const [label, pattern] of NUMERIC_CLAIM_PATTERNS) {
    let inlineHit = false;
    for (const subj of subjects) {
      const m = pattern.exec(subj);
      if (m && !numericSafeContextNear(subj, m.index, m[0].length)) {
        inlineHit = true;
        break;
      }
    }
    if (inlineHit) {
      hits.push({ claim: `hardcoded-numeric:${label}`, file: relPath, line: i + 1, snippet: line.trim().slice(0, 220) });
      continue;
    }
    // A stat split across a line break ("68%\n win rate") re-forms in the pair.
    if (pairSubject !== null) {
      const m = pattern.exec(pairSubject);
      if (m && !numericSafeContextNear(pairSubject, m.index, m[0].length)) {
        hits.push({ claim: `hardcoded-numeric:${label}`, file: relPath, line: i + 1, snippet: pairSubject.trim().slice(0, 220) });
      }
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
  const sweptOrDeepScanned = new Set(deepScanned);
  for (const file of sweepFiles) {
    if (shouldSkipFile(file)) continue;
    if (!deepScanned.has(file)) scanned++;
    sweptOrDeepScanned.add(file);
    const text = await readFile(file, "utf8");
    const relPath = rel(file);
    const rawLines = text.split(/\r?\n/);
    rawLines.forEach((_line, index) => hits.push(...scanNumericClaimLine(rawLines, index, relPath)));
  }

  // Numeric-sweep extra roots: bot templates / text-serving endpoints that
  // walkRenderedSurfaces() never reaches (not app/ route files at all).
  for (const target of NUMERIC_EXTRA_ROOTS) {
    const abs = resolve(ROOT, target);
    let targetStat;
    try {
      targetStat = await stat(abs);
    } catch {
      continue;
    }
    const files = targetStat.isDirectory() ? await walk(abs) : [abs];
    for (const file of files) {
      if (sweptOrDeepScanned.has(file) || shouldSkipFile(file)) continue;
      sweptOrDeepScanned.add(file);
      scanned++;
      const text = await readFile(file, "utf8");
      const relPath = rel(file);
      const rawLines = text.split(/\r?\n/);
      rawLines.forEach((_line, index) => hits.push(...scanNumericClaimLine(rawLines, index, relPath)));
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

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  main().catch((error) => {
    console.error("[no-unsupported-performance-claims] unexpected error:", error);
    process.exit(2);
  });
}
