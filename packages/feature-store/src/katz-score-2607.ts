/**
 * Recency-weighted modified-Katz team-strength feature
 *
 * Research port: arXiv:2607.23509
 * Normalized lane: experimental | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's adopted component (the lower-star TDA pipeline is
 * rejected per the gate's cost-benefit note): the recency-weighted
 * modified-Katz score with beta=0.3 and path cutoff 4, used as a
 * home-minus-away team-strength feature alongside EPA-based ratings.
 * score_j = sum_{l=1..4} beta^l * (weighted length-l win-paths starting at j),
 * where each win edge carries an exponential recency weight. Paths follow
 * the beat direction (j -> ... means j beat a chain of opponents), so teams
 * are rewarded for beating teams that beat other teams. The engine
 * feature for a matchup is Katz(home) - Katz(away).
 *
 * ACCEPTANCE GATE: REJECT the lower-star TDA pipeline (cost-benefit fails on
 * the authors' own numbers). ADOPT-or-not the Katz feature pending the
 * section-12 test: >=0.5pp AUC lift or meaningful log-loss improvement on
 * chronological 2023-2025 holdout. No TDA compute spend in GSE without a
 * >=1pp standalone gain.
 */

export interface KatzGame {
  winner: string;
  loser: string;
  /** age of the game in weeks (0 = this week) */
  ageWeeks: number;
}

export interface KatzConfig {
  beta: number;
  cutoff: number;
  /** recency half-life in weeks for the exponential edge weights */
  halflifeWeeks: number;
}

export const DEFAULT_KATZ_CONFIG: KatzConfig = {
  beta: 0.3,
  cutoff: 4,
  halflifeWeeks: 8,
};

function recencyWeight(ageWeeks: number, halflifeWeeks: number): number {
  if (!(halflifeWeeks > 0) || !(ageWeeks >= 0)) return Number.NaN;
  return Math.pow(0.5, ageWeeks / halflifeWeeks);
}

/**
 * Modified-Katz scores per team: sum_{l=1..cutoff} beta^l * r_l, where
 * r_l = W^l 1 is the recency-weighted length-l win-path count starting at
 * each team (W[i][j] = recency-weighted wins of i over j).
 */
export function katzScores(
  games: KatzGame[],
  teams: string[],
  cfg: KatzConfig = DEFAULT_KATZ_CONFIG,
): Map<string, number> {
  const n = teams.length;
  const idx = new Map(teams.map((t, i) => [t, i]));
  const W: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const g of games) {
    const i = idx.get(g.winner);
    const j = idx.get(g.loser);
    if (i === undefined || j === undefined || i === j) continue;
    const w = recencyWeight(g.ageWeeks, cfg.halflifeWeeks);
    if (!Number.isFinite(w)) continue;
    (W[i] as number[])[j] = ((W[i] as number[])[j] ?? 0) + w;
  }
  // r_l as a column vector; r_0 = ones; r_l = W @ r_{l-1}
  let r = new Array<number>(n).fill(1);
  const scores = new Array<number>(n).fill(0);
  let betaPow = 1;
  for (let l = 1; l <= Math.max(0, Math.floor(cfg.cutoff)); l++) {
    betaPow *= cfg.beta;
    const next = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const row = W[i] as number[];
      let s = 0;
      for (let j = 0; j < n; j++) s += (row[j] ?? 0) * (r[j] ?? 0);
      next[i] = s;
    }
    r = next;
    for (let i = 0; i < n; i++) scores[i] = (scores[i] ?? 0) + betaPow * (r[i] ?? 0);
  }
  return new Map(teams.map((t, i) => [t, scores[i] ?? 0]));
}

/** Engine feature for a matchup: Katz(home) - Katz(away). */
export function katzFeature(
  home: string,
  away: string,
  scores: Map<string, number>,
): number {
  const h = scores.get(home);
  const a = scores.get(away);
  if (h === undefined || a === undefined) return Number.NaN;
  return h - a;
}

export const GSE_KATZ_SCORE_ENABLED = false;
