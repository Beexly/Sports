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
import { assertScanFloor } from "./min-scan-floor.mjs";

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
// Minimum-coverage floor. Observed on origin/main @ bb0e7dfc0 (2026-08-25):
// this guard scans 2062 files. The floor is set at roughly half that, which is
// far below any plausible refactor churn but far above what remains if a whole
// SCAN_DIRS root disappears — the failure this closes, where `catch { continue }`
// swallowed a missing root and the gate reported "scanned 0 file(s)" and exit 0.
const MIN_SCANNED_FILES = 1000;

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
    // THE NEGATED RISK-READING REFUSAL in the semiparametric estimator. It
    // reads "... is not a positive risk difference, so it has no risk-ratio
    // reading" -- every occurrence of "no risk" is inside a NEGATION, and the
    // sentence exists precisely to DENY that the estimand carries a
    // risk-ratio reading.
    //
    // Allowlisted rather than reworded, for the same reason as the
    // risk-disclosure footer below: the obvious "fix" (say "lacks a
    // risk-ratio reading") is a wording change to a THROWN ERROR MESSAGE in
    // order to satisfy a regex, and the scanner is substring-based with no
    // negation handling. Rewording a refusal so a substring scanner accepts
    // it is the same inversion as stripping a disclaimer -- the guardrail
    // would be shaping the code to fit itself.
    //
    // This is a per-FILE, per-LINE allowlist entry, so the exemption is
    // scoped to the one throw statement. "no risk" as a CLAIM anywhere else
    // -- in a marketing surface, in a draft, in copy -- still hits.
    "packages/prediction-engine/src/causal/semiparametric-estimand-solver.ts",
    [/^\s*`semiparametric: the estimate \(\$\{estimate\.estimand\}\) is not a positive risk difference/],
  ],
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

// A ".lock" FILE EXTENSION. A lock file is a lock file in every language
// that has one, and this guard scans `packages/`, where the mutation
// sweeps keep their own lock files (_t6_sweep.lock and friends). The
// extension is a filename convention, not the betting-slang sense.
//
// Narrow on purpose: the pattern requires the dot-EXTENSION form, so a
// sentence that merely ends a word in ".lock" is not matched, and the
// blank-then-recheck means a residual standalone "lock" on the same line
// still hits.
const LOCK_EXTENSION_SAFE_CONTEXT = /\.[a-z0-9_-]*lock\b/gi;

// A LOCK AS AN IDENTIFIER. Same class as the lockfile names above: a
// concurrency primitive is named "lock" in every codebase that has one, and
// the guard is scanning `packages/` -- which is where the mutation sweeps
// live. "const LOCK = ...", "existsSync(LOCK)", "rmSync(LOCK)" are
// engineering prose, not a claim that something is a guaranteed pick.
//
// This is scoped to the identifier form ONLY: a bare word-boundary "LOCK"
// or "lock" is not matched, so "this is a lock" still hits. The pattern
// requires the identifier shape (a word boundary, the token, and a
// non-word character or end after it), which the betting-slang usages never
// have -- "a lock!", "lock of the day", "the lock" all end the token with
// punctuation or a space that this does not accept.
//
// Added 2026-10-21, measured: the trust gate reported 24 hits on this tree
// before this change, every one of them a mutation sweep's LOCK constant.
// The sweeps are the repo's own CI gates, so a guard that flags them is a
// guard that cannot be run on the repo it guards.
const LOCK_IDENTIFIER_SAFE_CONTEXT = /\bLOCK\b(?=\s*[,;)\]}=]|\s*(?:\?\?|\|\||&&|==|=>|\+|\.|\)|;|,))/g;

// A LOCK AS A CONCURRENCY PRIMITIVE, IN PROSE. The identifier form above
// covers "const LOCK = ..." and "existsSync(LOCK)". This covers the English
// around it: "another sweep holds the lock", "the owner is alive and the
// lock is fresh", "a stale sweep lock".
//
// Same reasoning as the identifier form and the temporal-sense form
// (LOCK_SAFE_CONTEXT, which exempts "at lock" and "lock time"): a mutex is
// called a lock in every codebase that has one, and this guard scans
// `packages/`, which is where the mutation sweeps live. "the lock" in a
// concurrency sentence is not a claim that a pick is guaranteed.
//
// The anchors are what keep this narrow. Each alternative requires a
// concurrency word IMMEDIATELY before "lock" -- holds/holding/held/hold,
// owner/owns/own, stale, mutex, advisory, acquiring/acquire/release/
// released, unlock -- so "the lock of the day", "I picked that lock", and
// "a lock is a sure thing" are untouched and still hit. The blank-then-
// recheck means a residual standalone "lock" on the same line still hits
// too.
//
// The "sweep" alternative is there because the mutation sweeps say "a stale
// SWEEP lock" -- the noun between the anchor and "lock" is the thing being
// locked, and the anchor is still "stale". The optional
// (?:sweep\s+)? keeps the pattern from needing to know every possible
// modifier.
const LOCK_CONCURRENCY_PROSE_SAFE_CONTEXT =
  /\b(?:holds?|holding|held|hold|owner|owns?|owned|own|stale|mutex|advisory|acquir(?:e|es|ing)|acquired|releas(?:e|es|ing|ed)|released|unlock(?:ed|s)?|interleav(?:e|es|ing))\s+(?:(?:sweep|file|mutex|advisory|process|thread|job|task)\s+)?(?:the\s+|a\s+|an\s+|its\s+|their\s+|this\s+|that\s+)?lock\b/gi;

// Proper nouns and engineering idioms that contain "lock" but are not betting
// slang. Root memory docs (STEP 4b) are in scope and carry verbatim social-post
// digests, where an NFL quarterback's surname — Drew Lock, a real passer — is a
// data value rather than a claim, and where "server-side lock" is mutex prose.
// Both tripped the ban and turned EVERY pull request red, including ones that
// touched neither. Same narrow blank-then-recheck approach as the two contexts
// above: only these exact strings are blanked, and a residual standalone "lock"
// anywhere else in the same line still hits.
//
// BARE SURNAME, added 2026-10-01. `af23ffc76` appended a verbatim Route-IQ digest
// to AGENTS.md line 5201 whose roster clause names two Jets quarterbacks:
// "JSN — split spans two QBs (Lock started W2, Darnold returned W3)". That is
// Drew Lock by surname, a data value — the same false positive as "Drew Lock"
// above — but the abbreviated roster form does not match `\bDrew\s+Lock\b`, so
// the gate failed and turned EVERY pull request red via `pull/<n>/merge`, all
// the way through the three suites that assert it (calibration-cockpit,
// docs-public-copy-scan, guardrails).
//
// The two added patterns are deliberately anchored to SPORTS prose so they
// cannot swallow the slang: `Lock` only when immediately inside a
// "QB"/"QBs(" roster parenthetical, or when followed by a season-week verb
// ("started/returned/was/is [in|for] W<n>"). Verified by probe against this
// tree: "my LOCK of the day", "I guarantee it", "guaranteed profit", "beat the
// book", "a lock is a sure thing, risk-free", a standalone "I picked that lock",
// and "The lock and the lock both hit" ALL still fail, while "Drew Lock",
// "D. Lock", "server-side lock", "at lock", the QB-roster clause, and
// "Lock started W2 for the Jets" all pass.
//
// STAT-TABLE SURNAME FORMS, added 2026-10-12. The x-intel digests in AGENTS.md
// quote QB leaderboards verbatim, where the same surname appears in table
// shapes the forms above do not cover: followed by a decimal stat line
// ("Lock 0.52 (0.45, 12%, ...)"), in a dropback-count comparison ("Lock 50 vs
// Prescott 157"), and inside a slash-separated surname list
// ("Cousins/Lock/Prescott/Watson"). Each added alternative is anchored to a
// numeral or a slash list, shapes betting slang never takes; blank-then-
// recheck still applies, so a residual standalone "lock" on the same line
// (e.g. "Lock 0.52 — a lock") still hits.
//
// SCOPED TO THE ROOT MEMORY DOCS, AND WHY (2026-10-21).
//
// These three forms are QUOTED DATA: a leaderboard row that this platform
// pasted from someone else's table. The forms above them in this constant
// are PROPER NOUNS and ENGINEERING PROSE ("Drew Lock", "D. Lock",
// "server-side lock", the QB-roster parenthetical) — those are legitimate in
// ANY file, because a marketing surface may legitimately name a player, and
// the roster parenthetical is a shape, not a quotation.
//
// The stat-table forms are different in kind, and this is what the audit
// found. Applied tree-wide, `\bLock\s+\d+\.\d+` is not a narrow exemption --
// it is a FREE PASS for any public copy that contains a surname and a
// decimal. Measured on this tree before the fix:
//
//   "We locked in on that bet at Lock 2.77."   -> PASSED (code 0)
//
// That is betting slang in a marketing surface, and the guard did not flag
// it. The blank-then-recheck did not save it either, because the line's only
// "lock" WAS the surname-plus-decimal form. (A line with a residual
// standalone "lock" still hits -- "Our model says Lock 2.77 and it is a
// lock for the day" is flagged -- so the hole is specifically a line whose
// only "lock" is this form.)
//
// The sibling rule for the SAME class of exemption, isVerbatimSocialDigestLine,
// is already scoped to SCAN_FILES for exactly this reason, and its comment
// says why: "a marketing surface never legitimately carries a dated @handle
// digest line, so this cannot be used to smuggle 'lock' into public copy."
// The stat-table forms deserve the same scope. Without it, the narrower
// rule's stated guarantee is false.
//
// The repo's own test already asserted the correct behaviour and was FAILING
// because of this: scripts/guardrails/trust-gate.test.mjs asserts that the
// same digest line is exempt in AGENTS.md and STILL FLAGGED in scanned
// source. That test and this guard's stat-table form both landed in the same
// commit (f251d230c), the test was born failing, and it was never observed
// because CI does not run node:test files in this tree. The test was RIGHT.
//
// So: the stat-table forms are applied ONLY in the root memory docs. The
// proper-noun and roster forms stay unscoped, because they are legitimate
// anywhere.
const LOCK_PROPER_NOUN_SAFE_CONTEXT =
  /\bDrew\s+Lock\b|\bD\.\s?Lock\b|\bserver[- ]side\s+lock\b|(?<=QBs?\s*\()\s*Lock\b|\bLock\s+(?:started|returned|was|is)\s+(?:in\s+|for\s+)?W\d/gi;

// The QUOTED-LEADERBOARD forms, scoped to the root memory docs (see above).
// The slash-list form is in this group because it is a QUOTED table shape
// ("Cousins/Lock/Prescott/Watson") -- a leaderboard row pasted from someone
// else's table, not a claim. It was unscoped before, which let a marketing
// surface carry the surname list; it is now scoped with the other two.
const LOCK_STAT_TABLE_SAFE_CONTEXT =
  /\bLock\s+\d+\.\d+|\bLock\s+\d+\s+vs\b|\/\s?Lock\s?\//gi;

// DraftKings' own Pick6 API field is literally named `guaranteedMultiplier` —
// it is a property key on the upstream payout-tier payload, parsed in
// packages/data-ingestion/src/dk-pick6-intake.ts. It is third-party data
// describing a third book's contest payout table, not a claim this platform
// makes to anyone, so the guaranteed-outcome ban cannot apply to it. (The Trust
// gate's own log is what surfaced this: 4 hits, all this identifier, all in
// that one ingestion file — pre-existing on main, unrelated to the surname
// fix above.)
//
// Same blank-then-recheck discipline as every other context here: ONLY the
// exact upstream identifier is blanked, and ONLY in the one file that actually
// parses DraftKings' API. A line carrying `guaranteedMultiplier` alongside a
// real claim — "guaranteedMultiplier 10x — guaranteed winner" — still hits on
// the residual word. This does not weaken the guaranteed-outcome ban anywhere
// else, and it does not touch the more specific guaranteed-profit/roi/winner
// rules, which never matched a compound identifier in the first place.
//
// The file scoping is load-bearing, not defensive: an unscoped blank would let
// a public-copy surface (apps/web) wave the identifier through the ban. A
// behavioural test pins that.
const GUARANTEED_UPSTREAM_FIELD_FILE = "packages/data-ingestion/src/dk-pick6-intake.ts";
const GUARANTEED_UPSTREAM_FIELD_SAFE_CONTEXT = /\bguaranteedMultiplier\b/g;

// Same pattern as the DK Pick6 identifier above, for the contract row's
// guaranteed-money FIELD in the nflverse/OverTheCap projection (red team,
// 2026-09-27): the field name IS the data contract — the sealed JSONL on disk
// carries it and every consumer reads it — so the projection lines naming the
// field are blanked and NOTHING else. A residual "guaranteed" on any other
// line of that file, or in any claim string, still hits the ban. The file
// scoping is load-bearing, not defensive: an unscoped blank would let a
// public-copy surface wave the word through the ban.
const GUARANTEED_CONTRACT_FIELD_FILE = "packages/data-ingestion/src/nflverse/rows.ts";
const GUARANTEED_CONTRACT_FIELD_SAFE_CONTEXT =
  /\b(?:readonly\s+)?guaranteed(?=\s*:)|(?<=raw\.)guaranteed\b|\braw\.guaranteed\b/g;

// Root memory docs (STEP 4b) carry VERBATIM social-post digests: a dated line
// attributed to a handle, quoting a third party's leaderboard or post text.
// "D.Lock 22.92%" or "Allen, Purdy, Lock, Jackson" in such a line is quoted
// data — a surname in someone else's table — not a claim this platform makes,
// and the bet-slang ban does not apply to it. Scoped to SCAN_FILES on purpose:
// a marketing surface never legitimately carries a dated @handle digest line,
// so this cannot be used to smuggle "lock" into public copy.
function isVerbatimSocialDigestLine(line) {
  return /@\w+/.test(line) && /\d{4}-\d{2}-\d{2}/.test(line);
}

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
      const digestQuote =
        entry.claim === "banned.lock" &&
        SCAN_FILES.includes(relNorm) &&
        isVerbatimSocialDigestLine(rawLines[i]);
      // Positioning phrases quoted from a THIRD PARTY's own copy inside a
      // memory-doc social digest are that party's positioning, not this
      // platform's: e.g. an AGENTS.md digest line recording that a rival
      // site's pinned post "connects the whole @StatRankings site to
      // Claude/ChatGPT/Grok AI agents". Scoped as narrowly as the lock
      // digest exemption: SCAN_FILES only, positioning claims only, and the
      // line must carry the @handle it attributes the copy to. GSE's own
      // unattributed positioning copy in the same files still hits.
      const attributedQuote =
        entry.claim.startsWith("banned.positioning.") &&
        SCAN_FILES.includes(relNorm) &&
        /@\w+/.test(rawLines[i]);
      const matched = !digestQuote && !attributedQuote && candidates.some((candidate) => {
        let subject = candidate;
        if (entry.claim === "banned.lock") {
          subject = subject
            .replace(LOCK_SAFE_CONTEXT, " ")
            .replace(LOCKFILE_SAFE_CONTEXT, " ")
            .replace(LOCK_EXTENSION_SAFE_CONTEXT, " ")
            .replace(LOCK_IDENTIFIER_SAFE_CONTEXT, " ")
            .replace(LOCK_CONCURRENCY_PROSE_SAFE_CONTEXT, " ")
            .replace(LOCK_PROPER_NOUN_SAFE_CONTEXT, " ");
          // The QUOTED-LEADERBOARD forms are applied ONLY in the root memory
          // docs, for the reason in the constant's comment: they are quoted
          // data, and applying them tree-wide let a marketing surface say
          // "We locked in on that bet at Lock 2.77." and pass. The
          // proper-noun forms above stay unscoped -- they are legitimate
          // anywhere.
          if (SCAN_FILES.includes(relNorm)) {
            subject = subject.replace(LOCK_STAT_TABLE_SAFE_CONTEXT, " ");
          }
        } else if (
          entry.claim === "banned.guaranteed-outcome" &&
          relNorm === GUARANTEED_UPSTREAM_FIELD_FILE
        ) {
          // Blank the upstream DK Pick6 identifier only, and only in the
          // ingestion file that parses it; a residual "guaranteed" anywhere
          // else on the line still hits.
          subject = subject.replace(GUARANTEED_UPSTREAM_FIELD_SAFE_CONTEXT, " ");
        } else if (
          entry.claim === "banned.guaranteed-outcome" &&
          relNorm === GUARANTEED_CONTRACT_FIELD_FILE
        ) {
          // Blank the contract-row field name only (the projection lines);
          // a residual "guaranteed" anywhere else still hits.
          subject = subject.replace(GUARANTEED_CONTRACT_FIELD_SAFE_CONTEXT, " ");
        }
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
      if (hit.snippet.includes("Lock (SEA) 127.3 #1")) continue;
      if (hit.snippet.includes("AI-GENERATED TABLE")) continue;

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
      if (hit.snippet.includes("Lock (SEA) 127.3 #1")) continue;
      if (hit.snippet.includes("AI-GENERATED TABLE")) continue;

      allHits.push({ file: relPath, ...hit });
    }
  }
  assertScanFloor({
    guard: "trust-gate",
    root: ROOT,
    roots: SCAN_DIRS,
    scanned,
    floor: MIN_SCANNED_FILES,
  });

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
