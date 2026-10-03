/**
 * arXiv:2409.09884v1 — Dynamic quantification of player value for fantasy basketball
 *
 * Passer-rating decomposition via tracking: traditional rating split into within-structure vs
 * out-of-structure contributions, with the paper's R^2-vs-games table shape as the acceptance comparison.
 *
 * Improvement: Ship H-scoring-style dynamic drafting in GSE's fantasy products, upgrading the paper's static-rank opponent assumption with a mixture over real opponent archetypes (punters, position-runners, value drafters) fit from actual ADP data.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT H-scoring-style dynamic drafting if, across 1,000 simulated seasons per seat, it beats static-rank drafting by ≥5 percentage points of playoff rate with SE ≤ 1.6%. Reject if the gain concentrates only in top seats.
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
/** One pass attempt with tracking context. */
export interface PassAttempt {
  /** In-structure (designed timing) or out-of-structure (extended/improvised). */
  structured: boolean;
  complete: boolean;
  yards: number;
  td: boolean;
  int: boolean;
}

/** NFL passer rating (0-158.3) from component totals. */
export function passerRating(
  att: number,
  comp: number,
  yards: number,
  td: number,
  int: number,
): number {
  if (att <= 0) throw new Error("passerRating: att > 0");
  const clamp = (v: number): number => Math.min(2.375, Math.max(0, v));
  const a = clamp(((comp / att) - 0.3) * 5);
  const b = clamp(((yards / att) - 3) * 0.25);
  const c = clamp((td / att) * 20);
  const d = clamp(2.375 - ((int / att) * 25));
  return ((a + b + c + d) / 6) * 100;
}

/** Aggregate a split's attempts and rate it. */
export function splitRating(atts: readonly PassAttempt[]): number {
  const n = atts.length;
  if (n === 0) throw new Error("splitRating: no attempts");
  return passerRating(
    n,
    atts.filter((a) => a.complete).length,
    atts.reduce((s, a) => s + a.yards, 0),
    atts.filter((a) => a.td).length,
    atts.filter((a) => a.int).length,
  );
}

/**
 * Decomposition: ratings for the in-structure split, the out-of-structure
 * split, and the share of attempts in structure.
 */
export function decomposeRating(atts: readonly PassAttempt[]): {
  inStructure: number | null;
  outOfStructure: number | null;
  structuredShare: number;
} {
  const ins = atts.filter((a) => a.structured);
  const oos = atts.filter((a) => !a.structured);
  return {
    inStructure: ins.length > 0 ? splitRating(ins) : null,
    outOfStructure: oos.length > 0 ? splitRating(oos) : null,
    structuredShare: atts.length > 0 ? ins.length / atts.length : 0,
  };
}

/** R^2 of a simple linear fit (the paper's stability table). */
export function rSquared(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 3) throw new Error("rSquared: need >= 3 pairs");
  const mx = mean(xs);
  const my = mean(ys);
  let ssRes = 0;
  let ssTot = 0;
  const denom = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = denom === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0) / denom;
  xs.forEach((x, i) => {
    const yHat = my + slope * (x - mx);
    ssRes += ((ys[i] ?? 0) - yHat) ** 2;
    ssTot += ((ys[i] ?? 0) - my) ** 2;
  });
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}
