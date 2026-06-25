import { describe, it, expect } from "vitest";
import { recommendWaiver, type WaiverInputs } from "../waiver-leverage-engine.js";
import { diagnoseTrade, type TradeInputs } from "../trade-mri.js";
import { conveneLineupCourt, type LineupEvidence } from "../lineup-court.js";
import { evaluateDFS, type DFSInputs } from "../dfs-leverage-lab.js";
import { evaluateBestBall, type BestBallInputs } from "../bestball-draft-twin.js";
import { evaluateDynasty, type DynastyInputs } from "../dynasty-asset-physics.js";

describe("Waiver Leverage Engine", () => {
  const strong: WaiverInputs = { futureRoleValue: 0.8, scarcity: 0.7, rosterNeed: 0.8, playoffUtility: 0.7, acquisitionProbability: 0.9, faabCost: 0.2, dropCost: 0.05, uncertaintyPenalty: 0.2 };
  it("recommends aggressive FAAB with a positive bid band for a high-value scarce target", () => {
    const r = recommendWaiver(strong);
    expect(r.action).toBe("AGGRESSIVE_FAAB");
    expect(r.faabBand[1]).toBeGreaterThan(r.faabBand[0]);
    expect(r.leverage).toBeGreaterThan(0);
  });
  it("passes when net leverage is negative", () => {
    const r = recommendWaiver({ ...strong, futureRoleValue: 0.1, scarcity: 0.1, rosterNeed: 0.1, playoffUtility: 0.1, faabCost: 0.6, dropCost: 0.5 });
    expect(r.action).toBe("PASS");
    expect(r.faabBand).toEqual([0, 0]);
  });
  it("watchlists a good role with no roster need", () => {
    const r = recommendWaiver({ ...strong, rosterNeed: 0.1, scarcity: 0.2, futureRoleValue: 0.4 });
    expect(r.action).toBe("WATCHLIST");
  });
});

describe("Trade MRI", () => {
  it("flags a buy-low when role exceeds perception after a down game", () => {
    const i: TradeInputs = { roleTruth: 0.75, marketPerception: 0.5, restOfSeasonRoleValue: 0.7, playoffScheduleValue: 0.7, positionalScarcity: 0.5, rosterFit: 0.6, outgoingAssetValue: 0.45, liquidityRisk: 0.2, injuryRisk: 0.2, timingRisk: 0.1, recentBoxScoreSwing: -0.5, nameValue: 0.4 };
    const d = diagnoseTrade(i);
    expect(d.direction).toBe("BUY_LOW");
    expect(d.distortions.join(" ")).toMatch(/box_score_distortion|playoff_schedule_leverage/);
  });
  it("flags a sell-high with name-value distortion", () => {
    const i: TradeInputs = { roleTruth: 0.4, marketPerception: 0.75, restOfSeasonRoleValue: 0.4, playoffScheduleValue: 0.3, positionalScarcity: 0.3, rosterFit: 0.4, outgoingAssetValue: 0.5, liquidityRisk: 0.2, injuryRisk: 0.2, timingRisk: 0.1, recentBoxScoreSwing: 0.3, nameValue: 0.8 };
    const d = diagnoseTrade(i);
    expect(d.direction).toBe("SELL_HIGH");
    expect(d.distortions.join(" ")).toMatch(/name_value_distortion/);
  });
});

describe("Lineup Court", () => {
  const base: LineupEvidence = {
    expectedPointsDelta: 0.4, roleQuality: 0.7, matchupRating: 0.6, injuryRisk: 0.1, volatility: 0.5,
    needCeiling: true, needFloor: false, correlationWithRoster: 0.3, lightCone: "INSIDE_LIGHT_CONE",
    ghostSuppressed: false, lateSwapAvailable: false, questionableTag: false,
  };
  it("returns a CEILING_PLAY for an underdog needing upside", () => {
    expect(conveneLineupCourt(base).action).toBe("CEILING_PLAY");
  });
  it("PASSes (cannot act) when the decision is not knowable in time", () => {
    expect(conveneLineupCourt({ ...base, lightCone: "POST_LOCK_ONLY" }).action).toBe("PASS");
  });
  it("routes a questionable tag with late swap to LATE_SWAP_REQUIRED", () => {
    expect(conveneLineupCourt({ ...base, questionableTag: true, lateSwapAvailable: true }).action).toBe("LATE_SWAP_REQUIRED");
  });
});

describe("DFS Leverage Lab", () => {
  it("OVERWEIGHTs an under-owned, efficient, high-ceiling play", () => {
    const i: DFSInputs = { ceilingProjection: 0.8, roleCertainty: 0.8, salary: 0.4, projectedPoints: 0.7, projectedOwnership: 0.08, fairOwnership: 0.25, correlationValue: 0.6, contestType: "gpp", duplicationRisk: 0.1, lateNewsRisk: 0.1, fragility: 0.1 };
    const r = evaluateDFS(i);
    expect(["OVERWEIGHT", "TOURNAMENT_ONLY"]).toContain(r.action);
    expect(r.ownershipDiscount).toBeGreaterThan(0.5);
  });
  it("FADEs fragile chalk (over-owned without ceiling)", () => {
    const i: DFSInputs = { ceilingProjection: 0.4, roleCertainty: 0.6, salary: 0.5, projectedPoints: 0.5, projectedOwnership: 0.45, fairOwnership: 0.2, correlationValue: 0.2, contestType: "gpp", duplicationRisk: 0.5, lateNewsRisk: 0.2, fragility: 0.5 };
    expect(evaluateDFS(i).action).toBe("FADE");
  });
});

describe("Best Ball Draft Twin", () => {
  it("targets a high-ceiling spike player at an ADP discount", () => {
    const i: BestBallInputs = { ceiling: 0.85, spikeWeekProbability: 0.7, rosterCorrelation: 0.6, playoffWeekFit: 0.7, adpDiscount: 0.6, fragility: 0.2, roleUncertainty: 0.2, rosterConstructionPenalty: 0.1, byeWeekConflict: 0.1 };
    expect(evaluateBestBall(i).action).toBe("BEST_BALL_TARGET");
  });
  it("avoids a fragile, uncertain player despite some ceiling", () => {
    const i: BestBallInputs = { ceiling: 0.4, spikeWeekProbability: 0.2, rosterCorrelation: 0.2, playoffWeekFit: 0.3, adpDiscount: 0.1, fragility: 0.8, roleUncertainty: 0.8, rosterConstructionPenalty: 0.6, byeWeekConflict: 0.5 };
    expect(evaluateBestBall(i).action).toBe("AVOID");
  });
});

describe("Dynasty Asset Physics", () => {
  it("recommends a rebuild buy for an undervalued young asset", () => {
    const i: DynastyInputs = { futureRoleProbability: 0.8, talentDurability: 0.8, teamContext: 0.7, age: 23, position: "WR", marketSentiment: 0.5, intrinsicValue: 0.75, liquidity: 0.6, injuryDecay: 0.1, opportunityUncertainty: 0.2, narrativeOverpricing: 0.1, teamWindow: "rebuild" };
    expect(evaluateDynasty(i).action).toBe("REBUILD_BUY");
  });
  it("liquidates an overpriced aging RB riding a narrative", () => {
    const i: DynastyInputs = { futureRoleProbability: 0.5, talentDurability: 0.4, teamContext: 0.5, age: 29, position: "RB", marketSentiment: 0.8, intrinsicValue: 0.5, liquidity: 0.6, injuryDecay: 0.4, opportunityUncertainty: 0.4, narrativeOverpricing: 0.7, teamWindow: "neutral" };
    expect(evaluateDynasty(i).action).toBe("LIQUIDATE");
  });
});
