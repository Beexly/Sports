
/** Normalize a vector to sum to 1. */
export function normalize(p: readonly number[]): number[] {
  const sum = p.reduce((s, v) => s + v, 0);
  if (!(sum > 0)) throw new Error("effective-breadth: need positive total mass");
  return p.map((v) => Math.max(v, 0) / sum);
}

/** Effective breadth: 1 / sum(p_i^2), in [1, n]. */
export function effectiveBreadth(probs: readonly number[]): number {
  const p = normalize(probs);
  const hhi = p.reduce((s, v) => s + v * v, 0);
  return 1 / Math.max(hhi, 1e-12);
}

/** Entropy breadth: exp(H), in [1, n]. */
export function entropyBreadth(probs: readonly number[]): number {
  const p = normalize(probs);
  const h = -p.reduce((s, v) => s + (v > 0 ? v * Math.log(v) : 0), 0);
  return Math.exp(h);
}

/** True when the field is top-heavy (breadth < 40% of nominal size). */
export function isTopHeavy(probs: readonly number[], frac = 0.4): boolean {
  return effectiveBreadth(probs) < frac * probs.length;
}
