import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clampScore, round } from "../core/math.js";
import { shrinkWeightedMean } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface YacCreationInput {
  readonly actualYardsAfterCatch: number;
  readonly expectedYac: number;
  readonly receiverYacOverExpectedPrior?: number;
  readonly brokenTackleProxy?: number;
  readonly contactBalanceProxy?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface YacCreationMetric {
  readonly metricId: "yac-creation-gse";
  readonly yacOverExpected: number;
  readonly creationIndex: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_REPEATABLE_SKILL";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function yacCreationGse(input: YacCreationInput): YacCreationMetric {
  const expected = clamp(input.expectedYac, 0, 18);
  const actual = clamp(input.actualYardsAfterCatch, -5, 80);
  const residual = clamp(actual - expected, -18, 40);
  const priorResidual = shrinkWeightedMean(
    [{ value: clamp(input.receiverYacOverExpectedPrior ?? 0, -8, 8), weight: input.sampleSize ?? 0 }],
    0,
    120,
  );
  const brokenTackleLift = clamp(input.brokenTackleProxy ?? 0, 0, 1) * 1.1;
  const contactBalanceLift = clamp(input.contactBalanceProxy ?? 0, 0, 1) * 0.75;
  const yacOverExpected = clamp(0.74 * residual + 0.18 * priorResidual + brokenTackleLift + contactBalanceLift, -20, 40);
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([input.brokenTackleProxy, input.contactBalanceProxy]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("yac-creation-gse"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_REPEATABLE_SKILL",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    creationIndex: round(clampScore(50 + yacOverExpected * 4), 2),
    drivers: sortedDrivers([
      metricDriver({
        contribution: 0.74 * residual * 4,
        direction: residual >= 0 ? "UP" : "DOWN",
        explanation: "Actual YAC above GSE expected YAC raises creation; below expectation lowers it.",
        name: "yac_residual",
      }),
      metricDriver({
        contribution: 0.18 * priorResidual * 4,
        direction: priorResidual >= 0 ? "UP" : "DOWN",
        explanation: "Shrunk receiver YAC-over-expected prior stabilizes noisy one-play residuals.",
        name: "receiver_yac_creation_prior",
      }),
      metricDriver({
        contribution: brokenTackleLift * 4,
        direction: "UP",
        explanation: "Broken-tackle proxy can add post-catch creation credit when source-cleared.",
        name: "broken_tackle_proxy",
      }),
      metricDriver({
        contribution: contactBalanceLift * 4,
        direction: "UP",
        explanation: "Contact-balance proxy can add creation credit when source-cleared.",
        name: "contact_balance_proxy",
      }),
    ]),
    metricId: "yac-creation-gse",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
    yacOverExpected: round(yacOverExpected, 2),
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 80 : uncertaintyBand === "MEDIUM" ? 58 : 34;
  return round(Math.min(100, base + Math.min(12, sampleSize / 100)), 2);
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
