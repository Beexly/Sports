/**
 * arXiv 1301.0594 — Pennock et al., "Modeling Information Incorporation in
 * Markets with Combinatorial Prediction Spaces."
 *
 * IMPROVEMENT: CLV surprise score S = Δlogit(p)/sqrt(Var_t); flag steam when
 * |Δlogit| exceeds k × predicted scale; optional expected-entropy-loss news
 * attribution.
 *
 * ACCEPTANCE GATE: ADAPT confirmed if on 2025 NFL season variance-normalized
 * surprise moves predict direction of remaining move to close at ≥55% accuracy
 * (baseline 50%) with ≥200 flagged events. REJECT if surprise score adds
 * nothing over raw move size (continuation-rate gap < 5pp).
 *
 * Gate status: NOT EVALUATED. Owner Motif-lab. Bucket MODEL. Lane markets.
 * Verdict ADAPT.
 *
 * ADDITIVE utility. Not wired into any live model path. Disabled by default.
 */

/** Kill switch. Leave false until the ACCEPTANCE GATE is measured. */
export const ENABLED = false;

const LOGIT_EPS = 1e-12;

/**
 * Logit of a probability in (0, 1). Clamps endpoints away from 0/1 so the
 * transform stays finite.
 */
export function logit(p: number): number {
  if (!Number.isFinite(p)) {
    throw new Error("logit: p must be finite");
  }
  const clamped = Math.min(1 - LOGIT_EPS, Math.max(LOGIT_EPS, p));
  return Math.log(clamped / (1 - clamped));
}

/**
 * Δlogit between two probabilities: logit(p1) − logit(p0).
 */
export function deltaLogit(p0: number, p1: number): number {
  return logit(p1) - logit(p0);
}

/**
 * Variance-normalized surprise score S = Δlogit / √Var_t.
 * Throws when Var_t is not positive and finite.
 */
export function surpriseScore(deltaLogitValue: number, varT: number): number {
  if (!Number.isFinite(deltaLogitValue)) {
    throw new Error("surpriseScore: deltaLogit must be finite");
  }
  if (!Number.isFinite(varT) || varT <= 0) {
    throw new Error("surpriseScore: varT must be a positive finite number");
  }
  return deltaLogitValue / Math.sqrt(varT);
}

/**
 * Steam flag: |Δlogit| exceeds k × predicted scale.
 * Throws when scale is not positive and finite or k is not finite / non-positive.
 */
export function isSteamFlag(
  deltaLogitValue: number,
  scale: number,
  k: number,
): boolean {
  if (!Number.isFinite(deltaLogitValue)) {
    throw new Error("isSteamFlag: deltaLogit must be finite");
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error("isSteamFlag: scale must be a positive finite number");
  }
  if (!Number.isFinite(k) || k <= 0) {
    throw new Error("isSteamFlag: k must be a positive finite number");
  }
  return Math.abs(deltaLogitValue) > k * scale;
}

/**
 * Binary entropy H(p) = −p log2(p) − (1−p) log2(1−p).
 * Endpoints return 0.
 */
export function binaryEntropy(p: number): number {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new Error("binaryEntropy: p must be in [0, 1]");
  }
  if (p === 0 || p === 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/**
 * Expected entropy loss from a prior probability p0 to a posterior p1.
 * Positive when the move concentrates probability mass (information gain).
 * Pure helper for optional news-attribution experiments — not a gate input.
 */
export function expectedEntropyLoss(p0: number, p1: number): number {
  return binaryEntropy(p0) - binaryEntropy(p1);
}
