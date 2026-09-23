import { describe, expect, it } from "vitest";

import {
  ENABLED,
  evaluateDecisionUtilityEnsemble,
  type DecisionUtilityMember,
} from "@/lib/calibration/2406-03321v2-decision-utility-ensemble";

const member = (
  modelId: string,
  probability: number,
  spreadUtility: number,
  totalUtility: number,
): DecisionUtilityMember => ({
  modelId,
  probability,
  utilityByMarket: { SPREAD: spreadUtility, MONEYLINE: 0, TOTAL: totalUtility },
  accuracyByRegion: { LOW: 0.5, MIDDLE: 0.5, HIGH: 0.5 },
});

describe("2406.03321v2 decision-utility ensemble", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("changes weights by market without changing model probabilities", () => {
    const members = [member("elo", 0.6, 0.2, -0.1), member("epa", 0.55, -0.1, 0.2)];
    const spread = evaluateDecisionUtilityEnsemble({
      members,
      market: "SPREAD",
      region: "MIDDLE",
      temperature: 0.1,
    });
    const total = evaluateDecisionUtilityEnsemble({
      members,
      market: "TOTAL",
      region: "MIDDLE",
      temperature: 0.1,
    });

    expect(spread.weights.elo).toBeGreaterThan(spread.weights.epa);
    expect(total.weights.epa).toBeGreaterThan(total.weights.elo);
    expect(spread.probability).not.toBe(total.probability);
  });

  it("returns effective sample size one for one member", () => {
    const result = evaluateDecisionUtilityEnsemble({
      members: [member("only", 0.57, 0, 0)],
      market: "MONEYLINE",
      region: "HIGH",
      temperature: 1,
    });

    expect(result.effectiveSampleSize).toBeCloseTo(1, 12);
    expect(result.weights.only).toBeCloseTo(1, 12);
  });
});
