import { GSE_METRIC_BIRTH_CERTIFICATES } from "./metric-birth-certificate-registry.js";
import type { MetricLifecycleStatus } from "./validation.js";

export type GseMetricFamily =
  | "source"
  | "market"
  | "team"
  | "passing"
  | "receiving"
  | "rushing"
  | "role"
  | "environment"
  | "narrative"
  | "calibration"
  | "decision";

export type GseFormulaClass =
  | "linear"
  | "logistic"
  | "poisson"
  | "tweedie"
  | "hurdle"
  | "hierarchical_bayes"
  | "kalman"
  | "hidden_markov"
  | "gam_spline"
  | "ensemble"
  | "conformal"
  | "composite_score";

export type MetricValidationMethod =
  | "mae"
  | "rmse"
  | "brier"
  | "log_loss"
  | "ece"
  | "reliability_curve"
  | "spearman"
  | "kendall"
  | "clv"
  | "bucket_lift"
  | "walk_forward"
  | "drift_test"
  | "conformal_coverage";

export type MetricPublicExposure = "hidden" | "driver_only" | "grade_only" | "score_band" | "full_score" | "api_limited" | "api_full";

export interface GseMetricBirthCertificate {
  readonly metricId: string;
  readonly publicName: string;
  readonly internalName: string;
  readonly family: GseMetricFamily;
  readonly targetQuestion: string;
  readonly targetVariable: string;
  readonly historicalPrecedent: readonly {
    readonly name: string;
    readonly reason: string;
    readonly citationKey?: string;
  }[];
  readonly allowedInputs: readonly string[];
  readonly forbiddenInputs: readonly string[];
  readonly formulaClass: GseFormulaClass;
  readonly formulaSummary: string;
  readonly protectedComponents: readonly string[];
  readonly validationMethods: readonly MetricValidationMethod[];
  readonly failureModes: readonly string[];
  readonly publicExposure: MetricPublicExposure;
  readonly sourceRightsRequired: readonly string[];
  readonly status: MetricLifecycleStatus;
}

export { GSE_METRIC_BIRTH_CERTIFICATES };

export function metricBirthCertificate(metricId: string): GseMetricBirthCertificate | null {
  return GSE_METRIC_BIRTH_CERTIFICATES.find((certificate) => certificate.metricId === metricId) ?? null;
}

export function requireMetricBirthCertificate(metricId: string): GseMetricBirthCertificate {
  const certificate = metricBirthCertificate(metricId);
  if (certificate === null) throw new Error(`Missing metric birth certificate: ${metricId}`);
  return certificate;
}
