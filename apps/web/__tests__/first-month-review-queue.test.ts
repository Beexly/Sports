import { describe, expect, it } from "vitest";

import { buildFirstMonthMediaQueue } from "@/lib/media-revenue/first-month-content-queue";
import { buildFirstMonthReviewQueueExport } from "@/lib/media-revenue/first-month-review-queue";

describe("first month review queue export", () => {
  it("exports all first-month content drafts as local manual-review packets", async () => {
    const reviewExport = await buildFirstMonthReviewQueueExport({
      generatedAt: "2026-07-05T21:00:00.000Z",
    });

    expect(reviewExport.totalPackets).toBe(90);
    expect(reviewExport.packets).toHaveLength(90);
    expect(reviewExport.waitingManualReviewPackets + reviewExport.blockedPackets).toBe(90);
    expect(reviewExport.allLiveActionLocksClosed).toBe(true);
    expect(reviewExport.weeklyCadence.every((week) => week.meetsMinimum)).toBe(true);
    expect(reviewExport.packets.every((packet) => !packet.liveActionLocks.publishAllowed)).toBe(true);
    expect(reviewExport.packets.every((packet) => !packet.liveActionLocks.externalSendAllowed)).toBe(true);
    expect(reviewExport.packets.every((packet) => !packet.liveActionLocks.routeExposureAllowed)).toBe(true);
    expect(reviewExport.packets.every((packet) => !packet.liveActionLocks.liveIntegrationAllowed)).toBe(true);
  });

  it("renders bounded markdown with metadata, not full script bodies", async () => {
    const reviewExport = await buildFirstMonthReviewQueueExport({
      generatedAt: "2026-07-05T21:05:00.000Z",
    });
    const target = reviewExport.packets.find((packet) =>
      packet.title.includes("Confidence Is Not Probability"),
    );

    expect(target).toBeDefined();
    if (target === undefined) throw new Error("missing confidence review packet");
    expect(target.markdown).toContain("# First-Month Media Review: Confidence Is Not Probability");
    expect(target.markdown).toContain("- Script beat count:");
    expect(target.markdown).toContain("Publish allowed: no");
    expect(target.markdown).not.toContain("Open with the misconception.");
  });

  it("keeps unsafe custom drafts blocked without allowing publish or send", async () => {
    const [firstItem] = buildFirstMonthMediaQueue();

    expect(firstItem).toBeDefined();
    if (firstItem === undefined) throw new Error("missing first-month queue item");
    const unsafe = {
      ...firstItem,
      hook: "This claim must fail before publication.",
      scriptBeats: ["Repair the claim before any owner review."],
      title: "Guaranteed lock with verified ROI.",
    };
    const reviewExport = await buildFirstMonthReviewQueueExport({
      generatedAt: "2026-07-05T21:10:00.000Z",
      queue: [unsafe],
    });
    const [packet] = reviewExport.packets;

    expect(packet).toBeDefined();
    if (packet === undefined) throw new Error("missing unsafe review packet");
    expect(reviewExport.blockedPackets).toBe(1);
    expect(reviewExport.claimBlockedPackets).toBe(1);
    expect(reviewExport.evidenceRequiredPackets).toBe(1);
    expect(packet.workflowStatus).toBe("BLOCKED");
    expect(packet.claimSafety.ok).toBe(false);
    expect(packet.liveActionLocks).toEqual({
      externalSendAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
    });
  });
});
