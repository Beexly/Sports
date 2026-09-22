/**
 * Progress target — a down-aware continuous play-value measure.
 *
 * progress = gained/togo with a quadratic down penalty, needing no
 * win-probability model. Adopted as a secondary play-level target alongside
 * EPA in GSE's play-by-play prediction: compute progress for every nflverse
 * play 2009–2025; train the GBM with team-strength features (Elo/EPA-based)
 * plus NGS tracking features on time-ordered splits (train ≤2022 / validate
 * 2023 / test 2024–2025).
 *
 * @see arXiv:1601.00574v1 — "NFL Play Prediction"
 *
 * ACCEPTANCE GATE: adopt progress as a GSE feature iff the GBM test RMSE
 * beats 0.22 on the 2024 holdout AND progress adds incremental R² over EPA in
 * a drive-points regression; otherwise keep EPA only. The gate is a training
 * concern; this module is the pure target kernel, not wired into any live path.
 */

/**
 * Down-aware play progress: fraction of the distance gained, minus a
 * quadratic down penalty (later downs are worth less per yard — the sticks
 * matter more than the gain).
 *
 * @param yardsGained net yards on the play (can be negative)
 * @param yardsToGo distance to the sticks before the play (> 0)
 * @param down 1–4
 * @param downPenalty weight of the quadratic down penalty (default 0.1)
 */
export function playProgress(
  yardsGained: number,
  yardsToGo: number,
  down: 1 | 2 | 3 | 4,
  downPenalty = 0.1,
): number {
  if (!(yardsToGo > 0)) throw new Error("playProgress: yardsToGo must be positive");
  if (down < 1 || down > 4) throw new Error("playProgress: down must be 1–4");
  const gainFrac = yardsGained / yardsToGo;
  const penalty = downPenalty * ((down - 1) / 3) ** 2;
  return gainFrac - penalty;
}

/**
 * Drive-level aggregation: mean progress over the drive's plays.
 */
export function driveProgress(plays: ReadonlyArray<{ yardsGained: number; yardsToGo: number; down: 1 | 2 | 3 | 4 }>): number {
  if (plays.length === 0) return 0;
  return plays.reduce((s, pl) => s + playProgress(pl.yardsGained, pl.yardsToGo, pl.down), 0) / plays.length;
}

/**
 * Incremental R² of progress over EPA in a drive-points regression
 * (for the gate's "adds incremental R²" check): R²(full) − R²(EPA only).
 */
export function incrementalRSquared(
  actual: readonly number[],
  predEpaOnly: readonly number[],
  predFull: readonly number[],
): number {
  const r2 = (pred: readonly number[]): number => {
    if (actual.length === 0 || actual.length !== pred.length) {
      throw new Error("incrementalRSquared: length mismatch");
    }
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssTot = actual.reduce((s, y) => s + (y - mean) ** 2, 0);
    if (ssTot === 0) return 0;
    const ssRes = actual.reduce((s, y, i) => s + (y - (pred[i] ?? 0)) ** 2, 0);
    return 1 - ssRes / ssTot;
  };
  return r2(predFull) - r2(predEpaOnly);
}
