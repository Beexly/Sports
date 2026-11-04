import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Nav Live Board chip honesty  -  source-level invariant (sealed-era design).
 *
 * Production previously always rendered a green "Live Board" chip while
 * LIVE_BOARD and canExposePublicPicks were founder-gated closed. That is a
 * public trust lie. The chip is not rendered anywhere in the current nav at
 * all; the gate helper `shouldShowLiveBoardChip()` (LIVE_BOARD env AND
 * canExposePublicPicks readiness) is retained so any future chip must pass
 * it. What this suite pins:
 *
 *   1. The gate helper exists and is still gated on BOTH conditions.
 *   2. No unconditional ("Live Board") chip render exists in the nav tree.
 */
const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

// P16-03: auth-dependent nav-right (including the live-chip logic) moved to
// nav-auth.tsx alongside NavAuth / NavAuthFallback.
const NAV_AUTH_SRC = read("components/ui/nav-auth.tsx");
const NAV_SRC = read("components/ui/nav.tsx");
const MOBILE_NAV_SRC = read("components/ui/mobile-nav.tsx");

describe("Nav Live Board chip honesty", () => {
  it("imports getReadinessGates and checks LIVE_BOARD", () => {
    expect(NAV_AUTH_SRC).toMatch(/getReadinessGates/);
    expect(NAV_AUTH_SRC).toMatch(/LIVE_BOARD/);
    expect(NAV_AUTH_SRC).toMatch(/canExposePublicPicks/);
  });

  it("retains the gate helper, gated on LIVE_BOARD env AND canExposePublicPicks", () => {
    expect(NAV_AUTH_SRC).toMatch(/shouldShowLiveBoardChip/);
    expect(NAV_AUTH_SRC).toMatch(/isEnvTrue\("LIVE_BOARD"\)/);
    expect(NAV_AUTH_SRC).toMatch(/canExposePublicPicks/);
  });

  it("gates the chip on LIVE_BOARD env AND canExposePublicPicks", () => {
    expect(NAV_AUTH_SRC).toMatch(/isEnvTrue\("LIVE_BOARD"\)/);
    expect(NAV_AUTH_SRC).toMatch(/canExposePublicPicks/);
  });

  it("renders no Live Board chip anywhere in the nav tree", () => {
    // The sealed-era nav carries no live chip at all: /picks is a static
    // sealed card, so a "Live" chip would be the exact trust lie this suite
    // guards against. The gate helper above is the only permitted path.
    for (const [name, src] of [
      ["components/ui/nav-auth.tsx", NAV_AUTH_SRC],
      ["components/ui/nav.tsx", NAV_SRC],
      ["components/ui/mobile-nav.tsx", MOBILE_NAV_SRC],
    ] as const) {
      expect(
        src,
        `${name} must not contain live-chip markup`,
      ).not.toMatch(/live-chip/);
      expect(
        src,
        `${name} must not render an unconditional "Live Board" chip`,
      ).not.toMatch(/>\s*Live Board\s*</);
    }
  });
});
