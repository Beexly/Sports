import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * C-178. The upgrade prompts a free visitor is meant to read and act on were
 * below WCAG AA.
 *
 * `text-ultraviolet` on a `bg-ultraviolet/20` panel over the obsidian ground
 * measures below AA for normal text (4.5:1), and `text-ultraviolet-glow` on the
 * same grounds clears it. Those exact pairings carried "Full board is a Pro
 * feature", the free-tier teaser explanation, and the Pro-to-Elite alerts
 * teaser - the conversion path.
 *
 * C-191. The ratios were always recomputed here, but the three hexes they were
 * computed FROM were pasted copies, so the guarantee this comment used to
 * claim - "change a token and this test fails on its own" - was not true, and
 * had already broken: the pasted ground was #080A0F while `--obsidian` in
 * styles/design-tokens.css reads #05070B. The colours are now READ from
 * tailwind.config.ts, which is the source the markup actually resolves through
 * (`text-ultraviolet`, `bg-ultraviolet/20` and `bg-obsidian` are Tailwind
 * classes, not CSS variables). Retune a token there and this test recomputes.
 *
 * The two obsidian definitions still disagree, which is a real inconsistency
 * worth resolving in the design tokens - but not by this test, and not on this
 * PR: #05070B is the DARKER of the two, so it yields a HIGHER contrast ratio
 * for light text. Measuring against the Tailwind value is therefore the
 * conservative direction, and a fix that unifies them cannot silently turn a
 * failing pairing into a passing one behind this test's back.
 */

type Rgb = readonly [number, number, number];

const TAILWIND_CONFIG = readFileSync(resolve(__dirname, "..", "tailwind.config.ts"), "utf8");

/** The only colour keys this guard reads. Closed set, no interpolation. */
type TokenKey = "obsidian" | "DEFAULT" | "glow";

const TOKEN_PATTERNS: Readonly<Record<TokenKey, RegExp>> = {
  obsidian: /\bobsidian:\s*"(#[0-9a-fA-F]{6})"/,
  DEFAULT: /\bDEFAULT:\s*"(#[0-9a-fA-F]{6})"/,
  glow: /\bglow:\s*"(#[0-9a-fA-F]{6})"/,
};

function parseHex(hex: string): Rgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ] as const;
}

/**
 * Pull a `key: "#RRGGBB"` pair out of a Tailwind colour scale.
 *
 * `scope` matters: `DEFAULT` and `glow` are generic keys that appear in several
 * scales, and an unscoped read silently returned a different colour entirely -
 * the first draft of this file measured 9.11:1 for a pairing that is 3.88:1.
 * Always narrow to the block before reading a generic key.
 */
function tokenHex(key: TokenKey, scope: string = TAILWIND_CONFIG): Rgb {
  // `key` is a union of literals, not free text, and the pattern is built from
  // that closed set rather than interpolated from a caller-supplied string -
  // a dynamic RegExp source is a code-injection sink even when today's callers
  // all pass constants, and static analysis is right to say so.
  const match = scope.match(TOKEN_PATTERNS[key]);
  if (!match) {
    throw new Error(
      `tailwind.config.ts no longer defines a hex for "${key}". ` +
        `The paywall contrast guard reads its colours from there; re-point it rather than pasting a value back in.`,
    );
  }
  return parseHex(match[1]);
}

const ULTRAVIOLET_SCALE = TAILWIND_CONFIG.match(/\bultraviolet:\s*\{[^}]*\}/)?.[0] ?? "";

const OBSIDIAN = tokenHex("obsidian");
const ULTRAVIOLET = tokenHex("DEFAULT", ULTRAVIOLET_SCALE);
const ULTRAVIOLET_GLOW = tokenHex("glow", ULTRAVIOLET_SCALE);

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

  it("reads its colours from the Tailwind scale the markup resolves through", () => {
    // Guards the READ itself. `DEFAULT`/`glow` are generic keys, so pin that
    // they came from the ultraviolet block rather than some other scale that
    // happened to match first.
    expect(ULTRAVIOLET_SCALE, "ultraviolet scale missing from tailwind.config.ts").not.toEqual("");
    // The ground is read from the surface scale, the text colours from the
    // ultraviolet block - assert they are genuinely three DIFFERENT colours, so
    // a scoping slip like the one above cannot collapse two of them together.
    const distinct = new Set([OBSIDIAN, ULTRAVIOLET, ULTRAVIOLET_GLOW].map((c) => c.join(",")));
    expect(distinct.size, "two of the three tokens resolved to the same hex").toBe(3);
  });

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

  it("every fixed surface uses the passing colour, not merely not the failing one", () => {
    // Source-level, because the defect is a class pairing in markup. Each file
    // below was measured as carrying both an ultraviolet tint and body text.
    // Asserting the REPLACEMENT is present is what stops a future edit from
    // swapping in some third, unmeasured colour and still passing.
    const files = [
      ["app", "picks", "page.tsx"],
      ["app", "fantasy", "baseline", "page.tsx"],
      ["components", "parlay", "parlay-genome.tsx"],
      ["components", "cards", "result-card.tsx"],
    ];
    for (const parts of files) {
      const label = parts.join("/");
      const source = readFileSync(resolve(__dirname, "..", ...parts), "utf8");
      expect(source.match(/text-ultraviolet(?!-)/g) ?? [], label).toEqual([]);
      expect(source, label).toContain("text-ultraviolet-glow");
    }
  });
});
