/**
 * Evaluating Team Skill Aggregation in Online Competitive Games
 *
 * arXiv:2106.11397v1 · lane:props_dfs · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build player-level skill ratings and learn the aggregation: per-player EPA/play with shrinkage
 * toward position means (QB: CPOE/EPA per dropback; receivers: TPRR/YPRR; defenders: pressure rates)
 * treated as mu per player-week via rolling windows; aggregate to unit ratings via SUM/MAX/MIN plus a
 * learned per-role weighted blend (softmax weights over positional groups fit by maximizing
 * walk-forward log-likelihood of game outcomes — letting the data decide whether the QB is the MAX
 * player and whether the weak-link OL starter is the MIN); team strength = aggregation of unit ratings
 * into logistic win-probability vs closing lines.
 *
 * ACCEPTANCE GATE: Adopt the aggregation variant if it beats the current GSE baseline by >=0.003 log-loss on the
 * 2024-2025 walk-forward window AND by >=0.5 percentage points ATS accuracy; ADAPT the blend weights
 * if only the weighted blend beats baseline.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2106.11397v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the aggregation variant if it beats the current GSE baseline by >=0.003 log-loss on the 2024-2025 walk-forward window AND by >=0.5 percentage points ATS accuracy; ADAPT the blend weights if only the weighted blend beats baseline.`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";