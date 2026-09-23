/**
 * arXiv:2607.04389v1 — Ledger 0796 — Decentralized Aggregation of LLM Predictions via Wagering Mechanisms (WALLA)
 *
 * WALLA advantage-aligned aggregation: per-game weights from w_i^* = ((s_i - b_{-i})/2c_3)^+ where s_i is
 * the source's Brier advantage vs the leave-one-out pool — one small per-source model on pre-game features,
 * linear pooling of the aggregate.
 *
 * Improvement: Give GSE's ensemble per-game learned weights via WALLA's advantage-aligned rule: train one small MLP per signal source on pre-game features (injury flags, line movement, weather, rest) to predict w_i^* = ((s_i - b_{-i})/2c_3)^+ (per-game Brier advantage vs the leave-one-out pool), aggregate with linear pooling p-hat = sum w_i p_i / W, and test a decision-weighted advantage target A_i^dec = u*(s_i - b_{-i}) with u = realized CLV or Kelly fraction.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Season-2 backtest: advantage-aligned aggregation must beat equal-weight aggregation by ≥ 1.5% Brier score and achieve D-Regret ≤ 30% of the equal-weight gap to oracle before production. DM test at 5%.
 */

/** Per-game source diagnostics for advantage computation. */
export interface SourceGame {
  source: string;
  /** Source's Brier score on this game. */
  brier: number;
  /** Leave-one-out pool Brier (excluding this source). */
  poolBrier: number;
}

/**
 * Advantage-aligned weight: w_i^* = ((s_i - b_{-i}) / 2c_3)^+ with
 * s_i = poolBrier - brier_i (positive = better than pool).
 */
export function advantageWeight(g: SourceGame, c3: number): number {
  if (c3 <= 0) throw new Error("advantageWeight: c3 > 0");
  const s = g.poolBrier - g.brier;
  return Math.max(0, s / (2 * c3));
}

/** Linear-pool aggregate: p-hat = sum w_i p_i / W. */
export function linearPool(
  probs: Map<string, number>,
  weights: Map<string, number>,
): number {
  let num = 0;
  let den = 0;
  for (const [src, p] of probs) {
    const w = weights.get(src) ?? 0;
    num += w * p;
    den += w;
  }
  if (den <= 0) throw new Error("linearPool: zero total weight");
  return num / den;
}

/** D-Regret: gap between equal-weight and oracle captured by WALLA (0..1). */
export function dRegret(wallaBrier: number, equalBrier: number, oracleBrier: number): number {
  const gap = equalBrier - oracleBrier;
  if (gap <= 0) return 0;
  return Math.max(0, (wallaBrier - oracleBrier) / gap);
}
