import { describe, expect, it } from "vitest";

import {
  buildPartnerSponsorReviewFixturePackets,
  buildPartnerSponsorReviewFixtureReport,
  PARTNER_SPONSOR_REVIEW_FIXTURE_DEFINITIONS,
  reviewSponsorIndependence,
} from "@/lib/workflows/partner-sponsor-review-fixtures";

describe("partner and sponsor review fixtures", () => {
  it("builds local partner/sponsor packets with expected review outcomes", async () => {
    const packets = await buildPartnerSponsorReviewFixturePackets();

    expect(packets).toHaveLength(PARTNER_SPONSOR_REVIEW_FIXTURE_DEFINITIONS.length);
    expect(packets.every((packet) => packet.statusMatchesExpectation)).toBe(true);
    expect(packets.every((packet) => packet.workflowStatusMatchesExpectation)).toBe(true);
    expect(packets.filter((packet) => packet.reviewStatus === "READY_FOR_MANUAL_REVIEW").map((packet) => packet.fixtureId)).toEqual([
      "creator_tool_affiliate_manual_review",
      "board_meeting_sponsor_independence",
    ]);
    expect(packets.filter((packet) => packet.reviewStatus === "BLOCKED").map((packet) => packet.fixtureId)).toEqual([
      "sponsor_control_attempt_blocked",
      "regulated_unknown_state_blocked",
      "expired_offer_blocked",
      "unsafe_claim_copy_blocked",
    ]);
  });

  it("keeps every packet local-only with no publish, send, route, affiliate, or sponsor approval unlock", async () => {
    const packets = await buildPartnerSponsorReviewFixturePackets();

    for (const packet of packets) {
      expect(packet.liveActionLocks).toEqual({
        affiliateActivationAllowed: false,
        externalSendAllowed: false,
        liveIntegrationAllowed: false,
        publishAllowed: false,
        routeExposureAllowed: false,
        sponsorApprovalAutomatic: false,
      });
      expect(packet.packet.approvalIsAutomatic).toBe(false);
      expect(packet.packet.manualReviewRequired).toBe(true);
    }
  });

  it("allows low-risk affiliate and sponsor fixtures only to reach manual review", async () => {
    const packets = await buildPartnerSponsorReviewFixturePackets();
    const affiliate = packets.find((packet) => packet.fixtureId === "creator_tool_affiliate_manual_review");
    const sponsor = packets.find((packet) => packet.fixtureId === "board_meeting_sponsor_independence");

    expect(affiliate).toBeDefined();
    expect(affiliate?.eligibility.ok).toBe(true);
    expect(affiliate?.commercialCopy.ok).toBe(true);
    expect(affiliate?.sponsorIndependence.ok).toBe(true);
    expect(affiliate?.offerCopy.disclosure).toContain("Affiliate disclosure");
    expect(affiliate?.packet.status).toBe("NEEDS_MANUAL_REVIEW");

    expect(sponsor?.eligibility.ok).toBe(true);
    expect(sponsor?.commercialCopy.ok).toBe(true);
    expect(sponsor?.sponsorIndependence.ok).toBe(true);
    expect(sponsor?.packet.status).toBe("NEEDS_MANUAL_REVIEW");
  });

  it("blocks sponsor control attempts even when the workflow copy reaches manual review", async () => {
    const packets = await buildPartnerSponsorReviewFixturePackets();
    const blocked = packets.find((packet) => packet.fixtureId === "sponsor_control_attempt_blocked");

    expect(blocked?.packet.status).toBe("NEEDS_MANUAL_REVIEW");
    expect(blocked?.reviewStatus).toBe("BLOCKED");
    expect(blocked?.sponsorIndependence.ok).toBe(false);
    expect(blocked?.sponsorIndependence.protectedSurfaces).toEqual(
      expect.arrayContaining(["picks", "model outputs", "no-bet decisions", "loss autopsies", "calibration claims"])
    );
    expect(blocked?.sponsorIndependence.reasons.join(" ")).toContain("Sponsor cannot control");
  });

  it("fails regulated sportsbook fixtures closed when user state is unknown", async () => {
    const packets = await buildPartnerSponsorReviewFixturePackets();
    const regulated = packets.find((packet) => packet.fixtureId === "regulated_unknown_state_blocked");

    expect(regulated?.reviewStatus).toBe("BLOCKED");
    expect(regulated?.eligibility.highRisk).toBe(true);
    expect(regulated?.eligibility.blockers.map((blocker) => blocker.code)).toContain("UNKNOWN_STATE");
    expect(regulated?.partnerRisk.tier).toBe("HIGH");
    expect(regulated?.packet.blockers.join(" ")).toContain("responsible-gaming");
  });

  it("blocks expired offers and unsafe performance copy without creating live links", async () => {
    const packets = await buildPartnerSponsorReviewFixturePackets();
    const expired = packets.find((packet) => packet.fixtureId === "expired_offer_blocked");
    const unsafe = packets.find((packet) => packet.fixtureId === "unsafe_claim_copy_blocked");
    const serialized = JSON.stringify(packets);

    expect(expired?.packet.status).toBe("NEEDS_MANUAL_REVIEW");
    expect(expired?.eligibility.blockers.map((blocker) => blocker.code)).toContain("OFFER_EXPIRED");
    expect(expired?.reviewStatus).toBe("BLOCKED");

    expect(unsafe?.packet.status).toBe("BLOCKED");
    expect(unsafe?.commercialCopy.evidenceRequiredTerms).toContain("roi");
    expect(unsafe?.claimSafety.evidenceRequiredHits).toContain("roi");
    expect(serialized).not.toContain("partner.example");
  });

  it("summarizes fixture readiness while keeping all live action locks closed", async () => {
    const packets = await buildPartnerSponsorReviewFixturePackets();
    const report = buildPartnerSponsorReviewFixtureReport({ generatedAt: "2026-07-05T22:30:00.000Z", packets });

    expect(report).toMatchObject({
      allLiveActionLocksClosed: true,
      blockedFixtures: 4,
      highRiskFixtures: 1,
      readyForManualReview: 2,
      statusMismatchCount: 0,
      totalFixtures: 6,
    });
    expect(report.liveActionLocks).toEqual({
      affiliateActivationAllowed: false,
      externalSendAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
      sponsorApprovalAutomatic: false,
    });
    expect(report.entries.find((entry) => entry.fixtureId === "sponsor_control_attempt_blocked")?.blockedReasons.join(" ")).toContain(
      "Sponsor cannot control"
    );
  });

  it("does not block truthful sponsor-independence boundary copy", () => {
    const review = reviewSponsorIndependence({
      text:
        "Sponsored disclosure: GSE may receive compensation. Sponsor cannot control picks, model outputs, no-bet decisions, loss autopsies, calibration claims, or editorial conclusions.",
    });

    expect(review.ok).toBe(true);
    expect(review.blockedRequests).toEqual([]);
  });
});
