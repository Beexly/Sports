import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, clampScore, round } from "../core/math.js";
import { rightsCleanliness, type MetricLifecycleStatus, type MetricSourceStatus } from "../core/validation.js";

export type DataReliabilityGrade = "HIGH" | "MEDIUM" | "LOW" | "BLOCKED";

export interface DataReliabilityInput {
  readonly sourceAgeMinutes?: number;
  readonly ttlMinutes: number;
  readonly sourceCount: number;
  readonly expectedSourceCount: number;
  readonly providerTrustScore: number;
  readonly rightsStatus: MetricSourceStatus;
  readonly contradictionCount?: number;
  readonly missingRequiredFields?: number;
}

export interface DataReliabilityIndex {
  readonly metricId: "data-reliability-index";
  readonly score: number;
  readonly grade: DataReliabilityGrade;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
}

export function dataReliabilityIndex(input: DataReliabilityInput): DataReliabilityIndex {
  const ttl = Math.max(1, input.ttlMinutes);
  const freshnessScore = freshness(input.sourceAgeMinutes, ttl);
  const coverageScore =
    !Number.isFinite(input.sourceCount) || !Number.isFinite(input.expectedSourceCount) || input.expectedSourceCount <= 0
      ? 0
      : clamp01(input.sourceCount / input.expectedSourceCount);
  const providerTrustScore = clamp01(Number.isFinite(input.providerTrustScore) ? input.providerTrustScore : 0);
  const rightsScore = rightsCleanliness(input.rightsStatus);
  const contradictionPenalty = Math.min(0.5, 0.2 * Math.max(0, input.contradictionCount ?? 0));
  const missingPenalty = Math.min(0.4, 0.08 * Math.max(0, input.missingRequiredFields ?? 0));
  const raw =
    0.38 * freshnessScore +
    0.22 * coverageScore +
    0.2 * providerTrustScore +
    0.2 * rightsScore -
    contradictionPenalty -
    missingPenalty;
  const score = clampScore(100 * clamp(raw, 0, 1));
  const grade = gradeReliability(score, rightsScore);
  const drivers = sortedDrivers([
    metricDriver({ contribution: freshnessScore * 38, direction: "UP", explanation: "Freshness raises reliability when data is inside its TTL.", name: "freshness" }),
    metricDriver({ contribution: coverageScore * 22, direction: "UP", explanation: "More expected sources covered raises reliability.", name: "coverage" }),
    metricDriver({ contribution: providerTrustScore * 20, direction: "UP", explanation: "Provider trust raises reliability.", name: "provider_trust" }),
    metricDriver({
      contribution: (rightsScore - 1) * 20,
      direction: rightsScore < 1 ? "DOWN" : "NEUTRAL",
      explanation: "Source-rights cleanliness controls whether data can influence decisions.",
      name: "rights_cleanliness",
    }),
    metricDriver({
      contribution: -contradictionPenalty * 100,
      direction: contradictionPenalty > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Contradictions reduce reliability.",
      name: "contradictions",
    }),
    metricDriver({
      contribution: -missingPenalty * 100,
      direction: missingPenalty > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Missing required fields reduce reliability.",
      name: "missing_required_fields",
    }),
  ]);

  return {
    birthCertificate: requireMetricBirthCertificate("data-reliability-index"),
    drivers,
    grade,
    metricId: "data-reliability-index",
    score: round(score, 2),
    status: "SHADOW",
  };
}

function freshness(sourceAgeMinutes: number | undefined, ttlMinutes: number): number {
  if (sourceAgeMinutes === undefined || !Number.isFinite(sourceAgeMinutes)) return 0;
  if (sourceAgeMinutes <= 0.5 * ttlMinutes) return 1;
  if (sourceAgeMinutes <= ttlMinutes) return 0.65;
  return 0.15;
}

function gradeReliability(score: number, rightsScore: number): DataReliabilityGrade {
  if (rightsScore <= 0 || score < 25) return "BLOCKED";
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}
