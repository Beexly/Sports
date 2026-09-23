/**
 * arXiv 2406.03321v2: Decision Synthesis in Monetary Policy.
 *
 * ACCEPTANCE GATE: Adopt decision-utility weighting if walk-forward 2024-2025 shows the BPDS-weighted ensemble beating predictive-fit-weighted (BMA-style) combination by >=1.0% ROI or >=0.5% CLV with no worse max drawdown; reject (keep current combination) if decision-utility weights underperform - the paper's own caveat: if historical decisions were bad, weighting by past decision outcomes fossilizes the mistake; use expected decision utility under a corrected staking rule instead.
 */

export const ENABLED = false;

export type MarketClass = "SPREAD" | "MONEYLINE" | "TOTAL";
export type OutcomeRegion = "LOW" | "MIDDLE" | "HIGH";

export interface DecisionUtilityMember {
  readonly modelId: string;
  readonly probability: number;
  readonly utilityByMarket: Readonly<Record<MarketClass, number>>;
  readonly accuracyByRegion: Readonly<Record<OutcomeRegion, number>>;
}

export interface DecisionUtilityInput {
  readonly members: readonly DecisionUtilityMember[];
  readonly market: MarketClass;
  readonly region: OutcomeRegion;
  readonly temperature: number;
}

export interface DecisionUtilityResult {
  readonly probability: number;
  readonly weights: Readonly<Record<string, number>>;
  readonly effectiveSampleSize: number;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

export function evaluateDecisionUtilityEnsemble(
  input: DecisionUtilityInput,
): DecisionUtilityResult {
  if (input.members.length === 0) {
    throw new Error("members must be non-empty");
  }
  if (!Number.isFinite(input.temperature) || input.temperature <= 0) {
    throw new Error("temperature must be positive and finite");
  }

  const scores = input.members.map((member) => {
    const probability = member.probability;
    const utility = member.utilityByMarket[input.market];
    const accuracy = member.accuracyByRegion[input.region];
    if (probability < 0 || probability > 1) {
      throw new Error(`probability for ${member.modelId} must be between 0 and 1`);
    }
    assertFinite(utility, `utility for ${member.modelId}`);
    assertFinite(accuracy, `accuracy for ${member.modelId}`);
    return { member, score: utility + accuracy - 0.5 };
  });

  const maximum = Math.max(...scores.map(({ score }) => score));
  const unnormalized = scores.map(({ score }) => Math.exp((score - maximum) / input.temperature));
  const total = unnormalized.reduce((sum, value) => sum + value, 0);
  const normalized = unnormalized.map((value) => value / total);
  const weights: Record<string, number> = {};
  let probability = 0;
  let squaredWeightTotal = 0;

  scores.forEach(({ member }, index) => {
    const weight = normalized[index];
    weights[member.modelId] = weight;
    probability += member.probability * weight;
    squaredWeightTotal += weight * weight;
  });

  return {
    probability,
    weights,
    effectiveSampleSize: 1 / squaredWeightTotal,
  };
}
