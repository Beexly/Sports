/**
 * arXiv:2409.13888v2 — Causal Feature Selection Method for Contextual Multi-Armed Bandits in Recommender System
 *
 * Causal feature selection for pick/staking models: heterogeneous indirect effect (HIE) and heterogeneous
 * direct difference (HDD) scores replace correlation ranking, extended to continuous graded ROI rewards and
 * rolling 4-week time-varying HIE for the changepoint bandit.
 *
 * Improvement: Select pick/staking-model features with causal HIE/HDD instead of correlation, extended to continuous graded rewards (ROI per pick via per-bin reward densities) and time-varying HIE in rolling 4-week windows, feeding the changepoint-resetting bandit from ledger 0810 to close the loop between feature selection and non-stationary model selection.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if on the GSE 2025 holdout replay (a) HIE/HDD rank a known-spurious correlate (e.g., raw team win%) below true HTE features like line-movement buckets, AND (b) the LinUCB selector using HIE/HDD top features beats the correlation-selected selector by ≥ 1.5 ROI points per 100 picks.
 */

/** One candidate feature's observational summary. */
export interface FeatureSummary {
  name: string;
  /** Correlation with realized ROI (the naive baseline ranking). */
  corr: number;
  /** Heterogeneous indirect effect: effect via the treatment channel. */
  hie: number;
  /** Heterogeneous direct difference: residual direct effect. */
  hdd: number;
}

/**
 * Causal feature score: s = |HIE| + |HDD| (graded-reward extension weights the
 * HIE by per-bin reward density contrast, folded into hie here).
 */
export function causalFeatureScore(f: FeatureSummary): number {
  return Math.abs(f.hie) + Math.abs(f.hdd);
}

/** Rank features by causal score (desc), tie-broken by name for determinism. */
export function rankByCausalScore(fs: readonly FeatureSummary[]): FeatureSummary[] {
  return [...fs].sort((a, b) => {
    const d = causalFeatureScore(b) - causalFeatureScore(a);
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
}

/** Rank features by raw correlation (the baseline to beat). */
export function rankByCorrelation(fs: readonly FeatureSummary[]): FeatureSummary[] {
  return [...fs].sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr) || a.name.localeCompare(b.name));
}

/**
 * Time-varying HIE: exponential rolling update of the HIE estimate over
 * 4-week windows; returns the latest smoothed HIE per feature name.
 */
export function rollingHie(
  windows: readonly { name: string; hie: number }[][],
  halfLife = 2,
): Map<string, number> {
  const out = new Map<string, number>();
  const decay = Math.pow(0.5, 1 / halfLife);
  for (const win of windows) {
    for (const { name, hie } of win) {
      const prev = out.get(name) ?? 0;
      out.set(name, decay * prev + (1 - decay) * hie);
    }
  }
  return out;
}
