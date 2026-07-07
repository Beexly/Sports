import type { RollingConformalReport } from "../../conformal-intervals.js";
import { metricDriver, sortedDrivers, type MetricDriver, type MetricDriverInput } from "../core/driver.js";
import { clamp01, clampScore, normalizeClamped, round, weightedMean } from "../core/math.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type ConformalUncertaintyWidthBand = "TIGHT" | "WATCH" | "WIDE" | "BLOCKED";
export type ConformalUncertaintyWidthSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface ConformalUncertaintyIntervalInput {
  readonly lower: number;
  readonly upper: number;
  readonly covered: boolean;
}

export interface ConformalUncertaintyWidthInput {
  readonly intervals: readonly ConformalUncertaintyIntervalInput[];
  readonly targetCoverage: number;
  readonly expectedWidth: number;
  readonly severeWidth: number;
  readonly reportAgeDays: number;
  readonly reportFreshnessTtlDays: number;
  readonly minimumSampleSize: number;
  readonly driftPressure: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface ConformalUncertaintyWidthMetric {
  readonly metricId: "conformal-uncertainty-width";
  readonly score: number;
  readonly band: ConformalUncertaintyWidthBand;
  readonly meanWidth: number;
  readonly p90Width: number;
  readonly coverage: number;
  readonly coverageGap: number;
  readonly downstreamVetoRecommended: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "CONFORMAL_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: ConformalUncertaintyWidthSourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function conformalUncertaintyWidth(
  input: ConformalUncertaintyWidthInput,
): ConformalUncertaintyWidthMetric {
  const expectedWidth = Math.max(0.01, input.expectedWidth);
  const severeWidth = Math.max(expectedWidth + 0.01, input.severeWidth);
  const ttlDays = Math.max(1, input.reportFreshnessTtlDays);
  const minimumSampleSize = Math.max(1, input.minimumSampleSize);
  const intervals = validIntervals(input.intervals);
  const widths = intervals.map((interval) => interval.upper - interval.lower);
  const sampleSize = intervals.length;
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const coverage = sampleSize === 0 ? 0 : intervals.filter((interval) => interval.covered).length / sampleSize;
  const coverageGap = Math.max(0, clamp01(input.targetCoverage) - coverage);
  const meanWidth = mean(widths);
  const p90Width = percentile(widths, 0.9);
  const pressure = pressureComponents({
    coverageGap,
    driftPressure: input.driftPressure,
    expectedWidth,
    meanWidth,
    minimumSampleSize,
    p90Width,
    reportAgeDays: input.reportAgeDays,
    sampleSize,
    severeWidth,
    sourceRisk,
    ttlDays,
  });
  const blockReasons = hardBlockReasons({
    coverageGap,
    intervalCount: input.intervals.length,
    minimumSampleSize,
    reportAgeDays: input.reportAgeDays,
    sampleSize,
    sourceAllowed,
    targetCoverage: input.targetCoverage,
    ttlDays,
  });
  const rawScore = clampScore(100 * weightedMean([
    { value: pressure.meanWidthRisk, weight: 0.24 },
    { value: pressure.tailWidthRisk, weight: 0.18 },
    { value: pressure.coverageRisk, weight: 0.22 },
    { value: pressure.sampleRisk, weight: 0.1 },
    { value: pressure.staleRisk, weight: 0.08 },
    { value: pressure.driftRisk, weight: 0.1 },
    { value: sourceRisk, weight: 0.08 },
  ]));
  const score = round(blockReasons.length > 0 ? Math.max(85, rawScore) : rawScore, 2);
  const band = cuwBand(score, blockReasons.length > 0);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(score, input.driftPressure, pressure.coverageRisk * 100, sourceRisk * 100),
    proxyCount: 0,
    sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    band,
    birthCertificate: requireMetricBirthCertificate("conformal-uncertainty-width"),
    blockReasons,
    confidenceMeaning: "CONFORMAL_EVIDENCE_QUALITY_NOT_WIN_PROBABILITY",
    confidenceScore: confidenceFromEvidence(sampleSize, minimumSampleSize, uncertaintyBand, Math.max(pressure.coverageRisk, pressure.staleRisk, sourceRisk)),
    coverage: round(coverage, 4),
    coverageGap: round(coverageGap, 4),
    downstreamVetoRecommended: band === "WIDE" || band === "BLOCKED",
    drivers: buildDrivers(pressure, sourceRisk),
    meanWidth: round(meanWidth, 4),
    metricId: "conformal-uncertainty-width",
    p90Width: round(p90Width, 4),
    probability: null,
    score,
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(sourceRisk, sourceAllowed),
    status: "SHADOW",
    uncertaintyBand: band === "BLOCKED" ? "HIGH" : uncertaintyBand,
  };
}

export function conformalUncertaintyWidthFromReport(
  report: Pick<RollingConformalReport, "intervals" | "targetCoverage">,
  options: Omit<ConformalUncertaintyWidthInput, "intervals" | "targetCoverage">,
): ConformalUncertaintyWidthMetric {
  return conformalUncertaintyWidth({
    ...options,
    intervals: report.intervals.map((interval) => ({
      covered: interval.covered,
      lower: interval.lower,
      upper: interval.upper,
    })),
    targetCoverage: report.targetCoverage,
  });
}

interface ConformalPressureComponents {
  readonly coverageRisk: number;
  readonly driftRisk: number;
  readonly meanWidthRisk: number;
  readonly sampleRisk: number;
  readonly staleRisk: number;
  readonly tailWidthRisk: number;
}

function pressureComponents(input: {
  readonly coverageGap: number;
  readonly driftPressure: number;
  readonly expectedWidth: number;
  readonly meanWidth: number;
  readonly minimumSampleSize: number;
  readonly p90Width: number;
  readonly reportAgeDays: number;
  readonly sampleSize: number;
  readonly severeWidth: number;
  readonly sourceRisk: number;
  readonly ttlDays: number;
}): ConformalPressureComponents {
  return {
    coverageRisk: normalizeClamped(input.coverageGap, 0.02, 0.18),
    driftRisk: clampScore(input.driftPressure) / 100,
    meanWidthRisk: normalizeClamped(input.meanWidth, input.expectedWidth, input.severeWidth),
    sampleRisk: 1 - normalizeClamped(input.sampleSize, input.minimumSampleSize, input.minimumSampleSize * 4),
    staleRisk: normalizeClamped(input.reportAgeDays, 0, input.ttlDays),
    tailWidthRisk: normalizeClamped(input.p90Width, input.expectedWidth * 1.25, input.severeWidth * 1.35),
  };
}

function hardBlockReasons(input: {
  readonly coverageGap: number;
  readonly intervalCount: number;
  readonly minimumSampleSize: number;
  readonly reportAgeDays: number;
  readonly sampleSize: number;
  readonly sourceAllowed: boolean;
  readonly targetCoverage: number;
  readonly ttlDays: number;
}): readonly string[] {
  const reasons: string[] = [];
  if (!input.sourceAllowed) reasons.push("Source policy blocks conformal-interval use.");
  if (input.intervalCount === 0) reasons.push("No conformal intervals were supplied.");
  if (input.sampleSize < input.minimumSampleSize) reasons.push("Conformal interval sample is below minimum.");
  if (input.reportAgeDays >= input.ttlDays * 2) reasons.push("Conformal interval report is stale.");
  if (input.targetCoverage <= 0 || input.targetCoverage >= 1) reasons.push("Target coverage must be inside (0, 1).");
  if (input.coverageGap >= 0.25) reasons.push("Conformal intervals materially under-cover the target.");
  return reasons;
}

function buildDrivers(pressure: ConformalPressureComponents, sourceRisk: number): readonly MetricDriver[] {
  return sortedDrivers([
    pressureDriver("mean_interval_width", pressure.meanWidthRisk, 24, "Wider average conformal intervals raise uncertainty pressure."),
    pressureDriver("tail_interval_width", pressure.tailWidthRisk, 18, "Wide tail intervals reveal fragile segment-level uncertainty."),
    pressureDriver("coverage_gap", pressure.coverageRisk, 22, "Undercoverage is unsafe even when intervals look narrow."),
    pressureDriver("sample_shortfall", pressure.sampleRisk, 10, "Thin conformal evidence raises interval-width uncertainty."),
    pressureDriver("report_staleness", pressure.staleRisk, 8, "Older conformal reports lose decision usefulness."),
    pressureDriver("drift_pressure", pressure.driftRisk, 10, "Model/data drift raises uncertainty-width review pressure."),
    pressureDriver("source_posture", sourceRisk, 8, "Unclear or blocked source posture raises conformal evidence risk."),
  ]);
}

function pressureDriver(name: string, value: number, scale: number, explanation: string): MetricDriver {
  const input: MetricDriverInput = {
    contribution: value * scale,
    direction: value > 0 ? "UP" : "NEUTRAL",
    explanation,
    name,
  };
  return metricDriver(input);
}

function cuwBand(score: number, blocked: boolean): ConformalUncertaintyWidthBand {
  if (blocked) return "BLOCKED";
  if (score >= 70) return "WIDE";
  if (score >= 32) return "WATCH";
  return "TIGHT";
}

function confidenceFromEvidence(
  sampleSize: number,
  minimumSampleSize: number,
  uncertaintyBand: MetricUncertaintyBand,
  reviewRisk: number,
): number {
  const sampleSupport = normalizeClamped(sampleSize, minimumSampleSize, minimumSampleSize * 4);
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 34;
  return round(Math.max(0, Math.min(100, base + sampleSupport * 12 - reviewRisk * 14)), 2);
}

function validIntervals(intervals: readonly ConformalUncertaintyIntervalInput[]): readonly ConformalUncertaintyIntervalInput[] {
  return intervals.filter(
    (interval) =>
      Number.isFinite(interval.lower) &&
      Number.isFinite(interval.upper) &&
      interval.upper >= interval.lower,
  );
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * probability) - 1));
  return sorted[index] ?? 0;
}

function sourcePostureRisk(policies: readonly MetricSourcePolicy[]): number {
  if (policies.length === 0) return 1;
  const totalCleanliness = policies.reduce((sum, policy) => {
    const modelingMultiplier = policy.allowedForModeling ? 1 : 0;
    return sum + rightsCleanliness(policy.status) * modelingMultiplier;
  }, 0);
  return 1 - clamp01(totalCleanliness / policies.length);
}

function sourcePosture(
  sourceRisk: number,
  sourceAllowed: boolean,
): ConformalUncertaintyWidthSourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}
