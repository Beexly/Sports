/**
 * Spread ↔ moneyline conversion and totals math.
 *
 * Based on NFL/NBA empirical conversion tables and the standard
 * logistic approximation used by sharp bettors and academics.
 *
 * All functions are pure; no side effects.
 */

// ----- Sigma constants -----
// Derived from empirical win-probability calibration against historical data.
// NFL: ~13.45 points (sports-reference calibration)
// NBA: ~11.0 points
// NHL: ~0.8 (used for 1.5 puck-line conversions)
// MLB: ~0.6 (used for 1.5 run-line conversions)

const SIGMA: Record<"nfl" | "nba" | "nhl" | "mlb" | "default", number> = {
  nfl: 13.45,
  nba: 11.0,
  nhl: 0.8,
  mlb: 0.6,
  default: 13.45,
};

// ----- Internal helpers -----

/**
 * Win probability for the favourite given a raw point spread and sigma.
 * spread is expressed as a positive number (favourite's edge).
 */
function winProb(spread: number, sigma: number): number {
  return 1 / (1 + Math.exp(-Math.abs(spread) / sigma));
}

/**
 * Convert a win probability to American moneyline (integer).
 * p > 0.5 → negative odds (favourite); p < 0.5 → positive (underdog).
 */
function probToAmerican(p: number): number {
  if (p >= 0.5) {
    // favourite
    return Math.round(-(p / (1 - p)) * 100);
  }
  // underdog
  return Math.round(((1 - p) / p) * 100);
}

/**
 * Convert American moneyline to implied probability (no vig removed).
 */
function americanToProb(american: number): number {
  if (american < 0) {
    return Math.abs(american) / (Math.abs(american) + 100);
  }
  return 100 / (american + 100);
}

/**
 * Zelen & Severo (1964) polynomial approximation for the standard normal CDF.
 * Accurate to ~7 decimal places.
 */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return x >= 0 ? 1 - p : p;
}

/**
 * Standard normal PDF.
 */
function normalPdf(x: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

// ----- Public API -----

/**
 * Convert a point spread to American moneyline odds.
 *
 * @param spread - positive number: favourite's edge (e.g. 3 means home team favoured by 3).
 * @param sport  - sport-specific sigma. Defaults to "nfl".
 * @returns { favorite: negativeInt, underdog: positiveInt }
 *
 * At spread = 0 (pick'em) both sides are –110 reflecting standard vig.
 */
export function spreadToMoneyline(
  spread: number,
  sport: "nfl" | "nba" | "nhl" | "mlb" | "default" = "default"
): { favorite: number; underdog: number } {
  if (spread === 0) {
    return { favorite: -110, underdog: -110 };
  }

  const sigma = SIGMA[sport];
  const favProb = winProb(spread, sigma);

  // Favourite: probToAmerican returns a negative number for p > 0.5
  const favoriteOdds = probToAmerican(favProb);
  // Underdog complementary probability (with vig kept symmetric)
  const underdogProb = 1 - favProb;
  const underdogOdds = probToAmerican(underdogProb);

  return {
    favorite: Math.min(favoriteOdds, -101), // never cross pick-em
    underdog: Math.max(underdogOdds, 101),
  };
}

/**
 * Inverse of spreadToMoneyline.
 *
 * @param favMoneyline - American odds for the favourite (should be negative).
 *   If a positive number is passed, it is treated as the favourite's price
 *   (e.g. +150 ≡ -150 from the favourite's perspective).
 * @param sport - sport context.
 * @returns Spread as a positive number (favourite's edge).
 */
export function moneylineToSpread(
  favMoneyline: number,
  sport: "nfl" | "nba" | "nhl" | "mlb" | "default" = "default"
): number {
  // Normalise: ensure we treat the value as a favourite price
  const price = favMoneyline > 0 ? -favMoneyline : favMoneyline;
  const p = americanToProb(price);
  const sigma = SIGMA[sport];

  // Invert the logistic: spread = -sigma * ln(1/p - 1)
  return -sigma * Math.log(1 / p - 1);
}

/**
 * Win probability for the favoured side given the spread.
 *
 * @param spread - positive: favourite's edge.
 * @param sport  - sport context.
 * @returns Probability ∈ [0.5, ~0.99]
 */
export function spreadToImpliedProb(
  spread: number,
  sport: "nfl" | "nba" | "nhl" | "mlb" | "default" = "default"
): number {
  if (spread === 0) return 0.5;
  return winProb(spread, SIGMA[sport]);
}

/**
 * Compute the vig (hold) for a two-way market.
 *
 * @param americanOddsA - American odds for side A.
 * @param americanOddsB - American odds for side B.
 * @returns { vigPct, overround }
 *   overround = sum of implied probs - 1
 *   vigPct    = overround / (1 + overround)  (fraction taken by the book)
 */
export function vigFromPair(
  americanOddsA: number,
  americanOddsB: number
): { vigPct: number; overround: number } {
  const pA = americanToProb(americanOddsA);
  const pB = americanToProb(americanOddsB);
  const overround = pA + pB - 1;
  const vigPct = overround / (1 + overround);
  return { vigPct, overround };
}

/**
 * Approximate the price at an alternative spread from a known main line.
 *
 * Uses the logistic sigmoid to compute the probability shift and converts
 * back to American odds.  The result is a rough fair-value approximation —
 * actual market alt-line prices include additional vig.
 *
 * @param mainOdds   - American odds at mainSpread.
 * @param mainSpread - The spread at which mainOdds is quoted.
 * @param altSpread  - The alternative spread to price.
 * @param sport      - Sport context.
 * @returns American odds at altSpread (integer).
 */
export function altLineFromMain(
  mainOdds: number,
  mainSpread: number,
  altSpread: number,
  sport: "nfl" | "nba" | "nhl" | "mlb" | "default" = "default"
): number {
  const sigma = SIGMA[sport];

  // Probability at mainSpread from model
  const pMain = winProb(mainSpread, sigma);
  // Probability at altSpread from model
  const pAlt = winProb(altSpread, sigma);

  // Implied probability from mainOdds
  const pMarket = americanToProb(mainOdds < 0 ? mainOdds : -mainOdds);

  // Shift pMarket by the sigmoid delta
  const delta = pAlt - pMain;
  let pNew = pMarket + delta;

  // Clamp to avoid degenerate values
  pNew = Math.max(0.01, Math.min(0.99, pNew));

  return probToAmerican(pNew);
}

/**
 * Compute over/under/push probabilities given a game total and projected score.
 *
 * Uses a normal distribution with the given standard deviation.
 *
 * @param total          - The over/under line (e.g. 47.5).
 * @param projectedScore - Model's projected combined score.
 * @param stdDev         - Score standard deviation (default 10 for NFL).
 * @returns { overProb, underProb, pushProb } — sum ≈ 1.0.
 */
export function totalToOverUnderProb(
  total: number,
  projectedScore: number,
  stdDev: number = 10
): { overProb: number; underProb: number; pushProb: number } {
  const z = (total - projectedScore) / stdDev;

  // P(score > total) = 1 - CDF((total - mu) / sigma)
  const overProb = 1 - normalCdf(z);
  // P(score < total) = CDF((total - mu) / sigma)
  const underProb = normalCdf(z);

  // Push probability: approximate as PDF * 1 (unit-width bin around exact integer)
  // Only meaningful when total is an integer; for half-points pushProb → 0
  const zPdf = (total - projectedScore) / stdDev;
  const pushProb = Number.isInteger(total)
    ? (normalPdf(zPdf) / stdDev) * 1
    : 0;

  // Renormalise so everything sums to exactly 1
  const total_ = overProb + underProb + pushProb;
  return {
    overProb: overProb / total_,
    underProb: underProb / total_,
    pushProb: pushProb / total_,
  };
}

/**
 * MLB run-line conversion from moneyline.
 *
 * The favourite at -1.5 gets boosted odds; the underdog at +1.5 gets reduced.
 * Empirical rule of thumb: runLineFavPrice ≈ mlFavPrice + 65 (in American terms).
 *
 * @param mlMoneyline - American moneyline for the favourite (negative number).
 * @returns {
 *   runLinePrice:    fair-value run-line price (negative for favourite at -1.5),
 *   favoriteRunLine: -1.5,
 *   underdogRunLine: +1.5
 * }
 */
export function convertRunLine(mlMoneyline: number): {
  runLinePrice: number;
  favoriteRunLine: number;
  underdogRunLine: number;
} {
  // Normalise: favourite should have negative moneyline
  const favMl = mlMoneyline > 0 ? -mlMoneyline : mlMoneyline;

  // Empirical shift: taking -1.5 runs reduces coverage, so odds get worse by ~65 units
  // (e.g. -200 ML favourite becomes roughly -135 on the run line)
  const runLinePrice = favMl + 65;

  return {
    runLinePrice: Math.round(runLinePrice),
    favoriteRunLine: -1.5,
    underdogRunLine: 1.5,
  };
}
