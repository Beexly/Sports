/**
 * arXiv 1612.00796v2: Overcoming Catastrophic Forgetting in Neural Networks (EWC)
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Per-feature importance-weighted anchoring for weekly GBM refits (EWC
adapted): penalty sum_i (lambda/2) w_i (s_i - s*_i)^2 where s_i is the current
model's per-feature contribution (mean |SHAP| or split gain), s*_i its value
in the full-history reference model, and w_i the normalized reference
importance (the paper's Fisher diagonal replaced by GBM importance). The
Fisher-overlap diagnostic (cosine similarity of per-feature importance
vectors across regime strata) marks shared-representation features to anchor
hard and regime-specific features to move freely.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add per-feature importance-weighted anchoring (EWC) to weekly GBM refits: penalty term sum_i (lambda/2)*w_i*(s_i - s*_i)^2 where s_i is the current model's per-feature contribution (mean |SHAP| or split gain) and s*_i its value in the reference (full-history) model, w_i = normalized importance in the reference model (EWC's Eq. 3 with the Fisher diagonal replaced by GBM importance); plus the Fisher-overlap diagnostic -- quarterly per-feature importance vectors for regime strata (early/mid/late/playoff), cosine-similarity overlap; high-overlap features = shared representation (anchor hard), low-overlap = regime-specific (let them move freely). This stops weekly refits from catastrophically forgetting the full-history model's core physics when adapting to small recent samples.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT per-feature importance-weighted anchoring if on 2020-2025 walk-forward: (i) (C) beats (B) on >=2 of 1887's 4 metrics, (ii) worst-week Brier improves >=0.002 vs plain refit (A), (iii) the shared-feature core is stable across seasons.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: continual_online_learning | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2020-2025 walk-forward vs plain refit.

/**
 * EWC penalty with the Fisher diagonal replaced by normalized GBM feature
 * importance: sum_i (lambda/2) w_i (s_i - s*_i)^2.
 */
export function ewcPenalty(
  current: number[],
  reference: number[],
  importance: number[],
  lambda: number,
): number {
  const tot = importance.reduce((a, b) => a + b, 0) || 1;
  let p = 0;
  for (let i = 0; i < current.length; i++) {
    const w = importance[i]! / tot;
    p += (lambda / 2) * w * (current[i]! - reference[i]!) ** 2;
  }
  return p;
}

/** Gradient of the EWC penalty w.r.t. the current contributions. */
export function ewcGradient(
  current: number[],
  reference: number[],
  importance: number[],
  lambda: number,
): number[] {
  const tot = importance.reduce((a, b) => a + b, 0) || 1;
  return current.map((s, i) => lambda * (importance[i]! / tot) * (s - reference[i]!));
}

/** One gradient step on (task loss + EWC penalty). */
export function anchoredStep(
  current: number[],
  grad: number[],
  reference: number[],
  importance: number[],
  lambda: number,
  lr: number,
): number[] {
  const tot = importance.reduce((a, b) => a + b, 0) || 1;
  return current.map((s, i) => {
    const w = importance[i]! / tot;
    return s - lr * (grad[i]! + lambda * w * (s - reference[i]!));
  });
}

/** Fisher-overlap diagnostic: cosine similarity of importance vectors. */
export function importanceOverlap(a: number[], b: number[]): number {
  const dot = a.reduce((s, x, i) => s + x * b[i]!, 0);
  const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return na === 0 || nb === 0 ? 0 : dot / (na * nb);
}

export type OverlapRegime = "shared-representation" | "regime-specific";

/**
 * High-overlap features = shared representation (anchor hard);
 * low-overlap = regime-specific (let them move freely).
 */
export function overlapRegime(overlap: number, threshold = 0.7): OverlapRegime {
  return overlap >= threshold ? "shared-representation" : "regime-specific";
}
