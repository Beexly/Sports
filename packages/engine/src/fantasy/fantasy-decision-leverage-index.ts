/**
 * FANTASY DISCOVERY LAYER — Fantasy Decision Leverage Index (Invention F36).
 *
 * The universal currency of the fantasy platform. A stat matters only if it CHANGES a roster
 * decision under proof constraints — not "how predictive?" but "how much championship equity does
 * acting on it create, per unit cost?" Route rate that flips a waiver priority is valuable. A fun
 * split that changes nothing is noise. A coach quote that inflates false confidence is NEGATIVE.
 *
 *   FantasyDLI = P(decision_changes | signal) × championship_equity_delta × proof_quality
 *              × repeatability × time_sensitivity
 *              ÷ (cost + rights_risk + latency + complexity + false_confidence_risk)
 *
 * Pure + deterministic.
 */

export interface FantasyDLIInputs {
  /** P(a roster decision changes given this signal) [0,1]. */
  readonly pDecisionChanges: number;
  /** Expected championship-equity gain from the correct change [0,1]. */
  readonly championshipEquityDelta: number;
  /** Proof quality [0,1] (denominator-safe, role-grounded, knowable). */
  readonly proofQuality: number;
  /** Repeatability [0,1] (recurs vs one-off). */
  readonly repeatability: number;
  /** Time sensitivity [0,1] (perishable before lock?). */
  readonly timeSensitivity: number;
  readonly cost: number;
  readonly rightsRisk: number;
  readonly latency: number;
  readonly complexity: number;
  readonly falseConfidenceRisk: number;
}

export type FantasyDLIClass = "high_leverage" | "medium_leverage" | "low_leverage" | "negative_leverage";

export interface FantasyDLIResult {
  readonly dli: number;
  readonly classification: FantasyDLIClass;
  readonly note: string;
}

/** Compute the Fantasy Decision Leverage Index for a signal/data source/stat. */
export function computeFantasyDLI(i: FantasyDLIInputs): FantasyDLIResult {
  const denom = 1 + i.cost + i.rightsRisk + i.latency + i.complexity + i.falseConfidenceRisk;
  const numerator = i.pDecisionChanges * i.championshipEquityDelta * i.proofQuality * i.repeatability * i.timeSensitivity;
  const dli = numerator / denom;
  // A coach-quote-style signal can be net-negative: it changes decisions but on false confidence.
  const adjusted = dli - 0.5 * i.falseConfidenceRisk * (1 - i.proofQuality);
  const classification: FantasyDLIClass =
    adjusted <= 0 ? "negative_leverage" : adjusted >= 0.2 ? "high_leverage" : adjusted >= 0.05 ? "medium_leverage" : "low_leverage";
  return {
    dli: Number(adjusted.toFixed(4)),
    classification,
    note: classification === "negative_leverage"
      ? "Creates more false-confidence than decision value — ignore (e.g. coach-speak, post-hoc box score)."
      : `Changes a roster decision with ${classification.replace("_", " ")}.`,
  };
}

/** Rank candidate signals by fantasy decision leverage, best-first. */
export function rankFantasyByDLI(items: ReadonlyArray<{ id: string; inputs: FantasyDLIInputs }>): Array<{ id: string; result: FantasyDLIResult }> {
  return items.map((x) => ({ id: x.id, result: computeFantasyDLI(x.inputs) })).sort((a, b) => b.result.dli - a.result.dli);
}
