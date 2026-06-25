/**
 * DECISION FACTORY — fixtures for the compiler + the closed loop.
 *
 * Deterministic scenarios proving (H) scar memory — a settled trap becomes a ghost that suppresses
 * its twin — and (I) regime reconfiguration. No clock, no network.
 */

import { type TemporalFact, type FactType, type LegalVerdict, entityRef } from "@sports/data-intelligence";
import type { CandidateShape, GhostCluster, RegimeInputs } from "@sports/engine";
import type { DecisionFieldInput, SubjectInput } from "@sports/decision-field-runtime";
import type { SettledCard } from "./product-intelligence-loop.js";

/** The shape both the trap and its twin share — identical, so a ghost of one suppresses the other. */
export const trapShape: CandidateShape = { marketFamily: "player_rush_yds", side: "OVER", structure: "td_chase", regime: "PublicOverreaction" };

/** A settled card whose process was UNSOUND and whose outcome was bad → process_error → a ghost. */
export const settledTrapCard: SettledCard = {
  cardId: "trap-001",
  subject: "Chase Brown",
  action: "ADD",
  candidateShape: trapShape,
  roleImpliedValue: 0.3, // role was weak…
  marketBeliefAtDecision: 0.7, // …but belief was high → not underpriced → unsound BUY
  knowableAtDecision: true,
  ghostMatched: false,
  expectedFantasyPoints: 0.6,
  outcomeFantasyPoints: 0.2, // bad outcome, far outside variance
  varianceBand: 0.15,
};

/** A settled card whose process was SOUND but lost inside variance → unlucky_loss → NO lesson. */
export const settledUnluckyCard: SettledCard = {
  cardId: "unlucky-001",
  subject: "Jaylen Waddle",
  action: "ADD",
  candidateShape: { marketFamily: "player_rec_yds", side: "OVER", structure: "role_rise", regime: "DerivativeStaleness" },
  roleImpliedValue: 0.7, // role strong…
  marketBeliefAtDecision: 0.5, // …and underpriced → sound BUY
  knowableAtDecision: true,
  ghostMatched: false,
  expectedFantasyPoints: 0.6,
  outcomeFantasyPoints: 0.5, // small miss, inside variance
  varianceBand: 0.15,
};

const TWIN = entityRef("player", "twin");
const TWIN_DECISION_TIME = "2026-10-01T17:00:00Z";

function mkFact(factId: string, factType: FactType, sourceId: string, rights: LegalVerdict, value: unknown): TemporalFact {
  return {
    factId,
    entityIds: [TWIN],
    factType,
    value,
    sourceId,
    endpointId: `${sourceId}:ep`,
    observedAt: "2026-10-01T15:00:00Z",
    fetchedAt: "2026-10-01T15:30:00Z",
    firstSeenByGseAt: "2026-10-01T15:30:00Z",
    sourcePayloadHash: `hash:${factId}`,
    confidence: 0.88,
    rightsStatus: rights,
  };
}

// A strong role-up WITH a fantasy projection snapshot present — without a ghost this emits a real card.
const TWIN_FACTS: readonly TemporalFact[] = [
  mkFact("t_route", "route_rate", "nflverse", "FREE_OPEN", { routeRate: 0.85 }),
  mkFact("t_targets", "target_share", "nflverse", "FREE_OPEN", { targetShare: 0.28 }),
  mkFact("t_proj", "platform_projection", "fantasydata", "FREE_CAUTION", { proj: 11.2 }),
  mkFact("t_prop", "player_prop", "the_odds_api", "LICENSED", { line: 62.5 }),
];

const DERIVATIVE_REGIME: RegimeInputs = {
  bookDispersion: 0.3, lineVelocity: 0.7, altCurvature: 0.1, liquidityProxy: 0.6,
  newsDensity: 0.2, publicAttention: 0.2, injuryUncertainty: 0.1, hoursToEvent: 3, absorptionSpeed: 0.2,
};

/** Build a twin frame input whose subject shares the trap shape; pass the emitted ghost to suppress it. */
export function makeTwinInput(ghosts: readonly GhostCluster[]): DecisionFieldInput {
  const subject: SubjectInput = {
    entityId: TWIN.id,
    subjectLabel: "Twin (same shape as the trap)",
    decisionState: "ROLE_UP_FANTASY_LATE",
    candidateShape: trapShape,
    ghostClusters: ghosts,
    tradability: {
      rawEdge: 0.05, vig: 0.01, spread: 0.005, latencyCost: 0.002, executeMin: 2, windowMin: 60,
      limitProxy: 0.9, correlationPenalty: 0.003, modelError: 0.005, dataQualityOk: true, publicationDelayCost: 0.002,
    },
    conservation: { channel: "targets", removed: 0.5, redistributed: 0.1, strategyShift: 0.05, efficiencyDecay: 0.05, opponentEffect: 0.05 },
    roleQuality: 0.75,
    normalizedProduction: 0.4,
    proofQuality: 0.8,
    rightsClearedForPublic: true,
    realityDelta: 0.7,
    marketVelocity: 0.4,
    fantasyAbsorptionGap: 0.6,
    deadlinePressure: 0.6,
    userContextWeight: 1,
    marketAlreadyCaughtUp: false,
  };
  return {
    frameId: ghosts.length > 0 ? "twin-with-scar" : "twin-control",
    week: "2026-W05",
    capturedAt: "2026-10-01T16:30:00Z",
    decisionTime: TWIN_DECISION_TIME,
    facts: TWIN_FACTS,
    subjects: [subject],
    regimeInputs: DERIVATIVE_REGIME,
  };
}

// Regime fixtures for the reconfiguration test.
export const calmRegimeInputs: RegimeInputs = {
  bookDispersion: 0.1, lineVelocity: 0.1, altCurvature: 0.05, liquidityProxy: 0.8,
  newsDensity: 0.1, publicAttention: 0.1, injuryUncertainty: 0.1, hoursToEvent: 48, absorptionSpeed: 0.5,
};

export const shockRegimeInputs: RegimeInputs = {
  bookDispersion: 0.4, lineVelocity: 0.8, altCurvature: 0.2, liquidityProxy: 0.1,
  newsDensity: 0.9, publicAttention: 0.5, injuryUncertainty: 0.2, hoursToEvent: 6, absorptionSpeed: 0.3,
};

/** A regime that SUPPRESSES action (LiquidityTrap): thin + moving + uncertain. */
export const suppressingRegimeInputs: RegimeInputs = {
  bookDispersion: 0.3, lineVelocity: 0.8, altCurvature: 0.1, liquidityProxy: 0.1,
  newsDensity: 0.3, publicAttention: 0.3, injuryUncertainty: 0.9, hoursToEvent: 5, absorptionSpeed: 0.3,
};
