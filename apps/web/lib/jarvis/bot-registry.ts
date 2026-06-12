/**
 * Jarvis Bot Registry — every bot, worker, and loop Jarvis can invoke.
 *
 * Static, honest registry of all bots known to the platform. Pure data +
 * accessors — no I/O, no execution. This is the authoritative source of
 * truth for what Jarvis can dispatch, what requires approval, and what is
 * currently wired vs manual.
 *
 * Invariants:
 *   - canDispatchViaJarvis is true only when Jarvis can meaningfully route
 *     a task to this bot. The bot still requires owner approval to execute.
 *   - requiresApproval is true for any bot that modifies state.
 *   - scribeOnRun is true for any bot that should produce a scribe entry
 *     when it runs, for auditability.
 *   - Statuses are never inflated.
 */

export type BotType =
  | "BULLMQ_WORKER"
  | "CLAUDE_CODE_SESSION"
  | "SCHEDULED_JOB"
  | "CONTENT_ENGINE"
  | "DATA_INGESTION"
  | "SETTLEMENT_WORKER"
  | "CALIBRATION_JOB"
  | "TEST_RUNNER";

export type BotStatus =
  | "NOT_WIRED"   // Not yet integrated; no path to invoke
  | "MANUAL"      // Works but a human must run it; Jarvis cannot trigger it
  | "SCHEDULED"   // Runs on a schedule (BullMQ cron or similar)
  | "ON_DEMAND"   // Can be invoked on demand, with approval
  | "ACTIVE";     // Currently running (runtime state; not used in static registry)

export interface BotDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: BotType;
  readonly status: BotStatus;
  readonly description: string;
  /** The agent-council seat that owns this bot. */
  readonly owningAgent: string;
  /** Whether Jarvis can produce a DispatchPlan that routes to this bot. */
  readonly canDispatchViaJarvis: boolean;
  /** Whether a human must approve before this bot executes. */
  readonly requiresApproval: boolean;
  /** ISO timestamp of last known run — undefined if never run or unknown. */
  readonly lastRunAt?: string;
  /** ISO timestamp of next scheduled run — undefined if on-demand or unknown. */
  readonly nextRunAt?: string;
  /** Whether this bot should produce a scribe RESULT entry on each run. */
  readonly scribeOnRun: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const BOT_REGISTRY: readonly BotDefinition[] = [
  {
    id: "data-ingestion-worker",
    name: "Data Ingestion Worker",
    type: "DATA_INGESTION",
    status: "MANUAL",
    description:
      "Pulls fresh odds and game data from The Odds API and persists it to the database. " +
      "Owned by Tal (Data Reliability Engineer). Currently triggered manually — no cron job is wired.",
    owningAgent: "tal",
    canDispatchViaJarvis: true,
    requiresApproval: true,
    scribeOnRun: true,
  },

  {
    id: "settlement-worker",
    name: "Settlement Worker",
    type: "SETTLEMENT_WORKER",
    status: "MANUAL",
    description:
      "Settles open picks against verified game outcomes and updates the canonical win/loss ledger. " +
      "Owned by Settlement Officer (LEDGER). No external verified result source is wired; must be triggered manually.",
    owningAgent: "settlement-officer",
    canDispatchViaJarvis: true,
    requiresApproval: true,
    scribeOnRun: true,
  },

  {
    id: "content-engine",
    name: "Content Engine",
    type: "CONTENT_ENGINE",
    status: "MANUAL",
    description:
      "Drafts blog posts, newsletter sections, and short-form copy from approved picks data. " +
      "Owned by Ava (Content Officer). Drafts land in the review queue; no auto-publish path exists.",
    owningAgent: "ava",
    canDispatchViaJarvis: true,
    requiresApproval: true,
    scribeOnRun: true,
  },

  {
    id: "calibration-job",
    name: "Calibration Review Job",
    type: "CALIBRATION_JOB",
    status: "MANUAL",
    description:
      "Reviews prediction confidence calibration against the canonical settled ledger. " +
      "Owned by Performance Auditor (AUDIT). Analysis only — no model weights are changed without owner sign-off.",
    owningAgent: "performance-auditor",
    canDispatchViaJarvis: true,
    requiresApproval: true,
    scribeOnRun: true,
  },

  {
    id: "overnight-test-runner",
    name: "Overnight Test Runner",
    type: "TEST_RUNNER",
    status: "MANUAL",
    description:
      "Runs the full test suite (npm run test), typecheck, and lint. Triages failures into a morning report. " +
      "Owned by AI Ops Officer (METER). Safe to run without approval — read and test only; no code changes.",
    owningAgent: "ai-ops-officer",
    canDispatchViaJarvis: true,
    requiresApproval: false,
    scribeOnRun: true,
  },

  {
    id: "claude-code-fable5",
    name: "Claude Code (Fable 5)",
    type: "CLAUDE_CODE_SESSION",
    status: "ON_DEMAND",
    description:
      "The primary build and fix bot. Owner opens a Claude Code session with Fable 5 and uses a " +
      "DispatchPlan fullPrompt to kick off the work. Owned by Jarvis — Jarvis prepares the plan, " +
      "owner drives the session. Highest capability for complex multi-file builds.",
    owningAgent: "jarvis",
    canDispatchViaJarvis: true,
    requiresApproval: true,
    scribeOnRun: true,
  },

  {
    id: "claude-code-sonnet",
    name: "Claude Code (Sonnet)",
    type: "CLAUDE_CODE_SESSION",
    status: "ON_DEMAND",
    description:
      "Lighter-weight Claude Code session for targeted fixes, quick reviews, and tasks that do not " +
      "need the full Fable 5 token budget. Owned by Jarvis. Use for DATA_CHECK, QA_PASS, or short FIX tasks.",
    owningAgent: "jarvis",
    canDispatchViaJarvis: true,
    requiresApproval: true,
    scribeOnRun: false,
  },
];

// ─── Accessors ────────────────────────────────────────────────────────────────

// Returns one bot definition by stable id, or undefined.
export function getBotById(id: string): BotDefinition | undefined {
  return BOT_REGISTRY.find((b) => b.id === id);
}

// Returns all bots owned by a given agent-council id.
export function getBotsByAgent(agentId: string): readonly BotDefinition[] {
  return BOT_REGISTRY.filter((b) => b.owningAgent === agentId);
}

// Returns all bots that Jarvis can include in a DispatchPlan.
export function getBotsThatCanDispatch(): readonly BotDefinition[] {
  return BOT_REGISTRY.filter((b) => b.canDispatchViaJarvis);
}

export interface BotRegistrySummary {
  readonly total: number;
  readonly canDispatch: number;
  readonly manual: number;
  readonly active: number;
}

// Honest roll-up of bot counts for cockpit display.
export function buildBotRegistrySummary(): BotRegistrySummary {
  return {
    total: BOT_REGISTRY.length,
    canDispatch: BOT_REGISTRY.filter((b) => b.canDispatchViaJarvis).length,
    manual: BOT_REGISTRY.filter((b) => b.status === "MANUAL").length,
    active: BOT_REGISTRY.filter((b) => b.status === "ACTIVE").length,
  };
}
