import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Kinetic logo guard.
 *
 * The 2026 brand requires the official lockup to land with a kinetic signature
 * — a sub-1s arrival sting that settles the chrome emblem and resolves the
 * wordmark — and to be FULLY disabled under prefers-reduced-motion. These are
 * the contracts that keep the signature recognizable, accessible, and
 * silent-by-default.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

describe("Kinetic logo signature", () => {
  const css = read("styles/pickpilot-kit.css");

  it("defines the draw-on / pop / glow / wordmark keyframes", () => {
    for (const kf of ["gse-mark-draw", "gse-mark-pop", "gse-mark-glow", "gse-word-resolve"]) {
      expect(css).toContain(`@keyframes ${kf}`);
    }
  });

  it("drives the official emblem + wordmark from the kinetic modifier", () => {
    expect(css).toContain(".brand-lockup-kinetic .brand-emblem");
    expect(css).toContain(".brand-lockup-kinetic .brand-wordmark");
  });

  it("renders the inline true-break mark + wordmark in the lockup", () => {
    const lockup = read("components/brand/brand-lockup.tsx");
    // NEBULA v7 (owner-directed: the chrome raster emblem is retired) — the
    // lockup renders the inline true-break SVG mark, not a PNG asset.
    expect(lockup).toContain("LogoMarkInline");
    expect(lockup).not.toContain("/brand/gse-emblem-180.png");
    expect(lockup).toContain("brand-wordmark-text");
    // Field visual system (96e505471, merged as #758) replaced the chrome
    // signal fade with the Field signature: bone wordmark on void, ember rule
    // under it, and "No chrome gradient" spelled out in the stylesheet. The
    // intent of this assertion is unchanged — the wordmark is filled by a
    // deliberate brand treatment rather than an inherited default — so it now
    // pins the current treatment instead of the retired gradient.
    expect(css).toContain(".brand-wordmark-text");
    const wordmarkBlock = css.slice(
      css.indexOf(".brand-wordmark-text"),
      css.indexOf("}", css.indexOf(".brand-wordmark-text")),
    );
    expect(wordmarkBlock).toContain("color: var(--ion-white)");
    expect(wordmarkBlock).toContain("background: none");
    // The ember rule under the wordmark carries the signal now.
    const underlineBlock = css.slice(
      css.indexOf(".brand-wordmark-underline"),
      css.indexOf("}", css.indexOf(".brand-wordmark-underline")),
    );
    expect(underlineBlock).toContain("var(--plasma)");
  });

  it("disables all kinetic animation under prefers-reduced-motion", () => {
    // The reduced-motion block must reference the kinetic selectors and kill
    // animation, snapping to the resolved resting state.
    const reducedBlocks = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\}\s*\}/g) ?? [];
    const guardsKinetic = reducedBlocks.some(
      (b) =>
        b.includes("brand-lockup-kinetic") &&
        /animation:\s*none\s*!important/.test(b),
    );
    expect(guardsKinetic).toBe(true);
  });

  it("applies the kinetic modifier on the header lockup by default", () => {
    const lockup = read("components/brand/brand-lockup.tsx");
    expect(lockup).toContain("kinetic = true");
    expect(lockup).toContain("brand-lockup-kinetic");
  });

  it("exposes an opt-in kinetic prop on the inline mark", () => {
    const inline = read("components/brand/logo-mark-inline.tsx");
    expect(inline).toContain("kinetic");
    expect(inline).toContain("logo-mark-kinetic");
  });

  it("ships a favicon variant that reads at small sizes", () => {
    expect(existsSync(resolve(webRoot, "public/favicon.svg"))).toBe(true);
  });

  it("never autoplays audio in the brand components", () => {
    const lockup = read("components/brand/brand-lockup.tsx");
    const inline = read("components/brand/logo-mark-inline.tsx");
    expect(lockup.toLowerCase()).not.toContain("autoplay");
    expect(inline.toLowerCase()).not.toContain("autoplay");
  });
});
