/**
 * Parametric PageRank for NFL team ratings (TenisRank template).
 *
 * 32 team nodes, edge loser → winner per game, W_edge = W_recency ×
 * W_situation × W_importance. NFL analogs: recency = exponential decay in
 * weeks; "surface" = dome/outdoor and turf/grass match/mismatch (real NFL
 * splits); importance = playoff vs regular season, rest differential. Tuned
 * with greedy coordinate search on 2015–2019 maximizing walk-forward hit
 * rate. P(victory) mapping: logistic fit of win rate on rating difference →
 * direct moneyline-probability converter for the calibration lane;
 * decision-tree variants by dome/outdoor × playoff. Includes the market test
 * the thesis skipped: rating-implied probabilities vs closing moneylines
 * (CLV-style).
 *
 * @see arXiv:1711.11122v1 — ""TenisRank": A new ranking of tennis players based on PageRank"
 *
 * ACCEPTANCE GATE: ADOPT iff the parametric PageRank beats Elo by ≥ 1pp SU
 * accuracy or ≥ 2% log-loss on 2020–2025 (paired bootstrap p < 0.05), or its
 * P(win) mapping is better calibrated (lower ECE) than the moneyline-implied
 * baseline. The gate is a backtest concern; this module is the pure rating
 * kernel, not wired into any live path.
 */

export interface RatedGame {
  winner: string;
  loser: string;
  /** Weeks before present (0 = this week). */
  weeksAgo: number;
  /** Situational multiplier (dome/outdoor × turf/grass match/mismatch). */
  situation: number;
  /** Importance multiplier (playoff vs regular, rest differential). */
  importance: number;
}

export interface EdgeWeights {
  /** Exponential recency decay rate per week. */
  recencyDecay: number;
}

/** W_edge = exp(−decay·weeksAgo) × situation × importance. */
export function edgeWeight(g: RatedGame, w: EdgeWeights): number {
  return Math.exp(-w.recencyDecay * g.weeksAgo) * g.situation * g.importance;
}

/**
 * Weighted PageRank over team nodes (edges loser → winner).
 * Returns ratings summing to 1.
 */
export function parametricPagerank(
  games: readonly RatedGame[],
  w: EdgeWeights,
  damping = 0.85,
  tol = 1e-10,
): Record<string, number> {
  const teams = [...new Set(games.flatMap((g) => [g.winner, g.loser]))].sort();
  const n = teams.length;
  if (n === 0) return {};
  const outW = new Map<string, number>();
  const edges = new Map<string, Map<string, number>>();
  for (const g of games) {
    const wt = edgeWeight(g, w);
    outW.set(g.loser, (outW.get(g.loser) ?? 0) + wt);
    const m = edges.get(g.loser) ?? new Map<string, number>();
    m.set(g.winner, (m.get(g.winner) ?? 0) + wt);
    edges.set(g.loser, m);
  }
  let rank = new Map(teams.map((t) => [t, 1 / n]));
  for (let it = 0; it < 1000; it++) {
    const next = new Map<string, number>();
    let diff = 0;
    for (const t of teams) {
      let s = 0;
      for (const src of teams) {
        const m = edges.get(src);
        const total = outW.get(src) ?? 0;
        if (m && total > 0) s += (rank.get(src) ?? 0) * ((m.get(t) ?? 0) / total);
        else s += (rank.get(src) ?? 0) / n; // dangling: teleport
      }
      const v = (1 - damping) / n + damping * s;
      next.set(t, v);
      diff += Math.abs(v - (rank.get(t) ?? 0));
    }
    rank = next;
    if (diff < tol) break;
  }
  const total = [...rank.values()].reduce((a, b) => a + b, 0);
  return Object.fromEntries([...rank.entries()].map(([k, v]) => [k, v / total]));
}

/**
 * P(home win) from the rating difference via a logistic mapping
 * (the moneyline-probability converter). `scale` is fit offline.
 */
export function winProbFromRatings(
  ratingHome: number,
  ratingAway: number,
  scale = 200,
): number {
  return 1 / (1 + Math.exp(-((ratingHome - ratingAway) * scale)));
}

/**
 * Greedy coordinate search over recencyDecay maximizing walk-forward hit
 * rate. `evaluate(decay)` scores one candidate (supplied by the harness).
 */
export function tuneRecencyDecay(
  evaluate: (decay: number) => number,
  candidates = [0.02, 0.05, 0.1, 0.2, 0.35],
): { decay: number; score: number } {
  let best = { decay: candidates[0] ?? 0.05, score: -Infinity };
  for (const d of candidates) {
    const score = evaluate(d);
    if (score > best.score) best = { decay: d, score };
  }
  return best;
}

/**
 * CLV-style market test: mean (rating-implied prob − closing implied prob)
 * signed by the pick direction — positive means the rating beats the close.
 */
export function clvEdge(
  ratingProb: readonly number[],
  closingProb: readonly number[],
  pickedHome: ReadonlyArray<boolean>,
): number {
  if (ratingProb.length !== closingProb.length || ratingProb.length !== pickedHome.length) {
    throw new Error("clvEdge: length mismatch");
  }
  if (ratingProb.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < ratingProb.length; i++) {
    const edge = (ratingProb[i] ?? 0) - (closingProb[i] ?? 0);
    s += pickedHome[i] ? edge : -edge;
  }
  return s / ratingProb.length;
}
