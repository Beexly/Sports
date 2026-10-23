import { describe, it, expect } from "vitest";
import { runMasterSituationalReasoningOverlay } from "../nfl/master-situational-reasoning-aggregator";
import { KNEEL_MEAN_YD, kneeldownExpectedHaircutYd } from "../nfl/x-situational-80-rules";

describe("2026-10-22 TNF learning loop", () => {
  it("plays Bears -3 and OVER 50.5 and flags both rush hooks", () => {
    const overlay = runMasterSituationalReasoningOverlay();
    expect(overlay.attrition.adjustedProjectedTotal).toBeCloseTo(54.6, 1);
    expect(overlay.attrition.recommendedAction).toBe("PLAY_OVER");
    expect(["PLAY", "CANDIDATE"]).toContain(overlay.spreadPublishState);
    expect(["PLAY", "CANDIDATE"]).toContain(overlay.totalPublishState);
    expect(overlay.sinkhorn.slotWrNickelSuppressionApplied).toBe(true);
    expect(overlay.sinkhorn.suppressedPlayers).toContain("DeMario Douglas");
    expect(overlay.sinkhorn.boostedPlayers).toEqual(
      expect.arrayContaining(["Hunter Henry", "Eli Raridon", "Rhamondre Stevenson"]),
    );
    expect(overlay.qbHooks.map((h) => h.hookFlag)).toEqual([
      "PASS_KNEELDOWN_HOOK_RISK",
      "PASS_KNEELDOWN_HOOK_RISK",
    ]);
    expect(overlay.rookieOverrides.every((r) => r.overrideApplied)).toBe(true);
    expect(KNEEL_MEAN_YD).toBeCloseTo(-1.059, 3);
    expect(kneeldownExpectedHaircutYd(1)).toBeCloseTo(2.03 * -1.059, 3);
  });
});
