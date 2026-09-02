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
 *
 * BS-004 brand-positioning vocabulary ("We're not AI. We're math you can
 * read.") is a special case: instead of hardcoding it here too, it is read
 * straight from the shared JSON source of truth,
 * apps/web/lib/positioning-vocab.json — the same list the runtime compliance
 * scanner (apps/web/lib/compliance-scanner/rules.ts) and the docs copy-scan
 * test (apps/web/__tests__/docs-public-copy-scan.test.ts) read. See the
 * POSITIONING_VOCAB block below.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { collapseStringJoins, normalizeScanLine } from "./scan-normalize.mjs";

const ROOT = resolve(process.cwd());

// Resolved off THIS SCRIPT'S OWN location (import.meta.url), not
// process.cwd()/ROOT: the guardrail-hardening sandbox tests below run this
// script with cwd pointed at a throwaway temp repo that has no
// apps/web/lib/positioning-vocab.json, so the vocab file must always be
// found relative to where trust-gate.mjs actually lives on disk.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT_STATIC = resolve(SCRIPT_DIR, "..", "..");
const POSITIONING_VOCAB_PATH = resolve(
  REPO_ROOT_STATIC,
  "apps/web/lib/positioning-vocab.json",
);
const POSITIONING_VOCAB = JSON.parse(readFileSync(POSITIONING_VOCAB_PATH, "utf8"));

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
  // critiquing competitors' "AI prediction sites") is untouched. This scope
  // (every SCAN_DIR, unrestricted) is UNCHANGED by the positioning-vocab
  // expansion below — see POSITIONING_NEW_ENTRIES for the rest of the vocab.
  { phrase: "AI picks", wordBoundary: true, claim: "banned.ai-picks" },
  { phrase: "AI pick", wordBoundary: true, claim: "banned.ai-pick" },
  { phrase: "AI-generated picks", wordBoundary: true, claim: "banned.ai-generated-picks" },
  { phrase: "AI generated picks", wordBoundary: true, claim: "banned.ai-generated-picks-2" },
  { phrase: "AI-generated pick", wordBoundary: true, claim: "banned.ai-generated-pick" },
  { phrase: "AI generated pick", wordBoundary: true, claim: "banned.ai-generated-pick-2" },
  // BS-023 (brand-safety-rules-v2): sharp/smart-money framing claims a factor we
  // do not source yet. Context-aware via allowFiles — banned everywhere except
  // the verified education / glossary / internal / labelled-demo files above.
  { phrase: "sharp money", wordBoundary: false, claim: "banned.sharp-money", allowFiles: SHARP_MONEY_ALLOW },
  { phrase: "smart money", wordBoundary: false, claim: "banned.smart-money", allowFiles: SHARP_MONEY_ALLOW },
];

// ── BS-004 positioning vocabulary (the REST of it) ──────────────────────
//
// The 6 "AI picks" family entries directly above are hand-maintained and
// unrestricted in scope (unchanged, per the note above). Every OTHER phrase
// in the shared positioning vocabulary — AI-powered, AI-driven, AI-assisted,
// artificial intelligence, machine learning, AI agents, etc. — is read
// straight from apps/web/lib/positioning-vocab.json (POSITIONING_VOCAB
// above) rather than re-typed here, and is scoped NARROWLY: user-facing
// (apps/web/app, apps/web/components) and memory-doc (SCAN_FILES) surfaces
// only. It deliberately does NOT reach apps/web/lib or packages, where
// "machine learning" legitimately names a method/technique in source
// comments (prediction-engine docs, data-ingestion notes, etc.) rather than
// mis-describing the picks or the engine itself.
const EXISTING_AI_PICKS_PHRASES = new Set([
  "ai picks",
  "ai pick",
  "ai-generated picks",
  "ai generated picks",
  "ai-generated pick",
  "ai generated pick",
]);

function slugForClaim(phrase) {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Same tolerant-match construction as positioning-vocab.ts's
 * buildPositioningRegex: escape the phrase, then let a hyphen or run of
 * whitespace between tokens match either form — "AI-powered", "AI powered",
 * and "AI   powered" all hit the same phrase entry.
 */
function buildPositioningPhraseRegex(phrase) {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[\s-]/g, "[\\s-]+");
  // Static-analysis note (detect-non-literal-regexp): `escaped` is a regex-escaped
  // phrase from positioning-vocab.json (repo content), never user input.
  // eslint-disable-next-line -- pattern is built from escaped constants
  return new RegExp("\\b" + escaped + "\\b", "i"); // nosemgrep
}

const POSITIONING_NEW_ENTRIES = (() => {
  const seenSlugs = new Set();
  const entries = [];
  for (const phrase of POSITIONING_VOCAB.bannedPhrases) {
    if (EXISTING_AI_PICKS_PHRASES.has(phrase.toLowerCase())) continue;
    const slug = slugForClaim(phrase);
    if (seenSlugs.has(slug)) continue; // e.g. "AI-powered" / "AI powered" collapse to one claim
    seenSlugs.add(slug);
    entries.push({
      phrase,
      wordBoundary: true,
      hyphenSpaceTolerant: true,
      restrictedScope: true,
      claim: `banned.positioning.${slug}`,
    });
  }
  return entries;
})();

const BANNED_PHRASES_ALL = [...BANNED_PHRASES, ...POSITIONING_NEW_ENTRIES];

// Root "memory" docs — the repo's own onboarding/instruction surface — are
// explicit files, not a directory to walk. Scanned in addition to SCAN_DIRS.
const SCAN_FILES = [
  "README.md",
  "CLAUDE.md",
  "AGENTS.md",
  "START_HERE.md",
  "CONTRIBUTING.md",
];

// Roots the restricted-scope (positioning) entries are allowed to fire in,
// PLUS the SCAN_FILES root docs (checked separately, by exact path, since
// they are not directories) — see isWithinPositioningScope below.
const POSITIONING_SCAN_DIRS = ["apps/web/app", "apps/web/components"];

function isWithinPositioningScope(relNorm) {
  if (SCAN_FILES.includes(relNorm)) return true;
  return POSITIONING_SCAN_DIRS.some(
    (dir) => relNorm === dir || relNorm.startsWith(dir + "/"),
  );
}

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
  "packages/db/prisma/seed.ts",
  // Brand-positioning vocabulary source of truth: contains the banned AI-
  // framing phrases as data, same rationale as trust-claims.ts above. (The
  // .json sibling is not walked at all — SCAN_EXTS does not include .json —
  // but it is listed here too in case that ever changes.)
  "apps/web/lib/positioning-vocab.ts",
  "apps/web/lib/positioning-vocab.json",
]);

const ALLOWLISTED_DEFINITION_BLOCKS = new Map([
  [
    "apps/web/lib/brand.ts",
    {
      start: /^\s*export const BANNED_LANGUAGE\s*=\s*\[/,
      end: /^\s*\]\s+as const;/,
    },
  ],
]);

const ALLOWLISTED_DEFINITION_LINES = new Map([
  [
    "apps/web/lib/workflows/draft-review-fixtures.ts",
    [
      /^\s*const unsafeOutcomeClaim\s*=/,
      /^\s*const unsafePickSlang\s*=/,
    ],
  ],
  [
    // The REQUIRED risk-disclosure footer on evidence-pack drafts. It reads
    // "Not PROVEN. No guaranteed outcome. Past results do not guarantee future
    // results." — every occurrence of "guarantee" here is NEGATED, and the
    // sentence exists precisely to DENY the claim this rule bans.
    //
    // Allowlisted rather than reworded on purpose. The obvious "fix" (swap
    // guarantee -> provides/delivers) yields "No provided outcome. Past results
    // do not provide future results", which is incoherent AND strips a
    // responsible-gambling disclaimer to satisfy a regex — weakening user-facing
    // risk language to make a trust guardrail quiet is the exact inversion of
    // what this guardrail is for. The scanner is substring-based and has no
    // negation handling; this is the same context-aware exemption already used
    // for the fixtures above.
    "apps/web/lib/content-engine/build-draft.ts",
    [/Past results do not guarantee future results/],
  ],
]);

// "lock" is banned ONLY as betting slang for a guaranteed pick (a lock, lock of
// the day). It has a legitimate TEMPORAL sense — the moment a line locks/closes
// ("at lock", "lock time", "lock→close"). Same false-positive handling intent as
// the word-boundary guard that already exempts block/unlock/clock: we blank the
// safe temporal idioms, then a residual standalone "lock" is still a real hit.
const LOCK_SAFE_CONTEXT =
  /\b(?:at|before|by|after|until|since)\s+(?:the\s+)?lock\b|\block\s*(?:time\b|→|->|→)/gi;

// Dependency-lockfile filenames are a well-known convention ("lock" as a
// package-manager term of art, not betting slang) — a hazard only now that
// root memory docs (STEP 4b) are in scope, since prose there legitimately
// names these paths ("does not touch package-lock.json"). Narrow exact-name
// list, same blank-then-recheck approach as LOCK_SAFE_CONTEXT above.
const LOCKFILE_SAFE_CONTEXT =
  /\b(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.ya?ml|composer\.lock|Gemfile\.lock|Cargo\.lock|poetry\.lock|Pipfile\.lock)\b/gi;

const WHITELIST_PREFIXES = [
  "apps/web/lib/compliance-scanner/",
  "apps/web/lib/studio/templates/",
  // AI Council DESTROY package: contains banned phrases as attack corpus +
  // detection regexes (same rationale as trust-claims / content-safety).
  "packages/ai-council/",
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
  // Positioning-vocab entries (STEP 4a): same hyphen/space-tolerant matching
  // as positioning-vocab.ts's buildPositioningRegex — "AI-powered" and
  // "AI powered" hit the same rule.
  if (entry.hyphenSpaceTolerant) return buildPositioningPhraseRegex(entry.phrase);
  const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return entry.wordBoundary
    ? new RegExp("\\b" + escaped + "\\b", "i")
    : new RegExp(escaped, "i");
}

function lineIsCommentOnly(line, isMarkdown) {
  if (isMarkdown) return false;
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("*")) return true;
  if (trimmed.startsWith("/*")) return true;
  if (trimmed.startsWith("#")) return true;
  return false;
}

function allowlistedDefinitionLines(rawLines, relNorm) {
  const allowed = new Set();
  const block = ALLOWLISTED_DEFINITION_BLOCKS.get(relNorm);
  if (block) {
    let inside = false;
    for (let index = 0; index < rawLines.length; index++) {
      if (!inside && block.start.test(rawLines[index])) inside = true;
      if (!inside) continue;
      allowed.add(index);
      if (block.end.test(rawLines[index])) inside = false;
    }
  }
  const patterns = ALLOWLISTED_DEFINITION_LINES.get(relNorm) ?? [];
  for (let index = 0; index < rawLines.length; index++) {
    if (patterns.some((pattern) => pattern.test(rawLines[index]))) {
      allowed.add(index);
    }
  }
  return allowed;
}

function scanText(text, relPath) {
  const hits = [];
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map((line) => normalizeScanLine(line));
  const joinedLines = lines.map((line) => collapseStringJoins(line));
  const relNorm = relPath.split(sep).join("/");
  const isMarkdown = relNorm.endsWith(".md");
  const allowedDefinitions = allowlistedDefinitionLines(rawLines, relNorm);
  for (const entry of BANNED_PHRASES_ALL) {
    // Per-rule file exemption (BS-023): skip this phrase for its allowlisted
    // files only; every other banned phrase still applies to those files.
    if (entry.allowFiles && entry.allowFiles.has(relNorm)) continue;
    // STEP 4c: the NEW positioning-vocab phrases are scoped to user-facing +
    // memory-doc surfaces only (apps/web/app, apps/web/components,
    // SCAN_FILES) — NOT apps/web/lib or packages. The hand-maintained "AI
    // picks" family entries above have no restrictedScope and keep applying
    // everywhere, unchanged.
    if (entry.restrictedScope && !isWithinPositioningScope(relNorm)) continue;
    const re = buildRegex(entry);
    for (let i = 0; i < lines.length; i++) {
      if (allowedDefinitions.has(i)) continue;
      if (lineIsCommentOnly(rawLines[i], isMarkdown)) continue;
      // For the "lock" slang ban, blank the legitimate temporal idioms first;
      // a residual standalone "lock" (e.g. "a lock", "lock of the day") still hits.
      const candidates = [lines[i], joinedLines[i]];
      if (
        entry.phrase.includes(" ") &&
        i + 1 < lines.length &&
        !allowedDefinitions.has(i + 1) &&
        !lineIsCommentOnly(rawLines[i + 1], isMarkdown)
      ) {
        candidates.push(`${joinedLines[i].trimEnd()} ${joinedLines[i + 1].trimStart()}`);
      }
      const matched = candidates.some((candidate) => {
        const subject =
          entry.claim === "banned.lock"
            ? candidate.replace(LOCK_SAFE_CONTEXT, " ").replace(LOCKFILE_SAFE_CONTEXT, " ")
            : candidate;
        return re.test(subject);
      });
      if (matched) {
        hits.push({
          line: i + 1,
          snippet: rawLines[i].trim().slice(0, 200),
          claim: entry.claim,
          phrase: entry.phrase,
        });
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

  // STEP 4b: root "memory" docs, scanned in addition to SCAN_DIRS. These are
  // explicit files rather than a directory to walk.
  for (const relPath of SCAN_FILES) {
    const abs = resolve(ROOT, relPath);
    let s;
    try {
      s = await stat(abs);
    } catch {
      continue;
    }
    if (!s.isFile()) continue;
    if (isWhitelistedFile(relPath)) continue;
    scanned++;
    let text;
    try {
      text = await readFile(abs, "utf8");
    } catch {
      continue;
    }
    const hits = scanText(text, relPath);
    for (const hit of hits) {
      allHits.push({ file: relPath, ...hit });
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
