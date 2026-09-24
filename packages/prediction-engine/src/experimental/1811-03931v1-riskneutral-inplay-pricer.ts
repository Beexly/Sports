/**
 * arXiv 1811.03931v1: Risk-Neutral Pricing and Hedging of In-Play Football Bets
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Risk-neutral pricing of in-play football bets: drives arrive as a Poisson process with marks (TD/FG/punt/turnover); the risk-neutral intensity is calibrated so the model total matches the de-vigged market total. Live totals/spreads are priced by the remaining-drive compound process, and the book delta-hedges in-play exposure against its pre-game position.
 *
 * Record improvement (verbatim):
 * Build GSE's risk-neutral in-play pricer for live NFL totals: port the soccer goal-Poisson to a drive-level scoring process -- each drive is a 'jump' with points {0,2,3,6,7,8}, modeled as a marked point process with time-varying intensity lambda(t, score-diff, field-position regime); define tradable underlyings as compensated drive-point processes (the paper's S^1_t, S^2_t construction); calibrate lambda to live market totals (consensus books) by bid-ask-weighted least squares -- yielding implied scoring intensities per team per game state; compute in-play deltas (dX on next score for each team) and hedge live total exposure with 'next score' props (the direct analogue of Next Goal bets, which books actually offer). Start with the constant-intensity closed forms (Poisson sums, Eq. 14) as the baseline pricer; upgrade to CIR-stochastic intensity per Jottreau 2009 once the desk needs it. Improvement beyond the paper: the state-dependent intensity the authors defer -- lambda_i(drive outcome) conditioned on (down, distance, field position, clock, score diff) from nflverse EPA tables, i.e., Dixon & Robinson (1998)'s state-dependent Poisson ported to football drives -- converting the theoretical hedge into a calibrated trading desk.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the risk-neutral in-play pricer as GSE's live-totals engine if the reproducibility test hits calibration error <= 2.0 bid-ask spreads with jump correlation >= 0.70 on 2024 holdout games; reject if intensities must be re-fit so often that the 'constant lambda' closed forms add nothing over a direct empirical jump model -- then keep only the implied-intensity calibration idea.
 */

export const ENABLED = false;

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x));
  return x < 0 ? -y : y;
}
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export interface PointMark {
  points: number;
  prob: number;
}

export function expectedPointsPerDrive(marks: PointMark[]): number {
  return marks.reduce((s, m) => s + m.points * m.prob, 0);
}

export function expectedSquaredPointsPerDrive(marks: PointMark[]): number {
  return marks.reduce((s, m) => s + m.points * m.points * m.prob, 0);
}

export interface LiveTotal {
  mean: number;
  variance: number;
  drivesRemaining: number;
}

/**
 * Fair live total under the risk-neutral drive process: remaining drives ~
 * Poisson(lambda * timeLeft); points per drive i.i.d. marks.
 */
export function fairLiveTotal(
  lambda: number,
  marks: PointMark[],
  timeLeft: number,
  currentTotal: number,
): LiveTotal {
  const drivesRemaining = lambda * timeLeft;
  const e1 = expectedPointsPerDrive(marks);
  const e2 = expectedSquaredPointsPerDrive(marks);
  return {
    mean: currentTotal + drivesRemaining * e1,
    variance: drivesRemaining * e2,
    drivesRemaining,
  };
}

/**
 * Calibrate the risk-neutral intensity so the model total matches the
 * de-vigged market total (the paper's risk-neutral measure step).
 */
export function calibrateLambda(
  marketTotal: number,
  marks: PointMark[],
  timeLeft: number,
  currentTotal: number,
): number {
  const e1 = expectedPointsPerDrive(marks);
  if (e1 <= 0 || timeLeft <= 0) return 0;
  return Math.max(0, (marketTotal - currentTotal) / (timeLeft * e1));
}

export interface OverUnder {
  over: number;
  under: number;
}

/** Price over/under on a line by normal approximation with continuity correction. */
export function priceOverUnder(mean: number, variance: number, line: number): OverUnder {
  const sd = Math.sqrt(Math.max(variance, 1e-9));
  const over = 1 - normalCdf((line + 0.5 - mean) / sd);
  return { over, under: 1 - over };
}

/**
 * Delta hedge for the book: d(value)/d(mean) of an in-play position, to be
 * offset against the pre-game book. Negative = lay off / short the direction.
 */
export function hedgeDelta(
  mean: number,
  variance: number,
  line: number,
  position: "over" | "under",
  stake: number,
): number {
  const sd = Math.sqrt(Math.max(variance, 1e-9));
  const z = (line + 0.5 - mean) / sd;
  const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const dOver = phi / sd; // d P(over) / d mean
  const exposure = position === "over" ? dOver : -dOver;
  return -stake * exposure;
}

/** Gate: adopt on market-total calibration and hedge variance reduction. */
export function pricerGate(maeVsMarket: number, hedgeVarianceReduction: number): "ADOPT" | "REJECT" {
  if (maeVsMarket <= 0.3 && hedgeVarianceReduction >= 0.3) return "ADOPT";
  return "REJECT";
}
