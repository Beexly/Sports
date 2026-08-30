import { clampScore, round } from "./math.js";
import type { GseMetricAsset, GseModelCard, MetricDriftCard, MetricDriftCardStatus, MetricValidationReport } from "./metric-asset.js";
import type { MetricResidualRollup } from "./residual-rollup.js";

export type MetricDriftDirection = "HIGHER_IS_WORSE" | "LOWER_IS_WORSE";

export interface MetricModelCardInput {
  readonly asset: GseMetricAsset;
  readonly validationReport?: MetricValidationReport;
  readonly residualRollups?: readonly MetricResidualRollup[];
  readonly evidenceRefs?: readonly string[];
  readonly additionalLimitations?: readonly string[];
  readonly allowReadyStatus?: boolean;
}

export interface MetricDriftCheck {
  readonly name: string;
  readonly value: number;
  readonly watchThreshold: number;
  readonly severeThreshold: number;
  readonly direction?: MetricDriftDirection;
  readonly evidenceRef?: string;
}

export interface MetricDriftCardInput {
  readonly asset: GseMetricAsset;
  readonly checks?: readonly MetricDriftCheck[];
  readonly residualRollups?: readonly MetricResidualRollup[];
  readonly evidenceRefs?: readonly string[];
}

export function generateMetricModelCard(input: MetricModelCardInput): GseModelCard {
  const validationReport = input.validationReport ?? input.asset.validationReport;
  const residualRollups = input.residualRollups ?? [];
  const evidenceRefs = dedupeStrings([
    ...input.asset.evidenceRefs,
    ...validationReport.evidenceRefs,
    ...(input.evidenceRefs ?? []),
  ]);
  const hasEvidence =
    evidenceRefs.length > 0 ||
    validationReport.status !== "MISSING" ||
    residualRollups.length > 0;
  const status = modelCardStatus({
    allowReadyStatus: input.allowReadyStatus ?? false,
    evidenceRefs,
    residualRollups,
    validationReport,
  });

  return {
    evidenceRefs,
    limitations: dedupeStrings([
      ...input.asset.birthCertificate.failureModes,
      ...(input.additionalLimitations ?? []),
      ...modelCardLimitations(input, validationReport, residualRollups),
    ]),
    status: hasEvidence ? status : "MISSING",
    summary: modelCardSummary(input.asset, validationReport, residualRollups, status),
  };
}

export function generateMetricDriftCard(input: MetricDriftCardInput): MetricDriftCard {
  const checks = input.checks ?? [];
  const residualRollups = input.residualRollups ?? [];
  const checkStatuses = checks.map(driftCheckStatus);
  const status = driftCardStatus(checkStatuses, residualRollups);
  const driftScore = checks.length > 0 ? round(Math.max(...checks.map(driftScoreForCheck)), 2) : undefined;
  const checkEvidenceRefs = checks.flatMap((check) => (check.evidenceRef ? [check.evidenceRef] : []));

  return {
    driftScore,
    evidenceRefs: dedupeStrings([
      ...input.asset.evidenceRefs,
      ...checkEvidenceRefs,
      ...(input.evidenceRefs ?? []),
    ]),
    notes: driftCardNotes(input.asset.metricId, checks, checkStatuses, residualRollups, status),
    status,
  };
}

function modelCardStatus(input: {
  readonly allowReadyStatus: boolean;
  readonly evidenceRefs: readonly string[];
  readonly residualRollups: readonly MetricResidualRollup[];
  readonly validationReport: MetricValidationReport;
}): GseModelCard["status"] {
  if (!input.allowReadyStatus) return "DRAFT";
  if (input.validationReport.status !== "PASS") return "DRAFT";
  if (input.validationReport.sampleSize < input.validationReport.minimumSampleSize) return "DRAFT";
  if (input.evidenceRefs.length === 0) return "DRAFT";
  if (input.residualRollups.some((rollup) => rollup.sourceValidation.status === "FAIL_CLOSED")) return "DRAFT";
  return "READY";
}

function modelCardLimitations(
  input: MetricModelCardInput,
  validationReport: MetricValidationReport,
  residualRollups: readonly MetricResidualRollup[],
): readonly string[] {
  const limitations: string[] = [
    "Generated card does not approve public content, API exposure, licensing, betting use, or production promotion.",
  ];
  if (!(input.allowReadyStatus ?? false)) {
    limitations.push("Ready status is disabled by default; owner/governance approval is still required.");
  }
  if (validationReport.status !== "PASS") {
    limitations.push(`Validation status is ${validationReport.status}; metric remains evidence-incomplete.`);
  }
  if (residualRollups.some((rollup) => rollup.sourceValidation.status === "FAIL_CLOSED")) {
    limitations.push("At least one residual rollup has fail-closed source posture.");
  }
  if (residualRollups.some((rollup) => rollup.uncertaintyBand === "HIGH")) {
    limitations.push("At least one residual rollup has high uncertainty.");
  }
  return limitations;
}

function modelCardSummary(
  asset: GseMetricAsset,
  validationReport: MetricValidationReport,
  residualRollups: readonly MetricResidualRollup[],
  status: GseModelCard["status"],
): string {
  return [
    `${status} model card for ${asset.name} (${asset.metricId}).`,
    `Metric lifecycle is ${asset.birthCertificate.status}; generated evidence does not change lifecycle or exposure.`,
    `Validation status ${validationReport.status} with ${validationReport.sampleSize}/${validationReport.minimumSampleSize} samples.`,
    `Residual rollup evidence count: ${residualRollups.length}.`,
  ].join(" ");
}

function driftCardStatus(
  checkStatuses: readonly MetricDriftCardStatus[],
  residualRollups: readonly MetricResidualRollup[],
): MetricDriftCardStatus {
  if (checkStatuses.includes("SEVERE")) return "SEVERE";
  if (checkStatuses.includes("WATCH")) return "WATCH";
  if (residualRollups.some((rollup) => rollup.sourceValidation.status === "FAIL_CLOSED")) return "WATCH";
  if (residualRollups.some((rollup) => rollup.uncertaintyBand === "HIGH")) return "WATCH";
  if (checkStatuses.length === 0) return "MISSING";
  return "STABLE";
}

function driftCheckStatus(check: MetricDriftCheck): MetricDriftCardStatus {
  const direction = check.direction ?? "HIGHER_IS_WORSE";
  if (direction === "LOWER_IS_WORSE") {
    if (check.value <= check.severeThreshold) return "SEVERE";
    if (check.value <= check.watchThreshold) return "WATCH";
    return "STABLE";
  }
  if (check.value >= check.severeThreshold) return "SEVERE";
  if (check.value >= check.watchThreshold) return "WATCH";
  return "STABLE";
}

function driftScoreForCheck(check: MetricDriftCheck): number {
  const direction = check.direction ?? "HIGHER_IS_WORSE";
  if (direction === "LOWER_IS_WORSE") {
    if (check.watchThreshold <= check.severeThreshold) return check.value <= check.severeThreshold ? 100 : 0;
    const span = check.watchThreshold - check.severeThreshold;
    return clampScore(((check.watchThreshold - check.value) / span) * 40 + 60);
  }
  if (check.severeThreshold <= 0) return check.value >= check.severeThreshold ? 100 : 0;
  return clampScore((check.value / check.severeThreshold) * 100);
}

function driftCardNotes(
  metricId: string,
  checks: readonly MetricDriftCheck[],
  checkStatuses: readonly MetricDriftCardStatus[],
  residualRollups: readonly MetricResidualRollup[],
  status: MetricDriftCardStatus,
): readonly string[] {
  const notes: string[] = [
    `Generated ${status} drift card for ${metricId}; this does not promote metric lifecycle or exposure.`,
  ];
  if (checks.length === 0) notes.push("No explicit drift checks were supplied.");
  checks.forEach((check, index) => {
    notes.push(`${check.name}: value ${round(check.value, 4)} -> ${checkStatuses[index] ?? "MISSING"}.`);
  });
  if (residualRollups.length > 0) {
    notes.push(`Residual rollup evidence count: ${residualRollups.length}.`);
  }
  if (residualRollups.some((rollup) => rollup.sourceValidation.status === "FAIL_CLOSED")) {
    notes.push("At least one residual rollup has fail-closed source posture; source-rights review remains required.");
  }
  if (residualRollups.some((rollup) => rollup.uncertaintyBand === "HIGH")) {
    notes.push("At least one residual rollup has high uncertainty; keep shadow review active.");
  }
  return notes;
}

function dedupeStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
