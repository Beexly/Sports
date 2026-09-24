/**
 * Deep Batch Active Learning by Diverse, Uncertain Gradient Lower Bounds
 *
 * arXiv:1906.03671v2 · lane:active_learning · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Average-case active learning under labeling costs: rank pool candidates by expected model
 * improvement per unit cost, score(x) = Delta(x)/c(x), and acquire greedily by that ratio instead of
 * cost-blind uncertainty sampling; batch costs are subadditive because setup/context is shared.
 * Market-implied game importance acts as the prior over which games matter.
 *
 * Improvement (wiring record): Adopt BADGE acquisition for the weekly charting budget: gradient embeddings g_x = d-loss/d-theta_out
 * on (x, yhat(x)) for the pick-probability head, with k-means++ over embeddings selecting diverse
 * high-uncertainty games to chart.
 *
 * ACCEPTANCE GATE: ADOPT the acquisition rule iff BADGE-selected 20% charting budget achieves held-out log-loss within
 * 0.005 of (or better than) random-selected 40% budget on the 2024 holdout, in two consecutive
 * simulated seasons (2024 and 2025 when data complete).
 *
 * Ingest role: charting-acquisition prioritization (info-per-cost ranking + subadditive batch costing).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1906.03671v2" as const;
export const LANE = "active_learning" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the acquisition rule iff BADGE-selected 20% charting budget achieves held-out log-loss within 0.005 of (or better than) random-selected 40% budget on the 2024 holdout, in two consecutive simulated seasons (2024 and 2025 when data complete).`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "information-per-unit-cost greedy acquisition",
  batchSize: 16,
  costSharing: 0.25,
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface AcquisitionCandidate {
  id: string;
  /** Expected model improvement from charting this game (gradient-norm / MI leverage proxy). */
  delta: number;
  /** Acquisition cost in charting dollars/minutes. Must be > 0. */
  cost: number;
  /** Market-implied prior weight for game importance. Defaults to 1. */
  gameImportance?: number;
}

function validCandidate(c: AcquisitionCandidate): boolean {
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    isFiniteNumber(c.delta) &&
    c.delta >= 0 &&
    isFiniteNumber(c.cost) &&
    c.cost > 0 &&
    (c.gameImportance === undefined || (isFiniteNumber(c.gameImportance) && c.gameImportance >= 0))
  );
}

/**
 * Information-per-unit-cost score: score(x) = Delta(x) * importance / c(x).
 * Returns null on malformed input (fail-closed).
 */
export function infoPerCostScore(delta: number, cost: number, gameImportance = 1): number | null {
  if (!isFiniteNumber(delta) || delta < 0) return null;
  if (!isFiniteNumber(cost) || cost <= 0) return null;
  if (!isFiniteNumber(gameImportance) || gameImportance < 0) return null;
  return (delta * gameImportance) / cost;
}

/**
 * Greedy acquisition by Delta/c ratio under a dollar budget (replaces cost-blind greedy).
 * Returns selected ids in acquisition order plus totals, or null on malformed input.
 */
export function greedyAcquireByRatio(
  candidates: readonly AcquisitionCandidate[],
  budget: number,
): { selected: string[]; totalCost: number; totalDelta: number } | null {
  if (!isFiniteNumber(budget) || budget < 0) return null;
  if (!candidates.every(validCandidate)) return null;
  const scored = candidates
    .map((c) => ({ c, score: infoPerCostScore(c.delta, c.cost, c.gameImportance ?? 1) ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const selected: string[] = [];
  let totalCost = 0;
  let totalDelta = 0;
  for (const { c } of scored) {
    if (totalCost + c.cost <= budget) {
      selected.push(c.id);
      totalCost += c.cost;
      totalDelta += c.delta * (c.gameImportance ?? 1);
    }
  }
  return { selected, totalCost, totalDelta };
}

/**
 * Subadditive batch cost model: charting a batch costs less than the sum of individual
 * costs because setup/context is shared. cost(batch) = max + (1 - sharing) * (sum - max),
 * always <= sum for sharing in [0, 1].
 */
export function subadditiveBatchCost(costs: readonly number[], sharing = 0.25): number | null {
  if (costs.length === 0) return null;
  if (!costs.every((c) => isFiniteNumber(c) && c >= 0)) return null;
  if (!isFiniteNumber(sharing) || sharing < 0 || sharing > 1) return null;
  const sum = costs.reduce((a, b) => a + b, 0);
  const max = Math.max(...costs);
  return max + (1 - sharing) * (sum - max);
}
