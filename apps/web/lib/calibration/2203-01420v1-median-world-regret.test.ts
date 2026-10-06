import { describe, expect, it } from "vitest";

import {
  ENABLED,
  adversarialWorldSearch,
  leaveOneWorldOutFlipRate,
  maxRegret,
  medianRegret,
  percentileRegret,
  policyUnder,
  trimmedMeanRegret,
} from "@/lib/calibration/2203-01420v1-median-world-regret";

const W = (id: string, regret: number[]) => ({ id, version: "v1", seed: 1, regret });

describe("median-world regret aggregation", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("median is robust to one adversarial world where max is not", () => {
    const worlds = [
      W("a", [1, 5]),
      W("b", [1.2, 5.1]),
      W("c", [0.9, 4.9]),
      W("adversarial", [0, 100]), // planted to flip max-regret toward action 0
    ];
    // max-regret: action0 worst = max(1,1.2,0.9,0)=1.2; action1 worst = 100 -> picks 0.
    expect(policyUnder(worlds, 2, maxRegret)).toBe(0);
    // median-regret: action0 median ~1.05, action1 median ~5.05 -> picks 0 too here;
    // the point: median ignores the planted 100 while max is dominated by it.
    expect(medianRegret(worlds, 1)).toBeCloseTo(5.05, 10);
    expect(maxRegret(worlds, 1)).toBe(100);
  });

  it("median cuts scenario sensitivity vs max (injection experiment)", () => {
    // 5 worlds agree action 1 is best; one injected world disagrees loudly.
    const base = [1, 2, 3, 4, 5].map((i) => W("w" + i, [3, 1]));
    const injected = [...base, W("planted", [0, 50])];
    const maxFlip = leaveOneWorldOutFlipRate(injected, 2, maxRegret);
    const medFlip = leaveOneWorldOutFlipRate(injected, 2, medianRegret);
    expect(maxFlip.flipRate).toBeGreaterThan(medFlip.flipRate);
    expect(medFlip.fragile).toBe(false);
  });

  it("percentile and trimmed-mean variants behave", () => {
    const worlds = [W("a", [1, 9]), W("b", [2, 8]), W("c", [3, 7]), W("d", [4, 100])];
    expect(percentileRegret(worlds, 1, 0.75)).toBe(100);
    expect(trimmedMeanRegret(worlds, 1, 1)).toBeCloseTo(8, 10);
  });

  it("adversarial search finds a policy-flipping world when one exists", () => {
    // Base worlds disagree: median regrets tie at 2.0 -> policy 0 on the tie-break.
    const worlds = [W("a", [1, 3]), W("b", [3, 1])];
    expect(policyUnder(worlds, 2, medianRegret)).toBe(0);
    // Planted world: action 0 mediocre, action 1 excellent -> median flips to 1.
    const res = adversarialWorldSearch(worlds, 2, medianRegret, (rand) => [
      2.5 + rand() * 0.5,
      rand() * 0.5,
    ]);
    expect(res.worstFlip).toBe(true);
    expect(res.worstRegret.length).toBe(2);
  });
});
