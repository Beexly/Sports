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

export interface GseRoleVolatilityInput {
  readonly snapShareDelta: number;
  readonly targetShareDelta?: number;
  readonly routeShareDelta?: number;
  readonly injuryStatusChanged?: boolean;
  readonly teammateInjuryShock?: boolean;
  readonly depthChartChange?: boolean;
  readonly sampleGames: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface GseRoleVolatility {
  readonly metricId: "gse-role-volatility";
  readonly volatilityIndex: number;
  readonly drivers: readonly MetricDriver[];
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function gseRoleVolatility(input: GseRoleVolatilityInput): GseRoleVolatility {
  const snapShock = normalizeClamped(Math.abs(input.snapShareDelta), 0, 0.45);
  const targetShock = normalizeClamped(Math.abs(input.targetShareDelta ?? 0), 0, 0.35);
  const routeShock = normalizeClamped(Math.abs(input.routeShareDelta ?? 0), 0, 0.45);
  const injuryShock = input.injuryStatusChanged ? 1 : 0;
  const teammateShock = input.teammateInjuryShock ? 1 : 0;
  const depthShock = input.depthChartChange ? 1 : 0;
  const samplePenalty = 1 - normalizeClamped(input.sampleGames, 1, 8);
  const volatilityIndex =
    100 *
    weightedMean([
      { value: snapShock, weight: 0.24 },
      { value: targetShock, weight: 0.16 },
      { value: routeShock, weight: 0.14 },
      { value: injuryShock, weight: 0.16 },
      { value: teammateShock, weight: 0.12 },
      { value: depthShock, weight: 0.1 },
      { value: samplePenalty, weight: 0.08 },
    ]);

  const drivers = sortedDrivers([
    driver("snap_share_delta", round(snapShock * 24, 2), "UP", "Snap-share movement increases role volatility."),
    driver("target_share_delta", round(targetShock * 16, 2), "UP", "Target-share movement increases role volatility."),
    driver("injury_status", round(injuryShock * 16, 2), injuryShock > 0 ? "UP" : "NEUTRAL", "Injury-status changes increase role volatility."),
    driver("sample_size", round(samplePenalty * 8, 2), samplePenalty > 0 ? "UP" : "NEUTRAL", "Low sample size increases role volatility."),
  ]);
  const uncertaintyBand =
    volatilityIndex >= 55 || input.sampleGames < 3
      ? "HIGH"
      : uncertaintyFromEvidence({ proxyCount: proxyCount([input.targetShareDelta, input.routeShareDelta]), sampleSize: input.sampleGames * 25, sourcePolicy: input.sourcePolicy });

  return {
    drivers,
    metricId: "gse-role-volatility",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
    volatilityIndex: round(volatilityIndex, 2),
  };
}

function driver(name: string, contribution: number, direction: MetricDriver["direction"], explanation: string): MetricDriver {
  return { contribution, direction, explanation, name };
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
