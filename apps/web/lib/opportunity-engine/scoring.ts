import type {
  EvidenceAssessment,
  OpportunityCandidate,
  OpportunityRisks,
  OpportunityScore,
  OpportunitySignals,
  PriorityBand,
} from "./types";

const POSITIVE_WEIGHTS: Readonly<Record<keyof OpportunitySignals, number>> = {
  strategicFit: 14,
  evidenceStrength: 10,
  revenuePotential: 14,
  timeToValue: 10,
  recurringLeverage: 9,
  dataFlywheel: 8,
  distributionLeverage: 8,
  costReduction: 8,
  defensibility: 6,
  reversibility: 4,
  learningValue: 5,
  urgency: 4,
};

const RISK_WEIGHTS: Readonly<Record<keyof OpportunityRisks, number>> = {
  cashRisk: 14,
  ownerTimeRisk: 12,
  implementationComplexity: 13,
  legalRisk: 16,
  securityRisk: 14,
  dataRightsRisk: 16,
  vendorLockInRisk: 7,
  volatilityRisk: 8,
};

function assertFivePointScale(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new RangeError(`${field} must be an integer from 0 to 5; received ${String(value)}.`);
  }
}

function weightedScore<K extends string>(
  values: Readonly<Record<K, number>>,
  weights: Readonly<Record<K, number>>,
): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const key of Object.keys(weights) as K[]) {
    const value = values[key];
    const weight = weights[key];
    assertFivePointScale(value, key);
    weighted += (value / 5) * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function bandFor(score: number, held: boolean): PriorityBand {
  if (held) return "HELD";
  if (score >= 80) return "P0";
  if (score >= 65) return "P1";
  if (score >= 50) return "P2";
  return "P3";
}

function expiryUrgencyBonus(candidate: OpportunityCandidate, now: Date): number {
  if (!candidate.expiresAt) return 0;
  const expires = Date.parse(candidate.expiresAt);
  if (!Number.isFinite(expires)) return 0;
  const days = (expires - now.getTime()) / (24 * 60 * 60 * 1000);
  if (days < 0) return -25;
  if (days <= 3) return 8;
  if (days <= 14) return 5;
  if (days <= 30) return 2;
  return 0;
}

export function scoreOpportunity(
  candidate: OpportunityCandidate,
  evidence: EvidenceAssessment,
  held: boolean,
  now: Date = new Date(),
): OpportunityScore {
  const positiveBase = weightedScore<keyof OpportunitySignals>(candidate.signals, POSITIVE_WEIGHTS);
  const riskScore = weightedScore<keyof OpportunityRisks>(candidate.risks, RISK_WEIGHTS);

  // Evidence is measured independently from the candidate's initial estimate and
  // blended in so an optimistic submitter cannot self-award credibility.
  const evidenceAdjustedPositive = Math.round(positiveBase * 0.85 + evidence.evidenceScore * 0.15);
  const urgencyBonus = expiryUrgencyBonus(candidate, now);
  const contradictionPenalty = evidence.hasContradiction ? 8 : 0;
  const noPrimaryPenalty = evidence.primaryEvidenceCount === 0 ? 12 : 0;
  const netScore = clamp(
    Math.round(
      evidenceAdjustedPositive * 0.72 +
        (100 - riskScore) * 0.28 +
        urgencyBonus -
        contradictionPenalty -
        noPrimaryPenalty,
    ),
  );

  const reasons: string[] = [
    `Positive leverage score ${evidenceAdjustedPositive}/100.`,
    `Risk burden ${riskScore}/100.`,
    `Evidence strength ${evidence.evidenceScore}/100 from ${evidence.primaryEvidenceCount} primary source(s).`,
  ];
  if (urgencyBonus > 0) reasons.push(`Time-sensitive opportunity received a ${urgencyBonus}-point urgency bonus.`);
  if (urgencyBonus < 0) reasons.push("Opportunity appears expired.");
  if (evidence.hasContradiction) reasons.push("Contradictory evidence reduced priority.");
  if (evidence.primaryEvidenceCount === 0) reasons.push("Absence of primary evidence reduced priority.");
  if (candidate.economics.requiredCashUsd === 0) reasons.push("No-cash experiment is available.");
  if (candidate.economics.expectedDaysToCash !== null && candidate.economics.expectedDaysToCash <= 30) {
    reasons.push("Candidate has a stated path to cash within 30 days; this remains a hypothesis until measured.");
  }

  const confidence: OpportunityScore["confidence"] =
    evidence.evidenceScore >= 80 && !evidence.hasContradiction
      ? "HIGH"
      : evidence.evidenceScore >= 50
        ? "MEDIUM"
        : "LOW";

  return {
    positiveScore: evidenceAdjustedPositive,
    riskScore,
    netScore,
    priorityBand: bandFor(netScore, held),
    confidence,
    reasons,
  };
}
