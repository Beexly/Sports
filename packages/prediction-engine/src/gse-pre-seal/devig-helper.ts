/**
 * Multiplicative devig helper (pre-seal only).
 *
 * DK "trueOdds" is a pair of American odds for the two sides of a market
 * (over/under or home/away). The raw pair carries a bookmaker vig, so the
 * implied probabilities sum to more than 1. The helper:
 *
 *   1. Converts each side's American odds to an implied probability.
 *   2. Divides each by the pair sum — the multiplicative devig.
 *   3. Subtracts the measured +0.0537 favorite residual from the favorite side.
 *
 * The +0.0537 constant is the measured bias from the 45-market sample: the
 * favorite's devigged probability is overstated by 0.0537 on average. It is a
 * measured quantity, not an invented one. The sample's implied sum is 1.045795.
 *
 * Pure function. No I/O, no seal() call, no tau mutation, no baseline write.
 */

export const FAVORITE_RESIDUAL = 0.0537;
export const SAMPLE_IMPLIED_SUM = 1.045795;

export interface DevigInput {
  /** American odds for the favorite/first side. */
  favoriteOdds: number;
  /** American odds for the underdog/second side. */
  underdogOdds: number;
}

export interface DevigResult {
  /** Raw implied probabilities from the American odds. */
  implied: { favorite: number; underdog: number; sum: number };
  /** Multiplicatively devigged probabilities (sum to 1). */
  devigged: { favorite: number; underdog: number };
  /** Favorite probability after subtracting FAVORITE_RESIDUAL. */
  correctedFavorite: number;
  /** Underdog probability after adding back the removed mass. */
  correctedUnderdog: number;
  /** The bias constant applied. */
  favoriteResidual: number;
}

/** Convert American odds to implied probability. */
export function americanToImplied(odds: number): number {
  if (odds === 0) return 0.5;
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

/**
 * Multiplicative devig with favorite-bias correction.
 *
 * Step 1: implied = americanToImplied(odds)
 * Step 2: devigged_fav = implied_fav / sum, devigged_dog = implied_dog / sum
 * Step 3: corrected_fav = devigged_fav - FAVORITE_RESIDUAL
 *         corrected_dog = devigged_dog + FAVORITE_RESIDUAL  (mass conservation)
 *
 * The correction is additive on the probability scale. When the favorite's
 * devigged probability is below the residual the result floors at 0 and the
 * removed mass is added to the underdog so the pair still sums to 1.
 */
export function multiplicativeDevig(input: DevigInput): DevigResult {
  const fav = americanToImplied(input.favoriteOdds);
  const dog = americanToImplied(input.underdogOdds);
  const sum = fav + dog;

  const deviggedFav = sum > 0 ? fav / sum : 0.5;
  const deviggedDog = sum > 0 ? dog / sum : 0.5;

  const rawCorrectedFav = deviggedFav - FAVORITE_RESIDUAL;
  const correctedFav = Math.max(0, rawCorrectedFav);
  const removed = deviggedFav - correctedFav;
  const correctedDog = Math.min(1, deviggedDog + removed);

  return {
    implied: {
      favorite: Number(fav.toFixed(6)),
      underdog: Number(dog.toFixed(6)),
      sum: Number(sum.toFixed(6)),
    },
    devigged: {
      favorite: Number(deviggedFav.toFixed(6)),
      underdog: Number(deviggedDog.toFixed(6)),
    },
    correctedFavorite: Number(correctedFav.toFixed(6)),
    correctedUnderdog: Number(correctedDog.toFixed(6)),
    favoriteResidual: FAVORITE_RESIDUAL,
  };
}

/**
 * Convert a corrected probability back to American odds. Inverse of
 * americanToImplied, used when a downstream reader needs odds rather than a
 * probability.
 */
export function impliedToAmerican(p: number): number {
  if (p <= 0 || p >= 1) throw new Error(`probability ${p} outside (0, 1)`);
  return p >= 0.5 ? -(p / (1 - p)) * 100 : ((1 - p) / p) * 100;
}

/** Standard normal inverse CDF (Acklam's rational approximation, |rel err| < 1.15e-9). */
export function normalInvCdf(p: number): number {
  if (p <= 0 || p >= 1) throw new Error(`probability ${p} outside (0, 1)`);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p > pHigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/**
 * Convert an over/under odds pair into a fair total line.
 *
 * 1. Identify the favorite side (higher implied probability).
 * 2. Devig multiplicatively and subtract FAVORITE_RESIDUAL from the favorite.
 * 3. Convert the corrected Over probability to a total line by fitting a normal
 *    distribution to the model's P10/P90 and inverting at 1 - p_over.
 *
 * This is standard normal inversion — the P10/P90 quantiles pin the mean and
 * sigma, so no distribution is invented. If P10/P90 are missing, the raw
 * market total is returned unchanged.
 */
export function devigTotalToFairLine(
  overOdds: number,
  underOdds: number,
  p10: number | null | undefined,
  p90: number | null | undefined,
  rawTotal: number,
): number {
  const overImpl = americanToImplied(overOdds);
  const underImpl = americanToImplied(underOdds);

  let pOver: number;
  if (overImpl >= underImpl) {
    pOver = multiplicativeDevig({ favoriteOdds: overOdds, underdogOdds: underOdds }).correctedFavorite;
  } else {
    pOver = multiplicativeDevig({ favoriteOdds: underOdds, underdogOdds: overOdds }).correctedUnderdog;
  }

  if (p10 == null || p90 == null || !(pOver > 0 && pOver < 1)) return rawTotal;

  const mu = (p10 + p90) / 2;
  const sigma = (p90 - p10) / (2 * 1.2816);
  if (!(sigma > 0)) return rawTotal;

  return Number((mu + sigma * normalInvCdf(1 - pOver)).toFixed(4));
}
