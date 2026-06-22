/**
 * Agent Run Contract — turn agent/subagent work into reviewable evidence, and make
 * unsafe actions structurally impossible.
 *
 * Every Jarvis-council / Codex / Claude run that touches the repo should produce a
 * typed record: what ran, what it used, what it changed, what it claims, how certain
 * it is, what it verified, and who must approve. The contract enforces the platform's
 * non-negotiables in code: agents draft, they never self-approve, they never take an
 * external action without an explicit owner gate, and any code-modifying run must
 * carry verification commands. Pure, no I/O — a record shape + an evaluator.
 */

export type ReviewStatus = "draft" | "pending" | "approved" | "rejected";
export type PublicImpact = "none" | "internal" | "public";

export interface CostEstimate {
  readonly usd: number;
  readonly note?: string;
}

export interface AgentRunRecord {
  readonly taskId: string;
  readonly parentSeat: string;
  readonly subagentId?: string | null;
  readonly taskType: string;
  readonly inputContext: string;
  readonly sourceRefs: readonly string[];
  readonly toolsUsed: readonly string[];
  readonly filesChanged: readonly string[];
  readonly claimsMade: readonly string[];
  /** Required, non-empty: the run's honest uncertainty / what it is unsure about. */
  readonly uncertainty: string;
  /** The run asserts it checked the prohibited-action list before acting. */
  readonly prohibitedActionsChecked: boolean;
  readonly costEstimate: CostEstimate;
  readonly verificationCommands: readonly string[];
  readonly verificationResults?: string | null;
  /** Agent runs may only be draft/pending — approved/rejected are HUMAN verdicts. */
  readonly reviewStatus: ReviewStatus;
  readonly ownerApprovalRequired: boolean;
  readonly publicImpact: PublicImpact;
  readonly rollbackPlan: string;
  /** Whether this run wants to take an external action (publish/email/post/spend/scrape). */
  readonly requestsExternalAction: boolean;
}

export type ContractDecision = "ALLOW" | "BLOCK";

export interface ContractRuling {
  readonly decision: ContractDecision;
  readonly violations: readonly string[];
}

/**
 * Evaluate a run against the contract. ALLOW only when every non-negotiable holds.
 * External actions are impossible unless ownerApprovalRequired is true AND the run is
 * still draft/pending (it can be queued for a human, never auto-executed).
 */
export function evaluateAgentRun(record: AgentRunRecord): ContractRuling {
  const violations: string[] = [];

  // Agents cannot self-approve or self-reject — those are human verdicts.
  if (record.reviewStatus === "approved" || record.reviewStatus === "rejected") {
    violations.push("review status cannot be self-set to approved/rejected — that is a human verdict");
  }

  // Honest uncertainty is mandatory.
  if (record.uncertainty.trim() === "") {
    violations.push("uncertainty is required");
  }

  // The prohibited-action check must have been performed.
  if (!record.prohibitedActionsChecked) {
    violations.push("prohibitedActionsChecked must be true");
  }

  // Code-modifying runs must carry verification commands.
  if (record.filesChanged.length > 0 && record.verificationCommands.length === 0) {
    violations.push("a code-modifying run must include verification commands");
  }

  // External actions require an explicit owner gate AND a non-executed status.
  if (record.requestsExternalAction) {
    if (!record.ownerApprovalRequired) {
      violations.push("an external action requires ownerApprovalRequired=true");
    }
    if (record.reviewStatus !== "draft" && record.reviewStatus !== "pending") {
      violations.push("an external action may only be queued (draft/pending), never auto-executed");
    }
  }

  // A public-impact run must be owner-gated.
  if (record.publicImpact === "public" && !record.ownerApprovalRequired) {
    violations.push("a public-impact run requires ownerApprovalRequired=true");
  }

  return { decision: violations.length === 0 ? "ALLOW" : "BLOCK", violations };
}
