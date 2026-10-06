import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { clamp01, round } from "../core/math.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface ContestedCatchRateInput {
  readonly contestedCatches: number;
  readonly contestedTargets: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface ContestedCatchRateMetric {
  readonly metricId: "contested-catch-rate";
  readonly contestedCatchRate: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function contestedCatchRateScore(input: ContestedCatchRateInput): ContestedCatchRateMetric {
  const { contestedCatches, contestedTargets, sampleSize = 0, sourcePolicy } = input;
  const rawRate = contestedTargets > 0 ? contestedCatches / contestedTargets : 0;
  const clampedRate = clamp01(rawRate);

  const uncertaintyBand = uncertaintyFromEvidence({
    sampleSize,
    sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("contested-catch-rate"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT",
    confidenceScore: confidenceFromEvidence(sampleSize, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: clampedRate * 100,
        direction: "UP",
        explanation: "Proportion of contested targets successfully caught.",
        name: "contested_catch_rate",
      }),
    ]),
    metricId: "contested-catch-rate",
    contestedCatchRate: round(clampedRate, 4),
    sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 36;
  return round(Math.min(100, base + Math.min(12, sampleSize / 90)), 2);
}
