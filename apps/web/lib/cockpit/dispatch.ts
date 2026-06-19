/**
 * Operator Cockpit — Scheduled Dispatch Loop (pure advancement core)
 *
 * This is the brain of the autonomous dispatch loop. The cockpit used to be
 * read-only: tasks were filed (mostly by other crons, e.g. stale-ingestion) and
 * then sat in NEW until a human moved them. This module makes the queue MOVE on
 * its own — but only across the SAFE, automation-owned segment of the state
 * machine:
 *
 *     NEW ──► ROUTED ──► DRAFTED ──► NEEDS_REVIEW ──[ PARKED: human gate ]
 *
 * The human approval gate (NEEDS_REVIEW → APPROVED / REJECTED) is NEVER crossed
 * here. By construction this module can only ever request one of the three safe
 * forward moves above (see `nextAutomatedStatus`), so it is *structurally*
 * incapable of producing APPROVED — and `transitions.ts` would refuse it anyway
 * (DRAFTED→APPROVED and NEW→APPROVED are not in the allow-list).
 *
 * Design notes:
 *   - PURE-ISH + TESTABLE: `advanceCockpitTask` takes the task plus a transition
 *     EXECUTOR (the thing that actually writes). In production the executor is a
 *     thin wrapper over `transitionTask(db, …)`; in tests it is a fake that
 *     records calls and needs no DB. This module performs no I/O itself.
 *   - DETERMINISTIC, FREE, SIDE-EFFECT-FREE drafting: the DRAFTED note and the
 *     NEEDS_REVIEW self-audit are computed from existing static registries
 *     (the cockpit AGENTS roster + the AGENT_OS charter/mission). NO LLM call.
 *     LLM-backed drafting is an explicit future follow-up (see TODO below).
 *   - ONE STEP PER RUN: each task advances at most one hop per dispatch run, so
 *     re-running is harmless and a partially-processed batch is always coherent.
 *   - NO external action, no publish, no spend, no gate flip, no model change.
 *     Every move is an internal CockpitDecision record only — written by the
 *     executor via `transitionTask`, never by writing status directly.
 *
 * TODO(llm-drafting): the DRAFTED note is currently a deterministic plan derived
 * from the owning agent's charter. A future slice can replace `composeDraftNote`
 * with an LLM-backed drafter (Claude) that proposes the actual remediation/
 * content draft. That is an explicit, gated follow-up — it MUST keep the same
 * "never crosses NEEDS_REVIEW→APPROVED" guarantee and stay never-throw.
 */

import type {
  CockpitTask,
  CockpitTaskStatus,
  Prisma,
} from "@prisma/client";
import { AGENTS, type AgentKey } from "./agents";
import { getAgent as getAgentOsDefinition } from "@/lib/agents/agent-registry";

// ─────────────────────────────────────────────
// Status segments this loop is allowed to touch
// ─────────────────────────────────────────────

/**
 * The ONLY statuses the dispatch loop will pick up. Anything else
 * (NEEDS_REVIEW, APPROVED, REJECTED, BLOCKED, ARCHIVED) is owner-owned or
 * terminal and is deliberately excluded — the loop never advances those.
 */
export const DISPATCHABLE_STATUSES = ["NEW", "ROUTED", "DRAFTED"] as const;
export type DispatchableStatus = (typeof DISPATCHABLE_STATUSES)[number];

/**
 * The single safe forward hop for each dispatchable status. This map is the
 * structural proof that automation cannot reach APPROVED: there is no key whose
 * value is APPROVED (or REJECTED), and NEEDS_REVIEW is intentionally absent as a
 * *key* so the loop never advances a task that is already parked at the human
 * gate. Compare with the full allow-list in transitions.ts — this is a strict,
 * forward-only subset.
 */
const NEXT_AUTOMATED_STATUS: Readonly<Record<DispatchableStatus, CockpitTaskStatus>> = {
  NEW: "ROUTED",
  ROUTED: "DRAFTED",
  DRAFTED: "NEEDS_REVIEW",
};

/** Type guard: is this status one the dispatch loop is allowed to advance? */
export function isDispatchable(status: CockpitTaskStatus): status is DispatchableStatus {
  return (DISPATCHABLE_STATUSES as readonly CockpitTaskStatus[]).includes(status);
}

/**
 * Returns the one safe next status for a dispatchable task, or null if the task
 * is not in a dispatchable state. NEVER returns APPROVED/REJECTED.
 */
export function nextAutomatedStatus(status: CockpitTaskStatus): CockpitTaskStatus | null {
  return isDispatchable(status) ? NEXT_AUTOMATED_STATUS[status] : null;
}

// ─────────────────────────────────────────────
// Transition executor seam (the testable boundary)
// ─────────────────────────────────────────────

/** What the executor needs from a transition request. Mirrors TransitionInput. */
export interface DispatchTransitionRequest {
  readonly taskId: string;
  readonly toStatus: CockpitTaskStatus;
  readonly reviewer: string;
  readonly note: string;
  readonly evidence: Prisma.InputJsonValue;
}

/**
 * The side-effecting boundary. In production this is backed by
 * `transitionTask(db, …)`; in tests it is a fake. It resolves on success and
 * rejects on failure (e.g. a refused transition) — the caller catches per task.
 */
export type DispatchTransitionExecutor = (
  request: DispatchTransitionRequest
) => Promise<void>;

// ─────────────────────────────────────────────
// Outcome reporting
// ─────────────────────────────────────────────

export type DispatchOutcomeKind = "advanced" | "skipped" | "error";

export interface DispatchOutcome {
  readonly taskId: string;
  readonly kind: DispatchOutcomeKind;
  /** Status the task was in before this run. */
  readonly fromStatus: CockpitTaskStatus;
  /** Status it was advanced to, when kind === "advanced". */
  readonly toStatus: CockpitTaskStatus | null;
  /** Human-readable reason for a skip or error. */
  readonly reason?: string;
}

// ─────────────────────────────────────────────
// Deterministic routing / drafting / self-audit
// ─────────────────────────────────────────────

/** Reviewer id stamped on every automated decision row. */
export const DISPATCH_REVIEWER = "system:dispatch";

/** The 6 cockpit OperatorAgent seats are the valid routing targets. */
const KNOWN_AGENT_KEYS = Object.keys(AGENTS) as AgentKey[];

/**
 * Decide the owning agent for a NEW task. The CockpitTask schema already carries
 * a non-null `assignedAgent` (the writer that filed the task picked it — e.g.
 * the stale-ingestion writer routes to TAL). Routing here CONFIRMS that owner
 * against the canonical AGENTS roster and records the rationale, rather than
 * inventing a parallel routing system. If a stored agent is somehow not a known
 * seat, we fall back to JARVIS (the orchestration seat) — the same seat the rest
 * of the cockpit treats as the router of last resort.
 */
export function resolveOwningAgent(task: Pick<CockpitTask, "assignedAgent">): AgentKey {
  return KNOWN_AGENT_KEYS.includes(task.assignedAgent) ? task.assignedAgent : "JARVIS";
}

/**
 * Compose the NEW→ROUTED note: a short, deterministic statement of which agent
 * owns the task and why, sourced from the cockpit AGENTS roster responsibility
 * line (not fabricated).
 */
function composeRoutingNote(task: Pick<CockpitTask, "assignedAgent" | "source">): string {
  const agentKey = resolveOwningAgent(task);
  const agent = AGENTS[agentKey];
  return (
    `Routed to ${agent.displayName} (${agent.key}). ` +
    `Responsibility: ${agent.responsibility}`
  );
}

/** Routing evidence: the rationale, captured as structured JSON for audit. */
function composeRoutingEvidence(
  task: Pick<CockpitTask, "assignedAgent" | "source">
): Prisma.InputJsonValue {
  const agentKey = resolveOwningAgent(task);
  const agent = AGENTS[agentKey];
  return {
    step: "NEW->ROUTED",
    owningAgent: agent.key,
    owningAgentDisplay: agent.displayName,
    confirmedFromStoredAssignment: task.assignedAgent === agentKey,
    storedAssignment: task.assignedAgent,
    taskSource: task.source,
    externalActions: agent.externalActions, // "NONE" — proves no external effect
    rationale:
      "Owning seat confirmed against the cockpit agent roster; no external action implied.",
  };
}

/**
 * Compose the ROUTED→DRAFTED note: a deterministic plan derived from the owning
 * agent's AGENT_OS charter/mission (existing registry data), NOT an LLM call.
 * This is the honest "deterministic placeholder pending LLM-backed drafting".
 */
function composeDraftNote(task: Pick<CockpitTask, "assignedAgent" | "title">): string {
  const agentKey = resolveOwningAgent(task);
  const agent = AGENTS[agentKey];
  const osDef = getAgentOsDefinition(agentKey.toLowerCase());
  const mission = osDef?.mission ?? agent.responsibility;
  const safeActions = agent.safeActions.join("; ");
  return (
    `Draft plan for "${task.title}" — owner ${agent.displayName}. ` +
    `Mission: ${mission} ` +
    `Safe next actions available to this seat: ${safeActions}. ` +
    `(Deterministic draft from agent charter; LLM-backed drafting is a future follow-up.)`
  );
}

/** Drafting evidence: the plan inputs, captured as structured JSON for audit. */
function composeDraftEvidence(
  task: Pick<CockpitTask, "assignedAgent" | "title">
): Prisma.InputJsonValue {
  const agentKey = resolveOwningAgent(task);
  const agent = AGENTS[agentKey];
  const osDef = getAgentOsDefinition(agentKey.toLowerCase());
  return {
    step: "ROUTED->DRAFTED",
    owningAgent: agent.key,
    draftingMethod: "deterministic-charter", // explicitly NOT an LLM call
    mission: osDef?.mission ?? agent.responsibility,
    safeActions: agent.safeActions,
    implementationStatus: osDef?.implementationStatus ?? "UNKNOWN",
    llmBackedDrafting: "future-follow-up",
  };
}

/**
 * The DRAFTED→NEEDS_REVIEW self-audit. Deterministic: a task is ready to park at
 * the human gate only when it carries the artifacts a reviewer needs — a draft
 * note (decisionNotes) and a recorded owning agent. Returns the structured audit
 * either way; `passed` drives whether we park or skip.
 */
export interface SelfAuditResult {
  readonly passed: boolean;
  readonly checks: Readonly<Record<string, boolean>>;
  readonly summary: string;
}

/**
 * Run the deterministic DRAFTED→NEEDS_REVIEW self-audit: a task passes only when
 * it carries the artifacts a human reviewer needs — an owning agent, a draft note
 * (decisionNotes), and a title. Pure; drives whether the loop parks the task at
 * the human gate or skips it.
 */
export function runSelfAudit(
  task: Pick<CockpitTask, "assignedAgent" | "decisionNotes" | "title">
): SelfAuditResult {
  const hasOwningAgent = KNOWN_AGENT_KEYS.includes(resolveOwningAgent(task));
  const hasDraftNote =
    typeof task.decisionNotes === "string" && task.decisionNotes.trim().length > 0;
  const hasTitle = typeof task.title === "string" && task.title.trim().length > 0;
  const checks = { hasOwningAgent, hasDraftNote, hasTitle } as const;
  const passed = hasOwningAgent && hasDraftNote && hasTitle;
  return {
    passed,
    checks,
    summary: passed
      ? "Self-audit passed: owning agent + draft note present. Parking for human review."
      : "Self-audit incomplete: missing draft artifacts; not parking for review yet.",
  };
}

function composeReviewNote(audit: SelfAuditResult): string {
  return `${audit.summary} Awaiting human approval (automation stops here).`;
}

function composeReviewEvidence(
  task: Pick<CockpitTask, "assignedAgent">,
  audit: SelfAuditResult
): Prisma.InputJsonValue {
  return {
    step: "DRAFTED->NEEDS_REVIEW",
    owningAgent: resolveOwningAgent(task),
    selfAuditPassed: audit.passed,
    checks: audit.checks,
    parkedForHuman: true,
    note: "Automation stops at the human approval gate; it cannot emit APPROVED.",
  };
}

// ─────────────────────────────────────────────
// Per-task advancement (the unit-tested core)
// ─────────────────────────────────────────────

/** The fields of a CockpitTask the advancement logic actually reads. */
export type DispatchableTask = Pick<
  CockpitTask,
  "id" | "status" | "assignedAgent" | "source" | "title" | "decisionNotes"
>;

/**
 * Advance ONE cockpit task by AT MOST one safe step. Never throws — any failure
 * (including a refused transition surfaced by the executor) is captured as an
 * "error" outcome so one bad task cannot abort a batch. Returns the outcome.
 *
 * The function is deterministic given the task and never performs I/O directly;
 * the executor is the only side-effecting collaborator, which is what makes this
 * unit-testable with a fake.
 */
export async function advanceCockpitTask(
  task: DispatchableTask,
  executeTransition: DispatchTransitionExecutor
): Promise<DispatchOutcome> {
  // Guard 1: only ever touch the automation-owned segment. NEEDS_REVIEW /
  // APPROVED / REJECTED / BLOCKED / ARCHIVED are skipped outright.
  if (!isDispatchable(task.status)) {
    return {
      taskId: task.id,
      kind: "skipped",
      fromStatus: task.status,
      toStatus: null,
      reason: `status ${task.status} is owner-owned or terminal; dispatch does not advance it`,
    };
  }

  const toStatus = nextAutomatedStatus(task.status);
  // Guard 2 (defensive): nextAutomatedStatus only ever yields ROUTED/DRAFTED/
  // NEEDS_REVIEW. If it somehow yields anything outside the safe forward set,
  // refuse rather than transition — automation must never emit APPROVED/REJECTED.
  if (
    toStatus === null ||
    !(["ROUTED", "DRAFTED", "NEEDS_REVIEW"] as CockpitTaskStatus[]).includes(toStatus)
  ) {
    return {
      taskId: task.id,
      kind: "skipped",
      fromStatus: task.status,
      toStatus: null,
      reason: "no safe automated next status",
    };
  }

  // Compose the note + evidence for this specific hop.
  let note: string;
  let evidence: Prisma.InputJsonValue;

  if (task.status === "NEW") {
    note = composeRoutingNote(task);
    evidence = composeRoutingEvidence(task);
  } else if (task.status === "ROUTED") {
    note = composeDraftNote(task);
    evidence = composeDraftEvidence(task);
  } else {
    // DRAFTED → NEEDS_REVIEW gated on a passing self-audit.
    const audit = runSelfAudit(task);
    if (!audit.passed) {
      return {
        taskId: task.id,
        kind: "skipped",
        fromStatus: task.status,
        toStatus: null,
        reason: audit.summary,
      };
    }
    note = composeReviewNote(audit);
    evidence = composeReviewEvidence(task, audit);
  }

  try {
    await executeTransition({
      taskId: task.id,
      toStatus,
      reviewer: DISPATCH_REVIEWER,
      note,
      evidence,
    });
    return {
      taskId: task.id,
      kind: "advanced",
      fromStatus: task.status,
      toStatus,
    };
  } catch (err) {
    return {
      taskId: task.id,
      kind: "error",
      fromStatus: task.status,
      toStatus: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────────────────────
// Batch advancement + summary
// ─────────────────────────────────────────────

export interface DispatchSummary {
  readonly considered: number;
  readonly advanced: number;
  readonly skipped: number;
  readonly errors: number;
  /** Count of advances bucketed by the destination status. */
  readonly byStatus: Readonly<Partial<Record<CockpitTaskStatus, number>>>;
  readonly outcomes: readonly DispatchOutcome[];
}

/**
 * Advance a bounded batch of tasks, one safe step each, in order. Per-task
 * errors are isolated (advanceCockpitTask never throws) so a single bad task
 * cannot abort the batch. Pure given its inputs + executor — no I/O here.
 */
export async function advanceCockpitBatch(
  tasks: readonly DispatchableTask[],
  executeTransition: DispatchTransitionExecutor
): Promise<DispatchSummary> {
  const outcomes: DispatchOutcome[] = [];
  const byStatus: Partial<Record<CockpitTaskStatus, number>> = {};
  let advanced = 0;
  let skipped = 0;
  let errors = 0;

  for (const task of tasks) {
    const outcome = await advanceCockpitTask(task, executeTransition);
    outcomes.push(outcome);
    if (outcome.kind === "advanced" && outcome.toStatus) {
      advanced += 1;
      byStatus[outcome.toStatus] = (byStatus[outcome.toStatus] ?? 0) + 1;
    } else if (outcome.kind === "skipped") {
      skipped += 1;
    } else {
      errors += 1;
    }
  }

  return {
    considered: tasks.length,
    advanced,
    skipped,
    errors,
    byStatus,
    outcomes,
  };
}
