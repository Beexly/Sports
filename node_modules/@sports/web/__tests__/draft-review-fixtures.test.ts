import { describe, expect, it } from "vitest";

import {
  buildDraftReviewClaimSafetyBatchReport,
  buildDraftReviewFixturePackets,
  DRAFT_REVIEW_FIXTURE_DEFINITIONS,
} from "@/lib/workflows/draft-review-fixtures";

describe("draft review packet fixtures", () => {
  it("builds representative content and API packets with expected statuses", async () => {
    const packets = await buildDraftReviewFixturePackets();

    expect(packets).toHaveLength(DRAFT_REVIEW_FIXTURE_DEFINITIONS.length);
    expect(packets.every((packet) => packet.statusMatchesExpectation)).toBe(true);
    expect(packets.some((packet) => packet.packet.kind === "content")).toBe(true);
    expect(packets.some((packet) => packet.packet.kind === "api")).toBe(true);
    expect(packets.some((packet) => packet.packet.status === "BLOCKED")).toBe(true);
    expect(packets.some((packet) => packet.packet.status === "NEEDS_MANUAL_REVIEW")).toBe(true);
    packets.forEach((packet) => {
      expect(packet.packet.liveActionLocks).toEqual({
        externalSendAllowed: false,
        liveIntegrationAllowed: false,
        publishAllowed: false,
        routeExposureAllowed: false,
      });
    });
  });

  it("keeps protected payload values out of fixture packets, markdown, and reports", async () => {
    const packets = await buildDraftReviewFixturePackets();
    const report = buildDraftReviewClaimSafetyBatchReport({ generatedAt: "2026-07-05T21:00:00.000Z", packets });

    expect(JSON.stringify(packets)).not.toContain("must-not-appear");
    expect(packets.map((packet) => packet.markdown).join("\n")).not.toContain("must-not-appear");
    expect(JSON.stringify(report)).not.toContain("must-not-appear");
  });

  it("reports claim-safety and workflow counts without enabling live actions", async () => {
    const packets = await buildDraftReviewFixturePackets();
    const report = buildDraftReviewClaimSafetyBatchReport({ packets });

    expect(report).toMatchObject({
      allLiveActionLocksClosed: true,
      claimBlocked: 1,
      evidenceRequired: 1,
      statusMismatchCount: 0,
      totalFixtures: 5,
      waitingManualReview: 2,
      workflowBlocked: 3,
    });
    expect(report.liveActionLocks).toEqual({
      externalSendAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
    });
    expect(report.entries.map((entry) => entry.fixtureId)).toEqual([
      "content_no_bet_clinic_safe",
      "content_tout_claim_blocked",
      "content_partner_missing_disclosure",
      "api_derived_nflverse_safe",
      "api_raw_vendor_payload_blocked",
    ]);
  });
});
