/**
 * The Strain of Success: A Predictive Model for Injury Risk Mitigation and Team Success in Soccer
 *
 * arXiv:2402.04898v1 · lane:props_dfs · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build an NFL load-management decision tool: (1) injury-risk model - gradient boosting or survival
 * model predicting per-player game-miss probability from trailing workload (snaps, touches, days rest,
 * travel, surface, age, prior injury history); (2) existing GSE EPA-based team ratings as the
 * team-strength model; (3) optimizer for rest-vs-play decisions for veterans in low-leverage weeks
 * (Week 18, short-week Thursdays) via expected-points MDP framing with playoff-seeding value replacing
 * raw points - with a competing-risks survival extension: time-to-injury with cause-specific hazards
 * (soft-tissue vs contact vs concussion), the optimizer acting only on the load-attributable
 * (preventable) risk component.
 *
 * ACCEPTANCE GATE: ADOPT the injury-risk model only if it beats the snap-count heuristic by >=0.005 Brier on the 2024
 * chronological holdout with team-clustered bootstrap CIs excluding zero AND the top risk decile has
 * >=2x the base injury rate; REJECT the rest-optimizer for betting/DFS use if the observational
 * backtest cannot reject the null - keep it as content-only ('load management watch').
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2402.04898v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the injury-risk model only if it beats the snap-count heuristic by >=0.005 Brier on the 2024 chronological holdout with team-clustered bootstrap CIs excluding zero AND the top risk decile has >=2x the base injury rate; REJECT the rest-optimizer for betting/DFS use if the observational backtest cannot reject the null - keep it as content-only ('load management watch').`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";