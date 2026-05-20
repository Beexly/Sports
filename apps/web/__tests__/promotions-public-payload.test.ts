import { describe, it, expect } from "vitest";
import {
  toPublicPromotion,
  buildPublicPromotionsResponse,
} from "@/lib/promotions/public-payload";
import type { Promotion } from "@prisma/client";

const TS_NOW = new Date("2026-05-18T12:00:00Z");

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo_1",
    slug: "test-1",
    sportsbookKey: "draftkings",
    operatorName: "DraftKings",
    headline: "Bonus bet match up to $200",
    offerSummary: "Deposit and place a wager to qualify.",
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
    disclosureText: "Affiliate disclosure.",
    responsibleGamingText: "Gambling problem? 1-800-GAMBLER.",
    lastReviewedAt: TS_NOW,
    reviewedBy: "manual:operator",
    expiresAt: new Date("2026-12-31T23:59:59Z"),
    createdAt: TS_NOW,
    updatedAt: TS_NOW,
    ...overrides,
  } as Promotion;
}

describe("public payload builder", () => {
  it("returns the public promotion when all gates pass", () => {
    const p = toPublicPromotion(makePromotion(), { now: TS_NOW });
    expect(p).not.toBeNull();
    expect(p?.termsUrl).toBe("https://example.com/terms");
    expect(p?.disclosureText).toContain("Affiliate disclosure");
    expect(p?.eligibleStates).toEqual(["NJ", "NY"]);
  });

  it("returns null when promotion fails any gate", () => {
    expect(
      toPublicPromotion(makePromotion({ termsUrl: null }), { now: TS_NOW })
    ).toBeNull();
    expect(
      toPublicPromotion(makePromotion({ status: "BLOCKED" }), { now: TS_NOW })
    ).toBeNull();
    expect(
      toPublicPromotion(makePromotion({ disclosureText: null }), { now: TS_NOW })
    ).toBeNull();
  });

  it("filters out non-publishable rows in the response builder", () => {
    const rows = [
      makePromotion({ id: "ok-1" }),
      makePromotion({ id: "blocked", termsUrl: null }),
      makePromotion({
        id: "expired",
        expiresAt: new Date("2025-01-01T00:00:00Z"),
      }),
    ];
    const resp = buildPublicPromotionsResponse(rows, { now: TS_NOW });
    expect(resp.meta.total).toBe(3);
    expect(resp.meta.filteredCount).toBe(1);
    expect(resp.data[0]!.id).toBe("ok-1");
    expect(resp.meta.notice.toLowerCase()).toContain("21+");
  });

  it("filters by state when one is provided", () => {
    const resp = buildPublicPromotionsResponse(
      [makePromotion({ id: "nj-only", eligibleStates: ["NJ"] })],
      { now: TS_NOW, state: "WA" }
    );
    expect(resp.data).toHaveLength(0);
  });

  it("response includes a state echo when provided", () => {
    const resp = buildPublicPromotionsResponse(
      [makePromotion({ id: "ok" })],
      { now: TS_NOW, state: "NJ" }
    );
    expect(resp.meta.state).toBe("NJ");
  });
});
