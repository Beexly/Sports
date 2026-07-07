import { round } from "./math.js";

export type MetricDirection = "UP" | "DOWN" | "NEUTRAL";

export interface MetricDriver {
  readonly name: string;
  readonly contribution: number;
  readonly direction: MetricDirection;
  readonly explanation: string;
}

export interface MetricDriverInput {
  readonly name: string;
  readonly contribution: number;
  readonly direction: MetricDirection;
  readonly explanation: string;
}

export function metricDriver(input: MetricDriverInput): MetricDriver {
  return {
    contribution: round(input.contribution, 4),
    direction: input.direction,
    explanation: input.explanation,
    name: input.name,
  };
}

export function sortedDrivers(drivers: readonly MetricDriver[]): readonly MetricDriver[] {
  return [...drivers].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}
