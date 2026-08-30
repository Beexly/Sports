import type { SafeAutomationLevel, WorkflowStatus } from "./workflow-status";

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly status: WorkflowStatus;
  readonly trigger: string;
  readonly stages: readonly string[];
  readonly owningAgent: string;
  readonly participatingAgents: readonly string[];
  readonly inputSignals: readonly string[];
  readonly outputArtifacts: readonly string[];
  readonly gates: readonly string[];
  readonly blockedStates: readonly string[];
  readonly cockpitSurface: string;
  readonly safeAutomationLevel: SafeAutomationLevel;
  readonly ownerApprovalRules: readonly string[];
  readonly claudeReviewRules: readonly string[];
  readonly failureMode: string;
  readonly nextAction: string;
}

export const WORKFLOW_REGISTRY: readonly WorkflowDefinition[] = [
  workflow("daily-intelligence-brief", "Daily Intelligence Brief", "DRAFT_ONLY", "cockpit-load or operator request", ["ingestion status", "today slate", "stale check", "rights check", "risk warning", "owner summary"], "jarvis", ["tal", "scout"], "Daily Brief", "DRAFT_AND_ROUTE", [], ["new signal types"], "Queue stale/rights warnings before owner summary."),
  workflow("picks-intelligence", "Picks Intelligence Workflow", "DRAFT_ONLY", "odds refresh", ["odds ingestion", "data reliability", "prediction scoring", "no-bet check", "public-claim gate", "internal ledger", "review queue"], "scout", ["tal", "audit", "jarvis"], "Tasks", "DRAFT_AND_ROUTE", ["public-picks-enable"], ["scoring changes"], "Keep public picks disabled without owner gate."),
  workflow("market-intelligence", "Market Intelligence Workflow", "DESIGNED", "odds snapshot", ["opening line", "current line", "movement delta", "clv candidate", "DELTA task"], "delta", ["tal", "jarvis"], "Market Twin", "OBSERVE_ONLY", ["market claims"], ["threshold tuning"], "No sharp/public label without source proof."),
  workflow("settlement", "Settlement Workflow", "MANUAL", "verified result candidate", ["score source check", "settlement candidate", "LEDGER review", "canonical ledger", "AUDIT queue"], "ledger", ["audit"], "History", "MANUAL_REVIEW", ["auto-settlement"], ["score-source integration"], "Manual until score source rights are approved."),
  workflow("calibration", "Calibration Workflow", "MANUAL", "settled pick update", ["settled picks", "sample-size check", "Brier/ECE", "bucket report", "display-safe policy", "owner decision"], "audit", ["prism", "jarvis"], "Calibration", "MANUAL_REVIEW", ["public performance display", "model-weight change"], ["calibration methodology"], "Never change weights automatically."),
  workflow("historical-intelligence", "Historical Intelligence Workflow", "PARTIAL", "historical data load", ["source clearance", "season load", "identity resolution", "feature generation", "backtest candidate", "AUDIT review", "2026 projection queue"], "prism", ["ascend", "audit", "ledger", "scout", "vector"], "Journal", "DRAFT_AND_ROUTE", ["projection publication", "weight changes"], ["identity resolver"], "Exclude current/future unsettled seasons."),
  workflow("content", "Content Workflow", "DRAFT_ONLY", "approved platform data", ["AVA draft", "QUILL pass", "GAUGE claim check", "SARAH review", "owner approval"], "ava", ["quill", "gauge", "sarah"], "Content", "DRAFT_AND_ROUTE", ["publish", "newsletter send"], ["claim policy"], "No auto-publish."),
  workflow("revenue", "Revenue Workflow", "DESIGNED", "Stripe/funnel signal", ["BOBBY analysis", "MINT finance", "FLARE promotion task", "owner approval"], "bobby", ["mint", "flare"], "Promotions", "DRAFT_AND_ROUTE", ["promotion launch", "external send"], ["finance data quality"], "Unknown revenue stays unknown."),
  workflow("support-trust", "Support/Trust Workflow", "DRAFT_ONLY", "customer/support signal", ["SARAH triage", "PULSE friction", "GAUGE defect", "owner review"], "sarah", ["pulse", "gauge"], "Review", "DRAFT_AND_ROUTE", ["customer external reply"], ["support policy"], "No fake support complaints."),
  workflow("memory", "Memory Workflow", "DESIGNED", "owner decision or sprint outcome", ["candidate", "review queue", "approval", "active memory"], "archive", ["jarvis"], "Memory", "DRAFT_AND_ROUTE", ["approve memory"], ["memory schema"], "Candidate is never automatically approved."),
  workflow("claude-handoff", "Claude Handoff Workflow", "DRAFT_ONLY", "completed sprint", ["files changed", "tests", "blockers", "claims", "weaknesses", "review prompt"], "jarvis", ["tal"], "Review", "DRAFT_AND_ROUTE", [], ["major architecture"], "Truthful handoff over vanity status."),
  workflow("source-intelligence", "Source Intelligence Workflow", "DRAFT_ONLY", "source registry change", ["rights check", "freshness check", "reliability score", "TAL task", "JARVIS warning"], "tal", ["jarvis", "relay"], "Sources", "DRAFT_AND_ROUTE", ["new paid/protected source"], ["source terms"], "Protected-source block stops workflow."),
  workflow("airwave-claim", "Airwave / Pundit Claim Workflow", "MANUAL", "manual claim entry", ["source/proof tagging", "SCOUT analysis", "GAUGE review", "AVA draft candidate"], "scout", ["gauge", "ava"], "Airwave", "MANUAL_REVIEW", ["external transcript use"], ["claim evidence"], "Manual entry only."),
  workflow("film-room", "Film Room Workflow", "DESIGNED", "visual idea", ["rights check", "spend gate", "asset draft", "owner approval"], "ava", ["gauge", "sarah"], "Film Room", "DRAFT_AND_ROUTE", ["spend", "publish asset"], ["rights/spend policy"], "No generation spend without owner gate."),
] as const;

function workflow(id: string, name: string, status: WorkflowStatus, trigger: string, stages: readonly string[], owningAgent: string, participatingAgents: readonly string[], cockpitSurface: string, safeAutomationLevel: SafeAutomationLevel, ownerApprovalRules: readonly string[], claudeReviewRules: readonly string[], nextAction: string): WorkflowDefinition {
  return {
    id, name, status, trigger, stages, owningAgent, participatingAgents,
    inputSignals: ["task-queue", "source-evidence", "cockpit-state"],
    outputArtifacts: ["agent-task", "review-item", "owner-summary-item"],
    gates: ["owner-approval", "source-rights", "public-claims"],
    blockedStates: ["BLOCKED_BY_RIGHTS", "BLOCKED_BY_DATA", "BLOCKED_BY_INFRA"],
    cockpitSurface, safeAutomationLevel, ownerApprovalRules, claudeReviewRules,
    failureMode: "over-automation or unreviewed external/public action",
    nextAction,
  };
}

export function getWorkflow(workflowId: string): WorkflowDefinition | undefined {
  return WORKFLOW_REGISTRY.find((workflowDefinition) => workflowDefinition.id === workflowId);
}
