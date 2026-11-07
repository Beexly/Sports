import { describe, expect, it } from "vitest";
import {
  QUAD_FRONTIER_PILLARS,
  runSealPotQuadFrontierRouter,
} from "../seal-pot-cognitive-router";

describe("seal-pot-cognitive-router", () => {
  it("declares all 4 Quad-Frontier Sovereign Spine pillars", () => {
    expect(QUAD_FRONTIER_PILLARS).toEqual([
      "google/gemini-4-argon",
      "anthropic/claude-opus-5.5",
      "anthropic/claude-fable-5",
      "openai/astra",
    ]);
  });

  it("caps shrunk log-odds delta within [-0.35, 0.35] and enforces Wasserstein drift barrier", () => {
    const res = runSealPotQuadFrontierRouter({
      eventId: "2026_09_JAX_BAL",
      marketDeVigProb: 0.52,
      pillarRawDeltasLogOdds: {
        "google/gemini-4-argon": 0.24,
        "anthropic/claude-opus-5.5": 0.21,
        "anthropic/claude-fable-5": 0.25,
        "openai/astra": 0.22,
      },
      priorBrierLosses: {
        "google/gemini-4-argon": 0.11,
        "anthropic/claude-opus-5.5": 0.115,
        "anthropic/claude-fable-5": 0.108,
        "openai/astra": 0.112,
      },
      recentMiscoverageErrors: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      targetMiscoverageAlpha: 0.1,
      wassersteinShiftW1: 0.03,
    });
    expect(Math.abs(res.shrunkLogOddsDelta)).toBeLessThanOrEqual(0.35);
    expect(res.wassersteinDriftAbstained).toBe(false);
  });
});
