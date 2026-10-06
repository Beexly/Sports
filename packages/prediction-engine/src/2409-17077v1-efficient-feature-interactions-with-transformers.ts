/**
 * arXiv:2409.17077v1 — Efficient Feature Interactions with Transformers: Improving User Spending Propensity Predictions in Gaming
 *
 * Time-decayed contextual features for drive-outcome prediction: the paper's fixed t±5 positional windows
 * become exponential-decay weights on game-clock distance plus explicit inter-play time-gap token features,
 * with isotonic/temperature calibration and ECE reporting.
 *
 * Improvement: Replace the paper's fixed t±5 positional contextual windows with time-decayed contextual features (exponential decay on game-clock distance, explicit inter-play time gaps as token features) for drive-outcome prediction, and add isotonic/temperature-scaled calibration with ECE reporting that the paper ignored.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT in two stages. Stage 1 (features): adopt the t±5 contextual-window features if challenger A beats baseline XGBoost on 2023–2024 test MAE by ≥ 1% with non-overlapping 10-seed intervals. Stage 2 (architecture): adopt the transformer only if challenger B beats *both* baseline and challenger A by ≥ 1% MAE *and* the inference cost passes the ledger's latency check.
 */

/** Arithmetic mean. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean: empty");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Population standard deviation. */
export function std(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("std: empty");
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

/** Exponential-decay weights on game-clock distance (half-life in seconds). */
export function decayWeights(clockDist: readonly number[], halfLife: number): number[] {
  if (halfLife <= 0) throw new Error("decayWeights: halfLife > 0");
  const k = Math.LN2 / halfLife;
  return clockDist.map((d) => Math.exp(-k * Math.max(0, d)));
}

/** Inter-play time-gap features: log-gap, gap z-score, and a long-gap flag. */
export function gapFeatures(gaps: readonly number[]): { logGap: number[]; z: number[]; longGap: boolean[] } {
  if (gaps.length === 0) throw new Error("gapFeatures: empty");
  const logGap = gaps.map((g) => Math.log(1 + Math.max(0, g)));
  const m = mean(logGap);
  const sd = std(logGap);
  return {
    logGap,
    z: logGap.map((v) => (sd === 0 ? 0 : (v - m) / sd)),
    longGap: gaps.map((g) => g > 40),
  };
}

/** Temperature-scaled softmax. */
export function temperatureScale(logits: readonly number[], T: number): number[] {
  if (T <= 0) throw new Error("temperatureScale: T > 0");
  if (logits.length === 0) throw new Error("temperatureScale: empty");
  const mx = Math.max(...logits);
  const ex = logits.map((l) => Math.exp((l - mx) / T));
  const z = ex.reduce((s, e) => s + e, 0);
  return ex.map((e) => e / z);
}

/** PAVA isotonic regression (non-decreasing fit). */
export function pavaIsotonic(ys: readonly number[]): number[] {
  const n = ys.length;
  if (n === 0) throw new Error("pavaIsotonic: empty");
  const blocks: { sum: number; count: number }[] = ys.map((y) => ({ sum: y, count: 1 }));
  let i = 0;
  while (i < blocks.length - 1) {
    const a = blocks[i]!;
    const b = blocks[i + 1]!;
    if (a.sum / a.count <= b.sum / b.count) {
      i++;
    } else {
      const merged = { sum: a.sum + b.sum, count: a.count + b.count };
      blocks.splice(i, 2, merged);
      if (i > 0) i--;
    }
  }
  const out: number[] = [];
  for (const bl of blocks) {
    for (let k = 0; k < bl.count; k++) out.push(bl.sum / bl.count);
  }
  return out;
}

/** Expected calibration error over equal-width bins. */
export function ece(probs: readonly number[], labels: readonly (0 | 1)[], bins = 10): number {
  if (probs.length !== labels.length || probs.length === 0) throw new Error("ece: length mismatch or empty");
  let err = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    const idx = probs.map((p, i) => ({ p, i })).filter(({ p }) => p > lo && p <= hi + 1e-12);
    if (idx.length === 0) continue;
    const meanP = mean(idx.map(({ p }) => p));
    const meanY = mean(idx.map(({ i }) => labels[i] ?? 0));
    err += (idx.length / probs.length) * Math.abs(meanP - meanY);
  }
  return err;
}
