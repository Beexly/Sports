/**
 * Jarvis Agent Council
 *
 * The governed roster of intelligence roles that operate Galaxy Sports Edge.
 * A council seat is a ROLE with a charter, not a running process. The six
 * registered cockpit agents (JARVIS, SARAH, TAL, SCOUT, AVA, BOBBY) exist in
 * the cockpit agent registry and Prisma OperatorAgent enum; the remaining
 * nine seats are designed roles for capabilities that are manual or not wired.
 *
 * Trust rules:
 *   - No seat is ever AUTONOMOUS. Statuses are DRAFT_ONLY, MANUAL, NOT_WIRED.
 *   - externalActions is always "NONE" — no seat performs external actions
 *     without human approval. This mirrors the cockpit agent registry.
 *   - Every ownsCapabilities entry must be a real capability-registry id.
 */

import {
  getCapability,
  type JarvisCapability,
} from "./capability-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

/** DRAFT_ONLY = seat is a registered cockpit role producing drafts for approval.
 *  MANUAL     = the work happens, but a human runs it; no agent role wired.
 *  NOT_WIRED  = designed seat for a capability that does not exist yet. */
export type CouncilSeatStatus = "DRAFT_ONLY" | "MANUAL" | "NOT_WIRED";

export type CouncilEscalation = "OWNER" | "JARVIS";

export interface AgentCouncilMember {
  readonly id: string;
  readonly codename: string;
  readonly displayName: string;
  readonly role: string;
  readonly status: CouncilSeatStatus;
  /** True only for the six agents in the cockpit agent registry / Prisma enum. */
  readonly isRegisteredCockpitAgent: boolean;
  readonly charter: string;
  readonly currentTruth: string;
  /** Capability-registry ids this seat owns. Validated by tests. */
  readonly ownsCapabilities: readonly string[];
  readonly safeActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly escalatesTo: CouncilEscalation;
  /** Hard invariant: no council seat takes external actions on its own. */
  readonly externalActions: "NONE";
}

// ─── Council roster ───────────────────────────────────────────────────────────

export const AGENT_COUNCIL: readonly AgentCouncilMember[] = [
  // ── Registered cockpit agents (exist in registry + Prisma enum) ───────────

  {
    id: "jarvis",
    codename: "JARVIS",
    displayName: "Jarvis",
    role: "Chief Intelligence Officer",
    status: "DRAFT_ONLY",
    isRegisteredCockpitAgent: true,
    charter:
      "Sense, interpret, prioritize, and explain the state of the entire platform. " +
      "Route work to the right seat, guard public claims, and recommend the owner's next action.",
    currentTruth:
      "Runs as a deterministic assessment on every cockpit load. Produces the OwnerSummary, " +
      "decision queue, and safety warnings. No model calls at runtime. No autonomous execution.",
    ownsCapabilities: ["agent-orchestration", "risk-public-claims"],
    safeActions: [
      "Assess platform state and surface readiness gates",
      "Propose routing for new work",
      "Raise safety warnings to the decision queue",
      "Answer owner questions deterministically from live state",
    ],
    forbiddenActions: [
      "Clear a safety warning without owner review",
      "Claim autonomy or wiring that does not exist",
      "Make public claims of any kind",
    ],
    escalatesTo: "OWNER",
    externalActions: "NONE",
  },

  {
    id: "scout",
    codename: "SCOUT",
    displayName: "Scout",
    role: "Picks Desk Analyst",
    status: "DRAFT_ONLY",
    isRegisteredCockpitAgent: true,
    charter:
      "Watch odds movement, injury news, and schedule signals. Annotate picks with research " +
      "context so every published pick is grounded in real data.",
    currentTruth:
      "Registered cockpit role. Research notes and pick annotations are drafts in the review " +
      "queue. No automated research runs; the pick pipeline itself is the prediction engine.",
    ownsCapabilities: ["picks-intelligence"],
    safeActions: [
      "Draft research notes",
      "Flag line-movement events",
      "Annotate picks with new context",
    ],
    forbiddenActions: [
      "Publish picks publicly",
      "Alter confidence scores outside the prediction engine",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "tal",
    codename: "TAL",
    displayName: "Tal",
    role: "Data Reliability Engineer",
    status: "DRAFT_ONLY",
    isRegisteredCockpitAgent: true,
    charter:
      "Keep the data pipeline honest: ingestion freshness, adapter health, schema drift, " +
      "test failures, and repo hygiene.",
    currentTruth:
      "Registered cockpit role. Ingestion status flows into the Jarvis assessment from worker " +
      "timestamps. Bug investigations and fixes are drafts; nothing auto-restarts.",
    ownsCapabilities: ["data-reliability"],
    safeActions: [
      "Open implementation drafts",
      "File bug investigations",
      "Comment on failing tests",
      "Report ingestion freshness to Jarvis",
    ],
    forbiddenActions: [
      "Auto-restart workers without operator approval",
      "Mark ingestion healthy without a fresh timestamp",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "sarah",
    codename: "SARAH",
    displayName: "Sarah",
    role: "Customer Surface Officer",
    status: "DRAFT_ONLY",
    isRegisteredCockpitAgent: true,
    charter:
      "Own the customer-facing surface: dashboard health, support drafts, and the review queue. " +
      "The customer never sees ungated data.",
    currentTruth:
      "Registered cockpit role. Support replies are drafts awaiting human approval. " +
      "Dashboard health flows into the Jarvis assessment.",
    ownsCapabilities: ["customer-surface"],
    safeActions: [
      "Draft support replies",
      "Triage tickets into the review queue",
      "Report dashboard health",
    ],
    forbiddenActions: [
      "Send replies without human approval",
      "Expose gated performance stats to customers",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "ava",
    codename: "AVA",
    displayName: "Ava",
    role: "Content Officer",
    status: "DRAFT_ONLY",
    isRegisteredCockpitAgent: true,
    charter:
      "Draft blog posts, newsletter sections, and short-form copy strictly from approved " +
      "platform data. Humans publish; Ava never does.",
    currentTruth:
      "Registered cockpit role. Content engine produces drafts into the media queue. " +
      "No auto-publish path exists in the codebase.",
    ownsCapabilities: ["content-media"],
    safeActions: [
      "Draft content from approved picks data",
      "Suggest scheduling metadata",
      "Annotate drafts with source coverage",
    ],
    forbiddenActions: [
      "Publish anything without human approval",
      "Use bootstrap or pending picks as proven results",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "bobby",
    codename: "BOBBY",
    displayName: "Bobby",
    role: "Revenue Analyst",
    status: "DRAFT_ONLY",
    isRegisteredCockpitAgent: true,
    charter:
      "Read funnel, subscription, and analytics signals. Surface conversion and churn " +
      "observations as review-queue items for the owner to act on.",
    currentTruth:
      "Registered cockpit role. Stripe is wired for subscriptions, but subscription " +
      "intelligence (churn prediction, upgrade triggers) is not built. Observations are manual.",
    ownsCapabilities: ["revenue-subscriptions"],
    safeActions: [
      "Surface subscription metric anomalies",
      "Draft funnel observations",
      "Flag pricing experiments for review",
    ],
    forbiddenActions: [
      "Change pricing or subscriptions",
      "Present unverified CLV predictions as facts",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  // ── Designed seats — work exists but is human-run (MANUAL) ────────────────

  {
    id: "settlement-officer",
    codename: "LEDGER",
    displayName: "Settlement Officer",
    role: "Settlement & Results Officer",
    status: "MANUAL",
    isRegisteredCockpitAgent: false,
    charter:
      "Settle picks against verified game outcomes and keep the win/loss ledger canonical. " +
      "Feed accurate results into calibration.",
    currentTruth:
      "Not a registered agent. Settlement logic exists in the prediction engine and the " +
      "settlement worker is triggered manually by a human. No external score source is wired.",
    ownsCapabilities: ["settlement-results"],
    safeActions: [
      "Run the settlement worker manually",
      "Report settlement backlog",
      "Surface settlement history",
    ],
    forbiddenActions: [
      "Auto-settle without a verified external result source",
      "Count pending picks in the win rate",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "performance-auditor",
    codename: "AUDIT",
    displayName: "Performance Auditor",
    role: "Performance & Calibration Auditor",
    status: "MANUAL",
    isRegisteredCockpitAgent: false,
    charter:
      "Audit prediction accuracy against the canonical ledger. Enforce the display-safety " +
      "policy: stats are never shown before the sample-size and gate rules are met.",
    currentTruth:
      "Not a registered agent. The calibration page and public-performance policy exist and " +
      "are enforced in code; review and recalibration are human-run.",
    ownsCapabilities: ["performance-calibration"],
    safeActions: [
      "Report canonical performance metrics",
      "Gate public display per policy",
      "Surface calibration proposals for review",
    ],
    forbiddenActions: [
      "Show the 70% target as an achieved result before displaySafe",
      "Auto-adjust model weights without review",
    ],
    escalatesTo: "OWNER",
    externalActions: "NONE",
  },

  {
    id: "ai-ops-officer",
    codename: "METER",
    displayName: "AI Ops Officer",
    role: "AI Ops & Token Discipline Officer",
    status: "MANUAL",
    isRegisteredCockpitAgent: false,
    charter:
      "Control model usage, token spend, and AI quality. Enforce the model lane policy and " +
      "instrument observability before AI usage scales.",
    currentTruth:
      "Not a registered agent. The model lane policy is documented and ccusage is available " +
      "for manual spot-checks. No live token telemetry flows into the cockpit.",
    ownsCapabilities: ["ai-ops-token-discipline"],
    safeActions: [
      "Run ccusage for daily spend checks",
      "Enforce the model lane policy in agent instructions",
      "Report instrumentation gaps",
    ],
    forbiddenActions: [
      "Claim token counts without instrumentation",
      "Claim Langfuse/Helicone are wired before they are",
    ],
    escalatesTo: "OWNER",
    externalActions: "NONE",
  },

  // ── Designed seats — capability not wired yet (NOT_WIRED) ─────────────────

  {
    id: "market-analyst",
    codename: "DELTA",
    displayName: "Market Analyst",
    role: "Market / Line Intelligence Analyst",
    status: "NOT_WIRED",
    isRegisteredCockpitAgent: false,
    charter:
      "Track line movement, closing line value, and market consensus to sharpen prediction " +
      "quality and inform operator strategy.",
    currentTruth:
      "Seat is designed only. Odds ingestion exists, but no CLV tracking, line-movement " +
      "alerts, or market intelligence layer is built.",
    ownsCapabilities: ["market-line-intelligence"],
    safeActions: [
      "Surface raw line data already ingested",
    ],
    forbiddenActions: [
      "Claim CLV is tracked without instrumentation",
      "Surface market signals before the layer is built",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "memory-librarian",
    codename: "ARCHIVE",
    displayName: "Memory Librarian",
    role: "Memory & Knowledge Base Librarian",
    status: "NOT_WIRED",
    isRegisteredCockpitAgent: false,
    charter:
      "Persist operator decisions, analysis outcomes, and context across sessions so Jarvis " +
      "never re-derives known facts.",
    currentTruth:
      "Seat is designed only. No memory store, vector index, or cross-session recall exists. " +
      "The memory protocol lives as markdown in docs/ai/jarvis/.",
    ownsCapabilities: ["memory-knowledge-base"],
    safeActions: [
      "Maintain the markdown memory protocol docs",
    ],
    forbiddenActions: [
      "Claim memory is available before wired",
      "Fabricate recalled facts",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "tool-router",
    codename: "RELAY",
    displayName: "Tool Router",
    role: "Tool Router / MCP Gateway",
    status: "NOT_WIRED",
    isRegisteredCockpitAgent: false,
    charter:
      "Provide a governed tool bus so agents can call approved external services with " +
      "rate limits, logging, and owner approval for every new connection.",
    currentTruth:
      "Seat is designed only. No MCP server or tool bus is wired to this repo. " +
      "All external calls today are hand-written adapters (The Odds API, Stripe).",
    ownsCapabilities: ["tool-router-mcp-layer"],
    safeActions: [
      "Document the approved-tool registry design",
    ],
    forbiddenActions: [
      "Route tool calls before the bus exists",
      "Allow unregistered tools",
    ],
    escalatesTo: "OWNER",
    externalActions: "NONE",
  },

  {
    id: "browser-operator",
    codename: "PILOT",
    displayName: "Browser Operator",
    role: "Browser / Computer Control Operator",
    status: "NOT_WIRED",
    isRegisteredCockpitAgent: false,
    charter:
      "Perform sandboxed browser actions — navigate, scrape, screenshot — only on " +
      "pre-approved domains under strict human oversight.",
    currentTruth:
      "Seat is designed only. No browser automation layer exists in this repo.",
    ownsCapabilities: ["browser-computer-control"],
    safeActions: [
      "Document the approved-domain sandbox design",
    ],
    forbiddenActions: [
      "Execute any browser action — capability is not wired",
      "Store credentials in automation scripts",
    ],
    escalatesTo: "OWNER",
    externalActions: "NONE",
  },

  {
    id: "voice-operator",
    codename: "ECHO",
    displayName: "Voice Operator",
    role: "Voice Interface Operator",
    status: "NOT_WIRED",
    isRegisteredCockpitAgent: false,
    charter:
      "Enable spoken owner interaction with Jarvis: transcribe questions, route them to the " +
      "deterministic Q&A engine, and speak the answers with a full audit trail.",
    currentTruth:
      "Seat is designed only. No STT/TTS pipeline exists. Voice is a Phase 4+ product layer.",
    ownsCapabilities: ["voice-interface"],
    safeActions: [
      "Document the voice pipeline design",
    ],
    forbiddenActions: [
      "Execute system actions from voice without text confirmation",
      "Record audio without active operator awareness",
    ],
    escalatesTo: "JARVIS",
    externalActions: "NONE",
  },

  {
    id: "workflow-coordinator",
    codename: "CHAIN",
    displayName: "Workflow Coordinator",
    role: "Workflow Automation Coordinator",
    status: "NOT_WIRED",
    isRegisteredCockpitAgent: false,
    charter:
      "Chain operator workflows — ingestion → scoring → routing → content draft → settlement — " +
      "on schedule, pausing at every human checkpoint gate.",
    currentTruth:
      "Seat is designed only. BullMQ jobs run independently; no cross-job workflow " +
      "coordinator exists.",
    ownsCapabilities: ["workflow-automation"],
    safeActions: [
      "Document the checkpoint-gated workflow design",
    ],
    forbiddenActions: [
      "Run a workflow that bypasses a human gate",
      "Auto-publish or auto-post as part of any workflow",
    ],
    escalatesTo: "OWNER",
    externalActions: "NONE",
  },
];

// ─── Council accessors ────────────────────────────────────────────────────────

// Returns every council seat in roster order.
export function getAgentCouncil(): readonly AgentCouncilMember[] {
  return AGENT_COUNCIL;
}

// Returns one council seat by stable id, or undefined.
export function getCouncilMember(id: string): AgentCouncilMember | undefined {
  return AGENT_COUNCIL.find((m) => m.id === id);
}

// Returns council seats filtered by wiring status.
export function getCouncilByStatus(
  status: CouncilSeatStatus
): readonly AgentCouncilMember[] {
  return AGENT_COUNCIL.filter((m) => m.status === status);
}

// Returns the council seat that owns a given capability id, or undefined.
export function getCapabilityOwner(
  capabilityId: string
): AgentCouncilMember | undefined {
  return AGENT_COUNCIL.find((m) => m.ownsCapabilities.includes(capabilityId));
}

export interface CouncilSeatCounts {
  readonly total: number;
  readonly draftOnly: number;
  readonly manual: number;
  readonly notWired: number;
  readonly registeredCockpitAgents: number;
}

// Returns honest counts of seats by status for cockpit display.
export function getCouncilSeatCounts(): CouncilSeatCounts {
  return {
    total: AGENT_COUNCIL.length,
    draftOnly: AGENT_COUNCIL.filter((m) => m.status === "DRAFT_ONLY").length,
    manual: AGENT_COUNCIL.filter((m) => m.status === "MANUAL").length,
    notWired: AGENT_COUNCIL.filter((m) => m.status === "NOT_WIRED").length,
    registeredCockpitAgents: AGENT_COUNCIL.filter(
      (m) => m.isRegisteredCockpitAgent
    ).length,
  };
}

// Resolves the capabilities a seat owns to full registry entries (skips unknown ids).
export function getOwnedCapabilities(
  member: AgentCouncilMember
): readonly JarvisCapability[] {
  return member.ownsCapabilities
    .map((id) => getCapability(id))
    .filter((c): c is JarvisCapability => c !== undefined);
}
