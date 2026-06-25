/**
 * GENESIS LAYER — Decision Leverage Field (Invention 45).
 *
 * The universal scoring field across BOTH betting and fantasy. A signal matters only if it changes
 * a decision under proof constraints. This generalizes the Decision Leverage Index over the full
 * action vocabulary (BET … DYNASTY_SELL), so the same residual can be scored for the action it most
 * leverages. Pure + deterministic.
 *
 *   DLF = P(decision_change) × UtilityGain × ProofQuality × TimeSensitivity × Repeatability
 *       ÷ (Cost + RightsRisk + Latency + Complexity + FalseConfidenceRisk)
 */

export type DecisionAction =
  | "BET" | "PASS" | "WATCHLIST" | "START" | "SIT" | "ADD" | "DROP" | "HOLD"
  | "TRADE_FOR" | "TRADE_AWAY" | "DFS_OVERWEIGHT" | "DFS_FADE" | "BEST_BALL_TARGET"
  | "DYNASTY_BUY" | "DYNASTY_SELL";

const BETTING_ACTIONS = new Set<DecisionAction>(["BET", "PASS", "WATCHLIST"]);

export interface DecisionLeverageFieldInputs {
  readonly signalId: string;
  readonly action: DecisionAction;
  readonly pDecisionChange: number;
  readonly utilityGain: number;
  readonly proofQuality: number;
  readonly timeSensitivity: number;
  readonly repeatability: number;
  readonly cost: number;
  readonly rightsRisk: number;
  readonly latency: number;
  readonly complexity: number;
  readonly falseConfidenceRisk: number;
}

export type DecisionLeverageClass = "high_leverage" | "medium_leverage" | "low_leverage" | "negative_leverage";

export interface DecisionLeverageResult {
  readonly signalId: string;
  readonly action: DecisionAction;
  readonly actionClass: "betting" | "fantasy";
  readonly dlf: number;
  readonly classification: DecisionLeverageClass;
  readonly note: string;
}

/** Compute the Decision Leverage Field value for a (signal, action) pair. */
export function computeDecisionLeverage(i: DecisionLeverageFieldInputs): DecisionLeverageResult {
  const denom = 1 + i.cost + i.rightsRisk + i.latency + i.complexity + i.falseConfidenceRisk;
  const numerator = i.pDecisionChange * i.utilityGain * i.proofQuality * i.timeSensitivity * i.repeatability;
  const adjusted = numerator / denom - 0.5 * i.falseConfidenceRisk * (1 - i.proofQuality);
  const classification: DecisionLeverageClass =
    adjusted <= 0 ? "negative_leverage" : adjusted >= 0.2 ? "high_leverage" : adjusted >= 0.05 ? "medium_leverage" : "low_leverage";
  return {
    signalId: i.signalId,
    action: i.action,
    actionClass: BETTING_ACTIONS.has(i.action) ? "betting" : "fantasy",
    dlf: Number(adjusted.toFixed(4)),
    classification,
    note: classification === "negative_leverage"
      ? "Net-negative leverage — more false-confidence than decision value; ignore."
      : `Changes a ${BETTING_ACTIONS.has(i.action) ? "betting" : "fantasy"} decision (${i.action}) with ${classification.replace("_", " ")}.`,
  };
}

/** Rank (signal, action) candidates by leverage, best-first. */
export function rankDecisionLeverage(items: readonly DecisionLeverageFieldInputs[]): DecisionLeverageResult[] {
  return items.map(computeDecisionLeverage).sort((a, b) => b.dlf - a.dlf);
}
