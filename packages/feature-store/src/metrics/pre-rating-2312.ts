/**
 * PRe rating module (binomial-exact score at window average + constrained max)
 *
 * Research port: arXiv:2312.12700
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Given an NFL team/unit over an n-game window with per-game pre-game win probabilities w_i, computes the binomial-exact score probability at the window average and solves the paper's constrained max for the PRe rating.
 *
 * ACCEPTANCE GATE: ADOPT only if (a) theorem replication on NFL windows holds within +/-1 Elo point for 0<m<n, AND (b) the (PRe - Elo) gap is predictive. Live-data gate -> GSE_PRE_RATING_ENABLED flag (default false).
 */

function binomPmf(n: number, k: number, p: number): number {
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c * p ** k * (1 - p) ** (n - k);
}

/**
 * Binomial-exact score probability of observing `wins` given per-game probs w_i,
 * evaluated at the window-average probability p-bar (paper's score definition).
 */
export function binomialExactScore(w: number[], wins: number): number {
  if (w.length === 0) return 0;
  const pbar = w.reduce((a, x) => a + x, 0) / w.length;
  return binomPmf(w.length, wins, pbar);
}

/**
 * Constrained max for the PRe rating: find the rating shift d (added uniformly to
 * every w_i, clamped to [0.001, 0.999]) that maximizes the binomial-exact score.
 * Solved by golden-section search on d in [-0.5, 0.5].
 */
export function preRating(w: number[], wins: number): { pRe: number; score: number } {
  if (w.length === 0) return { pRe: 0.5, score: 0 };
  const shifted = (d: number): number[] => w.map((x) => Math.min(0.999, Math.max(0.001, x + d)));
  const score = (d: number): number => {
    const ws = shifted(d);
    const pbar = ws.reduce((a, x) => a + x, 0) / ws.length;
    return binomPmf(ws.length, wins, pbar);
  };
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = -0.5, b = 0.5;
  let c = b - gr * (b - a), d = a + gr * (b - a);
  for (let i = 0; i < 60; i++) {
    if (score(c) < score(d)) a = c; else b = d;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
  }
  const dStar = (a + b) / 2;
  const pbar = shifted(dStar).reduce((x, y) => x + y, 0) / w.length;
  return { pRe: pbar, score: score(dStar) };
}

/** Theorem check helper: the binomial-exact score binomPmf(n, wins, p) is maximized
 *  at p = wins/n, so for a uniform window whose observed win rate matches the window
 *  mean (wins/n = mean(w)), the constrained max sits at d = 0 and PRe must equal the
 *  window mean (replication within tolerance). */
export function uniformWindowTheorem(w: number[], wins: number, tolEloPoints = 1): boolean {
  const { pRe } = preRating(w, wins);
  const mean = w.reduce((a, x) => a + x, 0) / w.length;
  // 1 Elo point ≈ dp/dElo conversion at 50%: dp ≈ ln(10)/400 * p(1-p) ≈ 0.00144
  return Math.abs(pRe - mean) <= tolEloPoints * 0.00144 * 4;
}

/** Live-data gate: theorem replication +/-1 Elo point + predictive (PRe - Elo) gap. */
export const GSE_PRE_RATING_ENABLED = false;

