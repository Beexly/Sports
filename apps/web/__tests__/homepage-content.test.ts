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
const lower = source.toLowerCase();

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
    // Concise home: door stats degrade to honest copy ("Gate holding",
    // "Intake warming up", "Calibration sample building") when counts are zero,
    // never to fabricated rows.
    expect(source).toMatch(/loadBoardState/);
    expect(source).toMatch(/loadPublicCalibrationReport/);
    expect(source).toMatch(/loadNflverseUsagePulse/);
    expect(source).toContain("Gate holding");
    expect(source).toContain("Intake warming up");
    expect(source).toContain("Calibration sample building");
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
