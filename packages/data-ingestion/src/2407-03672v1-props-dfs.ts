/**
 * A Survey of Data Synthesis Approaches
 *
 * arXiv:2407.03672v1 · lane:props_dfs · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Adopt constrained synthetic-play augmentation gated by a learned label-consistency critic (a
 * discriminator predicting whether a synthetic play's assigned label matches a held-out outcome
 * model's assignment), routing only high-critic-confidence synthetics into training instead of
 * rule-based filtering.
 *
 * ACCEPTANCE GATE: ADOPT constrained augmentation only if arm (C) beats BOTH (A) and (B) by ≥ 0.003 Brier on the
 * untouched chronological test window AND the calibration slope stays within [0.9, 1.1] (no
 * miscalibration introduced).
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2407.03672v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT constrained augmentation only if arm (C) beats BOTH (A) and (B) by ≥ 0.003 Brier on the untouched chronological test window AND the calibration slope stays within [0.9, 1.1] (no miscalibration introduced).`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";