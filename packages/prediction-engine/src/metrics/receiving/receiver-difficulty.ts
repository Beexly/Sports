import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, normalizeClamped, round, weightedMean } from "../core/math.js";
import { shrinkProbability } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface ReceiverDifficultyInput {
  readonly expectedCompletionProbability: number;
  readonly airYards: number;
  readonly separationYards?: number;
  readonly cushionYards?: number;
  readonly contestedCatchProxy?: number;
  readonly sidelineProxy?: number;
  readonly receiverPriorDifficulty?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface ReceiverDifficultyMetric {
  readonly metricId: "receiver-difficulty-index";
  readonly difficultyIndex: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function receiverDifficultyIndex(input: ReceiverDifficultyInput): ReceiverDifficultyMetric {
  const completionDifficulty = 1 - clamp01(input.expectedCompletionProbability);
  const depthDifficulty = normalizeClamped(input.airYards, 0, 45);
  const separationDifficulty = 1 - normalizeClamped(input.separationYards ?? 2.5, 0, 7);
  const cushionDifficulty = 1 - normalizeClamped(input.cushionYards ?? 5, 0, 10);
  const contested = clamp01(input.contestedCatchProxy ?? 0);
  const sideline = clamp01(input.sidelineProxy ?? 0);
  const priorDifficulty = shrinkProbability({
    observed: input.receiverPriorDifficulty ?? 0.5,
    prior: 0.5,
    priorStrength: 120,
    sampleSize: input.sampleSize ?? 0,
  });
  const difficulty = weightedMean([
    { value: completionDifficulty, weight: 0.34 },
    { value: depthDifficulty, weight: 0.2 },
    { value: separationDifficulty, weight: 0.18 },
    { value: cushionDifficulty, weight: 0.08 },
    { value: contested, weight: 0.1 },
    { value: sideline, weight: 0.06 },
    { value: priorDifficulty, weight: 0.04 },
  ]);
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([input.separationYards, input.cushionYards, input.contestedCatchProxy, input.sidelineProxy]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("receiver-difficulty-index"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    difficultyIndex: round(difficulty * 100, 2),
    drivers: sortedDrivers([
      metricDriver({
        contribution: completionDifficulty * 34,
        direction: "UP",
        explanation: "Lower expected completion increases target difficulty.",
        name: "completion_difficulty",
      }),
      metricDriver({
        contribution: depthDifficulty * 20,
        direction: "UP",
        explanation: "Deeper targets increase receiver difficulty.",
        name: "air_yards_depth",
      }),
      metricDriver({
        contribution: separationDifficulty * 18,
        direction: "UP",
        explanation: "Lower separation proxy increases receiver difficulty.",
        name: "separation_proxy",
      }),
      metricDriver({
        contribution: contested * 10,
        direction: "UP",
        explanation: "Contested-catch proxy increases difficulty.",
        name: "contested_proxy",
      }),
    ]),
    metricId: "receiver-difficulty-index",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 36;
  return round(Math.min(100, base + Math.min(12, sampleSize / 90)), 2);
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
