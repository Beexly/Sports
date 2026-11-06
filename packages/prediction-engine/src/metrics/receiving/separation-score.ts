import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { clamp, round } from "../core/math.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface SeparationScoreInput {
  readonly separationAtTarget?: number;
  readonly separationAtCatchPoint?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface SeparationScoreMetric {
  readonly metricId: "separation-score";
  readonly separationScore: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function separationScoreScore(input: SeparationScoreInput): SeparationScoreMetric {
  const { separationAtTarget, separationAtCatchPoint, sampleSize = 0, sourcePolicy } = input;

  // Use a weighted blend if both are provided, or fall back to one, or 0 if neither.
  let rawScore = 0;
  if (separationAtTarget !== undefined && separationAtCatchPoint !== undefined) {
    rawScore = (separationAtTarget * 0.6) + (separationAtCatchPoint * 0.4);
  } else if (separationAtTarget !== undefined) {
    rawScore = separationAtTarget;
  } else if (separationAtCatchPoint !== undefined) {
    rawScore = separationAtCatchPoint;
  }

  // Assuming typical separation values range between 0 and 10 yards.
  const finalScore = clamp(rawScore, 0, 10);

  const proxyCount = (separationAtTarget === undefined ? 1 : 0) + (separationAtCatchPoint === undefined ? 1 : 0);

  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount,
    sampleSize,
    sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("separation-score"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT",
    confidenceScore: confidenceFromEvidence(sampleSize, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: finalScore,
        direction: "UP",
        explanation: "Separation score from available tracking data.",
        name: "separation_score_raw",
      }),
    ]),
    metricId: "separation-score",
    separationScore: round(finalScore, 4),
    sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 36;
  return round(Math.min(100, base + Math.min(12, sampleSize / 90)), 2);
}
