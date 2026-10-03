import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * C-31 regression: public copy claimed "Free gets every pick" while the shipped
 * entitlement is a 2-pick/day teaser (packages/types: dailyPickLimit=2,
 * canSeePremiumPicks=false). A false free-tier promise on a public page is FTC
 * exposure, so the banned phrasings are pinned here at the source level.
 */
const SOURCES = [
  join(__dirname, "..", "app", "faq", "page.tsx"),
  join(__dirname, "..", "lib", "pricing", "feature-gates.ts"),
];

const BANNED = [
  /every pick,?\s*free/i,
  /free gets every pick/i,
  /every pick is free/i,
  /pick type on all of them/i,
  /on every signal, plus/i,
];

describe("free-tier copy never overpromises the teaser", () => {
  for (const file of SOURCES) {
    it(`${file.split("/").slice(-2).join("/")} contains no 'every pick free' claim`, () => {
      const src = readFileSync(file, "utf8");
      for (const re of BANNED) {
        expect(src).not.toMatch(re);
      }
    });
  }

  it("the FAQ describes the real teaser (two picks a day)", () => {
    const src = readFileSync(SOURCES[0]!, "utf8");
    expect(src).toMatch(/two-pick teaser/i);
  });
});
