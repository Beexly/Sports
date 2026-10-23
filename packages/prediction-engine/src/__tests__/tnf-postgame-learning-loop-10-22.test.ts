import { describe, it, expect } from "vitest";
import { runMasterSituationalReasoningOverlay } from "../nfl/master-situational-reasoning-aggregator";
import { KNEEL_MEAN_YD, kneeldownExpectedHaircutYd } from "../nfl/x-situational-80-rules";

describe("2026-10-22 TNF learning loop", () => {
  it("plays Bears -3, passes the total, and flags both rush hooks", () => {
    const overlay = runMasterSituationalReasoningOverlay();
    expect(overlay.attrition.adjustedProjectedTotal).toBeCloseTo(48.5, 1);
    expect(overlay.attrition.recommendedAction).toBe("PASS");
    expect(overlay.attrition.olinePenaltyNeutralizationPts).toBe(0);
    expect(overlay.attrition.kickingEnvelopeBoostPts).toBe(0);
    expect(["PLAY", "CANDIDATE"]).toContain(overlay.spreadPublishState);
    expect(overlay.totalPublishState).toBe("PASS");
    expect(overlay.sinkhorn.slotWrNickelSuppressionApplied).toBe(false);
    expect(overlay.sinkhorn.suppressedPlayers).not.toContain("DeMario Douglas");
    expect(overlay.sinkhorn.boostedPlayers).toEqual([]);
    expect(overlay.qbHooks.map((h) => h.hookFlag)).toEqual([
      "PASS_KNEELDOWN_HOOK_RISK",
      "PASS_KNEELDOWN_HOOK_RISK",
    ]);
    expect(overlay.rookieOverrides.every((r) => r.overrideApplied)).toBe(false);
    expect(KNEEL_MEAN_YD).toBeCloseTo(-1.059, 3);
    expect(kneeldownExpectedHaircutYd(1)).toBeCloseTo(2.03 * -1.059, 3);
  });
});
