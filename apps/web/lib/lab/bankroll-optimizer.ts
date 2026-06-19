/**
 * Galaxy Lab — Bankroll & Kelly optimizer engine.
 *
 * Wires the verified pure math libraries (`@/lib/math/kelly`,
 * `@/lib/math/bankroll`) and the seeded PRNG (`@/lib/utils/random-utils`) into a
 * validated, user-driven bankroll tool. This is an INTERACTIVE MODEL EXPLORER:
 * the user supplies a bankroll, a win probability (or lets us derive the no-edge
 * price), and a bet price, and we compute the Kelly stake, expected log-growth,
 * and a Monte Carlo bankroll trajectory with a risk-of-ruin estimate.
 *
 * Honesty / responsible-gaming posture: every output is a simulation of the
 * user's own inputs — it is NOT a published pick, a guarantee, or a performance
 * claim. We NEVER recommend a stake on a negative-edge spot (full Kelly clamps
 * to 0). The disclaimer travels with the result. No fabricated data;
 * deterministic given a seed.
 */

import {
  kellyFraction,
  expectedValue,
  breakEvenProb,
} from "@/lib/math/kelly";
import {
  expectedGrowth,
  analyzeDrawdown,
  type DrawdownAnalysis,
} from "@/lib/math/bankroll";
import { americanToDecimal } from "@/lib/utils/odds-utils";
import { createPRNG, type PRNG } from "@/lib/utils/random-utils";

export interface BankrollInput {
  /** Starting bankroll, in units or dollars (> 0). */
  bankroll: number;
  /**
   * Estimated true win probability (0–1). If omitted/null we derive the no-edge
   * (break-even) probability implied by `americanOdds` — a zero-edge baseline.
   */
  winProbability: number | null;
  /** American price of the bet you are sizing (e.g. -110, +150). */
  americanOdds: number;
  /** Fractional Kelly multiplier (0–1, default 0.5 = half-Kelly). */
  kellyMultiplier: number;
  /** Number of bets for the Monte Carlo trajectory + risk-of-ruin sim. */
  numBets: number;
  /** Optional seed for reproducibility. */
  seed: number | null;
}

export interface TrajectoryPoint {
  /** Bet index this sampled point represents. */
  bet: number;
  /** Median bankroll across all simulated paths at this point. */
  bankroll: number;
}

export interface DrawdownSummary {
  /** Mean of each path's max drawdown, as a fraction of its running peak. */
  meanMaxDrawdownPct: number;
  /** Median max-drawdown fraction across paths. */
  medianMaxDrawdownPct: number;
  /** 95th-percentile (worst-case-ish) max-drawdown fraction across paths. */
  p95MaxDrawdownPct: number;
}

export interface BankrollOutput {
  /** Echoed starting bankroll. */
  bankroll: number;
  /** Win probability used (supplied, or break-even derived from the price). */
  winProbability: number;
  /** Whether the win probability was derived from the price (zero-edge). */
  winProbabilityDerived: boolean;
  /** Bet price in American odds. */
  americanOdds: number;
  /** Bet price in decimal odds. */
  decimalOdds: number;
  /** Fractional Kelly multiplier applied. */
  kellyMultiplier: number;
  /** Number of bets simulated. */
  numBets: number;
  /** Full-Kelly fraction of bankroll (0 when no edge — never bet -EV). */
  fullKellyFraction: number;
  /** Applied (fractional) Kelly fraction = full × multiplier. */
  appliedKellyFraction: number;
  /** Recommended stake in units/$ = appliedKellyFraction × bankroll. */
  recommendedStake: number;
  /** Edge as a percentage of the wager (EV per unit staked × 100). */
  edgePct: number;
  /** Expected log-growth per bet at the applied fraction. */
  expectedLogGrowthPerBet: number;
  /** Median ending bankroll across all simulated paths. */
  medianEndingBankroll: number;
  /** Fraction of paths that dropped to/below the ruin threshold [0,1]. */
  riskOfRuin: number;
  /** Ruin threshold as a fraction of the starting bankroll. */
  ruinThresholdPct: number;
  /** Summary of the max-drawdown distribution across paths. */
  drawdownSummary: DrawdownSummary;
  /** Compact median bankroll trajectory, sampled to ~40 points for charting. */
  trajectory: TrajectoryPoint[];
  disclaimer: string;
}

export const BANKROLL_MIN_BETS = 1;
export const BANKROLL_MAX_BETS = 5_000;
export const BANKROLL_DEFAULT_BETS = 200;
export const BANKROLL_DEFAULT_KELLY_MULTIPLIER = 0.5;
/** Number of Monte Carlo paths simulated (fixed — not user-tunable). */
export const BANKROLL_PATHS = 2_000;
/** A path is "ruined" once it falls to or below this fraction of the start. */
export const RUIN_THRESHOLD_PCT = 0.2;
/** Trajectory is down-sampled to at most this many points for charting. */
const TRAJECTORY_POINTS = 40;
const DEFAULT_SEED = 1;

export const BANKROLL_DISCLAIMER =
  "Monte Carlo simulation of the inputs you entered — a bankroll model " +
  "exploration tool, not a published pick, prediction, or guarantee. Kelly " +
  "sizing assumes your win probability is correct; it is not. We never " +
  "recommend staking a negative-edge bet. Gambling involves risk — never " +
  "wager more than you can afford to lose. (1-800-GAMBLER)";

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

/** Round to a sensible number of decimals without trailing-float noise. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Percentile of an ascending-sorted array; clamps the index in-bounds. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = clampNumber(
    Math.floor(p * (sorted.length - 1)),
    0,
    sorted.length - 1,
  );
  return sorted[idx] ?? 0;
}

/**
 * Validate and normalize an untrusted request body into a BankrollInput.
 * Returns `{ error }` on a fatal validation problem.
 */
export function validateBankrollInput(
  raw: unknown,
): BankrollInput | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object." };
  }
  const src = raw as Record<string, unknown>;

  const bankrollRaw = readNumber(src, "bankroll");
  if (bankrollRaw === null) {
    return { error: "bankroll is required and must be a positive number." };
  }

  const oddsRaw = readNumber(src, "americanOdds");
  if (oddsRaw === null) {
    return {
      error: "americanOdds is required (e.g. -110 or +150).",
    };
  }
  // Reject odds of exactly 0 — they have no defined decimal price.
  if (oddsRaw === 0 || Math.abs(oddsRaw) >= 100000) {
    return { error: "americanOdds must be a valid non-zero price." };
  }

  const winProbRaw = readNumber(src, "winProbability");
  const multiplierRaw = readNumber(src, "kellyMultiplier");
  const numBetsRaw = readNumber(src, "numBets");
  const seedRaw = readNumber(src, "seed");

  return {
    bankroll: clampNumber(bankrollRaw, 0.01, 1_000_000_000),
    winProbability:
      winProbRaw === null ? null : clampNumber(winProbRaw, 0, 1),
    americanOdds: Math.round(oddsRaw),
    kellyMultiplier:
      multiplierRaw === null
        ? BANKROLL_DEFAULT_KELLY_MULTIPLIER
        : clampNumber(multiplierRaw, 0, 1),
    numBets:
      numBetsRaw === null
        ? BANKROLL_DEFAULT_BETS
        : Math.round(clampNumber(numBetsRaw, BANKROLL_MIN_BETS, BANKROLL_MAX_BETS)),
    seed: seedRaw === null ? null : Math.round(seedRaw),
  };
}

interface PathResult {
  ending: number;
  ruined: boolean;
  maxDrawdownPct: number;
  /** Full per-bet balance curve, length numBets + 1 (index 0 = start). */
  balances: number[];
}

/**
 * Simulate a single bankroll path of `numBets` flat-fractional-Kelly bets.
 * Each bet risks `fraction` of the CURRENT bankroll; a win multiplies by
 * (1 + fraction·b), a loss multiplies by (1 − fraction). Tracks ruin and the
 * peak-to-trough max drawdown along the way.
 */
function simulatePath(
  prng: PRNG,
  bankroll: number,
  winProb: number,
  b: number,
  fraction: number,
  numBets: number,
  ruinThreshold: number,
): PathResult {
  let current = bankroll;
  let ruined = false;
  const balances: number[] = [bankroll];
  const winFactor = 1 + fraction * b;
  const lossFactor = 1 - fraction;

  for (let i = 0; i < numBets; i++) {
    if (prng.next() < winProb) {
      current *= winFactor;
    } else {
      current *= lossFactor;
    }
    balances.push(current);
    if (!ruined && current <= ruinThreshold) {
      ruined = true;
    }
  }

  const dd: DrawdownAnalysis = analyzeDrawdown(balances);
  return {
    ending: current,
    ruined,
    maxDrawdownPct: dd.maxDrawdownPct,
    balances,
  };
}

/** Run the bankroll optimization + Monte Carlo and assemble an honest result. */
export function runBankrollOptimization(input: BankrollInput): BankrollOutput {
  const decimalOdds = americanToDecimal(input.americanOdds);
  const b = decimalOdds - 1;

  // Win probability: supplied, or the zero-edge break-even implied by price.
  const winProbabilityDerived = input.winProbability === null;
  const winProbability = winProbabilityDerived
    ? breakEvenProb(input.americanOdds)
    : input.winProbability!;

  // Full Kelly — returns 0 for any non-positive edge (never bet -EV).
  const fullKellyFraction = kellyFraction(winProbability, b);
  const appliedKellyFraction = fullKellyFraction * input.kellyMultiplier;
  const recommendedStake = appliedKellyFraction * input.bankroll;

  const edgePct = expectedValue(winProbability, input.americanOdds) * 100;
  const expectedLogGrowthPerBet = expectedGrowth(
    winProbability,
    decimalOdds,
    appliedKellyFraction,
  );

  // ── Monte Carlo over flat-fractional-Kelly paths ─────────────────────────
  const ruinThreshold = input.bankroll * RUIN_THRESHOLD_PCT;
  const masterSeed = input.seed ?? DEFAULT_SEED;
  const master = createPRNG(masterSeed);

  const endings: number[] = [];
  const maxDrawdowns: number[] = [];
  let ruinCount = 0;

  // When the applied fraction is 0 (no edge / no stake), every path is flat at
  // the starting bankroll — still summarized honestly (no growth, no ruin).
  // Aggregating the median ACROSS paths at each sampled bet index gives a stable
  // median trajectory without storing every path's full curve.
  const sampleIndices = buildSampleIndices(input.numBets);
  // balancesAtSample[s] collects each path's balance at sampled bet index s.
  const balancesAtSample: number[][] = sampleIndices.map(() => []);

  for (let p = 0; p < BANKROLL_PATHS; p++) {
    const pathSeed = Math.floor(master.next() * 4294967296);
    const prng = createPRNG(pathSeed);
    const path = simulatePath(
      prng,
      input.bankroll,
      winProbability,
      b,
      appliedKellyFraction,
      input.numBets,
      ruinThreshold,
    );

    if (path.ruined) ruinCount++;
    endings.push(path.ending);
    maxDrawdowns.push(path.maxDrawdownPct);

    for (let s = 0; s < sampleIndices.length; s++) {
      const betIdx = sampleIndices[s]!;
      balancesAtSample[s]!.push(path.balances[betIdx] ?? path.ending);
    }
  }

  endings.sort((x, y) => x - y);
  maxDrawdowns.sort((x, y) => x - y);

  const medianEndingBankroll = percentile(endings, 0.5);
  const riskOfRuin = ruinCount / BANKROLL_PATHS;

  const meanMaxDrawdownPct =
    maxDrawdowns.length > 0
      ? maxDrawdowns.reduce((a, c) => a + c, 0) / maxDrawdowns.length
      : 0;

  const trajectory: TrajectoryPoint[] = sampleIndices.map((betIdx, s) => {
    const col = balancesAtSample[s]!;
    const sortedCol = col.slice().sort((x, y) => x - y);
    return {
      bet: betIdx,
      bankroll: round(percentile(sortedCol, 0.5), 2),
    };
  });

  return {
    bankroll: input.bankroll,
    winProbability: round(winProbability, 6),
    winProbabilityDerived,
    americanOdds: input.americanOdds,
    decimalOdds: round(decimalOdds, 4),
    kellyMultiplier: input.kellyMultiplier,
    numBets: input.numBets,
    fullKellyFraction: round(fullKellyFraction, 6),
    appliedKellyFraction: round(appliedKellyFraction, 6),
    recommendedStake: round(recommendedStake, 2),
    edgePct: round(edgePct, 4),
    expectedLogGrowthPerBet: Number.isFinite(expectedLogGrowthPerBet)
      ? round(expectedLogGrowthPerBet, 6)
      : 0,
    medianEndingBankroll: round(medianEndingBankroll, 2),
    riskOfRuin: round(riskOfRuin, 4),
    ruinThresholdPct: RUIN_THRESHOLD_PCT,
    drawdownSummary: {
      meanMaxDrawdownPct: round(meanMaxDrawdownPct, 4),
      medianMaxDrawdownPct: round(percentile(maxDrawdowns, 0.5), 4),
      p95MaxDrawdownPct: round(percentile(maxDrawdowns, 0.95), 4),
    },
    trajectory,
    disclaimer: BANKROLL_DISCLAIMER,
  };
}

/**
 * Build the set of bet indices (into a 0..numBets balance array) to sample for
 * the compact trajectory — evenly spaced, always including bet 0 and the final
 * bet, capped at TRAJECTORY_POINTS unique points.
 */
function buildSampleIndices(numBets: number): number[] {
  const total = numBets + 1; // balances array length
  if (total <= TRAJECTORY_POINTS) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const indices: number[] = [];
  const last = numBets;
  for (let s = 0; s < TRAJECTORY_POINTS; s++) {
    const idx = Math.round((s / (TRAJECTORY_POINTS - 1)) * last);
    if (indices[indices.length - 1] !== idx) indices.push(idx);
  }
  return indices;
}
