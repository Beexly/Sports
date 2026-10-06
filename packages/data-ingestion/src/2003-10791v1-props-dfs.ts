/**
 * Predicting play calls in the National Football League using hidden Markov models
 *
 * arXiv:2003.10791v1 · lane:props_dfs · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Ship a per-team 2-3 state HMM for pre-snap pass-vs-run probability (multinomial-logit covariate
 * transitions, hierarchical partial pooling across teams, weekly in-season refits) serving (a) prop
 * projection adjustments (attempt share), (b) in-game win-probability conditioning, and (c)
 * game-script-conditioned prop 'script' models.
 *
 * ACCEPTANCE GATE: ADOPT as in-game/prop input if the per-team HMM beats the covariate-only logistic baseline by >=0.5
 * pp accuracy AND >=0.005 log-loss on 2025 holdout, with the improvement concentrated in
 * late-game/script-driven situations.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2003.10791v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as in-game/prop input if the per-team HMM beats the covariate-only logistic baseline by >=0.5 pp accuracy AND >=0.005 log-loss on 2025 holdout, with the improvement concentrated in late-game/script-driven situations.`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";