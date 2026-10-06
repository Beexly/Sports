/**
 * Situational-spot honesty filter (ATS / FDR / placebo / CLV gate).
 *
 * Every situational spot (fatigue/hangover-style angles) must clear three
 * legs before entering the engine:
 *   (a) ATS cover rate >= 54.5% over >= 200 occurrences, Benjamini-Hochberg
 *       FDR-adjusted p < 0.05 (one-sided binomial vs 50%);
 *   (b) placebo (same spot with >= 10 days rest, or neutral-site analogue):
 *       |effect| < 1.5pp and non-significant at 0.05;
 *   (c) CLV beat-rate > 50%.
 * Anything failing a leg is logged as noise. Rest effects are modeled as an
 * exponential decay over hours-since-exposure (4-14 days), not dummies.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2412.21181v1 — Causal Hangover Effects.
 *
 * ACCEPTANCE GATE: adopt a spot only if all three legs pass.
 */

export interface SpotRecord {
  /** ATS covers. */
  readonly covers: number;
  /** Total occurrences. */
  readonly n: number;
  /** Placebo cover rate (same spot, rested/neutral analogue). */
  readonly placeboRate: number;
  /** Placebo occurrences. */
  readonly placeboN: number;
  /** Fraction of picks beating the closing line. */
  readonly clvBeatRate: number;
}

/** One-sided binomial p-value for covers/n vs 0.5 (normal approx with CC). */
export function binomialP(covers: number, n: number): number {
  if (!(n >= 1) || covers < 0 || covers > n) throw new Error("honesty-filter: bad covers/n");
  const mean = n * 0.5;
  const sd = Math.sqrt(n * 0.25);
  const z = (covers - 0.5 - mean) / Math.max(sd, 1e-12);
  return 1 - normalCdf(z);
}

function normalCdf(z: number): number {
  // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

/** Benjamini-Hochberg FDR adjustment; returns adjusted p-values (same order). */
export function benjaminiHochberg(pvals: readonly number[]): number[] {
  const m = pvals.length;
  if (m === 0) throw new Error("honesty-filter: need >= 1 p-value");
  const order = pvals.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adj = new Array<number>(m);
  let running = 1;
  for (let k = m - 1; k >= 0; k--) {
    const { p, i } = order[k]!;
    running = Math.min(running, (p * m) / (k + 1));
    adj[i] = Math.min(running, 1);
  }
  return adj;
}

export interface HonestyVerdict {
  readonly pass: boolean;
  /** Which legs failed (empty when pass). */
  readonly failedLegs: string[];
  readonly coverRate: number;
  readonly fdrP: number;
}

/**
 * Run the three-leg honesty gate on one spot.
 * @param fdrP the spot's FDR-adjusted p-value (from a batch BH correction).
 */
export function honestyGate(spot: SpotRecord, fdrP: number): HonestyVerdict {
  const failed: string[] = [];
  const coverRate = spot.covers / Math.max(spot.n, 1);
  if (!(spot.n >= 200)) failed.push("sample: n < 200");
  if (!(coverRate >= 0.545)) failed.push("edge: ATS cover rate < 54.5%");
  if (!(fdrP < 0.05)) failed.push("significance: FDR-adjusted p >= 0.05");
  const placeboEffect = Math.abs(spot.placeboRate - 0.5);
  const placeboP = binomialP(
    Math.round(spot.placeboRate * spot.placeboN),
    Math.max(spot.placeboN, 1),
  );
  if (!(placeboEffect < 0.015 && placeboP >= 0.05)) failed.push("placebo: effect >= 1.5pp or significant");
  if (!(spot.clvBeatRate > 0.5)) failed.push("clv: beat-rate <= 50%");
  return { pass: failed.length === 0, failedLegs: failed, coverRate, fdrP };
}

/**
 * Exponential rest-decay curve: effect(h) = a * exp(-h / tau), fit by
 * log-linear least squares on (hours, effect) points in [96, 336]h.
 */
export function fitRestDecay(
  hours: readonly number[],
  effects: readonly number[],
): { a: number; tau: number } {
  if (hours.length !== effects.length || hours.length < 2) {
    throw new Error("honesty-filter: need >= 2 aligned points");
  }
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
  for (let i = 0; i < hours.length; i++) {
    const h = hours[i] ?? 0;
    const e = effects[i] ?? 0;
    if (!(h >= 96 && h <= 336) || !(e > 0)) continue;
    const x = h, y = Math.log(e);
    sx += x; sy += y; sxx += x * x; sxy += x * y; n++;
  }
  if (n < 2) throw new Error("honesty-filter: need >= 2 positive effects in [96,336]h");
  const slope = (n * sxy - sx * sy) / Math.max(n * sxx - sx * sx, 1e-12);
  if (!(slope < 0)) throw new Error("honesty-filter: effects do not decay with rest");
  const tau = -1 / slope;
  const a = Math.exp((sy - slope * sx) / n);
  return { a, tau };
}
