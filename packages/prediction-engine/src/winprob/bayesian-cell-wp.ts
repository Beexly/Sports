/**
 * Bayesian cell win probability with empirical-Bayes prior (arXiv 2207.13747v1).
 *
 * In-game WP from (tau, omega) cells — tau = time bucket, omega =
 * score-differential bucket — estimated from play-by-play with a beta
 * prior. The paper's expert-imputed prior is replaced by an
 * EMPIRICAL-BAYES prior: pregame probabilities binned by cell. The
 * posterior cell estimate is blended with the pregame probability using
 * a linear-in-time-and-score weight fit on holdout Brier. (The paper's
 * XGBoost expected-points drive model is out of scope for this small
 * module; the cell estimator is the portable piece.)
 *
 * ACCEPTANCE GATE: ship iff holdout Brier beats the reference WP on
 * >= 60% of games with calibration slope in [0.9, 1.1]; hold as a
 * research prototype otherwise.
 *
 * Research-only module. Not wired into any live win-probability path.
 */

export interface CellKey {
  /** Time bucket index (e.g. quarter or 5-minute bin). */
  tau: number;
  /** Score-differential bucket index. */
  omega: number;
}

export interface CellCounts {
  wins: number;
  games: number;
}

function key(k: CellKey): string {
  return `${k.tau}:${k.omega}`;
}

export interface CellEstimator {
  /** Posterior win probability for a cell. */
  posterior: (cell: CellKey) => number;
  /** Effective sample size behind the cell estimate. */
  effectiveN: (cell: CellKey) => number;
}

/**
 * Empirical-Bayes cell estimator: beta prior (alpha0, beta0) fit from
 * pregame probabilities binned by cell, updated with cell win counts.
 * Falls back to the global prior mean for unseen cells.
 */
export function fitCellEstimator(
  cells: ReadonlyArray<{ cell: CellKey; counts: CellCounts; priorMean: number }>,
  priorStrength = 20,
): CellEstimator {
  if (priorStrength <= 0) throw new Error("fitCellEstimator: priorStrength > 0");
  const map = new Map<string, { wins: number; games: number; priorMean: number }>();
  for (const c of cells) {
    const k = key(c.cell);
    const e = map.get(k) ?? { wins: 0, games: 0, priorMean: c.priorMean };
    e.wins += c.counts.wins;
    e.games += c.counts.games;
    map.set(k, e);
  }
  const globalMean =
    cells.length === 0
      ? 0.5
      : cells.reduce((a, c) => a + c.priorMean * c.counts.games, 0) /
        Math.max(1, cells.reduce((a, c) => a + c.counts.games, 0));
  const posterior = (cell: CellKey): number => {
    const e = map.get(key(cell));
    const pm = e?.priorMean ?? globalMean;
    const alpha0 = pm * priorStrength;
    const beta0 = (1 - pm) * priorStrength;
    const wins = e?.wins ?? 0;
    const games = e?.games ?? 0;
    return (alpha0 + wins) / (alpha0 + beta0 + games);
  };
  const effectiveN = (cell: CellKey): number => {
    const e = map.get(key(cell));
    return priorStrength + (e?.games ?? 0);
  };
  return { posterior, effectiveN };
}

export interface BlendFit {
  /** Weight on the cell posterior: w = clamp(a + b*elapsed + c*|scoreDiff|). */
  a: number;
  b: number;
  c: number;
}

function blendWeight(elapsedFrac: number, absScoreDiff: number, fit: BlendFit): number {
  const w = fit.a + fit.b * elapsedFrac + fit.c * absScoreDiff;
  return Math.min(1, Math.max(0, w));
}

/**
 * Blended live WP: (1 - w) * pregame + w * cellPosterior, with the
 * linear-in-time-and-score weight.
 */
export function blendedWp(
  pregame: number,
  cell: CellKey,
  scoreDiff: number,
  elapsedFrac: number,
  estimator: CellEstimator,
  fit: BlendFit,
): number {
  if (pregame <= 0 || pregame >= 1) throw new Error("blendedWp: pregame in (0,1)");
  if (elapsedFrac < 0 || elapsedFrac > 1) throw new Error("blendedWp: elapsedFrac in [0,1]");
  const w = blendWeight(elapsedFrac, Math.abs(scoreDiff), fit);
  return (1 - w) * pregame + w * estimator.posterior(cell);
}

/**
 * Fit the linear blend weight (a, b, c) by grid search minimizing
 * holdout Brier.
 */
export function fitBlend(
  rows: ReadonlyArray<{
    pregame: number;
    cell: CellKey;
    scoreDiff: number;
    elapsedFrac: number;
    won: number;
  }>,
  estimator: CellEstimator,
): BlendFit {
  if (rows.length === 0) throw new Error("fitBlend: no data");
  let best: BlendFit = { a: 0, b: 0.5, c: 0.02 };
  let bestBrier = Infinity;
  for (const a of [0, 0.1, 0.2]) {
    for (const b of [0.3, 0.5, 0.7, 0.9]) {
      for (const c of [0, 0.01, 0.02, 0.04]) {
        const fit = { a, b, c };
        let s = 0;
        for (const r of rows) {
          const p = blendedWp(r.pregame, r.cell, r.scoreDiff, r.elapsedFrac, estimator, fit);
          s += (p - r.won) ** 2;
        }
        const brier = s / rows.length;
        if (brier < bestBrier) {
          bestBrier = brier;
          best = fit;
        }
      }
    }
  }
  return best;
}

/**
 * Head-to-head: fraction of games where the blended model beats the
 * reference WP on Brier, plus the calibration slope of the blended
 * probabilities (OLS of outcome on forecast).
 */
export function headToHead(
  rows: ReadonlyArray<{
    pregame: number;
    cell: CellKey;
    scoreDiff: number;
    elapsedFrac: number;
    won: number;
    refWp: number;
  }>,
  estimator: CellEstimator,
  fit: BlendFit,
): { winRate: number; calibrationSlope: number } {
  if (rows.length === 0) throw new Error("headToHead: no data");
  let wins = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const r of rows) {
    const p = blendedWp(r.pregame, r.cell, r.scoreDiff, r.elapsedFrac, estimator, fit);
    if ((p - r.won) ** 2 < (r.refWp - r.won) ** 2) wins++;
    sx += p;
    sy += r.won;
    sxx += p * p;
    sxy += p * r.won;
  }
  const n = rows.length;
  const slope = (n * sxy - sx * sy) / Math.max(1e-12, n * sxx - sx * sx);
  return { winRate: wins / n, calibrationSlope: slope };
}
