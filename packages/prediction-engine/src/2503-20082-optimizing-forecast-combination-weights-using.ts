/**
 * arXiv:2503.20082 — Optimizing Forecast Combination Weights Using Exponentially Weighted Hit and Win Rate Losses
 *
 * Ensemble combination weights from exponentially weighted hit/win-rate losses, upgraded with a
 * magnitude-weighted Cauchy surrogate w_t*F_Cauchy(|R_t|-1) with w_t = |actual - consensus| — weight flows
 * to where the CLV dollars are largest.
 *
 * Improvement: Set ensemble combination weights with exponentially weighted hit/win-rate losses, upgrading the paper's symmetric win loss to a magnitude-weighted Cauchy surrogate w_t·F_Cauchy(|R_t|−1) with w_t = |actual − consensus| — so the combiner concentrates weight where the CLV dollars are largest, directly optimizing expected CLV instead of win frequency.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if on the 2025 holdout the combiner achieves win rate vs. consensus ≥ 55% and beat-the-close rate ≥ 52.5% (the standard -110 breakeven is 52.38%) and Brier score no worse than +1% vs. simple average. REJECT if win rate ≤ 52% or beat-the-close < 52.38%.
 */

/** One source's track record on resolved games. */
export interface SourceLoss {
  source: string;
  /** Per-game 0/1 hit (1 = beat consensus). */
  hits: number[];
  /** Per-game realized return |R_t| (magnitude for the Cauchy surrogate). */
  returns: number[];
}

/** Cauchy CDF surrogate F_Cauchy(|R|-1): saturating magnitude weight. */
export function cauchySurrogate(absReturn: number): number {
  return 0.5 + Math.atan(absReturn - 1) / Math.PI;
}

/**
 * Exponentially weighted magnitude-adjusted score per source:
 * score = EWMA(hits * w_t * F_Cauchy(|R_t|-1)), w_t = |actual - consensus|.
 */
export function sourceScores(
  sources: readonly SourceLoss[],
  consensusGap: readonly number[][],
  eta: number,
): Map<string, number> {
  if (eta <= 0 || eta > 1) throw new Error("sourceScores: eta in (0,1]");
  const out = new Map<string, number>();
  sources.forEach((s, si) => {
    let ewma = 0;
    const gaps = consensusGap[si] ?? [];
    s.hits.forEach((h, t) => {
      const w = Math.abs(gaps[t] ?? 0);
      ewma = (1 - eta) * ewma + eta * h * w * cauchySurrogate(Math.abs(s.returns[t] ?? 0));
    });
    out.set(s.source, ewma);
  });
  return out;
}

/** Softmax-normalized combination weights from scores. */
export function combinationWeights(scores: Map<string, number>, temp = 1): Map<string, number> {
  if (scores.size === 0) throw new Error("combinationWeights: no scores");
  if (temp <= 0) throw new Error("combinationWeights: temp > 0");
  const entries = [...scores.entries()];
  const m = Math.max(...entries.map(([, v]) => v));
  const exps = entries.map(([, v]) => Math.exp((v - m) / temp));
  const z = exps.reduce((a, b) => a + b, 0);
  return new Map(entries.map(([k], i) => [k, (exps[i] ?? 0) / z]));
}
