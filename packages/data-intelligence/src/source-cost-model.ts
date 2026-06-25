/**
 * DATA INTELLIGENCE MESH — Source Cost Model.
 *
 * Turns dollars into decision-relevant observability. A source's cost efficiency is the decision
 * leverage it buys per dollar — which is how a free open dataset can out-rank an expensive
 * enterprise feed when the free data is decision-relevant, and how a paid feed earns its place when
 * the free data is too late, too shallow, or legally weak. Pure + deterministic.
 */

export interface SourceCostInputs {
  readonly costPerMonth: number;          // USD
  readonly usefulFactsPerMonth: number;   // count of decision-relevant facts
  readonly decisionLeverageTotal: number; // Σ DataLeverage over the source's facts
}

export interface SourceCostResult {
  readonly costPerUsefulFact: number;
  readonly costEfficiency: number; // decision leverage per dollar (free → maximally efficient)
  readonly note: string;
}

/** Compute a source's cost per useful fact and its leverage-per-dollar efficiency. */
export function computeSourceCost(i: SourceCostInputs): SourceCostResult {
  const costPerUsefulFact = i.usefulFactsPerMonth > 0 ? Number((i.costPerMonth / i.usefulFactsPerMonth).toFixed(4)) : Number(i.costPerMonth.toFixed(4));
  // Free/open sources with real leverage are maximally cost-efficient (no spend to amortize).
  const costEfficiency = i.costPerMonth <= 0
    ? Number((i.decisionLeverageTotal * 1000).toFixed(4))
    : Number((i.decisionLeverageTotal / i.costPerMonth).toFixed(6));
  return {
    costPerUsefulFact,
    costEfficiency,
    note: i.costPerMonth <= 0
      ? `Free/open: ${i.decisionLeverageTotal} decision leverage at zero spend — maximally efficient.`
      : `$${i.costPerMonth}/mo buys ${i.decisionLeverageTotal} decision leverage (${(costEfficiency * 1000).toFixed(2)} leverage per $1k).`,
  };
}
