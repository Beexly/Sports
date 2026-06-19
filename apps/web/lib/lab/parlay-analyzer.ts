/**
 * Galaxy Lab — Parlay stress-tester engine.
 *
 * Wires the verified pure libraries (odds conversions in `@/lib/utils/odds-utils`
 * and the correlation-adjusted joint-probability model in `@/lib/math/combinatorics`)
 * into a validated, user-driven analysis tool. This is an INTERACTIVE MODEL
 * EXPLORER: the user supplies a set of parlay legs (each as American odds OR a
 * personal win-probability estimate), an optional correlation assumption, and a
 * stake, and we compute the combined win probability, payout, expected value,
 * breakeven win-rate, and a seeded Monte Carlo risk-of-ruin estimate.
 *
 * Honesty posture: every output is a model of the user's own inputs and
 * assumptions — it is NOT a published pick, a guarantee, or a performance claim.
 * The correlation model is a documented first-order approximation, and the
 * risk-of-ruin figure is a simulation, not a promise. The disclaimer travels
 * with the result. No fabricated data; deterministic given a seed.
 */

import {
  americanToDecimal,
  decimalToAmerican,
  americanToImpliedProb,
  impliedProbToAmerican,
} from "@/lib/utils/odds-utils";
import {
  correlatedParlayProb,
  requiredWinRate,
} from "@/lib/math/combinatorics";

export interface ParlayLegInput {
  /** Optional human-readable label, e.g. "Lakers ML". */
  label: string;
  /** American odds for this leg, when the leg is priced. */
  americanOdds: number | null;
  /**
   * The user's own estimated true win probability (0–1) for this leg, when
   * supplied directly instead of (or in addition to) odds.
   */
  winProbability: number | null;
}

export interface ParlayAnalyzerInput {
  legs: ParlayLegInput[];
  /** Flat stake per parlay, in units; clamped 0.1–10,000. */
  stakeUnits: number;
  /** Pairwise leg correlation assumption (-1..1). 0 = independent. */
  correlation: number;
  /** Number of flat-staked bets to simulate for the risk-of-ruin estimate. */
  numBetsForRuin: number;
  /** Optional seed for the Monte Carlo risk-of-ruin sim. */
  seed: number | null;
}

export interface ParlayLegOutput {
  label: string;
  /** American odds used for this leg (derived from probability if only that was given). */
  americanOdds: number;
  /** Decimal odds equivalent. */
  decimalOdds: number;
  /** Market-implied win probability from the price (with vig). */
  impliedWinProbability: number;
  /**
   * The probability used for "true"-probability math: the user's own estimate
   * when supplied, otherwise the market-implied probability as a fallback.
   */
  trueWinProbability: number;
}

export interface ParlayAnalyzerOutput {
  legCount: number;
  legs: ParlayLegOutput[];
  /** Decimal payout multiplier for the whole parlay (product of leg decimals). */
  payoutMultiplier: number;
  /** American odds equivalent of the combined payout. */
  combinedAmericanOdds: number;
  /** Combined win probability assuming independence (product of leg true probs). */
  independentWinProbability: number;
  /**
   * Combined win probability adjusted for the supplied correlation assumption.
   * Equals the independent product when correlation is 0. Positive correlation
   * raises the joint probability; negative lowers it. First-order model.
   */
  correlatedWinProbability: number;
  /** Stake echoed back (units). */
  stakeUnits: number;
  /** Net profit if the parlay wins (units), excluding the returned stake. */
  profitOnWin: number;
  /** Total returned if the parlay wins (stake + profit). */
  totalReturnOnWin: number;
  /** Expected value in units, using the correlated win probability. */
  expectedValueUnits: number;
  /** Expected value as a percentage of stake. */
  expectedValuePct: number;
  /** Breakeven win-rate: the win probability at which EV = 0 (= 1 / payoutMultiplier). */
  breakevenWinProbability: number;
  /** True-vs-breakeven edge in probability points; positive = +EV. */
  edgePoints: number;
  /** Honest, seeded Monte Carlo risk-of-ruin estimate. */
  riskOfRuin: RiskOfRuinOutput;
  disclaimer: string;
}

export interface RiskOfRuinOutput {
  /** Number of flat-staked bets simulated per trial. */
  numBets: number;
  /** Win probability used for each simulated bet (the correlated joint prob). */
  perBetWinProbability: number;
  /** Starting bankroll, in units. */
  startingBankrollUnits: number;
  /** Estimated probability the bankroll is fully depleted within numBets bets. */
  ruinProbability: number;
  /** Mean ending bankroll across trials, in units. */
  expectedEndingBankrollUnits: number;
  /** Number of independent trials averaged. */
  trials: number;
}

export const PARLAY_MAX_LEGS = 15;
export const PARLAY_MIN_STAKE = 0.1;
export const PARLAY_MAX_STAKE = 10_000;
export const PARLAY_DEFAULT_STAKE = 1;
export const PARLAY_MIN_RUIN_BETS = 1;
export const PARLAY_MAX_RUIN_BETS = 5_000;
export const PARLAY_DEFAULT_RUIN_BETS = 200;
const RUIN_TRIALS = 500;
/** Starting bankroll for the ruin sim, expressed as a multiple of one flat stake. */
const RUIN_STARTING_STAKE_MULTIPLE = 100;

export const PARLAY_DISCLAIMER =
  "Stress-test of the legs, odds, and correlation you entered — a model " +
  "exploration tool, not a published pick, prediction, or guarantee. The " +
  "correlation adjustment is a documented first-order approximation and the " +
  "risk-of-ruin figure is a Monte Carlo estimate, not a promise. Results are illustrative.";

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const v = source[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const v = source[key];
  if (typeof v === "string" && v.trim() !== "") return v.trim().slice(0, 48);
  return fallback;
}

/** Simple linear congruential generator for seeded pseudo-random numbers. */
function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Validate and normalize an untrusted request body into a ParlayAnalyzerInput.
 * Returns `{ error }` on a fatal validation problem.
 *
 * Each leg must provide either `americanOdds` or `winProbability` (or both).
 * Legs missing both are rejected. The legs array is capped at PARLAY_MAX_LEGS.
 */
export function validateParlayInput(
  raw: unknown,
): ParlayAnalyzerInput | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object." };
  }
  const src = raw as Record<string, unknown>;

  const rawLegs = src["legs"];
  if (!Array.isArray(rawLegs) || rawLegs.length === 0) {
    return { error: "legs must be a non-empty array." };
  }
  if (rawLegs.length > PARLAY_MAX_LEGS) {
    return { error: `A parlay supports at most ${PARLAY_MAX_LEGS} legs.` };
  }

  const legs: ParlayLegInput[] = [];
  for (let i = 0; i < rawLegs.length; i++) {
    const entry = rawLegs[i];
    if (typeof entry !== "object" || entry === null) {
      return { error: `Leg ${i + 1} must be an object.` };
    }
    const legSrc = entry as Record<string, unknown>;
    const americanOddsRaw = readNumber(legSrc, "americanOdds");
    const winProbRaw = readNumber(legSrc, "winProbability");

    if (americanOddsRaw === null && winProbRaw === null) {
      return {
        error: `Leg ${i + 1} needs either americanOdds or winProbability.`,
      };
    }

    // American odds must not be in the dead zone -99..99 (excluding 0 handled
    // by treating it as "not provided"). Clamp into a sane book range.
    let americanOdds: number | null = null;
    if (americanOddsRaw !== null && americanOddsRaw !== 0) {
      const sign = americanOddsRaw < 0 ? -1 : 1;
      const magnitude = clampNumber(Math.abs(americanOddsRaw), 100, 100_000);
      americanOdds = sign * Math.round(magnitude);
    }

    const winProbability =
      winProbRaw === null ? null : clampNumber(winProbRaw, 0.0001, 0.9999);

    if (americanOdds === null && winProbability === null) {
      return {
        error: `Leg ${i + 1} needs either americanOdds or winProbability.`,
      };
    }

    legs.push({
      label: readString(legSrc, "label", `Leg ${i + 1}`),
      americanOdds,
      winProbability,
    });
  }

  const stakeRaw = readNumber(src, "stakeUnits");
  const correlationRaw = readNumber(src, "correlation");
  const ruinBetsRaw = readNumber(src, "numBetsForRuin");
  const seedRaw = readNumber(src, "seed");

  return {
    legs,
    stakeUnits:
      stakeRaw === null
        ? PARLAY_DEFAULT_STAKE
        : clampNumber(stakeRaw, PARLAY_MIN_STAKE, PARLAY_MAX_STAKE),
    correlation:
      correlationRaw === null ? 0 : clampNumber(correlationRaw, -1, 1),
    numBetsForRuin:
      ruinBetsRaw === null
        ? PARLAY_DEFAULT_RUIN_BETS
        : Math.round(
            clampNumber(
              ruinBetsRaw,
              PARLAY_MIN_RUIN_BETS,
              PARLAY_MAX_RUIN_BETS,
            ),
          ),
    seed: seedRaw === null ? null : Math.round(seedRaw),
  };
}

/**
 * Resolve a single validated leg into concrete odds + probabilities.
 *
 * - If only odds were given, the "true" probability falls back to the
 *   market-implied probability (an honest neutral assumption).
 * - If only a probability was given, the odds are derived from it (fair price).
 * - If both were given, the user's probability is the "true" estimate while the
 *   supplied odds drive the payout/implied figures.
 */
function resolveLeg(leg: ParlayLegInput): ParlayLegOutput {
  let americanOdds: number;
  let impliedWinProbability: number;

  if (leg.americanOdds !== null) {
    americanOdds = leg.americanOdds;
    impliedWinProbability = americanToImpliedProb(leg.americanOdds);
  } else {
    // Only a probability was supplied: derive a fair price from it.
    const prob = leg.winProbability ?? 0.5;
    americanOdds = impliedProbToAmerican(prob);
    impliedWinProbability = prob;
  }

  const decimalOdds = americanToDecimal(americanOdds);
  const trueWinProbability = leg.winProbability ?? impliedWinProbability;

  return {
    label: leg.label,
    americanOdds,
    decimalOdds: Number(decimalOdds.toFixed(6)),
    impliedWinProbability: Number(impliedWinProbability.toFixed(6)),
    trueWinProbability: Number(trueWinProbability.toFixed(6)),
  };
}

/**
 * Seeded Monte Carlo risk-of-ruin over a sequence of flat-staked parlay bets.
 *
 * Each bet wins with `perBetWinProbability` (the correlated joint probability)
 * and, on a win, returns `profitMultiplier × stake` in profit; on a loss it
 * forfeits the stake. The bankroll starts at RUIN_STARTING_STAKE_MULTIPLE flat
 * stakes. "Ruin" = the bankroll can no longer cover the next flat stake within
 * `numBets` bets. Deterministic given a seed.
 */
function simulateRiskOfRuin(
  perBetWinProbability: number,
  profitMultiplier: number,
  stakeUnits: number,
  numBets: number,
  seed: number | null,
): RiskOfRuinOutput {
  const startingBankrollUnits = stakeUnits * RUIN_STARTING_STAKE_MULTIPLE;
  const rng = makeLCG(seed ?? 0x9e3779b1);

  let ruinCount = 0;
  let endingBankrollSum = 0;

  for (let trial = 0; trial < RUIN_TRIALS; trial++) {
    let bankroll = startingBankrollUnits;
    let ruined = false;
    for (let bet = 0; bet < numBets; bet++) {
      if (bankroll < stakeUnits) {
        ruined = true;
        break;
      }
      bankroll -= stakeUnits;
      if (rng() < perBetWinProbability) {
        bankroll += stakeUnits + stakeUnits * profitMultiplier;
      }
    }
    if (ruined || bankroll < stakeUnits) ruinCount++;
    endingBankrollSum += bankroll;
  }

  return {
    numBets,
    perBetWinProbability: Number(perBetWinProbability.toFixed(6)),
    startingBankrollUnits: Number(startingBankrollUnits.toFixed(2)),
    ruinProbability: Number((ruinCount / RUIN_TRIALS).toFixed(4)),
    expectedEndingBankrollUnits: Number(
      (endingBankrollSum / RUIN_TRIALS).toFixed(2),
    ),
    trials: RUIN_TRIALS,
  };
}

/** Run the parlay stress-test and assemble an honest, complete result. */
export function runParlayAnalysis(
  input: ParlayAnalyzerInput,
): ParlayAnalyzerOutput {
  const legs = input.legs.map(resolveLeg);

  // Payout multiplier = product of decimal odds; profit excludes stake.
  const payoutMultiplier = legs.reduce((acc, l) => acc * l.decimalOdds, 1);
  const profitMultiplier = payoutMultiplier - 1;

  const trueProbs = legs.map((l) => l.trueWinProbability);
  const independentWinProbability = trueProbs.reduce((acc, p) => acc * p, 1);
  const correlatedWinProbability = correlatedParlayProb(
    trueProbs,
    input.correlation,
  );

  const profitOnWin = input.stakeUnits * profitMultiplier;
  const totalReturnOnWin = input.stakeUnits * payoutMultiplier;

  // EV in units using the (honest) correlated joint probability:
  //   EV = p_win × profitOnWin − (1 − p_win) × stake
  const expectedValueUnits =
    correlatedWinProbability * profitOnWin -
    (1 - correlatedWinProbability) * input.stakeUnits;
  const expectedValuePct =
    input.stakeUnits > 0
      ? (expectedValueUnits / input.stakeUnits) * 100
      : 0;

  // Breakeven win-rate is the implied probability of the combined payout —
  // the win probability at which EV is exactly zero.
  const breakevenWinProbability = requiredWinRate(
    decimalToAmerican(payoutMultiplier),
  );
  const edgePoints =
    (correlatedWinProbability - breakevenWinProbability) * 100;

  const riskOfRuin = simulateRiskOfRuin(
    correlatedWinProbability,
    profitMultiplier,
    input.stakeUnits,
    input.numBetsForRuin,
    input.seed,
  );

  return {
    legCount: legs.length,
    legs,
    payoutMultiplier: Number(payoutMultiplier.toFixed(4)),
    combinedAmericanOdds: decimalToAmerican(payoutMultiplier),
    independentWinProbability: Number(independentWinProbability.toFixed(6)),
    correlatedWinProbability: Number(correlatedWinProbability.toFixed(6)),
    stakeUnits: input.stakeUnits,
    profitOnWin: Number(profitOnWin.toFixed(4)),
    totalReturnOnWin: Number(totalReturnOnWin.toFixed(4)),
    expectedValueUnits: Number(expectedValueUnits.toFixed(4)),
    expectedValuePct: Number(expectedValuePct.toFixed(2)),
    breakevenWinProbability: Number(breakevenWinProbability.toFixed(6)),
    edgePoints: Number(edgePoints.toFixed(2)),
    riskOfRuin,
    disclaimer: PARLAY_DISCLAIMER,
  };
}
