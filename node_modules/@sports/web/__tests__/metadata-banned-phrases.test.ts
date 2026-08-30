import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * Banned-phrase scan for static metadata strings.
 *
 * The existing public-copy-scanner walks rendered pages. Metadata
 * objects in layout.tsx and generateMetadata exports can still leak
 * banned phrases into search engines / social previews even when the
 * page body is clean. This test pulls metadata-bearing files and runs
 * the same scanner over them.
 */

const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

const METADATA_FILES = [
  "app/layout.tsx",
  // Dynamic blog metadata is sourced from DB content (ContentDraft); the
  // content-engine review pipeline is the right place to catch issues
  // there. We still scan the static file in case the template ever holds
  // hardcoded copy.
  "app/blog/[slug]/page.tsx",
];

describe("Metadata — banned-phrase scan", () => {
  for (const file of METADATA_FILES) {
    it(`${file} metadata has no banned phrases`, () => {
      const src = read(file);
      // Only consider literal strings inside the file. The scanner walks
      // the whole text; that's fine — any banned phrase in any string
      // literal will be a positive.
      const hits = scanForBannedPhrases(src);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(`${file} metadata contains banned phrases:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }

  it("the root layout metadata.description is descriptive but not hyped", () => {
    const src = read("app/layout.tsx");
    expect(src).toMatch(/description:/);
    // Negative: must not include "guaranteed-anything" patterns
    expect(src).not.toMatch(/guaranteed/i);
    // Negative: should not promise outcomes
    expect(src).not.toMatch(/win every time|profit every|sure (bet|win)/i);
  });
});
