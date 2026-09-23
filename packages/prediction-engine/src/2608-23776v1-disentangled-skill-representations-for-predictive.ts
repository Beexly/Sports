/**
 * arXiv:2608.23776v1 — Disentangled Skill Representations for Predictive Human Modeling
 *
 * Player availability regression: availability ~ health + load + performance + context features, trained
 * only on players with full histories (survivorship-bias-free), with a calibrated probability output for
 * lineup decisions.
 *
 * Improvement: Build a SAIL-for-NFL prototype that learns disentangled player-skill embeddings from NGS tracking snippets (participant = player-season, context = coverage shell/down-distance/field zone) with expert/novice bases and an adversarial team-vs-scheme decomposition, conditioning GSE's prop models on matchup-adjusted skill rather than raw stats.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the SAIL-NFL architecture for prop-model conditioning if on the 2023-2024 WR test: test-retest >= 0.90, in-context RMSE beats the AE baseline by >=15% relative, and AR >= 2.0; REJECT if embeddings are no more stable than per-game AE embeddings (test-retest gap < 0.05) or AR < 1.2.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Availability features for one player-week. */
export interface AvailabilityFeatures {
  health: number; // 0..1 (1 = fully healthy)
  load: number; // 0..1 recent workload
  performance: number; // z-scored recent form
  context: number; // travel/rest/schedule difficulty, z-scored
}

/**
 * Fit availability regression (logistic) — only on rows with full histories.
 * Returns coefficients [intercept, health, load, performance, context].
 */
export function fitAvailability(
  feats: readonly AvailabilityFeatures[],
  played: readonly (0 | 1)[],
  iters = 60,
): number[] {
  if (feats.length !== played.length || feats.length === 0) {
    throw new Error("fitAvailability: length mismatch or empty");
  }
  const toX = (f: AvailabilityFeatures): number[] => [1, f.health, f.load, f.performance, f.context];
  let beta = new Array<number>(5).fill(0);
  const lr = 0.5;
  for (let it = 0; it < iters; it++) {
    const g = new Array<number>(5).fill(0);
    for (let i = 0; i < feats.length; i++) {
      const x = toX(feats[i]!);
      const eta = x.reduce((s, v, j) => s + v * (beta[j] ?? 0), 0);
      const r = logistic(eta) - (played[i] ?? 0);
      for (let j = 0; j < 5; j++) g[j] = (g[j] ?? 0) + r * (x[j] ?? 0);
    }
    for (let j = 0; j < 5; j++) beta[j] = (beta[j] ?? 0) - lr * ((g[j] ?? 0) / feats.length);
  }
  return beta;
}

/** Predict availability probability. */
export function availabilityProb(beta: readonly number[], f: AvailabilityFeatures): number {
  if (beta.length !== 5) throw new Error("availabilityProb: beta length 5");
  return logistic(beta[0]! + beta[1]! * f.health + beta[2]! * f.load + beta[3]! * f.performance + beta[4]! * f.context);
}

/**
 * Platt-style calibration: refit a 1-D logistic on (predicted, actual) pairs.
 */
export function plattCalibrate(
  preds: readonly number[],
  actual: readonly (0 | 1)[],
): { a: number; b: number } {
  if (preds.length !== actual.length || preds.length < 4) {
    throw new Error("plattCalibrate: need >= 4 pairs");
  }
  const clip = (p: number): number => Math.min(1 - 1e-6, Math.max(1e-6, p));
  let a = 0;
  let b = 1;
  const lr = 0.5;
  for (let it = 0; it < 200; it++) {
    let ga = 0;
    let gb = 0;
    for (let i = 0; i < preds.length; i++) {
      const z = a + b * Math.log(clip(preds[i]!) / (1 - clip(preds[i]!)));
      const r = logistic(z) - (actual[i] ?? 0);
      ga += r;
      gb += r * Math.log(clip(preds[i]!) / (1 - clip(preds[i]!)));
    }
    a -= lr * ga / preds.length;
    b -= lr * gb / preds.length;
  }
  return { a, b };
}

/** Apply the Platt map to a raw probability. */
export function plattApply(cal: { a: number; b: number }, p: number): number {
  const c = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return logistic(cal.a + cal.b * Math.log(c / (1 - c)));
}
