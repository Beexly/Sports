/**
 * Jarvis Agent Council
 *
 * The governed roster of intelligence roles that operate Galaxy Sports Edge.
 * A council seat is a ROLE with a charter, not a running process. The six
 * registered cockpit agents (JARVIS, SARAH, TAL, SCOUT, AVA, BOBBY) exist in
 * the cockpit agent registry and Prisma OperatorAgent enum; the remaining
 * seventeen seats are designed roles for capabilities that are manual or not wired.
 *
 * Trust rules:
 *   - No seat is ever AUTONOMOUS. Statuses are DRAFT_ONLY, MANUAL, NOT_WIRED.
 *   - externalActions is always "NONE" — no seat performs external actions
 *     without human approval. This mirrors the cockpit agent registry.
 *   - externalActionsAllowed is always false (literal) — same invariant, typed field.
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

/** Subagent template — a narrow task worker spawned under a seat for one job.
 *  Subagents never: take external action, publish, confirm memory, approve
 *  claims, override parents, or write canonical data without review. */
export interface SubagentTemplate {
  readonly id: string;
  readonly parentSeatId: string;
  readonly name: string;
  readonly purpose: string;
  readonly authorityTier: 0 | 1;
  readonly allowedInputs: readonly string[];
  readonly allowedOutputs: readonly string[];
  readonly prohibitedActions: readonly string[];
  readonly requiresParentReview: true;
}

/** Full typed seat definition (spec §5). Extends the legacy AgentCouncilMember
 *  fields with all new governance fields. */
export interface AgentSeat {
  // ── Core identity ──────────────────────────────────────────────────────
  readonly id: string;
  readonly codename: string;
  /** Display name — same as codename in human-readable form. */
  readonly name: string;
  readonly displayName: string;
  readonly role: string;

  // ── Wiring status ──────────────────────────────────────────────────────
  readonly status: CouncilSeatStatus;
  readonly wiringState: "wired" | "manual" | "simulated" | "not_connected";

  // ── Org structure ──────────────────────────────────────────────────────
  readonly department: string;
  readonly reportsTo: readonly string[];
  readonly reviewedBy?: readonly string[];
  readonly escalatesTo: readonly string[];
  readonly authorityTier: 0 | 1 | 2 | 3 | 4;

  // ── Cockpit registry ───────────────────────────────────────────────────
  /** True only for the six agents in the cockpit agent registry / Prisma enum. */
  readonly isRegisteredCockpitAgent: boolean;

  // ── Charter fields ─────────────────────────────────────────────────────
  readonly charter: string;
  readonly currentTruth: string;

  // ── Capability ownership ───────────────────────────────────────────────
  /** Capability-registry ids this seat owns. Validated by tests. */
  readonly ownsCapabilities: readonly string[];

  // ── Action controls ────────────────────────────────────────────────────
  readonly safeActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly allowedInputs: readonly string[];
  readonly allowedOutputs: readonly string[];
  readonly prohibitedActions: readonly string[];
  /** Hard invariant: no council seat takes external actions on its own. */
  readonly externalActions: "NONE";
  /** Literal false — same invariant as externalActions but typed as boolean. */
  readonly externalActionsAllowed: false;

  // ── Memory & subagents ─────────────────────────────────────────────────
  readonly memoryAccess: "none" | "read_confirmed" | "write_candidate" | "manual_only";
  readonly canSpawnSubagents: boolean;
  readonly subagentTemplates?: readonly SubagentTemplate[];
  /** True only for ASCEND — the one standing (persistent) subagent. */
  readonly standingSubagent?: boolean;

  // ── Handoffs ───────────────────────────────────────────────────────────
  readonly handoffsIn: readonly string[];
  readonly handoffsOut: readonly string[];

  // ── Review & quality ──────────────────────────────────────────────────
  readonly reviewGates: readonly string[];
  readonly successMetrics: readonly string[];
  readonly failureModes: readonly string[];

  // ── Approval & run state ──────────────────────────────────────────────
  readonly ownerApprovalRequired: boolean;
  readonly lastRun: null;
}

/** Backward-compat alias — all AgentSeat objects satisfy this shape. */
export type AgentCouncilMember = AgentSeat;

// ─── Guardrails (spec §10) ────────────────────────────────────────────────────

export const GUARDRAILS: readonly string[] = [
  "No agent may publish, place bets, send emails, or post to social media without owner approval.",
  "No agent may scrape or browse externally without owner approval and an approved domain.",
  "No agent may claim real telemetry unless the instrumentation is wired and verified.",
  "No agent may treat simulated data as real operational data.",
  "No agent may confirm memory outside the memory protocol.",
  "No agent may override AUDIT on calibration or display-safety decisions.",
  "No agent may override METER on model selection or cost-discipline decisions.",
  "No agent may override JARVIS on routing decisions.",
  "No agent may override the Owner on final approval for any externally visible action.",
  "No agent may take any external action: externalActionsAllowed is always false.",
];

// ─── Council roster ───────────────────────────────────────────────────────────

export const AGENT_COUNCIL: readonly AgentSeat[] = [
  // ── Registered cockpit agents (exist in registry + Prisma enum) ───────────

  {
    id: "jarvis",
    codename: "JARVIS",
    name: "JARVIS",
    displayName: "Jarvis",
    role: "Chief Intelligence Officer",
    status: "DRAFT_ONLY",
    wiringState: "wired",
    department: "Command & Governance",
    reportsTo: ["Owner"],
    escalatesTo: ["Owner"],
    authorityTier: 1,
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
    allowedInputs: ["OwnerSummary", "capability registry", "council roster", "gate flags"],
    allowedOutputs: ["routing recommendations", "decision queue items", "Ask Jarvis answers"],
    prohibitedActions: [
      "Clear safety warnings autonomously",
      "Take any external action",
      "Claim wiring that does not exist",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: false,
    handoffsIn: ["SCOUT", "TAL", "SARAH", "AVA", "BOBBY", "LEDGER", "AUDIT", "ARCHIVE", "GAUGE", "QUILL", "VECTOR", "CHAIN", "ECHO", "RELAY", "METER"],
    handoffsOut: ["Owner"],
    reviewGates: ["owner-approval"],
    successMetrics: [
      "Every cockpit load produces a complete OwnerSummary",
      "Decision queue reflects live gate state",
      "Zero false ACTIVE claims in capability registry",
    ],
    failureModes: [
      "Stale OwnerSummary from database failure",
      "Missing gate flag causes incorrect posture color",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "scout",
    codename: "SCOUT",
    name: "SCOUT",
    displayName: "Scout",
    role: "Picks Desk Analyst",
    status: "DRAFT_ONLY",
    wiringState: "wired",
    department: "Sports Intelligence",
    reportsTo: ["JARVIS"],
    escalatesTo: ["JARVIS"],
    authorityTier: 1,
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
    allowedInputs: ["odds data", "injury reports", "schedule data", "line movement feeds"],
    allowedOutputs: ["research notes drafts", "pick annotations", "line-movement flags"],
    prohibitedActions: [
      "Publish picks without human approval",
      "Override prediction engine confidence scores",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: true,
    subagentTemplates: [
      {
        id: "scout-injury-context",
        parentSeatId: "scout",
        name: "Injury Context Subagent",
        purpose: "Research and summarize injury reports relevant to upcoming picks",
        authorityTier: 1,
        allowedInputs: ["injury report feeds", "roster data"],
        allowedOutputs: ["injury context draft for pick annotation"],
        prohibitedActions: ["Publish injury context", "Alter pick confidence"],
        requiresParentReview: true,
      },
      {
        id: "scout-schedule-spot",
        parentSeatId: "scout",
        name: "Schedule Spot Subagent",
        purpose: "Identify scheduling factors (back-to-backs, travel, rest days) affecting picks",
        authorityTier: 1,
        allowedInputs: ["schedule data", "team location data"],
        allowedOutputs: ["schedule context draft for pick annotation"],
        prohibitedActions: ["Publish schedule analysis", "Override pick selection"],
        requiresParentReview: true,
      },
      {
        id: "scout-odds-movement",
        parentSeatId: "scout",
        name: "Odds Movement Annotator",
        purpose: "Flag and annotate significant line movement on pending picks",
        authorityTier: 1,
        allowedInputs: ["current odds", "historical odds snapshots"],
        allowedOutputs: ["odds movement annotation draft"],
        prohibitedActions: ["Publish annotations", "Trigger pick cancellation"],
        requiresParentReview: true,
      },
      {
        id: "scout-weather-context",
        parentSeatId: "scout",
        name: "Weather & Context Subagent",
        purpose: "Summarize weather and venue context for outdoor-sport picks",
        authorityTier: 1,
        allowedInputs: ["weather API data", "venue data"],
        allowedOutputs: ["weather context draft"],
        prohibitedActions: ["Publish context", "Alter pick tier"],
        requiresParentReview: true,
      },
      {
        id: "scout-team-news",
        parentSeatId: "scout",
        name: "Team News Subagent",
        purpose: "Aggregate recent team news relevant to upcoming picks",
        authorityTier: 1,
        allowedInputs: ["approved news feeds", "public press releases"],
        allowedOutputs: ["team news summary draft"],
        prohibitedActions: ["Publish news content", "Fabricate news"],
        requiresParentReview: true,
      },
    ],
    handoffsIn: [],
    handoffsOut: ["DELTA", "JARVIS"],
    reviewGates: ["jarvis-routing", "owner-approval-if-public"],
    successMetrics: [
      "All published picks carry a research annotation",
      "Line-movement flags surface within one ingestion cycle",
    ],
    failureModes: [
      "Stale odds data produces inaccurate annotations",
      "Injury report latency missed before pick publication",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "tal",
    codename: "TAL",
    name: "TAL",
    displayName: "Tal",
    role: "Data Reliability Engineer",
    status: "DRAFT_ONLY",
    wiringState: "wired",
    department: "Data & Automation Platform",
    reportsTo: ["JARVIS"],
    escalatesTo: ["JARVIS"],
    authorityTier: 1,
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
    allowedInputs: ["ingestion worker logs", "test results", "schema snapshots", "adapter health checks"],
    allowedOutputs: ["bug investigation drafts", "ingestion freshness reports", "schema-drift alerts"],
    prohibitedActions: [
      "Restart workers autonomously",
      "Mark data healthy without verified timestamp",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: true,
    subagentTemplates: [
      {
        id: "tal-schema-drift",
        parentSeatId: "tal",
        name: "Schema Drift Subagent",
        purpose: "Detect and summarize schema drift in the database against Prisma schema",
        authorityTier: 1,
        allowedInputs: ["database schema snapshot", "Prisma schema"],
        allowedOutputs: ["schema drift report draft"],
        prohibitedActions: ["Apply schema migrations", "Delete data"],
        requiresParentReview: true,
      },
      {
        id: "tal-ingestion-freshness",
        parentSeatId: "tal",
        name: "Ingestion Freshness Subagent",
        purpose: "Check and report on data ingestion freshness against staleness thresholds",
        authorityTier: 1,
        allowedInputs: ["ingestion timestamps", "freshness thresholds"],
        allowedOutputs: ["freshness report draft"],
        prohibitedActions: ["Trigger ingestion jobs autonomously"],
        requiresParentReview: true,
      },
      {
        id: "tal-failed-test-summarizer",
        parentSeatId: "tal",
        name: "Failed Test Summarizer",
        purpose: "Summarize failing CI tests with root-cause hypotheses for operator review",
        authorityTier: 1,
        allowedInputs: ["CI test output", "test file contents"],
        allowedOutputs: ["test failure summary draft"],
        prohibitedActions: ["Merge code", "Disable tests"],
        requiresParentReview: true,
      },
      {
        id: "tal-adapter-health",
        parentSeatId: "tal",
        name: "Adapter Health Subagent",
        purpose: "Check health of data adapters (The Odds API, Stripe) and flag anomalies",
        authorityTier: 1,
        allowedInputs: ["adapter response logs", "error rate metrics"],
        allowedOutputs: ["adapter health report draft"],
        prohibitedActions: ["Rotate API keys", "Disable adapters"],
        requiresParentReview: true,
      },
    ],
    handoffsIn: ["SCOUT", "SARAH"],
    handoffsOut: ["METER", "JARVIS"],
    reviewGates: ["jarvis-routing"],
    successMetrics: [
      "Ingestion freshness reported on every cockpit load",
      "Zero schema-drift surprises in production",
    ],
    failureModes: [
      "Worker crash not detected before next cockpit load",
      "Schema drift causes silent data loss",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "sarah",
    codename: "SARAH",
    name: "SARAH",
    displayName: "Sarah",
    role: "Customer Surface Officer",
    status: "DRAFT_ONLY",
    wiringState: "wired",
    department: "Customer Surface & Quality",
    reportsTo: ["JARVIS"],
    escalatesTo: ["JARVIS"],
    authorityTier: 1,
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
    allowedInputs: ["support tickets", "dashboard health metrics", "gate flags"],
    allowedOutputs: ["support reply drafts", "dashboard health reports", "review queue items"],
    prohibitedActions: [
      "Send any external communication without human approval",
      "Expose ungated data to customers",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: false,
    handoffsIn: ["PULSE", "GAUGE"],
    handoffsOut: ["GAUGE", "TAL", "JARVIS"],
    reviewGates: ["human-approval", "jarvis-routing"],
    successMetrics: [
      "All customer-facing content reviewed before display",
      "Support reply queue cleared within SLA",
    ],
    failureModes: [
      "Gated stats displayed to customers before gate opens",
      "Support reply sent without human approval",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "ava",
    codename: "AVA",
    name: "AVA",
    displayName: "Ava",
    role: "Content Officer",
    status: "DRAFT_ONLY",
    wiringState: "wired",
    department: "Customer Surface & Quality",
    reportsTo: ["SARAH"],
    escalatesTo: ["JARVIS"],
    authorityTier: 1,
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
    allowedInputs: ["approved picks", "canonical performance stats", "platform data"],
    allowedOutputs: ["blog post drafts", "newsletter drafts", "short-form copy drafts"],
    prohibitedActions: [
      "Auto-publish any content",
      "Use unverified picks as factual basis",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: true,
    subagentTemplates: [
      {
        id: "ava-newsletter-draft",
        parentSeatId: "ava",
        name: "Newsletter Draft Subagent",
        purpose: "Draft newsletter sections from approved weekly picks and performance data",
        authorityTier: 1,
        allowedInputs: ["approved picks", "settled results", "gate-approved stats"],
        allowedOutputs: ["newsletter section draft"],
        prohibitedActions: ["Send newsletter", "Use unverified stats"],
        requiresParentReview: true,
      },
      {
        id: "ava-blog-outline",
        parentSeatId: "ava",
        name: "Blog Outline Subagent",
        purpose: "Create structured blog post outlines from platform data for operator review",
        authorityTier: 1,
        allowedInputs: ["approved picks", "track record data"],
        allowedOutputs: ["blog outline draft"],
        prohibitedActions: ["Publish blog content", "Fabricate statistics"],
        requiresParentReview: true,
      },
      {
        id: "ava-short-form-copy",
        parentSeatId: "ava",
        name: "Short-Form Copy Subagent",
        purpose: "Draft short-form copy (social cards, CTAs) from approved picks for human review",
        authorityTier: 1,
        allowedInputs: ["approved picks", "brand voice rules"],
        allowedOutputs: ["short-form copy draft"],
        prohibitedActions: ["Post to social channels", "Use performance claims before displaySafe"],
        requiresParentReview: true,
      },
    ],
    handoffsIn: [],
    handoffsOut: ["QUILL", "JARVIS"],
    reviewGates: ["human-approval", "jarvis-routing"],
    successMetrics: [
      "All content drafts grounded in approved data sources",
      "Zero bootstrap picks presented as proven results",
    ],
    failureModes: [
      "Draft uses pending picks as settled results",
      "Content published without human review",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "bobby",
    codename: "BOBBY",
    name: "BOBBY",
    displayName: "Bobby",
    role: "Revenue Analyst",
    status: "DRAFT_ONLY",
    wiringState: "wired",
    department: "Growth, Community & Finance",
    reportsTo: ["JARVIS"],
    escalatesTo: ["JARVIS"],
    authorityTier: 1,
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
    allowedInputs: ["Stripe subscription data", "funnel metrics", "analytics snapshots"],
    allowedOutputs: ["revenue observation drafts", "churn flag items", "funnel reports"],
    prohibitedActions: [
      "Change any pricing or subscription configuration",
      "Claim CLV accuracy without validated instrumentation",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: false,
    handoffsIn: ["FLARE", "VECTOR"],
    handoffsOut: ["MINT", "QUILL", "JARVIS"],
    reviewGates: ["jarvis-routing", "owner-approval"],
    successMetrics: [
      "Churn signals surface before loss occurs",
      "Revenue observations reach owner decision queue",
    ],
    failureModes: [
      "Stripe webhook failure causes stale subscription state",
      "CLV claimed without instrumentation",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  // ── Designed seats — work exists but is human-run (MANUAL) ────────────────

  {
    id: "settlement-officer",
    codename: "LEDGER",
    name: "LEDGER",
    displayName: "Settlement Officer",
    role: "Settlement & Results Officer",
    status: "MANUAL",
    wiringState: "manual",
    department: "Results & Calibration",
    reportsTo: ["AUDIT"],
    escalatesTo: ["JARVIS"],
    authorityTier: 2,
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
    allowedInputs: ["verified game outcomes", "pending pick ledger"],
    allowedOutputs: ["settled pick records", "win/loss ledger updates", "settlement reports"],
    prohibitedActions: [
      "Settle picks without a verified external score source",
      "Include pending picks in win-rate calculations",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["AUDIT", "JARVIS"],
    reviewGates: ["manual-run", "audit-review"],
    successMetrics: [
      "All pending picks settled within 24h of game end",
      "Win/loss ledger matches verified external results",
    ],
    failureModes: [
      "Settlement delayed due to missing external score source",
      "Incorrect game outcome used for settlement",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "performance-auditor",
    codename: "AUDIT",
    name: "AUDIT",
    displayName: "Performance Auditor",
    role: "Performance & Calibration Auditor",
    status: "MANUAL",
    wiringState: "manual",
    department: "Results & Calibration",
    reportsTo: ["JARVIS", "Owner"],
    escalatesTo: ["Owner"],
    authorityTier: 2,
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
    allowedInputs: ["canonical settled picks", "calibration thresholds", "display gate flags"],
    allowedOutputs: ["calibration reports", "display-safety verdicts", "audit findings"],
    prohibitedActions: [
      "Show performance stats before sample-size threshold is met",
      "Auto-adjust prediction model weights",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: false,
    handoffsIn: ["LEDGER", "ASCEND"],
    handoffsOut: ["JARVIS"],
    reviewGates: ["owner-approval", "sample-size-gate"],
    successMetrics: [
      "Display-safety gate correctly enforced at all times",
      "Calibration reviewed before any public performance claim",
    ],
    failureModes: [
      "Stats displayed before sample-size gate met",
      "Calibration drift undetected without regular review",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "ai-ops-officer",
    codename: "METER",
    name: "METER",
    displayName: "AI Ops Officer",
    role: "AI Ops & Token Discipline Officer",
    status: "MANUAL",
    wiringState: "manual",
    department: "Command & Governance",
    reportsTo: ["JARVIS"],
    escalatesTo: ["Owner"],
    authorityTier: 2,
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
    allowedInputs: ["ccusage output", "model lane policy", "API cost data"],
    allowedOutputs: ["token spend reports", "model lane violations", "observability gap flags"],
    prohibitedActions: [
      "Report token counts without verified instrumentation",
      "Claim observability tools are wired before integration",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "read_confirmed",
    canSpawnSubagents: false,
    handoffsIn: ["TAL", "CHAIN", "RELAY"],
    handoffsOut: ["JARVIS", "Owner"],
    reviewGates: ["owner-approval"],
    successMetrics: [
      "Token spend within budget on every daily check",
      "Model lane policy violations caught before scaling",
    ],
    failureModes: [
      "Token spend exceeds budget before ccusage check runs",
      "Model lane policy violated in production",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  // ── Designed seats — capability not wired yet (NOT_WIRED) ─────────────────

  {
    id: "market-analyst",
    codename: "DELTA",
    name: "DELTA",
    displayName: "Market Analyst",
    role: "Market / Line Intelligence Analyst",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Sports Intelligence",
    reportsTo: ["SCOUT"],
    escalatesTo: ["SCOUT", "JARVIS"],
    authorityTier: 0,
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
    allowedInputs: ["ingested odds snapshots"],
    allowedOutputs: ["line movement annotations (when wired)"],
    prohibitedActions: [
      "Claim CLV tracking without instrumentation",
      "Generate market signals before capability is built",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: ["SCOUT"],
    handoffsOut: ["TAL", "JARVIS"],
    reviewGates: ["jarvis-routing"],
    successMetrics: [
      "CLV tracked on every settled pick once wired",
      "Line movement alerts surface within one ingestion cycle",
    ],
    failureModes: [
      "CLV claimed before instrumentation built",
      "Market layer built on stale odds data",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "memory-librarian",
    codename: "ARCHIVE",
    name: "ARCHIVE",
    displayName: "Memory Librarian",
    role: "Memory & Knowledge Base Librarian",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Command & Governance",
    reportsTo: ["JARVIS"],
    escalatesTo: ["JARVIS"],
    authorityTier: 0,
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
    allowedInputs: ["operator decisions", "analysis outcomes", "session context"],
    allowedOutputs: ["memory candidates (when wired)", "protocol documentation"],
    prohibitedActions: [
      "Claim cross-session memory before store is wired",
      "Fabricate recalled context",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "write_candidate",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["JARVIS"],
    reviewGates: ["jarvis-routing", "owner-approval-if-sensitive"],
    successMetrics: [
      "Memory candidates correctly classified before confirmation",
      "Zero fabricated recall events",
    ],
    failureModes: [
      "Memory claimed before store is wired",
      "Sensitive context persisted without owner approval",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "tool-router",
    codename: "RELAY",
    name: "RELAY",
    displayName: "Tool Router",
    role: "Tool Router / MCP Gateway",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Data & Automation Platform",
    reportsTo: ["TAL"],
    escalatesTo: ["Owner"],
    authorityTier: 0,
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
    allowedInputs: ["tool call requests", "approved tool registry"],
    allowedOutputs: ["routed tool calls (when wired)", "tool registry documentation"],
    prohibitedActions: [
      "Route calls through unapproved tools",
      "Bypass rate limits or logging",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["PILOT", "Owner"],
    reviewGates: ["owner-approval"],
    successMetrics: [
      "Every tool call logged with requester and outcome",
      "Zero unapproved tool connections",
    ],
    failureModes: [
      "Unregistered tool connection allowed",
      "Rate limit bypass causes API cost overrun",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "browser-operator",
    codename: "PILOT",
    name: "PILOT",
    displayName: "Browser Operator",
    role: "Browser / Computer Control Operator",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Data & Automation Platform",
    reportsTo: ["RELAY"],
    escalatesTo: ["Owner"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Perform sandboxed browser actions (navigate, scrape, screenshot) only on " +
      "pre-approved domains under strict human oversight.",
    currentTruth:
      "Seat is designed only. No browser automation layer exists in this repo.",
    ownsCapabilities: ["browser-computer-control"],
    safeActions: [
      "Document the approved-domain sandbox design",
    ],
    forbiddenActions: [
      "Execute any browser action: capability is not wired",
      "Store credentials in automation scripts",
    ],
    allowedInputs: ["owner-approved domain list", "scraping clearance results"],
    allowedOutputs: ["screenshots", "scrape artifacts (when wired, on approved domains only)"],
    prohibitedActions: [
      "Execute browser actions on unapproved domains",
      "Bypass scraping clearance engine",
      "Store credentials in scripts",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: ["RELAY"],
    handoffsOut: ["Owner"],
    reviewGates: ["owner-approval", "domain-allowlist-check"],
    successMetrics: [
      "Every browser action logged with domain and outcome",
      "Zero actions on unapproved domains",
    ],
    failureModes: [
      "Browser action executes on unapproved domain",
      "Credentials stored insecurely in automation scripts",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "voice-operator",
    codename: "ECHO",
    name: "ECHO",
    displayName: "Voice Operator",
    role: "Voice Interface Operator",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Data & Automation Platform",
    reportsTo: ["RELAY"],
    escalatesTo: ["JARVIS"],
    authorityTier: 0,
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
    allowedInputs: ["voice input (when wired)", "Ask Jarvis intent registry"],
    allowedOutputs: ["transcribed queries", "spoken Ask Jarvis answers (when wired)"],
    prohibitedActions: [
      "Execute system actions from voice without text confirmation",
      "Record audio without explicit operator awareness",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["JARVIS"],
    reviewGates: ["jarvis-routing"],
    successMetrics: [
      "Voice queries correctly routed to Ask Jarvis intents",
      "Full audit trail on every voice interaction",
    ],
    failureModes: [
      "Voice action executes without text confirmation",
      "Audio recorded without operator awareness",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "workflow-coordinator",
    codename: "CHAIN",
    name: "CHAIN",
    displayName: "Workflow Coordinator",
    role: "Workflow Automation Coordinator",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Data & Automation Platform",
    reportsTo: ["TAL"],
    escalatesTo: ["Owner"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Chain operator workflows (ingestion → scoring → routing → content draft → settlement) " +
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
    allowedInputs: ["BullMQ job status", "workflow trigger signals"],
    allowedOutputs: ["workflow progress reports", "checkpoint pause notifications"],
    prohibitedActions: [
      "Bypass any human checkpoint gate",
      "Auto-publish or auto-post in any workflow",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["METER", "JARVIS"],
    reviewGates: ["owner-approval", "every-human-checkpoint"],
    successMetrics: [
      "Every workflow pauses at human gates",
      "Zero workflows bypass approval steps",
    ],
    failureModes: [
      "Workflow runs past a human gate without approval",
      "Auto-publish triggered by workflow automation",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  // ── Org-design expansion — designed, NOT_WIRED ────────────────────────────

  {
    id: "quality-officer",
    codename: "GAUGE",
    name: "GAUGE",
    displayName: "Quality Officer",
    role: "Quality Assurance Department Head",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Customer Surface & Quality",
    reportsTo: ["SARAH"],
    escalatesTo: ["JARVIS"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Own output quality across every public surface: copy, numbers, layout, and claims. " +
      "Run regression review on each release and grade departments on defect rate.",
    currentTruth:
      "Seat is designed only. Quality lives in the test suites and doctrine docs; no seat " +
      "synthesizes a quality report yet.",
    ownsCapabilities: [],
    safeActions: ["Document quality bars per surface from existing doctrine and tests"],
    forbiddenActions: [
      "Approve its own department's output",
      "Lower a quality bar without owner sign-off",
    ],
    allowedInputs: ["draft content", "pick annotations", "layout snapshots", "test results"],
    allowedOutputs: ["quality audit reports", "defect flags", "claims-QA verdicts"],
    prohibitedActions: [
      "Self-approve output from its own department",
      "Lower quality thresholds without owner sign-off",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: true,
    subagentTemplates: [
      {
        id: "gauge-claims-qa",
        parentSeatId: "quality-officer",
        name: "Claims QA Subagent",
        purpose: "Audit factual claims in drafts against verified data sources",
        authorityTier: 0,
        allowedInputs: ["draft content", "verified data sources"],
        allowedOutputs: ["claims audit report"],
        prohibitedActions: ["Approve claims", "Modify source data"],
        requiresParentReview: true,
      },
      {
        id: "gauge-layout-qa",
        parentSeatId: "quality-officer",
        name: "Layout QA Subagent",
        purpose: "Check layout and visual rendering correctness across screen sizes",
        authorityTier: 0,
        allowedInputs: ["layout snapshots", "design spec"],
        allowedOutputs: ["layout audit report"],
        prohibitedActions: ["Modify layout files", "Approve layout for production"],
        requiresParentReview: true,
      },
      {
        id: "gauge-number-consistency",
        parentSeatId: "quality-officer",
        name: "Number Consistency Subagent",
        purpose: "Verify numerical consistency across all surfaces (stats, picks, performance)",
        authorityTier: 0,
        allowedInputs: ["pick data", "performance stats", "published content"],
        allowedOutputs: ["number consistency audit report"],
        prohibitedActions: ["Modify source numbers", "Approve stats for display"],
        requiresParentReview: true,
      },
      {
        id: "gauge-broken-link",
        parentSeatId: "quality-officer",
        name: "Broken Link Subagent",
        purpose: "Detect broken links across the public-facing site surfaces",
        authorityTier: 0,
        allowedInputs: ["published page URLs", "internal link registry"],
        allowedOutputs: ["broken link report"],
        prohibitedActions: ["Auto-fix broken links", "Redirect URLs without approval"],
        requiresParentReview: true,
      },
    ],
    handoffsIn: ["AVA", "QUILL", "SARAH", "FLARE", "PULSE"],
    handoffsOut: ["JARVIS"],
    reviewGates: ["jarvis-routing"],
    successMetrics: [
      "All public drafts pass claims QA before human review",
      "Defect rate tracked per department per release",
    ],
    failureModes: [
      "Incorrect claim in public content approved without QA",
      "Layout regression shipped without detection",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "voice-humanizer",
    codename: "QUILL",
    name: "QUILL",
    displayName: "Voice Humanizer",
    role: "Brand Voice & Humanizer Department Head",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Customer Surface & Quality",
    reportsTo: ["SARAH"],
    escalatesTo: ["Owner"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Make every public word sound like Beex / we-at-GSN wrote it: first-person plural, " +
      "no tool language, no 'AI' on public surfaces. Owns the we-voice rewrite pass.",
    currentTruth:
      "Voice rules are codified (doctrine §10.5) and enforced mechanically in the Beex Weekly " +
      "generator; no seat audits the rest of the site's voice yet.",
    ownsCapabilities: [],
    safeActions: ["Apply the codified we-voice rules to draft copy for owner review"],
    forbiddenActions: [
      "Remove a legally required disclosure while rewording",
      "Fabricate first-person experiences that did not happen",
    ],
    allowedInputs: ["draft copy", "brand voice rules", "doctrine §10.5"],
    allowedOutputs: ["voice-rewritten copy drafts"],
    prohibitedActions: [
      "Remove legal disclosures during rewrite",
      "Fabricate first-person experiences",
      "Publish rewritten copy without human approval",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: ["AVA", "FLARE", "BOBBY"],
    handoffsOut: ["GAUGE", "JARVIS"],
    reviewGates: ["owner-approval", "jarvis-routing"],
    successMetrics: [
      "All public copy passes voice audit before human review",
      "Zero AI language or tool language on public surfaces",
    ],
    failureModes: [
      "AI language surfaces on public pages",
      "Legal disclosure removed during rewrite",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "growth-marketer",
    codename: "FLARE",
    name: "FLARE",
    displayName: "Growth Marketer",
    role: "Marketing & Customer Sourcing Department Head",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Growth, Community & Finance",
    reportsTo: ["BOBBY"],
    escalatesTo: ["Owner"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Own acquisition: channel strategy, social presence (X, IG, Threads, FB; Telegram, " +
      "WhatsApp, Discord once structure exists), launch sequencing, and conversion copy.",
    currentTruth:
      "Seat is designed only. Social handles are reserved in lib/brand.ts; the marketing " +
      "blueprint exists as a doc; no campaign engine is wired.",
    ownsCapabilities: [],
    safeActions: ["Draft channel plans and campaign briefs for owner review"],
    forbiddenActions: [
      "Post to any external channel",
      "Make performance claims not backed by the graded record",
    ],
    allowedInputs: ["brand guidelines", "pick performance data", "approved content drafts"],
    allowedOutputs: ["channel strategy drafts", "campaign briefs", "conversion copy drafts"],
    prohibitedActions: [
      "Post to any social or external channel",
      "Make performance claims not backed by canonical record",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["BOBBY", "QUILL", "JARVIS"],
    reviewGates: ["owner-approval"],
    successMetrics: [
      "Campaign briefs grounded in approved performance data",
      "Zero posts to external channels without owner approval",
    ],
    failureModes: [
      "Performance claims made before displaySafe is true",
      "Post to external channel without owner approval",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "engagement-officer",
    codename: "PULSE",
    name: "PULSE",
    displayName: "Engagement Officer",
    role: "Community & Engagement Department Head",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Growth, Community & Finance",
    reportsTo: ["BOBBY"],
    escalatesTo: ["Owner"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Own member engagement and the owner's direct-input loop: community structure " +
      "(Discord-first, with the security and bot design done BEFORE launch), feedback " +
      "intake, and retention signals.",
    currentTruth:
      "Seat is designed only. No community platform is stood up; structure-first per the " +
      "owner's direction.",
    ownsCapabilities: [],
    safeActions: ["Design the Discord security/bot/moderation structure on paper"],
    forbiddenActions: [
      "Open a community channel before the security structure is approved",
      "Speak as the brand in any external community",
    ],
    allowedInputs: ["member feedback", "engagement metrics", "community design specs"],
    allowedOutputs: ["community structure designs", "engagement reports", "retention signals"],
    prohibitedActions: [
      "Open any community channel before security structure is approved",
      "Speak as the brand in external communities without owner approval",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["SARAH", "GAUGE", "JARVIS"],
    reviewGates: ["owner-approval"],
    successMetrics: [
      "Community security structure approved before any channel opens",
      "Engagement signals surfaced to owner before churn occurs",
    ],
    failureModes: [
      "Community channel opened before security review",
      "Brand communication in external channel without owner approval",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "forecast-planner",
    codename: "VECTOR",
    name: "VECTOR",
    displayName: "Forecast Planner",
    role: "Analytics, Forecasting & Planning Department Head",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Growth, Community & Finance",
    reportsTo: ["BOBBY"],
    escalatesTo: ["JARVIS"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Own the planning layer: traffic/member/revenue forecasting, capacity planning, and " +
      "the data roadmap that decides which intake lanes get built next.",
    currentTruth:
      "Seat is designed only. Snapshots and metrics exist in the cockpit; no forecasting " +
      "model is built.",
    ownsCapabilities: [],
    safeActions: ["Assemble planning baselines from existing cockpit snapshots"],
    forbiddenActions: ["Present a forecast as a commitment or as public performance"],
    allowedInputs: ["cockpit snapshots", "historical metrics", "subscription data"],
    allowedOutputs: ["forecast drafts", "planning baselines", "intake-lane priority recommendations"],
    prohibitedActions: [
      "Present forecast as a commitment",
      "Use forecast as public performance claim",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: [],
    handoffsOut: ["BOBBY", "MINT", "TAL", "JARVIS"],
    reviewGates: ["jarvis-routing"],
    successMetrics: [
      "Forecasts carry explicit uncertainty ranges",
      "Planning baselines grounded in canonical data",
    ],
    failureModes: [
      "Forecast presented as commitment to stakeholders",
      "Forecast built on bootstrap or unverified data",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "financial-controller",
    codename: "MINT",
    name: "MINT",
    displayName: "Financial Controller",
    role: "Financials Department Head",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Growth, Community & Finance",
    reportsTo: ["BOBBY"],
    escalatesTo: ["Owner"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Own the money view: MRR, founding-tier mix, data-spend budget, token/API cost " +
      "discipline roll-ups, and the pricing-ladder milestone tracker.",
    currentTruth:
      "Seat is designed only. Stripe billing and API budget monitors exist; no unified " +
      "financial view is synthesized.",
    ownsCapabilities: [],
    safeActions: ["Aggregate existing billing and budget data into a draft owner report"],
    forbiddenActions: [
      "Move money or change prices",
      "Trigger a pricing-ladder step without the verified milestone",
    ],
    allowedInputs: ["Stripe billing data", "API cost data", "token spend reports"],
    allowedOutputs: ["financial summary drafts", "MRR reports", "budget vs actuals reports"],
    prohibitedActions: [
      "Move money or change prices",
      "Trigger pricing-ladder step without verified milestone",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: ["BOBBY", "VECTOR"],
    handoffsOut: ["JARVIS", "Owner"],
    reviewGates: ["owner-approval"],
    successMetrics: [
      "MRR view accurate within one billing cycle",
      "Token/API cost roll-ups tracked monthly",
    ],
    failureModes: [
      "Pricing change made without verified milestone",
      "Financial data aggregated from unverified sources",
    ],
    ownerApprovalRequired: true,
    lastRun: null,
  },

  {
    id: "stat-rd-lead",
    codename: "PRISM",
    name: "PRISM",
    displayName: "Stat R&D Lead",
    role: "Advanced Player-Stat Research & Development Head",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Sports Intelligence",
    reportsTo: ["SCOUT"],
    escalatesTo: ["JARVIS"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    charter:
      "Own the research program behind our numbers: new metric design, the math, validation " +
      "against out-of-sample results, and the roadmap for growing proprietary data.",
    currentTruth:
      "Seat is designed only. The predictiveness backtest and graded pool exist as engines; " +
      "no seat runs a continuous research loop over them.",
    ownsCapabilities: [],
    safeActions: ["Propose new metrics with falsifiable validation plans"],
    forbiddenActions: [
      "Ship a metric that has not passed out-of-sample validation",
      "Present research output as public performance",
    ],
    allowedInputs: ["backtest results", "graded pick pool", "feature proposals"],
    allowedOutputs: ["metric prototypes", "validation reports", "research proposals", "ASCEND task briefs"],
    prohibitedActions: [
      "Ship metrics without out-of-sample validation",
      "Present research as public performance data",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: true,
    subagentTemplates: [
      {
        id: "prism-metric-prototype",
        parentSeatId: "stat-rd-lead",
        name: "Metric Prototype Subagent",
        purpose: "Build a prototype implementation of a proposed new scoring metric for validation",
        authorityTier: 0,
        allowedInputs: ["historical pick data", "metric specification"],
        allowedOutputs: ["metric prototype code draft"],
        prohibitedActions: ["Deploy metric to production", "Alter existing scoring weights"],
        requiresParentReview: true,
      },
      {
        id: "prism-validation-check",
        parentSeatId: "stat-rd-lead",
        name: "Validation Check Subagent",
        purpose: "Run out-of-sample validation on a metric prototype and report results",
        authorityTier: 0,
        allowedInputs: ["metric prototype", "holdout dataset"],
        allowedOutputs: ["validation report"],
        prohibitedActions: ["Approve metric without AUDIT review", "Modify holdout dataset"],
        requiresParentReview: true,
      },
      {
        id: "prism-feature-gap-hunter",
        parentSeatId: "stat-rd-lead",
        name: "Feature Gap Hunter",
        purpose: "Identify underrepresented signals in the current prediction feature set",
        authorityTier: 0,
        allowedInputs: ["current feature set", "model performance data"],
        allowedOutputs: ["feature gap analysis draft"],
        prohibitedActions: ["Add features to production model", "Modify production scoring"],
        requiresParentReview: true,
      },
      {
        id: "prism-ascend-template",
        parentSeatId: "stat-rd-lead",
        name: "ASCEND Standing Subagent Template",
        purpose: "Standing improvement loop: continuously proposes GSE score experiments for PRISM + AUDIT review",
        authorityTier: 0,
        allowedInputs: ["calibration metrics", "backtest results", "feature gap analyses"],
        allowedOutputs: ["scored improvement experiments draft"],
        prohibitedActions: ["Change scoring weights", "Approve own proposals", "Take external action"],
        requiresParentReview: true,
      },
      {
        id: "prism-stat-modeling",
        parentSeatId: "stat-rd-lead",
        name: "Stat Modeling Subagent",
        purpose: "Run exploratory statistical modeling on player/team data for metric research",
        authorityTier: 0,
        allowedInputs: ["player stats", "team data", "historical outcomes"],
        allowedOutputs: ["modeling exploration draft"],
        prohibitedActions: ["Publish modeling results as claims", "Alter production data"],
        requiresParentReview: true,
      },
    ],
    handoffsIn: [],
    handoffsOut: ["ASCEND", "AUDIT", "JARVIS"],
    reviewGates: ["audit-review", "jarvis-routing"],
    successMetrics: [
      "Every shipped metric passed out-of-sample validation",
      "ASCEND proposals reviewed by AUDIT before escalation",
    ],
    failureModes: [
      "Metric shipped without AUDIT validation review",
      "Research output presented as live performance claim",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },

  {
    id: "gse-score-optimizer",
    codename: "ASCEND",
    name: "ASCEND",
    displayName: "GSE Score Optimizer",
    role: "GSE Rating Improvement Subagent",
    status: "NOT_WIRED",
    wiringState: "not_connected",
    department: "Sports Intelligence",
    reportsTo: ["PRISM"],
    reviewedBy: ["AUDIT"],
    escalatesTo: ["PRISM", "AUDIT", "JARVIS"],
    authorityTier: 0,
    isRegisteredCockpitAgent: false,
    standingSubagent: true,
    charter:
      "The standing subagent that is constantly looking to better the GSE score: monitor " +
      "calibration drift, hunt feature gaps, and propose scored experiments to its " +
      "department head.",
    currentTruth:
      "Seat is designed only. Calibration and backtest engines exist to measure against; " +
      "no improvement loop runs.",
    ownsCapabilities: [],
    safeActions: ["Rank improvement hypotheses by expected calibration gain"],
    forbiddenActions: [
      "Change scoring weights without validation and owner sign-off",
      "Optimize for win-rate optics over calibration honesty",
    ],
    allowedInputs: ["calibration metrics", "backtest results", "feature gap analyses", "PRISM task briefs"],
    allowedOutputs: ["improvement experiment proposals (draft only)"],
    prohibitedActions: [
      "Change scoring weights without AUDIT validation and owner sign-off",
      "Optimize for win-rate optics over calibration honesty",
      "Approve own proposals",
    ],
    externalActions: "NONE",
    externalActionsAllowed: false,
    memoryAccess: "none",
    canSpawnSubagents: false,
    handoffsIn: ["PRISM"],
    handoffsOut: ["AUDIT", "JARVIS"],
    reviewGates: ["audit-review", "prism-review", "owner-approval-if-scoring-change"],
    successMetrics: [
      "Improvement proposals carry evidence and uncertainty estimates",
      "Zero scoring changes applied without AUDIT + owner approval",
    ],
    failureModes: [
      "Scoring weight changed without validation",
      "Win-rate optics optimized instead of calibration accuracy",
    ],
    ownerApprovalRequired: false,
    lastRun: null,
  },
];

// ─── Department grouping ──────────────────────────────────────────────────────

/** Returns seats grouped by department name. */
export function getCouncilByDepartment(): ReadonlyMap<string, readonly AgentSeat[]> {
  const map = new Map<string, AgentSeat[]>();
  for (const seat of AGENT_COUNCIL) {
    const dept = seat.department;
    if (!map.has(dept)) map.set(dept, []);
    map.get(dept)!.push(seat);
  }
  return map as ReadonlyMap<string, readonly AgentSeat[]>;
}

// ─── Department heads & reporting hierarchy ───────────────────────────────────

/**
 * Exactly one department head per department. The head is the senior WIRED /
 * registered operational seat (honesty doctrine: the head is the one actually
 * running the function), except Results & Calibration which has no registered
 * agent and is headed by AUDIT, its senior oversight seat.
 *
 * The reporting law is: every seat → its department head → JARVIS → Owner.
 * Heads report to JARVIS; JARVIS reports to the Owner. A few seats report to a
 * sub-lead beneath the head (DELTA/PRISM→SCOUT, ASCEND→PRISM, PILOT/ECHO→RELAY)
 * — the chain still resolves up through the head. AUDIT also escalates to the
 * Owner directly to preserve audit independence.
 */
export const DEPARTMENT_HEADS: Readonly<Record<string, string>> = {
  "Command & Governance": "JARVIS",
  "Sports Intelligence": "SCOUT",
  "Data & Automation Platform": "TAL",
  "Customer Surface & Quality": "SARAH",
  "Growth, Community & Finance": "BOBBY",
  "Results & Calibration": "AUDIT",
};

/** The seat that heads a department, or undefined for an unknown department. */
export function getDepartmentHead(department: string): AgentSeat | undefined {
  const codename = DEPARTMENT_HEADS[department];
  return codename ? AGENT_COUNCIL.find((m) => m.codename === codename) : undefined;
}

/** All department-head seats, in department order. */
export function getDepartmentHeads(): readonly AgentSeat[] {
  return Object.values(DEPARTMENT_HEADS)
    .map((codename) => AGENT_COUNCIL.find((m) => m.codename === codename))
    .filter((m): m is AgentSeat => m !== undefined);
}

/** True when this seat is the head of its department. */
export function isDepartmentHead(seat: AgentSeat): boolean {
  return DEPARTMENT_HEADS[seat.department] === seat.codename;
}

/** Direct reports of a seat (by codename): seats whose primary manager is it. */
export function getDirectReports(codename: string): readonly AgentSeat[] {
  return AGENT_COUNCIL.filter((m) => m.reportsTo[0] === codename);
}

/**
 * The escalation chain from a seat up to the Owner, by codename. Follows the
 * primary reportsTo link at each step, guards against cycles, and terminates at
 * "Owner" for a well-formed roster.
 */
export function getReportingChain(seatId: string): readonly string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = AGENT_COUNCIL.find((m) => m.id === seatId);
  while (current && !seen.has(current.codename)) {
    seen.add(current.codename);
    const next = current.reportsTo[0];
    if (!next) break;
    chain.push(next);
    if (next === "Owner") break;
    current = AGENT_COUNCIL.find((m) => m.codename === next);
  }
  return chain;
}

// ─── Council accessors ────────────────────────────────────────────────────────

// Returns every council seat in roster order.
export function getAgentCouncil(): readonly AgentSeat[] {
  return AGENT_COUNCIL;
}

// Returns one council seat by stable id, or undefined.
export function getCouncilMember(id: string): AgentSeat | undefined {
  return AGENT_COUNCIL.find((m) => m.id === id);
}

// Returns council seats filtered by wiring status.
export function getCouncilByStatus(
  status: CouncilSeatStatus
): readonly AgentSeat[] {
  return AGENT_COUNCIL.filter((m) => m.status === status);
}

// Returns the council seat that owns a given capability id, or undefined.
export function getCapabilityOwner(
  capabilityId: string
): AgentSeat | undefined {
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
  member: AgentSeat
): readonly JarvisCapability[] {
  return member.ownsCapabilities
    .map((id) => getCapability(id))
    .filter((c): c is JarvisCapability => c !== undefined);
}
