/**
 * NFL dynamic win-lose power rating on a temporal network.
 *
 * 32 nodes, weekly adjacency matrices with margin-weighted edges
 *   A_ij = log(1 + margin)   (diminishing returns on blowouts)
 * online updates each week (α ≈ 0.13, β = 1/52), plus the time-weighted
 * dynamic PageRank prestige variant (paper Eq. 17): teams are priced at game
 * time instead of over-crediting September wins.
 *
 * @see arXiv:1203.2228v2 — "A network-based dynamical ranking system for competitive sports"
 *
 * ACCEPTANCE GATE: ADOPT as a GSE power-rating input iff the dynamic win-lose
 * (or dynamic prestige) beats Elo on 2020–2025 by ≥ 1pp SU accuracy or ≥ 2%
 * log-loss improvement (paired bootstrap p < 0.05). The gate is a backtest
 * concern; this module is the pure rating kernel, not wired into any live path.
 */

export interface GameResult {
  winner: number; // team index 0..n-1
  loser: number; // team index 0..n-1
  margin: number; // points, > 0
}

/** Margin-weighted edge with diminishing returns: log(1 + margin). */
export function marginWeight(margin: number): number {
  if (!(margin > 0)) throw new Error("marginWeight: margin must be positive");
  return Math.log1p(margin);
}

/**
 * Online dynamic win-lose update for one week of games.
 *   r_i ← (1-α)·r_i + α·Σ_j A_ij·r_j  (prestige flow), then weekly decay β.
 * Returns the new rating vector (input untouched).
 */
export function updateDynamicRating(
  ratings: readonly number[],
  weekGames: readonly GameResult[],
  alpha = 0.13,
  beta = 1 / 52,
): number[] {
  const n = ratings.length;
  if (n === 0) throw new Error("updateDynamicRating: empty ratings");
  const next = ratings.slice();
  for (const g of weekGames) {
    if (g.winner < 0 || g.winner >= n || g.loser < 0 || g.loser >= n) {
      throw new Error("updateDynamicRating: team index out of range");
    }
    const w = marginWeight(g.margin);
    const loserRating = ratings[g.loser] ?? 0;
    next[g.winner] = (next[g.winner] ?? 0) + alpha * w * loserRating;
    next[g.loser] = (next[g.loser] ?? 0) - alpha * w * (ratings[g.winner] ?? 0);
  }
  return next.map((r) => r * (1 - beta));
}

/**
 * Time-weighted dynamic PageRank prestige (paper Eq. 17): power iteration on
 * the row-stochastic weekly adjacency with teleportation, weighted by
 * recency (recent weeks count more).
 */
export function dynamicPageRank(
  weeklyAdjacency: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>,
  recencyHalflifeWeeks = 8,
  damping = 0.85,
  iterations = 100,
): number[] {
  const weeks = weeklyAdjacency.length;
  if (weeks === 0) throw new Error("dynamicPageRank: no weeks");
  const first = weeklyAdjacency[0];
  if (!first) throw new Error("dynamicPageRank: empty first week");
  const n = first.length;
  if (n === 0) throw new Error("dynamicPageRank: empty adjacency");
  // Time-weighted aggregate adjacency: most recent week has weight 1.
  const agg: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  weeklyAdjacency.forEach((adj, w) => {
    const age = weeks - 1 - w;
    const weight = Math.pow(0.5, age / recencyHalflifeWeeks);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const row = agg[i];
        const aij = adj[i]?.[j] ?? 0;
        if (row) row[j] = (row[j] ?? 0) + weight * aij;
      }
    }
  });
  // Row-stochastic transition matrix.
  const trans: number[][] = agg.map((row) => {
    const sum = row.reduce((a, b) => a + b, 0);
    return sum > 0 ? row.map((x) => x / sum) : row.map(() => 1 / n);
  });
  let pr = new Array<number>(n).fill(1 / n);
  for (let it = 0; it < iterations; it++) {
    const next = new Array<number>(n).fill((1 - damping) / n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const t = trans[i]?.[j] ?? 0;
        const cur = next[j] ?? 0;
        next[j] = cur + damping * (pr[i] ?? 0) * t;
      }
    }
    pr = next;
  }
  const total = pr.reduce((a, b) => a + b, 0);
  return total > 0 ? pr.map((x) => x / total) : pr;
}

/** Win probability from a rating differential via the logistic map. */
export function ratingToWinProb(ratingDiff: number, scale = 400): number {
  return 1 / (1 + Math.pow(10, -ratingDiff / scale));
}
