/**
 * Jarvis Capability Registry
 *
 * Single source of truth for every intelligence capability in Galaxy Sports Edge.
 * Each capability declares its honest status, governance rules, and next action.
 *
 * Status ladder (ordered by wiring depth):
 *   NOT_WIRED  — concept exists, zero code
 *   DESIGNED   — architecture defined, partial infrastructure, not functional
 *   MANUAL     — works but only via human-operated process
 *   DRAFT_ONLY — automated outputs exist, all require human approval
 *   ACTIVE     — fully autonomous within its defined boundaries
 *
 * Trust rule: Never mark ACTIVE unless the capability truly executes
 * autonomously without human intervention in the repo's current state.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapabilityStatus =
  | "NOT_WIRED"
  | "DESIGNED"
  | "MANUAL"
  | "DRAFT_ONLY"
  | "ACTIVE";

export type CapabilityCategory =
  | "INTELLIGENCE_CORE"
  | "PLATFORM_OPERATIONS"
  | "GROWTH_REVENUE"
  | "AI_INFRASTRUCTURE";

export type OwnerMode =
  | "OWNER_DECISION_REQUIRED"
  | "DRAFT_AWAITS_APPROVAL"
  | "MANUAL_OPERATOR"
  | "FULLY_AUTOMATED"
  | "NOT_WIRED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface JarvisCapability {
  readonly id: string;
  readonly name: string;
  readonly category: CapabilityCategory;
  readonly status: CapabilityStatus;
  readonly mission: string;
  readonly currentTruth: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly allowedActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly ownerMode: OwnerMode;
  readonly proofSource: string | null;
  readonly riskLevel: RiskLevel;
  readonly nextAction: string;
  readonly requiresHumanApproval: boolean;
  readonly canAnswer: boolean;
  readonly canRecommend: boolean;
  readonly canExecute: boolean;
}

// ─── Capability definitions ───────────────────────────────────────────────────

export const CAPABILITY_REGISTRY: readonly JarvisCapability[] = [
  // ── INTELLIGENCE CORE ─────────────────────────────────────────────────────

  {
    id: "picks-intelligence",
    name: "Picks Intelligence",
    category: "INTELLIGENCE_CORE",
    status: "DRAFT_ONLY",
    mission:
      "Score, rank, and route sports picks from structured odds data through a " +
      "prediction engine. Publish picks internally; gate public exposure until trust is earned.",
    currentTruth:
      "Prediction engine runs. Picks are scored and published internally. " +
      "Public gate (PUBLIC_PICKS_ENABLED) is owner-controlled. " +
      "No real-time market intelligence or CLV tracking beyond raw ingestion.",
    inputs: ["The Odds API odds data", "Prediction engine confidence scores", "Public gate flag"],
    outputs: ["Scored picks with confidence and tier", "Today's pick count", "Settlement ledger"],
    allowedActions: [
      "Score picks from ingested odds data",
      "Publish picks internally",
      "Report pick counts and settlement status",
      "Surface pick history",
    ],
    forbiddenActions: [
      "Publish picks publicly without PUBLIC_PICKS_ENABLED=true",
      "Fabricate confidence scores",
      "Bootstrap picks counted in performance stats",
    ],
    ownerMode: "OWNER_DECISION_REQUIRED",
    proofSource: "/cockpit/history",
    riskLevel: "MEDIUM",
    nextAction: "Open PUBLIC_PICKS_ENABLED gate when data quality and trust gates are satisfied.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "market-line-intelligence",
    name: "Market / Line Intelligence",
    category: "INTELLIGENCE_CORE",
    status: "DESIGNED",
    mission:
      "Track line movement, closing line value (CLV), market consensus, and sharp money signals " +
      "to augment prediction quality and inform operator strategy.",
    currentTruth:
      "The Odds API is wired for data ingestion. Raw odds/lines flow into the prediction engine. " +
      "No CLV tracking, no line movement alerts, no market intelligence layer beyond ingestion.",
    inputs: ["The Odds API real-time data", "Historical odds snapshots", "Sharp money indicators"],
    outputs: ["CLV signals", "Line movement alerts", "Market consensus scores"],
    allowedActions: [
      "Ingest odds data via The Odds API",
      "Surface raw line data in cockpit",
    ],
    forbiddenActions: [
      "Claim CLV is tracked without instrumentation",
      "Surface market intelligence before it is built",
    ],
    ownerMode: "NOT_WIRED",
    proofSource: null,
    riskLevel: "MEDIUM",
    nextAction:
      "Build CLV tracking layer: capture opening line, closing line, and actual result per pick.",
    requiresHumanApproval: true,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "data-reliability",
    name: "Data Reliability",
    category: "INTELLIGENCE_CORE",
    status: "DRAFT_ONLY",
    mission:
      "Monitor, validate, and refresh sports data ingestion. Alert on stale data, " +
      "failed API calls, and schema drift. Keep the prediction engine fed with fresh truth.",
    currentTruth:
      "BullMQ + Redis workers run for data refresh. The Odds API data flows into picks. " +
      "TAL agent reports ingestion status to Jarvis assessment. " +
      "Stale data detection is timestamp-based. No auto-re-trigger on failure.",
    inputs: ["The Odds API responses", "Ingestion timestamps", "Worker run logs"],
    outputs: ["Ingestion health status (GREEN/AMBER/RED)", "Last-sync timestamp", "Failure count"],
    allowedActions: [
      "Monitor ingestion health",
      "Report stale data to Jarvis",
      "Surface last-run timestamps in cockpit",
    ],
    forbiddenActions: [
      "Auto-restart workers without operator approval",
      "Claim ingestion is healthy without a fresh timestamp",
    ],
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "/admin/dashboard",
    riskLevel: "HIGH",
    nextAction: "Wire auto-alerting on stale ingestion (>4h) to cockpit decision queue.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  // ── PLATFORM OPERATIONS ────────────────────────────────────────────────────

  {
    id: "settlement-results",
    name: "Settlement & Results",
    category: "PLATFORM_OPERATIONS",
    status: "MANUAL",
    mission:
      "Settle picks against actual game outcomes. Track wins, losses, pushes, and voids. " +
      "Feed accurate results into calibration and performance tracking.",
    currentTruth:
      "Settlement logic exists in the prediction engine. Settlement worker can be triggered manually. " +
      "No automated settlement runner. No external score data integration for auto-settlement.",
    inputs: ["Game results (manual entry)", "Canonical pick ledger", "Settlement worker trigger"],
    outputs: ["Settled picks", "Win/loss/push record", "Pending settlement count"],
    allowedActions: [
      "Run settlement worker manually",
      "Report settlement backlog",
      "Surface settlement history",
    ],
    forbiddenActions: [
      "Auto-settle without verifying external result source",
      "Count pending picks in win rate",
    ],
    ownerMode: "MANUAL_OPERATOR",
    proofSource: "/cockpit/history",
    riskLevel: "HIGH",
    nextAction: "Wire external score data source (ESPN/The Odds API results) for auto-settlement.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "performance-calibration",
    name: "Performance Calibration",
    category: "PLATFORM_OPERATIONS",
    status: "MANUAL",
    mission:
      "Track, audit, and calibrate prediction accuracy. Gate performance stats behind " +
      "canonical sample size and display safety rules. Never expose stats before the trust bar is met.",
    currentTruth:
      "Calibration page exists at /cockpit/calibration. Public performance policy enforced. " +
      "Confidence is audited as a rank score; Brier and reliability require receipt-committed probabilities. " +
      "Win rate is displayed only when displaySafe is true. No automated recalibration or model weight adjustment.",
    inputs: ["Learning-eligible canonical settled picks", "Win/loss/push record", "Receipt-committed probabilities", "Display gate (canExposePerformanceStats)"],
    outputs: ["Win rate (if displaySafe)", "Rank-discrimination audit", "Probability reliability when evidence exists", "Performance policy state"],
    allowedActions: [
      "Report canonical performance metrics",
      "Gate public display per policy",
      "Surface calibration proposals for review",
    ],
    forbiddenActions: [
      "Show 70% as an achieved result before displaySafe",
      "Count bootstrap or pending picks in win rate",
      "Auto-adjust model weights without review",
    ],
    ownerMode: "MANUAL_OPERATOR",
    proofSource: "/cockpit/calibration",
    riskLevel: "HIGH",
    nextAction:
      "Accumulate 25 canonical settled picks. Then review win rate. Open gate if accurate.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "risk-public-claims",
    name: "Risk & Public Claims",
    category: "PLATFORM_OPERATIONS",
    status: "DRAFT_ONLY",
    mission:
      "Guard against misleading public claims, premature performance exposure, " +
      "and unsafe public communications. Jarvis is the risk sensor; all claims require human sign-off.",
    currentTruth:
      "Jarvis assessment runs safety checks on every cockpit load. " +
      "Safety warnings immediately surface to the decision queue. " +
      "Performance stats hard-gated behind policy. Content always draft-only.",
    inputs: ["Safety warning signals", "Performance policy", "Public picks gate state"],
    outputs: ["Safety warnings (RED)", "Advisory warnings (AMBER)", "Claim clearance status"],
    allowedActions: [
      "Surface safety warnings to operator",
      "Block public performance display when gated",
      "Flag draft content for review",
    ],
    forbiddenActions: [
      "Auto-clear a safety warning without human review",
      "Allow public picks/performance when gate is closed",
      "Infer claim accuracy from absence of data",
    ],
    ownerMode: "OWNER_DECISION_REQUIRED",
    proofSource: "/cockpit",
    riskLevel: "CRITICAL",
    nextAction: "Resolve any active safety warnings before expanding public reach.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  // ── GROWTH & REVENUE ───────────────────────────────────────────────────────

  {
    id: "customer-surface",
    name: "Customer Surface",
    category: "GROWTH_REVENUE",
    status: "DRAFT_ONLY",
    mission:
      "Serve the customer dashboard with properly gated picks, performance stats, " +
      "and subscription-tier entitlements. The customer should never see ungated data.",
    currentTruth:
      "Customer dashboard at /dashboard is live. Picks shown to subscribers. " +
      "Performance stats hard-gated per policy. SARAH agent monitors dashboard health. " +
      "Subscription tiers enforced server-side.",
    inputs: ["Subscription entitlements", "Published picks", "Performance policy state"],
    outputs: ["Customer pick view", "Subscriber-only features", "Dashboard health status"],
    allowedActions: [
      "Serve picks to entitled subscribers",
      "Gate premium features by tier",
      "Report dashboard health to operator",
    ],
    forbiddenActions: [
      "Serve performance stats before displaySafe",
      "Show picks to unauthenticated users",
      "Bypass subscription checks",
    ],
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "/dashboard",
    riskLevel: "HIGH",
    nextAction: "Open PUBLIC_PICKS_ENABLED gate to serve public picks to all tiers.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "content-media",
    name: "Content & Media",
    category: "GROWTH_REVENUE",
    status: "DRAFT_ONLY",
    mission:
      "Generate, schedule, and route sports content from real platform data. " +
      "AVA drafts; humans publish. No auto-publishing under any circumstances.",
    currentTruth:
      "Content engine exists. AVA agent can generate blog post and newsletter drafts. " +
      "All content waits in draft queue for human review. No auto-publish.",
    inputs: ["Approved picks data", "Settlement record", "Content templates"],
    outputs: ["Draft blog posts", "Draft newsletter sections", "Draft short-form copy"],
    allowedActions: [
      "Generate content drafts from real platform data",
      "Route drafts to review queue",
      "Suggest publication metadata",
    ],
    forbiddenActions: [
      "Auto-publish without human approval",
      "Fabricate picks or performance figures in content",
      "Use bootstrap or pending picks as proven results",
    ],
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "/cockpit/content",
    riskLevel: "HIGH",
    nextAction: "Review draft content queue at /cockpit/content before expanding to newsletter.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "revenue-subscriptions",
    name: "Revenue & Subscriptions",
    category: "GROWTH_REVENUE",
    status: "DESIGNED",
    mission:
      "Track subscription health, conversion, churn, CLV, and upgrade triggers. " +
      "BOBBY surfaces revenue intelligence; owner decides on pricing and promotions.",
    currentTruth:
      "Stripe wired for Pro and Elite subscriptions. Webhook handling present. " +
      "Pricing phases defined. BOBBY agent is defined but subscription intelligence " +
      "(churn prediction, upgrade triggers, CLV modeling) is not yet built.",
    inputs: ["Stripe events", "Subscription tier data", "User engagement signals"],
    outputs: ["Subscription health", "Conversion funnel", "Churn alerts", "Upgrade triggers"],
    allowedActions: [
      "Surface subscription tier counts",
      "Report webhook health",
      "Draft revenue observations for review",
    ],
    forbiddenActions: [
      "Charge customers without explicit Stripe checkout flow",
      "Auto-upgrade or auto-cancel subscriptions",
      "Surface unverified CLV predictions as facts",
    ],
    ownerMode: "OWNER_DECISION_REQUIRED",
    proofSource: null,
    riskLevel: "HIGH",
    nextAction:
      "Build BOBBY subscription intelligence layer: churn signals, tier migration triggers.",
    requiresHumanApproval: true,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },

  // ── AI INFRASTRUCTURE ──────────────────────────────────────────────────────

  {
    id: "ai-ops-token-discipline",
    name: "AI Ops / Token Discipline",
    category: "AI_INFRASTRUCTURE",
    status: "MANUAL",
    mission:
      "Control model usage, token spend, and AI quality. Enforce the model lane policy. " +
      "Track costs with ccusage. Instrument observability before scaling AI usage.",
    currentTruth:
      "Model lane policy defined and documented. ccusage available for manual spot-checking. " +
      "No live token tracking in cockpit. No Langfuse/Helicone wired. " +
      "AI Ops posture is policy + manual spot-check only.",
    inputs: ["ccusage terminal output", "Model lane policy", "Agent work logs"],
    outputs: ["Token spend estimates", "Model lane compliance", "Instrumentation gaps"],
    allowedActions: [
      "Run `npx ccusage@latest` for daily spend",
      "Enforce model lane policy in all agent instructions",
      "Report AI Ops posture to cockpit",
    ],
    forbiddenActions: [
      "Claim token counts without instrumentation",
      "Claim Langfuse/Helicone are wired before they are",
      "Allow unbounded model calls without budget awareness",
    ],
    ownerMode: "MANUAL_OPERATOR",
    proofSource: "/cockpit/api-costs",
    riskLevel: "MEDIUM",
    nextAction: "Wire ccusage daily totals to /cockpit/api-costs. Then add Langfuse.",
    requiresHumanApproval: false,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "memory-knowledge-base",
    name: "Memory / Knowledge Base",
    category: "AI_INFRASTRUCTURE",
    status: "NOT_WIRED",
    mission:
      "Persist operational decisions, analysis outcomes, and operator context across sessions. " +
      "Prevent re-deriving known facts. Enable Jarvis to remember what changed and why.",
    currentTruth:
      "No persistent memory system exists. No vector store. No conversation history. " +
      "No cross-session recall. Architecture docs exist as markdown. " +
      "Jarvis context is rebuilt fresh from OwnerSummary on every cockpit load.",
    inputs: ["Operator decisions", "Jarvis session outputs", "Analysis artifacts"],
    outputs: ["Persistent context", "Cross-session recall", "Knowledge graph nodes"],
    allowedActions: [
      "Write operator decisions to memory store",
      "Surface relevant past context in future sessions",
      "Index docs for semantic search",
    ],
    forbiddenActions: [
      "Claim memory is available before wired",
      "Fabricate recalled facts",
      "Store PII without explicit consent layer",
    ],
    ownerMode: "NOT_WIRED",
    proofSource: null,
    riskLevel: "LOW",
    nextAction: "Wire mem0 or Postgres-based episodic memory to capture owner decisions.",
    requiresHumanApproval: false,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "tool-router-mcp-layer",
    name: "Tool Router / MCP Layer",
    category: "AI_INFRASTRUCTURE",
    status: "NOT_WIRED",
    mission:
      "Provide a governed tool bus so agents can call APIs, search the web, " +
      "query databases, and invoke external services safely, with rate limits, " +
      "logging, and owner approval for new tool connections.",
    currentTruth:
      "MCP (Model Context Protocol) architecture is referenced in the model lane policy " +
      "but not wired to this repo. No tool bus exists. Agent actions are manual workflows.",
    inputs: ["Agent tool requests", "MCP server definitions", "Owner-approved tool registry"],
    outputs: ["Tool call results", "Audit log of tool invocations", "Rate-limit enforcement"],
    allowedActions: [
      "Route tool calls through approved MCP servers",
      "Audit every tool invocation",
      "Rate-limit external API calls per budget",
    ],
    forbiddenActions: [
      "Allow agents to call arbitrary APIs without registry approval",
      "Execute tool calls without logging",
    ],
    ownerMode: "NOT_WIRED",
    proofSource: null,
    riskLevel: "MEDIUM",
    nextAction: "Wire Claude MCP SDK. Register The Odds API as first approved tool.",
    requiresHumanApproval: true,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "agent-orchestration",
    name: "Agent Orchestration",
    category: "AI_INFRASTRUCTURE",
    status: "DESIGNED",
    mission:
      "Coordinate multi-agent workflows: route work, manage handoffs, resolve conflicts, " +
      "and ensure each agent operates within its lane. Prevent agents from doing work outside their scope.",
    currentTruth:
      "Agent registry defines 6 agents (JARVIS, SARAH, TAL, SCOUT, AVA, BOBBY). " +
      "Each has defined responsibilities and safe action lists. " +
      "No orchestration runtime exists. Agents are roles, not running processes.",
    inputs: ["Agent task queue", "Agent capability registry", "Handoff protocols"],
    outputs: ["Routed work items", "Agent status reports", "Handoff artifacts"],
    allowedActions: [
      "Define agent responsibilities",
      "Route tasks to agent queues via cockpit",
      "Monitor agent task counts and blockers",
    ],
    forbiddenActions: [
      "Run orchestration without an approved runtime",
      "Allow agent-to-agent communication without audit trail",
      "Auto-execute work without operator approval",
    ],
    ownerMode: "NOT_WIRED",
    proofSource: "/cockpit/agents",
    riskLevel: "MEDIUM",
    nextAction:
      "Implement BullMQ-based orchestration layer: task routing from Jarvis to agent queues.",
    requiresHumanApproval: true,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "browser-computer-control",
    name: "Browser / Computer Control",
    category: "AI_INFRASTRUCTURE",
    status: "NOT_WIRED",
    mission:
      "Allow governed agents to perform browser-based and computer-control actions " +
      "under strict human oversight: navigate, scrape, fill forms, and screenshot " +
      "within a sandboxed Playwright environment.",
    currentTruth:
      "No browser automation layer exists. browser-use and Playwright are not wired. " +
      "No computer control capability in this repo.",
    inputs: ["Agent browser action instructions", "Sandboxed browser session", "Action approval"],
    outputs: ["Screenshots", "Scraped data", "Form submission confirmations"],
    allowedActions: [
      "Navigate pre-approved domains",
      "Capture screenshots for operator review",
      "Scrape pre-approved data sources",
    ],
    forbiddenActions: [
      "Execute any browser action without explicit owner approval",
      "Access external sites not in approved list",
      "Store credentials in browser automation scripts",
    ],
    ownerMode: "NOT_WIRED",
    proofSource: null,
    riskLevel: "HIGH",
    nextAction: "NOT YET: wire MCP tool bus first. Browser control comes after tool routing.",
    requiresHumanApproval: true,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "voice-interface",
    name: "Voice Interface",
    category: "AI_INFRASTRUCTURE",
    status: "NOT_WIRED",
    mission:
      "Enable voice-based owner interaction with Jarvis: speak questions, receive spoken " +
      "answers, and issue voice commands with full audit trail.",
    currentTruth:
      "No voice interface exists. Whisper, Piper, and Pipecat are not wired. " +
      "Voice interaction is a future product layer concept.",
    inputs: ["Microphone audio", "STT pipeline (Whisper)", "TTS pipeline (Piper/Pipecat)"],
    outputs: ["Transcribed queries", "Spoken Jarvis responses", "Voice command log"],
    allowedActions: [
      "Transcribe voice queries to text",
      "Route voice queries to Jarvis Q&A",
      "Speak responses via TTS",
    ],
    forbiddenActions: [
      "Execute system actions from voice commands without text confirmation",
      "Record voice without active operator awareness",
    ],
    ownerMode: "NOT_WIRED",
    proofSource: null,
    riskLevel: "MEDIUM",
    nextAction: "NOT YET: wire Ask Jarvis console fully first. Voice layer is Phase 4+.",
    requiresHumanApproval: true,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "workflow-automation",
    name: "Workflow Automation",
    category: "AI_INFRASTRUCTURE",
    status: "NOT_WIRED",
    mission:
      "Automate multi-step operator workflows: daily ingestion → scoring → pick routing → " +
      "content draft → settlement chain. Run on schedule with human checkpoints.",
    currentTruth:
      "No workflow automation layer exists. n8n and similar tools are not wired. " +
      "BullMQ jobs run independently without a cross-job workflow coordinator.",
    inputs: ["Workflow trigger (schedule/event)", "Step definitions", "Human checkpoint gates"],
    outputs: ["Automated job execution", "Workflow status dashboard", "Step completion audit"],
    allowedActions: [
      "Trigger pre-approved workflows on schedule",
      "Pause at human checkpoint gates",
      "Log every workflow step",
    ],
    forbiddenActions: [
      "Run a workflow that bypasses a human gate",
      "Auto-publish or auto-post as part of any workflow",
    ],
    ownerMode: "NOT_WIRED",
    proofSource: null,
    riskLevel: "MEDIUM",
    nextAction:
      "Wire BullMQ workflow coordinator: ingestion → scoring → quality check → picks routing.",
    requiresHumanApproval: true,
    canAnswer: false,
    canRecommend: false,
    canExecute: false,
  },
];

// ─── Registry accessors ───────────────────────────────────────────────────────

// Returns all capabilities in the registry.
export function getAllCapabilities(): readonly JarvisCapability[] {
  return CAPABILITY_REGISTRY;
}

// Returns capabilities filtered by status.
export function getCapabilitiesByStatus(
  status: CapabilityStatus
): readonly JarvisCapability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.status === status);
}

// Returns capabilities filtered by category.
export function getCapabilitiesByCategory(
  category: CapabilityCategory
): readonly JarvisCapability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.category === category);
}

// Returns a single capability by id, or undefined.
export function getCapability(id: string): JarvisCapability | undefined {
  return CAPABILITY_REGISTRY.find((c) => c.id === id);
}

// Returns a 0–100 wiring score weighted by status depth.
export function computeWiringScore(): number {
  const weights: Record<CapabilityStatus, number> = {
    ACTIVE: 4,
    DRAFT_ONLY: 3,
    MANUAL: 2,
    DESIGNED: 1,
    NOT_WIRED: 0,
  };
  const maxScore = CAPABILITY_REGISTRY.length * 4;
  const actual = CAPABILITY_REGISTRY.reduce((sum, c) => sum + weights[c.status], 0);
  return Math.round((actual / maxScore) * 100);
}

// Returns a human label for the wiring score range.
export function getWiringLabel(score: number): string {
  if (score >= 80) return "Operational";
  if (score >= 55) return "Building";
  if (score >= 30) return "Early Stage";
  return "Foundation";
}
