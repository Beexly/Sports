import { describe, it, expect } from "vitest";
import { evolveTheory, ecologyCensus, type TheoryOrganism } from "../theory-ecology.js";
import { assessReflexiveRisk, type ReflexiveInputs } from "../reflexive-product-risk.js";
import { computeBiasDifferential, rankBiasOpportunities, type BiasReading } from "../cognitive-bias-differential.js";
import { simulateLeagueEconomy } from "../league-economy-simulator.js";
import { assessContestField, type ContestFieldInput } from "../contest-field-reflexivity.js";
import type { ManagerGenome } from "../../fantasy/manager-dna-genome.js";

const organism: TheoryOrganism = {
  id: "t1", name: "Derivative Echo Lag", status: "HYPOTHESIS", fitness: 0.6, novelty: 0.5, compression: 0.4,
  decisionLeverage: 0.3, driftRisk: 0.1, ghostSimilarity: 0.1, governanceSafe: true, allowedSurfaces: ["fantasy", "betting"], lastReplaySurvived: true,
};

describe("Theory Ecology", () => {
  it("promotes a fit, compressing, multi-window hypothesis to LAW", () => {
    const r = evolveTheory(organism, { fitness: 1.4, driftRisk: 0.1, ghostSimilarity: 0.1, lastReplaySurvived: true, oosWindows: 3 });
    expect(r.organism.status).toBe("LAW");
  });
  it("quarantines a theory that resembles a dangerous ghost", () => {
    expect(evolveTheory(organism, { fitness: 1.0, driftRisk: 0.1, ghostSimilarity: 0.7, lastReplaySurvived: true, oosWindows: 3 }).organism.status).toBe("QUARANTINED");
  });
  it("buries a theory that fails replay, and retires a drifted one", () => {
    expect(evolveTheory(organism, { fitness: 0.8, driftRisk: 0.1, ghostSimilarity: 0.1, lastReplaySurvived: false, oosWindows: 3 }).organism.status).toBe("GHOST");
    expect(evolveTheory(organism, { fitness: 0.8, driftRisk: 0.7, ghostSimilarity: 0.1, lastReplaySurvived: true, oosWindows: 3 }).organism.status).toBe("RETIRED");
  });
  it("censuses the ecosystem", () => {
    const c = ecologyCensus([organism, { ...organism, id: "t2", status: "GHOST" }, { ...organism, id: "t3", status: "LAW" }]);
    expect(c.HYPOTHESIS).toBe(1);
    expect(c.GHOST).toBe(1);
    expect(c.LAW).toBe(1);
  });
});

describe("Reflexive Product Risk", () => {
  const base: ReflexiveInputs = { audienceSize: 0.7, marketSensitivity: 0.3, ownershipSensitivity: 0.8, waiverSensitivity: 0.3, liquidity: 0.3, publicness: 0.8, actionCrowding: 0.7 };
  it("personalizes an insight whose broad publication would crush DFS ownership leverage", () => {
    expect(assessReflexiveRisk(base).disposition).toBe("PERSONALIZED_ONLY");
  });
  it("keeps a high-degradation insight private", () => {
    expect(assessReflexiveRisk({ ...base, marketSensitivity: 0.9, waiverSensitivity: 0.9, audienceSize: 1, actionCrowding: 1, liquidity: 0 }).disposition).toBe("PRIVATE_ONLY");
  });
  it("allows safe public sharing of a low-risk insight", () => {
    expect(assessReflexiveRisk({ audienceSize: 0.1, marketSensitivity: 0.05, ownershipSensitivity: 0.05, waiverSensitivity: 0.05, liquidity: 0.9, publicness: 0.2, actionCrowding: 0.1 }).disposition).toBe("SAFE_PUBLIC");
  });
});

describe("Cognitive Bias Differential", () => {
  it("flags fading the crowd where it over-expresses a bias", () => {
    expect(computeBiasDifferential({ kind: "rookie_fever", crowdLevel: 0.8, rationalLevel: 0.3 }).exploitDirection).toBe("fade_crowd");
  });
  it("flags joining where the crowd under-reacts", () => {
    expect(computeBiasDifferential({ kind: "injury_panic", crowdLevel: 0.2, rationalLevel: 0.6 }).exploitDirection).toBe("join_crowd");
  });
  it("ranks bias opportunities by magnitude and drops the neutral ones", () => {
    const r = rankBiasOpportunities([
      { kind: "name_value", crowdLevel: 0.9, rationalLevel: 0.4 },
      { kind: "recency", crowdLevel: 0.5, rationalLevel: 0.45 },
      { kind: "box_score_chasing", crowdLevel: 0.7, rationalLevel: 0.3 },
    ]);
    expect(r[0]!.kind).toBe("name_value");
    expect(r.find((d) => d.kind === "recency")).toBeUndefined();
  });
});

describe("League Economy Simulator", () => {
  const consented = (id: string, over: Partial<ManagerGenome> = {}): ManagerGenome => ({
    managerId: id, waiverAggression: 0.5, faabDiscipline: 0.5, tradeAggression: 0.4, recencyBias: 0.4,
    nameValueBias: 0.4, injuryPanic: 0.4, rosterHoarding: 0.4, riskTolerance: 0.5, consentedDataProvided: true, ...over,
  });
  it("predicts the aggressive, low-discipline manager as the most likely FAAB winner", () => {
    const r = simulateLeagueEconomy({ managers: [consented("M2"), consented("M4", { waiverAggression: 0.9, faabDiscipline: 0.2 })], playerValue: 0.7, positionScarcity: 0.5, playoffWeek: true });
    expect(r.mostLikelyWinner).toBe("M4");
    expect(r.predictedWinningBidPct).toBeGreaterThan(0);
  });
  it("runs nothing without consented data", () => {
    const r = simulateLeagueEconomy({ managers: [consented("M9", { consentedDataProvided: false })], playerValue: 0.7, positionScarcity: 0.5, playoffWeek: false });
    expect(r.usedConsentedManagers).toBe(0);
    expect(r.mostLikelyWinner).toBeNull();
  });
});

describe("Contest Field Reflexivity", () => {
  it("classifies over-owned cheap value as fragile chalk", () => {
    const i: ContestFieldInput = { projectedOwnership: 0.45, fairOwnership: 0.2, salaryRelief: 0.7, publicStackTendency: 0.4, fieldSize: 50_000, lateNewsRisk: 0.2 };
    expect(assessContestField(i).chalkType).toBe("fragile_chalk");
  });
  it("classifies an under-owned play as leverage", () => {
    expect(assessContestField({ projectedOwnership: 0.06, fairOwnership: 0.22, salaryRelief: 0.2, publicStackTendency: 0.2, fieldSize: 50_000, lateNewsRisk: 0.1 }).chalkType).toBe("leverage");
  });
});
