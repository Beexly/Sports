/**
 * Task dispatch — Jarvis's routing brain.
 *
 * Jarvis does not execute. He prepares a DispatchPlan: which department
 * head owns the work, the steps, the risk, and whether the owner must
 * approve. Every state-changing category requires approval — that is a
 * hard invariant, tested. "No fake autonomy": a plan's status is
 * PROPOSED until a human acts on it; nothing in this module runs code,
 * publishes data, or touches external systems.
 */

import { getCouncilMember, type AgentCouncilMember } from "./agent-council";

export type TaskCategory =
  | "OVERNIGHT_LOOP"   // run the full nightly cycle (refresh → settle → report)
  | "FIX"              // repair something broken
  | "BUILD"            // new feature or surface
  | "INVESTIGATE"      // diagnose, no changes
  | "CONTENT"          // draft content (never publishes)
  | "DATA_REFRESH"     // ingestion cycle
  | "SETTLEMENT"       // grade completed games
  | "REVIEW";          // human-judgment review pass

export type DispatchStatus = "PROPOSED" | "APPROVED" | "DECLINED";

export interface DispatchPlan {
  readonly id: string;
  readonly category: TaskCategory;
  /** The owner's words, verbatim — the plan answers this, nothing else. */
  readonly request: string;
  readonly assignedAgentId: string;
  readonly assignedAgentName: string;
  readonly steps: readonly string[];
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH";
  /** True for everything that changes state. Investigations are read-only. */
  readonly requiresApproval: boolean;
  readonly status: DispatchStatus;
  readonly createdAt: string;
  readonly approvalNote: string;
}

/** Department head per category. Ids are council seats (agent-council.ts). */
const CATEGORY_OWNER: Readonly<Record<TaskCategory, string>> = {
  OVERNIGHT_LOOP: "jarvis",
  FIX: "tal",
  BUILD: "tal",
  INVESTIGATE: "performance-auditor",
  CONTENT: "ava",
  DATA_REFRESH: "tal",
  SETTLEMENT: "settlement-officer",
  REVIEW: "quality-officer",
};

const CATEGORY_STEPS: Readonly<Record<TaskCategory, readonly string[]>> = {
  OVERNIGHT_LOOP: [
    "Run data refresh across all 7 sports (cron: /api/cron/refresh-odds)",
    "Settle completed games (cron: /api/cron/settle-picks)",
    "Rebuild OwnerSummary and department reports",
    "Surface anything that crossed a threshold overnight",
  ],
  FIX: [
    "Reproduce and isolate the failure",
    "Prepare the fix on a branch with tests",
    "Run typecheck + tests + build before surfacing",
  ],
  BUILD: [
    "Write the scope as one sentence the owner can veto",
    "Implement with tests on a branch",
    "Gates green before surfacing for review",
  ],
  INVESTIGATE: [
    "Gather state from registries and OwnerSummary (read-only)",
    "Report findings with sources — no changes made",
  ],
  CONTENT: [
    "Draft to INTERNAL visibility only",
    "Attach source coverage and compliance evidence",
    "Queue for operator review — never auto-publish",
  ],
  DATA_REFRESH: [
    "Trigger ingestion for requested sports",
    "Validate freshness timestamps post-run",
  ],
  SETTLEMENT: [
    "Fetch final scores for completed games",
    "Grade pending picks; update the public record",
  ],
  REVIEW: [
    "Pull the artifact and its evidence trail",
    "Apply the review checklist; record verdict in the vault",
  ],
};

const READ_ONLY: ReadonlySet<TaskCategory> = new Set(["INVESTIGATE"]);

const CATEGORY_RISK: Readonly<Record<TaskCategory, DispatchPlan["riskLevel"]>> = {
  OVERNIGHT_LOOP: "MEDIUM",
  FIX: "MEDIUM",
  BUILD: "MEDIUM",
  INVESTIGATE: "LOW",
  CONTENT: "LOW",
  DATA_REFRESH: "MEDIUM",
  SETTLEMENT: "HIGH",
  REVIEW: "LOW",
};

let dispatchSeq = 0;

export function planDispatch(
  request: string,
  category: TaskCategory,
  nowIso: string
): DispatchPlan {
  dispatchSeq += 1;
  const ownerId = CATEGORY_OWNER[category];
  const seat: AgentCouncilMember | undefined = getCouncilMember(ownerId);
  const requiresApproval = !READ_ONLY.has(category);
  return {
    id: `dispatch-${nowIso.slice(0, 10)}-${dispatchSeq}`,
    category,
    request,
    assignedAgentId: ownerId,
    assignedAgentName: seat?.displayName ?? ownerId,
    steps: CATEGORY_STEPS[category],
    riskLevel: CATEGORY_RISK[category],
    requiresApproval,
    status: "PROPOSED",
    createdAt: nowIso,
    approvalNote: requiresApproval
      ? "Changes state — runs only after your explicit approval."
      : "Read-only — no approval needed; findings will be reported.",
  };
}
