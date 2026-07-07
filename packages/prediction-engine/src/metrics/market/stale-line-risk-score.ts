import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, normalizeClamped, round } from "../core/math.js";
import { rightsCleanliness, type MetricLifecycleStatus, type MetricSourceStatus } from "../core/validation.js";

export type StaleLineRiskBand = "LOW" | "WATCH" | "HIGH" | "BLOCK";

export interface StaleLineRiskInput {
  readonly lineAgeMinutes: number;
  readonly freshnessTtlMinutes: number;
  readonly sourceCount: number;
  readonly expectedSourceCount: number;
  readonly contradictionCount?: number;
  readonly rightsStatus?: MetricSourceStatus;
  readonly bookLines?: readonly number[];
  readonly openingLine?: number;
  readonly currentLine?: number;
  readonly marketType?: "spread" | "total" | "moneyline" | "prop";
}

export interface StaleLineRiskScore {
  readonly metricId: "stale-line-risk-score";
  readonly score: number;
  readonly band: StaleLineRiskBand;
  readonly stale: boolean;
  readonly marketSignalAllowed: boolean;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
}

export function staleLineRiskScore(input: StaleLineRiskInput): StaleLineRiskScore {
  const ttl = Math.max(1, input.freshnessTtlMinutes);
  const lineAge = Math.max(0, input.lineAgeMinutes);
  const stale = lineAge >= ttl;
  const ageRisk = normalizeClamped(lineAge, 0, ttl);
  const sourceCoverage = clamp01(Math.max(0, input.sourceCount) / Math.max(1, input.expectedSourceCount));
  const sourceCoverageRisk = 1 - sourceCoverage;
  const contradictionRisk = normalizeClamped(input.contradictionCount ?? 0, 0, 3);
  const rightsRisk = 1 - rightsCleanliness(input.rightsStatus ?? "unknown");
  const dispersionRisk = dispersionForMarket(input.bookLines ?? [], input.marketType ?? "spread");
  const movementRisk = movementForMarket(input.openingLine, input.currentLine, input.marketType ?? "spread");

  const baseRisk =
    100 *
    clamp01(
      0.4 * ageRisk +
        0.18 * sourceCoverageRisk +
        0.17 * contradictionRisk +
        0.17 * rightsRisk +
        0.05 * dispersionRisk +
        0.03 * movementRisk,
    );
  const score = stale ? Math.max(85, baseRisk) : baseRisk;
  const band = stale ? "BLOCK" : classifyRisk(score);
  const drivers = sortedDrivers([
    metricDriver({
      contribution: ageRisk * 40,
      direction: ageRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Older line snapshots increase stale-line risk and can block market-signal use.",
      name: "line_age_staleness",
    }),
    metricDriver({
      contribution: sourceCoverageRisk * 18,
      direction: sourceCoverageRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Low source coverage raises the risk that the current line is not representative.",
      name: "source_coverage_gap",
    }),
    metricDriver({
      contribution: contradictionRisk * 17,
      direction: contradictionRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Contradictory line sources increase market-state uncertainty.",
      name: "source_contradiction_pressure",
    }),
    metricDriver({
      contribution: rightsRisk * 17,
      direction: rightsRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Unclear or blocked source rights raise risk and prevent clean downstream use.",
      name: "source_rights_risk",
    }),
    metricDriver({
      contribution: dispersionRisk * 5,
      direction: dispersionRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Book dispersion raises stale-line risk because a single line may not represent the market.",
      name: "book_dispersion_risk",
    }),
    metricDriver({
      contribution: movementRisk * 3,
      direction: movementRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Large movement between open and current line raises audit pressure when freshness is weak.",
      name: "line_movement_audit_pressure",
    }),
  ]);

  return {
    band,
    birthCertificate: requireMetricBirthCertificate("stale-line-risk-score"),
    drivers,
    marketSignalAllowed: band !== "BLOCK",
    metricId: "stale-line-risk-score",
    score: round(score, 2),
    stale,
    status: "SHADOW",
  };
}

function classifyRisk(score: number): StaleLineRiskBand {
  if (score >= 75) return "HIGH";
  if (score >= 45) return "WATCH";
  return "LOW";
}

function movementForMarket(
  openingLine: number | undefined,
  currentLine: number | undefined,
  marketType: NonNullable<StaleLineRiskInput["marketType"]>,
): number {
  if (openingLine === undefined || currentLine === undefined) return 0;
  return normalizeClamped(Math.abs(currentLine - openingLine), 0, scaleForMarket(marketType));
}

function dispersionForMarket(
  bookLines: readonly number[],
  marketType: NonNullable<StaleLineRiskInput["marketType"]>,
): number {
  if (bookLines.length < 2) return 0;
  return normalizeClamped(standardDeviation(bookLines), 0, scaleForMarket(marketType) / 2);
}

function scaleForMarket(marketType: NonNullable<StaleLineRiskInput["marketType"]>): number {
  if (marketType === "moneyline") return 80;
  if (marketType === "prop") return 2.5;
  if (marketType === "total") return 5;
  return 4;
}

function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
