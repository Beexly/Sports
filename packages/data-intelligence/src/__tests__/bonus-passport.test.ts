/**
 * BONUS / OFFER INTEGRITY — tests.
 *
 * Proves the compliance gates: no affiliate link without owner config, no "current" offer without
 * verification, no "legal" without a verified jurisdiction, a responsible-gaming disclaimer always, no
 * "risk-free" without a caveat, no bookmaker rating without a stated methodology, and GSE never operates
 * betting.
 */

import { describe, it, expect } from "vitest";
import {
  buildBonusPassport,
  buildAllBonusPassports,
  bonusDisplay,
  buildBookmakerRating,
  GSE_BETTING_POSTURE,
  type BonusInput,
} from "../bonus-passport.js";

const verified: BonusInput = {
  offerId: "o", bookmaker: "Book", jurisdiction: "US-NJ", bonusType: "welcome", headline: "Deposit match up to $100 (fixture)",
  minDeposit: 10, rolloverRequirement: "1x", affiliateUrl: "https://example.invalid/a", affiliateConfigured: false,
  lastVerifiedAt: "2026-06-26", legalityStatus: "VERIFIED_LEGAL",
};

describe("Affiliate links are owner-gated", () => {
  it("no affiliate link is surfaced unless affiliateConfigured is true", () => {
    const off = buildBonusPassport(verified);
    expect(off.affiliateUrl).toBeNull();
    expect(bonusDisplay(off).affiliateUrl).toBeNull();
    const on = buildBonusPassport({ ...verified, affiliateConfigured: true });
    expect(on.affiliateUrl).toBe("https://example.invalid/a");
    expect(bonusDisplay(on).affiliateDisclosure).toContain("Affiliate");
  });
});

describe("Verification gating", () => {
  it("no lastVerifiedAt → cannot display as current", () => {
    const p = buildBonusPassport({ ...verified, lastVerifiedAt: null });
    expect(p.displayAllowed).toBe(false);
    expect(p.displayBlockedReasons.join(" ")).toMatch(/not verified/i);
    expect(bonusDisplay(p).canShow).toBe(false);
    expect(bonusDisplay(p).headline).toBeNull();
  });
  it("unverified jurisdiction → not displayable + honest legality label", () => {
    const p = buildBonusPassport({ ...verified, legalityStatus: "UNVERIFIED" });
    expect(p.displayAllowed).toBe(false);
    expect(p.legalityLabel).toMatch(/not verified/i);
  });
});

describe("Responsible gaming + known fields", () => {
  it("a disclaimer is always present and RG is required", () => {
    for (const p of buildAllBonusPassports()) {
      expect(p.disclaimer.length).toBeGreaterThan(0);
      expect(p.responsibleGamingRequired).toBe(true);
    }
  });
  it("rollover and min deposit are displayed when known", () => {
    const d = bonusDisplay(buildBonusPassport(verified));
    expect(d.rollover).toBe("1x");
    expect(d.minDeposit).toBe(10);
    expect(d.verifyNote).toMatch(/verify all terms/i);
  });
});

describe('"risk-free" requires an explaining caveat', () => {
  it("risk-free headline without a caveat is blocked", () => {
    const p = buildBonusPassport({ ...verified, headline: "Risk-free first bet" });
    expect(p.displayAllowed).toBe(false);
    expect(p.displayBlockedReasons.join(" ")).toMatch(/no-loss|caveat/i);
  });
  it("risk-free with an explaining caveat is allowed", () => {
    const p = buildBonusPassport({ ...verified, headline: "Risk-free first bet", riskNotes: "Net-loss refunded as a non-withdrawable bonus bet; terms apply." });
    expect(p.displayAllowed).toBe(true);
  });
});

describe("Bookmaker ratings require a methodology", () => {
  it("no methodology → rating not displayable (no naked 'best')", () => {
    const r = buildBookmakerRating({ bookmaker: "Book", jurisdiction: "US-NJ", licenseStatus: "licensed", bonusQuality: 80, oddsQuality: 75, ratingMethodology: null, lastVerifiedAt: "2026-06-26" });
    expect(r.ratingDisplayable).toBe(false);
    expect(r.displayBlockedReasons.join(" ")).toMatch(/methodology/i);
  });
  it("with methodology + verification → displayable", () => {
    const r = buildBookmakerRating({ bookmaker: "Book", jurisdiction: "US-NJ", licenseStatus: "licensed", bonusQuality: 80, oddsQuality: 75, ratingMethodology: "Weighted: odds 40% / payout speed 30% / bonus terms 30%.", lastVerifiedAt: "2026-06-26" });
    expect(r.ratingDisplayable).toBe(true);
  });
});

describe("GSE never operates betting", () => {
  it("the posture is asserted in code", () => {
    expect(GSE_BETTING_POSTURE.operatesBetting).toBe(false);
    expect(GSE_BETTING_POSTURE.takesWagers).toBe(false);
  });
});
