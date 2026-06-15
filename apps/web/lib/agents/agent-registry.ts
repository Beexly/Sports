import { FORBIDDEN_EXTERNAL_ACTIONS, type AgentAction } from "./agent-capabilities";
import type { AgentOSDefinition } from "./agent-os";

const draftActions = ["OBSERVE", "ANALYZE", "DRAFT", "ROUTE", "ESCALATE", "SUMMARIZE", "QUEUE", "REPORT"] as const satisfies readonly AgentAction[];
const manualActions = ["OBSERVE", "ANALYZE", "VALIDATE", "REVIEW", "MEASURE", "REPORT"] as const satisfies readonly AgentAction[];
const notWiredActions = ["OBSERVE", "ANALYZE", "QUEUE", "REPORT"] as const satisfies readonly AgentAction[];

export const AGENT_OS_REGISTRY = [
  agent("jarvis", "Jarvis", "Command & Governance", "Chief Intelligence Officer", "DRAFT_ONLY", "PRIMARY", "DRAFT", draftActions, ["Overview", "Tasks"], ["platform-assessment", "routing", "owner-decision"], "Summarize operating state and route work without executing external actions."),
  agent("meter", "Meter", "Command & Governance", "AI Ops & Token Discipline Officer", "MANUAL", "SPECIALIST", "MANUAL_EXECUTION", manualActions, ["API Costs"], ["cost-review", "model-lane-review"], "Review token/API cost posture and queue warnings."),
  agent("archive", "Archive", "Command & Governance", "Memory & Knowledge Base Librarian", "NOT_WIRED", "SPECIALIST", "OBSERVE", notWiredActions, ["Memory"], ["memory-candidate", "memory-review"], "Prepare review-gated memory candidates only."),
  agent("scout", "Scout", "Sports Intelligence", "Picks Desk Analyst", "DRAFT_ONLY", "PRIMARY", "DRAFT", draftActions, ["Daily Brief", "Airwave", "Listener Log"], ["pick-research", "claim-review"], "Draft sports context and signal notes from approved sources."),
  agent("delta", "Delta", "Sports Intelligence", "Market / Line Intelligence Analyst", "NOT_WIRED", "SPECIALIST", "OBSERVE", notWiredActions, ["Market Twin"], ["line-movement", "clv-candidate"], "Track line intelligence only after legal data and thresholds exist."),
  agent("prism", "Prism", "Sports Intelligence", "Advanced Player-Stat R&D Head", "NOT_WIRED", "DEPARTMENT_HEAD", "OBSERVE", notWiredActions, ["Journal"], ["feature-experiment", "projection-feature"], "Design validated feature experiments; cannot change weights."),
  agent("ascend", "Ascend", "Sports Intelligence", "GSE Score Improvement Subagent", "NOT_WIRED", "STANDING_SUBAGENT", "OBSERVE", notWiredActions, ["Calibration"], ["calibration-drift", "feature-gap"], "Flag model-improvement opportunities for PRISM/AUDIT review."),
  agent("tal", "Tal", "Data & Automation Platform", "Data Reliability Engineer", "DRAFT_ONLY", "PRIMARY", "DRAFT", draftActions, ["Sources", "Synthetic Monitoring"], ["freshness-audit", "source-rights", "schema-drift"], "Detect data reliability risks and queue safe remediation tasks."),
  agent("relay", "Relay", "Data & Automation Platform", "Tool Router / MCP Gateway", "NOT_WIRED", "SPECIALIST", "OBSERVE", notWiredActions, ["Sources"], ["tool-governance"], "Keep tool governance blocked until owner-approved controls exist."),
  agent("pilot", "Pilot", "Data & Automation Platform", "Browser / Computer Control Operator", "NOT_WIRED", "SPECIALIST", "OBSERVE", notWiredActions, ["Review"], ["browser-control-request"], "Remain blocked until RELAY/tool bus and domain allowlist exist."),
  agent("echo", "Echo", "Data & Automation Platform", "Voice Interface Operator", "NOT_WIRED", "SPECIALIST", "OBSERVE", notWiredActions, ["Review"], ["voice-control-request"], "Remain blocked until Ask Jarvis and audit trail exist."),
  agent("chain", "Chain", "Data & Automation Platform", "Workflow Automation Coordinator", "NOT_WIRED", "SPECIALIST", "ROUTE", ["OBSERVE", "VALIDATE", "ROUTE", "ESCALATE", "QUEUE", "REPORT"], ["Tasks"], ["workflow-routing"], "Coordinate governed workflows without skipping approval gates."),
  agent("sarah", "Sarah", "Customer Surface & Quality", "Customer Surface Officer", "DRAFT_ONLY", "PRIMARY", "DRAFT", draftActions, ["Review"], ["customer-surface-review", "support-triage"], "Draft customer trust and support review items."),
  agent("ava", "Ava", "Customer Surface & Quality", "Content Officer", "DRAFT_ONLY", "PRIMARY", "DRAFT", draftActions, ["Media", "Content", "Bot Outbox", "Studio", "Film Room"], ["content-draft", "asset-draft"], "Draft content only; never publish."),
  agent("gauge", "Gauge", "Customer Surface & Quality", "Quality Assurance Department Head", "NOT_WIRED", "DEPARTMENT_HEAD", "OBSERVE", notWiredActions, ["Review"], ["claim-check", "defect-review"], "Review quality, claims, and regressions."),
  agent("quill", "Quill", "Customer Surface & Quality", "Brand Voice & Humanizer", "NOT_WIRED", "SPECIALIST", "OBSERVE", notWiredActions, ["Media"], ["voice-pass"], "Prepare voice review tasks without publishing."),
  agent("bobby", "Bobby", "Growth, Community & Finance", "Revenue Analyst", "DRAFT_ONLY", "PRIMARY", "DRAFT", draftActions, ["Promotions", "Promo Desk"], ["subscription-intelligence", "promotion-review"], "Analyze revenue signals without inventing customers or revenue."),
  agent("flare", "Flare", "Growth, Community & Finance", "Marketing & Customer Sourcing Head", "NOT_WIRED", "DEPARTMENT_HEAD", "OBSERVE", notWiredActions, ["Bot Outbox", "Promo Desk"], ["campaign-draft"], "Queue acquisition tasks; no external sends."),
  agent("pulse", "Pulse", "Growth, Community & Finance", "Community & Engagement Head", "NOT_WIRED", "DEPARTMENT_HEAD", "OBSERVE", notWiredActions, ["Moderation"], ["community-health", "friction-signal"], "Surface engagement and moderation tasks."),
  agent("vector", "Vector", "Growth, Community & Finance", "Analytics, Forecasting & Planning Head", "NOT_WIRED", "DEPARTMENT_HEAD", "OBSERVE", notWiredActions, ["Dashboard"], ["roadmap-forecast"], "Forecast roadmap and capacity from real data only."),
  agent("mint", "Mint", "Growth, Community & Finance", "Financials Department Head", "NOT_WIRED", "DEPARTMENT_HEAD", "OBSERVE", notWiredActions, ["API Costs"], ["finance-summary"], "Summarize finance posture from real Stripe/cost inputs only."),
  agent("ledger", "Ledger", "Results & Calibration", "Settlement & Results Officer", "MANUAL", "SPECIALIST", "MANUAL_EXECUTION", manualActions, ["History", "Losses"], ["settlement-review", "canonical-ledger"], "Manual verified settlement and ledger review."),
  agent("audit", "Audit", "Results & Calibration", "Performance & Calibration Auditor", "MANUAL", "SPECIALIST", "MANUAL_EXECUTION", manualActions, ["Calibration", "Journal", "Losses"], ["calibration-report", "display-safety"], "Audit calibration and block unsafe performance claims."),
] as const satisfies readonly AgentOSDefinition[];

function agent(
  id: AgentOSDefinition["id"],
  displayName: AgentOSDefinition["displayName"],
  department: AgentOSDefinition["department"],
  role: AgentOSDefinition["role"],
  status: AgentOSDefinition["status"],
  tier: AgentOSDefinition["tier"],
  authorityLevel: AgentOSDefinition["authorityLevel"],
  allowedActions: readonly AgentAction[],
  cockpitSurfacesOwned: readonly string[],
  taskTypesOwned: readonly string[],
  mission: AgentOSDefinition["mission"],
): AgentOSDefinition {
  const scoringSensitive = id === "prism" || id === "ascend" || id === "audit";
  const blockedTooling = id === "pilot" || id === "echo" || id === "relay";
  return {
    id, displayName, department, role, status, tier, mission, authorityLevel, allowedActions,
    forbiddenActions: FORBIDDEN_EXTERNAL_ACTIONS,
    canSpawnSubagents: id === "jarvis" || id === "prism",
    reportsTo: id === "jarvis" ? ["owner"] : ["jarvis"],
    escalatesTo: ["jarvis", "owner"],
    ownerApprovalRequired: status !== "REAL" || scoringSensitive || blockedTooling,
    claudeReviewRequired: scoringSensitive || status === "NOT_WIRED",
    externalActionsAllowed: false,
    toolsAvailable: [],
    cockpitSurfacesOwned,
    taskTypesOwned,
    inputSignals: ["cockpit-state", "task-queue", "source-evidence"],
    outputArtifacts: ["review-task", "handoff-note", "owner-summary-item"],
    cadence: status === "MANUAL" ? "human-triggered" : "on-cockpit-assessment",
    healthRules: ["truthful-status-label", "no-external-actions", "approval-gates-preserved"],
    riskLevel: scoringSensitive || blockedTooling ? "HIGH" : status === "NOT_WIRED" ? "MEDIUM" : "LOW",
    reviewGates: scoringSensitive ? ["owner-approval", "audit-review", "claude-review"] : ["owner-approval"],
    failureModes: ["stale-inputs", "overstated-capability", "missing-review-gate"],
    implementationStatus: status,
    nextExecutableAction: mission,
  };
}

export function getAgent(agentId: string): AgentOSDefinition | undefined {
  return AGENT_OS_REGISTRY.find((agentDefinition) => agentDefinition.id === agentId);
}

export function assertAgentCanReceiveExecutableTask(agentId: string): boolean {
  const agentDefinition = getAgent(agentId);
  if (!agentDefinition) return false;
  return agentDefinition.status === "REAL" || agentDefinition.status === "PARTIAL";
}
