import { describe, expect, it } from "vitest";
import type { RevenueOffer, RevenuePartner } from "@/lib/revenue";
import { scorePartnerRisk, scoreRevenuePartner } from "@/lib/revenue";

const localSponsor: RevenuePartner = {
  allowedSurfaces: ["media_kit"],
  approvalStatus: "approved",
  category: "local_sponsor",
  disclosureRequired: true,
  displayName: "Local Sponsor",
  id: "local_sponsor",
};

const sportsbook: RevenuePartner = {
  ...localSponsor,
  allowedSurfaces: ["newsletter"],
  category: "sportsbook",
  displayName: "Book Partner",
  id: "book_partner",
};

const highRiskOffer: RevenueOffer = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "sportsbook",
  disclosureText: "Sponsored disclosure.",
  id: "book_offer",
  partnerId: sportsbook.id,
  publicName: "Book offer",
  riskClass: "high",
};

describe("partner risk engine", () => {
  it("keeps low-risk approved local sponsors in a lower tier", () => {
    const result = scorePartnerRisk(localSponsor);

    expect(result.tier).toBe("LOW");
    expect(result.score).toBeLessThan(25);
  });

  it("raises risk for regulated categories and high-risk offers", () => {
    const result = scorePartnerRisk(sportsbook, [highRiskOffer]);

    expect(result.tier).toBe("HIGH");
    expect(result.reasons.join(" ")).toContain("regulated");
    expect(result.reasons.join(" ")).toContain("high-risk");
  });

  it("blocks suspended partners regardless of category", () => {
    const result = scorePartnerRisk({ ...localSponsor, approvalStatus: "suspended" });

    expect(result.tier).toBe("MEDIUM");
    expect(result.reasons).toContain("Partner is not approved.");
  });

  it("reuses media partner scoring without changing media-revenue logic", () => {
    const result = scoreRevenuePartner({
      audienceFit: 0.9,
      brandTrustFit: 0.9,
      category: "sports_data",
      complianceRisk: 0.2,
      contentFit: 0.9,
      productionEase: 0.8,
      revenuePotential: 0.85,
    });

    expect(result.score).toBeGreaterThan(65);
    expect(result.recommendedMotion).toBe("api_beta");
  });
});
