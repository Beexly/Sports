import { describe, it, expect } from "vitest";
import { assembleFantasyTransition, type FantasyBeliefStateInput } from "../fantasy-belief-state-transition.js";
import { computeFantasyDLI, rankFantasyByDLI, type FantasyDLIInputs } from "../fantasy-decision-leverage-index.js";
import { platformLagScore, rankPlatformsByLag, type PlatformGenome } from "../platform-dna-genome.js";
import { bestBuyLowCounterparties, dominantManagerTendency, type ManagerGenome } from "../manager-dna-genome.js";
import { fantasyGhostSimilarity, assessFantasyGhosts, type FantasyGhost } from "../fantasy-ghost-bench.js";

const baseTransition: FantasyBeliefStateInput = {
  id: "ft-1", player: "WR2", position: "WR", format: "full_ppr", decisionTime: "2026-01-06T10:00:00Z",
  roleImpliedValue: 0.72, teamContextNote: "WR1 ruled out; target vacuum.",
  platformProjectionBelief: 0.4, analystRankBelief: 0.42, dfsSalaryBelief: 0.38, dfsOwnershipBelief: 0.35, managerCrowdBelief: 0.4,
  expectedMovement: 0.3, observedMovement: 0.05, absorptionLagMinutes: 90,
  proposedAction: "ADD", lightCone: "INSIDE_LIGHT_CONE", dataQualityStatus: "ok", rightsStatus: "cleared",
  ghostSuppressed: false, provenance: { discoveredBy: "fantasy-test" },
};

describe("Fantasy Belief-State Transition", () => {
  it("flags an underpriced, knowable, pre-lock candidate as ACTIONABLE_SHADOW", () => {
    const t = assembleFantasyTransition(baseTransition);
    expect(t.direction).toBe("underpriced");
    expect(t.status).toBe("ACTIONABLE_SHADOW");
    expect(t.actionableAction).toBe("ADD");
    expect(t.valueGap).toBeGreaterThan(0.12);
  });
  it("fails closed when the decision was only knowable post-lock", () => {
    const t = assembleFantasyTransition({ ...baseTransition, lightCone: "POST_LOCK_ONLY" });
    expect(t.status).toBe("POST_LOCK_ONLY");
    expect(t.actionableAction).toBe("PASS");
  });
  it("rejects a contaminated (hindsight) transition", () => {
    const t = assembleFantasyTransition({ ...baseTransition, lightCone: "CONTAMINATED" });
    expect(t.status).toBe("REJECTED");
  });
  it("caps a ghost-resembling candidate at WATCHLIST", () => {
    const t = assembleFantasyTransition({ ...baseTransition, ghostSuppressed: true });
    expect(t.status).toBe("WATCHLIST");
    expect(t.actionableAction).toBe("WATCHLIST");
  });
  it("watchlists when role and market already agree", () => {
    const t = assembleFantasyTransition({ ...baseTransition, roleImpliedValue: 0.41 });
    expect(t.status).toBe("WATCHLIST");
    expect(t.direction).toBe("fair");
  });
});

describe("Fantasy Decision Leverage Index", () => {
  const hi: FantasyDLIInputs = { pDecisionChanges: 0.8, championshipEquityDelta: 0.7, proofQuality: 0.9, repeatability: 0.8, timeSensitivity: 0.8, cost: 0.2, rightsRisk: 0.1, latency: 0.1, complexity: 0.1, falseConfidenceRisk: 0.05 };
  it("scores a proof-backed, decision-changing signal as high leverage", () => {
    expect(computeFantasyDLI(hi).classification).toBe("high_leverage");
  });
  it("scores a coach-speak-style false-confidence signal as negative leverage", () => {
    expect(computeFantasyDLI({ ...hi, proofQuality: 0.2, falseConfidenceRisk: 0.9, championshipEquityDelta: 0.3, pDecisionChanges: 0.5 }).classification).toBe("negative_leverage");
  });
  it("ranks signals by leverage", () => {
    const r = rankFantasyByDLI([{ id: "route_rate", inputs: hi }, { id: "fun_split", inputs: { ...hi, championshipEquityDelta: 0.05 } }]);
    expect(r[0]!.id).toBe("route_rate");
  });
});

describe("Platform DNA Genome", () => {
  const slowPlatform: PlatformGenome = { platform: "SlowRanker", traits: { projectionUpdateSpeed: 0.3, rankingConservatism: 0.8, injuryStatusLatency: 0.7, rookieUpdateLag: 0.8, backupRoleLag: 0.9, nameValueBias: 0.6, boxScoreOverweight: 0.3, matchupOverweight: 0.3 } };
  const fastPlatform: PlatformGenome = { platform: "FastBook", traits: { projectionUpdateSpeed: 0.9, rankingConservatism: 0.2, injuryStatusLatency: 0.2, rookieUpdateLag: 0.2, backupRoleLag: 0.2, nameValueBias: 0.2, boxScoreOverweight: 0.8, matchupOverweight: 0.7 } };
  it("predicts slow absorption of a backup-role shock on the conservative platform", () => {
    const r = platformLagScore(slowPlatform, "backup_role_shock");
    expect(r.behavior).toBe("slow_to_update");
    expect(r.expectedLag).toBeGreaterThan(0.5);
  });
  it("flags overreaction risk on a box-score spike for the reactive platform", () => {
    expect(platformLagScore(fastPlatform, "box_score_spike").behavior).toBe("overreacts");
  });
  it("ranks the slowest absorber first", () => {
    expect(rankPlatformsByLag([fastPlatform, slowPlatform], "backup_role_shock")[0]!.platform).toBe("SlowRanker");
  });
});

describe("Manager DNA Genome", () => {
  const panicky: ManagerGenome = { managerId: "M4", waiverAggression: 0.7, faabDiscipline: 0.3, tradeAggression: 0.8, recencyBias: 0.9, nameValueBias: 0.6, injuryPanic: 0.8, rosterHoarding: 0.3, riskTolerance: 0.7, consentedDataProvided: true };
  const steady: ManagerGenome = { managerId: "M2", waiverAggression: 0.3, faabDiscipline: 0.9, tradeAggression: 0.2, recencyBias: 0.2, nameValueBias: 0.2, injuryPanic: 0.2, rosterHoarding: 0.2, riskTolerance: 0.4, consentedDataProvided: true };
  const noConsent: ManagerGenome = { ...panicky, managerId: "M9", consentedDataProvided: false };
  it("ranks the recency-biased, panic-prone manager as the best buy-low counterparty", () => {
    const r = bestBuyLowCounterparties([steady, panicky], { recentBoxScoreDecline: 0.8 });
    expect(r[0]!.managerId).toBe("M4");
    expect(r[0]!.sellLowProbability).toBeGreaterThan(r[1]!.sellLowProbability);
  });
  it("excludes managers without consented data", () => {
    const r = bestBuyLowCounterparties([noConsent], { recentBoxScoreDecline: 0.8 });
    expect(r).toHaveLength(0);
  });
  it("surfaces a dominant exploitable tendency", () => {
    expect(dominantManagerTendency(panicky).tendency).toBe("panics_on_injury");
    expect(dominantManagerTendency({ ...steady, consentedDataProvided: false }).note).toMatch(/no consented data/i);
  });
});

describe("Fantasy Ghost Bench", () => {
  const ghost: FantasyGhost = { id: "g-td-spike", shape: { position: "RB", kind: "td_spike_trap", trigger: "two_td_no_role" }, severity: 1, recencyWeight: 1 };
  it("suppresses a candidate that matches a buried trap", () => {
    expect(fantasyGhostSimilarity({ position: "RB", kind: "td_spike_trap", trigger: "two_td_no_role" }, ghost.shape)).toBe(1);
    expect(assessFantasyGhosts({ position: "RB", kind: "td_spike_trap", trigger: "two_td_no_role" }, [ghost]).suppressed).toBe(true);
  });
  it("does not suppress a structurally different candidate", () => {
    expect(assessFantasyGhosts({ position: "WR", kind: "empty_route_trap", trigger: "air_yards_no_targets" }, [ghost]).suppressed).toBe(false);
  });
});
