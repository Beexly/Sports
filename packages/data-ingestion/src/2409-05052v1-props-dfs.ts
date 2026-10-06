/**
 * Rating Players of Counter-Strike: Global Offensive Based on Plus/Minus value
 *
 * arXiv:2409.05052v1 · lane:props_dfs · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build snap-level adjusted plus-minus player ratings for NFL with a hierarchical model (unit-level
 * random effects for OL and secondary so individual APM is estimated net of unit effects), running the
 * ridge vs elastic net vs Bayesian-with-PFF-prior vs Bayesian-with-shrunk-prior ablation the paper
 * never ran.
 *
 * ACCEPTANCE GATE: ADOPT snap-APM if, on the 2024 season walk-forward test, adding player APM coefficients improves
 * play-EPA out-of-sample R² by ≥ 0.01 AND the top-decile offensive APM players beat their yardage prop
 * lines at a rate exceeding the baseline model by ≥ 2 percentage points (hit-rate lift on ≥ 200 graded
 * props).
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2409.05052v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT snap-APM if, on the 2024 season walk-forward test, adding player APM coefficients improves play-EPA out-of-sample R² by ≥ 0.01 AND the top-decile offensive APM players beat their yardage prop lines at a rate exceeding the baseline model by ≥ 2 percentage points (hit-rate lift on ≥ 200 graded props).`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";