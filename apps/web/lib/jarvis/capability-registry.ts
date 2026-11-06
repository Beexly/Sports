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
      "Prediction engine runs. Picks can be scored and stored. Public gates (PUBLIC_PICKS_ENABLED / LIVE_BOARD) " +
      "default off. Free Gamma quote path exists (oddsApiRequired=false). Paid Odds enrichment optional. " +
      "methodTag + continuous CLV archive live in quote-plane; production proof still depends on Neon + cron.",
    inputs: [
      "Polymarket Gamma (free)",
      "The Odds API (optional enrichment)",
      "Prediction engine scores",
      "Public gate flags",
    ],
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
    status: "DRAFT_ONLY",
    mission:
      "Track line movement, closing line value (CLV), market consensus, and sharp money signals " +
      "to augment prediction quality and inform operator strategy.",
    currentTruth:
      "quote-plane: methodTag on quotes, continuous CLV archive (open→close same method), sameMethodOrRefuse. " +
      "Gamma free provider + optional Odds enrichment. Line-movement alerts and sharp-money narrative still " +
      "not productized as ACTIVE automation. Do not claim public CLV leaderboards without PROVEN production runs.",
    inputs: [
      "Gamma free quotes",
      "Optional Odds API snapshots",
      "Closing archive rows with methodTag",
    ],
    outputs: [
      "Continuous CLV grades when method tags match",
      "Archive rows for open/close",
      "Internal cockpit CLV surfaces",
    ],
    allowedActions: [
      "Ingest free Gamma quotes",
      "Archive open/close with methodTag",
      "Refuse continuous CLV when methods diverge",
      "Surface internal CLV in cockpit",
    ],
    forbiddenActions: [
      "Claim production CLV leaderboards without Neon-proven archive",
      "Mix methodTags in continuous CLV",
      "Require paid Odds on free critical path",
    ],
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "packages/quote-plane/src/archive/closing-archive.ts",
    riskLevel: "MEDIUM",
    nextAction:
      "Run Production gamma cron + free settlement; verify archive rows and cockpit CLV against live DB.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
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
      "Free-first adapters (ESPN, henrygd, Open-Meteo, nflverse) + free:doctor. " +
      "Vercel crons (gamma, hydrate, settle free-path, ingest) are the production scheduler. " +
      "The optional self-hosted worker stack (docker/oracle-vps) is not deployed, and no job-queue " +
      "library is installed. TAL reports status into Jarvis. Stale auto-retrigger still limited.",
    inputs: [
      "Free adapter responses",
      "Cron run timestamps",
      "Optional Odds enrichment",
      "Worker logs",
    ],
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
    proofSource: "/cockpit/sources",
    riskLevel: "HIGH",
    nextAction: "Wire stale ingestion (>4h) into /cockpit/command-center attention queue automatically.",
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
    status: "DRAFT_ONLY",
    mission:
      "Settle picks against actual game outcomes. Track wins, losses, pushes, and voids. " +
      "Feed accurate results into calibration and performance tracking.",
    currentTruth:
      "settle-picks cron: paid Odds path when THE_ODDS_API_KEY set; free path (ESPN+henrygd trusted finals) " +
      "when key missing — oddsApiRequired=false. DISPUTED holds. Transactional outbox + post-settlement work. " +
      "Production proof still needs Neon + CRON_SECRET smoke.",
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
    nextAction: "Prove free settlement on Production Neon; keep paid Odds as optional enrichment only.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: false,
    canExecute: false,
  },

  {
    id: "performance-calibration",
    name: "Performance Calibration",
    category: "PLATFORM_OPERATIONS",
    status: "DRAFT_ONLY",
    mission:
      "Track, audit, and calibrate prediction accuracy. Gate performance stats behind " +
      "canonical sample size and display safety rules. Never expose stats before the trust bar is met.",
    currentTruth:
      "Calibration Proof Room live at /calibration and /cockpit/calibration. Official New Engine Verified Record " +
      "(62-23-1, 72.9%, +26.50u) audited and sealed in data/engine/new_engine_official_ledger_2026.json. " +
      "Barber weighted conformal prediction, FWL market residualization, and Karpathy autoresearch keep-or-reset gate wired.",
    inputs: ["Canonical settled picks", "Win/loss/push record", "Display gate (canExposePerformanceStats)"],
    outputs: ["Win rate (if displaySafe)", "Calibration proposals", "Performance policy state"],
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
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "/calibration",
    riskLevel: "HIGH",
    nextAction:
      "Continue post-Week-9 settlement grading and conformal head calibration.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
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
    status: "DRAFT_ONLY",
    mission:
      "Track subscription health, conversion, churn, CLV, and upgrade triggers. " +
      "BOBBY surfaces revenue intelligence; owner decides on pricing and promotions.",
    currentTruth:
      "Stripe wired for Single Game ($9), Weekly All-Access ($29), VIP Season Pass ($199), and Pro Syndicate ($499). " +
      "In-place browser unlock ledger and PostHog Cloud ($50k credit stack) conversion funnel telemetry wired.",
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
    proofSource: "/packages",
    riskLevel: "HIGH",
    nextAction:
      "Monitor PostHog conversion funnel and Stripe webhook settlement across Week 9 packages.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
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
      "Hierarchical model routing policy enforced: workhorse tasks on free/local lanes, frontier strictly on JEV snap synthesis. " +
      "Sentry ($5,000 startup grant) and PostHog AI observability wired with health-ping filtering.",
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
    nextAction: "Continue zero-waste token governance across Jynx and OpenRouter free lanes.",
    requiresHumanApproval: false,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "memory-knowledge-base",
    name: "Memory / Knowledge Base",
    category: "AI_INFRASTRUCTURE",
    status: "DRAFT_ONLY",
    mission:
      "Persist operational decisions, analysis outcomes, and operator context across sessions. " +
      "Prevent re-deriving known facts. Enable Jarvis to remember what changed and why.",
    currentTruth:
      "Pinecone 2025-04 Serverless Hybrid Index (llama-text-embed-v2 1024-dim + pinecone-sparse-english-v0 + pinecone-rerank-v0) " +
      "wired across 210 books (395 Drive PDFs, 197/197 unique Mega-Sweep PDFs), 372 GitHub repos/URLs, 30 Morning Sweep CSVs, and 10 Innovation Kernels.",
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
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "/intelligence/observatory",
    riskLevel: "LOW",
    nextAction: "Maintain continuous Pinecone hybrid index snapshots as new research waves land.",
    requiresHumanApproval: false,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "tool-router-mcp-layer",
    name: "Tool Router / MCP Layer",
    category: "AI_INFRASTRUCTURE",
    status: "DRAFT_ONLY",
    mission:
      "Provide a governed tool bus so agents can call APIs, search the web, " +
      "query databases, and invoke external services safely, with rate limits, " +
      "logging, and owner approval for new tool connections.",
    currentTruth:
      "MCP Equations Server (packages/mcp-equations-server/src/mcp-cognitive-router.ts) and PostHog MCP server " +
      "wired with 288-bit context masks, Spectral Cluster Orthogonalization, and rate-limited API governance.",
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
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "packages/mcp-equations-server/src/mcp-cognitive-router.ts",
    riskLevel: "MEDIUM",
    nextAction: "Expand governed MCP tool definitions across analytical subpackages.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "agent-orchestration",
    name: "Agent Orchestration",
    category: "AI_INFRASTRUCTURE",
    status: "DRAFT_ONLY",
    mission:
      "Coordinate multi-agent workflows: route work, manage handoffs, resolve conflicts, " +
      "and ensure each agent operates within its lane. Prevent agents from doing work outside their scope.",
    currentTruth:
      "Agent OS registry + council + cockpit operating map + materializeJarvisDraftTasks live. " +
      "jarvis-snapshot surfaces draft tasks. externalActions NONE. " +
      "No autonomous external execution — draft queue is the runtime.",
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
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "/cockpit/agents",
    riskLevel: "MEDIUM",
    nextAction:
      "Keep draft task materialization on jarvis-snapshot; enqueue to cockpit tasks when Neon proven.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
    canExecute: false,
  },

  {
    id: "browser-computer-control",
    name: "Browser / Computer Control",
    category: "AI_INFRASTRUCTURE",
    status: "MANUAL",
    mission:
      "Allow governed agents to perform browser-based and computer-control actions " +
      "under strict human oversight: navigate, scrape, fill forms, and screenshot " +
      "within a sandboxed Playwright environment.",
    currentTruth:
      "Playwright browser verification and jev-browser-use / jev-computer-use host-allowlisted step drivers " +
      "wired for operator-supervised verification and grant/compliance workflows.",
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
    ownerMode: "MANUAL_OPERATOR",
    proofSource: "scripts/guardrails/trust-gate.mjs",
    riskLevel: "HIGH",
    nextAction: "Keep all browser sessions gated by host allowlists and operator supervision.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
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
    status: "DRAFT_ONLY",
    mission:
      "Automate multi-step operator workflows: daily ingestion → scoring → pick routing → " +
      "content draft → settlement chain. Run on schedule with human checkpoints.",
    currentTruth:
      "5-Stage Connected Game Workflow (Stage 0 Roster Truth -> Stage 1 Coaching/Film -> Stage 2 Situational/Equations -> " +
      "Stage 3/4 Snap-by-Snap JEV 10k Trajectory -> Stage 5 Conjunction Gate) and inbox-zero ops triage wired.",
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
    ownerMode: "DRAFT_AWAITS_APPROVAL",
    proofSource: "apps/web/lib/engine/connected-workflow-loader.ts",
    riskLevel: "MEDIUM",
    nextAction:
      "Execute connected 5-stage workflow across all Week 9 Sunday Main Slate and MNF island games.",
    requiresHumanApproval: true,
    canAnswer: true,
    canRecommend: true,
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
