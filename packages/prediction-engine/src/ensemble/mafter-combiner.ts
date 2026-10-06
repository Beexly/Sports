/**
 * Two-level mAFTER combiner for GSE's probability outputs.
 *
 * Level 1 generates meta-forecasts:
 *   (a) simple average,
 *   (b) AFTER-style exponential weights ∝ exp(−η·cumulative Brier/log score),
 *   (c) regression-weighted blend trained on recent outcomes.
 * Level 2 runs AFTER over the three level-1 outputs plus the market-implied
 * probability, updated weekly on a rolling season-length window — a
 * principled rule for when to average vs weight aggressively.
 *
 * @see arXiv:1505.00475v1 — "On the Forecast Combination Puzzle"
 *
 * ACCEPTANCE GATE: ADAPT accepted iff mAFTER's walk-forward mean log-loss
 * over the 2024 NFL season is at least 1.5% lower (relative) than the
 * simple-average baseline AND its worst single-week log-loss is no more than
 * 5% worse than SA's worst week. The gate is a backtest concern; this module
 * is the pure combiner kernel, not wired into any live path.
 */

/** AFTER weights ∝ exp(−η·cumulative loss), normalized. */
export function afterWeights(cumulativeLoss: readonly number[], eta = 1): number[] {
  if (cumulativeLoss.length === 0) return [];
  const w = cumulativeLoss.map((L) => Math.exp(-eta * L));
  const total = w.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return cumulativeLoss.map(() => 1 / cumulativeLoss.length);
  }
  return w.map((x) => x / total);
}

/**
 * Level-1 meta-forecasts from a panel of source probabilities.
 * @param panel rows = sources, values = probabilities for one game
 * @param cumBrier trailing cumulative Brier per source (for AFTER weights)
 * @param regWeights regression weights trained on recent outcomes (normalized inside)
 */
export function level1MetaForecasts(
  panel: readonly number[],
  cumBrier: readonly number[],
  regWeights: readonly number[],
): { simpleAverage: number; after: number; regression: number } {
  if (panel.length === 0) throw new Error("level1MetaForecasts: empty panel");
  const sa = panel.reduce((a, b) => a + b, 0) / panel.length;
  const aw = afterWeights(cumBrier.length === panel.length ? cumBrier : panel.map(() => 0));
  const after = panel.reduce((acc, p, i) => acc + (aw[i] ?? 0) * p, 0);
  const rwTotal = regWeights.reduce((a, b) => a + b, 0);
  const regression =
    regWeights.length === panel.length && rwTotal > 0
      ? panel.reduce((acc, p, i) => acc + ((regWeights[i] ?? 0) / rwTotal) * p, 0)
      : sa;
  return { simpleAverage: sa, after, regression };
}

/**
 * Level 2: AFTER over the three level-1 meta-forecasts plus the
 * market-implied probability.
 */
export function mAfterCombine(
  level1: { simpleAverage: number; after: number; regression: number },
  marketProb: number,
  cumLossLevel2: readonly [number, number, number, number],
  eta = 1,
): number {
  const outs = [level1.simpleAverage, level1.after, level1.regression, marketProb];
  for (const p of outs) {
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new Error("mAfterCombine: level-1/market probability out of range");
    }
  }
  const w = afterWeights(cumLossLevel2, eta);
  return outs.reduce((acc, p, i) => acc + (w[i] ?? 0) * p, 0);
}

/** Log loss (for the gate's walk-forward scoring). */
export function logLoss(p: number, y: 0 | 1): number {
  const c = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  return -(y * Math.log(c) + (1 - y) * Math.log(1 - c));
}
