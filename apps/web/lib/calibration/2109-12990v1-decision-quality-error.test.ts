import { describe, expect, it } from "vitest";

import {
  occurrenceDQE,
  propensityTrimmed,
  teamSeasonDQE,
  dqeByType,
  treeMyopicDisagreement,
  treeValue,
} from "@/lib/calibration/2109-12990v1-decision-quality-error";

const D = (over: Partial<import("@/lib/calibration/2109-12990v1-decision-quality-error").CoachingDecision>) => ({
  team: "KC",
  season: 2024,
  type: "fourth-down" as const,
  propensity: 0.4,
  wpActual: 0.55,
  wpOptimal: 0.62,
  ...over,
});

describe("decision quality error (DQE)", () => {
  it("occurrence DQE is optimal-minus-actual, floored at zero", () => {
    expect(occurrenceDQE(D({}))).toBeCloseTo(0.07, 10);
    expect(occurrenceDQE(D({ wpActual: 0.7, wpOptimal: 0.6 }))).toBe(0);
  });

  it("propensity trimming fixes the overlap flaw", () => {
    const ds = [
      D({ propensity: 0.01 }),
      D({ propensity: 0.5 }),
      D({ propensity: 0.99 }),
    ];
    const kept = propensityTrimmed(ds, 0.05);
    expect(kept.length).toBe(1);
    expect(kept[0].propensity).toBe(0.5);
  });

  it("team-season DQE is the mean over occurrences", () => {
    const ds = [D({ wpOptimal: 0.6 }), D({ wpOptimal: 0.7 })]; // deltas 0.05, 0.15
    expect(teamSeasonDQE(ds)).toBeCloseTo(0.1, 10);
    expect(teamSeasonDQE([])).toBe(0);
  });

  it("dqeByType covers all four decision types", () => {
    const rows = dqeByType([D({ type: "timeout" }), D({ type: "timeout" })]);
    expect(rows.length).toBe(4);
    expect(rows.find((r) => r.type === "timeout")!.n).toBe(2);
    expect(rows.find((r) => r.type === "challenge")!.n).toBe(0);
  });

  it("tree valuation looks ahead; disagreement is measurable", () => {
    const leaf = (wp: number) => ({ wp });
    // Myopic prefers A (0.6 > 0.55) but the tree prefers B via better continuations.
    const nodeA = { wp: 0.6, children: [{ prob: 1, node: leaf(0.5) }] };
    const nodeB = { wp: 0.55, children: [{ prob: 1, node: leaf(0.8) }] };
    expect(treeValue(nodeA)).toBeCloseTo(0.5, 10);
    expect(treeValue(nodeB)).toBeCloseTo(0.8, 10);
    const disagreement = treeMyopicDisagreement([
      { myopic: [0.6, 0.55], tree: [0.5, 0.8] },
      { myopic: [0.6, 0.55], tree: [0.62, 0.5] },
    ]);
    expect(disagreement).toBe(0.5); // >= 10% gate on real data
  });
});
