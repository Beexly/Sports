import { describe, expect, it } from "vitest";

import {
  buildApiV1AbuseResponseFixtureReport,
  buildApiV1LiveRoutePromotionPacket,
  buildApiV1ReplayConflictFixtureRecords,
  type ApiV1LiveRoutePromotionEvidence,
} from "@/lib/api/v1";
import {
  createLocalReviewQueueEnqueueEvent,
  createLocalReviewQueuePersistenceSimulator,
  localReviewQueuePacketsFromPartnerSponsorFixtures,
} from "@/lib/workflows/local-review-queue-persistence";
import { buildPartnerSponsorReviewFixturePackets } from "@/lib/workflows/partner-sponsor-review-fixtures";

const REVIEWED_EVIDENCE_EXCEPT_ABUSE: Omit<ApiV1LiveRoutePromotionEvidence, "abuseResponseReviewed"> = {
  boundaryExceptionReviewed: true,
  durablePersistenceReviewed: true,
  openApiSecurityReviewed: true,
  ownerApprovalRecorded: true,
  payloadEnvelopeReviewed: true,
  rateLimitPolicyReviewed: true,
  rawKeyAbsenceReviewed: true,
  rollbackPlanReviewed: true,
  routeExposureApproved: true,
};

describe("API v1 abuse-response fixture report", () => {
  it("proves denial coverage without creating live route promotion", () => {
    const report = buildApiV1AbuseResponseFixtureReport({
      generatedAt: "2026-07-06T00:00:00.000Z",
      promotionRequestIds: ["api-route-review-1"],
    });

    expect(report.schemaVersion).toBe("api-v1-abuse-response-fixture-report-v1");
    expect(report.status).toBe("shadow_report_ready");
    expect(report.liveRoutePromotionAllowed).toBe(false);
    expect(report.commandsExecutableNow).toBe(false);
    expect(report.routeExposed).toBe(false);
    expect(report.databaseWritesAllowed).toBe(false);
    expect(report.abuseResponseCoveragePassed).toBe(true);
    expect(report.promotionGateEvidence).toEqual({
      abuseResponseReviewed: true,
      duplicatePromotionRequestsAbsent: true,
      replayConflictsAbsent: true,
      unresolvedReviewPacketsAbsent: true,
    });
    expect(report.cases.map((entry) => entry.id)).toEqual([
      "malformed_api_key",
      "conflicting_api_keys",
      "overscoped_consumer",
      "quota_exhausted",
      "unsafe_payload_rights",
      "malformed_route_controls",
    ]);
    expect(report.cases.every((entry) => entry.passed)).toBe(true);
    expect(report.cases.every((entry) => entry.quotaDebited === false)).toBe(true);
    expect(report.cases.every((entry) => entry.payloadLeaked === false)).toBe(true);
    expect(report.cases.every((entry) => entry.deniedResponsesLeakPayload === false)).toBe(true);
  });

  it("detects replay promotion conflicts from reused idempotency keys with different payloads", () => {
    const replayRecords = buildApiV1ReplayConflictFixtureRecords();
    const report = buildApiV1AbuseResponseFixtureReport({
      generatedAt: "2026-07-06T00:05:00.000Z",
      replayRecords,
    });

    expect(replayRecords).toHaveLength(2);
    expect(report.abuseResponseCoveragePassed).toBe(true);
    expect(report.status).toBe("blocked_by_promotion_conflicts");
    expect(report.promotionGateEvidence).toMatchObject({
      abuseResponseReviewed: false,
      replayConflictsAbsent: false,
    });
    expect(report.replayConflicts).toHaveLength(1);
    expect(report.replayConflicts[0]?.externalIdempotencyKey).toBe("idem-conflict-1");
    expect(report.replayConflicts[0]?.payloadHashes).toHaveLength(2);
    expect(report.promotionBlockers).toContain(
      "Replay promotion conflict detected for reused idempotency keys with different payload hashes.",
    );
  });

  it("blocks promotion evidence when the local review queue has unresolved or stale packets", async () => {
    const partnerPackets = await buildPartnerSponsorReviewFixturePackets();
    const [blockedPacket] = localReviewQueuePacketsFromPartnerSponsorFixtures(
      partnerPackets.filter((packet) => packet.reviewStatus === "BLOCKED"),
    );
    if (blockedPacket === undefined) throw new Error("missing blocked partner/sponsor packet");
    const simulator = createLocalReviewQueuePersistenceSimulator([
      createLocalReviewQueueEnqueueEvent({
        eventId: "api-promotion-blocked-review-packet",
        occurredAt: "2026-07-05T00:00:00.000Z",
        packet: blockedPacket,
      }),
    ]);
    const snapshot = simulator.snapshot({
      now: "2026-07-07T00:00:00.000Z",
      staleAfterHours: 24,
    });
    const report = buildApiV1AbuseResponseFixtureReport({
      generatedAt: "2026-07-07T00:00:00.000Z",
      promotionRequestIds: ["api-live-route-review", "api-live-route-review"],
      reviewQueueSnapshot: snapshot,
    });

    expect(report.status).toBe("blocked_by_promotion_conflicts");
    expect(report.unresolvedReviewPackets).toEqual([blockedPacket.packetId]);
    expect(report.staleReviewPackets).toEqual([blockedPacket.packetId]);
    expect(report.duplicatePromotionRequestIds).toEqual(["api-live-route-review"]);
    expect(report.promotionGateEvidence).toMatchObject({
      abuseResponseReviewed: false,
      duplicatePromotionRequestsAbsent: false,
      unresolvedReviewPacketsAbsent: false,
    });
    expect(report.promotionBlockers).toEqual(
      expect.arrayContaining([
        "Local review queue has unresolved blocker packets.",
        "Local review queue has stale packets requiring owner review or archival.",
        "Duplicate API route promotion request IDs detected.",
      ]),
    );
  });

  it("feeds the live-route promotion packet without making commands executable", () => {
    const cleanReport = buildApiV1AbuseResponseFixtureReport({
      generatedAt: "2026-07-06T00:10:00.000Z",
    });
    const readyPacket = buildApiV1LiveRoutePromotionPacket({
      evidence: {
        ...REVIEWED_EVIDENCE_EXCEPT_ABUSE,
        abuseResponseReviewed: cleanReport.promotionGateEvidence.abuseResponseReviewed,
      },
      inspection: {
        candidateRouteSourceText: "const payload = filterApiV1MetricPayloadFields(metricPayload);",
        routeTreeAbsent: true,
      },
    });
    const conflictReport = buildApiV1AbuseResponseFixtureReport({
      generatedAt: "2026-07-06T00:15:00.000Z",
      replayRecords: buildApiV1ReplayConflictFixtureRecords(),
    });
    const blockedPacket = buildApiV1LiveRoutePromotionPacket({
      evidence: {
        ...REVIEWED_EVIDENCE_EXCEPT_ABUSE,
        abuseResponseReviewed: conflictReport.promotionGateEvidence.abuseResponseReviewed,
      },
      inspection: {
        candidateRouteSourceText: "const payload = filterApiV1MetricPayloadFields(metricPayload);",
        routeTreeAbsent: true,
      },
    });

    expect(readyPacket.status).toBe("ready_for_owner_route_review");
    expect(readyPacket.liveRouteCreationAllowed).toBe(false);
    expect(readyPacket.commandsExecutableNow).toBe(false);
    expect(blockedPacket.status).toBe("blocked_by_owner_gates");
    expect(blockedPacket.gates.find((gate) => gate.id === "abuse-response-reviewed")).toMatchObject({
      status: "blocked",
    });
    expect(blockedPacket.liveRouteCreationAllowed).toBe(false);
    expect(blockedPacket.commandsExecutableNow).toBe(false);
  });
});
