/**
 * Benchmark Dataset for Precipitation Forecasting by Post-Processing the Numerical Weather Prediction
 *
 * arXiv:2206.15241v2 · lane:props_dfs · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build the stadium-weather post-processor for game-day features (kickoff wind speed/direction,
 * precipitation probability, temperature): pull NWS/NWP gridded forecasts (GFS/NAM) for stadium
 * coordinates, supervise with METAR station observations (the AWS analogue), train gradient boosting
 * on the curated feature set (graduate to U-Net/ConvLSTM only if justified), split-by-forecast-origin
 * discipline, CSI/Bias categorical verification; feed calibrated weather distributions into the totals
 * model — then fix the paper's open heavy-tail failure with a two-head model: occurrence classifier +
 * generalized-Pareto/quantile-regression extreme-value tail head, blended by predicted intensity.
 *
 * ACCEPTANCE GATE: ADAPT iff the post-processor improves on raw NWP (CSI +>=0.02 on precipitation occurrence,
 * wind-speed MAE - >=5%) on the held-out window AND the calibrated weather features improve the totals
 * model's log-loss/Brier vs raw-weather inputs; REJECT if post-processing adds no skill over raw NWP
 * at stadium scale.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2206.15241v2" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT iff the post-processor improves on raw NWP (CSI +>=0.02 on precipitation occurrence, wind-speed MAE - >=5%) on the held-out window AND the calibrated weather features improve the totals model's log-loss/Brier vs raw-weather inputs; REJECT if post-processing adds no skill over raw NWP at stadium scale.`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";