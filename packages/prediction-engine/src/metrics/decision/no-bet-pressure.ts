import { computeNoBetStrength, type NoBetDecision, type NoBetRiskInput } from "../../gse-score/no-bet-strength.js";
import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, clampScore, round, weightedMean } from "../core/math.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type NoBetPressureBand = "CLEAR" | "WATCH" | "SOFT_PASS" | "HARD_PASS";
export type NoBetPressureSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface NoBetPressureInput {
  readonly dataReliabilityIndex: number;
  readonly staleLineRiskScore: number;
  readonly marketSignalAllowed: boolean;
  readonly calibrationIntegrityGrade: number;
  readonly calibrationDebt: number;
  readonly driftPressure: number;
  readonly modelDisagreement: number;
  readonly sourceContradictionPressure: number;
  readonly missingRequiredDataPressure: number;
  readonly lowEvidencePressure: number;
  readonly marketMirageScore?: number;
  readonly roleVolatilityIndex?: number;
  readonly responsibleGamingPressure?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface NoBetPressureMetric {
  readonly metricId: "no-bet-pressure";
  readonly score: number;
  readonly band: NoBetPressureBand;
  readonly noBetRecommended: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "REFUSAL_PRESSURE_NOT_WIN_PROBABILITY_EV_OR_BET_ADVICE";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: NoBetPressureSourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

/**
 * No-Bet Pressure — calibrated refusal-pressure metric for the decision layer.
 *
 * Answers one question: "How strongly should we decline to act on this game or
 * prop right now?" It is deliberately NOT a win probability, an expected-value
 * estimate, or bet advice — `confidenceMeaning` is pinned to
 * REFUSAL_PRESSURE_NOT_WIN_PROBABILITY_EV_OR_BET_ADVICE and `probability` is
 * always null by construction.
 *
 * Inputs: every `*Pressure` / `*Score` / `*Grade` / `*Index` field is a 0–100
 * score (0 = clean / no pressure, 100 = maximal pressure), with the single
 * exception of `modelDisagreement`, which is a 0–1 fraction. `marketSignalAllowed`
 * is a freshness/rights gate and `sourcePolicy` carries the per-source rights
 * posture. The optional proxy inputs (`marketMirageScore`, `roleVolatilityIndex`,
 * `responsibleGamingPressure`) default to absent/0 and only add pressure when
 * present and strictly positive.
 *
 * Output `score` is calibrated refusal pressure on 0–100 (higher = refuse
 * harder), rounded to 2 dp. `band` uses fixed cutpoints:
 *   CLEAR [0,30) → WATCH [30,60) → SOFT_PASS [60,85) → HARD_PASS [85,100].
 * Any hard block forces the HARD_PASS decision regardless of the additive
 * score: a blocked market signal (`marketSignalAllowed=false`) or blocked
 * source rights, missing/stale/low-evidence pressure at or above its floor,
 * calibration collapse (`calibrationIntegrityGrade<=20` or `calibrationDebt>=80`),
 * or ANY responsible-gaming pressure (> 0). When the decision is HARD_PASS the
 * reported `score` is floored to `max(85, score)` so the number can never
 * under-state a hard refusal, and `uncertaintyBand` is forced to HIGH.
 * `noBetRecommended` is true for SOFT_PASS and HARD_PASS.
 *
 * `confidenceScore` measures evidence quality — how much we trust the pressure
 * reading — NOT how likely any bet is to win; it is orthogonal to `score`.
 * The metric always returns a value (never null): with thin or blocked evidence
 * it emits high pressure at HIGH uncertainty rather than declining to answer.
 * Limitation: `drivers` is an ordered attribution of the largest pressure
 * contributors, not an exact decomposition of `score` (the underlying strength
 * model and the HARD_PASS floor can diverge from the driver sum). `status` is
 * SHADOW — computed and audited but not yet priced.
 */
export function noBetPressureMetric(input: NoBetPressureInput): NoBetPressureMetric {
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const risks = buildRisks(input, sourceAllowed);
  const evidenceHealth = evidenceHealthScore(input, sourceRisk);
  const strength = computeNoBetStrength({ evidenceHealth, risks });
  const score = round(strength.decision === "HARD_PASS" ? Math.max(85, strength.score) : strength.score, 2);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(input.driftPressure, input.calibrationDebt, sourceRisk * 100),
    proxyCount: proxyCount([input.marketMirageScore, input.roleVolatilityIndex, input.responsibleGamingPressure]),
    sampleSize: Math.max(1, evidenceHealth) * 3,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    band: decisionToBand(strength.decision, score),
    birthCertificate: requireMetricBirthCertificate("no-bet-pressure"),
    blockReasons: strength.hardPassReasons,
    confidenceMeaning: "REFUSAL_PRESSURE_NOT_WIN_PROBABILITY_EV_OR_BET_ADVICE",
    confidenceScore: confidenceFromEvidence(evidenceHealth, uncertaintyBand, Math.max(sourceRisk, normalizeScore(input.staleLineRiskScore), normalizeScore(input.driftPressure))),
    drivers: buildDrivers(input, sourceRisk, strength.decision),
    metricId: "no-bet-pressure",
    noBetRecommended: strength.decision === "SOFT_PASS" || strength.decision === "HARD_PASS",
    probability: null,
    score,
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(sourceRisk, sourceAllowed),
    status: "SHADOW",
    uncertaintyBand: strength.decision === "HARD_PASS" ? "HIGH" : uncertaintyBand,
  };
}

function buildRisks(input: NoBetPressureInput, sourceAllowed: boolean): readonly NoBetRiskInput[] {
  const risks: NoBetRiskInput[] = [];
  pushRisk(risks, input.missingRequiredDataPressure, "MISSING_REQUIRED_DATA", "Missing required data raises no-bet pressure.", 85);
  pushRisk(risks, input.staleLineRiskScore, "STALE_DATA", "Stale market or source data raises no-bet pressure.", 85);
  pushRisk(risks, input.lowEvidencePressure, "LOW_EVIDENCE", "Low evidence support raises no-bet pressure.", 85);
  pushRisk(risks, input.driftPressure, "MARKET_VOLATILITY", "Drift pressure raises refusal pressure.", 90);
  pushRisk(risks, input.responsibleGamingPressure ?? 0, "RESPONSIBLE_GAMING", "Responsible-gaming pressure requires refusal.", 60);

  if (!input.marketSignalAllowed) {
    risks.push({ factor: "STALE_DATA", hardBlock: true, reason: "Market signal is not allowed because freshness or rights checks failed.", severity: 1 });
  }
  if (!sourceAllowed) {
    risks.push({ factor: "SOURCE_RIGHTS_BLOCKED", hardBlock: true, reason: "Source policy blocks downstream decision use.", severity: 1 });
  }
  if (input.calibrationIntegrityGrade < 60 || input.calibrationDebt > 20) {
    risks.push({
      factor: "CALIBRATION_NOT_VALIDATED",
      hardBlock: input.calibrationIntegrityGrade <= 20 || input.calibrationDebt >= 80,
      reason: "Calibration integrity is not strong enough for downstream action quality.",
      severity: Math.max(normalizeScore(100 - input.calibrationIntegrityGrade), normalizeScore(input.calibrationDebt)),
    });
  }
  if (input.modelDisagreement > 0) {
    risks.push({
      factor: "MODEL_DISAGREEMENT",
      reason: "Model parliament disagreement raises refusal pressure.",
      severity: clamp01(input.modelDisagreement),
    });
  }
  if ((input.marketMirageScore ?? 0) > 0 || input.sourceContradictionPressure > 0) {
    risks.push({
      factor: "MARKET_VOLATILITY",
      reason: "Market mirage or source contradiction pressure raises refusal pressure.",
      severity: Math.max(normalizeScore(input.marketMirageScore ?? 0), normalizeScore(input.sourceContradictionPressure)),
    });
  }
  return risks;
}

function pushRisk(
  risks: NoBetRiskInput[],
  score: number,
  factor: NoBetRiskInput["factor"],
  reason: string,
  hardBlockAt: number,
): void {
  if (score <= 0) return;
  risks.push({ factor, hardBlock: score >= hardBlockAt, reason, severity: normalizeScore(score) });
}

function buildDrivers(input: NoBetPressureInput, sourceRisk: number, decision: NoBetDecision): readonly MetricDriver[] {
  const staleRisk = normalizeScore(input.staleLineRiskScore);
  const missingRisk = normalizeScore(input.missingRequiredDataPressure);
  const contradictionRisk = normalizeScore(input.sourceContradictionPressure);
  const calibrationRisk = Math.max(normalizeScore(100 - input.calibrationIntegrityGrade), normalizeScore(input.calibrationDebt));
  const driftRisk = normalizeScore(input.driftPressure);
  const evidenceRisk = normalizeScore(input.lowEvidencePressure);
  const gamingRisk = normalizeScore(input.responsibleGamingPressure ?? 0);
  return sortedDrivers([
    metricDriver({ contribution: missingRisk * 24, direction: missingRisk > 0 ? "UP" : "NEUTRAL", explanation: "Missing required data raises refusal pressure.", name: "missing_required_data" }),
    metricDriver({ contribution: staleRisk * 20, direction: staleRisk > 0 ? "UP" : "NEUTRAL", explanation: "Stale data raises refusal pressure.", name: "stale_data" }),
    metricDriver({ contribution: sourceRisk * 18, direction: sourceRisk > 0 ? "UP" : "NEUTRAL", explanation: "Unclear or blocked source posture raises refusal pressure.", name: "source_posture" }),
    metricDriver({ contribution: calibrationRisk * 16, direction: calibrationRisk > 0 ? "UP" : "NEUTRAL", explanation: "Calibration debt or weak integrity raises refusal pressure.", name: "calibration_pressure" }),
    metricDriver({ contribution: driftRisk * 14, direction: driftRisk > 0 ? "UP" : "NEUTRAL", explanation: "Drift pressure raises refusal pressure.", name: "drift_pressure" }),
    metricDriver({ contribution: contradictionRisk * 12, direction: contradictionRisk > 0 ? "UP" : "NEUTRAL", explanation: "Source contradictions raise refusal pressure.", name: "source_contradiction" }),
    metricDriver({ contribution: evidenceRisk * 10, direction: evidenceRisk > 0 ? "UP" : "NEUTRAL", explanation: "Low evidence support raises refusal pressure.", name: "low_evidence" }),
    metricDriver({ contribution: gamingRisk * 100, direction: gamingRisk > 0 ? "UP" : "NEUTRAL", explanation: "Responsible-gaming pressure requires refusal before opportunity review.", name: "responsible_gaming" }),
    metricDriver({ contribution: decision === "HARD_PASS" ? 15 : 0, direction: decision === "HARD_PASS" ? "UP" : "NEUTRAL", explanation: "A hard-block risk floors the pressure band at hard pass.", name: "hard_block_floor" }),
  ]);
}

function evidenceHealthScore(input: NoBetPressureInput, sourceRisk: number): number {
  return clampScore(
    100 *
      weightedMean([
        { value: normalizeScore(input.dataReliabilityIndex), weight: 0.4 },
        { value: normalizeScore(input.calibrationIntegrityGrade), weight: 0.25 },
        { value: 1 - normalizeScore(input.lowEvidencePressure), weight: 0.15 },
        { value: 1 - sourceRisk, weight: 0.12 },
        { value: 1 - normalizeScore(input.staleLineRiskScore), weight: 0.08 },
      ]),
  );
}

function confidenceFromEvidence(evidenceHealth: number, uncertaintyBand: MetricUncertaintyBand, reviewRisk: number): number {
  const base = uncertaintyBand === "LOW" ? 80 : uncertaintyBand === "MEDIUM" ? 58 : 32;
  return round(Math.max(0, Math.min(100, base + clampScore(evidenceHealth) * 0.1 - reviewRisk * 14)), 2);
}

function decisionToBand(decision: NoBetDecision, score: number): NoBetPressureBand {
  if (decision === "HARD_PASS" || score >= 85) return "HARD_PASS";
  if (decision === "SOFT_PASS" || score >= 60) return "SOFT_PASS";
  if (decision === "WATCH" || score >= 30) return "WATCH";
  return "CLEAR";
}

function normalizeScore(value: number): number {
  return clampScore(value) / 100;
}

function sourcePostureRisk(policies: readonly MetricSourcePolicy[]): number {
  if (policies.length === 0) return 1;
  const totalCleanliness = policies.reduce((sum, policy) => {
    const modelingMultiplier = policy.allowedForModeling ? 1 : 0;
    return sum + rightsCleanliness(policy.status) * modelingMultiplier;
  }, 0);
  return 1 - clamp01(totalCleanliness / policies.length);
}

function sourcePosture(sourceRisk: number, sourceAllowed: boolean): NoBetPressureSourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}

function proxyCount(values: readonly (number | undefined)[]): number {
  // Count only informative (present AND nonzero) optional signals. Counting an
  // explicit zero as a proxy would let the cleanest data (e.g. zero responsible-
  // gaming pressure) inflate reported uncertainty, inverting LOW to HIGH.
  return values.filter((value) => value !== undefined && value > 0).length;
}
