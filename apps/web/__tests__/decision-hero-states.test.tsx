import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * L4 — decision-first FIELD composition contract.
 *
 * Record and Verify read as the same evidence document (shared header rhythm,
 * restrained dividers), not two different decorative plates: neither page
 * renders the proof-crystal plate. Customer-facing chrome carries no banned
 * FIELD phrases, and the homepage eyebrow states the concrete product instead
 * of an abstract category.
 *
 * Out of scope by design: the pinned once-per-session cold-open stays until
 * the doctrine test that pins it is superseded by founder direction
 * (homepage-doctrine-hero pins FieldCinematicIntro; guards are preserved,
 * not softened). proof-crystal on /engine, /proof, and fable content is
 * untouched — this task covers Record + Verify only.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

const verify = read("app/verify/page.tsx");
const calibration = read("app/calibration/page.tsx");
const home = read("app/page.tsx");
const board = read("app/board/page.tsx");

describe("Record + Verify share one evidence room, no decorative plate", () => {
  it("neither page renders the proof-crystal plate", () => {
    expect(verify).not.toContain('assetId="proof-crystal"');
    expect(calibration).not.toContain('assetId="proof-crystal"');
  });

  it("both pages keep the shared evidence header rhythm", () => {
    for (const src of [verify, calibration]) {
      expect(src).toMatch(/uppercase tracking-\[0\.22em\]/);
      expect(src).toMatch(/<h1/);
    }
  });
});

describe("banned FIELD phrases stay off customer chrome", () => {
  it("homepage and board carry no banned phrases", () => {
    for (const src of [home, board]) {
      expect(src).not.toMatch(/Four doors/i);
      expect(src).not.toMatch(/sports decision intelligence/i);
      expect(src).not.toMatch(/MATH YOU CAN READ/i);
      expect(src).not.toMatch(/Mission Control/);
    }
  });

  it("homepage eyebrow states the concrete product", () => {
    expect(home).toMatch(/today's picks|Today's signals|Compare fantasy options/i);
  });
});
