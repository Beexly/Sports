/**
 * Cockpit Intelligence (Phase 7)
 *
 * Aggregates the inputs the cockpit overview needs into a single typed
 * "OperatorPulse" object. Pure computation — the caller passes in the raw
 * counts and the function returns the synthesized view.
 *
 * The overview page renders these directly; tests can construct one with a
 * stub fixture without hitting the DB.
 */

import type {
  CockpitTaskStatus,
  CockpitRiskLevel,
  OperatorAgent,
} from "@prisma/client";

export interface AgingTaskRow {
  readonly id: string;
  readonly title: string;
  readonly status: CockpitTaskStatus;
  readonly assignedAgent: OperatorAgent;
  readonly ageHours: number;
}

export interface OperatorPulseInput {
  readonly now: Date;
  readonly taskCountsByStatus: ReadonlyMap<CockpitTaskStatus, number>;
  readonly taskCountsByAgent: ReadonlyMap<OperatorAgent, number>;
  readonly tasksByRisk: ReadonlyMap<CockpitRiskLevel, number>;
  readonly mediaDraftsPending: number;
  readonly mediaApprovedPending: number;
  readonly promoCounts: {
    readonly active: number;
    readonly needsReview: number;
    readonly blocked: number;
    readonly expired: number;
    readonly total: number;
  };
  readonly readinessGatesOn: number; // out of 7
  readonly readinessGatesTotal: number;
  readonly calibrationProposalCount: number;
  readonly agingTasks: readonly AgingTaskRow[];
  readonly staleSourceCount: number;
}

export interface OperatorPulse {
  readonly readinessScore: number; // 0..100
  readonly routeHealth: "GREEN" | "AMBER" | "RED";
  readonly openRisks: number;
  readonly tasksAging24h: number;
  readonly tasksAging72h: number;
  readonly agentWorkload: ReadonlyMap<OperatorAgent, number>;
  readonly blockedTaskCount: number;
  readonly reviewQueueCount: number;
  readonly dataFreshnessIssues: number;
  readonly nextBestActions: readonly string[];
  readonly phaseProgress: readonly { readonly key: string; readonly status: string }[];
  readonly promotionsReviewQueue: number;
  readonly contentReviewQueue: number;
  readonly calibrationAlerts: number;
}

const HOUR = 60 * 60 * 1000;

/**
 * Compute the OperatorPulse from the supplied snapshot. The pulse is the
 * cockpit's "headline number" — what the operator sees first.
 */
export function computeOperatorPulse(
  input: OperatorPulseInput
): OperatorPulse {
  // Readiness score: weighted combination of gates-on percentage and queue
  // health. 60% gates, 40% queue.
  const gatesPct =
    input.readinessGatesTotal === 0
      ? 0
      : input.readinessGatesOn / input.readinessGatesTotal;

  const reviewCount =
    (input.taskCountsByStatus.get("NEEDS_REVIEW") ?? 0) +
    (input.taskCountsByStatus.get("BLOCKED") ?? 0);
  const totalActive =
    (input.taskCountsByStatus.get("NEW") ?? 0) +
    (input.taskCountsByStatus.get("ROUTED") ?? 0) +
    (input.taskCountsByStatus.get("DRAFTED") ?? 0) +
    (input.taskCountsByStatus.get("NEEDS_REVIEW") ?? 0) +
    (input.taskCountsByStatus.get("BLOCKED") ?? 0);
  const queueHealth =
    totalActive === 0 ? 1 : 1 - Math.min(1, reviewCount / Math.max(totalActive, 1));

  const readinessScore = Math.round((gatesPct * 0.6 + queueHealth * 0.4) * 100);

  // Route health classification.
  let routeHealth: OperatorPulse["routeHealth"] = "GREEN";
  if (
    (input.tasksByRisk.get("COMPLIANCE_HOLD") ?? 0) > 0 ||
    input.promoCounts.blocked > 0 ||
    input.staleSourceCount > 5
  ) {
    routeHealth = "RED";
  } else if (
    (input.tasksByRisk.get("HIGH") ?? 0) > 0 ||
    reviewCount > 5 ||
    input.staleSourceCount > 0
  ) {
    routeHealth = "AMBER";
  }

  // Task aging: count >= 24h and >= 72h
  let aging24 = 0;
  let aging72 = 0;
  for (const t of input.agingTasks) {
    if (t.ageHours >= 72) aging72++;
    else if (t.ageHours >= 24) aging24++;
  }

  const openRisks =
    (input.tasksByRisk.get("HIGH") ?? 0) +
    (input.tasksByRisk.get("COMPLIANCE_HOLD") ?? 0) +
    input.promoCounts.blocked +
    input.staleSourceCount;

  // Next best actions: a small ordered list. Highest-leverage first.
  const nextBestActions: string[] = [];
  if (reviewCount > 0) {
    nextBestActions.push(
      `Resolve ${reviewCount} cockpit item${reviewCount === 1 ? "" : "s"} in /cockpit/review.`
    );
  }
  if (input.promoCounts.needsReview > 0) {
    nextBestActions.push(
      `Review ${input.promoCounts.needsReview} promotion${input.promoCounts.needsReview === 1 ? "" : "s"} pending compliance approval.`
    );
  }
  if (input.calibrationProposalCount > 0) {
    nextBestActions.push(
      `Triage ${input.calibrationProposalCount} calibration proposal${input.calibrationProposalCount === 1 ? "" : "s"} in /cockpit/calibration.`
    );
  }
  if (input.staleSourceCount > 0) {
    nextBestActions.push(
      `${input.staleSourceCount} source category${input.staleSourceCount === 1 ? " is" : "ies are"} stale — re-run ingestion.`
    );
  }
  if (input.promoCounts.expired > 0) {
    nextBestActions.push(
      `Archive ${input.promoCounts.expired} expired promotion${input.promoCounts.expired === 1 ? "" : "s"}.`
    );
  }
  if (aging72 > 0) {
    nextBestActions.push(
      `${aging72} task${aging72 === 1 ? "" : "s"} aged >72h — re-route or close.`
    );
  }
  if (nextBestActions.length === 0) {
    nextBestActions.push("Queues clean. Watch the daily brief at /cockpit/brief.");
  }

  // Phase progress — high-level milestone tracking.
  const phaseProgress: readonly { readonly key: string; readonly status: string }[] = [
    { key: "Phase 1 — Audit baseline", status: "Complete" },
    { key: "Phase 2 — Trust cleanup", status: "Complete" },
    { key: "Phase 3 — Performance gating", status: "Complete" },
    { key: "Phase 2B — Cockpit", status: "Complete" },
    { key: "Phase 4 — Promotions", status: "Active" },
    { key: "Phase 5 — Source intelligence", status: "Active" },
    { key: "Phase 6 — Content engine", status: "Active" },
    { key: "Phase 7 — Cockpit intelligence", status: "Active" },
  ];

  return {
    readinessScore,
    routeHealth,
    openRisks,
    tasksAging24h: aging24,
    tasksAging72h: aging72,
    agentWorkload: input.taskCountsByAgent,
    blockedTaskCount: input.taskCountsByStatus.get("BLOCKED") ?? 0,
    reviewQueueCount: reviewCount,
    dataFreshnessIssues: input.staleSourceCount,
    nextBestActions: Object.freeze(nextBestActions),
    phaseProgress,
    promotionsReviewQueue: input.promoCounts.needsReview,
    contentReviewQueue: input.mediaDraftsPending,
    calibrationAlerts: input.calibrationProposalCount,
  };
}

/** Helper for building agingTasks from raw rows. */
export function computeTaskAge(createdAt: Date, now: Date): number {
  return (now.getTime() - createdAt.getTime()) / HOUR;
}
