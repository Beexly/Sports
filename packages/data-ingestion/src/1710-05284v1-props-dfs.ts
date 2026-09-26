/**
 * Multivariate Generalized Linear Mixed Models for Joint Estimation of Sporting Outcomes
 *
 * arXiv:1710.05284v1 · lane:props_dfs · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build the joint team-strength GLMM: data = nflverse pbp 2015-2025; game-level responses: EPA/play
 * (normal), success rate, pressure rate, turnover margin (Poisson/binomial), win/loss indicator;
 * per-season joint model -- offense/defense random effects for EPA/play + win-propensity, unstructured
 * 3x3 G; second response (e.g., pressure rate) with its own off/def effects (5x5 G); implement with
 * brms/Stan or TMB (not the aging CRAN package); fit protocol: expanding-window per season (week >=
 * 4), ratings updated weekly; home/away/neutral fixed effects; weekly ratings feed into the engine's
 * team-strength module; win-propensity effects as an alternative spread/total input; report the
 * correlation estimates (off-win, def-win) in the benchmark lane.
 *
 * ACCEPTANCE GATE: ADOPT the joint team-strength model if on 2024-2025 walk-forward it beats the binary-only baseline
 * by >=0.002 log-loss (paired, significant at 0.05) and beats GSE's current team-strength input by
 * >=0.001; ADAPT as auxiliary ensemble input if it beats the binary baseline but not GSE's current
 * input.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1710.05284v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the joint team-strength model if on 2024-2025 walk-forward it beats the binary-only baseline by >=0.002 log-loss (paired, significant at 0.05) and beats GSE's current team-strength input by >=0.001; ADAPT as auxiliary ensemble input if it beats the binary baseline but not GSE's current input.`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";