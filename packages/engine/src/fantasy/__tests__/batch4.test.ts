import { describe, it, expect } from "vitest";
import { fantasyAutopsy, type FantasyAutopsyInput } from "../fantasy-autopsy.js";
import { rankFantasyExperiments, type FantasyExperimentInputs } from "../fantasy-experiment-governor.js";
import { runFantasyDiscoveryCycle, type FantasyCouncilInput } from "../fantasy-scientific-discovery-council.js";

describe("Fantasy Autopsy", () => {
  const base: FantasyAutopsyInput = {
    action: "ADD", roleImpliedValue: 0.7, marketBeliefAtDecision: 0.45, knowableAtDecision: true,
    ghostMatched: false, expectedFantasyPoints: 0.6, outcomeFantasyPoints: 0.7, varianceBand: 0.25,
  };
  it("a sound process with a good outcome is a deserved win (no corrective lesson)", () => {
    const r = fantasyAutopsy(base);
    expect(r.verdict).toBe("deserved_win");
    expect(r.emitsLesson).toBe(false);
  });
  it("a sound process that loses inside its variance band emits NO lesson", () => {
    const r = fantasyAutopsy({ ...base, outcomeFantasyPoints: 0.45 }); // delta -0.15, within 0.25
    expect(r.verdict).toBe("unlucky_loss");
    expect(r.emitsLesson).toBe(false);
  });
  it("an unsound process bailed out by variance is a lucky win (emits a lesson)", () => {
    const r = fantasyAutopsy({ ...base, ghostMatched: true, outcomeFantasyPoints: 0.8 });
    expect(r.verdict).toBe("lucky_win");
    expect(r.emitsLesson).toBe(true);
  });
  it("a non-knowable recommendation is never a deserved win", () => {
    const r = fantasyAutopsy({ ...base, knowableAtDecision: false, outcomeFantasyPoints: 0.9 });
    expect(r.verdict).toBe("lucky_win");
  });
  // --- audit regressions ---
  it("a sound process that loses BEYOND its variance band still emits NO lesson (process over outcome)", () => {
    const r = fantasyAutopsy({ ...base, expectedFantasyPoints: 0.6, varianceBand: 0.15, outcomeFantasyPoints: 0.40 }); // delta -0.20, outside 0.15
    expect(r.verdict).toBe("deserved_loss");
    expect(r.emitsLesson).toBe(false); // a single week can never move a weight
  });
  it("a FADE of a fairly-priced asset is NOT a sound process (fade needs genuine overpricing)", () => {
    // role 0.50 vs market 0.48 → gap +0.02 (not overpriced); fading it is not direction-sound.
    const r = fantasyAutopsy({ action: "SIT", roleImpliedValue: 0.5, marketBeliefAtDecision: 0.48, knowableAtDecision: true, ghostMatched: false, expectedFantasyPoints: 0.5, outcomeFantasyPoints: 0.7, varianceBand: 0.2 });
    expect(r.soundProcess).toBe(false);
  });
});

describe("Fantasy Experiment Governor", () => {
  it("ranks fantasy studies by yield and flags net-negative ones", () => {
    const exps: FantasyExperimentInputs[] = [
      { id: "waiver_lag", study: "waiver_lag", deltaDecisionsChanged: 0.5, deltaCausalCertainty: 0.3, deltaCompression: 0.2, deltaGateUnlockProbability: 0.2, deltaFalseConfidenceRisk: 0.05, dataCost: 0.3, rightsRisk: 0.1, engineeringTime: 0.2, operationalComplexity: 0.2 },
      { id: "premium_consensus_feed", deltaDecisionsChanged: 0.05, deltaCausalCertainty: 0, deltaCompression: 0, deltaGateUnlockProbability: 0, deltaFalseConfidenceRisk: 0.4, dataCost: 0.7, rightsRisk: 0.4, engineeringTime: 0.3, operationalComplexity: 0.3 },
    ];
    const r = rankFantasyExperiments(exps);
    expect(r[0]!.id).toBe("waiver_lag");
    expect(r.find((x) => x.id === "premium_consensus_feed")!.yield).toBeLessThanOrEqual(0);
  });
});

describe("Fantasy Scientific Discovery Council", () => {
  const input: FantasyCouncilInput = {
    observation: "WR2 route rate jumped and the prop confirmed, but ranks/roster% lagged",
    theories: [
      { id: "A", name: "silent-role-breakout", shape: { position: "WR", kind: "empty_route_trap", trigger: "route_rate_jump_confirmed" },
        entrant: { id: "A", name: "silent-role-breakout", oosGain: 0.6, compressionGain: 0.5, causalPlausibility: 0.5, tradabilityExplanation: 0.4, complexity: 0.3, instabilityRisk: 0.1, leakageRisk: 0, rightsRisk: 0, ghostSimilarity: 0 },
        evidence: { predictiveGain: 0.5, causalExplanationGain: 0.4, compressionGain: 0.5, tradabilityGain: 0.3, complexityPenalty: 0.2, dataRightsRisk: 0.05, instabilityPenalty: 0.1, leakageRisk: 0, seasonsSurvived: 3, marketFamiliesSurvived: 2, booksSurvived: 2, outOfSampleSurvived: true } },
      { id: "B", name: "td-spike-chase", shape: { position: "RB", kind: "td_spike_trap", trigger: "two_td_no_role" },
        entrant: { id: "B", name: "td-spike-chase", oosGain: 0.4, compressionGain: 0.3, causalPlausibility: 0.2, tradabilityExplanation: 0.2, complexity: 0.3, instabilityRisk: 0.2, leakageRisk: 0, rightsRisk: 0, ghostSimilarity: 0 },
        evidence: { predictiveGain: 0.45, causalExplanationGain: 0.1, compressionGain: 0.2, tradabilityGain: 0.1, complexityPenalty: 0.3, dataRightsRisk: 0.05, instabilityPenalty: 0.2, leakageRisk: 0, seasonsSurvived: 1, marketFamiliesSurvived: 1, booksSurvived: 1, outOfSampleSurvived: false } },
    ],
    experiments: [
      { id: "route_rate_breakout", deltaDecisionsChanged: 0.4, deltaCausalCertainty: 0.4, deltaCompression: 0.2, deltaGateUnlockProbability: 0.2, deltaFalseConfidenceRisk: 0.05, dataCost: 0.3, rightsRisk: 0.1, engineeringTime: 0.2, operationalComplexity: 0.2 },
    ],
    ghosts: [{ id: "g-td-spike", shape: { position: "RB", kind: "td_spike_trap", trigger: "two_td_no_role" }, severity: 1, recencyWeight: 1 }],
    winnerActionability: "ACTIONABLE_SHADOW",
    rightsStatus: "cleared",
    ontologyProposal: { name: "Silent Role Breakout", compressionGain: 0.5, survivesFalsification: true },
  };

  it("runs a full cycle: breakout wins, TD-spike buried as a ghost, experiment selected, ontology accepted", () => {
    const r = runFantasyDiscoveryCycle(input);
    expect(r.winner!.id).toBe("A");
    expect(r.buried.map((b) => b.id)).toContain("B");
    expect(r.theoryStatuses["B"]).toBe("GHOST");
    expect(r.cheapestExperiment!.id).toBe("route_rate_breakout");
    expect(r.actionability).toBe("ACTIONABLE_SHADOW");
    expect(r.researchTasks.join(" ")).toMatch(/shadow-track/i);
    expect(r.ontologyDecision).toBe("accepted");
  });
  it("rejects an ontology term that adds language but not compression", () => {
    const r = runFantasyDiscoveryCycle({ ...input, ontologyProposal: { name: "Vibe Index", compressionGain: 0, survivesFalsification: true } });
    expect(r.ontologyDecision).toBe("rejected");
  });
});
