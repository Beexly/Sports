/**
 * DECISION FIELD RUNTIME — Decision Field Frame (the governing object).
 *
 * One object per cycle carries the whole field: three clocks (market/fast, football-fantasy/medium,
 * learning/slow), the regime, field stress, point-in-time facts, source races, detected changes and
 * conflicts, knowledge gaps, candidates, emitted/suppressed cards, proof, the propose-only autonomy
 * plan, the learning hooks, and the Conscience snapshot. Pure type definitions.
 */

import type { TemporalFact } from "@sports/data-intelligence";
import type { RegimeVerdict } from "@sports/engine";

import type { CardClaim } from "./card-claim.js";
import type { DecisionState, MaxPermittedStrength, RequiredStatAudit } from "./decision-state-stat-contract.js";
import type { FieldStress } from "./field-stress.js";
import type { SourceRace } from "./source-race.js";
import type { DecisionCard, SuppressedDecision, AutopsyHook } from "./decision-card.js";
import type { MissedObservation } from "./missed-observation.js";
import type { OverObservation } from "./over-observation.js";
import type { MetaIntelligenceSnapshot } from "./meta-intelligence-snapshot.js";
import type { OperatingPlan } from "./operating-plan.js";

/** Fast clock — odds/props/alt-lines/book-lag/best-number decay. "Did price move before the user could act?" */
export interface MarketClockState {
  readonly velocity: number;        // 0..1
  readonly bookLagDetected: boolean;
  readonly bestNumberDecaying: boolean;
}

/** Medium clock — injuries/usage/projections/add-drop. "Did role truth change before fantasy caught up?" */
export interface RealityFantasyClockState {
  readonly roleDelta: number;          // 0..1
  readonly fantasyAbsorptionGap: number; // 0..1
  readonly crowdMoved: boolean;
}

/** Slow clock — autopsies/ghosts/source-rent/theory. "Is the organism getting sharper?" Owner-facing. */
export interface LearningClockState {
  readonly settledOutcomesPending: number;
  readonly ghostUpdatesPending: number;
  readonly note: string;
}

export interface DetectedChange {
  readonly id: string;
  readonly entityId: string;
  readonly factType: string;
  readonly kind: string; // "role_change" | "market_move" | "fantasy_lag" | ...
  readonly magnitude: number; // 0..1
  readonly note: string;
}

export interface ContradictionRecord {
  readonly entityId: string;
  readonly conflictClass: string;
  readonly verdict: string;
  readonly note: string;
}

export interface SourceRentSummary {
  readonly sourceId: string;
  readonly factsContributed: number;
  readonly decisionLeverageCreated: number;
  readonly note: string;
}

/** A light Phase-0 decision candidate; the full DecisionIR is introduced by the Phase-1 compiler. */
export interface DecisionCandidate {
  readonly entityId: string;
  readonly subject: string;
  readonly decisionState: DecisionState;
  readonly claims: readonly CardClaim[];
  readonly statAudit: RequiredStatAudit;
  readonly claimStrength: MaxPermittedStrength;
}

export interface FieldProofSummary {
  readonly totalFacts: number;
  readonly pointInTimeFacts: number;
  readonly rightsBlockedCount: number;
  readonly futureLeakedCount: number;
  readonly pointInTimeShare: number;
  readonly note: string;
}

export interface FieldLearning {
  readonly autopsyHooks: readonly AutopsyHook[];
  readonly loopOutcomes: readonly string[];
  readonly theoryTransitions: readonly string[];
  readonly ghostUpdates: readonly string[];
}

export interface DecisionFieldFrame {
  readonly frameId: string;
  readonly sport: "NFL";
  readonly week: string;
  readonly capturedAt: string;
  readonly decisionTime: string;

  readonly clocks: {
    readonly marketClock: MarketClockState;
    readonly footballFantasyClock: RealityFantasyClockState;
    readonly learningClock: LearningClockState;
  };
  readonly regime: RegimeVerdict;

  readonly fieldStress: readonly FieldStress[];

  readonly facts: {
    readonly rawSeen: readonly TemporalFact[];
    readonly pointInTime: readonly TemporalFact[];
    readonly rightsBlocked: readonly TemporalFact[];
    readonly futureLeaked: readonly TemporalFact[];
  };

  readonly sourceRaces: readonly SourceRace[];
  readonly sourceRent: readonly SourceRentSummary[];

  readonly detectedChanges: readonly DetectedChange[];
  readonly conflicts: readonly ContradictionRecord[];
  readonly knowledgeGaps: readonly string[];
  readonly missedObservations: readonly MissedObservation[];
  readonly overObservations: readonly OverObservation[];

  readonly decisionCandidates: readonly DecisionCandidate[];
  readonly emittedCards: readonly DecisionCard[];
  readonly suppressedCards: readonly SuppressedDecision[];

  readonly proof: FieldProofSummary;
  readonly autonomyPlan: OperatingPlan;
  readonly learning: FieldLearning;
  readonly conscience: MetaIntelligenceSnapshot;
}
