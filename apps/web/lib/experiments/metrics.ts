/**
 * Experiment metric computation helpers.
 *
 * Pure functions; no I/O. The analytics layer is responsible for
 * supplying the bucketed counts and durations.
 */

import type { Experiment, ExperimentGuardrail, ExperimentMetric } from "./experiments";

export interface MetricSample {
  /** Number of subjects exposed. */
  readonly exposures: number;
  /** Number of events of interest counted within the exposure window. */
  readonly events: number;
}

export interface ArmResult {
  readonly variantId: string;
  readonly primary: MetricSample;
  readonly guardrails: Readonly<Record<string, MetricSample>>; // event name → sample
}

export interface MetricVerdict {
  readonly liftFromControl: number; // primary lift (decimal)
  readonly meetsSuccess: boolean;
  readonly guardrailBreaches: ReadonlyArray<string>;
  readonly rollbackTriggered: boolean;
}

function rateOf(sample: MetricSample): number {
  return sample.exposures > 0 ? sample.events / sample.exposures : 0;
}

export function evaluateArm(
  experiment: Experiment,
  control: ArmResult,
  treatment: ArmResult,
): MetricVerdict {
  const controlRate = rateOf(control.primary);
  const treatmentRate = rateOf(treatment.primary);
  const lift = controlRate > 0 ? (treatmentRate - controlRate) / controlRate : 0;

  const breaches: string[] = [];
  for (const g of experiment.guardrails) {
    const reg = guardrailRegression(g, control, treatment);
    if (reg > g.maxRegression) breaches.push(g.event);
  }

  const blockingBreached = experiment.guardrails.some(
    (g) => g.blocking && breaches.includes(g.event),
  );

  const meetsSuccess =
    !blockingBreached && lift >= experiment.primary.expectedLift;

  const rollbackTriggered = blockingBreached || lift < 0;
  return { liftFromControl: lift, meetsSuccess, guardrailBreaches: breaches, rollbackTriggered };
}

function guardrailRegression(
  g: ExperimentGuardrail,
  control: ArmResult,
  treatment: ArmResult,
): number {
  const c = rateOf(control.guardrails[g.event] ?? { exposures: 0, events: 0 });
  const t = rateOf(treatment.guardrails[g.event] ?? { exposures: 0, events: 0 });
  if (c === 0) return 0;
  return Math.abs(t - c) / c;
}

/** Helper for tests / planning — minimum sample size at α=0.05, power=0.8 for a proportion test. */
export function minimumSampleSize(baselineRate: number, mde: number): number {
  if (baselineRate <= 0 || mde <= 0) return Number.POSITIVE_INFINITY;
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + mde);
  const sd = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const z = 2.8; // z(0.975) + z(0.8) ~= 1.96 + 0.84 = 2.8
  const n = Math.ceil(Math.pow((z * sd) / Math.abs(p2 - p1), 2));
  return n;
}

/** Re-export for caller convenience. */
export type { ExperimentMetric };
