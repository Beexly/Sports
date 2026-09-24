/**
 * arXiv 2207.13191: GCN-WP: Semi-Supervised Graph Convolutional Networks for Win Prediction in Esports
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build the calibrated GCN-WP: NFL team-game graph (nodes = 32 teams x 17 games, edges = previous-game + opponent-game per Algorithm 1), delta features (offensive/defensive EPA, success rate, explosive-play differentials), logistic output head for calibrated win probabilities trained semi-supervised on 2015-2024, evaluated on log-loss/Brier vs the engine's current model and Elo (the paper's missing experiment) -- then implement the authors' stated future work properly: directed edges (past->present only, killing leakage structurally), typed edges (self-temporal vs opponent vs divisional), per-edge-type attention, testing whether the directed-heterogeneous 2-3 layer GCN beats the 1-layer homogeneous version.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the calibrated GCN-WP: NFL team-game graph (nodes = 32 teams x 17 games, edges = previous-game + opponent-game per Algorithm 1), delta features (offensive/defensive EPA, success rate, explosive-play differentials), logistic output head for calibrated win probabilities trained semi-supervised on 2015-2024, evaluated on log-loss/Brier vs the engine's current model and Elo (the paper's missing experiment) — then implement the authors' stated future work properly: directed edges (past->present only, killing leakage structurally), typed edges (self-temporal vs opponent vs divisional), per-edge-type attention, testing whether the directed-heterogeneous 2-3 layer GCN beats the 1-layer homogeneous version.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt as a ratings/ensemble arm iff the calibrated GCN beats the engine's current win-probability model on 2023-2024 Brier by >=0.003 with acceptable calibration (ECE within 0.005 of baseline); reject if it merely matches Elo — keep the BuildLeagueGraph construction as a feature-engineering recipe only.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: win_spread_total | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Symmetric normalization of adjacency with self-loops: D^-1/2 (A+I) D^-1/2. */
export function normalizeAdj(A: number[][]): number[][] {
  const n = A.length;
  const deg = A.map((row, i) => row.reduce((s, a, j) => s + a + (i === j ? 1 : 0), 0));
  return A.map((row, i) =>
    row.map((a, j) => {
      const w = a + (i === j ? 1 : 0);
      return w / Math.sqrt(Math.max(1e-12, deg[i]! * deg[j]!));
    }),
  );
}

/** Single GCN layer: ReLU(Ahat H W). */
export function gcnLayer(H: number[][], Ahat: number[][], W: number[][]): number[][] {
  const n = H.length;
  const dOut = W[0]!.length;
  const AH = Ahat.map((row) => {
    const out = new Array<number>(H[0]!.length).fill(0);
    for (let k = 0; k < n; k++) for (let d = 0; d < out.length; d++) out[d]! += row[k]! * H[k]![d]!;
    return out;
  });
  return AH.map((row) =>
    Array.from({ length: dOut }, (_, j) => {
      let s = 0;
      for (let d = 0; d < row.length; d++) s += row[d]! * W[d]![j]!;
      return Math.max(0, s);
    }),
  );
}

/** Two-layer GCN forward with logistic head for win probability. */
export function gcnForward2(
  X: number[][],
  A: number[][],
  W1: number[][],
  W2: number[][],
  head: number[],
): number[] {
  const Ahat = normalizeAdj(A);
  const H1 = gcnLayer(X, Ahat, W1);
  const H2 = gcnLayer(H1, Ahat, W2);
  return H2.map((h) => {
    const z = h.reduce((s, v, j) => s + v * head[j]!, 0);
    return 1 / (1 + Math.exp(-z));
  });
}

/** Build a league game graph: nodes = team-games, edges = prev-game + opponent. */
export function buildLeagueGraph(
  nTeams: number,
  nGames: number,
  schedule: [number, number][][],
): number[][] {
  const N = nTeams * nGames;
  const A: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  const nodeOf = (team: number, g: number): number => g * nTeams + team; // game-major layout
  for (let g = 0; g < nGames; g++) {
    for (const [a, b] of schedule[g]!) {
      const na = nodeOf(a, g);
      const nb = nodeOf(b, g);
      A[na]![nb] = 1;
      A[nb]![na] = 1;
      if (g > 0) {
        A[na]![nodeOf(a, g - 1)] = 1;
        A[nb]![nodeOf(b, g - 1)] = 1;
      }
    }
  }
  return A;
}
