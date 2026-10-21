import { describe, it, expect } from "vitest";
import {
  classifyEpistemicTier,
  EpistemicCandidate,
  APEX_THRESHOLDS,
} from "../selective-abstention-tiers.js";

describe("Three-Tier Epistemic Accuracy Stratification", () => {
  const apexCandidate: EpistemicCandidate = {
    candidateId: "CAND-001",
    selection: "Kenneth Walker Over 68.5 Rushing Yards",
    marketType: "PLAYER_PROP",
    marketLine: 68.5,
    side: "OVER",
    vigFreeMarketProb: 0.515,
    modelProb: 0.63,
    taCqrLowerBound: 71.2, // Strictly clears 68.5
    layerDirections: {
      l0Passed: true,
      l2Direction: "FAVORS",
      l3Direction: "FAVORS",
      l4Direction: "FAVORS",
    },
    opposingPremisesCount: 0,
    eValuePoint: 2.25, // >= 2.0
    eValueCiLower: 1.65, // >= 1.5
    epistemicKnowability: 0.89, // >= 0.85
    localMurphyRel: 0.0018, // <= 0.0030
    all37GatesPassed: true,
    conformalKellyStake: 0.038,
  };

  it("promotes to Tier 1 (APEX_CERTAINTY) when all four convergence criteria pass", () => {
    const res = classifyEpistemicTier(apexCandidate);

    expect(res.tier).toBe("APEX_CERTAINTY");
    expect(res.isActionable).toBe(true);
    expect(res.allocatedCapitalFraction).toBe(0.038);
    expect(res.apexChecklist.crossLayerUnanimity).toBe(true);
    expect(res.apexChecklist.tailSeparatedFloor).toBe(true);
    expect(res.apexChecklist.extremeConfoundingImmunity).toBe(true);
    expect(res.apexChecklist.epistemicKnowabilityCeiling).toBe(true);
    expect(res.disqualificationReasons.length).toBe(0);
    expect(res.qualificationSummary).toContain("PROMOTED TO TIER 1 (APEX_CERTAINTY)");
  });

  it("classifies as Tier 2 (CORE_VALIDATED) when gates pass but confounding immunity is moderate", () => {
    const candidate: EpistemicCandidate = {
      ...apexCandidate,
      eValuePoint: 1.65, // Below 2.0 apex threshold, but passes standard Gate G4 (1.35)
      eValueCiLower: 1.25, // Below 1.50 apex threshold, but passes standard Gate G4 (1.10)
    };

    const res = classifyEpistemicTier(candidate);

    expect(res.tier).toBe("CORE_VALIDATED");
    expect(res.isActionable).toBe(true);
    expect(res.allocatedCapitalFraction).toBe(0.038);
    expect(res.apexChecklist.extremeConfoundingImmunity).toBe(false);
    expect(res.disqualificationReasons.some((r) => r.includes("Confounding immunity insufficient"))).toBe(true);
    expect(res.qualificationSummary).toContain("PROMOTED TO TIER 2 (CORE_VALIDATED)");
  });

  it("classifies as Tier 2 (CORE_VALIDATED) when TA-CQR lower bound is below prop line", () => {
    const candidate: EpistemicCandidate = {
      ...apexCandidate,
      taCqrLowerBound: 65.0, // Below 68.5 market line
    };

    const res = classifyEpistemicTier(candidate);

    expect(res.tier).toBe("CORE_VALIDATED");
    expect(res.isActionable).toBe(true);
    expect(res.apexChecklist.tailSeparatedFloor).toBe(false);
    expect(res.disqualificationReasons.some((r) => r.includes("Tail-separated floor not satisfied"))).toBe(true);
  });

  it("demotes to Tier 3 (SURVEILLANCE_WATCH) when 37 integrity gates fail or capital stake is 0", () => {
    const candidate: EpistemicCandidate = {
      ...apexCandidate,
      all37GatesPassed: false, // Fails 37 gates
      conformalKellyStake: 0.0,
    };

    const res = classifyEpistemicTier(candidate);

    expect(res.tier).toBe("SURVEILLANCE_WATCH");
    expect(res.isActionable).toBe(false);
    expect(res.allocatedCapitalFraction).toBe(0.0);
    expect(res.qualificationSummary).toContain("TIER 3 (SURVEILLANCE_WATCH)");
  });
});
