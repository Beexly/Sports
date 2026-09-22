/**
 * DAVED data market: weekly training-set selection under charting budget
 *
 * Research port: arXiv:2403.13893
 * Normalized lane: active_learning | Doctrine: INFRA
 *
 * Reframes weekly model training as a data market: buyer test queries = this week's slate (unlabeled by definition), seller pool = historical games with charting costs c_j, budget B = weekly compute/charting budget. Greedy value-per-cost selection under the budget; pure scheduling math.
 *
 * ACCEPTANCE GATE: ADOPT DAVED-selected training sets only if they beat the recency-window baseline by >= 0.003 weekly ATS log-loss averaged over the 2024 season AND beat it in >= 10 of 17 weeks. Live-data gate -> GSE_DAVED_ENABLED flag (default false).
 */

export interface SellerGame {
  gameId: string;
  /** estimated value to this week's slate (buyer queries) */
  value: number;
  /** charting/compute cost */
  cost: number;
}

export interface MarketSelection {
  selected: string[];
  totalValue: number;
  totalCost: number;
  budget: number;
}

/** Greedy knapsack by value/cost under budget B (deterministic). */
export function selectTrainingSet(pool: SellerGame[], budget: number): MarketSelection {
  const ranked = [...pool]
    .filter((g) => g.cost > 0 && g.value > 0)
    .sort((a, b) => b.value / b.cost - a.value / a.cost || a.gameId.localeCompare(b.gameId));
  const selected: string[] = [];
  let totalValue = 0, totalCost = 0;
  for (const g of ranked) {
    if (totalCost + g.cost <= budget) {
      selected.push(g.gameId);
      totalValue += g.value;
      totalCost += g.cost;
    }
  }
  return { selected, totalValue, totalCost, budget };
}

/** Gate: mean weekly log-loss gain >= 0.003 AND wins in >= 10 of 17 weeks. */
export function davedGatePasses(weeklyGains: number[]): boolean {
  if (weeklyGains.length === 0) return false;
  const mean = weeklyGains.reduce((a, b) => a + b, 0) / weeklyGains.length;
  const wins = weeklyGains.filter((g) => g > 0).length;
  return mean >= 0.003 && wins >= 10;
}

/** Live-data gate: 2024 season backtest must clear. */
export const GSE_DAVED_ENABLED = false;

