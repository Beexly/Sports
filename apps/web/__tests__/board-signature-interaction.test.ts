import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Signature interaction contract.
 *
 * The /board hero carries the brand's signature "command constellation"
 * (ConstellationField). This guard locks two things so a future refactor can't
 * silently regress them:
 *   1. The constellation stays mounted on /board.
 *   2. The component keeps its non-negotiable safety invariants — it must never
 *      become an a11y or performance liability: aria-hidden + pointer-events-none,
 *      a prefers-reduced-motion path that renders a single static frame (no loop),
 *      a hard particle cap, DPR cap, and an offscreen pause. These are what make a
 *      decorative Canvas animation safe to ship on a public revenue-adjacent page.
 *
 * Source-level only — no DOM/canvas runtime needed.
 */

const webRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("board signature interaction — ConstellationField", () => {
  const board = read("app/board/page.tsx");
  const field = read("components/motion/constellation-field.tsx");

  it("/board imports and mounts the ConstellationField in its hero", () => {
    expect(board).toMatch(
      /import\s*\{\s*ConstellationField\s*\}\s*from\s*"@\/components\/motion\/constellation-field"/,
    );
    expect(board).toMatch(/<ConstellationField\b/);
  });

  it("is decorative — never in the a11y tree or pointer path", () => {
    expect(field).toMatch(/aria-hidden="true"/);
    expect(field).toMatch(/pointer-events-none/);
  });

  it("honors prefers-reduced-motion with a single static frame (no loop)", () => {
    expect(field).toMatch(/prefers-reduced-motion/);
    // The reduce branch renders once and returns before wiring the rAF loop.
    expect(field).toMatch(/if\s*\(\s*reduce\s*\)\s*\{[\s\S]*?render\(\);[\s\S]*?return/);
  });

  it("is perf-budgeted: hard particle cap, DPR cap, offscreen + hidden-tab pause", () => {
    // Particle count hard-capped (Math.min(90, …)).
    expect(field).toMatch(/Math\.min\(\s*90\s*,/);
    // devicePixelRatio capped at 2.
    expect(field).toMatch(/Math\.min\(\s*2\s*,\s*window\.devicePixelRatio/);
    // Loop pauses when scrolled offscreen and when the tab is hidden.
    expect(field).toMatch(/IntersectionObserver/);
    expect(field).toMatch(/visibilitychange/);
    expect(field).toMatch(/cancelAnimationFrame/);
  });

  it("is dependency-free (pure Canvas 2D — only react imported)", () => {
    const imports = field.match(/^import .*$/gm) ?? [];
    for (const line of imports) {
      expect(line, `unexpected import in ConstellationField: ${line}`).toMatch(
        /from\s*"react"/,
      );
    }
  });
});
