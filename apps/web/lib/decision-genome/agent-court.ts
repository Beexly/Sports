/**
 * AgentCourt — agents as accountable witnesses, not personalities.
 *
 * Decision Genome build step F. Before an outcome settles, agents stake confidence on
 * falsifiable claims. After it settles, those claims are scored, and each agent accrues
 * credibility by claim type. This turns SCOUT/TAL/AVA/BOBBY/SARAH/JARVIS from flavour
 * into a record you can audit — without granting any new external autonomy. Agents only
 * ever draft and escalate; nothing here executes an outside action.
 *
 * Scoring is a Brier score on the staked probability vs the binary resolution, so a
 * confident wrong claim is punished more than a hedged one. Pure, in-memory.
 */

/** The six staking witnesses named in the Decision Genome doctrine (subset of the registry). */
export type AgentId = "scout" | "tal" | "ava" | "bobby" | "sarah" | "jarvis";

export const COURT_AGENTS: readonly AgentId[] = ["scout", "tal", "ava", "bobby", "sarah", "jarvis"];

/** What each agent is accountable for — keeps claims in their lane. */
export const AGENT_DOMAINS: Readonly<Record<AgentId, string>> = {
  scout: "line-movement / candidate-beats-close",
  tal: "source reliability / freshness / independence",
  ava: "public-claim supportability",
  bobby: "offer converts without trust damage",
  sarah: "users understand the framing",
  jarvis: "synthesis supports owner approval / hard-stop",
};

export type AgentClaimType =
  | "line-will-move"
  | "beats-close"
  | "source-insufficient"
  | "claim-supportable"
  | "offer-converts"
  | "framing-understood"
  | "owner-approve";

export interface AgentClaim {
  readonly id: string;
  readonly agent: AgentId;
  readonly type: AgentClaimType;
  readonly statement: string;
  /** Staked probability the claim is TRUE, in [0,1], before resolution. */
  readonly confidence: number;
  readonly stakedAt: number;
  readonly resolvesAt: number;
}

export interface ScoredAgentClaim extends AgentClaim {
  /** Whether the claim turned out true. */
  readonly outcome: boolean;
  /** Brier score in [0,1]; lower is better. */
  readonly brier: number;
  readonly settledAt: number;
}

export interface AgentCredibility {
  readonly agent: AgentId;
  readonly settledClaims: number;
  /** Mean Brier across settled claims (lower is better); null when none settled. */
  readonly meanBrier: number | null;
  /** Calibration-ish accuracy: share of claims where stake direction matched outcome. */
  readonly directionalAccuracy: number | null;
}

/** Clamp a probability into [0,1]. */
function clamp01(p: number): number {
  if (Number.isNaN(p)) return 0.5;
  return Math.max(0, Math.min(1, p));
}

/** Brier score for a single probabilistic claim. */
export function brierScore(confidence: number, outcome: boolean): number {
  const p = clamp01(confidence);
  const y = outcome ? 1 : 0;
  return (p - y) * (p - y);
}

/** Settle a staked claim against its realized outcome. Pure. */
export function settleClaim(claim: AgentClaim, outcome: boolean, settledAt = 0): ScoredAgentClaim {
  return { ...claim, outcome, brier: brierScore(claim.confidence, outcome), settledAt };
}

/** The court: register falsifiable claims, settle them, and read off credibility. */
export class AgentCourt {
  private readonly open = new Map<string, AgentClaim>();
  private readonly settled: ScoredAgentClaim[] = [];

  /** Stake a claim. Confidence is clamped to [0,1]; agent must be a court agent. */
  stake(claim: AgentClaim): AgentClaim {
    if (!COURT_AGENTS.includes(claim.agent)) {
      throw new Error(`Unknown court agent: ${claim.agent}`);
    }
    const normalized: AgentClaim = { ...claim, confidence: clamp01(claim.confidence) };
    this.open.set(claim.id, normalized);
    return normalized;
  }

  /** Resolve an open claim by id. Returns the scored claim, or null if not found. */
  resolve(claimId: string, outcome: boolean, settledAt = 0): ScoredAgentClaim | null {
    const claim = this.open.get(claimId);
    if (!claim) return null;
    this.open.delete(claimId);
    const scored = settleClaim(claim, outcome, settledAt);
    this.settled.push(scored);
    return scored;
  }

  openClaims(): readonly AgentClaim[] {
    return [...this.open.values()];
  }

  settledClaims(): readonly ScoredAgentClaim[] {
    return this.settled;
  }

  /** Credibility for one agent across its settled claims. */
  credibility(agent: AgentId): AgentCredibility {
    const mine = this.settled.filter((c) => c.agent === agent);
    if (mine.length === 0) {
      return { agent, settledClaims: 0, meanBrier: null, directionalAccuracy: null };
    }
    const meanBrier = mine.reduce((s, c) => s + c.brier, 0) / mine.length;
    const directional = mine.filter((c) => (c.confidence >= 0.5) === c.outcome).length / mine.length;
    return { agent, settledClaims: mine.length, meanBrier, directionalAccuracy: directional };
  }

  /** Credibility leaderboard across all court agents (only those with settled claims). */
  leaderboard(): readonly AgentCredibility[] {
    return COURT_AGENTS.map((a) => this.credibility(a))
      .filter((c) => c.settledClaims > 0)
      .sort((a, b) => (a.meanBrier ?? 1) - (b.meanBrier ?? 1));
  }
}
