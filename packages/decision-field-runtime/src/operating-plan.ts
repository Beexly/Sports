/**
 * DECISION FIELD RUNTIME — Operating Plan (propose-only nervous system, Phase-0 seed).
 *
 * The organism may PROPOSE its next move but never execute an irreversible/outward/spend/gate action.
 * Every `AutonomousAction` carries `status: "PROPOSED"` as a LITERAL type — an executed
 * publish/spend/roster/gate-flip is un-constructible here — generalizing the discovery-engine's
 * `DiscoveryProposalStatus = "PROPOSED"` trick. `assertBoundedAutonomy` is the runtime backstop,
 * mirroring `assertAllProposed`. The full @sports/autonomy package (Phase 1C) hardens this. Pure.
 */

export type ProposedStatus = "PROPOSED";

export type AuthorityLevel = "SELF" | "OWNER_GATE" | "CLAUDE_REVIEW" | "NEVER";

export type AutonomousActionType =
  | "OBSERVE"
  | "INGEST_FREE"
  | "CLASSIFY"
  | "COMPILE_CARD"
  | "RUN_AUTOPSY"
  | "PROPOSE_PAID_SOURCE"
  | "SHIP_SHADOW_CARD"
  | "PUBLISH_CARD"
  | "SPEND"
  | "ROSTER_WRITE"
  | "FLIP_GATE";

/** The single source of truth for what the machine may do alone vs. what stays owner-gated. */
export const AUTHORITY_CHARTER: Readonly<Record<AutonomousActionType, AuthorityLevel>> = {
  OBSERVE: "SELF",
  INGEST_FREE: "SELF",
  CLASSIFY: "SELF",
  COMPILE_CARD: "SELF",
  RUN_AUTOPSY: "SELF",
  PROPOSE_PAID_SOURCE: "CLAUDE_REVIEW",
  SHIP_SHADOW_CARD: "CLAUDE_REVIEW",
  PUBLISH_CARD: "OWNER_GATE",
  SPEND: "OWNER_GATE",
  ROSTER_WRITE: "OWNER_GATE",
  FLIP_GATE: "OWNER_GATE",
};

export function authorityFor(type: AutonomousActionType): AuthorityLevel {
  return AUTHORITY_CHARTER[type];
}

export interface AutonomousAction {
  readonly id: string;
  readonly type: AutonomousActionType;
  readonly subject: string;
  readonly rationale: string;
  readonly status: ProposedStatus;
  readonly authority: AuthorityLevel;
  readonly reversible: boolean;
  readonly costPreview?: string;
}

export interface OperatingPlan {
  readonly frameId: string;
  readonly proposedActions: readonly AutonomousAction[];
  readonly ownerApprovalsNeeded: readonly AutonomousAction[];
  readonly note: string;
}

/** Construct a proposed action; authority is always derived from the charter, never caller-set. */
export function proposeAction(
  id: string,
  type: AutonomousActionType,
  subject: string,
  rationale: string,
  reversible: boolean,
  costPreview?: string,
): AutonomousAction {
  return { id, type, subject, rationale, status: "PROPOSED", authority: authorityFor(type), reversible, ...(costPreview ? { costPreview } : {}) };
}

/**
 * Runtime backstop (mirrors `assertAllProposed`): every action must be PROPOSED, every action's
 * authority must match the charter, and any owner-gated action must NOT be marked SELF. Throws on
 * violation so a forged "executed" action can never escape a test.
 */
export function assertBoundedAutonomy(plan: OperatingPlan): void {
  for (const a of [...plan.proposedActions, ...plan.ownerApprovalsNeeded]) {
    if (a.status !== "PROPOSED") {
      throw new Error(`Bounded-autonomy violation: action ${a.id} has status "${a.status}", expected "PROPOSED".`);
    }
    const charterAuthority = AUTHORITY_CHARTER[a.type];
    if (a.authority !== charterAuthority) {
      throw new Error(`Bounded-autonomy violation: action ${a.id} (${a.type}) authority "${a.authority}" ≠ charter "${charterAuthority}".`);
    }
    if (charterAuthority !== "SELF" && a.authority === "SELF") {
      throw new Error(`Bounded-autonomy violation: owner-gated action ${a.id} (${a.type}) marked SELF.`);
    }
  }
}
