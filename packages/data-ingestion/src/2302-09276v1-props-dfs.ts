/**
 * Transformer-Based Neural Marked Spatio Temporal Point Process Model for Football Match Events Analysis
 *
 * arXiv:2302.09276v1 · lane:props_dfs · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build the NFL neural drive point process: nflverse play-by-play 2018-2025; discretize each play into
 * marks (time-since-last-play, field zone in 20 zones: 5 downfield bands x 4 lateral thirds, play type
 * in 6-8 classes: run/short pass/deep pass/screen/turnover/penalty/kick); trailing-40-play history
 * (truncate at drive boundaries for the drive-score variant); transformer encoder -> history vector ->
 * dependent heads t->zone->play-type (scaled RMSE on seconds + cross-entropies); derive the 'drive
 * utilization score' (DUS) adapting HAS with NFL weights (explosive play = 10, successful play = 5,
 * failed play = 0; red-zone area weight 10) with exponential recency decay — a drive-level efficiency
 * metric using no scoring data for content ('most efficient drives that didn't score') and as a
 * WP-model feature — then replace the hand-chosen HAS weights and decay with learned parameters (fit
 * by maximizing DUS's correlation with held-out team offensive efficiency under CV) and run the
 * learned-excitation-kernel variant from ledger 0420 §14 on the same harness (head-to-head 'momentum'
 * formalisms).
 *
 * ACCEPTANCE GATE: ADOPT the NFL point-process model iff it beats the AR(2) baseline by >= 0.10 total loss AND the LSTM
 * baseline by >= 0.03 on the 2024 season holdout; ADOPT the DUS metric for content/features iff its
 * team-level correlation with offensive EPA/play is >= 0.70 on 2024; REJECT the whole approach if the
 * transformer fails to beat the LSTM baseline — the paper's core claim is the architecture win, and
 * without it there is no reason to carry the complexity.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2302.09276v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the NFL point-process model iff it beats the AR(2) baseline by >= 0.10 total loss AND the LSTM baseline by >= 0.03 on the 2024 season holdout; ADOPT the DUS metric for content/features iff its team-level correlation with offensive EPA/play is >= 0.70 on 2024; REJECT the whole approach if the transformer fails to beat the LSTM baseline — the paper's core claim is the architecture win, and without it there is no reason to carry the complexity.`;

/**
 * Shared props/DFS primitives. The implementation was consolidated into
 * props-dfs-kit.ts on 2026-09-26; this module retains its own research content
 * (paper, improvement record, acceptance gate, verdict) and re-exports the
 * shared primitives so every paired test import still resolves.
 */
export { CONFIG, blendProjections, knapsackLineup, leverageScore } from "./props-dfs-kit.js";
export type { PlayerEntry } from "./props-dfs-kit.js";