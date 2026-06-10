import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Homepage content invariants — Phase 2 Trust Cleanup + BA-B01/BA-B02
 *
 * These assertions enforce, at source-file level, the trust rules the
 * homepage is supposed to follow:
 *   - No fake FALLBACK_PICKS array.
 *   - No hard-coded TESTIMONIALS array.
 *   - No "Trusted by Serious Bettors" / "Thousands of bettors" copy.
 *   - The Methodology section is present.
 *   - The RiskDisclosure component is present.
 *   - An honest empty-state component is referenced for when picks are absent.
 *   - BA-B01: no hardcoded LEDGER of fake W/L/PUSH settlements — the ledger
 *     preview is driven by the same canonical settled-pick query as /ledger,
 *     with the honest "Building ledger history" state when nothing settled.
 *   - BA-B02: no hardcoded calibration chart points — only real calibration
 *     buckets are plotted, with a COLLECTING eyebrow when gated/empty.
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

  it("renders an honest empty-picks state instead of fake fallbacks", () => {
    expect(source).toMatch(/\bEmptyPicksState\b/);
    expect(source).toMatch(/homepage-empty-picks-state/);
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

describe("Homepage — BA-B01 ledger preview is real, never fabricated", () => {
  it("does NOT define a hardcoded LEDGER constant", () => {
    expect(source).not.toMatch(/\bconst\s+LEDGER\b/);
    expect(source).not.toMatch(/\bLEDGER\.map\b/);
  });

  it("does NOT contain the legacy fake settlement rows", () => {
    expect(source).not.toContain("SEA -1.5");
    expect(source).not.toContain("ATL/NYM under");
    expect(source).not.toContain("LA moneyline");
    expect(source).not.toContain("CHI +4.5");
    expect(source).not.toContain("TOR total");
    expect(source).not.toContain("PHI -2.5");
    expect(source).not.toContain("Line movement led the factor mix");
  });

  it("does NOT claim 'Six recent settlements'", () => {
    expect(lower).not.toContain("six recent settlements");
  });

  it("loads ledger preview rows from the canonical settled-pick query", () => {
    // Same honesty filters as app/ledger/page.tsx: published, non-bootstrap,
    // settled results only, synthetic seed model excluded.
    expect(source).toMatch(/\bloadLedgerPreviewRows\b/);
    expect(source).toMatch(/isPublished:\s*true/);
    expect(source).toMatch(/isBootstrap:\s*false/);
    expect(source).toMatch(/result:\s*\{\s*in:\s*\["WIN",\s*"LOSS",\s*"PUSH"\]\s*\}/);
    expect(source).toMatch(/NOT:\s*\{\s*modelVersion:\s*"v5\.0\.0-seed"\s*\}/);
  });

  it("renders the honest empty state when zero picks have settled", () => {
    expect(source).toMatch(/ledger-preview-empty/);
    expect(source).toContain("Building ledger history");
    expect(source).toContain("No settled canonical picks are available yet.");
    expect(lower).toContain("no canonical settlements yet");
  });
});

describe("Homepage — BA-B02 calibration chart plots only real buckets", () => {
  it("does NOT define hardcoded chart points", () => {
    expect(source).not.toMatch(/\bconst\s+points\b/);
    expect(source).not.toContain("[20, 72]");
    expect(source).not.toContain("[42, 55]");
    expect(source).not.toContain("[64, 39]");
    expect(source).not.toContain("[84, 23]");
  });

  it("plots dots only from real calibration buckets with samples", () => {
    expect(source).toMatch(/calibration\.buckets\.filter\(\(bucket\)\s*=>\s*bucket\.sampleSize\s*>\s*0\)/);
    expect(source).toMatch(/calibration-bucket-point/);
    expect(source).toMatch(/bucket\.expectedWinRate/);
    expect(source).toMatch(/bucket\.observedWinRate/);
  });

  it("switches the eyebrow to COLLECTING when gated or empty", () => {
    expect(source).toMatch(/collecting\s*\?\s*"COLLECTING"\s*:\s*"LIVE CALIBRATION"/);
    expect(source).toMatch(/calibration\.isCollecting/);
  });

  it("keeps the honest sample-size line", () => {
    expect(source).toMatch(/Sample:\s*\$\{calibration\.sampleSize\}\s*canonical settled picks/);
  });
});
