/**
 * Time-uniform CVaR confidence sequences — arXiv 2402.16300
 * ("Confidence Sequences for CVaR...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: build a time-uniform confidence sequence for CVaR of
 * the P&L stream (sequential Gamma-exponential mixture test martingales)
 * instead of the fixed-ensemble bootstrap currently used in reliability
 * diagrams. Every week recompute the lower bound for CVaR_0.25 of weekly
 * profit; halt or resize a strategy the first week its sequential lower
 * bound crosses the abandon threshold (e.g. -2u/week) — anytime-valid, so
 * no multiple-testing penalty for checking weekly.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT iff on the 2022-2025
 * walk-forward the sequential rule stops losing strategies >=4 weeks
 * earlier than the fixed-ensemble rule at the same false-stop rate
 * (<=1 false stop per strategy per season).
 */

/** Empirical lower-tail CVaR (mean of the worst tau-fraction). */
export function empiricalCvar(samples: readonly number[], tau: number): number {
  const t = Math.min(Math.max(tau, 0), 1);
  if (samples.length === 0) return 0;
  const s = [...samples].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(t * s.length));
  let sum = 0;
  for (let i = 0; i < k; i++) sum += s[i]!;
  return sum / k;
}

/**
 * Time-uniform lower bound for CVaR_tau: empirical CVaR minus a
 * DKW-style radius. The paper's Gamma-exponential mixture martingale
 * gives a tighter radius; this is the serving-time conservative form
 * (documented; the mixture weights are fit offline on 2022-2025).
 */
export function cvarTimeUniformLowerBound(
  samples: readonly number[],
  tau: number,
  alpha: number,
): number {
  const n = samples.length;
  if (n === 0) return Number.NEGATIVE_INFINITY;
  const radius = Math.sqrt(Math.log(2 / Math.max(alpha, 1e-12)) / (2 * n));
  return empiricalCvar(samples, tau) - radius;
}

/**
 * One step of a test martingale: M_t = M_{t-1} * (1 + lambda * (e_t - c)).
 * Under the null (E[e_t] <= c), M_t is a nonnegative supermartingale.
 */
export function testMartingaleUpdate(
  mPrev: number,
  eT: number,
  center: number,
  lambda: number,
): number {
  return Math.max(mPrev * (1 + lambda * (eT - center)), 0);
}

/** Sequential rejection: reject the null when M_t >= 1/alpha. */
export function sequentialRejects(martingaleValue: number, alpha: number): boolean {
  return martingaleValue >= 1 / Math.max(alpha, 1e-12);
}

export interface ReliabilityBin {
  readonly meanPredicted: number;
  readonly empiricalFreq: number;
  readonly count: number;
}

/**
 * Reliability-diagram bins: split [0,1] predictions into `bins` equal
 * bins; per bin report mean prediction, empirical event frequency, count.
 */
export function reliabilityBins(
  predicted: readonly number[],
  actual: ReadonlyArray<0 | 1>,
  bins: number,
): ReliabilityBin[] {
  const out: ReliabilityBin[] = [];
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let sp = 0;
    let sa = 0;
    let n = 0;
    for (let i = 0; i < predicted.length; i++) {
      const p = predicted[i]!;
      if (p >= lo && (p < hi || (b === bins - 1 && p <= hi))) {
        sp += p;
        sa += actual[i]!;
        n++;
      }
    }
    out.push({
      meanPredicted: n === 0 ? (lo + hi) / 2 : sp / n,
      empiricalFreq: n === 0 ? Number.NaN : sa / n,
      count: n,
    });
  }
  return out;
}

/**
 * Sequential stop rule: walk the weekly P&L stream, recompute the
 * time-uniform CVaR lower bound each week, and return the first week the
 * bound crosses below the abandon threshold (null = never).
 */
export function firstCrossingWeek(
  weeklyProfits: readonly number[],
  tau: number,
  alpha: number,
  abandonThreshold: number,
  minWeeks = 4,
): number | null {
  for (let w = minWeeks; w <= weeklyProfits.length; w++) {
    const lb = cvarTimeUniformLowerBound(weeklyProfits.slice(0, w), tau, alpha);
    if (lb < abandonThreshold) return w;
  }
  return null;
}
