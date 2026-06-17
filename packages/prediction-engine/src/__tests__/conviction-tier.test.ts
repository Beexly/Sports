import { describe, it, expect } from "vitest";
import {
  convictionTier,
  summarizeConviction,
  BREAK_EVEN_PROBABILITY,
  CONVICTION_MIN_PROBABILITY,
  CONVICTION_MIN_CLV_BEAT_RATE,
  type ConvictionResult,
} from "../conviction-tier.js";

describe("convictionTier", () => {
  it("exposes honest, documented thresholds", () => {
    expect(BREAK_EVEN_PROBABILITY).toBeCloseTo(0.524, 3);
    expect(CONVICTION_MIN_PROBABILITY).toBe(0.65);
    expect(CONVICTION_MIN_CLV_BEAT_RATE).toBe(0.5);
  });

  it("awards CONVICTION only when calibrated P, SPEAK edge, and CLV history all clear the bar", () => {
    const r = convictionTier({ calibratedProbability: 0.7, edgeDecision: "SPEAK", clvBeatCloseRate: 0.6 });
    expect(r.tier).toBe("CONVICTION");
    expect(r.meetsConvictionBar).toBe(true);
    expect(r.reasons).toHaveLength(0);
    expect(r.expectedWinRate).toBeCloseTo(0.7, 5);
  });

  it("the expected win rate IS the calibrated probability (clamped to [0,1])", () => {
    expect(convictionTier({ calibratedProbability: 1.5, edgeDecision: "SPEAK", clvBeatCloseRate: 0.6 }).expectedWinRate).toBe(1);
    expect(convictionTier({ calibratedProbability: -0.2, edgeDecision: "PASS" }).expectedWinRate).toBe(0);
  });

  it("drops to LEAN when probability is below the conviction floor but above break-even", () => {
    const r = convictionTier({ calibratedProbability: 0.6, edgeDecision: "SPEAK", clvBeatCloseRate: 0.6 });
    expect(r.tier).toBe("LEAN");
    expect(r.meetsConvictionBar).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/below the conviction floor/);
  });

  it("a LEAN edge cannot reach CONVICTION (needs SPEAK)", () => {
    const r = convictionTier({ calibratedProbability: 0.72, edgeDecision: "LEAN", clvBeatCloseRate: 0.6 });
    expect(r.tier).toBe("LEAN");
    expect(r.reasons.join(" ")).toMatch(/needs SPEAK/);
  });

  it("a PASS edge is always PASS — no independent edge, no opinion", () => {
    const r = convictionTier({ calibratedProbability: 0.8, edgeDecision: "PASS", clvBeatCloseRate: 0.9 });
    expect(r.tier).toBe("PASS");
    expect(r.reasons.join(" ")).toMatch(/PASS/);
  });

  it("missing CLV history blocks CONVICTION (no claim without proof we beat the close)", () => {
    const nullClv = convictionTier({ calibratedProbability: 0.7, edgeDecision: "SPEAK", clvBeatCloseRate: null });
    expect(nullClv.tier).toBe("LEAN");
    expect(nullClv.reasons.join(" ")).toMatch(/no closing-line-value history/);

    const undefClv = convictionTier({ calibratedProbability: 0.7, edgeDecision: "SPEAK" });
    expect(undefClv.meetsConvictionBar).toBe(false);
    expect(undefClv.reasons.join(" ")).toMatch(/no closing-line-value history/);
  });

  it("a weak CLV beat-rate blocks CONVICTION", () => {
    const r = convictionTier({ calibratedProbability: 0.7, edgeDecision: "SPEAK", clvBeatCloseRate: 0.4 });
    expect(r.tier).toBe("LEAN");
    expect(r.reasons.join(" ")).toMatch(/beat-rate/);
  });

  it("below break-even is PASS even with a SPEAK edge (not playable)", () => {
    const r = convictionTier({ calibratedProbability: 0.5, edgeDecision: "SPEAK", clvBeatCloseRate: 0.6 });
    expect(r.tier).toBe("PASS");
  });

  it("treats a non-finite probability as 0 → PASS (a missing calibration can never sneak in)", () => {
    const r = convictionTier({ calibratedProbability: Number.NaN, edgeDecision: "SPEAK", clvBeatCloseRate: 0.9 });
    expect(r.tier).toBe("PASS");
    expect(r.expectedWinRate).toBe(0);
  });

  it("summarizeConviction tallies a slate across tiers", () => {
    const results: ConvictionResult[] = [
      convictionTier({ calibratedProbability: 0.7, edgeDecision: "SPEAK", clvBeatCloseRate: 0.6 }), // CONVICTION
      convictionTier({ calibratedProbability: 0.6, edgeDecision: "SPEAK", clvBeatCloseRate: 0.6 }), // LEAN
      convictionTier({ calibratedProbability: 0.5, edgeDecision: "PASS" }), // PASS
    ];
    expect(summarizeConviction(results)).toEqual({ conviction: 1, lean: 1, pass: 1 });
  });
});
