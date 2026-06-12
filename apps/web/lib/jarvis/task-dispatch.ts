/**
 * Jarvis Task Dispatch — the routing brain.
 *
 * Given a task title, category, and context map, this module identifies the
 * owning agent, selects the right prompt template, selects the right tools,
 * creates an ActionItem for it, and returns a DispatchPlan ready to run.
 *
 * The `fullPrompt` field in every DispatchPlan is the actual ready-to-run
 * prompt the owner can copy-paste into Claude Code or Fable. It is filled from
 * the prompt library template with the supplied context map.
 *
 * Invariants:
 *   - Pure functions — no I/O, no Date.now(), no model calls.
 *   - approvalRequired is true for every category that produces code or data
 *     changes; false only for read/check categories.
 *   - riskLevel is determined deterministically from the category.
 *   - Every DispatchPlan carries a rollbackPlan, checkpoints, and
 *     scribeInstructions — never empty strings.
 */

import { getCouncilMember } from "./agent-council";
import {
  getPromptById,
  buildPromptFromTemplate,
  type PromptTemplate,
} from "./prompt-library";
import { getToolById, type ToolDefinition } from "./tool-router";
import { createActionItem, type ActionItem } from "./action-queue";
import { getBotById } from "./bot-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskCategory =
  | "BUILD"
  | "FIX"
  | "DATA_CHECK"
  | "CONTENT_RUN"
  | "CALIBRATION_REVIEW"
  | "OVERNIGHT_LOOP"
  | "DESIGN_PASS"
  | "QA_PASS"
  | "SECURITY_REVIEW"
  | "AGENT_BRIEFING";

export interface DispatchPlan {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly category: TaskCategory;
  /** Agent council seat id that owns this task. */
  readonly owningAgent: string;
  /** Prompt library template id selected for this dispatch. */
  readonly promptTemplate: string;
  /** Tool router ids required to execute this task. */
  readonly toolsRequired: readonly string[];
  readonly approvalRequired: boolean;
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly estimatedTokenBudget: "SMALL" | "MEDIUM" | "LARGE" | "EXTENDED";
  /** The actual ready-to-run Claude Code / Fable prompt — fill {{placeholders}} from context. */
  readonly fullPrompt: string;
  readonly scribeInstructions: string;
  readonly rollbackPlan: string;
  /** Human approval gates the owner should check before and after execution. */
  readonly checkpoints: readonly string[];
  /** The ActionItem generated for tracking in the action queue. */
  readonly actionItem: ActionItem;
}

// ─── Category routing tables ──────────────────────────────────────────────────

/** Maps each category to the agent council id that owns it. */
const CATEGORY_AGENT: Readonly<Record<TaskCategory, string>> = {
  BUILD: "jarvis",
  FIX: "jarvis",
  DATA_CHECK: "tal",
  CONTENT_RUN: "ava",
  CALIBRATION_REVIEW: "performance-auditor",
  OVERNIGHT_LOOP: "ai-ops-officer",
  DESIGN_PASS: "jarvis",
  QA_PASS: "ai-ops-officer",
  SECURITY_REVIEW: "jarvis",
  AGENT_BRIEFING: "jarvis",
};

/** Maps each category to the prompt library template id. */
const CATEGORY_PROMPT: Readonly<Record<TaskCategory, string>> = {
  BUILD: "gse-feature-build",
  FIX: "jarvis-os-build",
  DATA_CHECK: "data-reliability-check",
  CONTENT_RUN: "content-generation",
  CALIBRATION_REVIEW: "calibration-review",
  OVERNIGHT_LOOP: "overnight-test-run",
  DESIGN_PASS: "design-review-pass",
  QA_PASS: "overnight-test-run",
  SECURITY_REVIEW: "security-review",
  AGENT_BRIEFING: "jarvis-os-build",
};

/** Maps each category to the tool router ids required. */
const CATEGORY_TOOLS: Readonly<Record<TaskCategory, readonly string[]>> = {
  BUILD: ["github", "file-search", "gse-data"],
  FIX: ["github", "file-search", "gse-data"],
  DATA_CHECK: ["gse-data", "file-search"],
  CONTENT_RUN: ["gse-data", "gsn-studio"],
  CALIBRATION_REVIEW: ["gse-data"],
  OVERNIGHT_LOOP: ["file-search", "gse-data"],
  DESIGN_PASS: ["file-search"],
  QA_PASS: ["file-search", "gse-data"],
  SECURITY_REVIEW: ["file-search", "gse-data"],
  AGENT_BRIEFING: ["file-search"],
};

/** Maps each category to whether it requires explicit owner approval. */
const CATEGORY_APPROVAL: Readonly<Record<TaskCategory, boolean>> = {
  BUILD: true,
  FIX: true,
  DATA_CHECK: false,
  CONTENT_RUN: true,
  CALIBRATION_REVIEW: true,
  OVERNIGHT_LOOP: false,
  DESIGN_PASS: false,
  QA_PASS: false,
  SECURITY_REVIEW: true,
  AGENT_BRIEFING: false,
};

/** Maps each category to its risk level. */
const CATEGORY_RISK: Readonly<
  Record<TaskCategory, "LOW" | "MEDIUM" | "HIGH" | "CRITICAL">
> = {
  BUILD: "HIGH",
  FIX: "MEDIUM",
  DATA_CHECK: "LOW",
  CONTENT_RUN: "MEDIUM",
  CALIBRATION_REVIEW: "MEDIUM",
  OVERNIGHT_LOOP: "LOW",
  DESIGN_PASS: "LOW",
  QA_PASS: "LOW",
  SECURITY_REVIEW: "HIGH",
  AGENT_BRIEFING: "LOW",
};

/** Maps each category to an estimated token budget. */
const CATEGORY_BUDGET: Readonly<
  Record<TaskCategory, "SMALL" | "MEDIUM" | "LARGE" | "EXTENDED">
> = {
  BUILD: "EXTENDED",
  FIX: "LARGE",
  DATA_CHECK: "SMALL",
  CONTENT_RUN: "MEDIUM",
  CALIBRATION_REVIEW: "LARGE",
  OVERNIGHT_LOOP: "LARGE",
  DESIGN_PASS: "MEDIUM",
  QA_PASS: "LARGE",
  SECURITY_REVIEW: "LARGE",
  AGENT_BRIEFING: "SMALL",
};

// ─── Standard checkpoints ─────────────────────────────────────────────────────

const STANDARD_CHECKPOINTS: Readonly<Record<TaskCategory, readonly string[]>> = {
  BUILD: [
    "Owner reviews DispatchPlan before session launch",
    "Typecheck + tests pass before merge",
    "No external actions without explicit approval",
    "Scribe RESULT entry written after completion",
  ],
  FIX: [
    "Owner reviews DispatchPlan before session launch",
    "Root cause identified and confirmed before fix applied",
    "Tests pass post-fix — no skipping or deleting",
    "Scribe RESULT entry written after completion",
  ],
  DATA_CHECK: [
    "Freshness verdict evidence reviewed before marking healthy",
    "No source with permission_required or excluded status touched",
  ],
  CONTENT_RUN: [
    "Owner reviews data sources before content run",
    "Every claim traces to a data record — no fabrication",
    "Draft lands in review queue — never auto-published",
    "Human approves before any publish action",
  ],
  CALIBRATION_REVIEW: [
    "Only canonical settled picks used — bootstrap and pending excluded",
    "Calibration proposals reviewed by owner before any weight changes",
    "Out-of-sample validation required before any model adjustment",
  ],
  OVERNIGHT_LOOP: [
    "Session launched before stepping away",
    "Morning report reviewed before acting on failure fixes",
    "No tests deleted or skipped",
  ],
  DESIGN_PASS: [
    "Status semantics not changed for optics (NOT_WIRED stays NOT_WIRED)",
    "Fixes proposed as drafts — no direct pushes",
  ],
  QA_PASS: [
    "All tests reviewed before marking pass",
    "Regressions diagnosed before any merge",
  ],
  SECURITY_REVIEW: [
    "Owner reviews RISK findings before remediation",
    "No secrets committed — even example secrets",
    "CRITICAL findings go to the decision queue",
    "Legal-adjacent findings escalate to the owner",
  ],
  AGENT_BRIEFING: [
    "Briefing reviewed for accuracy before sharing",
    "No external actions in any briefing",
  ],
};

const STANDARD_ROLLBACK: Readonly<Record<TaskCategory, string>> = {
  BUILD:
    "Revert the branch. No database migrations ship without a tested down migration. " +
    "No env vars change without the prior values noted.",
  FIX:
    "Revert the commit. The prior passing state is the rollback target — " +
    "confirm tests still pass on the reverted branch.",
  DATA_CHECK:
    "No changes are made during a data check — read-only by design. No rollback needed.",
  CONTENT_RUN:
    "Delete the draft from the review queue. No published content exists to roll back " +
    "unless the owner has already approved publication.",
  CALIBRATION_REVIEW:
    "Discard the proposal. No model weights change during a review — " +
    "rollback only applies after an approved adjustment is applied.",
  OVERNIGHT_LOOP:
    "No changes are made overnight — read and test only. Any proposed fixes are drafts " +
    "awaiting morning review.",
  DESIGN_PASS:
    "Reject the design-change draft. The prior UI state is the rollback target.",
  QA_PASS:
    "No changes are made during a QA pass — read and test only.",
  SECURITY_REVIEW:
    "Discard the remediation proposal. No security gates are weakened as a rollback.",
  AGENT_BRIEFING:
    "Discard the briefing draft. No external actions taken.",
};

// ─── ID generation ────────────────────────────────────────────────────────────

/** Deterministic task id from title and category — no Date.now(). */
function buildTaskId(title: string, category: TaskCategory): string {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/(^-|-$)/g, "");
  return `dispatch-${category.toLowerCase()}-${safeTitle}`;
}

// ─── Context key resolution ───────────────────────────────────────────────────

/** Fills context keys with sane defaults when the caller does not supply them. */
function normalizeContext(
  category: TaskCategory,
  context: Record<string, string>
): Record<string, string> {
  const defaults: Record<string, Record<string, string>> = {
    BUILD: {
      feature: context["feature"] ?? "feature",
      branch: context["branch"] ?? "feature/new-work",
    },
    FIX: {
      layer: context["layer"] ?? "the failing layer",
      branch: context["branch"] ?? "fix/current-issue",
    },
    DATA_CHECK: {
      sources: context["sources"] ?? "all ingestion adapters",
    },
    CONTENT_RUN: {
      contentType: context["contentType"] ?? "weekly picks recap",
      dataSource: context["dataSource"] ?? "canonical settled picks",
    },
    CALIBRATION_REVIEW: {
      window: context["window"] ?? "last 30 canonical picks",
    },
    OVERNIGHT_LOOP: {
      scope: context["scope"] ?? "all workspaces",
    },
    DESIGN_PASS: {
      surface: context["surface"] ?? "cockpit pages and components",
    },
    QA_PASS: {
      scope: context["scope"] ?? "all workspaces",
    },
    SECURITY_REVIEW: {
      scope: context["scope"] ?? "auth, webhooks, scraping clearance, env vars",
    },
    AGENT_BRIEFING: {
      layer: context["layer"] ?? "current OS layer",
      branch: context["branch"] ?? "main",
    },
  };
  return { ...defaults[category], ...context };
}

// ─── Full prompt builder ──────────────────────────────────────────────────────

/** Appends standard Jarvis preamble + acceptance + scribe instructions to the template body. */
function buildFullPrompt(
  template: PromptTemplate,
  category: TaskCategory,
  title: string,
  context: Record<string, string>,
  agent: string,
  toolsRequired: readonly string[]
): string {
  const filled = buildPromptFromTemplate(template, context);

  const agentMember = getCouncilMember(agent);
  const agentLine = agentMember
    ? `Owning agent: ${agentMember.codename} — ${agentMember.role}`
    : `Owning agent: ${agent}`;

  const toolLines =
    toolsRequired.length > 0
      ? toolsRequired
          .map((id) => {
            const t = getToolById(id);
            return t ? `  • ${t.name} (${t.status})` : `  • ${id}`;
          })
          .join("\n")
      : "  • none beyond session tools";

  const acceptanceLines = template.acceptanceCriteria
    .map((c) => `  ✓ ${c}`)
    .join("\n");

  const validationLines = template.validationCommands
    .map((v) => `  $ ${v}`)
    .join("\n");

  const approvalNote =
    CATEGORY_APPROVAL[category]
      ? "APPROVAL REQUIRED — do not merge, deploy, or publish without explicit owner sign-off."
      : "Read / test only — no approval required to run. Any code fixes are proposals.";

  return [
    `# Jarvis Dispatch: ${title}`,
    `# Category: ${category} | Risk: ${CATEGORY_RISK[category]} | Budget: ${CATEGORY_BUDGET[category]}`,
    `# Model lane: ${template.modelRecommendation}`,
    `# ${agentLine}`,
    "",
    "## Task",
    filled,
    "",
    "## Tools available for this task",
    toolLines,
    "",
    "## Acceptance criteria",
    acceptanceLines,
    "",
    "## Validation commands",
    validationLines,
    "",
    "## Approval",
    approvalNote,
    "",
    "## Scribe",
    template.scribeInstructions,
    "",
    "## Forbidden actions",
    template.forbiddenActions.map((f) => `  ✗ ${f}`).join("\n"),
    "",
    "## Approval boundary",
    template.approvalBoundary,
  ].join("\n");
}

// ─── Core dispatch function ───────────────────────────────────────────────────

/**
 * Dispatches a task: identifies agent, selects template + tools, creates
 * an ActionItem, and returns a DispatchPlan ready to run.
 *
 * @param title      Short human-readable task name.
 * @param category   TaskCategory routing key.
 * @param context    Key-value pairs to fill {{placeholders}} in the template.
 *                   Unknown keys are left as {{key}} so gaps are visible.
 * @param proposedAt ISO string timestamp (caller provides — no Date.now() here).
 *                   Defaults to a placeholder if omitted.
 */
export function dispatchTask(
  title: string,
  category: TaskCategory,
  context: Record<string, string>,
  proposedAt: string = "2026-01-01T00:00:00.000Z"
): DispatchPlan {
  const agentId = CATEGORY_AGENT[category];
  const promptId = CATEGORY_PROMPT[category];
  const toolIds = CATEGORY_TOOLS[category];
  const approvalRequired = CATEGORY_APPROVAL[category];
  const riskLevel = CATEGORY_RISK[category];
  const budget = CATEGORY_BUDGET[category];
  const checkpoints = STANDARD_CHECKPOINTS[category];
  const rollbackPlan = STANDARD_ROLLBACK[category];

  const template = getPromptById(promptId);
  if (!template) {
    throw new Error(
      `[task-dispatch] Prompt template '${promptId}' not found in prompt library. ` +
        `Category: ${category}`
    );
  }

  const filledContext = normalizeContext(category, context);
  const toolsRequired = toolIds.filter((id) => {
    const t = getToolById(id);
    return t !== undefined;
  });

  const fullPrompt = buildFullPrompt(
    template,
    category,
    title,
    filledContext,
    agentId,
    toolsRequired
  );

  const taskId = buildTaskId(title, category);

  const actionItem = createActionItem({
    type: approvalRequired ? "CODE_CHANGE_PROPOSAL" : "READ_ONLY_CHECK",
    title,
    reason: `Dispatched via Jarvis task dispatch (category: ${category})`,
    risk: riskLevel,
    expectedOutput: template.acceptanceCriteria.join("; "),
    affectedFiles: [],
    toolsRequired,
    approvalRequired,
    rollbackPlan,
    scribeEntryRequired: true,
    proposedAt,
    proposedBy: "jarvis",
  });

  return {
    taskId,
    taskTitle: title,
    category,
    owningAgent: agentId,
    promptTemplate: promptId,
    toolsRequired,
    approvalRequired,
    riskLevel,
    estimatedTokenBudget: budget,
    fullPrompt,
    scribeInstructions: template.scribeInstructions,
    rollbackPlan,
    checkpoints,
    actionItem,
  };
}

// ─── Specialized plan builders ────────────────────────────────────────────────

/**
 * Plans the overnight run: full test suite + typecheck + calibration review +
 * scribe summary. No approval required — read and test only.
 */
export function buildOvernightLoopPlan(
  context: Record<string, string>,
  proposedAt: string = "2026-01-01T00:00:00.000Z"
): DispatchPlan {
  return dispatchTask(
    "Overnight full validation loop",
    "OVERNIGHT_LOOP",
    {
      scope: context["scope"] ?? "all workspaces",
      ...context,
    },
    proposedAt
  );
}

/**
 * Plans a content generation run. Drafts only — humans publish.
 * Approval required before any publication.
 */
export function buildContentLoopPlan(
  context: Record<string, string>,
  proposedAt: string = "2026-01-01T00:00:00.000Z"
): DispatchPlan {
  return dispatchTask(
    "Content generation run",
    "CONTENT_RUN",
    {
      contentType: context["contentType"] ?? "weekly picks recap",
      dataSource: context["dataSource"] ?? "canonical settled picks",
      ...context,
    },
    proposedAt
  );
}

/**
 * Plans a code fix. Requires approval before merging or deploying.
 * Root cause must be identified before the fix is applied.
 */
export function buildFixPlan(
  title: string,
  context: Record<string, string>,
  proposedAt: string = "2026-01-01T00:00:00.000Z"
): DispatchPlan {
  return dispatchTask(
    title,
    "FIX",
    {
      layer: context["layer"] ?? "the failing layer",
      branch: context["branch"] ?? "fix/current-issue",
      ...context,
    },
    proposedAt
  );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

/** Returns every available task category in a stable order. */
export function getAllAvailableTaskCategories(): readonly TaskCategory[] {
  return [
    "BUILD",
    "FIX",
    "DATA_CHECK",
    "CONTENT_RUN",
    "CALIBRATION_REVIEW",
    "OVERNIGHT_LOOP",
    "DESIGN_PASS",
    "QA_PASS",
    "SECURITY_REVIEW",
    "AGENT_BRIEFING",
  ];
}

/** Returns the owning agent id for a given category (for UI display). */
export function getAgentForCategory(category: TaskCategory): string {
  return CATEGORY_AGENT[category];
}

/** Returns the prompt template id for a given category (for UI display). */
export function getPromptForCategory(category: TaskCategory): string {
  return CATEGORY_PROMPT[category];
}

/** Returns the required tool ids for a given category (for UI display). */
export function getToolsForCategory(category: TaskCategory): readonly string[] {
  return CATEGORY_TOOLS[category];
}

/** Returns the resolved tool definitions for a given category (undefined tools excluded). */
export function getResolvedToolsForCategory(
  category: TaskCategory
): readonly ToolDefinition[] {
  return CATEGORY_TOOLS[category]
    .map((id) => getToolById(id))
    .filter((t): t is ToolDefinition => t !== undefined);
}

/** Returns the bot that Jarvis recommends for a given category. */
export function getRecommendedBotForCategory(
  category: TaskCategory
): string | undefined {
  const botId =
    category === "BUILD" || category === "FIX"
      ? "claude-code-fable5"
      : category === "DATA_CHECK" || category === "QA_PASS"
        ? "claude-code-sonnet"
        : category === "OVERNIGHT_LOOP"
          ? "overnight-test-runner"
          : category === "CONTENT_RUN"
            ? "content-engine"
            : category === "CALIBRATION_REVIEW"
              ? "calibration-job"
              : category === "DATA_CHECK"
                ? "data-ingestion-worker"
                : "claude-code-sonnet";

  const bot = getBotById(botId);
  return bot?.id;
}

/**
 * Returns a short human-readable summary of what a DispatchPlan will do.
 * Used in cockpit display without repeating the full prompt.
 */
export function summarizeDispatchPlan(plan: DispatchPlan): string {
  return (
    `[${plan.category}] ${plan.taskTitle} — ` +
    `agent: ${plan.owningAgent}, ` +
    `template: ${plan.promptTemplate}, ` +
    `risk: ${plan.riskLevel}, ` +
    `budget: ${plan.estimatedTokenBudget}, ` +
    `approval: ${plan.approvalRequired ? "YES" : "NO"}`
  );
}
