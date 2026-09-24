/**
 * arXiv:2508.09992v1 — OpenFPL: An Open-Source Forecasting Method Rivaling State-of-the-Art Fantasy Premier League Services
 *
 * OpenFPL-style fantasy projection recipe: per-horizon ensembles over 1/3/5/10/17-game windows,
 * entropy-binning sample weights toward high-ceiling outcomes, and team-split cross-validation.
 *
 * Improvement: GSE adapts the OpenFPL recipe for fantasy projections: position-specific XGBoost+RF ensembles over 1/3/5/10/17-game horizons, entropy-binning sample weights toward high-ceiling outcomes, team-split CV, and prospective evaluation.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if Test 1 passes (beats baselines overall and on ceiling games); REJECT if it can't beat GSE's existing projections on 2024 holdout or the ceiling-weighting trick doesn't transfer.
 */

/** Ensemble prediction: mean over horizon-window models. */
export function horizonEnsemble(preds: readonly (readonly number[])[]): number[] {
  // preds[h][i] = horizon h's prediction for player-game i
  if (preds.length === 0 || (preds[0]?.length ?? 0) === 0) throw new Error("horizonEnsemble: empty");
  const n = preds[0]!.length;
  return Array.from({ length: n }, (_, i) => {
    let s = 0;
    for (const h of preds) s += h[i] ?? 0;
    return s / preds.length;
  });
}

/**
 * Entropy-binning sample weights: weight ∝ 1 + ceilGain * normalized entropy
 * of the outcome distribution — upweights high-ceiling (high-entropy) games.
 */
export function entropyBinWeights(
  outcomes: readonly (readonly number[])[],
  ceilGain: number,
): number[] {
  if (ceilGain < 0) throw new Error("entropyBinWeights: ceilGain >= 0");
  return outcomes.map((dist) => {
    const z = dist.reduce((a, b) => a + b, 0);
    if (z <= 0) return 1;
    let ent = 0;
    for (const p of dist) {
      const q = p / z;
      if (q > 0) ent -= q * Math.log(q);
    }
    const maxEnt = Math.log(Math.max(2, dist.length));
    return 1 + ceilGain * (maxEnt > 0 ? ent / maxEnt : 0);
  });
}

/**
 * Team-split CV fold assignment: teams (not games) are the split unit —
 * no team appears in both train and test of a fold.
 */
export function teamSplitFolds(
  teams: readonly string[],
  nFolds: number,
): Map<string, number> {
  if (nFolds < 2) throw new Error("teamSplitFolds: nFolds >= 2");
  const uniq = [...new Set(teams)].sort();
  const out = new Map<string, number>();
  uniq.forEach((t, i) => out.set(t, i % nFolds));
  return out;
}
