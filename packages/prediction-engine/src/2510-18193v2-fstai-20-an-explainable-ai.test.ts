/**
 * Vitest suite for arXiv:2510.18193v2 (FST.ai 2.0: An Explainable AI Ecosystem for Fair, Fast, and Inclusive Decision-Making in Olympic and Paralympic Taekwondo).
 * Gate: Adopt the credal pick gate only if backtesting on the 2024 season shows >=2pp ROI improvement on auto-posted picks vs unfiltered posting AND >=60% of picks still clear the gate; REJECT if the interval estimates are miscalibrated.
 */
import { describe, it, expect } from "vitest";
import { shouldPublish, policyRoi, tuneAbstention, AbstentionInputs } from "./2510-18193v2-fstai-20-an-explainable-ai";

describe("2510-18193v2 GSE abstention policy", () => {
  it("publishes only consensus games with cost-aware edge", () => {
    expect(shouldPublish({ agreement: 0.9, edge: 0.06, cost: 0.02 }, 0.75, 0.02)).toBe(true);
    expect(shouldPublish({ agreement: 0.5, edge: 0.06, cost: 0.02 }, 0.75, 0.02)).toBe(false);
    expect(shouldPublish({ agreement: 0.9, edge: 0.03, cost: 0.02 }, 0.75, 0.02)).toBe(false);
    expect(() => shouldPublish({ agreement: 2, edge: 0.1, cost: 0 }, 0.5, 0)).toThrow();
  });
  it("tuning maximizes long-run ROI, not volume", () => {
    const games: AbstentionInputs[] = [
      { agreement: 0.9, edge: 0.08, cost: 0.02 },
      { agreement: 0.9, edge: 0.08, cost: 0.02 },
      { agreement: 0.6, edge: 0.03, cost: 0.02 },
      { agreement: 0.55, edge: 0.025, cost: 0.02 },
      { agreement: 0.6, edge: 0.07, cost: 0.02 }, // decent edge, low agreement
    ];
    const t = tuneAbstention(games, [0.5, 0.8], [0.0, 0.04]);
    expect(t.roi).toBeCloseTo(0.06, 10);
    expect(t.agreeFloor).toBe(0.8);
    expect(Number.isNaN(policyRoi([], 0.9, 0.5))).toBe(true);
  });
});
