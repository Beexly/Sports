import { describe, expect, it } from "vitest";
import type { RevenueOffer, RevenuePartner } from "./partner-types";
import { evaluateOfferEligibility } from "./offer-eligibility";

const NOW = new Date("2026-07-04T12:00:00Z");

const partner: RevenuePartner = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  approvedAt: "2026-07-01T00:00:00Z",
  category: "creator_tool",
  disclosureRequired: true,
  displayName: "Builder Tool Co",
  expiresAt: "2026-12-31T23:59:59Z",
  id: "partner_builder_tool",
};

const offer: RevenueOffer = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  approvedAt: "2026-07-01T00:00:00Z",
  category: "creator_tool",
  disclosureText: "Affiliate disclosure: GSE may earn a commission from this partner.",
  expiresAt: "2026-12-31T23:59:59Z",
  id: "offer_builder_tool",
  partnerId: partner.id,
  publicName: "Workflow review",
  riskClass: "low",
};

describe("evaluateOfferEligibility disclosure vs surface separation", () => {
  it("does not emit a spurious MISSING_DISCLOSURE when only the surface is disallowed and disclosure is valid", () => {
    const decision = evaluateOfferEligibility({
      now: NOW,
      offer, // allowed on newsletter only, valid disclosure text present
      partner, // allowed on newsletter only
      surface: "youtube", // mismatch
    });

    const codes = decision.blockers.map((b) => b.code);
    expect(codes).toContain("SURFACE_NOT_ALLOWED");
    expect(codes).not.toContain("MISSING_DISCLOSURE");
    expect(decision.ok).toBe(false);
    // The reported blocker must not carry surface wording under a disclosure code.
    for (const b of decision.blockers) {
      if (b.code === "MISSING_DISCLOSURE") {
        expect(b.message).not.toContain("is not approved for");
      }
    }
  });

  it("still fails closed with MISSING_DISCLOSURE when disclosure text is genuinely absent", () => {
    const decision = evaluateOfferEligibility({
      now: NOW,
      offer: { ...offer, disclosureText: undefined },
      partner,
      surface: "newsletter", // valid surface, so only disclosure is the problem
    });

    const codes = decision.blockers.map((b) => b.code);
    expect(codes).toContain("MISSING_DISCLOSURE");
    expect(codes).not.toContain("SURFACE_NOT_ALLOWED");
    expect(decision.ok).toBe(false);
  });

  it("reports both blockers when disclosure is missing AND the surface is disallowed", () => {
    const decision = evaluateOfferEligibility({
      now: NOW,
      offer: { ...offer, disclosureText: undefined },
      partner,
      surface: "youtube",
    });

    const codes = decision.blockers.map((b) => b.code);
    expect(codes).toContain("SURFACE_NOT_ALLOWED");
    expect(codes).toContain("MISSING_DISCLOSURE");
  });

  it("allows a valid low-risk offer on an approved surface", () => {
    const decision = evaluateOfferEligibility({
      now: NOW,
      offer,
      partner,
      surface: "newsletter",
    });

    expect(decision.ok).toBe(true);
    expect(decision.blockers).toEqual([]);
  });
});
