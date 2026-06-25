import { describe, it, expect } from "vitest";
import { computeScarcityCurvature, valueAtRank, scarcityCurve, type ScarcityInputs } from "../scarcity-curvature.js";
import { detectStandardPhaseTransition, detectDecisionPhaseTransition } from "../decision-phase-transition.js";
import { computeBRI } from "../belief-refractive-index.js";
import { computeActionHalfLife, SURFACE_DECAY_PRIORS } from "../action-half-life.js";
import { mapMinefield, type MinefieldInput } from "../anti-edge-minefield.js";

describe("Scarcity Curvature", () => {
  const baseQB: ScarcityInputs = { position: "QB", format: "standard", playerRank: 8, replacementRank: 14, benchDepth: 5, waiverPoolQuality: 0.5, byeWeekPressure: 0.3, playoffContext: 0.5 };
  it("value declines with rank", () => {
    expect(valueAtRank(1, 0.1)).toBeGreaterThan(valueAtRank(10, 0.1));
  });
  it("superflex sharpens QB scarcity vs 1-QB", () => {
    const oneQB = computeScarcityCurvature(baseQB);
    const superflex = computeScarcityCurvature({ ...baseQB, format: "superflex" });
    expect(superflex.replacementCliff).toBeGreaterThan(oneQB.replacementCliff);
    expect(superflex.actionImpact).toBeGreaterThan(oneQB.actionImpact);
  });
  it("samples a monotonically declining curve", () => {
    const c = scarcityCurve(0.12, 5);
    expect(c[0]!).toBeGreaterThan(c[4]!);
  });
});

describe("Decision Phase Transition", () => {
  it("detects a snap-share jump into bell-cow territory", () => {
    const r = detectStandardPhaseTransition("snap_share", 0.6, 0.85);
    expect(r.crossed).toBe(true);
    expect(r.crossingLabel).toBe("bell_cow");
    expect(r.direction).toBe("up");
  });
  it("detects ownership crossing into the duplication trap", () => {
    expect(detectStandardPhaseTransition("dfs_ownership", 0.3, 0.5).crossingLabel).toBe("duplication_trap");
  });
  it("reports no crossing when the metric stays in its phase", () => {
    expect(detectDecisionPhaseTransition({ metric: "route_rate", previous: 0.8, current: 0.85, thresholds: [{ at: 0.9, crossingLabel: "stable_role" }] }).crossed).toBe(false);
  });
});

describe("Belief Refractive Index", () => {
  it("classifies an underreaction (observed below expected)", () => {
    expect(computeBRI({ observer: "analyst", shockType: "wr1_out", observedBeliefMove: 0.1, causallyExpectedBeliefMove: 0.4 }).classification).toBe("UNDERREACTION");
  });
  it("classifies a narrative-driven overreaction", () => {
    expect(computeBRI({ observer: "public", shockType: "rookie_hype", observedBeliefMove: 0.6, causallyExpectedBeliefMove: 0.2, narrativeDriven: true }).classification).toBe("NARRATIVE_DISTORTED");
  });
  it("classifies an unstable move as chaotic", () => {
    expect(computeBRI({ observer: "dfs_ownership", shockType: "late_news", observedBeliefMove: 0.3, causallyExpectedBeliefMove: 0.3, volatilityOfMove: 0.8 }).classification).toBe("CHAOTIC");
  });
});

describe("Action Half-Life", () => {
  it("a stale prop dies in minutes; dynasty lasts months", () => {
    const prop = computeActionHalfLife({ surface: "stale_prop", decisionValueT0: 1, decayPerHour: SURFACE_DECAY_PRIORS.stale_prop });
    const dyn = computeActionHalfLife({ surface: "dynasty", decisionValueT0: 1, decayPerHour: SURFACE_DECAY_PRIORS.dynasty });
    expect(prop.tier).toBe("minutes");
    expect(dyn.tier).toBe("months");
  });
  it("a hard lock caps the effective window below the half-life", () => {
    const r = computeActionHalfLife({ surface: "dfs_salary", decisionValueT0: 1, decayPerHour: SURFACE_DECAY_PRIORS.dfs_salary, hardLockInHours: 3 });
    expect(r.effectiveWindowHours).toBe(3);
  });
});

describe("Anti-Edge Minefield", () => {
  it("erodes an apparent edge through accumulated frictions", () => {
    const i: MinefieldInput = { candidateEdge: 0.5, mines: [{ kind: "friction_spread_vig_latency", pressure: 0.4 }, { kind: "small_sample", pressure: 0.3 }] };
    const r = mapMinefield(i);
    expect(r.survivingEdge).toBeLessThan(0.5);
    expect(r.triggeredMines[0]!.loss).toBeGreaterThanOrEqual(r.triggeredMines[1]!.loss);
  });
  it("kills an edge outright on a fatal ghost-similarity mine", () => {
    const r = mapMinefield({ candidateEdge: 0.9, mines: [{ kind: "ghost_similarity", pressure: 0.7 }] });
    expect(r.survives).toBe(false);
    expect(r.fatalMine).toBe("ghost_similarity");
    expect(r.survivingEdge).toBe(0);
  });
});
