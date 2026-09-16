import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Homepage content invariants — Phase 2 Trust Cleanup
 *
 * These assertions enforce, at source-file level, the trust rules the
 * homepage is supposed to follow:
 *   - No fake FALLBACK_PICKS array.
 *   - No hard-coded TESTIMONIALS array.
 *   - No "Trusted by Serious Bettors" / "Thousands of bettors" copy.
 *   - The Methodology section is present.
 *   - The RiskDisclosure component is present.
 *   - Honest empty-state copy is present for when public rows are absent.
 */

const source = readFileSync(
  resolve(__dirname, "..", "app", "page.tsx"),
  "utf8"
);
// The nflverse usage-pulse loader moved into the NflverseLabDoor component
// (P16-01, off the page's critical path via Suspense).
const labDoorSource = readFileSync(
  resolve(__dirname, "..", "components", "landing", "nflverse-lab-door.tsx"),
  "utf8"
);
const lower = source.toLowerCase();

/** Source with block and line comments removed — see the fallback test below. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("Homepage — Phase 2 trust invariants", () => {
  it("does NOT define a FALLBACK_PICKS array", () => {
    expect(source).not.toMatch(/\bFALLBACK_PICKS\b/);
  });

  it("does NOT define a TESTIMONIALS array", () => {
    expect(source).not.toMatch(/\bTESTIMONIALS\b/);
  });

  it("does NOT use 'Trusted by Serious Bettors' headline", () => {
    expect(lower).not.toContain("trusted by serious bettors");
  });

  it("does NOT use 'thousands of … bettors' copy", () => {
    expect(lower).not.toMatch(/thousands of[^.]*bettors/);
  });

  it("does NOT claim 'verified track record'", () => {
    expect(lower).not.toContain("verified track record");
  });

  it("does NOT use 'guaranteed' as a sports-outcome claim", () => {
    // Token-level guard. 'guarantee' (noun) is fine elsewhere; 'guaranteed' is the banned form.
    expect(source).not.toMatch(/\bguaranteed\b/);
  });

  it("renders the MethodologySection component", () => {
    expect(source).toMatch(/\bMethodologySection\b/);
    expect(source).toMatch(
      /from\s+["']@\/components\/ui\/methodology-section["']/
    );
  });

  it("uses the RiskDisclosure component on the public surface", () => {
    expect(source).toMatch(/\bRiskDisclosure\b/);
    expect(source).toMatch(
      /from\s+["']@\/components\/ui\/risk-disclosure["']/
    );
  });

  it("derives live numbers from real loaders, with honest fallbacks when empty", () => {
    // Door stats must degrade to honest copy when counts are zero, never to
    // fabricated rows.
    //
    // This assertion used to read `source.toContain("Gate holding")` and
    // `source.toContain("Intake warming up")` and it PASSED — off a COMMENT.
    // page.tsx:56 lists those two strings precisely to say the page must NOT
    // dress an outage in them, so the test was satisfied by the prohibition
    // against the very copy it claimed to require, and would have gone on
    // passing if every fallback on the page were deleted. "Intake warming up"
    // is real, but it lives in the lab-door component, not here.
    //
    // Comments are stripped first so that can never happen again.
    expect(source).toMatch(/loadBoardState/);
    expect(source).toMatch(/loadPublicCalibrationReport/);
    expect(labDoorSource).toMatch(/loadNflverseUsagePulse/);

    const pageCode = stripComments(source);
    const labCode = stripComments(labDoorSource);
    // Board door, zero counts: a quiet slate, stated as such.
    expect(pageCode).toContain("Quiet slate. Nothing forced.");
    // Board door, outage: says unavailable rather than showing a calm zero.
    expect(pageCode).toContain("Board temporarily unavailable");
    // Calibration, thin sample: names the gap.
    expect(pageCode).toContain("Calibration sample building");
    // Lab door, where the player fallbacks actually live.
    expect(labCode).toContain("Intake warming up");
    expect(labCode).toContain("Live player data unavailable");
  });

  it("does NOT define fake game objects with hard-coded teams", () => {
    // The legacy FALLBACK_PICKS referenced these fixed matchups. None should
    // appear anywhere in the file.
    expect(lower).not.toContain("baltimore ravens");
    expect(lower).not.toContain("kansas city chiefs");
    expect(lower).not.toContain("golden state warriors");
    expect(lower).not.toContain("boston celtics");
    expect(lower).not.toContain("houston astros");
    expect(lower).not.toContain("new york yankees");
  });
});
