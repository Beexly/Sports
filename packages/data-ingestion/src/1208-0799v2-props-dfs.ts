/**
 * Competing Process Hazard Function Models for Player Ratings in Ice Hockey
 *
 * arXiv:1208.0799v2 · lane:props_dfs · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build an NFL competing-process player-rating model: model each drive as competing hazards (TD / FG /
 * punt / turnover) with player-modulated rates via penalized multinomial logistic on drive outcomes
 * with player-presence indicators (Lasso path, no MCMC), separating offensive skill (raises own
 * scoring rate) from defensive skill (lowers opponent's), and test QB-WR pair chemistry interactions
 * beyond individual ratings.
 *
 * ACCEPTANCE GATE: ADOPT the competing-outcome player-rating framework if the player-level model beats the team-only
 * baseline on 2024-2025 holdout drive-outcome log-likelihood by a margin exceeding the paper's
 * relative gain (~0.4% doubled-NLL improvement, scaled) AND at least 20 player effects (or 5 pair
 * interactions) are selected with stable signs across 2023-2024/2024-2025 splits.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1208.0799v2" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the competing-outcome player-rating framework if the player-level model beats the team-only baseline on 2024-2025 holdout drive-outcome log-likelihood by a margin exceeding the paper's relative gain (~0.4% doubled-NLL improvement, scaled) AND at least 20 player effects (or 5 pair interactions) are selected with stable signs across 2023-2024/2024-2025 splits.`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";