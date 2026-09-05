/**
 * Suppression-curve toolkit — R&D, dark, unwired.
 *
 * SEMANTICS (read from code, not assumed):
 *   DROP, not FALLBACK.
 *   apps/web/lib/calibration/selective-publish-runtime.ts:133
 *     if (cfg.pausedGroups.includes(groupKey)) return false;
 *   Paused groups are omitted from publish. They do not fall back to the
 *   market. So a RANDOM suppression leaves expected accuracy unchanged:
 *   the random baseline is a FLAT line at the unfiltered win rate.
 *
 * ranking-pause-apply.ts only decides which groups are paused. It does
 * not substitute another signal. Same DROP semantics.
 *
 * RNG seed for every public helper that draws: 20260818 (mulberry32).
 *
 * Do not import from a live path. Do not flip RANKING_PAUSE_APPLY.
 */

export const SUPPRESSION_CURVE_SEED = 20260818;

export type Outcome = 0 | 1;

export type CurvePoint = {
  readonly rate: number;
  readonly nKept: number;
  readonly accuracy: number | null;
  readonly brier: number | null;
};

export type RandomBand = {
  readonly rate: number;
  readonly mean: number | null;
  readonly lo: number | null;
  readonly hi: number | null;
};

export type KeepMask = readonly boolean[];

/**
 * policy(scores, outcomes, rate, rng) → keep-mask (true = survive / published).
 * `rate` is the suppression fraction f in [0, 1].
 */
export type SuppressionPolicy = (
  scores: readonly number[],
  outcomes: readonly Outcome[],
  rate: number,
  rng: () => number,
) => KeepMask;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nDrop(n: number, rate: number): number {
  if (n <= 0) return 0;
  if (rate <= 0) return 0;
  if (rate >= 1) return n;
  return Math.min(n, Math.floor(rate * n + 1e-12));
}

export function scoreOnMask(
  scores: readonly number[],
  outcomes: readonly Outcome[],
  keep: KeepMask,
): { nKept: number; accuracy: number | null; brier: number | null } {
  let kept = 0;
  let wins = 0;
  let brierSum = 0;
  for (let i = 0; i < outcomes.length; i++) {
    if (!keep[i]) continue;
    kept += 1;
    wins += outcomes[i]!;
    const p = scores[i] ?? 0.5;
    const y = outcomes[i]!;
    brierSum += (p - y) * (p - y);
  }
  if (kept === 0) return { nKept: 0, accuracy: null, brier: null };
  return { nKept: kept, accuracy: wins / kept, brier: brierSum / kept };
}

export function unfilteredValue(
  scores: readonly number[],
  outcomes: readonly Outcome[],
): { accuracy: number; brier: number } {
  const all = outcomes.map(() => true);
  const s = scoreOnMask(scores, outcomes, all);
  return { accuracy: s.accuracy ?? 0, brier: s.brier ?? 0 };
}

/** Drop a uniformly random subset of size floor(f*n). DROP semantics. */
export function randomPolicy(
  _scores: readonly number[],
  outcomes: readonly Outcome[],
  rate: number,
  rng: () => number,
): KeepMask {
  const n = outcomes.length;
  const drop = nDrop(n, rate);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = tmp;
  }
  const keep = Array.from({ length: n }, () => true);
  for (let k = 0; k < drop; k++) keep[idx[k]!] = false;
  return keep;
}

/** Suppress losers first (then leftover winners if f demands more). */
export function oraclePolicy(
  _scores: readonly number[],
  outcomes: readonly Outcome[],
  rate: number,
  _rng: () => number,
): KeepMask {
  const n = outcomes.length;
  const drop = nDrop(n, rate);
  const losers: number[] = [];
  const winners: number[] = [];
  for (let i = 0; i < n; i++) {
    if (outcomes[i] === 0) losers.push(i);
    else winners.push(i);
  }
  const keep = Array.from({ length: n }, () => true);
  let left = drop;
  for (const i of losers) {
    if (left === 0) break;
    keep[i] = false;
    left -= 1;
  }
  for (const i of winners) {
    if (left === 0) break;
    keep[i] = false;
    left -= 1;
  }
  return keep;
}

export function curveAtRates(
  scores: readonly number[],
  outcomes: readonly Outcome[],
  rates: readonly number[],
  policy: SuppressionPolicy,
  seed: number = SUPPRESSION_CURVE_SEED,
): CurvePoint[] {
  const rng = mulberry32(seed);
  return rates.map((rate) => {
    const keep = policy(scores, outcomes, rate, rng);
    const s = scoreOnMask(scores, outcomes, keep);
    return { rate, nKept: s.nKept, accuracy: s.accuracy, brier: s.brier };
  });
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  const w = pos - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function randomBaseline(
  outcomes: readonly Outcome[],
  rates: readonly number[],
  draws: number,
  seed: number = SUPPRESSION_CURVE_SEED,
): RandomBand[] {
  const scores = outcomes.map(() => 0.5);
  const rng = mulberry32(seed);
  return rates.map((rate) => {
    if (rate <= 0) {
      const all = outcomes.map(() => true);
      const s = scoreOnMask(scores, outcomes, all);
      return { rate, mean: s.accuracy, lo: s.accuracy, hi: s.accuracy };
    }
    const acc: number[] = [];
    for (let d = 0; d < draws; d++) {
      const keep = randomPolicy(scores, outcomes, rate, rng);
      const s = scoreOnMask(scores, outcomes, keep);
      if (s.accuracy !== null) acc.push(s.accuracy);
    }
    if (acc.length === 0) {
      return { rate, mean: null, lo: null, hi: null };
    }
    acc.sort((a, b) => a - b);
    const mean = acc.reduce((x, y) => x + y, 0) / acc.length;
    return {
      rate,
      mean,
      lo: percentile(acc, 0.025),
      hi: percentile(acc, 0.975),
    };
  });
}

export function oracleBaseline(
  outcomes: readonly Outcome[],
  rates: readonly number[],
): CurvePoint[] {
  const scores = outcomes.map(() => 0.5);
  return rates.map((rate) => {
    const keep = oraclePolicy(scores, outcomes, rate, () => 0);
    const s = scoreOnMask(scores, outcomes, keep);
    return { rate, nKept: s.nKept, accuracy: s.accuracy, brier: s.brier };
  });
}

/**
 * Trapezoid area between policy accuracy and random mean, over rates in [0,1].
 * Null accuracies (100% suppress) contribute 0.
 */
export function curveGap(policy: readonly CurvePoint[], random: readonly RandomBand[]): number {
  const n = Math.min(policy.length, random.length);
  if (n < 2) return 0;
  let area = 0;
  for (let i = 1; i < n; i++) {
    const x0 = policy[i - 1]!.rate;
    const x1 = policy[i]!.rate;
    const y0 = (policy[i - 1]!.accuracy ?? 0) - (random[i - 1]!.mean ?? 0);
    const y1 = (policy[i]!.accuracy ?? 0) - (random[i]!.mean ?? 0);
    area += 0.5 * (x1 - x0) * (y0 + y1);
  }
  return area;
}
