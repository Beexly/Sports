/**
 * Props pipeline residual hygiene: K-fold cross-fitting + multi-calibration
 *
 * Research port: arXiv:2401.09940
 * Normalized lane: props_dfs | Doctrine: PROPRIETARY_EDGE
 *
 * Pipeline hygiene for expected-yards residuals: (1) K-fold cross-fitting so no player's residual is computed from a model trained on his own plays (kills self-contamination); (2) multi-calibration buckets over (position group x volume decile) for the expected-yards surface.
 *
 * ACCEPTANCE GATE: ADOPT cross-fitting + multi-calibration as mandatory hygiene if EITHER (a) removing top-5 volume RBs changes their measured yards-above-expected by >= 0.5 yards, OR (b) multi-calibration closes >= 50% of the worst-bucket miscalibration. Live-data gate -> GSE_RESIDUAL_HYGIENE_ENABLED flag (default false).
 */

export interface PlayRow {
  playerId: string;
  positionGroup: "RB" | "WR" | "TE" | "QB";
  actualYards: number;
}

export const CROSS_FIT_FOLDS = 5;

/** Deterministic fold assignment by player (stable across runs, no RNG). */
export function foldOf(playerId: string, k = CROSS_FIT_FOLDS): number {
  let h = 0;
  for (let i = 0; i < playerId.length; i++) h = (h * 31 + playerId.charCodeAt(i)) >>> 0;
  return h % k;
}

/** Group plays into k folds by player id; every fold holds out whole players. */
export function crossFitFolds(plays: PlayRow[], k = CROSS_FIT_FOLDS): PlayRow[][] {
  const folds: PlayRow[][] = Array.from({ length: k }, () => []);
  for (const p of plays) {
    const fold = folds[foldOf(p.playerId, k)];
    if (fold === undefined) continue;
    fold.push(p);
  }
  return folds;
}

/** Residual = actual - expected, computed only from the held-out fold's model. */
export function residual(actualYards: number, expectedYards: number): number {
  return actualYards - expectedYards;
}

export interface CalibrationBucket {
  positionGroup: string;
  volumeDecile: number;
  meanResidual: number;
  n: number;
}

/** Multi-calibration: mean residual per (position group x volume decile) bucket. */
export function multiCalibrationBuckets(
  rows: { positionGroup: string; volumeDecile: number; residual: number }[],
): CalibrationBucket[] {
  const map = new Map<string, { sum: number; n: number; pg: string; vd: number }>();
  for (const r of rows) {
    const k = `${r.positionGroup}|${r.volumeDecile}`;
    const slot = map.get(k);
    if (slot) { slot.sum += r.residual; slot.n += 1; }
    else map.set(k, { sum: r.residual, n: 1, pg: r.positionGroup, vd: r.volumeDecile });
  }
  return [...map.values()].map((s) => ({
    positionGroup: s.pg,
    volumeDecile: s.vd,
    meanResidual: s.sum / s.n,
    n: s.n,
  }));
}

/** Worst-bucket absolute miscalibration (the quantity the gate must halve). */
export function worstBucketMiscalibration(buckets: CalibrationBucket[]): number {
  return buckets.reduce((m, b) => Math.max(m, Math.abs(b.meanResidual)), 0);
}

/** Live-data gate: volume-RB sensitivity or >=50% worst-bucket closure. */
export const GSE_RESIDUAL_HYGIENE_ENABLED = false;

