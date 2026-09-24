/**
 * "Players-like-X" retrieval for NFL (Messi multi-criteria-distance
 * template).
 *
 * Per-route/per-snap normalized features from nflverse + charting (target
 * share, aDOT, YPRR, YAC, contested-catch rate, alignment splits); robust
 * scaling (median/IQR) instead of min-max; Mahalanobis or weighted-L1
 * distance with correlation-aware weighting (down-weight the redundant
 * pairs the paper's correlation analysis warns about); position/role
 * controls (WRs vs WRs, slot vs slot only). Serves weekly "closest comps"
 * for every fantasy-relevant player: distance + the 3 most similar
 * historical player-seasons.
 *
 * @see arXiv:1802.00967v1 — "Player Similarity to Messi via Multi-Criteria Distance (WhoScored 2017–18)"
 *
 * ACCEPTANCE GATE: ADAPT the retrieval method iff comp-based forecasts beat
 * the trailing-average baseline by ≥ 5% MAE on the 2025 holdout AND the
 * top-5 comps pass a sanity check (same position/role in ≥ 4/5 for a
 * 20-player sample). The gate is a backtest concern; this module is the pure
 * distance kernel, not wired into any live path.
 */

export interface PlayerSeason {
  id: string;
  position: "WR" | "TE" | "RB" | "QB";
  role: string; // e.g. "slot", "outside", "inline"
  features: Record<string, number>;
}

function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

/**
 * Robust scaling (median/IQR) per feature across the corpus.
 * Returns scaled feature vectors keyed by player id.
 */
export function robustScale(
  players: readonly PlayerSeason[],
): Map<string, Record<string, number>> {
  const names = [...new Set(players.flatMap((p) => Object.keys(p.features)))];
  const stats = new Map<string, { med: number; iqr: number }>();
  for (const name of names) {
    const vals = players.map((p) => p.features[name] ?? 0);
    const med = median(vals);
    const q1 = median(vals.filter((v) => v <= med));
    const q3 = median(vals.filter((v) => v >= med));
    stats.set(name, { med, iqr: Math.max(1e-9, q3 - q1) });
  }
  const out = new Map<string, Record<string, number>>();
  for (const p of players) {
    const scaled: Record<string, number> = {};
    for (const name of names) {
      const st = stats.get(name) ?? { med: 0, iqr: 1 };
      scaled[name] = ((p.features[name] ?? 0) - st.med) / st.iqr;
    }
    out.set(p.id, scaled);
  }
  return out;
}

/** Pearson correlation between two feature columns (for redundancy weights). */
function correlation(
  scaled: ReadonlyMap<string, Record<string, number>>,
  ids: readonly string[],
  a: string,
  b: string,
): number {
  const xs = ids.map((id) => scaled.get(id)?.[a] ?? 0);
  const ys = ids.map((id) => scaled.get(id)?.[b] ?? 0);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0);
  const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}

/**
 * Correlation-aware feature weights: w_j = 1 / (1 + Σ_{k≠j} |corr(j,k)|).
 * Redundant feature pairs get down-weighted.
 */
export function redundancyWeights(
  scaled: ReadonlyMap<string, Record<string, number>>,
  featureNames: readonly string[],
): Record<string, number> {
  const ids = [...scaled.keys()];
  const w: Record<string, number> = {};
  for (const a of featureNames) {
    let red = 0;
    for (const b of featureNames) {
      if (a !== b) red += Math.abs(correlation(scaled, ids, a, b));
    }
    w[a] = 1 / (1 + red);
  }
  return w;
}

/** Weighted-L1 distance between two scaled feature vectors. */
export function weightedL1(
  a: Record<string, number>,
  b: Record<string, number>,
  weights: Readonly<Record<string, number>>,
): number {
  return Object.keys(weights).reduce(
    (s, name) => s + (weights[name] ?? 0) * Math.abs((a[name] ?? 0) - (b[name] ?? 0)),
    0,
  );
}

export interface Comp {
  id: string;
  distance: number;
}

/**
 * Retrieve the k closest comps to `targetId`, restricted to the same
 * position and role.
 */
export function closestComps(
  players: readonly PlayerSeason[],
  targetId: string,
  k = 3,
): Comp[] {
  const target = players.find((p) => p.id === targetId);
  if (!target) throw new Error("closestComps: target not found");
  const scaled = robustScale(players);
  const names = [...new Set(players.flatMap((p) => Object.keys(p.features)))];
  const weights = redundancyWeights(scaled, names);
  const tVec = scaled.get(targetId) ?? {};
  return players
    .filter((p) => p.id !== targetId && p.position === target.position && p.role === target.role)
    .map((p) => ({ id: p.id, distance: weightedL1(tVec, scaled.get(p.id) ?? {}, weights) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
}
