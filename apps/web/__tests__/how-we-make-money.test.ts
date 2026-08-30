import { describe, expect, it, beforeAll } from "vitest";
import { BANNED_ANALYST_PHRASES } from "@/lib/voice/analyst-standard";

/**
 * /how-we-make-money — the trust layer required before any affiliate
 * partner link can go live (founder ruling 2026-07-16, disclosed-conflict
 * model). This page must stay calm and factual:
 *   - no invented numbers (everything real lives on /performance, /clv,
 *     /accountability and is linked, not restated),
 *   - no partner names (the operator registry has zero APPROVED_PARTNER
 *     rows today),
 *   - no absolute claim that ties revenue to pick correctness,
 *   - wired into the footer nav and sitemap like its sibling trust pages.
 */

// Phrases the trust-gate guardrail (scripts/guardrails/trust-gate.mjs) bans
// on public copy. Mirrored here (not imported — trust-gate is a standalone
// .mjs script, not a module) so a violation on this specific page fails
// fast and locally, in addition to the repo-wide guardrail.
const TRUST_GATE_BANNED_PHRASES = [
  "guaranteed",
  "sure thing",
  "risk-free",
  "risk free",
  "riskless",
  "easy money",
  "free money",
  "can't lose",
  "cant lose",
  "verified track record",
  "thousands of bettors",
  "trusted by serious bettors",
  "guaranteed profit",
  "guaranteed roi",
  "guaranteed winner",
  "lock of the day",
  "automatic winner",
  "beat the book",
  "insider information",
  "profitable system",
  "no risk",
  "100% chance",
];

// A short list of real operator names/domains that must never appear on this
// page while the operator registry has zero APPROVED_PARTNER rows — this
// page describes policy, not a current partner list.
const OPERATOR_NAMES = [
  "draftkings",
  "fanduel",
  "betmgm",
  "caesars",
  "betrivers",
  "fanatics",
  "espn bet",
  "bet365",
];

// The absolute claim style the founder ruling explicitly retired: framing
// revenue as proof the picks are unbiased/correct. A disclosed conflict is
// still a conflict; the page must not imply otherwise.
const ABSOLUTE_CLAIM_PATTERNS = [
  /only when our number is right/i,
  /only earn(s)? when (we're|we are) right/i,
  /we only (make money|profit|earn) if (we're|we are|our) right/i,
];

describe("/how-we-make-money page source pins", () => {
  let pageSource: string;

  beforeAll(async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    pageSource = await fs.readFile(
      path.resolve(__dirname, "../app/how-we-make-money/page.tsx"),
      "utf-8"
    );
  });

  it("has canonical metadata pointing to /how-we-make-money", () => {
    expect(pageSource).toContain('canonical: "/how-we-make-money"');
  });

  it("does not contain any BANNED_ANALYST_PHRASES", () => {
    const lowerSource = pageSource.toLowerCase();
    for (const banned of BANNED_ANALYST_PHRASES) {
      expect(
        lowerSource,
        `how-we-make-money page must not contain banned phrase: "${banned}"`
      ).not.toContain(banned.toLowerCase());
    }
  });

  it("does not contain any trust-gate banned phrases", () => {
    const lowerSource = pageSource.toLowerCase();
    for (const banned of TRUST_GATE_BANNED_PHRASES) {
      expect(
        lowerSource,
        `how-we-make-money page must not contain trust-gate banned phrase: "${banned}"`
      ).not.toContain(banned.toLowerCase());
    }
  });

  it("does not name any real sportsbook operator (zero APPROVED_PARTNER rows today)", () => {
    const lowerSource = pageSource.toLowerCase();
    for (const name of OPERATOR_NAMES) {
      expect(
        lowerSource,
        `how-we-make-money page must not name operator "${name}" while the registry has zero approved partners`
      ).not.toContain(name);
    }
  });

  it("does not retire the disclosed conflict with an absolute correctness claim", () => {
    for (const pattern of ABSOLUTE_CLAIM_PATTERNS) {
      expect(pageSource).not.toMatch(pattern);
    }
  });

  it("does not fabricate stats (no hardcoded win-rate/percentage numbers)", () => {
    expect(pageSource).not.toMatch(/\b\d{1,3}(\.\d+)?%/);
  });

  it("states subscriptions are the primary revenue source", () => {
    expect(pageSource.toLowerCase()).toMatch(/subscription/);
    expect(pageSource.toLowerCase()).toMatch(/primary/);
  });

  it("describes commissions as never influencing picks", () => {
    expect(pageSource.toLowerCase()).toMatch(/commission/);
    expect(pageSource.toLowerCase()).toMatch(/never influence/);
  });

  it("references the machine-checked structural-separation guardrail", () => {
    expect(pageSource.toLowerCase()).toMatch(/automated check/);
    expect(pageSource.toLowerCase()).toMatch(/fail(s|ing)? the build/);
  });

  it("links to /performance, /clv, and /accountability rather than restating numbers", () => {
    expect(pageSource).toContain('href="/performance"');
    expect(pageSource).toContain('href="/clv"');
    expect(pageSource).toContain('href="/accountability"');
  });

  it("links to /pricing and /responsible-play from the closing CTA", () => {
    expect(pageSource).toContain('href="/pricing"');
    expect(pageSource).toContain('href="/responsible-play"');
  });
});

describe("sitemap includes /how-we-make-money", () => {
  it("sitemap.ts has a /how-we-make-money route entry", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const sitemapSource = await fs.readFile(
      path.resolve(__dirname, "../app/sitemap.ts"),
      "utf-8"
    );
    expect(sitemapSource).toContain('"/how-we-make-money"');
  });
});

describe("footer includes /how-we-make-money link", () => {
  it("footer.tsx has a How We Make Money link in COMPANY_LINKS", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const footerSource = await fs.readFile(
      path.resolve(__dirname, "../components/ui/footer.tsx"),
      "utf-8"
    );
    expect(footerSource).toContain('href: "/how-we-make-money"');
    expect(footerSource).toContain('"How We Make Money"');
  });
});
