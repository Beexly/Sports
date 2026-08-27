/**
 * Rare-event admission-harness metrics — R&D, offline only.
 *
 * Ported from arXiv:2206.13222 (Skoki, Lerga & Štajduhar, "ML-Based Approach
 * for NFL Defensive Pass Interference Prediction Using GPS Tracking Data").
 * Their GPS-tracking features die at GSE's data boundary (Big Data Bowl
 * tracking data is not a cleared source), but their rare-event pipeline
 * conventions port whole to GSE's rare-event props (INT, TD-scorer,
 * first-TD) — see
 * docs/ops/edge/extraction/2026-08-26-group-sports-domain.md item 4.
 *
 * Their hard honesty lesson, hand-verified against their own Table II: a
 * genuinely good discriminator (AUC 0.82) at a 2.3% base rate still lands at
 * only ~7.5% precision. A good-looking discriminative score is not a
 * publishable "hit probability" — this is the concrete argument for keeping
 * GSE's rare-event props on count models (Gamma-Poisson NB, `props-hb-int.ts`)
 * with the e = p − q LCB gate, never on raw classifier scores. This module's
 * two functions are the admission-harness convention that lesson implies: if
 * a classifier screen is ever proposed for a rare-event surface, it reports
 * precision at the recall bar the harness actually requires (not AUC, which
 * hides exactly this failure), and it uses inverse-frequency class weights
 * over synthetic resampling (their §II-D: SMOTE was tried and rejected as
 * impractical for time-varying multi-feature data — GSE never synthesizes
 * samples either).
 *
 * Pure. No I/O.
 */

export interface ClassWeights {
  readonly weightNegative: number;
  readonly weightPositive: number;
}

/**
 * Inverse-frequency class weights (their Eq. 1):
 *   w_class = n_total / (n_classes * n_instances_in_class)
 * Hand-verified against the paper's own printed numbers: their train split
 * (n=5,336, 130 DPI positives) yields weightNegative ≈ 0.51,
 * weightPositive ≈ 20.52 — matching Table I/§II-D exactly.
 */
export function inverseFrequencyClassWeights(labels: readonly (0 | 1)[]): ClassWeights {
  const n = labels.length;
  if (n === 0) {
    throw new RangeError("inverseFrequencyClassWeights: labels must be non-empty");
  }
  const nPositive = labels.reduce((s: number, l) => s + l, 0);
  const nNegative = n - nPositive;
  if (nPositive === 0 || nNegative === 0) {
    throw new RangeError(
      "inverseFrequencyClassWeights: both classes must have at least one example (got " +
        `${nNegative} negative, ${nPositive} positive)`,
    );
  }
  const nClasses = 2;
  return {
    weightNegative: n / (nClasses * nNegative),
    weightPositive: n / (nClasses * nPositive),
  };
}

export interface PrecisionAtRecallResult {
  /** The score threshold (predict positive iff score >= threshold) achieving this operating point. */
  readonly threshold: number;
  readonly precision: number;
  readonly recall: number;
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly totalPositives: number;
}

/**
 * The paper's own operating metric (§III): among every threshold achieving
 * recall >= `targetRecall`, return the one with the HIGHEST precision (their
 * models were "tuned for best precision at recall >= 0.8" — missing a real
 * event is worse than a false flag that gets manually checked). Ties on
 * precision keep the higher (more conservative, fewer false positives)
 * threshold, since recall only ever needs to clear the bar, not maximize.
 *
 * Always returns a result: recall = 1.0 is achievable by predicting every
 * row positive, so any `targetRecall` in [0, 1] has a feasible operating
 * point. Throws if there are no positive labels at all (recall is
 * undefined), if `scores`/`labels` don't match in length, or if
 * `targetRecall` is outside [0, 1].
 */
export function precisionAtRecall(
  scores: readonly number[],
  labels: readonly (0 | 1)[],
  targetRecall: number,
): PrecisionAtRecallResult {
  if (scores.length !== labels.length) {
    throw new RangeError(`precisionAtRecall: scores (${scores.length}) and labels (${labels.length}) must match in length`);
  }
  if (scores.length === 0) {
    throw new RangeError("precisionAtRecall: scores/labels must be non-empty");
  }
  if (!Number.isFinite(targetRecall) || targetRecall < 0 || targetRecall > 1) {
    throw new RangeError(`precisionAtRecall: targetRecall must be in [0, 1], got ${targetRecall}`);
  }
  const totalPositives = labels.reduce((s: number, l) => s + l, 0);
  if (totalPositives === 0) {
    throw new RangeError("precisionAtRecall: no positive labels — recall is undefined");
  }

  const pairs = scores
    .map((score, i) => ({ score, label: labels[i]! }))
    .sort((a, b) => b.score - a.score);

  let tp = 0;
  let fp = 0;
  let best: PrecisionAtRecallResult | null = null;
  let i = 0;
  while (i < pairs.length) {
    const threshold = pairs[i]!.score;
    // Tied scores share one threshold — resolve the whole tie block before
    // evaluating, so precision/recall at this threshold are well-defined.
    while (i < pairs.length && pairs[i]!.score === threshold) {
      if (pairs[i]!.label === 1) tp++;
      else fp++;
      i++;
    }
    const recall = tp / totalPositives;
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    if (recall >= targetRecall && (best === null || precision > best.precision)) {
      best = { threshold, precision, recall, truePositives: tp, falsePositives: fp, totalPositives };
    }
  }

  // Unreachable: recall reaches 1.0 >= any valid targetRecall by the time
  // every pair is included, so `best` is always set.
  return best!;
}
