import { detectMaterialChanges } from "./change-detection";
import { buildLearningReport } from "./learning";
import { buildOpportunityPortfolio, type PortfolioPolicy } from "./pipeline";
import type {
  LearningReport,
  MaterialChange,
  OpportunityCandidate,
  OpportunityObservation,
  OpportunityPortfolio,
  OpportunityOutcome,
} from "./types";

/**
 * NOVA is additive to the existing council. This descriptor is deliberately
 * separate from the canonical cockpit/Prisma agent enum until the runtime,
 * persistence, and council migration pass their own acceptance gates.
 */
export const NOVA_AGENT = {
  id: "nova",
  codename: "NOVA",
  name: "AI Opportunity Intelligence & Venture Architect",
  reportsTo: "JARVIS",
  reviewedBy: ["METER", "BOBBY", "TAL", "AUDIT", "GAUGE"] as const,
  mode: "MANUAL_CORE_SCHEDULE_NOT_WIRED" as const,
  mission:
    "Continuously detect material AI ecosystem changes and convert verified opportunities into bounded research, cost, product, distribution, data, partnership, and revenue experiments.",
  externalActionsAllowed: false as const,
  automaticInstallAllowed: false as const,
  automaticSpendAllowed: false as const,
  automaticPublishAllowed: false as const,
  weightChangesAllowed: false as const,
};

export interface NovaCycleInput {
  readonly previousObservations: readonly OpportunityObservation[];
  readonly currentObservations: readonly OpportunityObservation[];
  readonly candidates: readonly OpportunityCandidate[];
  readonly outcomes: readonly OpportunityOutcome[];
  readonly portfolioPolicy?: PortfolioPolicy;
  readonly now?: Date;
}

export interface NovaAlert {
  readonly severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly kind:
    | "MATERIAL_CHANGE"
    | "OWNER_DECISION"
    | "QUARANTINED_DISCOVERY"
    | "EXPIRING_OPPORTUNITY"
    | "LEARNING_WARNING";
  readonly title: string;
  readonly detail: string;
  readonly candidateId?: string;
  readonly sourceKey?: string;
}

export interface NovaHandoff {
  readonly candidateId: string;
  readonly recipients: readonly string[];
  readonly reason: string;
  readonly ownerApprovalRequired: boolean;
}

export interface NovaCycleResult {
  readonly agent: typeof NOVA_AGENT;
  readonly generatedAt: string;
  readonly changes: readonly MaterialChange[];
  readonly materialChanges: readonly MaterialChange[];
  readonly portfolio: OpportunityPortfolio;
  readonly learning: LearningReport;
  readonly alerts: readonly NovaAlert[];
  readonly handoffs: readonly NovaHandoff[];
  readonly summary: {
    readonly sourcesChanged: number;
    readonly criticalChanges: number;
    readonly candidateCount: number;
    readonly selectedExperiments: number;
    readonly ownerDecisions: number;
    readonly quarantined: number;
    readonly externalActionsTaken: 0;
    readonly productionChangesMade: 0;
    readonly weightsChanged: 0;
  };
}

function expiryAlert(candidate: OpportunityCandidate, now: Date): NovaAlert | null {
  if (!candidate.expiresAt) return null;
  const expiry = Date.parse(candidate.expiresAt);
  if (!Number.isFinite(expiry)) return null;
  const days = Math.ceil((expiry - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0 || days > 14) return null;
  return {
    severity: days <= 3 ? "CRITICAL" : "HIGH",
    kind: "EXPIRING_OPPORTUNITY",
    title: `${candidate.title} expires in ${days} day${days === 1 ? "" : "s"}`,
    detail: "NOVA may prepare an evidence and application packet, but submission remains owner-controlled.",
    candidateId: candidate.id,
  };
}

function buildAlerts(
  changes: readonly MaterialChange[],
  portfolio: OpportunityPortfolio,
  learning: LearningReport,
  now: Date,
): readonly NovaAlert[] {
  const alerts: NovaAlert[] = [];

  for (const change of changes.filter((item) => item.kind !== "UNCHANGED")) {
    alerts.push({
      severity: change.materiality,
      kind: "MATERIAL_CHANGE",
      title: change.current?.title ?? change.previous?.title ?? change.key,
      detail: change.reasons.join(" "),
      sourceKey: change.key,
    });
  }

  for (const decision of portfolio.ownerQueue) {
    alerts.push({
      severity: decision.score.priorityBand === "P0" ? "CRITICAL" : "HIGH",
      kind: "OWNER_DECISION",
      title: decision.candidate.title,
      detail: `Owner review required before external action. Reviewers: ${decision.policy.requiredReviews.join(", ")}.`,
      candidateId: decision.candidate.id,
    });
  }

  for (const decision of portfolio.quarantined) {
    alerts.push({
      severity: "CRITICAL",
      kind: "QUARANTINED_DISCOVERY",
      title: decision.candidate.title,
      detail: decision.policy.blockedReasons.join(" ") || "Rights or security policy blocked the opportunity.",
      candidateId: decision.candidate.id,
    });
  }

  for (const candidate of portfolio.decisions.map((decision) => decision.candidate)) {
    const alert = expiryAlert(candidate, now);
    if (alert) alerts.push(alert);
  }

  for (const recommendation of learning.recommendations) {
    if (!/poorly calibrated|rollback|low downstream yield|must not claim/i.test(recommendation)) continue;
    alerts.push({
      severity: "MEDIUM",
      kind: "LEARNING_WARNING",
      title: "NOVA learning-control warning",
      detail: recommendation,
    });
  }

  const order: Readonly<Record<NovaAlert["severity"], number>> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title));
}

function buildHandoffs(portfolio: OpportunityPortfolio): readonly NovaHandoff[] {
  return portfolio.decisions
    .filter((decision) =>
      ["IMPLEMENT_INTERNAL", "PROTOTYPE_SANDBOX", "OWNER_REVIEW"].includes(decision.policy.disposition),
    )
    .map((decision) => ({
      candidateId: decision.candidate.id,
      recipients: decision.policy.requiredReviews,
      reason: `${decision.policy.disposition}: ${decision.score.reasons.join(" ")}`,
      ownerApprovalRequired: decision.policy.requiredReviews.includes("Owner"),
    }));
}

/**
 * One deterministic NOVA cycle. All I/O is supplied by callers so this function
 * is replayable, testable, and safe to run in CI before any scheduled adapter is
 * allowed to invoke it.
 */
export function runNovaCycle(input: NovaCycleInput): NovaCycleResult {
  const now = input.now ?? new Date();
  const changes = detectMaterialChanges(input.previousObservations, input.currentObservations);
  const materialChanges = changes.filter((change) => change.kind !== "UNCHANGED");
  const portfolio = buildOpportunityPortfolio(input.candidates, input.portfolioPolicy, now);
  const learning = buildLearningReport(input.outcomes, now);
  const alerts = buildAlerts(changes, portfolio, learning, now);
  const handoffs = buildHandoffs(portfolio);

  return {
    agent: NOVA_AGENT,
    generatedAt: now.toISOString(),
    changes,
    materialChanges,
    portfolio,
    learning,
    alerts,
    handoffs,
    summary: {
      sourcesChanged: materialChanges.length,
      criticalChanges: materialChanges.filter((change) => change.materiality === "CRITICAL").length,
      candidateCount: input.candidates.length,
      selectedExperiments: portfolio.activeExperiments.length,
      ownerDecisions: portfolio.ownerQueue.length,
      quarantined: portfolio.quarantined.length,
      externalActionsTaken: 0,
      productionChangesMade: 0,
      weightsChanged: 0,
    },
  };
}
