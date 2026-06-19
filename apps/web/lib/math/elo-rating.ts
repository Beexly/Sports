/**
 * ELO rating system — pure implementation for sports prediction.
 *
 * Standard ELO algorithm as used in chess (Elo 1978) and adapted for sports:
 * FiveThirtyEight NFL Elo, FIDE, FIFA World Rankings.
 *
 * Features:
 * - Standard ELO update with configurable K-factor
 * - Score-adjusted ELO (margin-of-victory multiplier)
 * - Win probability from ELO difference
 * - Expected outcome calculation
 *
 * Pure math — zero dependencies.
 */

export interface EloParams {
  readonly homeRating: number;
  readonly awayRating: number;
  /** Home field advantage in ELO points (default: 65 for NFL, 100 for soccer) */
  readonly homeAdvantagePoints?: number;
}

export interface EloMatchResult {
  readonly homeWinProb: number;
  readonly awayWinProb: number;
  /** 0 for sports without draws; otherwise 1 - homeWinProb - awayWinProb */
  readonly drawProb: number;
}

export interface EloUpdateParams {
  readonly homeRatingBefore: number;
  readonly awayRatingBefore: number;
  readonly homeScore: number;
  readonly awayScore: number;
  /** K-factor (default: 20) — higher = more reactive to recent results */
  readonly kFactor?: number;
  readonly homeAdvantagePoints?: number;
  /** If true, use margin-of-victory multiplier (FiveThirtyEight style) */
  readonly useMovMultiplier?: boolean;
}

export interface EloUpdate {
  readonly homeRatingAfter: number;
  readonly awayRatingAfter: number;
  readonly homeRatingChange: number;
  readonly awayRatingChange: number;
}

/**
 * Win probability from ELO rating difference using the standard logistic formula.
 *
 * Formula: 1 / (1 + 10^(-diff/400))
 * At diff=0: returns exactly 0.5.
 * At diff=+400: returns ~0.909 (10× stronger team).
 */
export function eloWinProb(ratingDiff: number): number {
  return 1 / (1 + Math.pow(10, -ratingDiff / 400));
}

/**
 * Predict match outcome from two ELO ratings.
 *
 * Home advantage is added to the home rating before computing probabilities.
 * For sports with draws (soccer): drawProb = 1 - homeWinProb - awayWinProb
 * where each "win prob" is the expected score (0–1) from standard ELO.
 * For NFL-style no-draw sports, set drawProb = 0 externally.
 *
 * Note: Standard ELO gives homeWinProb + awayWinProb = 1 (no draws modelled).
 * drawProb is always 0; for draw-capable sports use a Dixon-Coles Poisson model.
 */
export function predictEloMatch(params: EloParams): EloMatchResult {
  const { homeRating, awayRating, homeAdvantagePoints = 65 } = params;

  const effectiveHomeDiff = homeRating + homeAdvantagePoints - awayRating;
  const homeWinProb = eloWinProb(effectiveHomeDiff);
  const awayWinProb = 1 - homeWinProb;

  return {
    homeWinProb,
    awayWinProb,
    drawProb: 0,
  };
}

/**
 * Margin of victory multiplier (FiveThirtyEight NFL formula).
 *
 * Larger margins of victory are rewarded less-than-linearly to avoid
 * over-weighting blowouts. The winner's existing rating advantage is
 * accounted for (beating a weak team by 30 is less impressive than
 * beating a strong team by 30).
 *
 * Formula: ln(|pointDiff| + 1) * 2.2 / (eloWinnerDiff * 0.001 + 2.2)
 * where eloWinnerDiff = winnerRating - loserRating (pre-game).
 */
export function movMultiplier(
  pointDiff: number,
  eloWinnerRating: number,
  eloLoserRating: number
): number {
  const absDiff = Math.abs(pointDiff);
  const eloWinnerDiff = eloWinnerRating - eloLoserRating;
  return (Math.log(absDiff + 1) * 2.2) / (eloWinnerDiff * 0.001 + 2.2);
}

/**
 * Update ELO ratings after a match result.
 *
 * Actual score:  1 for win, 0.5 for draw, 0 for loss.
 * Expected score: eloWinProb(ratingDiff + homeAdvantage).
 * Rating change: K × (actual - expected) × [MOV multiplier if enabled].
 */
export function updateElo(params: EloUpdateParams): EloUpdate {
  const {
    homeRatingBefore,
    awayRatingBefore,
    homeScore,
    awayScore,
    kFactor = 20,
    homeAdvantagePoints = 65,
    useMovMultiplier = false,
  } = params;

  const effectiveHomeDiff = homeRatingBefore + homeAdvantagePoints - awayRatingBefore;
  const expectedHome = eloWinProb(effectiveHomeDiff);
  const expectedAway = 1 - expectedHome;

  // Actual outcome from home perspective: 1=win, 0.5=draw, 0=loss
  let actualHome: number;
  let actualAway: number;
  if (homeScore > awayScore) {
    actualHome = 1;
    actualAway = 0;
  } else if (homeScore === awayScore) {
    actualHome = 0.5;
    actualAway = 0.5;
  } else {
    actualHome = 0;
    actualAway = 1;
  }

  // Margin-of-victory multiplier (optional, FiveThirtyEight style)
  let mov = 1;
  if (useMovMultiplier) {
    const pointDiff = homeScore - awayScore;
    const winnerRating = pointDiff >= 0 ? homeRatingBefore : awayRatingBefore;
    const loserRating = pointDiff >= 0 ? awayRatingBefore : homeRatingBefore;
    mov = movMultiplier(pointDiff, winnerRating, loserRating);
  }

  const homeRatingChange = kFactor * mov * (actualHome - expectedHome);
  const awayRatingChange = kFactor * mov * (actualAway - expectedAway);

  return {
    homeRatingAfter: homeRatingBefore + homeRatingChange,
    awayRatingAfter: awayRatingBefore + awayRatingChange,
    homeRatingChange,
    awayRatingChange,
  };
}
