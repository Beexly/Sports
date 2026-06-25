/**
 * FANTASY DISCOVERY LAYER — Acceptance Scenarios (A–G), wired end-to-end against real modules.
 *
 * The owner's fantasy acceptance test: the same role shock can become a waiver edge, a DFS edge, a
 * trade buy-low, a dynasty sell-high, or a hard pass — and a "correct" call after the lock must NOT
 * be credited. Nothing here flips a live gate, sets priced=true, makes a public claim, or uses
 * certainty language.
 */

import { describe, it, expect } from "vitest";
import { roleVsProduction } from "../fantasy-role-state-vector.js";
import { evaluateFantasyLightCone } from "../fantasy-light-cone.js";
import { assembleFantasyTransition, type FantasyBeliefStateInput } from "../fantasy-belief-state-transition.js";
import { redistributeRoleMass, type VacatedRole, type Inheritor } from "../role-mass-transfer-engine.js";
import { recommendWaiver } from "../waiver-leverage-engine.js";
import { diagnoseTrade } from "../trade-mri.js";
import { evaluateDFS, type DFSInputs } from "../dfs-leverage-lab.js";
import { evaluateDynasty } from "../dynasty-asset-physics.js";
import { assessFantasyGhosts, type FantasyGhost } from "../fantasy-ghost-bench.js";
import { bestBuyLowCounterparties, type ManagerGenome } from "../manager-dna-genome.js";

const underpricedWR: FantasyBeliefStateInput = {
  id: "A", player: "WR2", position: "WR", format: "full_ppr", decisionTime: "2026-01-06T10:00:00Z",
  roleImpliedValue: 0.72, teamContextNote: "WR1 out; route rate + prop confirm a real role rise.",
  platformProjectionBelief: 0.4, analystRankBelief: 0.42, dfsSalaryBelief: 0.38, dfsOwnershipBelief: 0.35, managerCrowdBelief: 0.4,
  expectedMovement: 0.3, observedMovement: 0.05, absorptionLagMinutes: 90,
  proposedAction: "ADD", lightCone: "INSIDE_LIGHT_CONE", dataQualityStatus: "ok", rightsStatus: "cleared",
  ghostSuppressed: false, provenance: { discoveredBy: "fantasy-acceptance" },
};

// ── A. Silent role breakout — high role, low box score, market lags. ──────────────────────────────
describe("A. Silent role breakout is actionable before the crowd corrects", () => {
  it("reads role>production as a silent breakout and routes an underpriced ADD as ACTIONABLE_SHADOW", () => {
    expect(roleVsProduction(0.72, 0.3).signal).toBe("silent_breakout");
    const t = assembleFantasyTransition(underpricedWR);
    expect(t.direction).toBe("underpriced");
    expect(t.status).toBe("ACTIONABLE_SHADOW");
    expect(t.actionableAction).toBe("ADD");
    expect(JSON.stringify(t)).not.toMatch(/guaranteed|lock of the week|sure thing/i);
  });
});

// ── B. Box-score fraud — multiple TDs on weak role, resembles a buried trap. ──────────────────────
describe("B. Box-score fraud is sold/faded, not chased", () => {
  const tdGhost: FantasyGhost = { id: "g-td", shape: { position: "RB", kind: "td_spike_trap", trigger: "two_td_no_role" }, severity: 1, recencyWeight: 1 };
  it("reads production>role as fraud, matches the TD-spike ghost, and recommends SELL_HIGH + FADE", () => {
    expect(roleVsProduction(0.3, 0.85).signal).toBe("box_score_fraud");
    expect(assessFantasyGhosts({ position: "RB", kind: "td_spike_trap", trigger: "two_td_no_role" }, [tdGhost]).suppressed).toBe(true);
    const trade = diagnoseTrade({ roleTruth: 0.35, marketPerception: 0.75, restOfSeasonRoleValue: 0.35, playoffScheduleValue: 0.3, positionalScarcity: 0.3, rosterFit: 0.3, outgoingAssetValue: 0.4, liquidityRisk: 0.2, injuryRisk: 0.2, timingRisk: 0.1, recentBoxScoreSwing: 0.6, nameValue: 0.5 });
    expect(trade.direction).toBe("SELL_HIGH");
    const dfs = evaluateDFS({ ceilingProjection: 0.4, roleCertainty: 0.5, salary: 0.5, projectedPoints: 0.45, projectedOwnership: 0.45, fairOwnership: 0.18, correlationValue: 0.2, contestType: "gpp", duplicationRisk: 0.4, lateNewsRisk: 0.1, fragility: 0.5 });
    expect(dfs.action).toBe("FADE");
  });
});

// ── C. Injury role mass transfer — public overreacts to the direct backup. ───────────────────────
describe("C. A vacated role splits; the valuable core is identified, the backup is disciplined", () => {
  it("redistributes the role and names exactly one valuable-core inheritor; backup add is disciplined, not aggressive", () => {
    const vacated: VacatedRole = { targets: 0.22, carries: 0.55, routes: 0.3, redZoneTouches: 0.25, goalLineTouches: 0.2, airYards: 0.15, checkdownShare: 0.2 };
    const inheritors: Inheritor[] = [
      { id: "earlyDownRB", roleSimilarity: 0.8, coachingTrust: 0.7, fit: { pass: 0.2, rush: 0.9, redZone: 0.6, deep: 0.1, checkdown: 0.3 } },
      { id: "receivingRB", roleSimilarity: 0.6, coachingTrust: 0.7, fit: { pass: 0.9, rush: 0.3, redZone: 0.3, deep: 0.2, checkdown: 0.9 } },
      { id: "TE", roleSimilarity: 0.4, coachingTrust: 0.6, fit: { pass: 0.6, rush: 0, redZone: 0.8, deep: 0.3, checkdown: 0.4 } },
    ];
    const r = redistributeRoleMass(vacated, inheritors, { passLean: 0.5, teamLevelLeakage: 0.2 });
    expect(r.allocations).toHaveLength(3);
    expect(r.allocations.filter((a) => a.note.includes("valuable (RZ")).length).toBe(1);
    // Public overreacts to the early-down back; with real uncertainty the add should be disciplined.
    const waiver = recommendWaiver({ futureRoleValue: 0.6, scarcity: 0.6, rosterNeed: 0.7, playoffUtility: 0.6, acquisitionProbability: 0.8, faabCost: 0.2, dropCost: 0.05, uncertaintyPenalty: 0.35 });
    expect(waiver.action).toBe("DISCIPLINED_FAAB"); // a split-role backup is a disciplined add, not an aggressive smash
  });
});

// ── D. DFS salary lag — the same play flips on ownership. ─────────────────────────────────────────
describe("D. A stale-salary play is OVERWEIGHT under-owned, FADE when ownership explodes", () => {
  const stale: DFSInputs = { ceilingProjection: 0.8, roleCertainty: 0.8, salary: 0.4, projectedPoints: 0.7, projectedOwnership: 0.08, fairOwnership: 0.25, correlationValue: 0.5, contestType: "gpp", duplicationRisk: 0.1, lateNewsRisk: 0.1, fragility: 0.1 };
  it("over-weights when ownership lags the role", () => {
    expect(["OVERWEIGHT", "TOURNAMENT_ONLY"]).toContain(evaluateDFS(stale).action);
  });
  it("fades when ownership explodes past the role's fair share", () => {
    expect(evaluateDFS({ ...stale, projectedOwnership: 0.5, ceilingProjection: 0.5 }).action).toBe("FADE");
  });
});

// ── E. Trade market distortion — manager overreacts to two bad weeks. ────────────────────────────
describe("E. A role-strong player depressed by a box-score dip is a buy-low from the right manager", () => {
  it("diagnoses BUY_LOW and points at the panic-prone, consented counterparty", () => {
    const trade = diagnoseTrade({ roleTruth: 0.75, marketPerception: 0.52, restOfSeasonRoleValue: 0.7, playoffScheduleValue: 0.6, positionalScarcity: 0.5, rosterFit: 0.6, outgoingAssetValue: 0.45, liquidityRisk: 0.2, injuryRisk: 0.2, timingRisk: 0.1, recentBoxScoreSwing: -0.5, nameValue: 0.4 });
    expect(trade.direction).toBe("BUY_LOW");
    expect(trade.distortions.join(" ")).toMatch(/box_score_distortion|playoff_schedule_leverage/);
    const managers: ManagerGenome[] = [
      { managerId: "M2", waiverAggression: 0.3, faabDiscipline: 0.9, tradeAggression: 0.2, recencyBias: 0.2, nameValueBias: 0.2, injuryPanic: 0.2, rosterHoarding: 0.2, riskTolerance: 0.4, consentedDataProvided: true },
      { managerId: "M4", waiverAggression: 0.7, faabDiscipline: 0.3, tradeAggression: 0.8, recencyBias: 0.9, nameValueBias: 0.6, injuryPanic: 0.8, rosterHoarding: 0.3, riskTolerance: 0.7, consentedDataProvided: true },
    ];
    expect(bestBuyLowCounterparties(managers, { recentBoxScoreDecline: 0.8 })[0]!.managerId).toBe("M4");
  });
});

// ── F. Dynasty sentiment shock — rookie hype without a role path. ────────────────────────────────
describe("F. Rookie hype without a role path is a sell into the narrative", () => {
  it("flags narrative overpricing and recommends a sell", () => {
    const r = evaluateDynasty({ futureRoleProbability: 0.35, talentDurability: 0.5, teamContext: 0.5, age: 21, position: "WR", marketSentiment: 0.8, intrinsicValue: 0.5, liquidity: 0.6, injuryDecay: 0.1, opportunityUncertainty: 0.5, narrativeOverpricing: 0.7, teamWindow: "neutral" });
    expect(r.action).toBe("SELL");
    expect(r.sentimentGap).toBeLessThan(0);
  });
});

// ── G. Light-cone failure — "right" only after the lock. ─────────────────────────────────────────
describe("G. A call knowable only after the lock is refused, not credited", () => {
  const cone = { lock: "waiver_deadline" as const, lockTime: "2026-01-07T08:00:00Z", infoFirstKnowableTime: "2026-01-05T13:00:00Z" };
  it("marks a post-lock decision and the transition refuses to credit it", () => {
    const v = evaluateFantasyLightCone({ ...cone, decisionTime: "2026-01-07T12:00:00Z" });
    expect(v.status).toBe("POST_LOCK_ONLY");
    const t = assembleFantasyTransition({ ...underpricedWR, lightCone: "POST_LOCK_ONLY" });
    expect(t.status).toBe("POST_LOCK_ONLY");
    expect(t.actionableAction).toBe("PASS");
  });
  it("rejects a hindsight-contaminated decision outright", () => {
    const v = evaluateFantasyLightCone({ ...cone, decisionTime: "2026-01-06T10:00:00Z", usedDataTimestamps: ["2026-01-06T18:00:00Z"] });
    expect(v.status).toBe("CONTAMINATED");
    expect(assembleFantasyTransition({ ...underpricedWR, lightCone: "CONTAMINATED" }).status).toBe("REJECTED");
  });
});
