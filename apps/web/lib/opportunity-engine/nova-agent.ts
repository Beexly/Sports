/**
 * NOVA S4 — Founder OS agent classification layer (read-only).
 *
 * Answers exactly one question — "who is authorized to act on this work
 * item" — and returns a plain classification record. This module performs
 * no I/O, no persistence, and no clock reads (every timestamp/flag is
 * caller-supplied), and exports no execution API: mirroring S2's
 * `executionAuthority: false` convention, nothing here can handle, resolve,
 * dismiss, or act on a work item. It only classifies.
 *
 * S1-S3 don't have an "agent" runtime concept — this module deliberately
 * does not invent one either. There is no autonomous loop, no scheduler, no
 * action dispatcher. "AGENT_INTERNAL" means "safe for NOVA to note and log
 * without owner input", never "safe for NOVA to execute". Execution — if it
 * is ever built — is a different split unit's job, not S4's.
 *
 * Classification is deterministic and escalation-only: a lane's default
 * authority (`DEFAULT_FOUNDER_OPERATING_POLICY.laneDefaultAuthority`) can
 * only move toward MORE owner involvement, never less. There is no
 * condition anywhere in `classifyFounderWork` that downgrades
 * `OWNER_ONLY` to something an agent can log-and-close alone.
 */
import {
  DEFAULT_FOUNDER_OPERATING_POLICY,
  type FounderOperatingPolicy,
  type FounderWorkAuthority,
  type FounderWorkLane,
} from "./founder-command";

/** The signals `classifyFounderWork` reasons over. All caller-supplied —
 *  this module never inspects an `OpportunityCandidate`/`SettlementAnomalyReadModel`/
 *  etc directly, so it stays reusable across every lane without importing
 *  every domain's full contract. */
export interface FounderWorkClassificationInput {
  readonly lane: FounderWorkLane;
  /** True when a human decision is the only way this item resolves. */
  readonly requiresOwnerDecision: boolean;
  /** True when the item is money-bearing (spend, credit, revenue, budget). */
  readonly involvesMoney: boolean;
  /** True when resolving the item requires an action outside NOVA's own
   *  read-only surfaces (installing something, contacting a vendor, …). */
  readonly involvesExternalAction: boolean;
  /** True when the evidence backing this item is FAILED_CLOSED (S3
   *  vocabulary) or otherwise unproven — never let an agent close the loop
   *  on unproven evidence. */
  readonly evidenceIsFailClosed: boolean;
}

export interface FounderWorkClassification {
  readonly authority: FounderWorkAuthority;
  readonly reasons: readonly string[];
  readonly agentCanLogOnly: boolean;
  readonly ownerMustDecide: boolean;
  readonly executionAuthority: false;
}

/** Escalation order — index is "how much owner involvement", ascending. */
const AUTHORITY_RANK: Readonly<Record<FounderWorkAuthority, number>> = {
  AGENT_INTERNAL: 0,
  AGENT_THEN_OWNER: 1,
  OWNER_ONLY: 2,
};

function escalate(
  current: FounderWorkAuthority,
  target: FounderWorkAuthority,
): FounderWorkAuthority {
  return AUTHORITY_RANK[target] > AUTHORITY_RANK[current] ? target : current;
}

/**
 * Classifies one work item's authority. Starts from the lane's policy
 * default and escalates (never de-escalates) based on the supplied
 * signals. Every escalation is recorded in `reasons` so a rendered
 * `FounderWorkItem` can show exactly why the owner is being asked to look
 * at something.
 */
export function classifyFounderWork(
  input: FounderWorkClassificationInput,
  policy: FounderOperatingPolicy = DEFAULT_FOUNDER_OPERATING_POLICY,
): FounderWorkClassification {
  let authority = policy.laneDefaultAuthority[input.lane];
  const reasons: string[] = [`Lane default for ${input.lane}: ${authority}.`];

  if (input.requiresOwnerDecision) {
    const next = escalate(authority, "AGENT_THEN_OWNER");
    if (next !== authority) reasons.push("Item requires an owner decision to resolve.");
    authority = next;
  }

  if (input.involvesMoney) {
    const next = escalate(authority, "OWNER_ONLY");
    if (next !== authority) reasons.push("Item is money-bearing; owner authorization required.");
    authority = next;
  }

  if (input.involvesExternalAction) {
    const next = escalate(authority, "OWNER_ONLY");
    if (next !== authority) {
      reasons.push("Resolving this item requires an external action NOVA cannot take autonomously.");
    }
    authority = next;
  }

  if (input.evidenceIsFailClosed) {
    const next = escalate(authority, "AGENT_THEN_OWNER");
    if (next !== authority) {
      reasons.push("Backing evidence is FAILED_CLOSED; an agent may not close this out alone.");
    }
    authority = next;
  }

  return {
    authority,
    reasons,
    agentCanLogOnly: authority === "AGENT_INTERNAL",
    ownerMustDecide: authority !== "AGENT_INTERNAL",
    executionAuthority: false,
  };
}
