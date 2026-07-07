import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, normalizeClamped, round, weightedMean } from "../core/math.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type RoleVolatilityBand = "LOW" | "ELEVATED" | "HIGH" | "BLOCK";
export type RoleVolatilitySourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface RoleVolatilityIndexInput {
  readonly snapShareDelta: number;
  readonly targetShareDelta?: number;
  readonly carryShareDelta?: number;
  readonly routeShareDelta?: number;
  readonly depthChartShock?: boolean;
  readonly injuryStatusChanged?: boolean;
  readonly returnUncertainty?: number;
  readonly teammateRoleShock?: boolean;
  readonly usageAgeDays: number;
  readonly usageFreshnessTtlDays: number;
  readonly sampleGames: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface RoleVolatilityIndexMetric {
  readonly metricId: "role-volatility-index";
  readonly volatilityIndex: number;
  readonly volatilityBand: RoleVolatilityBand;
  readonly staleUsage: boolean;
  readonly roleSignalAllowed: boolean;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_ROLE_CERTAINTY_OR_PLAYER_QUALITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: RoleVolatilitySourcePosture;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function roleVolatilityIndex(input: RoleVolatilityIndexInput): RoleVolatilityIndexMetric {
  const ttl = Math.max(1, input.usageFreshnessTtlDays);
  const usageAge = Math.max(0, input.usageAgeDays);
  const staleUsage = usageAge >= ttl;
  const freshnessRisk = normalizeClamped(usageAge, 0, ttl);
  const snapShock = normalizeClamped(Math.abs(input.snapShareDelta), 0, 0.45);
  const targetShock = normalizeClamped(Math.abs(input.targetShareDelta ?? 0), 0, 0.35);
  const carryShock = normalizeClamped(Math.abs(input.carryShareDelta ?? 0), 0, 0.35);
  const routeShock = normalizeClamped(Math.abs(input.routeShareDelta ?? 0), 0, 0.45);
  const opportunityShock = Math.max(targetShock, carryShock);
  const depthShock = input.depthChartShock ? 1 : 0;
  const injuryShock = input.injuryStatusChanged ? 1 : 0;
  const returnUncertainty = clamp01(input.returnUncertainty ?? 0);
  const teammateShock = input.teammateRoleShock ? 1 : 0;
  const sampleRisk = 1 - normalizeClamped(input.sampleGames, 1, 8);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);

  const volatility = weightedMean([
    { value: snapShock, weight: 0.22 },
    { value: opportunityShock, weight: 0.18 },
    { value: routeShock, weight: 0.12 },
    { value: depthShock, weight: 0.12 },
    { value: injuryShock, weight: 0.1 },
    { value: returnUncertainty, weight: 0.08 },
    { value: teammateShock, weight: 0.07 },
    { value: sampleRisk, weight: 0.05 },
    { value: freshnessRisk, weight: 0.04 },
    { value: sourceRisk, weight: 0.02 },
  ]);
  const rawScore = volatility * 100;
  const volatilityIndexValue = round(staleUsage ? Math.max(85, rawScore) : rawScore, 2);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(sourceRisk, freshnessRisk) * 100,
    proxyCount: proxyCount([
      input.targetShareDelta,
      input.carryShareDelta,
      input.routeShareDelta,
      input.returnUncertainty,
    ]),
    sampleSize: input.sampleGames * 25,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("role-volatility-index"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_ROLE_CERTAINTY_OR_PLAYER_QUALITY",
    confidenceScore: confidenceFromEvidence(input.sampleGames, uncertaintyBand, Math.max(sourceRisk, freshnessRisk)),
    drivers: sortedDrivers([
      metricDriver({
        contribution: snapShock * 22,
        direction: snapShock > 0 ? "UP" : "NEUTRAL",
        explanation: "Snap-share movement increases role volatility.",
        name: "snap_share_volatility",
      }),
      metricDriver({
        contribution: opportunityShock * 18,
        direction: opportunityShock > 0 ? "UP" : "NEUTRAL",
        explanation: "Target or carry share movement increases opportunity volatility.",
        name: "opportunity_share_volatility",
      }),
      metricDriver({
        contribution: routeShock * 12,
        direction: routeShock > 0 ? "UP" : "NEUTRAL",
        explanation: "Route-share movement increases role volatility.",
        name: "route_share_volatility",
      }),
      metricDriver({
        contribution: depthShock * 12,
        direction: depthShock > 0 ? "UP" : "NEUTRAL",
        explanation: "Depth-chart shock increases role volatility.",
        name: "depth_chart_shock",
      }),
      metricDriver({
        contribution: injuryShock * 10 + returnUncertainty * 8,
        direction: injuryShock + returnUncertainty > 0 ? "UP" : "NEUTRAL",
        explanation: "Injury or return uncertainty increases role volatility.",
        name: "injury_return_uncertainty",
      }),
      metricDriver({
        contribution: teammateShock * 7,
        direction: teammateShock > 0 ? "UP" : "NEUTRAL",
        explanation: "Teammate role shock shifts available role and increases volatility.",
        name: "teammate_role_shock",
      }),
      metricDriver({
        contribution: sampleRisk * 5,
        direction: sampleRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Thin usage sample raises role-estimate volatility.",
        name: "sample_size_risk",
      }),
      metricDriver({
        contribution: freshnessRisk * 4,
        direction: freshnessRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Older role evidence increases stale-usage risk and can block role-signal use.",
        name: "usage_freshness_risk",
      }),
      metricDriver({
        contribution: sourceRisk * 2,
        direction: sourceRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Unclear or blocked source posture raises review pressure and uncertainty.",
        name: "source_posture_review_pressure",
      }),
    ]),
    metricId: "role-volatility-index",
    roleSignalAllowed: !staleUsage && sourceAllowed,
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(input.sourcePolicy, sourceRisk, sourceAllowed),
    staleUsage,
    status: "SHADOW",
    uncertaintyBand: staleUsage ? "HIGH" : uncertaintyBand,
    volatilityBand: staleUsage ? "BLOCK" : classifyVolatility(volatilityIndexValue),
    volatilityIndex: volatilityIndexValue,
  };
}

function classifyVolatility(score: number): RoleVolatilityBand {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "ELEVATED";
  return "LOW";
}

function confidenceFromEvidence(sampleGames: number, uncertaintyBand: MetricUncertaintyBand, reviewRisk: number): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 34;
  return round(Math.max(0, Math.min(100, base + Math.min(12, sampleGames * 1.5) - reviewRisk * 12)), 2);
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
  policies: readonly MetricSourcePolicy[],
  sourceRisk: number,
  sourceAllowed: boolean,
): RoleVolatilitySourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
