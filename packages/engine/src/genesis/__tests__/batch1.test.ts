import { describe, it, expect } from "vitest";
import { computeRBET, type RBETInput } from "../reality-belief-entanglement-tensor.js";
import { computeDecisionLeverage, rankDecisionLeverage, type DecisionLeverageFieldInputs } from "../decision-leverage-field.js";
import { checkOpportunityConservation, findConservationViolations, detectRoleMassMisallocation } from "../opportunity-conservation-tensor.js";
import { invertObserverMind } from "../observer-mind-inversion.js";
import { featureSimilarity, assessGhostSimilarity, type GhostFeatureCluster } from "../ghost-similarity-physics.js";

describe("Reality-Belief Entanglement Tensor", () => {
  const input: RBETInput = {
    entity: "WR2", trueRoleState: 0.7,
    readings: [
      { observer: "prop_market", impliedRoleState: 0.68, dataQuality: 0.9 },
      { observer: "analyst", impliedRoleState: 0.45, dataQuality: 0.8 },
      { observer: "dfs_ownership", impliedRoleState: 0.92, dataQuality: 0.7 },
    ],
  };
  it("identifies the lagging and over-reacting observers", () => {
    const r = computeRBET(input);
    expect(r.laggards).toContain("analyst");        // 0.45 vs 0.70 truth
    expect(r.overreactors).toContain("dfs_ownership"); // 0.92 vs 0.70 truth
    expect(r.crossSurfaceContradiction).toBeGreaterThan(0);
  });
  it("finds the maximum disagreement pair", () => {
    const r = computeRBET(input);
    expect([r.maxDisagreementPair!.a, r.maxDisagreementPair!.b].sort()).toEqual(["analyst", "dfs_ownership"]);
  });
});

describe("Decision Leverage Field", () => {
  const hi: DecisionLeverageFieldInputs = { signalId: "route_jump", action: "ADD", pDecisionChange: 0.8, utilityGain: 0.7, proofQuality: 0.9, timeSensitivity: 0.8, repeatability: 0.8, cost: 0.2, rightsRisk: 0.1, latency: 0.1, complexity: 0.1, falseConfidenceRisk: 0.05 };
  it("classes a proof-backed fantasy signal as high leverage and tags the action class", () => {
    const r = computeDecisionLeverage(hi);
    expect(r.classification).toBe("high_leverage");
    expect(r.actionClass).toBe("fantasy");
  });
  it("classes a coach-speak BET signal as negative leverage", () => {
    const r = computeDecisionLeverage({ ...hi, signalId: "coach_quote", action: "BET", proofQuality: 0.2, falseConfidenceRisk: 0.9, utilityGain: 0.4, pDecisionChange: 0.5 });
    expect(r.classification).toBe("negative_leverage");
    expect(r.actionClass).toBe("betting");
  });
  it("ranks signals by leverage", () => {
    const r = rankDecisionLeverage([hi, { ...hi, signalId: "weak", utilityGain: 0.05 }]);
    expect(r[0]!.signalId).toBe("route_jump");
  });
});

describe("Opportunity Conservation Tensor", () => {
  it("flags missing role mass when redistribution undershoots the removal", () => {
    const r = checkOpportunityConservation({ channel: "targets", removed: 0.25, redistributed: 0.05, strategyShift: 0.02, efficiencyDecay: 0.02, opponentEffect: 0.01 });
    expect(r.flag).toBe("missing_role_mass");
  });
  it("flags over-allocation (fake backup boost)", () => {
    const r = checkOpportunityConservation({ channel: "carries", removed: 0.2, redistributed: 0.45, strategyShift: 0.0, efficiencyDecay: 0.0, opponentEffect: 0.0 });
    expect(r.flag).toBe("over_allocated");
  });
  it("returns violations worst-first and detects the over-credited backup vs ignored sibling", () => {
    const v = findConservationViolations([
      { channel: "targets", removed: 0.3, redistributed: 0.05, strategyShift: 0.0, efficiencyDecay: 0.0, opponentEffect: 0.0 },
      { channel: "routes", removed: 0.2, redistributed: 0.18, strategyShift: 0.0, efficiencyDecay: 0.0, opponentEffect: 0.0 },
    ]);
    expect(v[0]!.channel).toBe("targets");
    const m = detectRoleMassMisallocation({ backup: 0.6, sibling: 0.1 }, { backup: 0.35, sibling: 0.3 });
    expect(m.find((x) => x.player === "backup")!.verdict).toBe("over_credited");
    expect(m.find((x) => x.player === "sibling")!.verdict).toBe("under_credited");
  });
});

describe("Observer Mind Inversion", () => {
  it("infers a stale DFS salary mind", () => {
    const m = invertObserverMind({ observer: "dfs_salary", normalizedValue: 0.4, referenceValue: 0.7, dataQuality: 0.9, staleAsOfMin: 240 });
    expect(m.bias).toBe("stale");
    expect(m.confidence).toBeLessThan(0.9);
  });
  it("infers an overreacting ownership mind", () => {
    expect(invertObserverMind({ observer: "dfs_ownership", normalizedValue: 0.85, referenceValue: 0.5, dataQuality: 0.8 }).bias).toBe("overreacting");
  });
  it("infers a name-value-anchored analyst mind", () => {
    expect(invertObserverMind({ observer: "analyst_rank", normalizedValue: 0.7, referenceValue: 0.45, dataQuality: 0.8, nameValueWeight: 0.8 }).bias).toBe("name_value_anchored");
  });
});

describe("Ghost Similarity Physics", () => {
  const cluster: GhostFeatureCluster = { id: "td-spike", centroid: [0.9, 0.1, 0.1, 0.8], failureSeverity: 1, marketFamily: "rb_rush", recencyWeight: 1, sampleReliability: 1 };
  it("computes feature-vector similarity", () => {
    expect(featureSimilarity([0.9, 0.1, 0.1, 0.8], [0.9, 0.1, 0.1, 0.8])).toBe(1);
  });
  it("suppresses a candidate that resembles a dead-edge cluster", () => {
    expect(assessGhostSimilarity({ features: [0.88, 0.12, 0.1, 0.79], marketFamily: "rb_rush" }, [cluster]).suppressed).toBe(true);
  });
  it("does not suppress a structurally different candidate", () => {
    expect(assessGhostSimilarity({ features: [0.2, 0.8, 0.7, 0.1], marketFamily: "wr_rec" }, [cluster]).suppressed).toBe(false);
  });
});
