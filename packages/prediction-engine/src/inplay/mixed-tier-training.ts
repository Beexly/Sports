/**
 * Mixed-tier training for scarce-elite-tier prediction (playoffs).
 *
 * Solves the scarce-playoff-data problem three ways:
 * (1) regular-season augmentation — train the playoff win-probability model
 * on all games with playoff games up-weighted, tested strictly on held-out
 * playoffs; (2) tier-specific model selection — re-run the algorithm
 * bake-off separately on the playoff holdout, since different tiers need
 * different algorithms; (3) the in-game analogue — per-drive in-game models
 * with sliding windows of state differentials (score diff, EPA diff, time).
 *
 * @see arXiv:1711.06498 — "Mixed-Rank Match Prediction in MOBA Games"
 *
 * ACCEPTANCE GATE: adopt mixed-tier training iff playoff-holdout Brier with
 * regular-season augmentation beats playoff-only training by ≥ 0.002; adopt
 * tier-specific selection iff the playoff bake-off winner differs from the
 * regular-season winner. The gate is a backtest concern; this module is the
 * pure weighting/evaluation kernel, not wired into any live path.
 */

export interface TieredGame {
  features: number[];
  homeWin: 0 | 1;
  /** "playoff" games are the scarce elite tier. */
  tier: "regular" | "playoff";
}

/** Sample weights: playoff games up-weighted by `playoffWeight`. */
export function augmentationWeights(
  games: readonly TieredGame[],
  playoffWeight: number,
): number[] {
  if (!(playoffWeight >= 1)) throw new Error("augmentationWeights: playoffWeight ≥ 1");
  return games.map((g) => (g.tier === "playoff" ? playoffWeight : 1));
}

/**
 * Weighted logistic regression by Newton-Raphson (few features, pure TS).
 * Returns coefficients (last = intercept).
 */
export function weightedLogistic(
  games: readonly TieredGame[],
  weights: readonly number[],
  iters = 50,
): number[] {
  const d = games[0]?.features.length ?? 0;
  if (d === 0) throw new Error("weightedLogistic: no features");
  const beta = new Array<number>(d + 1).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(d + 1).fill(0);
    const hess = Array.from({ length: d + 1 }, () => new Array<number>(d + 1).fill(0));
    games.forEach((g, i) => {
      const x = [...g.features, 1];
      const w = weights[i] ?? 1;
      const z = x.reduce((s, v, j) => s + v * (beta[j] ?? 0), 0);
      const p = 1 / (1 + Math.exp(-z));
      const r = w * (g.homeWin - p);
      const vw = w * p * (1 - p);
      for (let j = 0; j <= d; j++) {
        grad[j]! += r * (x[j] ?? 0);
        for (let k2 = 0; k2 <= d; k2++) hess[j]![k2]! += vw * (x[j] ?? 0) * (x[k2] ?? 0);
      }
    });
    const step = solveLinear(hess, grad);
    let maxStep = 0;
    for (let j = 0; j <= d; j++) {
      beta[j]! += step[j] ?? 0;
      maxStep = Math.max(maxStep, Math.abs(step[j] ?? 0));
    }
    if (maxStep < 1e-8) break;
  }
  return beta;
}

/** Gaussian elimination for the Newton step. */
function solveLinear(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(m[r]?.[c] ?? 0) > Math.abs(m[piv]?.[c] ?? 0)) piv = r;
    }
    [m[c], m[piv]] = [m[piv]!, m[c]!];
    const div = m[c]?.[c] ?? 1e-12;
    for (let k = c; k <= n; k++) m[c]![k]! /= div;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r]?.[c] ?? 0;
      for (let k = c; k <= n; k++) m[r]![k]! -= f * (m[c]?.[k] ?? 0);
    }
  }
  return m.map((row) => row[n] ?? 0);
}

/** Brier score on a tier slice. */
export function tierBrier(
  games: readonly TieredGame[],
  beta: readonly number[],
  tier: "regular" | "playoff",
): number {
  const slice = games.filter((g) => g.tier === tier);
  if (slice.length === 0) return NaN;
  let s = 0;
  for (const g of slice) {
    const z = g.features.reduce((acc, v, j) => acc + v * (beta[j] ?? 0), beta[g.features.length] ?? 0);
    const p = 1 / (1 + Math.exp(-z));
    s += (p - g.homeWin) ** 2;
  }
  return s / slice.length;
}

/**
 * Sliding-window in-game state differentials: for each drive index, the
 * (scoreDiff, epaDiff) deltas over the trailing `window` drives plus time
 * remaining — the M_t design for the live product.
 */
export function slidingStateFeatures(
  scoreDiffs: readonly number[],
  epaDiffs: readonly number[],
  window = 5,
): Array<{ scoreDelta: number; epaDelta: number; drivesAgo: number }> {
  if (scoreDiffs.length !== epaDiffs.length) {
    throw new Error("slidingStateFeatures: length mismatch");
  }
  const out: Array<{ scoreDelta: number; epaDelta: number; drivesAgo: number }> = [];
  for (let t = 0; t < scoreDiffs.length; t++) {
    const s0 = t - window >= 0 ? (scoreDiffs[t - window] ?? 0) : (scoreDiffs[0] ?? 0);
    const e0 = t - window >= 0 ? (epaDiffs[t - window] ?? 0) : (epaDiffs[0] ?? 0);
    out.push({
      scoreDelta: (scoreDiffs[t] ?? 0) - s0,
      epaDelta: (epaDiffs[t] ?? 0) - e0,
      drivesAgo: Math.min(t, window),
    });
  }
  return out;
}
