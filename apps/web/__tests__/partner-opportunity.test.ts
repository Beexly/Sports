import { describe, expect, it } from "vitest";
import type { RevenueOffer, RevenuePartner } from "@/lib/revenue";
import { auditRevenueSurface, evaluatePartnerOpportunity } from "@/lib/revenue";

const partner: RevenuePartner = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "creator_tool",
  disclosureRequired: true,
  displayName: "Creator Tool",
  id: "creator_tool",
};

const offer: RevenueOffer = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "creator_tool",
  disclosureText: "Affiliate disclosure: GSE may earn a commission.",
  id: "creator_offer",
  partnerId: partner.id,
  publicName: "Creator tool review",
  riskClass: "low",
};

const highRiskOffer: RevenueOffer = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "dfs",
  disclosureText: "Sponsored disclosure: GSE may receive compensation.",
  eligibleStates: ["NJ"],
  id: "dfs_offer",
  minimumAge: 21,
  partnerId: "dfs_partner",
  publicName: "DFS offer",
  responsibleGamingText: "Must be 21+. If gambling is a problem, seek help through local support resources.",
  riskClass: "high",
  termsUrl: "https://partner.example/terms",
};

const highRiskPartner: RevenuePartner = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "dfs",
  disclosureRequired: true,
  displayName: "DFS Partner",
  id: "dfs_partner",
};

describe("partner opportunity decisions", () => {
  it("pursues approved low-risk partners with approved offers", () => {
    const result = evaluatePartnerOpportunity({
      offers: [offer],
      partner,
      surface: "newsletter",
    });

    expect(result.decision).toBe("PURSUE");
  });

  it("sends high-risk offers to review when state is unknown", () => {
    const result = evaluatePartnerOpportunity({
      offers: [highRiskOffer],
      partner: highRiskPartner,
      surface: "newsletter",
    });

    expect(result.decision).toBe("REVIEW_FIRST");
    expect(result.reasons.join(" ")).toContain("High-risk offer requires review");
  });

  it("rejects rejected or suspended partners", () => {
    const result = evaluatePartnerOpportunity({
      offers: [offer],
      partner: { ...partner, approvalStatus: "rejected" },
      surface: "newsletter",
    });

    expect(result.decision).toBe("REJECT");
  });

  it("audits a revenue surface with approved and blocked offers", () => {
    const summary = auditRevenueSurface({
      offers: [offer, { ...offer, approvalStatus: "unreviewed", id: "blocked_offer" }],
      partners: [partner],
      surface: "newsletter",
    });

    expect(summary.approvedOfferCount).toBe(1);
    expect(summary.blockedOfferCount).toBe(1);
    expect(summary.blockers.join(" ")).toContain("OFFER_NOT_APPROVED");
  });
});
