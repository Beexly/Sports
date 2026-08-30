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

// P16-03: auth-dependent nav-right (including the live-chip logic) moved to
// nav-auth.tsx alongside NavAuth / NavAuthFallback.
const NAV_AUTH_SRC = read("components/ui/nav-auth.tsx");

describe("Nav Live Board chip honesty", () => {
  it("imports getReadinessGates and checks LIVE_BOARD", () => {
    expect(NAV_AUTH_SRC).toMatch(/getReadinessGates/);
    expect(NAV_AUTH_SRC).toMatch(/LIVE_BOARD/);
    expect(NAV_AUTH_SRC).toMatch(/canExposePublicPicks/);
  });

  it("does not unconditionally render live-chip", () => {
    // Bare always-on chip is banned.
    expect(NAV_AUTH_SRC).not.toMatch(
      /nav-right">\s*<span className="live-chip">\s*<span className="dot" \/>\s*Live Board/,
    );
    // Conditional render required.
    expect(NAV_AUTH_SRC).toMatch(/showLiveBoard\s*\?\s*\(/);
    expect(NAV_AUTH_SRC).toMatch(/shouldShowLiveBoardChip/);
  });

  it("gates the chip on LIVE_BOARD env AND canExposePublicPicks", () => {
    expect(NAV_AUTH_SRC).toMatch(/isEnvTrue\("LIVE_BOARD"\)/);
    expect(NAV_AUTH_SRC).toMatch(/canExposePublicPicks/);
  });
});
