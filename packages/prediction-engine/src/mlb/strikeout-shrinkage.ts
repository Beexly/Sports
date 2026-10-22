/**
 * Beta-binomial strikeout rate and Marcel season weights.
 *
 * Prior art, not copied code: djlove2442/mlb-strikeout-repository has no
 * licence. 04a_empirical_bayes.py states the posterior mean
 * (K + alpha) / (BF + alpha + beta) and Marcel weights 1, 0.8, 0.6 for
 * this season, last season, and two seasons ago (5/4/3 rescaled).
 */

export const MARCEL_SEASON_WEIGHTS = [1, 0.8, 0.6] as const;

export function betaBinomialPosteriorMean(
  strikeouts: number,
  battersFaced: number,
  alpha: number,
  beta: number,
): number {
  if (strikeouts < 0 || battersFaced < 0 || strikeouts > battersFaced) {
    throw new Error("strikeouts must sit inside batters faced");
  }
  if (!(alpha > 0) || !(beta > 0)) throw new Error("beta prior needs positive alpha and beta");
  return (strikeouts + alpha) / (battersFaced + alpha + beta);
}

export function marcelWeightedRate(
  seasons: readonly { strikeouts: number; battersFaced: number; seasonsAgo: 0 | 1 | 2 }[],
): { strikeouts: number; battersFaced: number; rate: number } {
  if (seasons.length === 0) throw new Error("at least one season is required");
  let strikeouts = 0;
  let battersFaced = 0;
  for (const row of seasons) {
    if (row.strikeouts < 0 || row.battersFaced < 0 || row.strikeouts > row.battersFaced) {
      throw new Error("season counts are invalid");
    }
    const weight = MARCEL_SEASON_WEIGHTS[row.seasonsAgo];
    if (weight === undefined) throw new Error("Marcel weights cover this season and the two before it");
    strikeouts += weight * row.strikeouts;
    battersFaced += weight * row.battersFaced;
  }
  return {
    strikeouts,
    battersFaced,
    rate: battersFaced === 0 ? 0 : strikeouts / battersFaced,
  };
}
