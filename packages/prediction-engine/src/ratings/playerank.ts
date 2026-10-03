/**
 * PlayeRank ported to NFL events (soccer paper transplant).
 *
 * (1) Per-player-per-game feature vectors from nflverse (targets,
 * receptions, air yards, YAC, carries, rushing yards, TDs, pressures
 * allowed, sacks, tackles, INTs, PBUs, missed tackles, penalties —
 * normalized [0,1]); (2) aggregate to team vectors; train logistic
 * regression on binary win vs the team vector (2020–2025); extract weights
 * w; (3) rate each player-game r(u,m) = w·x; EWMA over the season → weekly
 * form rating r̄; (4) role detection: k-means on players' average (x,y) at
 * snap → role-based leaderboards (slot vs outside WR, box vs deep safety);
 * (5) r̄ and role-relative rankings feed the prop model as
 * matchup-adjusted quality features; role leaderboards feed the weekly DFS
 * packet write-ups.
 *
 * @see arXiv:1802.04987v3 — "PlayeRank: data-driven performance evaluation and player ranking in soccer via a machine learning approach"
 *
 * ACCEPTANCE GATE: ADAPT into the prop feature store iff (a) the
 * team-outcome model reaches AUC ≥ 0.80 on 2024–2025, AND (b) r̄ adds
 * statistically significant incremental explanatory power (p < 0.05,
 * ΔR² ≥ 0.01) for next-game fantasy points in at least 3 of 5 skill
 * positions. The gate is a training concern; this module is the pure rating
 * kernel, not wired into any live path.
 */

export type PlayerGame = Record<string, number>; // normalized [0,1] features

export interface TeamGame {
  /** Mean player-game vector for the team that game. */
  teamVector: number[];
  won: 0 | 1;
}

/** Aggregate player-game vectors to a team vector (mean). */
export function aggregateTeamVector(games: ReadonlyArray<PlayerGame>, featureNames: readonly string[]): number[] {
  if (games.length === 0) return featureNames.map(() => 0);
  return featureNames.map(
    (f) => games.reduce((s, g) => s + (g[f] ?? 0), 0) / games.length,
  );
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Logistic regression by batch gradient descent on team games.
 * Returns weights (last = intercept).
 */
export function trainTeamModel(
  games: readonly TeamGame[],
  lr = 0.5,
  iters = 2000,
  l2 = 0.01,
): number[] {
  const d = games[0]?.teamVector.length ?? 0;
  if (d === 0) throw new Error("trainTeamModel: no features");
  const w = new Array<number>(d + 1).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(d + 1).fill(0);
    for (const g of games) {
      const x = [...g.teamVector, 1];
      const p = sigmoid(x.reduce((s, v, j) => s + v * (w[j] ?? 0), 0));
      const err = g.won - p;
      for (let j = 0; j <= d; j++) grad[j]! += (err * (x[j] ?? 0)) / games.length - l2 * (w[j] ?? 0);
    }
    for (let j = 0; j <= d; j++) w[j]! += lr * (grad[j] ?? 0);
  }
  return w;
}

/** Player-game rating r(u,m) = w·x. */
export function playerGameRating(
  weights: readonly number[],
  playerGame: PlayerGame,
  featureNames: readonly string[],
): number {
  const x = featureNames.map((f) => playerGame[f] ?? 0);
  return x.reduce((s, v, j) => s + v * (weights[j] ?? 0), weights[featureNames.length] ?? 0);
}

/** EWMA over the season → weekly form rating r̄. */
export function formRating(ratings: readonly number[], alpha = 0.3): number[] {
  if (!(alpha > 0 && alpha <= 1)) throw new Error("formRating: α ∈ (0,1]");
  const out: number[] = [];
  let ewma = 0;
  let init = false;
  for (const r of ratings) {
    ewma = init ? alpha * r + (1 - alpha) * ewma : r;
    init = true;
    out.push(ewma);
  }
  return out;
}

/**
 * Role detection: k-means on average (x, y) snap positions.
 * Returns the role index per player.
 */
export function detectRoles(
  snapPositions: ReadonlyArray<{ id: string; x: number; y: number }>,
  k: number,
  iters = 50,
): Record<string, number> {
  if (snapPositions.length === 0) return {};
  if (!(k >= 1)) throw new Error("detectRoles: k ≥ 1");
  const kk = Math.min(k, snapPositions.length);
  let centroids = snapPositions.slice(0, kk).map((p) => [p.x, p.y]);
  let assign = new Array<number>(snapPositions.length).fill(0);
  for (let it = 0; it < iters; it++) {
    const next = snapPositions.map((p) => {
      let best = 0;
      let bestD = Infinity;
      centroids.forEach((c, ci) => {
        const d = (p.x - (c[0] ?? 0)) ** 2 + (p.y - (c[1] ?? 0)) ** 2;
        if (d < bestD) {
          bestD = d;
          best = ci;
        }
      });
      return best;
    });
    if (next.every((v, i) => v === assign[i])) break;
    assign = next;
    centroids = centroids.map((_, ci) => {
      const members = snapPositions.filter((_, pi) => assign[pi] === ci);
      if (members.length === 0) return centroids[ci] ?? [0, 0];
      return [
        members.reduce((s, m) => s + m.x, 0) / members.length,
        members.reduce((s, m) => s + m.y, 0) / members.length,
      ];
    });
  }
  return Object.fromEntries(snapPositions.map((p, i) => [p.id, assign[i] ?? 0]));
}

/** AUC for the team-outcome model (the gate's metric). */
export function auc(scores: readonly number[], labels: ReadonlyArray<0 | 1>): number {
  if (scores.length !== labels.length || scores.length === 0) {
    throw new Error("auc: length mismatch/empty");
  }
  const pos = scores.filter((_, i) => labels[i] === 1).sort((a, b) => a - b);
  const neg = scores.filter((_, i) => labels[i] === 0).sort((a, b) => a - b);
  if (pos.length === 0 || neg.length === 0) return 0.5;
  let wins = 0;
  for (const p of pos) {
    for (const n of neg) {
      if (p > n) wins += 1;
      else if (p === n) wins += 0.5;
    }
  }
  return wins / (pos.length * neg.length);
}
