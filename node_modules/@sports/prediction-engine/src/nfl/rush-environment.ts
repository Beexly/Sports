import {
  clamp01,
  round,
  sortedDrivers,
  uncertaintyFromEvidence,
  weightedMean,
  type MetricDriver,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "./metric-core.js";

export interface GseRushEnvironmentInput {
  readonly offensiveLineProxy: number;
  readonly defensiveFrontStrength: number;
  readonly boxLightnessProxy?: number;
  readonly favorableDownDistance: number;
  readonly positiveGameScript: number;
  readonly weatherRunBoost?: number;
  readonly redZoneSpace: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface GseRushEnvironment {
  readonly metricId: "gse-rush-environment";
  readonly environmentIndex: number;
  readonly drivers: readonly MetricDriver[];
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function gseRushEnvironment(input: GseRushEnvironmentInput): GseRushEnvironment {
  const line = clamp01(input.offensiveLineProxy);
  const frontInverse = 1 - clamp01(input.defensiveFrontStrength);
  const boxLightness = clamp01(input.boxLightnessProxy ?? 0.5);
  const downDistance = clamp01(input.favorableDownDistance);
  const script = clamp01(input.positiveGameScript);
  const weather = clamp01(input.weatherRunBoost ?? 0.5);
  const redZone = clamp01(input.redZoneSpace);
  const environmentIndex =
    100 *
    weightedMean([
      { value: line, weight: 0.25 },
      { value: frontInverse, weight: 0.2 },
      { value: boxLightness, weight: 0.15 },
      { value: downDistance, weight: 0.15 },
      { value: script, weight: 0.1 },
      { value: weather, weight: 0.1 },
      { value: redZone, weight: 0.05 },
    ]);

  const drivers = sortedDrivers([
    driver("offensive_line_proxy", round(line * 25, 2), "UP", "Offensive-line proxy improves the rushing environment."),
    driver("defensive_front_inverse", round(frontInverse * 20, 2), "UP", "Weaker defensive-front proxy improves the rushing environment."),
    driver("box_lightness_proxy", round(boxLightness * 15, 2), "UP", "Lighter box proxy improves the rushing environment."),
    driver("down_distance", round(downDistance * 15, 2), "UP", "Favorable down and distance improves the rushing environment."),
  ]);

  return {
    drivers,
    environmentIndex: round(environmentIndex, 2),
    metricId: "gse-rush-environment",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand: uncertaintyFromEvidence({ proxyCount: input.boxLightnessProxy === undefined || input.weatherRunBoost === undefined ? 1 : 0, sampleSize: input.sampleSize, sourcePolicy: input.sourcePolicy }),
  };
}

function driver(name: string, contribution: number, direction: MetricDriver["direction"], explanation: string): MetricDriver {
  return { contribution, direction, explanation, name };
}
