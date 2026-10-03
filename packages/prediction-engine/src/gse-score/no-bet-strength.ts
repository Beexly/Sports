export type NoBetDecision = "CLEAR" | "WATCH" | "SOFT_PASS" | "HARD_PASS";

export type NoBetRiskFactor =
  | "MISSING_REQUIRED_DATA"
  | "STALE_DATA"
  | "MODEL_DISAGREEMENT"
  | "CALIBRATION_NOT_VALIDATED"
  | "SOURCE_RIGHTS_BLOCKED"
  | "LOW_EVIDENCE"
  | "MARKET_VOLATILITY"
  | "RESPONSIBLE_GAMING";

export interface NoBetRiskInput {
  readonly factor: NoBetRiskFactor;
  readonly severity: number;
  readonly reason: string;
  readonly hardBlock?: boolean;
}

export interface NoBetDriver {
  readonly name: string;
  readonly impact: number;
  readonly explanation: string;
}

export interface NoBetStrengthInput {
  readonly risks: readonly NoBetRiskInput[];
  readonly evidenceHealth?: number;
}

export interface NoBetStrengthResult {
  readonly score: number;
  readonly decision: NoBetDecision;
  readonly hardPassReasons: readonly string[];
  readonly drivers: readonly NoBetDriver[];
}

const RISK_IMPACT: Record<NoBetRiskFactor, number> = {
  CALIBRATION_NOT_VALIDATED: 16,
  LOW_EVIDENCE: 18,
  MARKET_VOLATILITY: 12,
  MISSING_REQUIRED_DATA: 45,
  MODEL_DISAGREEMENT: 22,
  RESPONSIBLE_GAMING: 100,
  SOURCE_RIGHTS_BLOCKED: 70,
  STALE_DATA: 24,
};

export function computeNoBetStrength(input: NoBetStrengthInput): NoBetStrengthResult {
  const evidenceHealth = clampScore(input.evidenceHealth ?? 100);
  const evidencePenalty = Math.max(0, 100 - evidenceHealth) * 0.35;
  const drivers: NoBetDriver[] = [];

  if (evidencePenalty > 0) {
    drivers.push({
      explanation: `Evidence health is ${round2(evidenceHealth)}, adding refusal pressure.`,
      impact: round2(evidencePenalty),
      name: "evidence_health",
    });
  }

  for (const risk of input.risks) {
    const impact = RISK_IMPACT[risk.factor] * clamp01(risk.severity);
    if (impact <= 0) continue;
    drivers.push({
      explanation: risk.reason,
      impact: round2(impact),
      name: risk.factor,
    });
  }

  const score = clampScore(drivers.reduce((sum, driver) => sum + driver.impact, 0));
  const hardPassReasons = input.risks
    .filter((risk) => risk.hardBlock || risk.factor === "SOURCE_RIGHTS_BLOCKED" || risk.factor === "RESPONSIBLE_GAMING")
    .map((risk) => risk.reason);

  const decision: NoBetDecision =
    hardPassReasons.length > 0 || score >= 85
      ? "HARD_PASS"
      : score >= 60
        ? "SOFT_PASS"
        : score >= 30
          ? "WATCH"
          : "CLEAR";

  return {
    decision,
    drivers: drivers.sort((a, b) => b.impact - a.impact),
    hardPassReasons,
    score: round2(score),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
