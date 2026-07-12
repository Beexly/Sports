#!/usr/bin/env node
/**
 * Trust-gate guardrail.
 *
 * Scans the public-facing surface for banned phrases and prohibited
 * claims that the Trust Claim Registry rejects. Fails the process
 * (exit 1) if any are found.
 *
 * It MUST stay in sync with the BANNED entries of
 * apps/web/lib/trust-claims.ts. The list below is a superset of the
 * registry so this script does not need to parse TypeScript.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { normalizeScanLine, collapseStringJoins } from "./scan-normalize.mjs";

const ROOT = resolve(process.cwd());

// BS-023 (brand-safety-rules-v2): "sharp money" / "smart money" framing claims a
// factor the platform does not source yet, so it is banned on marketing and
// published-pick surfaces. It legitimately appears in a known set of files:
//   - education that teaches the concept (and teaches when it is NOT a factor),
//   - the glossary that defines it,
//   - internal engine / LLM-prompt / pre-mortem plumbing and dev fixtures,
//   - the labelled-illustrative slate-twin demo (the LIVE path omits the split
//     entirely — see apps/web/lib/slate-twin/get-slate-twin.ts line "publicMoney /
//     sharp ... intentionally OMITTED"), and the sourced capability registry.
// These files are exempted from THIS rule only (not the other bans). Any NEW
// occurrence in a non-listed file fails the build — that is the context-aware
// guard the v2 spec asks for, without false-positiving on correct copy.
const SHARP_MONEY_ALLOW = new Set([
  "apps/web/app/vs/tout-services/page.tsx",
  "apps/web/components/academy/beat-the-close.tsx",
  "apps/web/components/motion/ghost-jarvis.tsx",
  "apps/web/components/slate-twin/galaxy-slate-twin.tsx",
  "apps/web/lib/academy/curriculum.ts",
  "apps/web/lib/academy/scenarios.ts",
  "apps/web/lib/fantasy/academy.ts",
  "apps/web/lib/glossary.ts",
  "apps/web/lib/intelligence-graph/model-court/prompts.ts",
  "apps/web/lib/jarvis/capability-registry.ts",
  "apps/web/lib/pre-mortem/templates/line-movement.ts",
  // The integrity ledger DESCRIBES the failure mode the Market Memory / No-Bet
  // engines prevent ("attributing movement to 'sharp money' without a sourced
  // split") — governance documentation of a banned pattern, same rationale as the
  // glossary / tout-services exemptions above. Not a public claim.
  "apps/web/lib/platform/integrity-ledger.ts",
  "packages/db/src/sample-picks.ts",
  "packages/prediction-engine/src/game-context.ts",
]);

const BANNED_PHRASES = [
  { phrase: "lock", wordBoundary: true, claim: "banned.lock" },
  { phrase: "guaranteed", wordBoundary: false, claim: "banned.guaranteed-outcome" },
  { phrase: "sure thing", wordBoundary: false, claim: "banned.sure-thing" },
  { phrase: "risk-free", wordBoundary: false, claim: "banned.risk-free" },
  { phrase: "risk free", wordBoundary: false, claim: "banned.risk-free-2" },
  { phrase: "riskless", wordBoundary: false, claim: "banned.riskless" },
  { phrase: "easy money", wordBoundary: false, claim: "banned.easy-money" },
  { phrase: "free money", wordBoundary: false, claim: "banned.free-money" },
  { phrase: "can't lose", wordBoundary: false, claim: "banned.cant-lose" },
  { phrase: "cant lose", wordBoundary: false, claim: "banned.cant-lose-2" },
  { phrase: "verified track record", wordBoundary: false, claim: "banned.verified-track-record" },
  { phrase: "thousands of bettors", wordBoundary: false, claim: "banned.thousands-of-bettors" },
  { phrase: "trusted by serious bettors", wordBoundary: false, claim: "banned.trusted-by-serious-bettors" },
  { phrase: "guaranteed profit", wordBoundary: false, claim: "banned.guaranteed-profit" },
  { phrase: "guaranteed roi", wordBoundary: false, claim: "banned.guaranteed-roi" },
  { phrase: "guaranteed winner", wordBoundary: false, claim: "banned.guaranteed-winner" },
  { phrase: "lock of the day", wordBoundary: false, claim: "banned.lock-of-the-day" },
  { phrase: "automatic winner", wordBoundary: false, claim: "banned.automatic-winner" },
  { phrase: "beat the book", wordBoundary: false, claim: "banned.beat-the-book" },
  { phrase: "insider information", wordBoundary: false, claim: "banned.insider-information" },
  { phrase: "profitable system", wordBoundary: false, claim: "banned.profitable-system" },
  { phrase: "no risk", wordBoundary: false, claim: "banned.no-risk" },
  { phrase: "100% chance", wordBoundary: false, claim: "banned.100-percent-chance" },
  // BS-004 (brand-safety-rules-v2): the picks come from a deterministic engine,
  // never an LLM. "AI" belongs only to the content/atmosphere layer. Banning the
  // "AI picks" framing on any surface keeps that position honest. Precise to
  // "pick(s)" so legitimate copy ("AI Ops", "AI-presenter disclosure",
  // critiquing competitors' "AI prediction sites") is untouched.
  { phrase: "AI picks", wordBoundary: true, claim: "banned.ai-picks" },
  { phrase: "AI pick", wordBoundary: true, claim: "banned.ai-pick" },
  { phrase: "AI-generated picks", wordBoundary: true, claim: "banned.ai-generated-picks" },
  { phrase: "AI generated picks", wordBoundary: true, claim: "banned.ai-generated-picks-2" },
  { phrase: "AI-generated pick", wordBoundary: true, claim: "banned.ai-generated-pick" },
  // BS-023 (brand-safety-rules-v2): sharp/smart-money framing claims a factor we
  // do not source yet. Context-aware via allowFiles — banned everywhere except
  // the verified education / glossary / internal / labelled-demo files above.
  { phrase: "sharp money", wordBoundary: false, claim: "banned.sharp-money", allowFiles: SHARP_MONEY_ALLOW },
  { phrase: "smart money", wordBoundary: false, claim: "banned.smart-money", allowFiles: SHARP_MONEY_ALLOW },
];

const SCAN_DIRS = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib",
  "packages",
];

const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md"]);

const WHITELIST_PATHS = new Set([
  "apps/web/lib/trust-claims.ts",
  "apps/web/lib/content-engine/templates.ts",
  "apps/web/lib/content/workflow.ts",
  "apps/web/lib/promotions/copy-rules.ts",
  "apps/web/lib/content-generator.ts",
  // Enforcement-policy definition: contains the banned phrases as detection
  // patterns (same rationale as trust-claims.ts above).
  "apps/web/lib/pick-explainer/policy.ts",
  // Content-safety lexicon: contains the banned phrases as detection terms.
  "apps/web/lib/safety/content-safety.ts",
  // Brand-voice lexicon (BANNED_LANGUAGE) and draft-review test fixtures:
  // both deliberately contain banned phrases AS detection/negative-test
  // material. They previously hid from this gate via string concatenation
  // ("guaran" + "teed") — the O-3.x join-collapse view now sees through
  // that, so the exemption is explicit and review-visible instead.
  "apps/web/lib/brand.ts",
  "apps/web/lib/workflows/draft-review-fixtures.ts",
  "packages/db/prisma/seed.ts",
]);

// "lock" is banned ONLY as betting slang for a guaranteed pick (a lock, lock of
// the day). It has a legitimate TEMPORAL sense — the moment a line locks/closes
// ("at lock", "lock time", "lock→close"). Same false-positive handling intent as
// the word-boundary guard that already exempts block/unlock/clock: we blank the
// safe temporal idioms, then a residual standalone "lock" is still a real hit.
// O-3.x remainder: "the lock" is blanked ONLY behind a temporal preposition
// ("before the lock", "at the lock") — bare "the lock" IS the slang ("it's
// the lock of the century") and used to be blanked wholesale.
const LOCK_SAFE_CONTEXT =
  /\b(?:at|before|by|after|until|since)\s+(?:the\s+)?lock\b|\block\s*(?:time\b|→|->)/gi;

const WHITELIST_PREFIXES = [
  "apps/web/lib/compliance-scanner/",
  "apps/web/lib/studio/templates/",
];

const WHITELIST_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".git",
  "__tests__",
  "tests",
  "test",
  "_speedtest",
]);

function shouldSkipDir(name) {
  return WHITELIST_DIRS.has(name);
}

function isWhitelistedFile(relPath) {
  const normalized = relPath.split(sep).join("/");
  if (WHITELIST_PATHS.has(normalized)) return true;
  if (WHITELIST_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (relPath.includes("__tests__")) return true;
  if (relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx")) return true;
  if (relPath.endsWith(".spec.ts") || relPath.endsWith(".spec.tsx")) return true;
  return false;
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
      if (shouldSkipDir(entry.name)) continue;
      await walk(full, files);
    } else if (entry.isFile()) {
      if (SCAN_EXTS.has(extname(entry.name))) {
        files.push(full);
      }
    }
  }
  return files;
}

function buildRegex(entry) {
  const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return entry.wordBoundary
    ? new RegExp("\\b" + escaped + "\\b", "i")
    : new RegExp(escaped, "i");
}

function lineIsCommentOnly(line, isMarkdown) {
  // In MARKDOWN none of these prefixes mean "comment": "#" begins a heading
  // and "*" a list item — both fully rendered copy. Skipping them let a
  // "# Guaranteed winners" heading pass the gate (adversarial finding O-3.x).
  if (isMarkdown) return false;
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("*")) return true;
  if (trimmed.startsWith("/*")) return true;
  if (trimmed.startsWith("#")) return true;
  return false;
}

/**
 * Unicode-evasion normalization (adversarial finding O-3.x), shared across
 * all copy gates (scan-normalize.mjs): NFKC compatibility folding, deletion
 * of zero-width characters and soft hyphens, a cross-script CONFUSABLES fold
 * (Cyrillic/Greek homoglyphs to Latin - the remainder pass; NFKC alone left
 * these open), apostrophe/quote folding, and whitespace collapse.
 *
 * Every line is matched in TWO views (O-3.x remainder):
 *   1. the normalized line;
 *   2. the same line with string-literal joins collapsed, so
 *      "guaran" + "teed" and template-interpolation splits re-form the
 *      banned phrase.
 * And every MULTI-WORD phrase is additionally matched against each pair of
 * adjacent non-comment lines joined by a space, so a two-word ban cannot be
 * dodged by a line break mid-phrase (JSX renders it as one phrase anyway).
 */
function lockSubject(entry, s) {
  // For the "lock" slang ban, blank the legitimate temporal idioms first;
  // a residual standalone "lock" (e.g. "a lock", "lock of the day") still hits.
  return entry.claim === "banned.lock" ? s.replace(LOCK_SAFE_CONTEXT, " ") : s;
}

function scanText(text, relPath) {
  const hits = [];
  const seen = new Set();
  const push = (line, claim, phrase, snippet) => {
    const key = `${line}:${claim}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ line, snippet: snippet.trim().slice(0, 200), claim, phrase });
  };
  const relNorm = relPath.split(sep).join("/");
  const isMarkdown = relNorm.endsWith(".md");
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map(normalizeScanLine);
  const joined = lines.map(collapseStringJoins);
  for (const entry of BANNED_PHRASES) {
    // Per-rule file exemption (BS-023): skip this phrase for its allowlisted
    // files only; every other banned phrase still applies to those files.
    if (entry.allowFiles && entry.allowFiles.has(relNorm)) continue;
    const re = buildRegex(entry);
    const multiWord = entry.phrase.includes(" ");
    for (let i = 0; i < lines.length; i++) {
      if (lineIsCommentOnly(rawLines[i], isMarkdown)) continue;
      if (re.test(lockSubject(entry, lines[i])) || re.test(lockSubject(entry, joined[i]))) {
        push(i + 1, entry.claim, entry.phrase, rawLines[i]);
        continue;
      }
      // Cross-line: a multi-word phrase split over a line break re-forms when
      // this line and the next non-comment line are joined with a space.
      if (
        multiWord &&
        i + 1 < lines.length &&
        !lineIsCommentOnly(rawLines[i + 1], isMarkdown) &&
        re.test(lockSubject(entry, `${joined[i].trimEnd()} ${joined[i + 1].trimStart()}`))
      ) {
        push(i + 1, entry.claim, entry.phrase, rawLines[i].trim() + " / " + rawLines[i + 1].trim());
      }
    }
  }
  return hits;
}

async function main() {
  let allHits = [];
  let scanned = 0;

  for (const scanDir of SCAN_DIRS) {
    const abs = resolve(ROOT, scanDir);
    let s;
    try {
      s = await stat(abs);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
    const files = await walk(abs);
    for (const file of files) {
      const relPath = relative(ROOT, file);
      if (isWhitelistedFile(relPath)) continue;
      scanned++;
      let text;
      try {
        text = await readFile(file, "utf8");
      } catch {
        continue;
      }
      const hits = scanText(text, relPath);
      for (const hit of hits) {
        allHits.push({ file: relPath, ...hit });
      }
    }
  }

  if (allHits.length === 0) {
    console.log("[trust-gate] OK - scanned " + scanned + " file(s); no banned phrases.");
    process.exit(0);
  }

  console.error("[trust-gate] FAIL - " + allHits.length + " banned phrase hit(s) across " + scanned + " scanned file(s):");
  for (const h of allHits) {
    console.error("  " + h.file + ":" + h.line + "  [" + h.claim + "]  \"" + h.snippet + "\"");
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("[trust-gate] unexpected error:", err);
  process.exit(2);
});
