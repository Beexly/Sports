/**
 * arXiv:2604.17065v1 — BasketHAR: A Multimodal Dataset for Human Activity Recognition and Sport Analysis in Basketball Training Scenarios
 *
 * LoRA-ImageBind IMU/text alignment recipe for football action classification: cosine-similarity
 * cross-modal alignment with an InfoNCE loss, leave-one-chunk-out evaluation, macro-F1 reporting. Disabled:
 * pretrained encoders and the training run are unavailable.
 *
 * Improvement: Port the LoRA-ImageBind IMU/text alignment recipe to NFL practice-wearable or NGS-derived motion features for football action classification (route stem, break, catch, block engagement, tackle), feeding weekly practice-load report editorial products.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the alignment method if a reimplementation on the public BasketHAR data reaches macro F1 ≥ 0.65 within a clean leave-one-chunk-out protocol; reject the method if macro F1 falls below 0.55 once window leakage is removed.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Cosine similarity between modality embeddings. */
export function cosSim(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) throw new Error("cosSim: dim mismatch");
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return na === 0 || nb === 0 ? 0 : dot / (na * nb);
}

/**
 * InfoNCE alignment loss for one anchor: -log(exp(s+/tau) / sum_j exp(s_j/tau)).
 */
export function infoNCELoss(sims: readonly number[], posIdx: number, tau: number): number {
  if (tau <= 0) throw new Error("infoNCELoss: tau > 0");
  if (posIdx < 0 || posIdx >= sims.length) throw new Error("infoNCELoss: bad posIdx");
  const mx = Math.max(...sims);
  const ex = sims.map((s) => Math.exp((s - mx) / tau));
  const z = ex.reduce((s, e) => s + e, 0);
  return -Math.log(Math.max(1e-12, (ex[posIdx] ?? 0) / z));
}

/** Leave-one-chunk-out fold assignment (chunk = contiguous block). */
export function leaveOneChunkOut(n: number, nChunks: number): number[] {
  if (nChunks < 2) throw new Error("leaveOneChunkOut: nChunks >= 2");
  if (n <= 0) throw new Error("leaveOneChunkOut: n > 0");
  return Array.from({ length: n }, (_, i) => Math.min(nChunks - 1, Math.floor((i * nChunks) / n)));
}

/** Macro F1 over classes. */
export function macroF1(
  pred: readonly string[],
  truth: readonly string[],
): number {
  if (pred.length !== truth.length || pred.length === 0) {
    throw new Error("macroF1: length mismatch or empty");
  }
  const classes = [...new Set(truth)];
  const f1s = classes.map((c) => {
    let tp = 0, fp = 0, fn = 0;
    pred.forEach((p, i) => {
      if (p === c && truth[i] === c) tp++;
      else if (p === c) fp++;
      else if (truth[i] === c) fn++;
    });
    const prec = tp + fp === 0 ? 0 : tp / (tp + fp);
    const rec = tp + fn === 0 ? 0 : tp / (tp + fn);
    return prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);
  });
  return f1s.reduce((s, f) => s + f, 0) / f1s.length;
}
