import { describe, it, expect } from "vitest";
import {
  assessStaleSettlement,
  DEFAULT_ESTIMATED_GAME_DURATION_HOURS,
  DEFAULT_SETTLEMENT_GRACE_HOURS,
  type PendingPickGameInfo,
} from "../stale-settlement.js";

const NOW = new Date("2026-06-12T12:00:00Z");

/** Build a pending pick whose game commenced `hoursAgo` hours before NOW. */
function pick(
  hoursAgo: number,
  gameStatus: PendingPickGameInfo["gameStatus"] = "SCHEDULED",
): PendingPickGameInfo {
  return {
    commenceTime: new Date(NOW.getTime() - hoursAgo * 3_600_000),
    gameStatus,
  };
}

// Default stale threshold: commence + 4h duration + 6h grace = 10h after commence.

describe("assessStaleSettlement — zero stale", () => {
  it("returns zeros for an empty pick set", () => {
    const report = assessStaleSettlement([], NOW);
    expect(report.count).toBe(0);
    expect(report.oldestAgeHours).toBeNull();
    expect(report.eligibleWithinGrace).toBe(0);
    expect(report.thresholdHours).toBe(
      DEFAULT_ESTIMATED_GAME_DURATION_HOURS + DEFAULT_SETTLEMENT_GRACE_HOURS,
    );
  });

  it("eligible picks still inside the grace window are not stale", () => {
    // Commenced 5h ago → estimated end 1h ago → eligible, but only 1h ungraded.
    const report = assessStaleSettlement([pick(5), pick(6, "FINAL")], NOW);
    expect(report.count).toBe(0);
    expect(report.oldestAgeHours).toBeNull();
    expect(report.eligibleWithinGrace).toBe(2);
  });

  it("ignores POSTPONED and CANCELED games even when very old", () => {
    const report = assessStaleSettlement(
      [pick(48, "POSTPONED"), pick(72, "CANCELED")],
      NOW,
    );
    expect(report.count).toBe(0);
    expect(report.eligibleWithinGrace).toBe(0);
  });
});

describe("assessStaleSettlement — stale picks past grace", () => {
  it("flags picks whose estimated end is past the grace window", () => {
    // Commenced 12h ago → estimated end 8h ago → 8h ungraded > 6h grace.
    // Commenced 30h ago → estimated end 26h ago → oldest.
    const report = assessStaleSettlement(
      [pick(12), pick(30, "FINAL"), pick(5)],
      NOW,
    );
    expect(report.count).toBe(2);
    expect(report.oldestAgeHours).toBe(26);
    expect(report.eligibleWithinGrace).toBe(1);
  });

  it("counts every pick on the same stale game (picks may share a game)", () => {
    const report = assessStaleSettlement([pick(20), pick(20), pick(20)], NOW);
    expect(report.count).toBe(3);
    expect(report.oldestAgeHours).toBe(16);
  });

  it("a FINAL game with pending picks goes stale on the same clock", () => {
    // FINAL means scores exist, so an ungraded pick here is a real failure.
    const report = assessStaleSettlement([pick(11, "FINAL")], NOW);
    expect(report.count).toBe(1);
    expect(report.oldestAgeHours).toBe(7);
  });

  it("treats exactly-at-grace-boundary as stale (>=)", () => {
    // Commenced exactly duration+grace = 10h ago → hoursSinceEnd = 6 = grace.
    const report = assessStaleSettlement([pick(10)], NOW);
    expect(report.count).toBe(1);
    expect(report.oldestAgeHours).toBe(6);
  });

  it("respects custom duration/grace overrides", () => {
    // 2h duration + 1h grace → stale 3h after commence.
    const report = assessStaleSettlement([pick(4), pick(2.5)], NOW, {
      estimatedGameDurationHours: 2,
      graceHours: 1,
    });
    expect(report.count).toBe(1);
    expect(report.oldestAgeHours).toBe(2);
    expect(report.eligibleWithinGrace).toBe(1);
    expect(report.thresholdHours).toBe(3);
  });
});

describe("assessStaleSettlement — none eligible yet", () => {
  it("recent and future games are neither eligible nor stale", () => {
    const report = assessStaleSettlement(
      [
        pick(1), // started 1h ago, presumably in progress
        pick(2, "LIVE"), // live game
        pick(-3), // commences 3h from now
      ],
      NOW,
    );
    expect(report.count).toBe(0);
    expect(report.oldestAgeHours).toBeNull();
    expect(report.eligibleWithinGrace).toBe(0);
  });
});
