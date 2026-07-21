import type {
  OpportunityCandidate,
  OpportunityExperiment,
  OpportunityPolicyDecision,
  OpportunityScore,
} from "./types";

function defaultBudget(candidate: OpportunityCandidate): OpportunityExperiment["budget"] {
  return {
    maxCashUsd: 0,
    maxOwnerHours: Math.max(1, Math.min(8, Math.ceil(candidate.economics.requiredOwnerHours || 2))),
    maxCalendarDays: Math.max(
      1,
      Math.min(14, Math.ceil(candidate.economics.expectedDaysToFirstEvidence || 3)),
    ),
    maxPremiumModelCalls: candidate.signals.learningValue >= 4 ? 2 : 1,
  };
}

function smallestTest(candidate: OpportunityCandidate): string {
  switch (candidate.opportunityClass) {
    case "ai_model_release":
      return "Run a fixed, versioned benchmark on representative GSE coding, research, extraction, and claims tasks in an isolated environment; compare quality, latency, and cost against the current lane.";
    case "platform_update":
      return "Reproduce the announced change against one non-production GSE workflow, capture before/after behavior, and identify required migrations or new leverage.";
    case "api_or_data_feed":
      return "Fetch a legally permitted sample through a read-only adapter, validate schema/freshness/coverage, and measure incremental information beyond current sources.";
    case "developer_tool":
      return "Install only inside an isolated worktree or disposable container, run one bounded repository task, and compare defects, elapsed time, and token/cash use.";
    case "startup_credit":
    case "grant_or_challenge":
      return "Verify eligibility and operative terms from the official program, assemble an application packet draft, and stop before submission for owner approval.";
    case "affiliate_program":
    case "partnership":
      return "Verify acceptance rules, jurisdictions, disclosures, payout triggers, reversals, and audience fit; model a zero-traffic and measured-traffic scenario without publishing links.";
    case "marketplace_channel":
      return "Map listing requirements and fees, then create a private draft listing and unit-economics model without submitting or transacting.";
    case "app_product":
      return "Build the thinnest local prototype that proves one user job end to end, instrument activation, and place no external listing or payment surface live.";
    case "data_product":
      return "Generate a rights-cleared sample data contract and buyer-facing schema from owned derived data, then test whether it answers one documented buyer job.";
    case "model_or_training_program":
      return "Create a rights ledger for every training/evaluation artifact, train or evaluate only on cleared data in a sandbox, and compare against a frozen baseline.";
    case "cost_reduction":
      return "Shadow-route one bounded internal workload through the candidate lane and compare quality, reliability, latency, and measured cash cost without changing production defaults.";
    case "security_or_deprecation":
      return "Reproduce exposure on a non-production fixture, identify affected call sites, and validate the smallest migration or mitigation before the announced deadline.";
    case "workflow_arbitrage":
      return "Run the workflow manually once, document every handoff and failure point, then automate only the deterministic internal steps behind a feature flag.";
    case "research_signal":
      return "Reproduce the key result or claim on a small relevant dataset and define the falsification test before proposing product use.";
  }
}

function hypothesis(candidate: OpportunityCandidate): string {
  const economicTarget = candidate.revenueLanes.some((lane) => lane !== "none")
    ? "creates measurable revenue, distribution, or cost leverage"
    : "improves GSE capability, resilience, or development efficiency";
  return `${candidate.title} ${economicTarget} within the stated no-cash experiment boundary without weakening source rights, security, or owner control.`;
}

export function buildExperiment(
  candidate: OpportunityCandidate,
  policy: OpportunityPolicyDecision,
  score: OpportunityScore,
): OpportunityExperiment | null {
  if (!["IMPLEMENT_INTERNAL", "PROTOTYPE_SANDBOX", "OWNER_REVIEW"].includes(policy.disposition)) {
    return null;
  }

  const successCriteria = [
    "The primary hypothesis is supported by captured, reproducible evidence.",
    "No external action, spend, publication, installation outside the sandbox, or credential change occurs automatically.",
    "Rights, security, and claims gates remain at least as strict as the baseline.",
    "A rollback path is tested and the complete diff or artifact set is reviewable.",
    "Measured outcomes replace projected assumptions in the opportunity ledger.",
  ];
  if (candidate.revenueLanes.some((lane) => lane !== "none")) {
    successCriteria.push("A specific buyer, channel, payout rule, or cost ledger is evidenced; market-size rhetoric alone does not count.");
  }

  return {
    candidateId: candidate.id,
    hypothesis: hypothesis(candidate),
    smallestTest: smallestTest(candidate),
    successCriteria,
    failureCriteria: [
      "The candidate cannot outperform the frozen baseline on its stated objective.",
      "Required rights, security, eligibility, or commercial terms cannot be verified.",
      "The experiment exceeds its cash, owner-time, calendar, or premium-model budget.",
      "The apparent benefit depends on an unapproved external action or an unsupported revenue claim.",
      `The evidence remains ${score.confidence.toLowerCase()} confidence after the bounded test.`,
    ],
    evidenceToCapture: [
      "Exact source URLs, capture dates, operative terms, and content fingerprints",
      "Commands, inputs, versions, configuration, and deterministic test output",
      "Before/after quality, latency, reliability, token use, cash cost, and owner time",
      "Rights, security, privacy, jurisdiction, and vendor-lock-in findings",
      "Revenue, savings, credit, or distribution evidence in its actual lifecycle state",
    ],
    rollbackPlan:
      "Keep work isolated behind a branch, worktree, fixture, or feature flag; remove the candidate integration and restore the frozen baseline if any gate fails.",
    budget: defaultBudget(candidate),
    sandboxRequired: candidate.securityPosture !== "trusted_read_only" || policy.disposition !== "IMPLEMENT_INTERNAL",
    ownerApprovalRequiredBeforeExternalAction: true,
  };
}
