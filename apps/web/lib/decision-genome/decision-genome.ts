/**
 * DecisionGenome — the atomic object behind every play, pass, wait, suppress, publish,
 * quarantine, contest adjustment, warning, autopsy, and pricing decision.
 *
 * Decision Genome build step B. A genome is NOT a pick. The pick is only the last
 * visible artifact. The genome is the full pre-result chain: what was known, when, from
 * where, how uncertain, what the agents staked, what compliance allowed, and how it will
 * be judged later. Everything else in GSE becomes a view, workflow, proof card, or
 * learning event around this object.
 *
 * Pure types + a constructor helper. No I/O, no persistence here — persistence is an
 * additive plan layered on top. Honours the launch guardrails: projections stay shadow
 * (`priced` is never set true here), confidence always carries calibration context,
 * agents only ever draft/escalate.
 */

import type { AgentId } from "./agent-court";
import type { ApertureState } from "./aperture";
import type { KnowabilityStamps, DecisionWindow, UsePermissions } from "./knowability";

export type DecisionType =
  | "play"
  | "pass"
  | "wait"
  | "shadow"
  | "suppress"
  | "publish"
  | "quarantine"
  | "contest-adjustment"
  | "warning"
  | "autopsy"
  | "pricing";

/** Layer 1 — time / knowability state. */
export interface TimeState {
  readonly window: DecisionWindow;
  /** Stamp summary for the decision's own inputs (the binding constraint is the window). */
  readonly stamps: KnowabilityStamps;
}

/** Layer 2 — market state. */
export interface MarketState {
  readonly book: string;
  readonly line: number;
  readonly price: number;
  /** Devigged fair probability implied by the market (0–1), when computed. */
  readonly devigFairProb?: number;
  readonly consensus?: number;
  /** A proxy for sharp money direction, when available. */
  readonly sharpProxy?: number;
  /** Line volatility / rate of change ("temperature"). */
  readonly volatility?: number;
  /** Lead-lag of this book vs the market ("viscosity"). */
  readonly bookLagMs?: number;
  /** Estimated edge half-life in ms — how fast the opportunity disappears. */
  readonly edgeHalfLifeMs?: number;
  /** Could a real user actually reach this number? (friction/availability). */
  readonly userAvailable: boolean;
}

export type SourceTier = "official" | "tier1" | "tier2" | "rumor" | "unknown";

/** Layer 3 — evidence state. */
export interface EvidenceState {
  readonly sourceTier: SourceTier;
  /** Independent source count (copies of one origin do not count). */
  readonly independentSources: number;
  /** Freshest evidence age in minutes; null when unknown. */
  readonly freshnessAgeMinutes: number | null;
  readonly rightsCleared: boolean;
  /** True if sources materially conflict. */
  readonly conflict: boolean;
  /** True if any feeding claim is rumor-quarantined. */
  readonly rumorQuarantined: boolean;
  readonly permissions: UsePermissions;
}

/** Layer 4 — model state. Confidence NEVER travels without calibration context. */
export interface ModelState {
  readonly modelVersion: string;
  /** Modeled probability (0–1). */
  readonly probability: number;
  /** Display confidence 0–100 (calibrated scale). */
  readonly confidenceDisplay: number;
  /** Symmetric/asymmetric uncertainty band on the probability. */
  readonly uncertaintyBand: { readonly low: number; readonly high: number };
  /** Calibration health, in [0,1]. Required context for any confidence. */
  readonly calibrationHealth: number;
  /** Conformal / abstention state — did the model refuse? */
  readonly refused: boolean;
}

/** A single agent's staked position on this decision (the AgentCourt seed). */
export interface AgentPosition {
  readonly agent: AgentId;
  readonly claim: string;
  /** Staked confidence 0–1 before the outcome is known. */
  readonly confidence: number;
  /** Objection, if the agent dissents. */
  readonly objection?: string;
}

/** Layer 5 — agent state. */
export interface AgentState {
  readonly positions: readonly AgentPosition[];
}

export type RiskPosture = "conservative" | "balanced" | "aggressive";

/** Layer 6 — user state (per-decision context; never used to exploit). */
export interface UserState {
  readonly jurisdiction: string;
  readonly availableBooks: readonly string[];
  readonly riskPosture: RiskPosture;
  /** Count of prior warnings this user has received (protection signal). */
  readonly priorWarnings: number;
}

/** Layer 7 — legal / compliance state. */
export interface ComplianceState {
  readonly rightsCleared: boolean;
  /** Whether a public claim is permitted at all for this decision. */
  readonly publicClaimAllowed: boolean;
  /** Contest/fantasy/sweepstakes boundary respected. */
  readonly contestBoundaryRespected: boolean;
  /** Responsible-gaming risk flag. */
  readonly responsibleGamingRisk: boolean;
  /** Banned-language scan passed. */
  readonly languageClean: boolean;
}

/** Layer 8 — proof state. Populated progressively as the decision resolves. */
export interface ProofState {
  /** Closing-line value (beat-close margin), when graded. */
  readonly clv?: number;
  readonly roi?: number;
  readonly brier?: number;
  readonly ece?: number;
  /** Graded value of a no-bet / pass / suppression after resolution. */
  readonly savedLoss?: number;
  /** Whether this decision is eligible to become a (draft) proof card. */
  readonly proofCardEligible: boolean;
  /** Projections stay shadow until earned — this is NEVER set true by the engine. */
  readonly priced: false;
}

/** Layer 9 — learning state. */
export interface LearningState {
  readonly whatChanged: readonly string[];
  readonly promoted: readonly string[];
  readonly demoted: readonly string[];
  /** Inputs that must never influence the model again (e.g. leaked or contaminated). */
  readonly neverAgain: readonly string[];
}

/** The full Decision Genome. */
export interface DecisionGenome {
  readonly id: string;
  readonly schemaVersion: number;
  readonly decisionType: DecisionType;
  /** The aperture verdict for this decision (Signal/Shadow/Wait/Pass/Quarantine). */
  readonly aperture: ApertureState;
  readonly time: TimeState;
  readonly market: MarketState;
  readonly evidence: EvidenceState;
  readonly model: ModelState;
  readonly agents: AgentState;
  readonly user: UserState;
  readonly compliance: ComplianceState;
  readonly proof: ProofState;
  readonly learning: LearningState;
}

export const DECISION_GENOME_SCHEMA_VERSION = 1;

/**
 * Build a genome from its layers, stamping the schema version. Pure. Does not decide the
 * aperture state — that is `evaluateAperture`'s job — the caller passes the computed one
 * to keep this a dumb constructor.
 */
export function makeDecisionGenome(
  input: Omit<DecisionGenome, "schemaVersion">,
): DecisionGenome {
  return { ...input, schemaVersion: DECISION_GENOME_SCHEMA_VERSION };
}
