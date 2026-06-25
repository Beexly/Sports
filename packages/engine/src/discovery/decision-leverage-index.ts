/**
 * DISCOVERY LAYER — Decision Leverage Index (Invention 36).
 *
 * The universal currency of the platform. A data point matters only if it CHANGES an action under
 * proof constraints — not "how predictive is this?" but "how much decision leverage does it create?"
 *
 *   DLI = P(decision_changes | signal) × EV(correct_change) × proof_quality × time_sensitivity
 *         × repeatability ÷ (cost + rights_risk + latency + complexity + false_confidence_risk)
 *
 * This unifies data buying, feature engineering, research planning, and product design under one
 * question. Pure + deterministic.
 */

export interface DLIInputs {
  /** P(the decision changes given this signal) [0,1]. */
  readonly pDecisionChanges: number;
  /** Expected value of making the correct change (same unit as your edge). */
  readonly evCorrectChange: number;
  /** Proof quality [0,1] (denominator-safe, FDR, provenance). */
  readonly proofQuality: number;
  /** Time sensitivity [0,1] (how perishable the leverage is). */
  readonly timeSensitivity: number;
  /** Repeatability [0,1] (does it recur, or one-off?). */
  readonly repeatability: number;
  readonly cost: number;
  readonly rightsRisk: number;
  readonly latency: number;
  readonly complexity: number;
  readonly falseConfidenceRisk: number;
}

export type DLIClass = "high_leverage" | "medium_leverage" | "low_leverage" | "negative_leverage";

export interface DLIResult {
  readonly dli: number;
  readonly classification: DLIClass;
  readonly note: string;
}

/** Compute the Decision Leverage Index for a signal/data source/stat. */
export function computeDLI(i: DLIInputs): DLIResult {
  const denom = 1 + i.cost + i.rightsRisk + i.latency + i.complexity + i.falseConfidenceRisk;
  const numerator = i.pDecisionChanges * i.evCorrectChange * i.proofQuality * i.timeSensitivity * i.repeatability;
  const dli = numerator / denom;
  // False confidence can make leverage net-negative even when the raw signal looks attractive.
  const adjusted = dli - 0.5 * i.falseConfidenceRisk * (1 - i.proofQuality);
  const classification: DLIClass =
    adjusted <= 0 ? "negative_leverage" : adjusted >= 0.2 ? "high_leverage" : adjusted >= 0.05 ? "medium_leverage" : "low_leverage";
  return {
    dli: Number(adjusted.toFixed(4)),
    classification,
    note:
      classification === "negative_leverage"
        ? "Creates more false-confidence/contamination risk than decision value — do not buy/use."
        : `Changes a responsible decision with ${classification.replace("_", " ")}.`,
  };
}

/** Rank a set of candidate signals/data sources by decision leverage, best-first. */
export function rankByDLI(items: ReadonlyArray<{ id: string; inputs: DLIInputs }>): Array<{ id: string; result: DLIResult }> {
  return items.map((x) => ({ id: x.id, result: computeDLI(x.inputs) })).sort((a, b) => b.result.dli - a.result.dli);
}
