import { describe, expect, it } from "vitest";

import { buildFirstMonthMediaQueue } from "@/lib/media-revenue/first-month-content-queue";
import { buildFirstMonthReviewQueueExport } from "@/lib/media-revenue/first-month-review-queue";
import { buildDraftReviewFixturePackets } from "@/lib/workflows/draft-review-fixtures";
import {
  buildPartnerSponsorReviewFixturePackets,
} from "@/lib/workflows/partner-sponsor-review-fixtures";
import {
  createLocalReviewQueueEnqueueEvent,
  createLocalReviewQueuePersistenceSimulator,
  localReviewQueuePacketFromDraftFencePacket,
  localReviewQueuePacketsFromFirstMonthReviewExport,
  localReviewQueuePacketsFromPartnerSponsorFixtures,
  renderLocalReviewQueueSnapshotMarkdown,
  replayLocalReviewQueueEvents,
  type LocalReviewQueuePacketInput,
} from "@/lib/workflows/local-review-queue-persistence";

async function buildMixedQueuePackets(): Promise<readonly LocalReviewQueuePacketInput[]> {
  const draftFixtures = await buildDraftReviewFixturePackets();
  const mediaSeed = buildFirstMonthMediaQueue()[0];
  if (mediaSeed === undefined) throw new Error("missing first-month media seed");
  const mediaExport = await buildFirstMonthReviewQueueExport({
    generatedAt: "2026-07-05T23:00:00.000Z",
    queue: [mediaSeed],
  });
  const partnerPackets = await buildPartnerSponsorReviewFixturePackets();

  return [
    ...draftFixtures
      .slice(0, 2)
      .map((fixture) =>
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

describe("local review queue persistence simulator", () => {
  it("persists mixed review packets as append-only local shadow events", async () => {
    const packets = await buildMixedQueuePackets();
    const simulator = createLocalReviewQueuePersistenceSimulator();
    const events = packets.map((packet, index) =>
      createLocalReviewQueueEnqueueEvent({
        eventId: `mixed-enqueue-${index}`,
        occurredAt: "2026-07-05T23:05:00.000Z",
        packet,
      }),
    );
    const results = simulator.appendMany(events);
    const snapshot = simulator.snapshot({ now: "2026-07-05T23:10:00.000Z" });

    expect(results.every((result) => result.ok)).toBe(true);
    expect(snapshot).toMatchObject({
      allLiveActionLocksClosed: true,
      databaseWritesAllowed: false,
      durablePersistenceEnabled: false,
      externalSideEffectsAllowed: false,
      persistenceMode: "memory_shadow",
      totalEvents: events.length,
      totalPackets: packets.length,
    });
    expect(snapshot.packets.map((packet) => packet.source)).toEqual(
      expect.arrayContaining(["draft_review_fixture", "first_month_media", "partner_sponsor"]),
    );
    expect(snapshot.packets.every((packet) => !packet.liveActionLocks.publishAllowed)).toBe(true);
    expect(snapshot.packets.every((packet) => !packet.liveActionLocks.routeExposureAllowed)).toBe(true);
    expect(snapshot.packets.every((packet) => !packet.liveActionLocks.externalSendAllowed)).toBe(true);
    expect(snapshot.packets.every((packet) => !packet.liveActionLocks.liveIntegrationAllowed)).toBe(true);
    expect(snapshot.packets.every((packet) => !packet.liveActionLocks.affiliateActivationAllowed)).toBe(true);
    expect(snapshot.packets.every((packet) => !packet.liveActionLocks.sponsorApprovalAutomatic)).toBe(true);
  });

  it("rejects duplicate packet IDs without mutating the event stream", async () => {
    const [packet] = await buildMixedQueuePackets();
    if (packet === undefined) throw new Error("missing review packet");
    const simulator = createLocalReviewQueuePersistenceSimulator();
    const first = simulator.append(
      createLocalReviewQueueEnqueueEvent({
        eventId: "duplicate-packet-first",
        packet,
      }),
    );
    const duplicate = simulator.append(
      createLocalReviewQueueEnqueueEvent({
        eventId: "duplicate-packet-second",
        packet,
      }),
    );

    expect(first.ok).toBe(true);
    expect(duplicate).toMatchObject({
      code: "duplicate_packet",
      ok: false,
    });
    expect(simulator.events()).toHaveLength(1);
    expect(simulator.snapshot().totalPackets).toBe(1);
  });

  it("detects stale packets and renders a local markdown report", async () => {
    const [packet] = await buildMixedQueuePackets();
    if (packet === undefined) throw new Error("missing review packet");
    const simulator = createLocalReviewQueuePersistenceSimulator([
      createLocalReviewQueueEnqueueEvent({
        eventId: "stale-packet",
        occurredAt: "2026-07-05T00:00:00.000Z",
        packet,
      }),
    ]);
    const snapshot = simulator.snapshot({
      now: "2026-07-08T01:00:00.000Z",
      staleAfterHours: 24,
    });
    const markdown = renderLocalReviewQueueSnapshotMarkdown(snapshot);

    expect(snapshot.stalePackets).toEqual([packet.packetId]);
    expect(markdown).toContain("# Local Review Queue Persistence Snapshot");
    expect(markdown).toContain("Database writes allowed: no");
    expect(markdown).toContain("Durable persistence enabled: no");
    expect(markdown).toContain(packet.packetId);
  });

  it("fails closed on corrupt freshness timestamps instead of reporting fresh-green", async () => {
    const [packet] = await buildMixedQueuePackets();
    if (packet === undefined) throw new Error("missing review packet");

    // Unparsable snapshot `now` must not silently mark every unresolved packet fresh.
    const corruptNow = createLocalReviewQueuePersistenceSimulator([
      createLocalReviewQueueEnqueueEvent({
        eventId: "corrupt-now-packet",
        occurredAt: "2026-07-05T00:00:00.000Z",
        packet,
      }),
    ]).snapshot({ now: "not-a-date" });
    expect(corruptNow.stalePackets).toEqual([packet.packetId]);

    // An unparsable packet `updatedAt` must read as stale/needs-refresh, not fresh.
    const corruptUpdatedAt = createLocalReviewQueuePersistenceSimulator([
      createLocalReviewQueueEnqueueEvent({
        eventId: "corrupt-updatedat-packet",
        occurredAt: "not-a-date",
        packet,
      }),
    ]).snapshot({ now: "2026-07-08T01:00:00.000Z", staleAfterHours: 24 });
    expect(corruptUpdatedAt.stalePackets).toEqual([packet.packetId]);
  });

  it("enforces version conflicts and blocks approval when blockers remain unresolved", async () => {
    const packets = await buildMixedQueuePackets();
    const blocked = packets.find((packet) => packet.blockers.length > 0);
    const clean = packets.find((packet) => packet.blockers.length === 0);
    if (blocked === undefined || clean === undefined) throw new Error("missing blocked or clean packet");
    const simulator = createLocalReviewQueuePersistenceSimulator();

    expect(
      simulator.append(createLocalReviewQueueEnqueueEvent({ eventId: "blocked-enqueue", packet: blocked })).ok,
    ).toBe(true);
    expect(simulator.append(createLocalReviewQueueEnqueueEvent({ eventId: "clean-enqueue", packet: clean })).ok).toBe(
      true,
    );

    const blockedApproval = simulator.append({
      decision: "APPROVED_FOR_DRAFT_USE",
      eventId: "blocked-approval",
      eventType: "OWNER_DECISION_RECORDED",
      expectedVersion: 1,
      notes: "Should fail because blockers are still present.",
      occurredAt: "2026-07-05T23:15:00.000Z",
      packetId: blocked.packetId,
      reviewer: "codex-local",
    });
    const repairRequired = simulator.append({
      decision: "REPAIR_REQUIRED",
      eventId: "blocked-repair-required",
      eventType: "OWNER_DECISION_RECORDED",
      expectedVersion: 1,
      notes: "Owner needs repair before any draft use.",
      occurredAt: "2026-07-05T23:20:00.000Z",
      packetId: blocked.packetId,
      reviewer: "codex-local",
    });
    const cleanApproval = simulator.append({
      decision: "APPROVED_FOR_DRAFT_USE",
      eventId: "clean-approval",
      eventType: "OWNER_DECISION_RECORDED",
      expectedVersion: 1,
      notes: "Approved for draft use only, not publication.",
      occurredAt: "2026-07-05T23:25:00.000Z",
      packetId: clean.packetId,
      reviewer: "codex-local",
    });
    const staleUpdate = simulator.append({
      decision: "REPAIR_REQUIRED",
      eventId: "clean-stale-update",
      eventType: "OWNER_DECISION_RECORDED",
      expectedVersion: 1,
      notes: "Should conflict because clean packet is already version 2.",
      occurredAt: "2026-07-05T23:30:00.000Z",
      packetId: clean.packetId,
      reviewer: "codex-local",
    });
    const snapshot = simulator.snapshot({ now: "2026-07-05T23:35:00.000Z" });

    expect(blockedApproval).toMatchObject({
      code: "unresolved_blockers",
      ok: false,
    });
    expect(repairRequired.ok).toBe(true);
    expect(cleanApproval.ok).toBe(true);
    expect(staleUpdate).toMatchObject({
      code: "version_conflict",
      ok: false,
    });
    expect(snapshot.repairRequiredPackets).toBe(1);
    expect(snapshot.approvedForDraftUsePackets).toBe(1);
    expect(snapshot.packets.find((packet) => packet.packetId === clean.packetId)?.version).toBe(2);
  });

  it("replays stored events deterministically", async () => {
    const packets = await buildMixedQueuePackets();
    const simulator = createLocalReviewQueuePersistenceSimulator();
    const events = packets.slice(0, 3).map((packet, index) =>
      createLocalReviewQueueEnqueueEvent({
        eventId: `deterministic-enqueue-${index}`,
        occurredAt: "2026-07-05T23:40:00.000Z",
        packet,
      }),
    );
    simulator.appendMany(events);
    const snapshot = simulator.snapshot({ now: "2026-07-05T23:45:00.000Z" });
    const replayed = replayLocalReviewQueueEvents(simulator.events(), {
      now: "2026-07-05T23:45:00.000Z",
    });

    expect(replayed).toEqual(snapshot);
    expect(replayed.replayErrors).toEqual([]);
  });
});
