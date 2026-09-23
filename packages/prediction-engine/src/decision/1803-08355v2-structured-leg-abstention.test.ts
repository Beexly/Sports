// Tests for decision/1803-08355v2-structured-leg-abstention.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  greedyLegAbstention,
  rejectHeadVoids,
  tuneAbstentionCosts,
  injuryNodeAbstention,
  abstentionAwareInjurySignal,
  legAbstentionGatePasses,
  injuryPipelineGatePasses,
} from "./1803-08355v2-structured-leg-abstention.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEGS = [
  { id: "a", edge: 0.10, stakeCost: 0.05 },
  { id: "b", edge: 0.01, stakeCost: 0.05 },
  { id: "c", edge: -0.02, stakeCost: 0.05 },
];

describe("greedyLegAbstention (1803.08355v2)", () => {
  it("drops legs with edge < K_A * stakeCost", () => {
    const { kept, dropped } = greedyLegAbstention(LEGS, { kA: 1.0, cA: 0.02 });
    expect(kept.map((l) => l.id)).toEqual(["a"]);
    expect(dropped.map((l) => l.id).sort()).toEqual(["b", "c"]);
  });
  it("keeps all non-negative-edge legs when K_A = 0", () => {
    // K_A = 0 keeps every leg with edge >= 0; the negative-edge leg is
    // still (correctly) dropped.
    const { kept, dropped } = greedyLegAbstention(LEGS, { kA: 0, cA: 0 });
    expect(kept.map((l) => l.id)).toEqual(["a", "b"]);
    expect(dropped.map((l) => l.id)).toEqual(["c"]);
  });
});

describe("rejectHeadVoids", () => {
  it("voids legs below the reject-head cost as reduced-stake singles", () => {
    const { voided, kept } = rejectHeadVoids(LEGS, { kA: 1.0, cA: 0.02 });
    expect(voided.map((l) => l.id).sort()).toEqual(["b", "c"]);
    expect(kept.map((l) => l.id)).toEqual(["a"]);
  });
});

describe("tuneAbstentionCosts", () => {
  it("learns costs end-to-end against the downstream objective", () => {
    // Objective: sum of kept edges minus a penalty per kept leg (stake drag).
    const objective = (kept: typeof LEGS, dropped: typeof LEGS) =>
      kept.reduce((a, l) => a + l.edge, 0) - 0.03 * kept.length;
    const best = tuneAbstentionCosts(LEGS, objective, mulberry32(3), 64);
    // The learned rule should drop the negative-edge leg at least.
    const { dropped } = greedyLegAbstention(LEGS, best.costs);
    expect(dropped.map((l) => l.id)).toContain("c");
    expect(best.objective).toBeGreaterThan(-Infinity);
  });
});

describe("injuryNodeAbstention", () => {
  it("abstains on low-confidence nodes and builds a graceful signal", () => {
    const nodes = [
      { player: "QB1", aspect: "injury" as const, polarity: 0.9, confidence: 0.8 },
      { player: "WR2", aspect: "practice-status" as const, polarity: 0.4, confidence: 0.3 },
    ];
    const { accepted, abstained } = injuryNodeAbstention(nodes, 0.5);
    expect(accepted.map((n) => n.player)).toEqual(["QB1"]);
    expect(abstained.map((n) => n.player)).toEqual(["WR2"]);
    const sig = abstentionAwareInjurySignal(accepted, abstained, 0.25);
    // 0.9 accepted, 0.4 abstained at weight 0.25 -> (0.9 + 0.1) / 1.25 = 0.8
    expect(sig).toBeCloseTo(0.8, 10);
    expect(abstentionAwareInjurySignal([], [])).toBe(0);
  });
});

describe("gates", () => {
  it("leg gate encodes +5pp ROI / 300 slips / p<0.05", () => {
    expect(legAbstentionGatePasses(5.1, 300, 0.04)).toBe(true);
    expect(legAbstentionGatePasses(4.9, 300, 0.04)).toBe(false);
    expect(legAbstentionGatePasses(6.0, 299, 0.04)).toBe(false);
    expect(legAbstentionGatePasses(6.0, 400, 0.06)).toBe(false);
  });
  it("injury gate encodes F1>=0.60 and MAE>=0.15", () => {
    expect(injuryPipelineGatePasses(0.62, 0.2)).toBe(true);
    expect(injuryPipelineGatePasses(0.59, 0.2)).toBe(false);
    expect(injuryPipelineGatePasses(0.62, 0.1)).toBe(false);
  });
});
