/**
 * Brier-optimized extremization-exponent (γ) tuning for log-odds pooling.
 *
 * EDGE THESIS: `log-odds-pool.ts` implements the extremized geometric mean of
 * odds but leaves γ caller-supplied. The forecasting-platform literature
 * (Metaculus production aggregator; Baron et al. 2014; Satopää et al. 2014)
 * selects γ by minimizing a proper scoring rule on historical predictions.
 * This module is that selection loop: grid-search γ over candidate values,
 * score each with the Brier rule on pooled-vs-outcome data, return the argmin
 * plus the full curve so callers can see how flat the optimum is (a flat curve
 * means γ is unidentifiable on this data — report it, do not hide it).
 *
 * This is the pure math layer only — no gate wiring, no I/O. Honesty rules:
 * fail closed on empty/mismatched input; require at least one valid γ > 0;
 * never extrapolate outside the supplied grid; ties resolve to the SMALLEST γ
 * (least extremization) to keep the default conservative.
 *
 * References:
 * - Baron et al. (2014), "Two Reasons to Make Aggregated Probability Forecasts
 *   More Extreme" — extremization exponent fit by minimizing Brier score.
 * - Metaculus engineering: extremization parameter tuned per-question-class on
 *   resolved historical forecasts.
 */

import { logOddsPool, type PooledMember } from "./log-odds-pool.js";

export interface GammaTuningEvent {
  /** Pooled members for one resolved question/game. */
  readonly members: readonly PooledMember[];
  /** Observed outcome: 1 if the event happened, 0 otherwise. */
  readonly outcome: 0 | 1;
}

export interface GammaCurvePoint {
  readonly gamma: number;
  readonly brier: number;
}

export interface GammaTuningResult {
  /** Grid value achieving the lowest Brier score (ties → smallest gamma). */
  readonly bestGamma: number;
  /** Brier at bestGamma. */
  readonly bestBrier: number;
  /** Brier of the unextremized pool (gamma = 1), for comparison. */
  readonly baselineBrier: number;
  /** Full (gamma, brier) curve in input order. */
  readonly curve: readonly GammaCurvePoint[];
  /**
   * True when the curve's best is within `flatnessEpsilon` of BOTH neighbors
   * around the optimum — signals an unidentifiable gamma on this dataset.
   */
  readonly flatOptimum: boolean;
  /** Number of events actually scored (members that pooled successfully). */
  readonly nScored: number;
  /** Per-event indices skipped because every member failed pool validation. */
  readonly skippedEventIndices: readonly number[];
}

const DEFAULT_GRID = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];

function brierOf(pooled: number, outcome: 0 | 1): number {
  const diff = pooled - outcome;
  return diff * diff;
}

/**
 * Grid-search the extremization exponent against realized outcomes using the
 * Brier score. Pure; no I/O. Events where NO member survives pool validation
 * are reported in `skippedEventIndices` — never silently imputed.
 */
export function tuneExtremizationGamma(
  events: readonly GammaTuningEvent[],
  options: {
    /** Candidate γ values, all finite and > 0. Defaults to a standard grid. */
    grid?: readonly number[];
    /** Flatness tolerance for the flatOptimum diagnostic. Default 1e-4. */
    flatnessEpsilon?: number;
  } = {},
): GammaTuningResult {
  const { grid = DEFAULT_GRID } = options;
  const eps = options.flatnessEpsilon ?? 1e-4;

  if (!Array.isArray(grid) || grid.length === 0) {
    throw new Error("grid must contain at least one candidate gamma");
  }
  for (const g of grid) {
    if (!Number.isFinite(g) || g <= 0) {
      throw new Error(`grid contains invalid gamma: ${String(g)}`);
    }
  }
  if (events.length === 0) {
    throw new Error("events must contain at least one entry");
  }
  for (const e of events) {
    if (e.outcome !== 0 && e.outcome !== 1) {
      throw new Error("outcome must be exactly 0 or 1");
    }
  }

  // Precompute pools once per event; reuse across all gammas.
  const pooledAtOne: number[] = [];
  const pooledLogOdds: number[] = [];
  const outcomes: Array<0 | 1> = [];
  const skippedEventIndices: number[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    try {
      const r = logOddsPool(ev.members, 1);
      pooledAtOne.push(r.geometricMeanOfOdds);
      // Invert logistic once so each gamma evaluation is O(1).
      pooledLogOdds.push(Math.log(r.geometricMeanOfOdds / (1 - r.geometricMeanOfOdds)));
      outcomes.push(ev.outcome);
    } catch {
      skippedEventIndices.push(i);
    }
  }

  if (pooledAtOne.length === 0) {
    throw new Error("no event had a member set that could pool");
  }

  const curve: GammaCurvePoint[] = grid.map((g) => {
    let acc = 0;
    for (let i = 0; i < pooledAtOne.length; i++) {
      const z = g * (pooledLogOdds[i] ?? 0);
      const p = 1 / (1 + Math.exp(-z));
      acc += brierOf(p, outcomes[i] ?? 0);
    }
    return { gamma: g, brier: acc / pooledAtOne.length };
  });

  let bestIdx = 0;
  for (let i = 1; i < curve.length; i++) {
    const cur = curve[i]!;
    const best = curve[bestIdx]!;
    if (cur.brier < best.brier - 1e-15 || (cur.brier <= best.brier + 1e-15 && cur.gamma < best.gamma)) {
      bestIdx = i;
    }
  }
  const bestPoint = curve[bestIdx]!;
  const baseline =
    curve.find((c) => c.gamma === 1) ??
    (() => {
      let acc = 0;
      for (let i = 0; i < pooledAtOne.length; i++) {
        acc += brierOf(pooledAtOne[i] ?? 0, outcomes[i] ?? 0);
      }
      return { gamma: 1, brier: acc / pooledAtOne.length };
    })();

  const prev = bestIdx > 0 ? curve[bestIdx - 1] : undefined;
  const next = bestIdx < curve.length - 1 ? curve[bestIdx + 1] : undefined;
  const nearPrev = prev === undefined || Math.abs(prev.brier - bestPoint.brier) <= eps;
  const nearNext = next === undefined || Math.abs(next.brier - bestPoint.brier) <= eps;

  return {
    bestGamma: bestPoint.gamma,
    bestBrier: bestPoint.brier,
    baselineBrier: baseline.brier,
    curve,
    flatOptimum: nearPrev && nearNext,
    nScored: pooledAtOne.length,
    skippedEventIndices,
  };
}
