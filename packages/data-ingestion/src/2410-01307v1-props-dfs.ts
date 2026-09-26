/**
 * FanCric: Multi-Agentic Framework for Crafting Fantasy 11 Cricket Teams
 *
 * arXiv:2410.01307v1 · lane:props_dfs · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Add a multi-agent context layer to the weekly DFS pipeline where each agent's qualitative signal
 * enters as a prior with explicit uncertainty calibrated from 2024 backtest hit rates, with
 * reliability-weighted shrinkage damping the hallucinated signals while keeping the useful fraction of
 * context adjustments.
 *
 * ACCEPTANCE GATE: ADOPT the context-agent layer into the weekly DFS pipeline only if it beats the projection-only MILP
 * baseline by ≥ 3 percentile points over a full 17-week backtest AND the per-player multiplier JSON is
 * auditable (every multiplier traceable to a cited data source — no LLM-invented narratives).
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2410.01307v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the context-agent layer into the weekly DFS pipeline only if it beats the projection-only MILP baseline by ≥ 3 percentile points over a full 17-week backtest AND the per-player multiplier JSON is auditable (every multiplier traceable to a cited data source — no LLM-invented narratives).`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";