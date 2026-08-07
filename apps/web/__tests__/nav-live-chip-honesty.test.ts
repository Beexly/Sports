import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Nav Live Board chip honesty — source-level invariant.
 *
 * Production previously always rendered a green "Live Board" chip while
 * LIVE_BOARD and canExposePublicPicks were founder-gated closed. That is a
 * public trust lie. The chip must be conditional on both gates.
 */
const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("Nav Live Board chip honesty", () => {
  it("imports getReadinessGates and checks LIVE_BOARD", () => {
    const src = read("components/ui/nav.tsx");
    expect(src).toMatch(/getReadinessGates/);
    expect(src).toMatch(/LIVE_BOARD/);
    expect(src).toMatch(/canExposePublicPicks/);
  });

  it("does not unconditionally render live-chip", () => {
    const src = read("components/ui/nav.tsx");
    // Bare always-on chip is banned.
    expect(src).not.toMatch(
      /nav-right">\s*<span className="live-chip">\s*<span className="dot" \/>\s*Live Board/,
    );
    // Conditional render required.
    expect(src).toMatch(/showLiveBoard\s*\?\s*\(/);
    expect(src).toMatch(/shouldShowLiveBoardChip/);
  });

  it("gates the chip on LIVE_BOARD env AND canExposePublicPicks", () => {
    const src = read("components/ui/nav.tsx");
    expect(src).toMatch(/isEnvTrue\("LIVE_BOARD"\)/);
    expect(src).toMatch(/canExposePublicPicks/);
  });
});
