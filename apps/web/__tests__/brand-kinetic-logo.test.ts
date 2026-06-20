import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Kinetic logo guard.
 *
 * The 2026 brand requires the mark to be a kinetic signature — a sub-1s
 * draw-on that resolves the orbit, vectors, core, ping and wordmark — and
 * to be FULLY disabled under prefers-reduced-motion. These are the contracts
 * that keep the signature recognizable, accessible, and silent-by-default.
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

  it("drives the lockup mark + wordmark from the kinetic modifier", () => {
    expect(css).toContain(".brand-lockup-kinetic .brand-mark-orbit");
    expect(css).toContain(".brand-lockup-kinetic .brand-mark-vector");
    expect(css).toContain(".brand-lockup-kinetic .brand-wordmark");
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
