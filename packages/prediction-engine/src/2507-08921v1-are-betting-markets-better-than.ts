/**
 * arXiv:2507.08921v1 — Are Betting Markets Better than Polling in Predicting Political Elections?
 *
 * PFF-ification from public tracking: play-level scores = baseline + technique + process + result terms,
 * winsorized and z-scored by position group, validated against EPA correlation and
 * separation-from-teammates agreement.
 *
 * Improvement: GSE classifies line moves as steam vs noise with a BSTS local-level model on de-vigged market-implied probability series: high tau^2/sigma^2 ratio means informed persistent moves, low means public churn.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT-accept iff informed-steam-flagged moves achieve mean CLV >=+1.5% (de-vigged) vs <=+0.3% for unflagged moves over the 2023-2024 test set with n>=200 flagged moves.
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
/** One graded play with the four additive components. */
export interface GradedPlay {
  position: string;
  baseline: number;
  technique: number;
  process: number;
  result: number;
}

/** Winsorize at the [lo, hi] quantiles of the sample. */
export function winsorize(xs: readonly number[], lo = 0.05, hi = 0.95): number[] {
  if (xs.length === 0) throw new Error("winsorize: empty");
  const sorted = [...xs].sort((a, b) => a - b);
  const q = (p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] ?? 0;
  const loV = q(lo);
  const hiV = q(hi);
  return xs.map((x) => Math.min(hiV, Math.max(loV, x)));
}

/** PFF-style play score: sum of the additive components. */
export function playScore(p: GradedPlay): number {
  return p.baseline + p.technique + p.process + p.result;
}

/**
 * Position-group z-scores: winsorize each group's raw scores, then z-score
 * within the group.
 */
export function positionZScores(plays: readonly GradedPlay[]): Map<GradedPlay, number> {
  const byPos = new Map<string, GradedPlay[]>();
  for (const p of plays) {
    const arr = byPos.get(p.position) ?? [];
    arr.push(p);
    byPos.set(p.position, arr);
  }
  const out = new Map<GradedPlay, number>();
  for (const group of byPos.values()) {
    const raw = group.map(playScore);
    const win = winsorize(raw);
    const m = mean(win);
    const sd = std(win);
    group.forEach((p, i) => out.set(p, sd === 0 ? 0 : ((win[i] ?? 0) - m) / sd));
  }
  return out;
}

/** Pearson correlation (EPA vs grade validation). */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 2) throw new Error("pearson: need >= 2 pairs");
  const mx = mean(xs);
  const my = mean(ys);
  const cov = xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0);
  const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return vx === 0 || vy === 0 ? 0 : cov / Math.sqrt(vx * vy);
}

/**
 * Separation-from-teammates: fraction of same-position teammates the player
 * outranks by mean z-score.
 */
export function teammateSeparation(
  playerZ: readonly number[],
  teammateZ: readonly (readonly number[])[],
): number {
  if (playerZ.length === 0) throw new Error("teammateSeparation: no plays");
  const mine = mean(playerZ);
  if (teammateZ.length === 0) return 1;
  const beaten = teammateZ.filter((tz) => tz.length > 0 && mine > mean(tz)).length;
  return beaten / teammateZ.length;
}
