import { metricBirthCertificate, type GseMetricBirthCertificate } from "./metric-birth-certificate.js";
import { sourcePoliciesAllowed, type MetricSourcePolicy } from "./metric-core.js";

export type GseMetricValidationStatus = "FAIL_CLOSED" | "SHADOW_READY" | "REVIEW_READY";

export interface GseMetricValidationInput {
  readonly metricId: string;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
  readonly validationMethods: readonly string[];
  readonly sampleSize: number;
  readonly driftStatus?: "STABLE" | "WATCH" | "ALERT" | "BLOCKED";
  readonly certificate?: GseMetricBirthCertificate | null;
}

export interface GseMetricValidationResult {
  readonly metricId: string;
  readonly allowed: boolean;
  readonly status: GseMetricValidationStatus;
  readonly reasons: readonly string[];
  readonly missingValidationMethods: readonly string[];
  readonly certificate: GseMetricBirthCertificate | null;
}

export function validateGseMetric(input: GseMetricValidationInput): GseMetricValidationResult {
  const certificate = input.certificate ?? metricBirthCertificate(input.metricId);
  const reasons: string[] = [];
  if (certificate === null) reasons.push("Metric has no birth certificate.");
  if (!sourcePoliciesAllowed(input.sourcePolicy)) reasons.push("Source policy does not allow modeling.");
  if (input.sampleSize < 30) reasons.push("Validation sample size is below the local shadow threshold.");
  if (input.driftStatus === "ALERT" || input.driftStatus === "BLOCKED") reasons.push(`Metric drift status is ${input.driftStatus}.`);

  const required = certificate?.validationMethods ?? [];
  const normalizedProvided = new Set(input.validationMethods.map((method) => method.toLowerCase()));
  const missingValidationMethods = required.filter((method) => !normalizedProvided.has(method.toLowerCase()));
  if (missingValidationMethods.length > 0) reasons.push("Required validation methods are missing.");

  const allowed = reasons.length === 0;
  const status: GseMetricValidationStatus = !allowed ? "FAIL_CLOSED" : input.sampleSize >= 250 && input.driftStatus === "STABLE" ? "REVIEW_READY" : "SHADOW_READY";

  return {
    allowed,
    certificate,
    metricId: input.metricId,
    missingValidationMethods,
    reasons,
    status,
  };
}
