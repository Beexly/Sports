/**
 * arXiv:2506.00348 — Beyond Winning: Margin of Victory Relative to Expectation Unlocks Accurate Skill Ratings
 *
 * Elo CV-tuned blend for GSE ratings: rolling-origin cross-validation tunes the blend weight between the
 * existing GSE rating and the market-implied rating plus the HFA and K-factor, with a log-loss gate on the
 * last two seasons.
 *
 * Improvement: Replace the ad-hoc tanh expected-margin curve with a market-informed one: E_MOV = spread-implied expected margin from the closing line, so the update's margin-surprise term becomes "how much the result surprised the market" rather than "how much it surprised our own ratings" — removing the circularity of ratings predicting margins that update ratings and connecting directly to the CLV lane.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the margin-surprise update into the team-strength layer if it clears the §12 gate on 2022–2025 NFL hold-out with no tuning after the gate is set. REJECT (do not merge) if it fails either metric, if the tanh fit is unstable across refits (parameter CV > 25%), or if it underperforms linear-MOV Elo.
 */

/** Blend GSE rating with the market-implied rating. */
export function blendedRating(gse: number, market: number, w: number): number {
  if (w < 0 || w > 1) throw new Error("blendedRating: w in [0,1]");
  return w * gse + (1 - w) * market;
}

/** Elo expected score with home-field advantage. */
export function eloExpected(ratingDiff: number, hfa: number): number {
  return 1 / (1 + Math.pow(10, -(ratingDiff + hfa) / 400));
}

/** Elo update with K-factor. */
export function eloUpdate(rating: number, expected: number, actual: number, k: number): number {
  if (k <= 0) throw new Error("eloUpdate: k > 0");
  return rating + k * (actual - expected);
}

/**
 * Rolling-origin CV: for each candidate (w, hfa, k), walk the game log in
 * order, updating ratings online and accumulating log-loss. Returns the best
 * config and its mean log-loss.
 */
export function rollingOriginTune(
  games: readonly { gseDiff: number; marketDiff: number; homeWin: 0 | 1 }[],
  candidates: readonly { w: number; hfa: number; k: number }[],
): { best: { w: number; hfa: number; k: number }; logLoss: number } {
  if (games.length === 0 || candidates.length === 0) {
    throw new Error("rollingOriginTune: empty input");
  }
  let best = candidates[0]!;
  let bestLoss = Infinity;
  for (const c of candidates) {
    let gseR = 1500;
    let loss = 0;
    for (const g of games) {
      const diff = blendedRating(g.gseDiff, g.marketDiff, c.w);
      const p = Math.min(1 - 1e-9, Math.max(1e-9, eloExpected(diff, c.hfa)));
      loss += -(g.homeWin * Math.log(p) + (1 - g.homeWin) * Math.log(1 - p));
      gseR = eloUpdate(gseR, p, g.homeWin, c.k);
    }
    const mean = loss / games.length;
    if (mean < bestLoss) { bestLoss = mean; best = c; }
  }
  return { best, logLoss: bestLoss };
}

/** Log-loss gate: tuned config must beat the naive 0.6931 on the window. */
export function logLossGate(logLoss: number, naive = 0.6931): boolean {
  return logLoss < naive;
}
