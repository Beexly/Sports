import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, protectedBasis, round, weightedMean } from "../core/math.js";
import { shrinkWeightedMean } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface ExpectedYacInput {
  readonly airYards: number;
  readonly separationYards?: number;
  readonly cushionYards?: number;
  readonly receiverYacPrior?: number;
  readonly inSpaceProxy?: number;
  readonly defenderLeverageProxy?: number;
  readonly redZone?: boolean;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface ExpectedYacMetric {
  readonly metricId: "expected-yac-gse";
  readonly expectedYac: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_YAC_CERTAINTY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function expectedYacGse(input: ExpectedYacInput): ExpectedYacMetric {
  const separation = normalizeClamped(input.separationYards ?? 2.5, 0, 7);
  const cushion = normalizeClamped(input.cushionYards ?? 5, 0, 10);
  const inSpace = clamp01(input.inSpaceProxy ?? 0.5);
  const defenderLeverage = clamp01(input.defenderLeverageProxy ?? 0.5);
  const depth = normalizeClamped(input.airYards, -5, 35);
  const depthBasis = protectedBasis(depth * 2 - 1);
  const receiverPrior = shrinkWeightedMean(
    [{ value: clamp(input.receiverYacPrior ?? 4.5, 0, 14) / 14, weight: input.sampleSize ?? 0 }],
    4.5 / 14,
    120,
  );
  const depthPenalty = weightedMean([
    { value: depthBasis[0] ?? 0, weight: 0.6 },
    { value: depthBasis[1] ?? 0, weight: 0.25 },
    { value: depthBasis[6] ?? 0, weight: 0.15 },
  ]);
  const redZonePenalty = input.redZone ? 0.8 : 0;
  const expectedYac = clamp(
    2.15 + 3.35 * inSpace + 3.4 * receiverPrior + 1.45 * separation + 0.75 * cushion - 1.95 * defenderLeverage - 0.8 * depthPenalty - redZonePenalty,
    0,
    18,
  );
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([input.separationYards, input.cushionYards, input.inSpaceProxy, input.defenderLeverageProxy]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("expected-yac-gse"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_YAC_CERTAINTY",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: inSpace * 33.5,
        direction: "UP",
        explanation: "Space proxy increases expected yards after catch.",
        name: "space_proxy",
      }),
      metricDriver({
        contribution: (receiverPrior - 4.5 / 14) * 34,
        direction: receiverPrior >= 4.5 / 14 ? "UP" : "DOWN",
        explanation: "Shrunk receiver YAC prior adjusts expected YAC.",
        name: "receiver_yac_prior",
      }),
      metricDriver({
        contribution: -defenderLeverage * 19.5,
        direction: "DOWN",
        explanation: "Defender leverage proxy lowers expected YAC.",
        name: "defender_leverage",
      }),
      metricDriver({
        contribution: -depthPenalty * 8,
        direction: depthPenalty <= 0 ? "UP" : "DOWN",
        explanation: "Protected depth basis lowers expected YAC on deeper targets.",
        name: "air_yards_depth",
      }),
    ]),
    expectedYac: round(expectedYac, 2),
    metricId: "expected-yac-gse",
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
