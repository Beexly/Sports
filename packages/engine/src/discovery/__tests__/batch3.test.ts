import { describe, it, expect } from "vitest";
import { computeDLI, rankByDLI, type DLIInputs } from "../decision-leverage-index.js";
import { shapeSimilarity, assessAgainstGhosts, type GhostCluster } from "../ghost-economy.js";
import { rankByEDY, type DiscoveryYieldInputs } from "../expected-discovery-yield.js";
import { recommendSensors } from "../sensor-placement.js";
import { simulateTimeline, type BaseScenario } from "../counterfactual-market-theater.js";
import { runDiscoveryCycle, type CouncilInput } from "../scientific-discovery-council.js";

describe("Decision Leverage Index", () => {
  const hi: DLIInputs = { pDecisionChanges: 0.8, evCorrectChange: 0.8, proofQuality: 0.9, timeSensitivity: 0.9, repeatability: 0.9, cost: 0.2, rightsRisk: 0.1, latency: 0.1, complexity: 0.1, falseConfidenceRisk: 0.05 };
  it("scores a high-leverage, proof-backed signal as high leverage", () => {
    expect(computeDLI(hi).classification).toBe("high_leverage");
  });
  it("scores an unproven, contamination-risky signal as negative leverage", () => {
    expect(computeDLI({ ...hi, proofQuality: 0.2, falseConfidenceRisk: 0.9, evCorrectChange: 0.4, pDecisionChanges: 0.5 }).classification).toBe("negative_leverage");
  });
  it("ranks signals by leverage", () => {
    const r = rankByDLI([{ id: "a", inputs: hi }, { id: "b", inputs: { ...hi, evCorrectChange: 0.1 } }]);
    expect(r[0]!.id).toBe("a");
  });
});

describe("Ghost Economy", () => {
  const cluster: GhostCluster = { id: "g1", shape: { marketFamily: "total", side: "UNDER", structure: "early_season" }, failureReason: "settlement_negative", severity: 1, recencyWeight: 1 };
  it("computes structural similarity and suppresses a strong resemblance", () => {
    expect(shapeSimilarity({ marketFamily: "total", side: "UNDER", structure: "early_season" }, cluster.shape)).toBe(1);
    expect(assessAgainstGhosts({ marketFamily: "total", side: "UNDER", structure: "early_season" }, [cluster]).suppressed).toBe(true);
    expect(assessAgainstGhosts({ marketFamily: "player_rush_yds", side: "UNDER", structure: "high_line" }, [cluster]).suppressed).toBe(false);
  });
});

describe("Expected Discovery Yield", () => {
  it("ranks experiments by yield and flags net-negative ones", () => {
    const exps: DiscoveryYieldInputs[] = [
      { id: "dense_week", deltaPredictiveInformation: 0.4, deltaCausalCertainty: 0.3, deltaCompression: 0.2, deltaTradabilityCertainty: 0.2, deltaGateUnlockProbability: 0.3, deltaFalseConfidenceRisk: 0.05, dataCost: 0.6, rightsRisk: 0.0, engineeringTime: 0.2, operationalComplexity: 0.2 },
      { id: "noisy_feed", deltaPredictiveInformation: 0.05, deltaCausalCertainty: 0.0, deltaCompression: 0.0, deltaTradabilityCertainty: 0.0, deltaGateUnlockProbability: 0.0, deltaFalseConfidenceRisk: 0.4, dataCost: 0.5, rightsRisk: 0.3, engineeringTime: 0.3, operationalComplexity: 0.3 },
    ];
    const r = rankByEDY(exps);
    expect(r[0]!.id).toBe("dense_week");
    expect(r.find((x) => x.id === "noisy_feed")!.edy).toBeLessThanOrEqual(0);
  });
});

describe("Sensor Placement", () => {
  it("ranks sensors by discovery improvement per cost, with a gap bonus", () => {
    const r = recommendSensors([
      { id: "dense_snapshots", description: "15m odds", targetGap: "book_lag", expectedDiscoveryImprovement: 0.9, cost: 0.6, rightsRisk: 0 },
      { id: "social_feed", description: "tweets", targetGap: "attention", expectedDiscoveryImprovement: 0.4, cost: 0.3, rightsRisk: 0.4 },
    ], ["book_lag"]);
    expect(r[0]!.id).toBe("dense_snapshots");
  });
});

describe("Counterfactual Market Theater", () => {
  const base: BaseScenario = {
    shockType: "wr1_inactive", shockTimeMin: 0,
    books: [{ book: "pinnacle", lagMin: 2 }, { book: "softbook", lagMin: 20 }],
    families: [{ family: "spread", lagMin: 3 }, { family: "player_props", lagMin: 25 }],
  };
  it("generates a timeline with candidate windows and liquidity-mirage trap under thin liquidity", () => {
    const t = simulateTimeline(base, { kind: "thinner_liquidity", factor: 2 });
    expect(t.candidateWindows.length).toBeGreaterThan(0);
    expect(t.traps.join(" ")).toMatch(/liquidity mirage/);
  });
  it("quarantines a false-rumor branch (no public expression)", () => {
    const t = simulateTimeline(base, { kind: "false_rumor" });
    expect(t.note).toMatch(/quarantined/i);
  });
});

describe("Scientific Discovery Council", () => {
  const ghost: GhostCluster = { id: "g1", shape: { marketFamily: "total", side: "UNDER", structure: "early_season" }, failureReason: "settlement_negative", severity: 1, recencyWeight: 1 };
  const input: CouncilInput = {
    observation: "team total moved but receiver props lagged",
    theories: [
      { id: "A", name: "derivative-prop-lag", shape: { marketFamily: "player_reception_yds", side: "OVER", structure: "derivative_lag" },
        entrant: { id: "A", name: "derivative-prop-lag", oosGain: 0.6, compressionGain: 0.5, causalPlausibility: 0.5, tradabilityExplanation: 0.4, complexity: 0.3, instabilityRisk: 0.1, leakageRisk: 0, rightsRisk: 0, ghostSimilarity: 0 },
        evidence: { predictiveGain: 0.5, causalExplanationGain: 0.4, compressionGain: 0.5, tradabilityGain: 0.3, complexityPenalty: 0.2, dataRightsRisk: 0.05, instabilityPenalty: 0.1, leakageRisk: 0, seasonsSurvived: 3, marketFamiliesSurvived: 2, booksSurvived: 2, outOfSampleSurvived: true } },
      { id: "B", name: "early-season-under-redux", shape: { marketFamily: "total", side: "UNDER", structure: "early_season" },
        entrant: { id: "B", name: "early-season-under-redux", oosGain: 0.4, compressionGain: 0.3, causalPlausibility: 0.2, tradabilityExplanation: 0.2, complexity: 0.3, instabilityRisk: 0.2, leakageRisk: 0, rightsRisk: 0, ghostSimilarity: 0 },
        evidence: { predictiveGain: 0.3, causalExplanationGain: 0.1, compressionGain: 0.2, tradabilityGain: 0.1, complexityPenalty: 0.3, dataRightsRisk: 0.05, instabilityPenalty: 0.2, leakageRisk: 0, seasonsSurvived: 1, marketFamiliesSurvived: 1, booksSurvived: 1, outOfSampleSurvived: false } },
    ],
    experiments: [
      { id: "injury_replay", deltaPredictiveInformation: 0.4, deltaCausalCertainty: 0.4, deltaCompression: 0.2, deltaTradabilityCertainty: 0.2, deltaGateUnlockProbability: 0.2, deltaFalseConfidenceRisk: 0.05, dataCost: 0.4, rightsRisk: 0.1, engineeringTime: 0.2, operationalComplexity: 0.2 },
    ],
    ghostClusters: [ghost],
    winnerTradability: { rawEdge: 0.06, vig: 0.01, spread: 0.005, latencyCost: 0.005, executeMin: 3, windowMin: 25, limitProxy: 0.7, correlationPenalty: 0.005, modelError: 0.005, dataQualityOk: true, publicationDelayCost: 0.005 },
    rightsStatus: "cleared",
    ontologyProposal: { name: "Derivative Echo Lag", compressionGain: 0.5, survivesFalsification: true },
  };

  it("runs a full discovery cycle: 2 theories, ghost-buries the redux, selects an experiment, accepts a compressing ontology term", () => {
    const r = runDiscoveryCycle(input);
    expect(input.theories.length).toBeGreaterThanOrEqual(2);
    expect(r.winner!.id).toBe("A");
    expect(r.buried.map((b) => b.id)).toContain("B"); // resembles the early-season-under ghost
    expect(r.cheapestExperiment!.id).toBe("injury_replay");
    expect(r.tradabilityStatus).toBe("EXECUTABLE_SHADOW");
    expect(r.theoryStatuses["B"]).toBe("GHOST"); // OOS failure
    expect(r.ontologyDecision).toBe("accepted");
    expect(r.researchTasks.length).toBeGreaterThan(0);
  });

  it("rejects an ontology term that adds language but not compression", () => {
    const r = runDiscoveryCycle({ ...input, ontologyProposal: { name: "Fancy Word", compressionGain: 0, survivesFalsification: true } });
    expect(r.ontologyDecision).toBe("rejected");
  });
});
