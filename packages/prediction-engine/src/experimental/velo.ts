
export interface VEloOptions {
  /** Reduction factor A (tuned on NFL train NLL, not the paper's tennis value). */
  readonly A: number;
  /** Lower bound B on the posterior standard deviation. */
  readonly B: number;
  /** Elo K-factor for the mean update. */
  readonly K?: number;
}

/** Eq. 25: (sigma^2)' = max(B^2, sigma^2 (1 - A L)). */
export function veloVarianceUpdate(sigma2: number, A: number, L: number, B: number): number {
  if (!(sigma2 >= 0)) throw new Error("velo: sigma2 must be nonnegative");
  return Math.max(B * B, sigma2 * (1 - A * L));
}

export function eloExpected(rating: number, oppRating: number): number {
  return 1 / (1 + Math.pow(10, -(rating - oppRating) / 400));
}

/**
 * vElo step: mean via the standard Elo update, variance via Eq. 25.
 * L (per-match information) defaults to K * E * (1 - E) / 400-ish scale; pass the
 * tuned value from the NFL fit.
 */
export function veloEloUpdate(
  rating: number,
  sigma2: number,
  oppRating: number,
  score: number,
  L: number,
  opts: VEloOptions,
): { rating: number; sigma2: number } {
  const K = opts.K ?? 20;
  const expected = eloExpected(rating, oppRating);
  return {
    rating: rating + K * (score - expected),
    sigma2: veloVarianceUpdate(sigma2, opts.A, L, opts.B),
  };
}
