import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * Stronger public-copy banned-phrase scan.
 *
 * Complements `public-copy-scanner.test.ts`. The original test maintains
 * its own hard-coded BANNED_PUBLIC_CLAIMS list; this one consumes the
 * trust-claims registry directly so the two stay aligned.
 *
 * Covers the highest-stakes customer-facing files: landing, picks,
 * performance, dashboard, brief, promotions, and pricing. If a banned
 * phrase shows up anywhere in those files, both tests should fail —
 * defense in depth.
 */

const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

// Highest-stakes customer-facing files (landing + paid-conversion + claim
// surfaces). Each file is scanned for banned phrases. The trust-claim
// registry is the single source of truth.
const SCAN_TARGETS = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/performance/page.tsx",
  "app/picks/page.tsx",
  "app/pricing/page.tsx",
  "app/promotions/page.tsx",
  "app/brief/page.tsx",
  "app/blog/page.tsx",
];

describe("Strong public-copy scan — registry-driven", () => {
  for (const file of SCAN_TARGETS) {
    it(`${file} passes the trust-claim registry banned-phrase scan`, () => {
      let content: string;
      try {
        content = read(file);
      } catch {
        // Some routes are not present in every branch — skip gracefully
        // instead of failing.
        return;
      }
      const hits = scanForBannedPhrases(content);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(`${file} contains banned phrases:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }
});
