import { describe, expect, it } from "vitest";

import { buildFirstMonthMediaQueue } from "@/lib/media-revenue/first-month-content-queue";
import { buildFirstMonthReviewQueueExport } from "@/lib/media-revenue/first-month-review-queue";
import { buildDraftReviewFixturePackets } from "@/lib/workflows/draft-review-fixtures";
import {
  createLocalReviewQueueEnqueueEvent,
  createLocalReviewQueuePersistenceSimulator,
  localReviewQueuePacketFromDraftFencePacket,
  localReviewQueuePacketsFromFirstMonthReviewExport,
  localReviewQueuePacketsFromPartnerSponsorFixtures,
  type LocalReviewQueuePacketInput,
} from "@/lib/workflows/local-review-queue-persistence";
import { renderLocalReviewQueueBlockerReportMarkdown } from "@/lib/workflows/local-review-queue-report-markdown";
import { buildLocalReviewQueueBlockerReport } from "@/lib/workflows/local-review-queue-report";
import { buildPartnerSponsorReviewFixturePackets } from "@/lib/workflows/partner-sponsor-review-fixtures";

async function buildReportQueuePackets(): Promise<readonly LocalReviewQueuePacketInput[]> {
  const draftFixtures = await buildDraftReviewFixturePackets();
  const mediaSeed = buildFirstMonthMediaQueue()[0];
  if (mediaSeed === undefined) throw new Error("missing first-month media seed");
  const mediaExport = await buildFirstMonthReviewQueueExport({
    generatedAt: "2026-07-06T02:00:00.000Z",
    queue: [mediaSeed],
  });
  const partnerPackets = await buildPartnerSponsorReviewFixturePackets();

  return [
    ...draftFixtures.map((fixture) =>
      localReviewQueuePacketFromDraftFencePacket({
        packet: fixture.packet,
        source: "draft_review_fixture",
        title: fixture.title,
      }),
    ),
    ...localReviewQueuePacketsFromFirstMonthReviewExport(mediaExport),
    ...localReviewQueuePacketsFromPartnerSponsorFixtures(partnerPackets),
  ];
}

function enqueueEventsWithStaleBlockedPacket(packets: readonly LocalReviewQueuePacketInput[], eventPrefix: string) {
  const staleBlockedPacket = packets.find((packet) => packet.blockers.length > 0);
  if (staleBlockedPacket === undefined) throw new Error("missing blocked packet for stale fixture");
  return packets.map((packet, index) =>
    createLocalReviewQueueEnqueueEvent({
      eventId: `${eventPrefix}-${index}`,
      occurredAt: packet.packetId === staleBlockedPacket.packetId ? "2026-07-01T00:00:00.000Z" : "2026-07-06T02:05:00.000Z",
      packet,
    }),
  );
}

describe("local review queue blocker report", () => {
  it("groups unresolved blockers by queue source, workflow surface, and source id", async () => {
    const packets = await buildReportQueuePackets();
    const simulator = createLocalReviewQueuePersistenceSimulator(enqueueEventsWithStaleBlockedPacket(packets, "report-enqueue"));
    const report = buildLocalReviewQueueBlockerReport(
      simulator.snapshot({ now: "2026-07-06T03:00:00.000Z", staleAfterHours: 24 }),
    );

    expect(report.unresolvedPacketCount).toBeGreaterThan(0);
    expect(report.staleUnresolvedPacketCount).toBe(1);
    expect(report.byPacketSource.map((group) => group.id)).toEqual(
      expect.arrayContaining(["draft_review_fixture", "partner_sponsor"]),
    );
    expect(report.byWorkflowSurface.map((group) => group.id)).toEqual(expect.arrayContaining(["content", "api"]));
    expect(report.bySourceId.map((group) => group.id)).toContain("nflverse");
    expect(report.bySourceId.every((group) => group.blockerCount > 0)).toBe(true);
  });

  it("prioritizes stale and blocked packets without enabling live actions", async () => {
    const packets = await buildReportQueuePackets();
    const simulator = createLocalReviewQueuePersistenceSimulator(enqueueEventsWithStaleBlockedPacket(packets, "priority-enqueue"));
    const report = buildLocalReviewQueueBlockerReport(
      simulator.snapshot({ now: "2026-07-06T03:00:00.000Z", staleAfterHours: 24 }),
    );
    const [top] = report.priorityQueue;
    if (top === undefined) throw new Error("missing priority entry");

    expect(top.stale || top.status === "BLOCKED").toBe(true);
    expect(report.reviewGates).toEqual({
      affiliateActivationAllowed: false,
      databaseWritesAllowed: false,
      durablePersistenceEnabled: false,
      externalSendAllowed: false,
      externalSideEffectsAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
      sponsorApprovalAutomatic: false,
    });
  });

  it("omits clean approved draft-use packets from unresolved blocker reporting", async () => {
    const packets = await buildReportQueuePackets();
    const clean = packets.find((packet) => packet.blockers.length === 0);
    const blocked = packets.find((packet) => packet.blockers.length > 0);
    if (clean === undefined || blocked === undefined) throw new Error("missing clean or blocked packet");
    const simulator = createLocalReviewQueuePersistenceSimulator([
      createLocalReviewQueueEnqueueEvent({ eventId: "clean-enqueue", packet: clean }),
      createLocalReviewQueueEnqueueEvent({ eventId: "blocked-enqueue", packet: blocked }),
    ]);
    simulator.append({
      decision: "APPROVED_FOR_DRAFT_USE",
      eventId: "clean-approved",
      eventType: "OWNER_DECISION_RECORDED",
      expectedVersion: 1,
      notes: "Approved for draft use only.",
      occurredAt: "2026-07-06T03:30:00.000Z",
      packetId: clean.packetId,
      reviewer: "codex-local",
    });
    const report = buildLocalReviewQueueBlockerReport(simulator.snapshot({ now: "2026-07-06T03:35:00.000Z" }));

    expect(report.priorityQueue.map((entry) => entry.packetId)).not.toContain(clean.packetId);
    expect(report.priorityQueue.map((entry) => entry.packetId)).toContain(blocked.packetId);
    expect(report.unresolvedPacketCount).toBe(1);
  });

  it("renders a local-only markdown blocker report", async () => {
    const packets = await buildReportQueuePackets();
    const simulator = createLocalReviewQueuePersistenceSimulator(
      packets.slice(0, 3).map((packet, index) =>
        createLocalReviewQueueEnqueueEvent({
          eventId: `markdown-enqueue-${index}`,
          packet,
        }),
      ),
    );
    const markdown = renderLocalReviewQueueBlockerReportMarkdown(
      buildLocalReviewQueueBlockerReport(simulator.snapshot({ now: "2026-07-06T04:00:00.000Z" })),
    );

    expect(markdown).toContain("# Local Review Queue Blocker Report");
    expect(markdown).toContain("## By Queue Source");
    expect(markdown).toContain("## By Workflow Surface");
    expect(markdown).toContain("## By Source ID");
    expect(markdown).toContain("- Publish allowed: no");
    expect(markdown).toContain("- Database writes allowed: no");
    expect(markdown).not.toContain("Publish allowed: yes");
  });
});
