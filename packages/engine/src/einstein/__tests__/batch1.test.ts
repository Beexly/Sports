import { describe, it, expect } from "vitest";
import { computeFrameDistortions, observerAgreement, type ObserverFrame, type FrameBelief } from "../observer-frame.js";
import { evaluateLightCone, familiesInCone, type ShockTimeline } from "../information-light-cone.js";
import { roleStateLevel, fleshStateDelta, type FleshStateVector } from "../flesh-state-vector.js";

describe("Market Relativity Tensor", () => {
  const frames: ObserverFrame[] = [
    { id: "pinnacle", kind: "book", clockSkewMs: 0, latencyMs: 10_000, liquidityProxy: 0.9, sourceReliability: 0.95, updateCadenceMs: 5_000 },
    { id: "softbook", kind: "book", clockSkewMs: 0, latencyMs: 8 * 60_000, liquidityProxy: 0.2, sourceReliability: 0.5, updateCadenceMs: 120_000, distortionTraits: ["public-team shading"] },
    { id: "twitter", kind: "attention", clockSkewMs: 0, latencyMs: 0, liquidityProxy: 0, sourceReliability: 0.1, updateCadenceMs: 1000 },
  ];
  const beliefs: FrameBelief[] = [
    { frameId: "pinnacle", marketKey: "total", outcome: "OVER", impliedProb: 0.52, timestamp: "t" },
    { frameId: "softbook", marketKey: "total", outcome: "OVER", impliedProb: 0.60, timestamp: "t" },
    { frameId: "twitter", marketKey: "total", outcome: "OVER", impliedProb: 0.9, timestamp: "t" }, // ignored (attention)
  ];

  it("flags the divergent low-liquidity/high-latency frame and excludes attention", () => {
    const { distortions, invariants } = computeFrameDistortions(beliefs, frames);
    expect(distortions.some((d) => d.frameId === "softbook")).toBe(true);
    expect(distortions.some((d) => d.frameId === "twitter")).toBe(false);
    expect(distortions[0]!.distortionReason).toBe("latency");
    expect(invariants[0]!.nFrames).toBe(2);
    expect(observerAgreement(invariants[0]!)).toBeLessThan(1);
  });
});

describe("Information Light Cone", () => {
  const timeline: ShockTimeline = {
    eventId: "wr1-out",
    eventType: "inactive",
    eventTime: "2024-09-08T16:30:00Z",
    sourceFirstSeenTime: "2024-09-08T16:35:00Z",
    sourceConfirmedTime: "2024-09-08T16:40:00Z",
    firstMarketReactionTime: "2024-09-08T16:45:00Z",
    marketFamilyAbsorptionTime: { player_props: "2024-09-08T17:10:00Z", spread: "2024-09-08T16:50:00Z" },
  };

  it("is inside the window when knowable and the family is un-absorbed", () => {
    const v = evaluateLightCone(timeline, { decisionTime: "2024-09-08T16:42:00Z", marketFamily: "player_props" });
    expect(v.status).toBe("inside_window");
    expect(v.knowableAtDecision).toBe(true);
    expect(v.tradableWindowMs).toBeGreaterThan(0);
  });

  it("is outside the cone (not knowable) before the source existed — fail closed", () => {
    const v = evaluateLightCone(timeline, { decisionTime: "2024-09-08T16:33:00Z", marketFamily: "player_props" });
    expect(v.status).toBe("outside");
    expect(v.knowableAtDecision).toBe(false);
  });

  it("is contaminated when used data is after the decision time", () => {
    const v = evaluateLightCone(timeline, { decisionTime: "2024-09-08T16:42:00Z", marketFamily: "player_props", usedDataTimestamps: ["2024-09-08T16:55:00Z"] });
    expect(v.status).toBe("contaminated");
  });

  it("is absorbed (no window) after the family priced it", () => {
    const v = evaluateLightCone(timeline, { decisionTime: "2024-09-08T17:15:00Z", marketFamily: "player_props" });
    expect(v.status).toBe("inside_absorbed");
    expect(v.tradableWindowMs).toBe(0);
  });

  it("separates families inside vs still outside the price", () => {
    const { inside, outside } = familiesInCone(timeline, "2024-09-08T16:52:00Z", ["spread", "player_props"]);
    expect(inside).toContain("spread"); // absorbed by 16:50
    expect(outside).toContain("player_props"); // not until 17:10
  });
});

describe("Flesh State Vector", () => {
  const rb = (over: Partial<FleshStateVector> = {}): FleshStateVector => ({
    player: "RB1", team: "KC", position: "RB", snapProbability: 0.4, routeProbability: 0.3, targetEarningRate: 0.1,
    carryShare: 0.35, redZoneShare: 0.3, explosiveTail: 0.1, gameScriptElasticity: 0.5, injuryFragility: 0.2,
    coachingTrust: 0.6, replacementPressure: 0.4, publicAttention: 0.3, ...over,
  });

  it("detects a role-state transition with usage drivers", () => {
    const before = rb({ snapProbability: 0.35, carryShare: 0.25, targetEarningRate: 0.08 });
    const after = rb({ snapProbability: 0.8, carryShare: 0.7, targetEarningRate: 0.2, redZoneShare: 0.6 }); // RB1 out → backup ascends
    const d = fleshStateDelta(before, after);
    expect(d.transitioned).toBe(true);
    expect(d.toLevel).toBeGreaterThan(d.fromLevel);
    expect(d.drivers.some((x) => x.field === "carryShare")).toBe(true);
  });

  it("bounds the role-state level to 1..5", () => {
    expect(roleStateLevel(rb({ snapProbability: 0, carryShare: 0, targetEarningRate: 0, redZoneShare: 0 }))).toBe(1);
    expect(roleStateLevel(rb({ snapProbability: 1, carryShare: 1, targetEarningRate: 1, redZoneShare: 1 }))).toBe(5);
  });
});
