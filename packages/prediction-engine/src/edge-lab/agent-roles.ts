/**
 * Multi-agent Edge Lab — role interfaces & debate summary types.
 *
 * Adapts TradingAgents-style debate structure to sports edge discovery:
 * Market Microstructure Analyst, Feature Analyst, Placebo Analyst,
 * Calibration Analyst, Decision Agent, Risk/Honesty Guardian, Glass Ledger.
 *
 * Thin typed contracts only. Orchestrator / council runner is a later stub.
 * Everything that affects a displayed probability must remain recomputable
 * from the Glass Ledger (honesty invariant).
 */

export type EdgeLabAgentRole =
  | "market_microstructure"
  | "feature_analyst"
  | "placebo_analyst"
  | "calibration_analyst"
  | "decision_agent"
  | "risk_honesty_guardian"
  | "glass_ledger";

export interface EdgeLabContext {
  readonly slateId: string;
  readonly asOf: string; // ISO timestamp
  readonly sport: string;
  readonly marketType?: string;
  readonly features?: Readonly<Record<string, number | string | boolean>>;
  readonly marketImpliedProb?: number;
  readonly modelScore?: number;
  readonly multiprob?: { p0: number; p1: number; width: number };
  readonly conformalWidth?: number;
  readonly taxonomyCategory?: string;
  /**
   * Number of calibration rows backing `multiprob` for this stratum, when
   * known. Lets the Risk/Honesty Guardian distinguish "we evaluated this and
   * the interval is wide" from "we never had enough settled history to
   * evaluate it at all" — the same distinction selective-gate.ts's
   * MIN_STRATUM_CALIBRATION draws for the production gate.
   */
  readonly calibrationSampleSize?: number;
  /**
   * Result of a placebo (label-shuffle) check on the signal driving this
   * candidate, when one has been run upstream. Undefined means "no placebo
   * check was run for this context" — NOT "it passed" — and every reference
   * agent in this module treats it that way.
   */
  readonly placeboSurvived?: boolean;
}

export interface AgentOpinion {
  readonly role: EdgeLabAgentRole;
  readonly stance: "support" | "oppose" | "abstain" | "flag";
  readonly confidence: number; // [0, 1]
  readonly rationale: string;
  readonly metrics?: Readonly<Record<string, number>>;
  readonly noBetSignal?: boolean;
}

export interface DebateRound {
  readonly round: number;
  readonly opinions: readonly AgentOpinion[];
  readonly summary: string;
}

export interface DebateSummary {
  readonly slateId: string;
  readonly asOf: string;
  readonly rounds: readonly DebateRound[];
  readonly finalDecision: "bet" | "no_bet" | "reduce_size" | "review";
  readonly primaryReason: string;
  readonly honestyFlags: readonly string[];
  readonly ledgerCommitmentHint?: string;
}

/** Role contract — each agent implements this pure-ish interface. */
export interface EdgeLabAgent {
  readonly role: EdgeLabAgentRole;
  /** Produce an opinion given context + prior opinions (for sequential debate). */
  evaluate(
    ctx: EdgeLabContext,
    prior: readonly AgentOpinion[],
  ): AgentOpinion | Promise<AgentOpinion>;
}

/** Minimal orchestrator stub signature. */
export interface EdgeLabCouncil {
  readonly agents: readonly EdgeLabAgent[];
  runDebate(ctx: EdgeLabContext, maxRounds?: number): Promise<DebateSummary>;
}

/** Factory helper for a static opinion (useful in tests / placeholder agents). */
export function staticOpinion(
  role: EdgeLabAgentRole,
  stance: AgentOpinion["stance"],
  rationale: string,
  confidence = 0.5,
  extra?: Partial<AgentOpinion>,
): AgentOpinion {
  return {
    role,
    stance,
    confidence,
    rationale,
    ...extra,
  };
}
