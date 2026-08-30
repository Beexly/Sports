/**
 * NOVA S4 — Founder OS subagent role registry (read-only).
 *
 * A "subagent" here is a role label, not a runtime process: a static
 * mapping from S1's `CouncilReviewer` vocabulary to the `FounderWorkLane`s
 * that role is responsible for *watching and logging*
 * (`FounderWorkAuthority = "AGENT_INTERNAL"`) or *proposing dispositions
 * for* (`"AGENT_THEN_OWNER"`). It exists so the cockpit can say "who is
 * NOVA delegating this lane's autonomous-eligible work to" without
 * inventing a second capability/governance system — S2 already owns
 * capability trust and execution eligibility; this module only labels
 * *which reviewer persona* narrates a lane in the Founder OS brief.
 *
 * No entry here can act. `canActAutonomously` is `false` on every role and
 * there is no dispatch, queue-claim, or execution API exported from this
 * module or anywhere else in S4 — consistent with "no writes, no second
 * dashboard" (freeze §4 S4 gate).
 */
import type { CouncilReviewer } from "./types";
import type { FounderWorkAuthority, FounderWorkLane } from "./founder-command";

export interface FounderSubagentRole {
  readonly reviewer: CouncilReviewer;
  readonly lanes: readonly FounderWorkLane[];
  /** The most autonomy this role is ever narrated as having for its lanes.
   *  `AGENT_INTERNAL` roles may log; nothing above that. */
  readonly maxAuthority: FounderWorkAuthority;
  readonly canActAutonomously: false;
  readonly responsibility: string;
}

/**
 * One row per `CouncilReviewer` value that owns Founder OS narration for at
 * least one lane. `"Owner"` is deliberately excluded — the owner is the
 * decision-maker the queue exists for, not a subagent role.
 */
export const FOUNDER_SUBAGENT_ROLES: readonly FounderSubagentRole[] = Object.freeze([
  Object.freeze({
    reviewer: "JARVIS",
    lanes: Object.freeze(["CAPABILITY_GOVERNANCE"]) as readonly FounderWorkLane[],
    maxAuthority: "AGENT_INTERNAL" as const,
    canActAutonomously: false as const,
    responsibility:
      "Watches S2 capability-governance recommendations (held/ineligible inspection candidates) and logs them; never activates a capability.",
  }),
  Object.freeze({
    reviewer: "RELAY",
    lanes: Object.freeze(["SOURCE_INTELLIGENCE"]) as readonly FounderWorkLane[],
    maxAuthority: "AGENT_INTERNAL" as const,
    canActAutonomously: false as const,
    responsibility:
      "Watches S3 source-registry/evidence state (terms-review-pending sources, FAILED_CLOSED receipts) and logs it; never enables a source or bypasses clearance.",
  }),
  Object.freeze({
    reviewer: "NOVA",
    lanes: Object.freeze(["REVENUE_OPPORTUNITY"]) as readonly FounderWorkLane[],
    maxAuthority: "AGENT_THEN_OWNER" as const,
    canActAutonomously: false as const,
    responsibility:
      "Proposes a disposition for scored S1 opportunity candidates for owner confirmation; never approves spend or publishes on its own.",
  }),
  Object.freeze({
    reviewer: "AUDIT",
    lanes: Object.freeze([
      "CREDIT_LIFECYCLE",
      "SETTLEMENT_ANOMALY",
      "CONTROL_PLANE_ECONOMICS",
    ]) as readonly FounderWorkLane[],
    maxAuthority: "OWNER_ONLY" as const,
    canActAutonomously: false as const,
    responsibility:
      "Surfaces credit-grant health, settlement anomalies, and control-plane configuration/budget events into the owner queue; owns no write path into any of the three.",
  }),
]);

/** All lanes with no `FOUNDER_SUBAGENT_ROLES` entry read as OWNER_ONLY by
 *  default via `DEFAULT_FOUNDER_OPERATING_POLICY` — there is no implicit
 *  "unassigned lanes are agent-handled" fallback anywhere in this module. */
export function subagentsForLane(lane: FounderWorkLane): readonly FounderSubagentRole[] {
  return FOUNDER_SUBAGENT_ROLES.filter((role) => role.lanes.includes(lane));
}

export function findSubagentRole(reviewer: CouncilReviewer): FounderSubagentRole | undefined {
  return FOUNDER_SUBAGENT_ROLES.find((role) => role.reviewer === reviewer);
}
