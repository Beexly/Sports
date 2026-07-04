import { describe, expect, it } from "vitest";
import type { RevenueOffer, RevenuePartner } from "@/lib/revenue";
import { evaluateOfferEligibility, reviewDisclosure, reviewResponsibleGaming } from "@/lib/revenue";

const NOW = new Date("2026-07-04T12:00:00Z");

const approvedPartner: RevenuePartner = {
  allowedSurfaces: ["media_kit", "newsletter", "youtube"],
  approvalStatus: "approved",
  approvedAt: "2026-07-01T00:00:00Z",
  category: "creator_tool",
  disclosureRequired: true,
  displayName: "Builder Tool Co",
  expiresAt: "2026-12-31T23:59:59Z",
  id: "partner_builder_tool",
};

const approvedOffer: RevenueOffer = {
  allowedSurfaces: ["newsletter", "youtube"],
  approvalStatus: "approved",
  approvedAt: "2026-07-01T00:00:00Z",
  category: "creator_tool",
  disclosureText: "Affiliate disclosure: GSE may earn a commission from this partner.",
  expiresAt: "2026-12-31T23:59:59Z",
  id: "offer_builder_tool",
  partnerId: approvedPartner.id,
  publicName: "Workflow review",
  riskClass: "low",
};

const regulatedPartner: RevenuePartner = {
  ...approvedPartner,
  allowedSurfaces: ["newsletter"],
  category: "sportsbook",
  displayName: "Regulated Book",
  id: "partner_regulated_book",
};

const regulatedOffer: RevenueOffer = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  approvedAt: "2026-07-01T00:00:00Z",
  category: "sportsbook",
  disclosureText: "Sponsored disclosure: GSE may receive compensation from this partner.",
  eligibleStates: ["NJ", "NY"],
  expiresAt: "2026-12-31T23:59:59Z",
  id: "offer_regulated",
  minimumAge: 21,
  partnerId: regulatedPartner.id,
  publicName: "Regulated offer review",
  responsibleGamingText: "Must be 21+. If gambling is a problem, seek help through local support resources.",
  restrictedStates: ["WA"],
  riskClass: "high",
  termsUrl: "https://partner.example/terms",
};

describe("affiliate and offer compliance", () => {
  it("allows a low-risk approved partner and approved offer on an approved surface", () => {
    const decision = evaluateOfferEligibility({
      now: NOW,
      offer: approvedOffer,
      partner: approvedPartner,
      surface: "newsletter",
    });

    expect(decision.ok).toBe(true);
    expect(decision.blockers).toEqual([]);
  });

  it("keeps partner approval and offer approval separate", () => {
    const unapprovedOffer = { ...approvedOffer, approvalStatus: "unreviewed" as const };
    const unapprovedPartner = { ...approvedPartner, approvalStatus: "unreviewed" as const };

    expect(
      evaluateOfferEligibility({ now: NOW, offer: unapprovedOffer, partner: approvedPartner, surface: "newsletter" }).blockers.map(
        (blocker) => blocker.code,
      ),
    ).toContain("OFFER_NOT_APPROVED");
    expect(
      evaluateOfferEligibility({ now: NOW, offer: approvedOffer, partner: unapprovedPartner, surface: "newsletter" }).blockers.map(
        (blocker) => blocker.code,
      ),
    ).toContain("PARTNER_NOT_APPROVED");
  });

  it("fails closed for high-risk offers when user state is unknown", () => {
    const decision = evaluateOfferEligibility({
      now: NOW,
      offer: regulatedOffer,
      partner: regulatedPartner,
      surface: "newsletter",
    });

    expect(decision.ok).toBe(false);
    expect(decision.highRisk).toBe(true);
    expect(decision.blockers.map((blocker) => blocker.code)).toContain("UNKNOWN_STATE");
  });

  it("allows a high-risk offer only when all metadata and state rules pass", () => {
    const decision = evaluateOfferEligibility({
      now: NOW,
      offer: regulatedOffer,
      partner: regulatedPartner,
      surface: "newsletter",
      userState: "NJ",
    });

    expect(decision.ok).toBe(true);
  });

  it("blocks restricted states and expired approvals", () => {
    expect(
      evaluateOfferEligibility({
        now: NOW,
        offer: regulatedOffer,
        partner: regulatedPartner,
        surface: "newsletter",
        userState: "WA",
      }).blockers.map((blocker) => blocker.code),
    ).toContain("STATE_RESTRICTED");

    expect(
      evaluateOfferEligibility({
        now: NOW,
        offer: { ...approvedOffer, expiresAt: "2026-01-01T00:00:00Z" },
        partner: approvedPartner,
        surface: "newsletter",
      }).blockers.map((blocker) => blocker.code),
    ).toContain("OFFER_EXPIRED");
  });

  it("requires disclosure for partner and offer placements", () => {
    const review = reviewDisclosure({
      offer: { ...approvedOffer, disclosureText: undefined },
      partner: approvedPartner,
      surface: "newsletter",
    });

    expect(review.required).toBe(true);
    expect(review.ok).toBe(false);
  });

  it("requires responsible gaming metadata for regulated offers", () => {
    const review = reviewResponsibleGaming({
      offer: { ...regulatedOffer, responsibleGamingText: undefined },
      userState: "NJ",
    });

    expect(review.required).toBe(true);
    expect(review.ok).toBe(false);
    expect(review.reasons.join(" ")).toContain("Responsible-gaming text");
  });
});
