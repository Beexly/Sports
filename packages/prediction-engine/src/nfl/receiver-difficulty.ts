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

export interface GseReceiverDifficultyInput {
  readonly expectedCompletionProbability: number;
  readonly airYards: number;
  readonly separationYards?: number;
  readonly cushionYards?: number;
  readonly contestedCatchProxy?: number;
  readonly sidelineProxy?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface GseReceiverDifficulty {
  readonly metricId: "gse-receiver-difficulty";
  readonly difficultyIndex: number;
  readonly drivers: readonly MetricDriver[];
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function gseReceiverDifficulty(input: GseReceiverDifficultyInput): GseReceiverDifficulty {
  const completionDifficulty = 1 - clamp01(input.expectedCompletionProbability);
  const depthDifficulty = normalizeClamped(input.airYards, 0, 40);
  const separationDifficulty = 1 - normalizeClamped(input.separationYards ?? 2.5, 0, 6);
  const cushionDifficulty = 1 - normalizeClamped(input.cushionYards ?? 5, 0, 10);
  const contested = clamp01(input.contestedCatchProxy ?? 0);
  const sideline = clamp01(input.sidelineProxy ?? 0);
  const difficultyIndex =
    100 *
    weightedMean([
      { value: completionDifficulty, weight: 0.38 },
      { value: depthDifficulty, weight: 0.2 },
      { value: separationDifficulty, weight: 0.18 },
      { value: cushionDifficulty, weight: 0.08 },
      { value: contested, weight: 0.1 },
      { value: sideline, weight: 0.06 },
    ]);

  const drivers = sortedDrivers([
    driver("expected_completion", round(completionDifficulty * 38, 2), "UP", "Lower expected completion increases target difficulty."),
    driver("air_yards", round(depthDifficulty * 20, 2), "UP", "Deeper targets increase target difficulty."),
    driver("separation_proxy", round(separationDifficulty * 18, 2), "UP", "Lower separation proxy increases target difficulty."),
    driver("contest_proxy", round(contested * 10, 2), "UP", "Contest proxy increases target difficulty."),
  ]);

  return {
    difficultyIndex: round(difficultyIndex, 2),
    drivers,
    metricId: "gse-receiver-difficulty",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand: uncertaintyFromEvidence({ proxyCount: proxyCount([input.separationYards, input.cushionYards, input.contestedCatchProxy, input.sidelineProxy]), sampleSize: input.sampleSize, sourcePolicy: input.sourcePolicy }),
  };
}

function driver(name: string, contribution: number, direction: MetricDriver["direction"], explanation: string): MetricDriver {
  return { contribution, direction, explanation, name };
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
