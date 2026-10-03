import { describe, expect, it } from "vitest";

import {
  buildFirstMonthClaimSafetyReport,
  buildFirstMonthMediaQueue,
  buildFirstMonthPartnerOutreachBatches,
} from "@/lib/media-revenue/first-month-content-queue";
import { FIRST_WEEK_LONG_VIDEO_TITLES, FIRST_WEEK_SHORT_TITLES } from "@/lib/media-revenue/first-month-content-seeds";

describe("first month content queue", () => {
  it("encodes the first-week exact content titles while keeping every item draft-only", () => {
    const queue = buildFirstMonthMediaQueue();
    const titles = queue.map((item) => item.title);

    for (const title of FIRST_WEEK_LONG_VIDEO_TITLES) {
      expect(titles).toContain(title);
    }
    for (const title of FIRST_WEEK_SHORT_TITLES) {
      expect(titles).toContain(title);
    }
    expect(queue.every((item) => item.approval.status === "DRAFT_ONLY")).toBe(true);
    expect(queue.every((item) => item.approval.manualReviewRequired)).toBe(true);
    expect(queue.every((item) => !item.approval.publishAllowed && !item.approval.externalSendAllowed)).toBe(true);
  });

  it("covers all 30 days and satisfies every weekly cadence minimum", () => {
    const queue = buildFirstMonthMediaQueue();
    const outreachBatches = buildFirstMonthPartnerOutreachBatches();
    const report = buildFirstMonthClaimSafetyReport({ outreachBatches, queue });

    expect(report.totalItems).toBe(90);
    expect(report.dailyCoverageDays).toBe(30);
    expect(report.partnerOutreachBatches).toBe(30);
    expect(report.partnerOutreachTargets).toBe(300);
    expect(report.weeklyCadence).toHaveLength(4);
    expect(report.weeklyCadence.every((week) => week.meetsMinimum)).toBe(true);
    for (const week of report.weeklyCadence) {
      expect(week.longVideos).toBeGreaterThanOrEqual(2);
      expect(week.shortClips).toBeGreaterThanOrEqual(10);
      expect(week.newsletters).toBeGreaterThanOrEqual(1);
      expect(week.founderBuildLogs).toBeGreaterThanOrEqual(1);
      expect(week.boardMeetings).toBeGreaterThanOrEqual(1);
    }
  });

  it("scans generated titles and script beats without enabling publish or send actions", () => {
    const report = buildFirstMonthClaimSafetyReport();

    expect(report.allLiveActionLocksClosed).toBe(true);
    expect(report.blockedItems).toBe(0);
    expect(report.evidenceRequiredItems).toBe(0);
    expect(report.entries.every((entry) => entry.claimSafety.ok)).toBe(true);
    expect(report.entries.every((entry) => !entry.publishAllowed && !entry.externalSendAllowed)).toBe(true);
  });

  it("keeps every content idea above the test threshold", () => {
    const queue = buildFirstMonthMediaQueue();

    expect(queue.every((item) => item.score.score >= 60)).toBe(true);
    expect(queue.some((item) => item.score.grade === "PRIORITY")).toBe(true);
  });
});
