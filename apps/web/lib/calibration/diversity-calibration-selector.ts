/**
 * Diversity selector for calibration splits — arXiv 2608.21591
 * ("Reaching the Tail: Calibration Diversity Drives Conformal Coverage
 * under Data Scarcity").
 *
 * ADDITIVE utility. Not wired into any calibration path (wiring changes
 * published intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: under data scarcity (early-season weeks 1-6), replace
 * trailing-window calibration splits with a diversity selector — given a
 * budget of N games, select the N whose pooled nonconformity scores
 * maximize p95 - p5 (tail reach). Greedy forward selection: start from the
 * two most extreme games, iteratively add the game maximizing the pooled
 * spread.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT the diversity selector for
 * early-season calibration if on 2022-2024 it raises 90%-interval coverage
 * >=5 points vs the trailing-window baseline with mean width increase
 * <=30%; otherwise keep trailing windows and log the paper's rule as a
 * diagnostic.
 */

export interface CalibrationGame {
  readonly id: string;
  /** Nonconformity scores for this game (e.g. across model draws). */
  readonly scores: readonly number[];
}

/** Empirical quantile (linear interpolation). */
export function empiricalQuantile(samples: readonly number[], q: number): number {
  const qc = Math.min(Math.max(q, 0), 1);
  if (samples.length === 0) return Number.NaN;
  const s = [...samples].sort((a, b) => a - b);
  const pos = qc * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** Tail-reach spread: p95 - p5 of the pooled scores. */
export function tailReachSpread(pooled: readonly number[]): number {
  if (pooled.length === 0) return 0;
  return empiricalQuantile(pooled, 0.95) - empiricalQuantile(pooled, 0.05);
}

/**
 * Greedy diversity selection: pick up to `budget` games maximizing the pooled
 * p95-p5 spread. Starts from the game with the widest individual spread,
 * then adds the game with the largest marginal spread gain, stopping early
 * when no remaining game increases the pooled spread (percentile spreads
 * are not monotone in the pooled set, so the guard keeps the pooled spread
 * non-decreasing by construction).
 */
export function diversitySelect(
  games: ReadonlyArray<CalibrationGame>,
  budget: number,
): CalibrationGame[] {
  if (budget <= 0 || games.length === 0) return [];
  if (budget >= games.length) return [...games];
  const remaining = [...games];
  const selected: CalibrationGame[] = [];
  const pooled: number[] = [];
  // Seed: the game with the widest individual spread.
  let seedIdx = 0;
  let seedSpread = -Infinity;
  remaining.forEach((g, i) => {
    const sp = tailReachSpread(g.scores);
    if (sp > seedSpread) {
      seedSpread = sp;
      seedIdx = i;
    }
  });
  const seed = remaining.splice(seedIdx, 1)[0]!;
  selected.push(seed);
  pooled.push(...seed.scores);
  // Greedy forward selection on marginal spread gain, with early stopping.
  while (selected.length < budget && remaining.length > 0) {
    const current = tailReachSpread(pooled);
    let bestIdx = -1;
    let bestSpread = current;
    for (let i = 0; i < remaining.length; i++) {
      const trial = [...pooled, ...remaining[i]!.scores];
      const sp = tailReachSpread(trial);
      if (sp > bestSpread) {
        bestSpread = sp;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break; // no positive marginal gain: stop
    const next = remaining.splice(bestIdx, 1)[0]!;
    selected.push(next);
    pooled.push(...next.scores);
  }
  return selected;
}
