/**
 * Quantile temporal attention for sports time series — arXiv 2404.13371v1
 * ("Temporal Attention Enhanced Quantile Prediction for...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: replace rolling quantile averaging with temporal
 * attention over a trailing K-week window: per-quantile attention heads
 * weight the K weekly contexts (team form, injuries, weather, line
 * movement), and each tau-quantile prediction is the attention-weighted
 * combination of per-week quantile candidates. Attention entropy is
 * penalized during training (documented; training stays offline) so heads
 * stay diffuse rather than collapsing on one week. Interpretability: the
 * per-week attention weights and per-feature contributions are the
 * serving-time artifact for the game preview ("the model is 70% keyed on
 * the last two weeks because...").
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff on the 2025 holdout the
 * attention-quantile model beats rolling-quantile averaging on pinball loss
 * by >=10% relative at tau in {0.1, 0.5, 0.9} AND the attention weights
 * correlate with known regime shifts (attention mass on post-injury weeks
 * >= 2x uniform in the injury-shock audit).
 */

export type Vector = readonly number[];

/** Numerically stable softmax. */
export function softmax(logits: readonly number[]): number[] {
  if (logits.length === 0) return [];
  const m = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - m));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}

function dot(a: Vector, b: Vector): number {
  let s = 0;
  for (let i = 0; i < a.length && i < b.length; i++) s += a[i]! * b[i]!;
  return s;
}

/**
 * Temporal attention: query (current-week context) attends over K weekly
 * key contexts. Scores = q.k_i / sqrt(d); weights = softmax(scores).
 */
export function temporalAttention(query: Vector, keys: ReadonlyArray<Vector>): number[] {
  const d = Math.max(query.length, 1);
  return softmax(keys.map((k) => dot(query, k) / Math.sqrt(d)));
}

/**
 * Per-quantile prediction: attention-weighted combination of per-week
 * quantile candidates. values[t][h] = week t's candidate for quantile
 * head h. Returns one prediction per head.
 */
export function perQuantilePrediction(
  weights: readonly number[],
  values: ReadonlyArray<ReadonlyArray<number>>,
): number[] {
  if (values.length === 0) return [];
  const heads = values[0]!.length;
  const out = new Array<number>(heads).fill(0);
  for (let t = 0; t < values.length && t < weights.length; t++) {
    for (let h = 0; h < heads; h++) {
      out[h]! += weights[t]! * values[t]![h]!;
    }
  }
  return out;
}

/** Attention entropy (nats): the training-time penalty term. */
export function attentionEntropy(weights: readonly number[]): number {
  let h = 0;
  for (const w of weights) {
    if (w > 0) h -= w * Math.log(w);
  }
  return h;
}

/**
 * Interpretability artifact: per-week attention weights paired with the
 * week's label, sorted by descending weight, for the game preview log.
 */
export function attentionReport(
  weights: readonly number[],
  weekLabels: readonly string[],
  topK = 3,
): ReadonlyArray<{ readonly week: string; readonly weight: number }> {
  return weights
    .map((weight, i) => ({ week: weekLabels[i] ?? `week-${i}`, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topK);
}
