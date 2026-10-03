import { describe, it, expect } from "vitest";
import {
  isWithinChannel87Window,
  createChannel87ScheduleContract,
  validateShowBlock,
  sortShowBlocks,
  getCurrentShowBlock,
  summarizeChannel87Schedule,
  centralTimeHour,
  CH87_CHANNEL_NUMBER,
  CH87_WINDOW,
  type ShowBlock,
} from "../lib/airwave/channel-87-schedule";

const SAMPLE_BLOCK: ShowBlock = {
  showId: "test-show",
  showName: "Test Show",
  startsAtCt: "08:00",
  endsAtCt: "12:00",
  startHour: 8,
  endHour: 12,
  expectedHosts: ["Host A"],
  sportFocus: ["NFL"],
  fantasyFocus: true,
  bettingRelevance: false,
  sourceConfidence: "OPERATOR_PROVIDED",
  manualReviewRequired: true,
  rightsStatus: "MANUAL_IMPORT_ONLY",
  operatorNotes: "Test block.",
};

describe("Channel 87 Schedule", () => {
  describe("isWithinChannel87Window", () => {
    it("returns true for hour 5 (start of window)", () => {
      expect(isWithinChannel87Window(5)).toBe(true);
    });

    it("returns true for hour 22 (late in window)", () => {
      expect(isWithinChannel87Window(22)).toBe(true);
    });

    it("returns false for hour 23 (window end is exclusive)", () => {
      expect(isWithinChannel87Window(23)).toBe(false);
    });

    it("returns false for hour 4 (before window)", () => {
      expect(isWithinChannel87Window(4)).toBe(false);
    });

    it("returns false for hour 0", () => {
      expect(isWithinChannel87Window(0)).toBe(false);
    });

    it("window is 05:00-23:00 CT", () => {
      expect(CH87_WINDOW.startHour).toBe(5);
      expect(CH87_WINDOW.endHour).toBe(23);
    });
  });

  describe("createChannel87ScheduleContract", () => {
    it("returns channel number 87", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.channelNumber).toBe(CH87_CHANNEL_NUMBER);
      expect(contract.channelNumber).toBe(87);
    });

    it("cannot scrape schedule", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.policy.canScrapeSchedule).toBe(false);
    });

    it("cannot auto-capture", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.policy.canAutoCapture).toBe(false);
    });

    it("requires legal acknowledgement", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.policy.requiresLegalAck).toBe(true);
    });

    it("requires operator review", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.policy.requiresOperatorReview).toBe(true);
    });

    it("is manual import only", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.policy.manualImportOnly).toBe(true);
    });

    it("has schedule source as OPERATOR_PROVIDED_MANUAL", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.scheduleSource).toBe("OPERATOR_PROVIDED_MANUAL");
    });

    it("has sample show blocks that are marked SAMPLE_PLACEHOLDER", () => {
      const contract = createChannel87ScheduleContract();
      const sampleBlocks = contract.shows.filter(
        (b) => b.sourceConfidence === "SAMPLE_PLACEHOLDER",
      );
      expect(sampleBlocks.length).toBeGreaterThan(0);
    });

    it("all sample blocks have manualReviewRequired=true", () => {
      const contract = createChannel87ScheduleContract();
      for (const block of contract.shows) {
        expect(block.manualReviewRequired).toBe(true);
      }
    });

    it("all sample show blocks are within the 05:00-23:00 window", () => {
      const contract = createChannel87ScheduleContract();
      for (const block of contract.shows) {
        expect(isWithinChannel87Window(block.startHour)).toBe(true);
      }
    });

    it("compliance note mentions no DRM bypass and no scraping", () => {
      const contract = createChannel87ScheduleContract();
      expect(contract.complianceNote).toMatch(/no scraping/i);
      expect(contract.complianceNote).toMatch(/no drm bypass/i);
    });
  });

  describe("validateShowBlock", () => {
    it("returns no errors for a valid block", () => {
      const errors = validateShowBlock(SAMPLE_BLOCK);
      expect(errors).toHaveLength(0);
    });

    it("returns error for missing showId", () => {
      const invalid = { ...SAMPLE_BLOCK, showId: "" };
      const errors = validateShowBlock(invalid);
      expect(errors.some((e) => e.includes("showId"))).toBe(true);
    });

    it("returns error for invalid time format", () => {
      const invalid = { ...SAMPLE_BLOCK, startsAtCt: "8:00" };
      const errors = validateShowBlock(invalid);
      expect(errors.some((e) => e.includes("startsAtCt"))).toBe(true);
    });

    it("returns error when start hour is after end hour", () => {
      const invalid = { ...SAMPLE_BLOCK, startHour: 14, endHour: 8 };
      const errors = validateShowBlock(invalid);
      expect(errors.some((e) => e.includes("startHour must be before"))).toBe(true);
    });

    it("returns error when show starts outside the capture window", () => {
      const invalid = { ...SAMPLE_BLOCK, startHour: 3 };
      const errors = validateShowBlock(invalid);
      expect(errors.some((e) => e.includes("outside the 05:00"))).toBe(true);
    });
  });

  describe("sortShowBlocks", () => {
    it("sorts by startHour ascending", () => {
      const blocks: ShowBlock[] = [
        { ...SAMPLE_BLOCK, showId: "b", showName: "B Show", startHour: 14, endHour: 18 },
        { ...SAMPLE_BLOCK, showId: "a", showName: "A Show", startHour: 6, endHour: 10 },
      ];
      const sorted = sortShowBlocks(blocks);
      expect(sorted[0]!.startHour).toBe(6);
      expect(sorted[1]!.startHour).toBe(14);
    });
  });

  describe("getCurrentShowBlock", () => {
    it("returns undefined when the CT hour is outside the window", () => {
      const blocks = [SAMPLE_BLOCK]; // 8-12 CT
      // June is CDT (UTC-5): 07:00Z -> 02:00 CT, which is outside 05:00-23:00.
      const date = new Date("2026-06-11T07:00:00Z");
      const result = getCurrentShowBlock(blocks, date);
      expect(result).toBeUndefined();
    });

    it("returns the current show block when the CT hour matches", () => {
      const blocks = [SAMPLE_BLOCK]; // startHour 8, endHour 12 CT
      // June is CDT (UTC-5): 14:00Z -> 09:00 CT, which is within 8-12.
      const date = new Date("2026-06-11T14:00:00Z");
      const result = getCurrentShowBlock(blocks, date);
      expect(result).toEqual(SAMPLE_BLOCK);
    });

    it("uses Central Time, not the raw UTC hour, to pick the block", () => {
      const blocks = [SAMPLE_BLOCK]; // 8-12 CT
      // UTC hour 9 would (buggily) match 8-12, but 09:00Z is 04:00 CT in June
      // (CDT, UTC-5) — outside the window entirely.
      const date = new Date("2026-06-11T09:00:00Z");
      expect(getCurrentShowBlock(blocks, date)).toBeUndefined();
    });
  });

  describe("summarizeChannel87Schedule", () => {
    it("reports requiresLegalAck=true", () => {
      const contract = createChannel87ScheduleContract();
      const summary = summarizeChannel87Schedule(contract.shows, new Date());
      expect(summary.requiresLegalAck).toBe(true);
    });

    it("reports sampleOnlyShows for SAMPLE_PLACEHOLDER blocks", () => {
      const contract = createChannel87ScheduleContract();
      const summary = summarizeChannel87Schedule(contract.shows, new Date());
      expect(summary.sampleOnlyShows).toBeGreaterThan(0);
    });

    it("includes note about replacing sample data", () => {
      const contract = createChannel87ScheduleContract();
      const summary = summarizeChannel87Schedule(contract.shows, new Date());
      expect(summary.operatorNote).toMatch(/SAMPLE_PLACEHOLDER/);
    });

    it("reports windowOpen/currentShow in Central Time, not UTC", () => {
      const contract = createChannel87ScheduleContract();
      // 2026-11-15 is CST (UTC-6): 02:00Z -> 20:00 CT (Nov 14), inside the
      // 05:00-23:00 window and inside the 18-22 "Evening Debrief" block.
      // Raw getUTCHours() would be 2 and wrongly report the window closed.
      const date = new Date("2026-11-15T02:00:00Z");
      const summary = summarizeChannel87Schedule(contract.shows, date);
      expect(summary.windowOpen).toBe(true);
      expect(summary.currentShow?.showId).toBe("ch87-evening-debrief");
    });

    it("reports windowOpen=false when it is pre-dawn in Central Time", () => {
      const contract = createChannel87ScheduleContract();
      // CST (UTC-6): 09:00Z -> 03:00 CT, before the 05:00 window open.
      const date = new Date("2026-11-15T09:00:00Z");
      const summary = summarizeChannel87Schedule(contract.shows, date);
      expect(summary.windowOpen).toBe(false);
      expect(summary.currentShow).toBeUndefined();
    });
  });

  describe("centralTimeHour", () => {
    it("converts a UTC instant to the Central-Time hour in CDT (summer)", () => {
      // June -> CDT (UTC-5): 14:00Z -> 09:00 CT.
      expect(centralTimeHour(new Date("2026-06-11T14:00:00Z"))).toBe(9);
    });

    it("converts a UTC instant to the Central-Time hour in CST (winter)", () => {
      // November (post-DST) -> CST (UTC-6): 02:00Z -> 20:00 CT (previous day).
      expect(centralTimeHour(new Date("2026-11-15T02:00:00Z"))).toBe(20);
    });

    it("returns NaN for an invalid Date so window checks fail closed", () => {
      const hour = centralTimeHour(new Date("not-a-date"));
      expect(Number.isNaN(hour)).toBe(true);
      expect(isWithinChannel87Window(hour)).toBe(false);
    });
  });
});
