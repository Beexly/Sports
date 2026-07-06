import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clampScore, round } from "../core/math.js";
import { shrinkWeightedMean } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface RushOverExpectedInput {
  readonly actualRushYards: number;
  readonly expectedRushYards: number;
  readonly rusherRushOverExpectedPrior?: number;
  readonly brokenTackleProxy?: number;
  readonly yardsAfterContactProxy?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface RushOverExpectedMetric {
  readonly metricId: "rush-over-expected-gse";
  readonly rushYardsOverExpected: number;
  readonly creationIndex: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_REPEATABLE_RUSH_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function rushOverExpectedGse(input: RushOverExpectedInput): RushOverExpectedMetric {
  const actual = clamp(input.actualRushYards, -10, 99);
  const expected = clamp(input.expectedRushYards, -2, 18);
  const residual = clamp(actual - expected, -20, 50);
  const priorResidual = shrinkWeightedMean(
    [{ value: clamp(input.rusherRushOverExpectedPrior ?? 0, -8, 8), weight: input.sampleSize ?? 0 }],
    0,
    140,
  );
  const brokenTackleLift = clamp(input.brokenTackleProxy ?? 0, 0, 1) * 0.95;
  const contactLift = clamp(input.yardsAfterContactProxy ?? 0, 0, 8) * 0.16;
  const rushYardsOverExpected = clamp(0.76 * residual + 0.18 * priorResidual + brokenTackleLift + contactLift, -24, 55);
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([input.rusherRushOverExpectedPrior, input.brokenTackleProxy, input.yardsAfterContactProxy]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("rush-over-expected-gse"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_REPEATABLE_RUSH_TALENT",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    creationIndex: round(clampScore(50 + rushYardsOverExpected * 4), 2),
    drivers: sortedDrivers([
      metricDriver({
        contribution: residual * 4,
        direction: residual >= 0 ? "UP" : "DOWN",
        explanation: "Actual rushing yards above GSE expected rush yards raises RYOE; below expectation lowers it.",
        name: "rush_yards_residual",
      }),
      metricDriver({
        contribution: priorResidual * 3,
        direction: priorResidual >= 0 ? "UP" : "DOWN",
        explanation: "Shrunk rusher RYOE prior stabilizes noisy one-carry residuals.",
        name: "rusher_ryoe_prior",
      }),
      metricDriver({
        contribution: brokenTackleLift * 10,
        direction: "UP",
        explanation: "Broken-tackle proxy can add rushing creation credit when source-cleared.",
        name: "broken_tackle_proxy",
      }),
      metricDriver({
        contribution: contactLift * 10,
        direction: "UP",
        explanation: "Yards-after-contact proxy can add creation credit when source-cleared.",
        name: "yards_after_contact_proxy",
      }),
    ]),
    metricId: "rush-over-expected-gse",
    rushYardsOverExpected: round(rushYardsOverExpected, 2),
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 80 : uncertaintyBand === "MEDIUM" ? 58 : 34;
  return round(Math.min(100, base + Math.min(12, sampleSize / 100)), 2);
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
