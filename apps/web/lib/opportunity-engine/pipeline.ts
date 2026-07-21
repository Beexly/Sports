import { assessEvidence } from "./evidence";
import { buildExperiment } from "./experiment";
import { decidePolicy, findHardBlockers } from "./policy";
import { scoreOpportunity } from "./scoring";
import type {
  OpportunityCandidate,
  OpportunityDecision,
  OpportunityPortfolio,
  RevenueLane,
} from "./types";

export interface PortfolioPolicy {
  readonly maxConcurrentExperiments: number;
}

export const DEFAULT_PORTFOLIO_POLICY: PortfolioPolicy = {
  maxConcurrentExperiments: 3,
};

export function evaluateOpportunity(
  candidate: OpportunityCandidate,
  now: Date = new Date(),
): OpportunityDecision {
  const evidence = assessEvidence(candidate, now);
  const held = findHardBlockers(candidate, evidence, now).length > 0;
  const score = scoreOpportunity(candidate, evidence, held, now);
  const policy = decidePolicy(candidate, evidence, score, now);
  const experiment = buildExperiment(candidate, policy, score);

  return {
    candidate,
    evidence,
    score,
    policy,
    experiment,
    generatedAt: now.toISOString(),
  };
}

function descendingValue(a: OpportunityDecision, b: OpportunityDecision): number {
  if (a.score.netScore !== b.score.netScore) return b.score.netScore - a.score.netScore;
  if (a.score.riskScore !== b.score.riskScore) return a.score.riskScore - b.score.riskScore;
  return a.candidate.id.localeCompare(b.candidate.id);
}

function hasLane(decision: OpportunityDecision, lanes: ReadonlySet<RevenueLane>): boolean {
  return decision.candidate.revenueLanes.some((lane) => lanes.has(lane));
}

const DIRECT_MONEY_LANES: ReadonlySet<RevenueLane> = new Set([
  "subscription",
  "usage_based_api",
  "data_license",
  "model_license",
  "training_data_license",
  "evaluation_benchmark",
  "app_marketplace",
  "workflow_product",
  "affiliate",
  "referral",
  "partnership",
  "co_sell",
  "revenue_share",
  "sponsorship",
  "professional_service",
  "research_license",
  "grant",
  "agentic_micropayment",
]);

const COST_LANES: ReadonlySet<RevenueLane> = new Set(["cost_avoidance", "cloud_credit"]);

function selectDiverseExperiments(
  candidates: readonly OpportunityDecision[],
  limit: number,
): readonly OpportunityDecision[] {
  if (limit <= 0) return [];
  const ordered = [...candidates].sort(descendingValue);
  const selected: OpportunityDecision[] = [];
  const selectedIds = new Set<string>();

  const takeFirst = (predicate: (decision: OpportunityDecision) => boolean): void => {
    if (selected.length >= limit) return;
    const match = ordered.find((decision) => !selectedIds.has(decision.candidate.id) && predicate(decision));
    if (!match) return;
    selected.push(match);
    selectedIds.add(match.candidate.id);
  };

  // Preserve portfolio breadth under scarcity: one path toward cash/distribution,
  // one cost/capacity lever, then the strongest remaining opportunity.
  takeFirst((decision) => hasLane(decision, DIRECT_MONEY_LANES));
  takeFirst((decision) => hasLane(decision, COST_LANES));

  for (const decision of ordered) {
    if (selected.length >= limit) break;
    if (selectedIds.has(decision.candidate.id)) continue;
    selected.push(decision);
    selectedIds.add(decision.candidate.id);
  }

  return selected;
}

export function buildOpportunityPortfolio(
  candidates: readonly OpportunityCandidate[],
  policy: PortfolioPolicy = DEFAULT_PORTFOLIO_POLICY,
  now: Date = new Date(),
): OpportunityPortfolio {
  if (!Number.isInteger(policy.maxConcurrentExperiments) || policy.maxConcurrentExperiments < 0) {
    throw new RangeError("maxConcurrentExperiments must be a non-negative integer.");
  }

  const ids = candidates.map((candidate) => candidate.id);
  if (new Set(ids).size !== ids.length) throw new Error("Opportunity candidate ids must be unique.");

  const decisions = candidates.map((candidate) => evaluateOpportunity(candidate, now)).sort(descendingValue);
  const executable = decisions.filter((decision) =>
    ["IMPLEMENT_INTERNAL", "PROTOTYPE_SANDBOX"].includes(decision.policy.disposition),
  );
  const activeExperiments = selectDiverseExperiments(executable, policy.maxConcurrentExperiments);

  return {
    generatedAt: now.toISOString(),
    decisions,
    activeExperiments,
    ownerQueue: decisions.filter((decision) => decision.policy.disposition === "OWNER_REVIEW"),
    researchQueue: decisions.filter((decision) => decision.policy.disposition === "RESEARCH_MORE"),
    watchQueue: decisions.filter((decision) => decision.policy.disposition === "WATCH"),
    quarantined: decisions.filter((decision) => decision.policy.disposition === "QUARANTINE"),
    rejected: decisions.filter((decision) => decision.policy.disposition === "REJECT"),
    capacity: {
      maxConcurrentExperiments: policy.maxConcurrentExperiments,
      selectedExperiments: activeExperiments.length,
    },
  };
}
