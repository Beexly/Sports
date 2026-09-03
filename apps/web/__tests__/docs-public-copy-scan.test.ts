import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";
import { FORBIDDEN_PHRASES, buildPositioningRegex } from "@/lib/positioning-vocab";

/**
 * Docs public-copy scan.
 *
 * The brand voice + responsible-gambling commitments apply to docs that
 * may be shared with customers (handoff to support, copy/pasted into
 * marketing collateral, embedded in a help center). The launch
 * observatory and runbook docs both qualify. Root memory docs (README,
 * CLAUDE.md, AGENTS.md, START_HERE.md) qualify too — they are the platform's
 * own onboarding/instruction surface and are covered by the same CI trust-
 * gate scan (scripts/guardrails/trust-gate.mjs), so this test keeps the two
 * gates in lock-step.
 *
 * The scanner uses word-boundary handling for short single-word phrases
 * (e.g. "lock"), but multi-word phrases are matched as literal
 * substrings. That means docs CAN reference a banned phrase by name in
 * code-fences or in a "do not write X" sentence — but only if the
 * literal phrase doesn't appear. To allow precise vocabulary-definition
 * sentences, we strip fenced code blocks and `inline-code` spans before
 * scanning.
 *
 * Brand-positioning ("We're not AI. We're math you can read.") is checked
 * separately below, straight off FORBIDDEN_PHRASES — the same single source
 * of truth (apps/web/lib/positioning-vocab.json) the runtime compliance
 * scanner and the CI trust-gate read — rather than the two BS-004 entries
 * (`banned.ai-picks` / `banned.ai-generated-picks`) trust-claims.ts's own
 * BANNED list carries. That way a doc failing on, say, "AI-powered" fails
 * this test even though trust-claims.ts's registry only special-cases the
 * "AI picks" framing by name.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function readDoc(rel: string): string {
  const full = resolve(repoRoot, rel);
  if (!existsSync(full)) return "";
  return readFileSync(full, "utf8");
}

// Strip markdown code-fences and inline `code` spans before scanning so a
// doc can quote a banned phrase as a literal in a code block.
function stripCode(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");
}

const DOCS = [
  "docs/launch-observatory.md",
  "docs/launch-runbook.md",
  "docs/adr/001-public-performance-policy.md",
  "docs/adr/002-jarvis-synthesizer.md",
  "CONTRIBUTING.md",
  "README.md",
  "CLAUDE.md",
  "AGENTS.md",
  "START_HERE.md",
  // Package READMEs are developer-facing but ship in the public GitHub repo
  // (github.com/Beexly/Sports per docs/ops/CLAUDE_OWNER_LAUNCH_HANDOFF.md) —
  // scripts/guardrails/trust-gate.mjs already walks packages/**/*.md for the
  // hand-maintained banned-phrase list, but not the full positioning-vocab
  // list (its restrictedScope is apps/web/app + apps/web/components only).
  // Covered here instead, alongside the root memory docs above.
  "packages/feature-store/README.md",
  "packages/governed/README.md",
  "packages/stats-api/README.md",
];

// Source files that are NOT walked by scripts/guardrails/trust-gate.mjs at
// all (workers/** is outside its SCAN_DIRS) or are walked only for the
// hand-maintained "AI picks" phrases and not the full positioning-vocab list
// (apps/web/lib/** is outside its restrictedScope POSITIONING_SCAN_DIRS,
// which is apps/web/app + apps/web/components only). Each of these emits
// real user-facing text: transactional email copy (the closest equivalent
// this repo has to an "apps/web/emails/**" directory — there isn't one),
// and the RSS/JSON-LD/sitemap builders that ship into search engines and
// feed readers. Scanned with the source functions directly (no stripCode —
// that helper is markdown-code-fence-aware, not JS/TS-aware, and would
// mis-strip legitimate multi-line template literals in these files).
const SOURCE_SURFACES = [
  "apps/web/lib/gse/waitlist-welcome-email.ts",
  "apps/web/lib/watchlist/channels/email-channel.ts",
  "apps/web/lib/seo/json-ld.ts",
  "apps/web/lib/seo/sports-jsonld.ts",
  "apps/web/lib/seo/news-sitemap.ts",
  "apps/web/lib/seo/site-url.ts",
  "workers/content-publishing/src/index.ts",
];

interface PositioningHit {
  readonly phrase: string;
  readonly line: number;
  readonly snippet: string;
}

/**
 * Scan for the brand-positioning vocabulary (FORBIDDEN_PHRASES), line by
 * line, using the same hyphen/space-tolerant matching production code uses
 * (buildPositioningRegex) — so "AI-powered", "AI powered", and "ai driven"
 * are all caught the same way they are in apps/web/app and apps/web/components.
 */
function scanForPositioningVocab(text: string): PositioningHit[] {
  const hits: PositioningHit[] = [];
  const lines = text.split(/\r?\n/);
  for (const phrase of FORBIDDEN_PHRASES) {
    const pattern = buildPositioningRegex([phrase]);
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        hits.push({ phrase, line: idx + 1, snippet: line.trim() });
      }
    });
  }
  return hits;
}

describe("Docs — public-copy banned-phrase scan", () => {
  for (const doc of DOCS) {
    it(`${doc} contains no banned phrases outside code spans`, () => {
      const text = readDoc(doc);
      if (text === "") {
        // Doc doesn't exist — skip rather than fail; some docs are
        // optional and a missing doc surfaces in a different test.
        return;
      }
      const stripped = stripCode(text);
      const hits = scanForBannedPhrases(stripped);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(
          `${doc} contains banned phrases outside code spans:\n${summary}\n` +
            `If a phrase is referenced legitimately (e.g. documenting a forbidden term), ` +
            `wrap it in a code-fence or backticks so the scanner can skip it.`
        );
      }
      expect(hits.length).toBe(0);
    });

    it(`${doc} contains no banned AI-positioning phrases outside code spans`, () => {
      const text = readDoc(doc);
      if (text === "") return;
      const stripped = stripCode(text);
      const hits = scanForPositioningVocab(stripped);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(
          `${doc} frames the engine or picks as AI (brand rule: "We're not AI. ` +
            `We're math you can read."):\n${summary}\n` +
            `If a phrase is referenced legitimately (e.g. documenting a forbidden term), ` +
            `wrap it in a code-fence or backticks so the scanner can skip it.`
        );
      }
      expect(hits.length).toBe(0);
    });
  }
});

describe("Additional user-facing surfaces — banned-phrase + positioning scan", () => {
  for (const file of SOURCE_SURFACES) {
    it(`${file} contains no banned phrases`, () => {
      const text = readDoc(file);
      if (text === "") return; // optional; a missing file surfaces elsewhere
      const hits = scanForBannedPhrases(text);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(`${file} contains banned phrases:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });

    it(`${file} contains no banned AI-positioning phrases`, () => {
      const text = readDoc(file);
      if (text === "") return;
      const hits = scanForPositioningVocab(text);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(
          `${file} frames the engine or picks as AI (brand rule: "We're not AI. ` +
            `We're math you can read."):\n${summary}`
        );
      }
      expect(hits.length).toBe(0);
    });
  }
});
