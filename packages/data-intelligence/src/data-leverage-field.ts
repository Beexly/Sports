/**
 * DATA INTELLIGENCE MESH — Data Leverage Field.
 *
 * A fact is valuable only if it CHANGES a decision GSE can responsibly make. This is the per-fact
 * analogue of the engine's Decision Leverage Index, extended with freshness and uniqueness so a
 * cheap, fresh, unique open-source fact can outrank an expensive, late, redundant enterprise fact.
 *
 *   DataLeverage = P(decision_changes | fact) × EV(correct_change) × proof_quality × freshness
 *                × repeatability × uniqueness
 *                ÷ (cost + rights_risk + latency + complexity + false_confidence_risk)
 *
 * Pure + deterministic.
 */

export interface DataLeverageInputs {
  readonly factId: string;
  readonly pDecisionChanges: number;
  readonly evOfCorrectChange: number;
  readonly proofQuality: number;
  readonly freshness: number;
  readonly repeatability: number;
  readonly uniqueness: number;
  readonly cost: number;
  readonly rightsRisk: number;
  readonly latency: number;
  readonly complexity: number;
  readonly falseConfidenceRisk: number;
}

export type DataLeverageClass = "high" | "medium" | "low" | "negative";

export interface DataLeverageResult {
  readonly factId: string;
  readonly leverage: number;
  readonly classification: DataLeverageClass;
  readonly note: string;
}

/** Compute the decision leverage of a single fact. */
export function computeDataLeverage(i: DataLeverageInputs): DataLeverageResult {
  const numerator = i.pDecisionChanges * i.evOfCorrectChange * i.proofQuality * i.freshness * i.repeatability * i.uniqueness;
  const denom = 1 + i.cost + i.rightsRisk + i.latency + i.complexity + i.falseConfidenceRisk;
  const raw = numerator / denom;
  // False-confidence risk can make a fact net-negative even when it looks informative.
  const leverage = Number((raw - 0.5 * i.falseConfidenceRisk * (1 - i.proofQuality)).toFixed(4));
  const classification: DataLeverageClass = leverage <= 0 ? "negative" : leverage >= 0.2 ? "high" : leverage >= 0.05 ? "medium" : "low";
  return {
    factId: i.factId,
    leverage,
    classification,
    note: classification === "negative"
      ? "Net-negative — more false-confidence/cost than decision value; do not pay for it."
      : `Changes a responsible decision with ${classification} leverage.`,
  };
}

/** Rank facts by decision leverage, best-first. */
export function rankDataLeverage(items: readonly DataLeverageInputs[]): DataLeverageResult[] {
  return items.map(computeDataLeverage).sort((a, b) => b.leverage - a.leverage);
}

/** Total decision leverage a source contributes across its facts (its SourceDecisionLeverage). */
export function sourceDecisionLeverage(items: readonly DataLeverageInputs[]): number {
  return Number(items.map(computeDataLeverage).reduce((s, r) => s + Math.max(0, r.leverage), 0).toFixed(4));
}
