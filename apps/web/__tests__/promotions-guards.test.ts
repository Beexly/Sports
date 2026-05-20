import { describe, it, expect } from "vitest";
import {
  evaluatePromotionForPublish,
  isPromotionPublishable,
  parseStateList,
  type PromotionBlocker,
} from "@/lib/promotions/guards";
import type { Promotion } from "@prisma/client";

const TS_NOW = new Date("2026-05-18T12:00:00Z");

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  const base: Promotion = {
    id: "promo_test",
    slug: "test-promo",
    sportsbookKey: "draftkings",
    operatorName: "DraftKings",
    headline: "Bonus bet up to $200 on first deposit",
    offerSummary: "Deposit and place a wager to qualify for a bonus bet match.",
    offerCategory: "DEPOSIT_MATCH" as Promotion["offerCategory"],
    affiliateType: "CPA" as Promotion["affiliateType"],
    affiliateUrl: "https://example.com/aff",
    termsUrl: "https://example.com/terms",
    promoCode: null,
    eligibleStates: ["NJ", "NY"],
    restrictedStates: [],
    country: "US",
    minimumAge: 21,
    status: "ACTIVE" as Promotion["status"],
    complianceStatus: "APPROVED" as Promotion["complianceStatus"],
    disclosureText:
      "Sponsored content. We may earn a commission when you sign up via this link.",
    responsibleGamingText:
      "Gambling problem? Call 1-800-GAMBLER. Must be 21+ in eligible states.",
    lastReviewedAt: TS_NOW,
    reviewedBy: "manual:operator",
    expiresAt: new Date("2026-12-31T23:59:59Z"),
    createdAt: TS_NOW,
    updatedAt: TS_NOW,
  } as Promotion;
  return { ...base, ...overrides };
}

describe("promotion publish guard", () => {
  it("approves a fully-compliant promotion", () => {
    const verdict = evaluatePromotionForPublish(makePromotion(), { now: TS_NOW });
    expect(verdict.publishable).toBe(true);
    expect(verdict.blockers).toHaveLength(0);
  });

  it("blocks when disclosure text is missing", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ disclosureText: null }),
      { now: TS_NOW }
    );
    const codes = verdict.blockers.map((b: PromotionBlocker) => b.code);
    expect(verdict.publishable).toBe(false);
    expect(codes).toContain("MISSING_DISCLOSURE");
  });

  it("blocks when responsible-gaming text is missing", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ responsibleGamingText: null }),
      { now: TS_NOW }
    );
    expect(verdict.blockers.map((b) => b.code)).toContain("MISSING_RG_TEXT");
  });

  it("blocks when terms URL is missing", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ termsUrl: null }),
      { now: TS_NOW }
    );
    expect(verdict.blockers.map((b) => b.code)).toContain("MISSING_TERMS_URL");
  });

  it("hides expired promotions", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ expiresAt: new Date("2026-01-01T00:00:00Z") }),
      { now: TS_NOW }
    );
    expect(verdict.publishable).toBe(false);
    expect(verdict.blockers.map((b) => b.code)).toContain("EXPIRED");
  });

  it("hides BLOCKED promotions", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ status: "BLOCKED" as Promotion["status"] }),
      { now: TS_NOW }
    );
    expect(verdict.publishable).toBe(false);
    expect(verdict.blockers.map((b) => b.code)).toContain("STATUS_NOT_ACTIVE");
  });

  it("hides unreviewed promotions", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({
        complianceStatus: "UNREVIEWED" as Promotion["complianceStatus"],
      }),
      { now: TS_NOW }
    );
    expect(verdict.blockers.map((b) => b.code)).toContain(
      "COMPLIANCE_NOT_APPROVED"
    );
  });

  it("blocks when copy contains banned hype language", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({
        headline: "Risk-free wager guaranteed to win!",
      }),
      { now: TS_NOW }
    );
    expect(verdict.blockers.map((b) => b.code)).toContain(
      "BANNED_HYPE_LANGUAGE"
    );
  });

  it("blocks when state is restricted", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ restrictedStates: ["WA"] }),
      { now: TS_NOW, state: "WA" }
    );
    expect(verdict.blockers.map((b) => b.code)).toContain("RESTRICTED_IN_STATE");
  });

  it("blocks when no eligible states declared", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ eligibleStates: [] }),
      { now: TS_NOW }
    );
    expect(verdict.blockers.map((b) => b.code)).toContain("NO_ELIGIBLE_STATES");
  });

  it("rejects state codes that aren't in the allow list", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ eligibleStates: ["NJ"] }),
      { now: TS_NOW, state: "WA" }
    );
    expect(verdict.blockers.map((b) => b.code)).toContain("RESTRICTED_IN_STATE");
  });

  it("isPromotionPublishable matches the verdict", () => {
    const promo = makePromotion();
    expect(isPromotionPublishable(promo, { now: TS_NOW })).toBe(true);
    expect(
      isPromotionPublishable(makePromotion({ termsUrl: null }), { now: TS_NOW })
    ).toBe(false);
  });

  it("parseStateList accepts 2-letter uppercase US codes only", () => {
    expect(parseStateList(["NJ", "ny", "INVALID", 42, null])).toEqual(["NJ"]);
    expect(parseStateList(null)).toEqual([]);
    expect(parseStateList(undefined)).toEqual([]);
  });
});
