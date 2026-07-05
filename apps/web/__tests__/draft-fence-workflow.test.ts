import { describe, expect, it } from "vitest";

import {
  createDraftFenceReviewPacket,
  createMemoryDraftFenceReviewPacketLedger,
  renderDraftFenceReviewPacketMarkdown,
  runDraftFenceWorkflow,
} from "@/lib/workflows/draft-fence-workflow";

describe("draft fence workflow harness", () => {
  it("routes safe content drafts to manual review without allowing publish or external send", async () => {
    const result = await runDraftFenceWorkflow({
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      now: "2026-07-05T16:00:00.000Z",
      text: "GSE board note: stale data can turn a model opinion into a no-bet.",
    });

    expect(result.status).toBe("NEEDS_MANUAL_REVIEW");
    expect(result.manualReviewGate).toMatchObject({
      passed: false,
      required: true,
      status: "WAITING_ON_OWNER_REVIEW",
    });
    expect(result.publishAllowed).toBe(false);
    expect(result.externalSendAllowed).toBe(false);
    expect(result.routeExposureAllowed).toBe(false);
    expect(result.liveIntegrationAllowed).toBe(false);
    expect(result.stageResults.map((stage) => stage.stageId)).toEqual([
      "source_rights",
      "commercial_copy",
      "restricted_tracking_data",
      "affiliate_disclosure",
      "responsible_gaming",
    ]);
    expect(result.warnings.join(" ")).toContain("nflverse");
  });

  it("blocks tout and unsupported commercial claims before manual review", async () => {
    const result = await runDraftFenceWorkflow({
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      text: "This pick is a guaranteed lock with verified ROI.",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.manualReviewGate.status).toBe("WAITING_ON_REPAIR");
    expect(result.blockers.join(" ")).toContain("commercial-copy");
    expect(result.publishAllowed).toBe(false);
  });

  it("blocks partner language without a nearby disclosure", async () => {
    const result = await runDraftFenceWorkflow({
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      text: "Try this partner offer before kickoff.",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join(" ")).toContain("affiliate-disclosure");
    expect(result.fixHints.join(" ")).toContain("disclosure");
  });

  it("blocks sportsbook and DFS language unless a structured responsible-gaming review passes", async () => {
    const result = await runDraftFenceWorkflow({
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      text: "Sportsbook deposit bonus for tonight's slate.",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join(" ")).toContain("responsible-gaming");
    expect(result.publishAllowed).toBe(false);
  });

  it("blocks unsafe API payload rights without echoing protected payload values", async () => {
    const result = await runDraftFenceWorkflow({
      kind: "api",
      metadata: {
        includesRawVendorPayload: true,
        intendedUse: "commercial_display",
        sourceIds: ["espn-public-api"],
      },
      payload: { rawPrice: 101, vendorPayload: "must-not-appear" },
      text: "Derived API response draft.",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.routeExposureAllowed).toBe(false);
    expect(result.blockers.join(" ")).toContain("api-payload-rights");
    expect(JSON.stringify(result)).not.toContain("must-not-appear");
    expect(result.inspected).toMatchObject({
      payloadPresent: true,
      sourceIds: ["espn-public-api"],
    });
  });

  it("serializes a local review packet without turning owner checklist fields into live approval", async () => {
    const workflow = await runDraftFenceWorkflow({
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      now: "2026-07-05T17:00:00.000Z",
      text: "GSE board note: no-bet discipline protects the board.",
      workflowRunId: "workflow_packet_1",
    });
    const packet = createDraftFenceReviewPacket({
      checklist: {
        claimEvidenceReviewed: true,
        disclosureReviewed: true,
        ownerDecision: "APPROVED_FOR_DRAFT_USE",
        reviewedAt: "2026-07-05T17:05:00.000Z",
        reviewer: "owner",
        sourceRightsReviewed: true,
      },
      workflow,
    });

    expect(packet.packetId).toContain("draft-review-content-workflow-packet-1");
    expect(packet.manualReviewRequired).toBe(true);
    expect(packet.approvalIsAutomatic).toBe(false);
    expect(packet.checklist.ownerDecision).toBe("APPROVED_FOR_DRAFT_USE");
    expect(packet.liveActionLocks).toEqual({
      externalSendAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
    });
    expect(packet.stageSummary.every((stage) => stage.reasonCount >= 0)).toBe(true);
  });

  it("renders packet markdown without protected payload values", async () => {
    const workflow = await runDraftFenceWorkflow({
      kind: "api",
      metadata: { intendedUse: "commercial_display", sourceIds: ["espn-public-api"] },
      payload: { protectedPayload: "must-not-appear" },
      text: "API review draft",
    });
    const packet = createDraftFenceReviewPacket({ workflow });
    const markdown = renderDraftFenceReviewPacketMarkdown(packet);

    expect(markdown).toContain(`# Draft Review Packet: ${packet.packetId}`);
    expect(markdown).toContain("Route exposure allowed: no");
    expect(markdown).toContain("Payload present: yes");
    expect(markdown).not.toContain("must-not-appear");
  });

  it("stores review packets in an append-only memory ledger without approving live actions", async () => {
    const workflow = await runDraftFenceWorkflow({
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      now: "2026-07-05T18:00:00.000Z",
      text: "GSE board note: route every claim through review.",
      workflowRunId: "workflow_ledger_1",
    });
    const packet = createDraftFenceReviewPacket({ workflow });
    const ledger = createMemoryDraftFenceReviewPacketLedger();
    const appended = ledger.append(packet);
    const duplicate = ledger.append(packet);
    const listed = ledger.list();
    const found = ledger.find(packet.packetId);

    expect(appended.ok).toBe(true);
    expect(duplicate).toMatchObject({ code: "duplicate_packet", ok: false });
    expect(listed).toHaveLength(1);
    expect(found?.liveActionLocks).toEqual({
      externalSendAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
    });
    expect(ledger.packets).toHaveLength(1);
  });
});
