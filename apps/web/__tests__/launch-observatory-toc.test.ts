import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * docs/launch-observatory.md TOC contract.
 *
 * Asserts:
 *   - Every `## Heading` has a corresponding bullet in the `## Contents`
 *     block.
 *   - Every TOC bullet points at a heading that exists.
 *
 * The link slug uses GitHub's auto-anchor convention (lowercase,
 * spaces → hyphens, strip punctuation except hyphens). We compute it the
 * same way for the test.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(
  resolve(repoRoot, "docs/launch-observatory.md"),
  "utf8"
);

function slug(heading: string): string {
  // Mirror GitHub's slug algorithm exactly so the test agrees with how
  // GitHub renders the anchors:
  //   1. lowercase + trim
  //   2. strip non-alphanumeric (except whitespace, hyphen, underscore)
  //   3. collapse runs of whitespace/underscore/hyphen to a single "-"
  //   4. trim leading/trailing "-"
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TOC_BLOCK = src.match(/##\s+Contents\s*\n([\s\S]*?)\n##\s/);
const tocText = TOC_BLOCK ? TOC_BLOCK[1] : "";
const TOC_LINKS = Array.from(tocText!.matchAll(/\[[^\]]+\]\(#([^)]+)\)/g)).map((m) => m[1]!);

const HEADINGS = Array.from(src.matchAll(/^##\s+(.+)$/gm))
  .map((m) => m[1]!.trim())
  .filter((h) => h !== "Contents");

const HEADING_SLUGS = new Set(HEADINGS.map(slug));

describe("docs/launch-observatory.md — Contents TOC", () => {
  it("has a Contents block", () => {
    expect(TOC_BLOCK, "## Contents block missing or empty").not.toBeNull();
  });

  it("every heading appears in the TOC", () => {
    const tocSet = new Set(TOC_LINKS);
    const missing: string[] = [];
    for (const heading of HEADINGS) {
      const s = slug(heading);
      if (!tocSet.has(s)) missing.push(heading);
    }
    expect(
      missing,
      `These ## headings are missing from the Contents TOC: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("every TOC link points at a real heading", () => {
    const orphans = TOC_LINKS.filter((l) => !HEADING_SLUGS.has(l));
    expect(
      orphans,
      `These TOC links don't point at real headings: ${orphans.join(", ")}`
    ).toEqual([]);
  });
});
