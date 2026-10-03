import {
  clamp01,
  normalizeClamped,
  round,
  sortedDrivers,
  uncertaintyFromEvidence,
  weightedMean,
  type MetricDriver,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "./metric-core.js";

export interface GseQbBurdenInput {
  readonly completionDifficulty: number;
  readonly pressureProxy: number;
  readonly receiverSeparationDeficit?: number;
  readonly passRateOverExpected?: number;
  readonly averageYardsToGo: number;
  readonly sackAvoidanceBurden?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface GseQbBurden {
  readonly metricId: "gse-qb-burden";
  readonly burdenIndex: number;
  readonly drivers: readonly MetricDriver[];
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function gseQbBurden(input: GseQbBurdenInput): GseQbBurden {
  const completionDifficulty = clamp01(input.completionDifficulty);
  const pressure = clamp01(input.pressureProxy);
  const separationDeficit = clamp01(input.receiverSeparationDeficit ?? 0.5);
  const passRatePressure = normalizeClamped(input.passRateOverExpected ?? 0, -0.25, 0.35);
  const yardsToGo = normalizeClamped(input.averageYardsToGo, 1, 15);
  const sackAvoidance = clamp01(input.sackAvoidanceBurden ?? 0.5);
  const burdenIndex =
    100 *
    weightedMean([
      { value: completionDifficulty, weight: 0.3 },
      { value: pressure, weight: 0.22 },
      { value: separationDeficit, weight: 0.17 },
      { value: passRatePressure, weight: 0.12 },
      { value: yardsToGo, weight: 0.1 },
      { value: sackAvoidance, weight: 0.09 },
    ]);

  const drivers = sortedDrivers([
    driver("completion_difficulty", round(completionDifficulty * 30, 2), "UP", "Completion difficulty increases quarterback burden."),
    driver("pressure_proxy", round(pressure * 22, 2), "UP", "Pressure proxy increases quarterback burden."),
    driver("receiver_separation_deficit", round(separationDeficit * 17, 2), "UP", "Receiver separation deficit increases quarterback burden."),
    driver("average_yards_to_go", round(yardsToGo * 10, 2), "UP", "Longer average yards-to-go increases quarterback burden."),
  ]);

  return {
    burdenIndex: round(burdenIndex, 2),
    drivers,
    metricId: "gse-qb-burden",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand: uncertaintyFromEvidence({ proxyCount: proxyCount([input.receiverSeparationDeficit, input.passRateOverExpected, input.sackAvoidanceBurden]), sampleSize: input.sampleSize, sourcePolicy: input.sourcePolicy }),
  };
}

function driver(name: string, contribution: number, direction: MetricDriver["direction"], explanation: string): MetricDriver {
  return { contribution, direction, explanation, name };
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
