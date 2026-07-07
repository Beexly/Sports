import { round } from "./metric-core.js";

export type MetricDriftStatus = "STABLE" | "WATCH" | "ALERT" | "BLOCKED";

export interface MetricDriftInput {
  readonly expectedDistribution: readonly number[];
  readonly actualDistribution: readonly number[];
  readonly watchThreshold?: number;
  readonly alertThreshold?: number;
}

export interface MetricDriftResult {
  readonly status: MetricDriftStatus;
  readonly psi: number;
  readonly reasons: readonly string[];
}

export function populationStabilityIndex(expectedDistribution: readonly number[], actualDistribution: readonly number[]): number {
  if (expectedDistribution.length !== actualDistribution.length || expectedDistribution.length < 2) {
    throw new Error("PSI requires matching distributions with at least two buckets.");
  }
  const expected = normalize(expectedDistribution);
  const actual = normalize(actualDistribution);
  const epsilon = 1e-6;
  const psi = expected.reduce((sum, expectedPct, index) => {
    const actualPct = actual[index] ?? 0;
    const safeExpected = Math.max(expectedPct, epsilon);
    const safeActual = Math.max(actualPct, epsilon);
    return sum + (safeActual - safeExpected) * Math.log(safeActual / safeExpected);
  }, 0);
  return round(psi, 6);
}

export function evaluateMetricDrift(input: MetricDriftInput): MetricDriftResult {
  let psi: number;
  try {
    psi = populationStabilityIndex(input.expectedDistribution, input.actualDistribution);
  } catch (error) {
    return { psi: 0, reasons: [(error as Error).message], status: "BLOCKED" };
  }

  const watch = input.watchThreshold ?? 0.1;
  const alert = input.alertThreshold ?? 0.25;
  const status: MetricDriftStatus = psi >= alert ? "ALERT" : psi >= watch ? "WATCH" : "STABLE";
  const reasons =
    status === "STABLE"
      ? [`PSI ${psi} is below watch threshold ${watch}.`]
      : status === "WATCH"
        ? [`PSI ${psi} reached watch threshold ${watch}.`]
        : [`PSI ${psi} reached alert threshold ${alert}.`];
  return { psi, reasons, status };
}

function normalize(values: readonly number[]): readonly number[] {
  const clean = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = clean.reduce((sum, value) => sum + value, 0);
  if (total <= 0) throw new Error("PSI distribution has no positive mass.");
  return clean.map((value) => value / total);
}
