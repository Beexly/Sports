import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { round } from "../core/math.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface YprrInput {
  readonly receivingYards: number;
  readonly routesRun: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface YprrMetric {
  readonly metricId: "yprr";
  readonly yprr: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function yprrScore(input: YprrInput): YprrMetric {
  const { receivingYards, routesRun, sampleSize = 0, sourcePolicy } = input;
  const rawYprr = routesRun > 0 ? receivingYards / routesRun : 0;

  const uncertaintyBand = uncertaintyFromEvidence({
    sampleSize,
    sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("yprr"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT",
    confidenceScore: confidenceFromEvidence(sampleSize, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: rawYprr,
        direction: rawYprr > 0 ? "UP" : rawYprr < 0 ? "DOWN" : "NEUTRAL",
        explanation: "Receiving yards divided by total routes run.",
        name: "yprr_raw",
      }),
    ]),
    metricId: "yprr",
    yprr: round(rawYprr, 4),
    sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 36;
  return round(Math.min(100, base + Math.min(12, sampleSize / 90)), 2);
}
