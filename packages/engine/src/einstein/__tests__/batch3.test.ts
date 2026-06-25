import { describe, it, expect } from "vitest";
import { assessTradability, type TradabilityInputs } from "../tradability-filter.js";
import { recordDeadEdge, checkGraveyard, edgeSignature } from "../negative-discovery-ledger.js";
import { rankExperiments, DEFAULT_EXPERIMENTS } from "../experiment-allocation.js";
import { runAutopsy, type AutopsyComponents } from "../market-autopsy.js";
import { convene, type BeliefTransitionEvidence } from "../self-disproof-court.js";

function trad(over: Partial<TradabilityInputs> = {}): TradabilityInputs {
  return {
    rawEdge: 0.06, vig: 0.01, spread: 0.005, latencyCost: 0.005, executeMin: 2, windowMin: 20,
    limitProxy: 0.8, correlationPenalty: 0.005, modelError: 0.005, dataQualityOk: true, publicationDelayCost: 0.005,
    ...over,
  };
}

describe("Tradability Filter", () => {
  it("passes a real edge through the friction cascade", () => {
    expect(assessTradability(trad()).status).toBe("EXECUTABLE_SHADOW");
  });
  it("kills an edge that dies to friction and names the stage", () => {
    const r = assessTradability(trad({ rawEdge: 0.02, vig: 0.015, spread: 0.01 }));
    expect(r.status).toBe("FRICTION_KILLED");
    expect(r.killStage).toBe("spread");
  });
  it("fails on data quality and on an un-actionable window", () => {
    expect(assessTradability(trad({ dataQualityOk: false })).status).toBe("DATA_QUALITY_FAIL");
    expect(assessTradability(trad({ executeMin: 30, windowMin: 5 })).status).toBe("FRICTION_KILLED");
  });
  it("is theoretical-only when limits make it non-executable", () => {
    expect(assessTradability(trad({ limitProxy: 0.02 })).status).toBe("THEORETICAL_ONLY");
  });
});

describe("Negative Discovery Ledger", () => {
  const grave = [
    recordDeadEdge({ id: "d1", hypothesis: "totals under early season", shape: { marketFamily: "total", side: "UNDER", structure: "early_season" }, failureReason: "settlement_negative", note: "51.1% over 27 seasons", recordedAt: "2026-06-25T00:00:00Z" }),
  ];
  it("matches a repeat of a dead edge by structural signature", () => {
    const m = checkGraveyard({ marketFamily: "total", side: "UNDER", structure: "early_season" }, grave);
    expect(m.matched).toBe(true);
    expect(m.suppressionNote).toMatch(/settlement_negative/);
  });
  it("does not match a different shape", () => {
    expect(checkGraveyard({ marketFamily: "player_rush_yds", side: "UNDER", structure: "high_line" }, grave).matched).toBe(false);
    expect(edgeSignature({ marketFamily: "total", side: "UNDER", structure: "early_season" })).toContain("total");
  });
});

describe("Experiment Allocation", () => {
  it("ranks experiments best-first by info-gain per cost/risk/rights", () => {
    const ranked = rankExperiments();
    expect(ranked).toHaveLength(DEFAULT_EXPERIMENTS.length);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
    expect(ranked[0]!.sourceRights).not.toBe("blocked");
  });
  it("penalizes needs_review rights", () => {
    const cleared = rankExperiments([{ ...DEFAULT_EXPERIMENTS[0]! }])[0]!;
    const review = rankExperiments([{ ...DEFAULT_EXPERIMENTS[0]!, sourceRights: "needs_review" }])[0]!;
    expect(review.score).toBeLessThan(cleared.score);
  });
});

describe("Market Autopsy", () => {
  const strong: AutopsyComponents = { timing: 0.8, truth: 0.8, uncertainty: 0.8, restraint: 0.8, availability: 0.9, proof: 0.9, tradability: 0.8 };
  const weak: AutopsyComponents = { timing: 0.2, truth: 0.2, uncertainty: 0.3, restraint: 0.3, availability: 0.3, proof: 0.2, tradability: 0.2 };
  it("grades a sound process as deserved regardless of a loss (unlucky)", () => {
    expect(runAutopsy({ timeline: [], components: strong, clvEarned: true, won: false, acceptedAgain: true }).verdict).toBe("unlucky");
  });
  it("flags a winning but unsound process as lucky", () => {
    expect(runAutopsy({ timeline: [], components: weak, clvEarned: false, won: true, acceptedAgain: false }).verdict).toBe("lucky");
  });
  it("scores deserved confidence on the process, not the result", () => {
    const s = runAutopsy({ timeline: [], components: strong, clvEarned: true, won: true, acceptedAgain: true });
    expect(s.deservedConfidence).toBeGreaterThan(0.6);
    expect(s.verdict).toBe("deserved");
  });
});

describe("Recursive Self-Disproof Court", () => {
  const clean: BeliefTransitionEvidence = {
    bookDnaNoisyOrdering: false, shockAlreadyPriced: false, conservationViolationReal: true,
    lightConeStatus: "inside_window", tradabilityStatus: "EXECUTABLE_SHADOW", clvBeatSharpClose: true,
    survivesSeparation: true, dataRightsCleared: true, publishingErodesTrust: false,
  };
  it("a clean transition survives the court", () => {
    const r = convene(clean);
    expect(r.survives).toBe(true);
    expect(r.cappedStatus).toBeNull();
  });
  it("any single FAIL caps the candidate at WATCHLIST", () => {
    expect(convene({ ...clean, shockAlreadyPriced: true }).fails).toContain("ShockProsecutor");
    expect(convene({ ...clean, lightConeStatus: "contaminated" }).cappedStatus).toBe("WATCHLIST");
    expect(convene({ ...clean, tradabilityStatus: "FRICTION_KILLED" }).survives).toBe(false);
    expect(convene({ ...clean, dataRightsCleared: false }).fails).toContain("DataRightsProsecutor");
  });
});
