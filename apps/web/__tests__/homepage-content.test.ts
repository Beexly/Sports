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
 *   - The methodology surface is reachable from the front door.
 *   - The RiskDisclosure component is present.
 *   - Every number comes from a real loader.
 *
 * REPOINTED, NOT SOFTENED (2026-11-03). The RedlineWorld rebuild replaced the
 * four-door FIELD home with a full-viewport cinematic field. Two assertions
 * named surfaces that the new composition no longer renders inline:
 *   - <MethodologySection /> moved from the homepage body to /methodology. The
 *     invariant is "the front door routes to the methodology surface", so the
 *     test now pins the link and the route's own component.
 *   - The board/calibration counters moved to /board and /calibration. The
 *     invariant is "no fabricated number reaches the front door", so the test
 *     now pins the loaders the homepage actually reads (packs + writeups) and
 *     asserts no hard-coded record literal appears in the field.
 * Every prohibition below is unchanged.
 */

const source = readFileSync(
  resolve(__dirname, "..", "app", "page.tsx"),
  "utf8"
);
const worldSource = readFileSync(
  resolve(__dirname, "..", "components", "redline", "redline-world.tsx"),
  "utf8"
);
// The nflverse usage-pulse loader lives in NflverseLabDoor, which is not on the
// homepage critical path.
const labDoorSource = readFileSync(
  resolve(__dirname, "..", "components", "landing", "nflverse-lab-door.tsx"),
  "utf8"
);
const methodologyRoute = readFileSync(
  resolve(__dirname, "..", "app", "methodology", "page.tsx"),
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

  it("routes the front door to the methodology surface", () => {
    // The link is emitted from a TRUST_LINKS map, so the source carries the
    // href value ("/methodology"), not a literal `href="/methodology"` string.
    expect(source).toMatch(/\/methodology/);
    // The surface itself still renders the component; the link is only honest
    // if the destination carries the content.
    expect(methodologyRoute).toMatch(/\bMethodologySection\b/);
    expect(methodologyRoute).toMatch(
      /from\s+["']@\/components\/ui\/methodology-section["']/
    );
  });

  it("uses the RiskDisclosure component on the public surface", () => {
    expect(source).toMatch(/\bRiskDisclosure\b/);
    expect(source).toMatch(
      /from\s+["']@\/components\/ui\/risk-disclosure["']/
    );
  });

  it("derives its content from real loaders, never from hard-coded rows", () => {
    // The field renders the live pack catalogue and the active writeups; it
    // carries no literal win/loss record of its own.
    expect(source).toMatch(/\borderPacksForStorefront\b/);
    expect(source).toMatch(/\bgetActiveUpcomingWriteups\b/);
    expect(source).toMatch(/\bLIVE_PACKAGE_CATALOG\b/);
    expect(labDoorSource).toMatch(/\bloadNflverseUsagePulse\b/);
    // No seniority/record literal may be baked into the field. The retracted
    // 31-11 banner and its VERIFIED RECORD label were removed on 2026-11-03;
    // the header now carries the settled TNF card (14-6-1, +7.19u), which the
    // packages page publishes as the cumulative season record.
    expect(worldSource).not.toContain("31-11");
    expect(worldSource).not.toContain("VERIFIED RECORD");
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
