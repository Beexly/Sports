import type { AgentTask } from "./agent-task-types";

const now = "2026-06-14T00:00:00.000Z";

export const AGENT_TASK_SEED: readonly AgentTask[] = [
  task("public-picks-gate", "Open public picks only after trust gates pass", "Keep PUBLIC_PICKS_ENABLED closed until data quality, safety, and public-claim gates pass.", "NEEDS_OWNER_APPROVAL", "CRITICAL", "Command & Governance", "jarvis", "Overview", "picks-intelligence", ["PUBLIC_PICKS_ENABLED owner gate"], ["owner"], "Public picks cannot self-enable.", "Review trust gates before any public expansion.", "VALIDATE", true, true),
  task("clv-tracking-foundation", "Prove continuous CLV on Production Neon", "methodTag + continuous CLV archive exist in quote-plane; prove rows on live Neon before any public CLV claims.", "QUEUED", "HIGH", "Sports Intelligence", "delta", "Market Twin", "market-intelligence", ["quote-plane methodTag archive", "gamma free path"], ["claude"], null, "Run gamma + free settle on Production; verify archive + cockpit CLV readouts.", "ANALYZE", true, false),
  task("stale-ingestion-alert", "Route stale ingestion >4h", "Create TAL/JARVIS queue item when source freshness exceeds four hours.", "QUEUED", "HIGH", "Data & Automation Platform", "tal", "Sources", "source-intelligence", ["timestamp-based stale detection exists"], [], null, "Implement deduped stale-data task creation.", "QUEUE", false, false),
  task("score-source-rights-review", "Review score source before auto-settlement", "Auto-settlement needs verified score data source and rights approval.", "BLOCKED_BY_RIGHTS", "HIGH", "Results & Calibration", "ledger", "History", "settlement", ["manual settlement is current truth"], ["owner", "claude"], "No approved external score-data source selected.", "Pick rights-safe score provider and review terms.", "REVIEW", true, true),
  task("canonical-25-pick-threshold", "Accumulate 25 canonical settled picks", "Performance display expansion remains blocked until sample-size policy passes.", "BLOCKED_BY_DATA", "HIGH", "Results & Calibration", "audit", "Calibration", "calibration", ["display-safe policy"], ["owner"], "Insufficient canonical settled sample.", "Measure canonical settled-pick count.", "MEASURE", false, true),
  task("content-review-before-newsletter", "Review content draft queue", "Newsletter expansion requires AVA drafts, GAUGE claim review, SARAH review, and owner approval.", "QUEUED", "MEDIUM", "Customer Surface & Quality", "ava", "Content", "content", ["content is draft-only"], ["owner"], null, "Route drafts through claim/voice review.", "DRAFT", false, true),
  task("subscription-intelligence", "Build Bobby subscription intelligence", "Use real Stripe/funnel data only; missing data is UNKNOWN, not zero.", "QUEUED", "MEDIUM", "Growth, Community & Finance", "bobby", "Promotions", "revenue", ["Stripe designed/wired"], ["claude"], null, "Define churn and tier-migration signals without fake customers.", "ANALYZE", true, false),
  task("api-cost-rollup", "Wire ccusage daily totals", "Build local parser and METER warnings before Langfuse/Helicone.", "QUEUED", "MEDIUM", "Command & Governance", "meter", "API Costs", "daily-intelligence-brief", ["ccusage manual spot checks"], [], null, "Parse local daily totals and route threshold warnings.", "MEASURE", false, false),
  task("memory-candidate-system", "Build Postgres memory candidate/review", "ARCHIVE memory must be review-gated; proposed and approved memories stay separate.", "QUEUED", "HIGH", "Command & Governance", "archive", "Memory", "memory", ["memory is not wired"], ["owner", "claude"], null, "Design candidate/review models before active context use.", "DRAFT", true, true),
  task("tool-governance", "Design RELAY tool bus governance", "No MCP/tool calls until owner-approved tool registry, logs, rate limits, and rights checks exist.", "NEEDS_OWNER_APPROVAL", "CRITICAL", "Data & Automation Platform", "relay", "Sources", "source-intelligence", ["tool router not wired"], ["owner", "claude"], "External tool execution is blocked.", "Draft tool governance and keep browser/voice blocked.", "DRAFT", true, true),
  task("historical-feature-registry", "Connect historical NFL features to projection queue", "Route historical stats, snaps, injuries, identity resolution, and calibration tasks to PRISM/ASCEND/AUDIT.", "QUEUED", "HIGH", "Sports Intelligence", "prism", "Journal", "historical-intelligence", ["historical seasons are settled"], ["audit", "claude"], null, "Register feature experiments with settled-season exclusion rules.", "ANALYZE", true, false),
  task("stat-coverage-auditor", "Build legal stat coverage auditor", "Compare legal available nflverse stats to current ingestion and create PRISM/ASCEND gaps.", "QUEUED", "MEDIUM", "Sports Intelligence", "ascend", "Sources", "historical-intelligence", ["nflverse rights-safe source"], ["claude"], null, "Generate coverage gaps without protected sources.", "MEASURE", true, false),
] as const;

function task(
  id: string,
  title: string,
  description: string,
  status: AgentTask["status"],
  risk: AgentTask["risk"],
  department: AgentTask["department"],
  assignedAgent: string,
  relatedCockpitSurface: string,
  workflowId: string,
  sourceEvidence: readonly string[],
  requiredApprovals: readonly string[],
  blockedReason: string | null,
  nextAction: string,
  safeActionType: AgentTask["safeActionType"],
  claudeReviewRequired: boolean,
  ownerApprovalRequired: boolean,
): AgentTask {
  return { id, title, description, status, priority: risk === "CRITICAL" ? "P0" : risk === "HIGH" ? "P1" : risk === "MEDIUM" ? "P2" : "P3", risk, department, assignedAgent, spawnedBy: "codex-agent-os-max-v3", relatedCockpitSurface, workflowId, sourceEvidence, requiredApprovals, blockedReason, cadence: "operator-review", createdAt: now, updatedAt: now, completedAt: null, claudeReviewRequired, ownerApprovalRequired, artifactLinks: [], nextAction, safeActionType };
}
