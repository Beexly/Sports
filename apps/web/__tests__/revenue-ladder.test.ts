import { describe, expect, it } from "vitest";
import { evaluateRevenueLadder } from "@/lib/autonomy/revenue-ladder";

describe("revenue ladder readiness", () => {
  it("stays FOUNDING until settled sample + calibration + settlement health", () => {
    const r = evaluateRevenueLadder({
      canonicalSettled: 40,
      calibrationPublished: false,
      clvBeatCloseRate: null,
      settlementHealthy: false,
      boardNotSuppressed: false,
      liveBoardEnabled: false,
      publicPicksEnabled: false,
      performanceStatsEnabled: false,
    });
    expect(r.currentStep).toBe("FOUNDING");
    expect(r.nextStep).toBe("PROVEN");
    expect(r.blockersToNext.join(" ")).toMatch(/Settled sample/);
    expect(r.canHonestlyMonetizePublicTrackRecord).toBe(false);
  });

  it("reaches PROVEN when floors met but does not auto-enable public stats", () => {
    const r = evaluateRevenueLadder({
      canonicalSettled: 120,
      calibrationPublished: true,
      clvBeatCloseRate: 0.51,
      settlementHealthy: true,
      boardNotSuppressed: true,
      liveBoardEnabled: false,
      publicPicksEnabled: false,
      performanceStatsEnabled: false,
    });
    expect(r.currentStep).toBe("PROVEN");
    expect(r.nextStep).toBe("ESTABLISHED");
    expect(r.canHonestlyMonetizePublicTrackRecord).toBe(false);
  });

  it("only allows honest public track record when PERFORMANCE_STATS on + proven", () => {
    const r = evaluateRevenueLadder({
      canonicalSettled: 150,
      calibrationPublished: true,
      clvBeatCloseRate: 0.53,
      settlementHealthy: true,
      boardNotSuppressed: true,
      liveBoardEnabled: true,
      publicPicksEnabled: true,
      performanceStatsEnabled: true,
    });
    expect(r.currentStep).toBe("PROVEN");
    expect(r.canHonestlyMonetizePublicTrackRecord).toBe(true);
  });

  describe("decided-rate passthrough (additive disclosure, floor untouched)", () => {
    it("carries the decided-only reading beside the rate the floor reads", () => {
      const r = evaluateRevenueLadder({
        canonicalSettled: 5000,
        calibrationPublished: true,
        clvBeatCloseRate: 0.234,
        clvBeatCloseRateDecided: 0.4084,
        settlementHealthy: true,
        boardNotSuppressed: true,
        liveBoardEnabled: true,
        publicPicksEnabled: true,
        performanceStatsEnabled: true,
      });
      expect(r.clvBeatCloseRateDecided).toBe(0.4084);
      // The ESTABLISHED floor still reads the all-graded rate only:
      expect(r.blockersToNext.join("; ")).toContain("23.4% < floor 52.4%");
    });

    it("is null when the caller does not provide the decided reading", () => {
      const r = evaluateRevenueLadder({
        canonicalSettled: 5000,
        calibrationPublished: true,
        clvBeatCloseRate: 0.6,
        settlementHealthy: true,
        boardNotSuppressed: true,
        liveBoardEnabled: true,
        publicPicksEnabled: true,
        performanceStatsEnabled: true,
      });
      expect(r.clvBeatCloseRateDecided).toBeNull();
    });
  });
});
