/**
 * Cost-aware backtest evaluation — does the pick set clear the vig?
 *
 * WHY THIS EXISTS
 * ---------------
 * `harness.ts` measures calibration: Brier score and its Murphy decomposition.
 * That is the right metric for "are our probabilities honest?" and it is
 * deliberately NOT a profit metric. But it leaves the business question
 * unanswered: a model can be well calibrated and still lose money, because
 * every bet pays the book's margin.
 *
 * Measured 2026-11-04: the 52.4% break-even number exists in this repo ONLY as
 * academy copy (`apps/web/lib/academy/curriculum.ts:82`) and in no backtest
 * code. So the platform teaches users the line that decides profitability while
 * being unable to evaluate its own picks against it.
 *
 * This module closes that gap and nothing else. It does not replace the
 * calibration harness; it answers the adjacent question.
 *
 * SCOPE AND HONESTY
 * -----------------
 * - Pure and deterministic, matching harness.ts: no DB, no env, no Date.now().
 * - Every derived field is withheld below an explicit sample floor rather than
 *   published off a thin sample. Same discipline as the harness's honest zero.
 * - A backtest is evidence about the past. It is not a promise about the
 *   future, and nothing here should be read as investment advice.
 * - Cost model is deliberately simple: a single flat price applied to every
 *   pick. Real slates have line shopping, stale prices and pushes, and this
 *   module does not model them. That limitation is stated, not hidden.
 */

/** Flat price applied to every settled pick, in American odds. */
export interface CostModel {
  /** American odds, e.g. -110. Fractional and decimal inputs are NOT accepted. */
  readonly americanOdds: number;
}

export type SettledResult = "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";

export interface CostAwarePick {
  readonly id: string;
  readonly result: SettledResult;
}

export interface CostAwareCoverage {
  readonly totalInput: number;
  /** WIN + LOSS — the only results that carry risk and therefore P&L. */
  readonly riskBearing: number;
  readonly pushes: number;
  readonly voids: number;
  readonly pending: number;
  readonly minSampleSize: number;
  readonly sufficientSample: boolean;
}

export interface CostAwareReport {
  readonly status: "empty" | "insufficient-sample" | "ok";
  readonly costModel: CostModel;
  /** Decimal odds derived from the American price, e.g. -110 -> 1.9091. */
  readonly decimalOdds: number | null;
  /** Fraction of wins required just to break even at this price. Null = withheld. */
  readonly requiredWinRate: number | null;
  /** Observed win rate over risk-bearing picks (WINS / (WINS + LOSSES)). Null = withheld. */
  readonly observedWinRate: number | null;
  /** observedWinRate - requiredWinRate. Positive means the set cleared the vig. Null = withheld. */
  readonly marginOverBreakeven: number | null;
  /** True/False only when the sample is sufficient; null otherwise. */
  readonly beatsBreakeven: boolean | null;
  /** Net profit in units of one stake per pick. Null = withheld. */
  readonly netUnits: number | null;
  /** netUnits / stakeCount. Null = withheld. */
  readonly roi: number | null;
  readonly coverage: CostAwareCoverage;
  readonly note: string;
}

const DEFAULT_MIN_SAMPLE_SIZE = 100;

/**
 * Convert American odds to decimal (total return per 1 unit staked).
 * -110 -> 1 + 100/110 = 1.9091...   +150 -> 1 + 150/100 = 2.5
 * Rejects 0 and values in (-100, 100), which are not valid American prices.
 */
export function americanToDecimal(americanOdds: number): number {
  if (!Number.isFinite(americanOdds) || americanOdds === 0) {
    throw new RangeError(`invalid American odds: ${americanOdds}`);
  }
  if (americanOdds >= 100) return 1 + americanOdds / 100;
  if (americanOdds <= -100) return 1 + 100 / Math.abs(americanOdds);
  throw new RangeError(
    `American odds must be <= -100 or >= 100, got ${americanOdds}`,
  );
}

/** Break-even win probability at a given American price. -110 -> 0.5238. */
export function breakevenRate(americanOdds: number): number {
  return 1 / americanToDecimal(americanOdds);
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Evaluate a settled pick set against a flat price.
 *
 * PUSH and VOID return the stake and therefore contribute 0 to net units;
 * PENDING is excluded entirely (an unsettled pick has no outcome to score).
 */
export function evaluateAtPrice(
  picks: readonly CostAwarePick[],
  costModel: CostModel,
  options: { readonly minSampleSize?: number } = {},
): CostAwareReport {
  const minSampleSize = options.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
  const decimalOdds = americanToDecimal(costModel.americanOdds);
  const requiredWinRate = round4(breakevenRate(costModel.americanOdds));

  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let voids = 0;
  let pending = 0;
  for (const pick of picks) {
    switch (pick.result) {
      case "WIN":
        wins += 1;
        break;
      case "LOSS":
        losses += 1;
        break;
      case "PUSH":
        pushes += 1;
        break;
      case "VOID":
        voids += 1;
        break;
      case "PENDING":
        pending += 1;
        break;
    }
  }

  const riskBearing = wins + losses;
  const sufficientSample = riskBearing >= minSampleSize;

  const coverage: CostAwareCoverage = {
    totalInput: picks.length,
    riskBearing,
    pushes,
    voids,
    pending,
    minSampleSize,
    sufficientSample,
  };

  if (riskBearing === 0) {
    return {
      status: "empty",
      costModel,
      decimalOdds: null,
      requiredWinRate: null,
      observedWinRate: null,
      marginOverBreakeven: null,
      beatsBreakeven: null,
      netUnits: null,
      roi: null,
      coverage,
      note:
        "No settled risk-bearing picks (WIN/LOSS) were provided. Nothing to price.",
    };
  }

  if (!sufficientSample) {
    return {
      status: "insufficient-sample",
      costModel,
      decimalOdds: round4(decimalOdds),
      requiredWinRate,
      observedWinRate: null,
      marginOverBreakeven: null,
      beatsBreakeven: null,
      netUnits: null,
      roi: null,
      coverage,
      note:
        `${riskBearing} risk-bearing pick(s) is below the floor of ${minSampleSize}. ` +
        "The break-even rate at this price is reported because it is a property of the " +
        "price, not of the sample. Observed win rate, margin, net units and ROI are " +
        "withheld rather than published off a thin sample.",
    };
  }

  const observedWinRate = round4(wins / riskBearing);
  const marginOverBreakeven = round4(observedWinRate - requiredWinRate);
  // Each win returns (decimalOdds - 1); each loss costs 1; push/void are flat.
  const netUnits = round4(wins * (decimalOdds - 1) - losses);

  return {
    status: "ok",
    costModel,
    decimalOdds: round4(decimalOdds),
    requiredWinRate,
    observedWinRate,
    marginOverBreakeven,
    beatsBreakeven: marginOverBreakeven > 0,
    netUnits,
    roi: round4(netUnits / riskBearing),
    coverage,
    note:
      marginOverBreakeven > 0
        ? `Clears the vig by ${(marginOverBreakeven * 100).toFixed(2)} points at ${costModel.americanOdds}. ` +
          "Evidence about a settled sample only, not a forecast of future returns."
        : `Does NOT clear the vig: ${(marginOverBreakeven * 100).toFixed(2)} points short at ${costModel.americanOdds}. ` +
          "A well-calibrated model can still lose money — that is what the vig does.",
  };
}
