/**
 * Prediction-diversity diagnostic identity (arXiv 2001.10039).
 *
 * For an ensemble with member forecasts q_i and outcome Y, let qbar be the
 * ensemble mean. The paper's standing identity decomposes the ensemble
 * squared error:
 *   gamma = (qbar - Y)^2 = epsilon - delta,
 * where epsilon = mean_i (q_i - Y)^2 (mean individual squared error) and
 * delta = mean_i (q_i - qbar)^2 (diversity / ambiguity term).
 *
 * Weekly diagnostic and standing rule: log epsilon, delta, gamma, and
 * delta/epsilon per market. If delta/epsilon is persistently < 0.1 the pool
 * is redundant — drop or retrain the most correlated models. Never use
 * diversity as single-game confidence.
 *
 * ACCEPTANCE GATE: ADOPT the diagnostic permanently if (a) the identity
 * verifies exactly on real data (sanity), and (b) either a Spearman test of
 * diversity vs. future error reduction holds with p < 0.05, or the
 * decomposition changes at least one model-retention decision in a
 * documented weekly review.
 *
 * Research-only module. Not wired into any live ensemble path.
 */

export interface DiversityDecomposition {
  /** (qbar - Y)^2 — ensemble squared error. */
  gamma: number;
  /** mean_i (q_i - Y)^2 — mean individual squared error. */
  epsilon: number;
  /** mean_i (q_i - qbar)^2 — diversity term. */
  delta: number;
  /** delta / epsilon — redundancy ratio (NaN when epsilon is 0). */
  ratio: number;
}

/**
 * Decompose one event's ensemble forecast. Verifies gamma = epsilon - delta
 * up to floating-point error.
 */
export function diversityDecomposition(
  memberForecasts: readonly number[],
  outcome: number,
): DiversityDecomposition {
  if (memberForecasts.length === 0) throw new Error("diversityDecomposition: no members");
  const n = memberForecasts.length;
  const qbar = memberForecasts.reduce((a, q) => a + q, 0) / n;
  const gamma = (qbar - outcome) ** 2;
  const epsilon = memberForecasts.reduce((a, q) => a + (q - outcome) ** 2, 0) / n;
  const delta = memberForecasts.reduce((a, q) => a + (q - qbar) ** 2, 0) / n;
  return { gamma, epsilon, delta, ratio: epsilon > 0 ? delta / epsilon : NaN };
}

/** Aggregate the decomposition over many events (means of each component). */
export function aggregateDiversity(
  memberMatrix: ReadonlyArray<readonly number[]>,
  outcomes: readonly number[],
): DiversityDecomposition {
  if (memberMatrix.length !== outcomes.length) {
    throw new Error("aggregateDiversity: length mismatch");
  }
  if (memberMatrix.length === 0) throw new Error("aggregateDiversity: no events");
  let gamma = 0;
  let epsilon = 0;
  let delta = 0;
  for (let i = 0; i < memberMatrix.length; i++) {
    const d = diversityDecomposition(memberMatrix[i] as readonly number[], outcomes[i] as number);
    gamma += d.gamma;
    epsilon += d.epsilon;
    delta += d.delta;
  }
  const n = memberMatrix.length;
  const agg = { gamma: gamma / n, epsilon: epsilon / n, delta: delta / n, ratio: NaN as number };
  agg.ratio = agg.epsilon > 0 ? agg.delta / agg.epsilon : NaN;
  return agg;
}

/**
 * Redundancy flag: true when the pool's diversity ratio is persistently
 * below threshold (default 0.1) — the standing rule says drop/retrain the
 * most correlated models.
 */
export function isRedundant(ratio: number, threshold = 0.1): boolean {
  if (!(ratio >= 0)) throw new Error("isRedundant: ratio must be a non-negative number");
  return ratio < threshold;
}

/**
 * Pairwise mean correlation of member forecast series — used to pick which
 * model to drop/retrain when the pool is flagged redundant. Returns the
 * (i, j) pair with the highest correlation.
 */
export function mostCorrelatedPair(
  memberSeries: ReadonlyArray<readonly number[]>,
): { i: number; j: number; corr: number } {
  const m = memberSeries.length;
  if (m < 2) throw new Error("mostCorrelatedPair: need >= 2 members");
  const n = (memberSeries[0] as readonly number[]).length;
  const mean = (s: readonly number[]): number => s.reduce((a, v) => a + v, 0) / Math.max(1, s.length);
  const corr = (a: readonly number[], b: readonly number[]): number => {
    const ma = mean(a);
    const mb = mean(b);
    let num = 0;
    let da = 0;
    let db = 0;
    for (let k = 0; k < n; k++) {
      const xa = (a[k] as number) - ma;
      const xb = (b[k] as number) - mb;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    return num / Math.max(1e-300, Math.sqrt(da * db));
  };
  let best = { i: 0, j: 1, corr: -Infinity };
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      const c = corr(memberSeries[i] as readonly number[], memberSeries[j] as readonly number[]);
      if (c > best.corr) best = { i, j, corr: c };
    }
  }
  return best;
}
