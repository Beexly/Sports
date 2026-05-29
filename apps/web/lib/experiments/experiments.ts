/**
 * Experiment Engine — typed experiment registry.
 *
 * Every running experiment is declared here with a hypothesis, primary
 * metric, guardrail metric, risk classification, success condition,
 * rollback condition, and owner.
 *
 * Hard rules:
 *  - No experiment may run on betting-action surfaces without a
 *    risk_class of "high" and an explicit guardrail review.
 *  - No experiment may use confusion or restraint metrics as success
 *    metrics. They are guardrails — driving them down is a fail.
 *  - No experiment may rely on a forbidden telemetry event.
 *
 * Server-only.
 */

import type { TelemetryEventName } from "../telemetry/events";

export type ExperimentRiskClass = "low" | "medium" | "high";
export type ExperimentStatus = "draft" | "ready" | "running" | "paused" | "shipped" | "rolled-back";

export interface ExperimentMetric {
  /** Telemetry event the metric is computed from. */
  readonly event: TelemetryEventName;
  /** Higher / lower is better. */
  readonly direction: "increase" | "decrease";
  /** Expected lift as a decimal (0.05 = +5%). */
  readonly expectedLift: number;
}

export interface ExperimentGuardrail {
  readonly event: TelemetryEventName;
  /** Maximum acceptable degradation (e.g. 0.02 = 2% worse). */
  readonly maxRegression: number;
  /** If true, this guardrail blocks ship even at neutral primary. */
  readonly blocking: boolean;
}

export interface Experiment {
  readonly id: string;
  readonly hypothesis: string;
  readonly owner: string;
  readonly riskClass: ExperimentRiskClass;
  readonly status: ExperimentStatus;
  readonly primary: ExperimentMetric;
  readonly guardrails: ReadonlyArray<ExperimentGuardrail>;
  readonly successCondition: string;
  readonly rollbackCondition: string;
  readonly surfaces: ReadonlyArray<string>;
  readonly startISO?: string;
  readonly endISO?: string;
}

/**
 * Active and historical experiments. Add new experiments here; never
 * mutate after status moves to `running`.
 */
export const EXPERIMENT_REGISTRY: ReadonlyArray<Experiment> = [
  {
    id: "exp-001-methodology-cta-density",
    hypothesis:
      "Surfacing a tighter methodology CTA below evidence cards increases methodology-followed rate without harming restraint coverage.",
    owner: "owner",
    riskClass: "low",
    status: "draft",
    primary: { event: "methodology.followed", direction: "increase", expectedLift: 0.15 },
    guardrails: [
      { event: "restraint.responsible_play_followed", maxRegression: 0.02, blocking: true },
      { event: "confusion.short_dwell", maxRegression: 0.02, blocking: true },
    ],
    successCondition:
      "+15% methodology.followed with no blocking guardrail breach across 30 days at 50/50 split.",
    rollbackCondition:
      "Any blocking guardrail breaches threshold for 7 consecutive days, or primary lift drops below 0.",
    surfaces: ["picks", "today"],
  },
];

const EXPERIMENT_BY_ID: ReadonlyMap<string, Experiment> = new Map(
  EXPERIMENT_REGISTRY.map((e) => [e.id, e]),
);

export function getExperiment(id: string): Experiment | undefined {
  return EXPERIMENT_BY_ID.get(id);
}

/** Validate an experiment definition. Pure — no I/O. */
export function validateExperiment(exp: Experiment): ReadonlyArray<string> {
  const errs: string[] = [];
  if (!exp.id) errs.push("id is required");
  if (!exp.hypothesis) errs.push("hypothesis is required");
  if (!exp.owner) errs.push("owner is required");
  if (exp.guardrails.length === 0) errs.push("at least one guardrail is required");
  if (exp.riskClass === "high" && !exp.guardrails.some((g) => g.blocking)) {
    errs.push("high-risk experiment must have at least one blocking guardrail");
  }
  if (exp.primary.event.startsWith("confusion.") || exp.primary.event.startsWith("restraint.")) {
    errs.push("confusion/restraint events cannot be a primary metric");
  }
  return errs;
}
