import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { clamp01, round } from "../core/math.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface RouteWinRateInput {
  readonly routesWon: number;
  readonly routesRun: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface RouteWinRateMetric {
  readonly metricId: "route-win-rate";
  readonly routeWinRate: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function routeWinRateScore(input: RouteWinRateInput): RouteWinRateMetric {
  const { routesWon, routesRun, sampleSize = 0, sourcePolicy } = input;
  const rawRate = routesRun > 0 ? routesWon / routesRun : 0;
  const clampedRate = clamp01(rawRate);

  const uncertaintyBand = uncertaintyFromEvidence({
    sampleSize,
    sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("route-win-rate"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT",
    confidenceScore: confidenceFromEvidence(sampleSize, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: clampedRate * 100,
        direction: "UP",
        explanation: "Proportion of routes won out of total routes run.",
        name: "route_win_rate",
      }),
    ]),
    metricId: "route-win-rate",
    routeWinRate: round(clampedRate, 4),
    sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 36;
  return round(Math.min(100, base + Math.min(12, sampleSize / 90)), 2);
}
