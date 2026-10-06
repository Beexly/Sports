/**
 * Large Scale Diverse Combinatorial Optimization: ESPN Fantasy Football Player Trades
 *
 * arXiv:2111.02859v3 · lane:props_dfs · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Add boom ratio (P(weekly score > 85th pct of position)) and bust ratio (P(<15th pct)) as standard
 * player descriptors in the DFS feature set from 3-season rolling nflverse game logs; reformulate the
 * DK optimizer as a cost-constrained knapsack maximizing sum(projection) subject to salary cap AND
 * sum(bust_ratio) <= tau; learn the risk scalar alpha as a function of contest payout structure
 * (top-heavy GPP -> more boom exposure, cash -> lower alpha).
 *
 * ACCEPTANCE GATE: ADAPT the boom/bust descriptors + cost-constrained knapsack if bust-constrained lineups match the
 * current optimizer's mean score within 2% AND improve top-1% tail hit rate by >=15% relative on a
 * 6-week holdout (GPP relevance).
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2111.02859v3" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT the boom/bust descriptors + cost-constrained knapsack if bust-constrained lineups match the current optimizer's mean score within 2% AND improve top-1% tail hit rate by >=15% relative on a 6-week holdout (GPP relevance).`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";