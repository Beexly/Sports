import {
  GSE_METRIC_BIRTH_CERTIFICATES,
  metricBirthCertificate,
  type GseMetricBirthCertificate,
} from "./metric-birth-certificate.js";

export type MetricApiExposure = "NONE" | "INTERNAL" | "CONTENT_AGGREGATE" | "API_LIMITED" | "API_FULL";
export type MetricLicensingStatus = "NOT_READY" | "REVIEW_READY" | "LICENSABLE";
export type MetricEvidenceStatus = "MISSING" | "DRAFT" | "READY";
export type MetricValidationReportStatus = "MISSING" | "INSUFFICIENT" | "PASS" | "FAIL";
export type MetricDriftCardStatus = "MISSING" | "STABLE" | "WATCH" | "SEVERE";

export interface SourceRightsEnvelope {
  readonly sourceId: string;
  readonly mayUseForModeling: boolean;
  readonly mayValidateAgainst: boolean;
  readonly mayExposeDerived: boolean;
  readonly mayExposeRaw: boolean;
  readonly attributionRequired?: string;
  readonly notes: readonly string[];
}

export interface GseModelCard {
  readonly status: MetricEvidenceStatus;
  readonly summary: string;
  readonly limitations: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface MetricValidationMeasure {
  readonly name: string;
  readonly value: number;
  readonly passed: boolean;
  readonly threshold?: number;
}

export interface MetricValidationReport {
  readonly status: MetricValidationReportStatus;
  readonly sampleSize: number;
  readonly minimumSampleSize: number;
  readonly measures: readonly MetricValidationMeasure[];
  readonly evidenceRefs: readonly string[];
}

export interface MetricDriftCard {
  readonly status: MetricDriftCardStatus;
  readonly driftScore?: number;
  readonly notes: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface GseMetricAsset {
  readonly metricId: string;
  readonly name: string;
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourceRights: readonly SourceRightsEnvelope[];
  readonly modelCard: GseModelCard;
  readonly validationReport: MetricValidationReport;
  readonly driftCard: MetricDriftCard;
  readonly apiExposure: MetricApiExposure;
  readonly licensingStatus: MetricLicensingStatus;
  readonly evidenceRefs: readonly string[];
}

export const GSE_METRIC_ASSETS: readonly GseMetricAsset[] = GSE_METRIC_BIRTH_CERTIFICATES.map((certificate) =>
  shadowAsset(certificate),
);

export function metricAsset(metricId: string): GseMetricAsset | null {
  return GSE_METRIC_ASSETS.find((asset) => asset.metricId === metricId) ?? null;
}

export function requireMetricAsset(metricId: string): GseMetricAsset {
  const asset = metricAsset(metricId);
  if (asset !== null) return asset;
  const certificate = metricBirthCertificate(metricId);
  if (certificate === null) throw new Error(`Missing metric asset: ${metricId}`);
  return shadowAsset(certificate);
}

function shadowAsset(certificate: GseMetricBirthCertificate): GseMetricAsset {
  return {
    apiExposure: "INTERNAL",
    birthCertificate: certificate,
    driftCard: {
      evidenceRefs: [],
      notes: ["No drift card has been generated for this shadow metric."],
      status: "MISSING",
    },
    evidenceRefs: ["docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md"],
    licensingStatus: "NOT_READY",
    metricId: certificate.metricId,
    modelCard: {
      evidenceRefs: [],
      limitations: certificate.failureModes,
      status: "MISSING",
      summary: "Shadow metric asset shell. Model card evidence is required before promotion.",
    },
    name: certificate.publicName,
    sourceRights: certificate.sourceRightsRequired.map((requirement) => ({
      mayExposeDerived: false,
      mayExposeRaw: false,
      mayUseForModeling: true,
      mayValidateAgainst: false,
      notes: [`Requirement retained: ${requirement}`],
      sourceId: requirement,
    })),
    validationReport: {
      evidenceRefs: [],
      measures: [],
      minimumSampleSize: 1,
      sampleSize: 0,
      status: "MISSING",
    },
  };
}
