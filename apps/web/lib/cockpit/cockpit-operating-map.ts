/**
 * Cockpit operating map — the single source of truth that binds every cockpit
 * surface to its owning agent, supporting agents, primary workflow, task types,
 * review gates, risk level, and current implementation status.
 *
 * It turns the cockpit from a menu of pages into an operating surface: each
 * entry declares who owns the page, which governed workflow feeds it, what
 * review gates apply, and the next executable build. Consumed by the Jarvis
 * operating assessment and the Agent OS spine tests; contains no runtime logic.
 */
export interface CockpitOperatingSurface {
  readonly pageName: string;
  readonly route: string;
  readonly owningAgent: string;
  readonly supportingAgents: readonly string[];
  readonly primaryWorkflow: string;
  readonly inputSignals: readonly string[];
  readonly outputArtifact: string;
  readonly taskTypes: readonly string[];
  readonly reviewGates: readonly string[];
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly currentStatus: "DRAFT_ONLY" | "MANUAL" | "DESIGNED" | "NOT_WIRED" | "PARTIAL";
  readonly nextExecutableBuild: string;
  readonly audience: "owner-facing" | "internal" | "public-adjacent" | "future";
  readonly proofSource: string;
  readonly claudeReviewRequired: boolean;
}

export const COCKPIT_OPERATING_MAP: readonly CockpitOperatingSurface[] = [
  surface("Overview", "/cockpit", "jarvis", ["tal", "audit"], "daily-intelligence-brief", "Jarvis launch assessment", ["owner-approval", "public-claims"], "HIGH", "DRAFT_ONLY", "owner-facing"),
  surface("History", "/cockpit/history", "ledger", ["audit"], "settlement", "Pick forensic ledger", ["manual-settlement"], "HIGH", "DRAFT_ONLY", "internal"),
  surface("Agents", "/cockpit/agents", "jarvis", ["tal"], "claude-handoff", "Agent council status", ["truthful-status"], "MEDIUM", "DRAFT_ONLY", "internal"),
  surface("Tasks", "/cockpit/tasks", "chain", ["jarvis"], "daily-intelligence-brief", "Queue by status", ["owner-approval"], "HIGH", "DRAFT_ONLY", "owner-facing"),
  surface("Review", "/cockpit/review", "sarah", ["gauge"], "support-trust", "Needs-review + blocked", ["human-review"], "HIGH", "DRAFT_ONLY", "owner-facing"),
  surface("Media", "/cockpit/media", "ava", ["sarah", "quill", "gauge"], "content", "Draft content workflow", ["draft-only", "owner-approval"], "HIGH", "DRAFT_ONLY", "public-adjacent"),
  surface("Promotions", "/cockpit/promotions", "bobby", ["flare", "gauge"], "revenue", "Sportsbook offers", ["affiliate-disclosure", "owner-approval"], "CRITICAL", "DRAFT_ONLY", "public-adjacent"),
  surface("Promo Desk", "/cockpit/promo-desk", "bobby", ["flare"], "revenue", "Operator registry", ["affiliate-disclosure", "owner-approval"], "HIGH", "DRAFT_ONLY", "public-adjacent"),
  surface("Market Twin", "/cockpit/market-twin", "delta", ["scout", "tal"], "market-intelligence", "Upcoming board posture", ["source-rights", "no-sharp-claims"], "HIGH", "DRAFT_ONLY", "internal"),
  surface("Losses", "/cockpit/losses", "audit", ["ledger"], "calibration", "Autopsy queue", ["manual-review"], "HIGH", "MANUAL", "internal"),
  surface("Studio", "/cockpit/studio", "ava", ["gauge"], "film-room", "Creator asset workspace", ["spend-gate", "owner-approval"], "HIGH", "DRAFT_ONLY", "public-adjacent"),
  surface("Journal", "/cockpit/journal", "audit", ["prism"], "calibration", "Weekly model essay", ["claim-review"], "HIGH", "DRAFT_ONLY", "public-adjacent"),
  surface("API Costs", "/cockpit/api-costs", "meter", ["mint", "jarvis"], "daily-intelligence-brief", "Claude budget monitor", ["cost-threshold"], "MEDIUM", "MANUAL", "internal"),
  surface("Synthetic Monitoring", "/cockpit/synthetic-monitoring", "tal", ["gauge"], "source-intelligence", "Production probes", ["truthful-health"], "HIGH", "DRAFT_ONLY", "internal"),
  surface("Bot Outbox", "/cockpit/bot-outbox", "ava", ["flare"], "content", "Draft event planner", ["draft-only", "owner-approval"], "HIGH", "DRAFT_ONLY", "public-adjacent"),
  surface("Daily Brief", "/cockpit/brief", "jarvis", ["scout"], "daily-intelligence-brief", "Today slate snapshot", ["source-rights"], "MEDIUM", "DRAFT_ONLY", "owner-facing"),
  surface("Calibration", "/cockpit/calibration", "audit", ["prism", "ledger"], "calibration", "Model accountability", ["sample-size", "display-safe"], "CRITICAL", "MANUAL", "internal"),
  surface("Content", "/cockpit/content", "ava", ["gauge", "sarah"], "content", "Draft-only engine", ["draft-only", "claim-review"], "HIGH", "DRAFT_ONLY", "public-adjacent"),
  surface("Sources", "/cockpit/sources", "tal", ["relay"], "source-intelligence", "Source intelligence", ["source-rights"], "CRITICAL", "DRAFT_ONLY", "internal"),
  surface("Airwave", "/cockpit/airwave", "scout", ["gauge"], "airwave-claim", "Pundit claim review", ["manual-entry", "proof-required"], "HIGH", "MANUAL", "internal"),
  surface("Listener Log", "/cockpit/listener-log", "scout", ["gauge"], "airwave-claim", "Manual broadcast claim entry", ["manual-entry"], "MEDIUM", "MANUAL", "internal"),
  surface("Moderation", "/cockpit/moderation", "pulse", ["sarah"], "support-trust", "Community room queue", ["human-review"], "HIGH", "DRAFT_ONLY", "internal"),
  surface("Memory", "/cockpit/memory", "archive", ["jarvis"], "memory", "Memory review queue", ["owner-approval"], "HIGH", "NOT_WIRED", "future"),
  surface("Film Room", "/cockpit/film-room", "ava", ["gauge"], "film-room", "Visual production", ["spend-gate", "owner-approval"], "HIGH", "DRAFT_ONLY", "public-adjacent"),
  surface("Command Center", "/cockpit/command-center", "jarvis", ["tal", "sarah"], "daily-intelligence-brief", "Owner attention feed", ["owner-approval"], "HIGH", "DRAFT_ONLY", "owner-facing"),
  surface("Integrity", "/cockpit/integrity", "jarvis", ["audit", "gauge"], "daily-intelligence-brief", "Built/Wired/Proven ledger", ["truthful-status"], "CRITICAL", "DRAFT_ONLY", "internal"),
  surface("NOVA", "/cockpit/nova", "jarvis", ["tal", "mint"], "daily-intelligence-brief", "Opportunity shadow cycle", ["no-public-claims"], "MEDIUM", "DRAFT_ONLY", "internal"),
  surface("Jarvis", "/cockpit/jarvis", "jarvis", ["tal"], "daily-intelligence-brief", "Launch assessment deep view", ["owner-approval"], "HIGH", "DRAFT_ONLY", "owner-facing"),
] as const;

function surface(pageName: string, route: string, owningAgent: string, supportingAgents: readonly string[], primaryWorkflow: string, outputArtifact: string, reviewGates: readonly string[], riskLevel: CockpitOperatingSurface["riskLevel"], currentStatus: CockpitOperatingSurface["currentStatus"], audience: CockpitOperatingSurface["audience"]): CockpitOperatingSurface {
  return {
    pageName, route, owningAgent, supportingAgents, primaryWorkflow,
    inputSignals: ["task-queue", "source-evidence", "gate-state"],
    outputArtifact,
    taskTypes: [primaryWorkflow],
    reviewGates,
    riskLevel,
    currentStatus,
    nextExecutableBuild: `Route ${pageName} events into ${primaryWorkflow} tasks with review gates intact.`,
    audience,
    proofSource: "repo cockpit route inventory and Agent OS registry",
    claudeReviewRequired: riskLevel === "HIGH" || riskLevel === "CRITICAL",
  };
}
