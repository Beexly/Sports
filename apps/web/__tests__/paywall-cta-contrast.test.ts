import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * C-178. The upgrade prompts a free visitor is meant to read and act on were
 * below WCAG AA.
 *
 * `text-ultraviolet` (#7B61FF) on a `bg-ultraviolet/20` panel over the obsidian
 * ground measures 3.88:1, and on `bg-ultraviolet/10` it measures 4.34:1. AA for
 * normal text is 4.5:1. Those exact pairings carried "Full board is a Pro
 * feature", the free-tier teaser explanation, and the Pro-to-Elite alerts
 * teaser - the conversion path.
 *
 * `text-ultraviolet-glow` (#9F87FF) on the same grounds measures 5.74:1 and
 * 6.41:1.
 *
 * The ratios are RECOMPUTED here rather than pasted, so the numbers in this
 * file cannot drift away from the tokens they describe: change a token hex and
 * this test recalculates and fails on its own.
 */

type Rgb = readonly [number, number, number];

const OBSIDIAN: Rgb = [0x08, 0x0a, 0x0f];
const ULTRAVIOLET: Rgb = [0x7b, 0x61, 0xff];
const ULTRAVIOLET_GLOW: Rgb = [0x9f, 0x87, 0xff];

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const channel = (raw: number): number => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: Rgb, bg: Rgb): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Tailwind's `bg-<colour>/<n>` composites in sRGB over whatever is behind it. */
function over(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [
    Math.round(alpha * fg[0] + (1 - alpha) * bg[0]),
    Math.round(alpha * fg[1] + (1 - alpha) * bg[1]),
    Math.round(alpha * fg[2] + (1 - alpha) * bg[2]),
  ];
}

const AA_NORMAL = 4.5;

describe("paywall CTA contrast", () => {
  const tint20 = over(ULTRAVIOLET, OBSIDIAN, 0.2);
  const tint10 = over(ULTRAVIOLET, OBSIDIAN, 0.1);

  it("records WHY the swap was needed: the old pairing fails AA", () => {
    // A negative control on the fix itself. If someone "simplifies" the tokens
    // so that plain ultraviolet suddenly passes, this test tells them the
    // premise changed rather than silently blessing a revert.
    expect(contrast(ULTRAVIOLET, tint20)).toBeLessThan(AA_NORMAL);
    expect(contrast(ULTRAVIOLET, tint10)).toBeLessThan(AA_NORMAL);
  });

  it("the colour actually used now clears AA on both tints", () => {
    expect(contrast(ULTRAVIOLET_GLOW, tint20)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrast(ULTRAVIOLET_GLOW, tint10)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("no ultraviolet-tinted surface still uses the failing text colour", () => {
    // Source-level, because the defect is a class pairing in markup. Each file
    // below was measured as carrying both an ultraviolet tint and body text.
    const files = [
      ["app", "picks", "page.tsx"],
      ["app", "fantasy", "baseline", "page.tsx"],
      ["components", "parlay", "parlay-genome.tsx"],
      ["components", "cards", "result-card.tsx"],
    ];
    for (const parts of files) {
      const source = readFileSync(resolve(__dirname, "..", ...parts), "utf8");
      const offenders = source.match(/text-ultraviolet(?!-)/g) ?? [];
      expect(offenders, parts.join("/")).toEqual([]);
    }
  });
});
