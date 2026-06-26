import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * Docs public-copy scan.
 *
 * The brand voice + responsible-gambling commitments apply to docs that
 * may be shared with customers (handoff to support, copy/pasted into
 * marketing collateral, embedded in a help center). The launch
 * observatory and runbook docs both qualify.
 *
 * The scanner uses word-boundary handling for short single-word phrases
 * (e.g. "lock"), but multi-word phrases are matched as literal
 * substrings. That means docs CAN reference a banned phrase by name in
 * code-fences or in a "do not write X" sentence — but only if the
 * literal phrase doesn't appear. To allow precise vocabulary-definition
 * sentences, we strip fenced code blocks and `inline-code` spans before
 * scanning.
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
  // Frontier-night Event Genome product specs (each anchored to a shipped engine module).
  "docs/product/MATCH_GENOME_SYSTEM.md",
  "docs/product/STAT_PASSPORTS.md",
  "docs/product/TREND_PASSPORTS.md",
  "docs/product/PREDICTION_COURT.md",
  "docs/product/MARKET_BLOOM.md",
  "docs/product/AUTHORITY_FLIGHT_RECORD.md",
  "docs/product/SLIP_MRI.md",
  "docs/product/MY_MATCHES_AND_ALERTS.md",
  "docs/product/SEO_ROUTE_FACTORY.md",
  "docs/product/BONUS_OFFER_INTEGRITY.md",
  "docs/competitive/SCORES24_BUSINESS_MACHINE_TEARDOWN.md",
  "docs/frontier-night/01_GSE_INSTITUTION_ARCHITECTURE.md",
  "docs/data-kingdom/odds-credit.md",
  "docs/launch/scores24-leverage-to-gse-revenue.md",
  "docs/frontier-night/ADVERSARIAL_AUDIT.md",
  "docs/frontier-night/OVERNIGHT_OWNER_BRIEF.md",
  // Meaning Compiler (Addendum II)
  "docs/product/GSE_MEANING_COMPILER.md",
  "docs/competitive/SCORES24_TO_GSE_INVARIANTS.md",
];

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
  }
});
