/**
 * Galaxy Lab — Monte Carlo game simulator engine.
 *
 * Wires the verified pure libraries (`game-simulation`) into a validated,
 * user-driven simulation tool. This is an INTERACTIVE MODEL EXPLORER: the user
 * supplies team ratings (and optionally a market line), and we simulate the
 * matchup thousands of times to show the outcome distribution and where the
 * model's win probability disagrees with the market-implied price.
 *
 * Honesty posture: every output is a simulation of the user's own inputs — it
 * is NOT a published pick, a guarantee, or a performance claim. The disclaimer
 * travels with the result. No fabricated data; deterministic given a seed.
 */

import {
  simulateGameWithSpread,
  marginDistribution,
  impliedWinProbFromSpread,
  winProbToMoneyline,
  type TeamStrength,
  type SimulationConfig,
} from "@/lib/sports/game-simulation";

export interface GameSimInput {
  homeName: string;
  awayName: string;
  /** Home offense: points scored per game (0–80). */
  homeOffense: number;
  /** Home defense: points allowed per game (0–80). */
  homeDefense: number;
  awayOffense: number;
  awayDefense: number;
  /** Extra points for the home side; default 2.5. */
  homeFieldAdvantage: number;
  /** Optional home spread, e.g. -3 means home favored by 3. */
  spread: number | null;
  /** Optional game total (over/under). */
  total: number | null;
  /** Monte Carlo iterations; clamped 1,000–50,000. */
  iterations: number;
  /** Optional seed for reproducibility. */
  seed: number | null;
}

export interface MarginBucket {
  margin: number;
  probability: number;
}

export interface GameSimOutput {
  homeName: string;
  awayName: string;
  iterations: number;
  homeWinProbability: number;
  awayWinProbability: number;
  tieProbability: number;
  avgHomeScore: number;
  avgAwayScore: number;
  avgTotalPoints: number;
  /** Projected scoring margin (home − away); positive favors home. */
  projectedMargin: number;
  /** Fair moneyline implied by the simulated win probability. */
  homeFairMoneyline: number;
  awayFairMoneyline: number;
  /** Probability the home side covers the supplied spread, if any. */
  coverProbability: number | null;
  /** Probability the total goes over the supplied number, if any. */
  overProbability: number | null;
  /** Win probability the supplied spread implies (the market price). */
  marketImpliedHomeWinProbability: number | null;
  /**
   * Simulated home win probability minus the market-implied probability,
   * in percentage points. Positive = the model sees more home value than the
   * price does. This is a model-vs-price comparison, not a recommendation.
   */
  edgeVsMarketPoints: number | null;
  marginHistogram: MarginBucket[];
  disclaimer: string;
}

export const SIM_MIN_ITERATIONS = 1_000;
export const SIM_MAX_ITERATIONS = 50_000;
export const SIM_DEFAULT_ITERATIONS = 10_000;
const RATING_MAX = 80;
const DEFAULT_HFA = 2.5;

export const SIM_DISCLAIMER =
  "Monte Carlo simulation of the ratings you entered — a model exploration tool, " +
  "not a published pick, prediction, or guarantee. Results are illustrative.";

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

/**
 * Validate and normalize an untrusted request body into a GameSimInput.
 * Returns `{ error }` on a fatal validation problem.
 */
export function validateGameSimInput(
  raw: unknown,
): GameSimInput | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object." };
  }
  const src = raw as Record<string, unknown>;

  const homeOffense = readNumber(src, "homeOffense");
  const homeDefense = readNumber(src, "homeDefense");
  const awayOffense = readNumber(src, "awayOffense");
  const awayDefense = readNumber(src, "awayDefense");

  if (
    homeOffense === null ||
    homeDefense === null ||
    awayOffense === null ||
    awayDefense === null
  ) {
    return {
      error:
        "homeOffense, homeDefense, awayOffense and awayDefense are required numbers (points per game).",
    };
  }

  const spreadRaw = readNumber(src, "spread");
  const totalRaw = readNumber(src, "total");
  const hfaRaw = readNumber(src, "homeFieldAdvantage");
  const iterRaw = readNumber(src, "iterations");
  const seedRaw = readNumber(src, "seed");

  return {
    homeName: readString(src, "homeName", "Home"),
    awayName: readString(src, "awayName", "Away"),
    homeOffense: clampNumber(homeOffense, 0, RATING_MAX),
    homeDefense: clampNumber(homeDefense, 0, RATING_MAX),
    awayOffense: clampNumber(awayOffense, 0, RATING_MAX),
    awayDefense: clampNumber(awayDefense, 0, RATING_MAX),
    homeFieldAdvantage:
      hfaRaw === null ? DEFAULT_HFA : clampNumber(hfaRaw, -10, 10),
    spread: spreadRaw === null ? null : clampNumber(spreadRaw, -40, 40),
    total: totalRaw === null ? null : clampNumber(totalRaw, 0, 200),
    iterations:
      iterRaw === null
        ? SIM_DEFAULT_ITERATIONS
        : Math.round(
            clampNumber(iterRaw, SIM_MIN_ITERATIONS, SIM_MAX_ITERATIONS),
          ),
    seed: seedRaw === null ? null : Math.round(seedRaw),
  };
}

/** Run the Monte Carlo simulation and assemble an honest, complete result. */
export function runGameSimulation(input: GameSimInput): GameSimOutput {
  const home: TeamStrength = {
    teamId: input.homeName,
    offensiveRating: input.homeOffense,
    defensiveRating: input.homeDefense,
    homeFieldAdv: input.homeFieldAdvantage,
  };
  const away: TeamStrength = {
    teamId: input.awayName,
    offensiveRating: input.awayOffense,
    defensiveRating: input.awayDefense,
    homeFieldAdv: 0,
  };

  const config: SimulationConfig = {
    iterations: input.iterations,
    ...(input.seed !== null ? { seed: input.seed } : {}),
  };

  const result = simulateGameWithSpread(
    home,
    away,
    input.spread ?? 0,
    input.total ?? undefined,
    config,
  );

  const dist = marginDistribution(home, away, config);
  // Down-sample the margin histogram to a compact, render-friendly set of
  // buckets (every margin that carries at least 0.2% probability).
  const marginHistogram: MarginBucket[] = dist
    .filter((d) => d.probability >= 0.002)
    .map((d) => ({
      margin: d.margin,
      probability: Number(d.probability.toFixed(5)),
    }));

  const marketImplied =
    input.spread === null ? null : impliedWinProbFromSpread(input.spread);
  const edgeVsMarketPoints =
    marketImplied === null
      ? null
      : Number(
          ((result.homeWinProbability - marketImplied) * 100).toFixed(2),
        );

  return {
    homeName: input.homeName,
    awayName: input.awayName,
    iterations: result.iterations,
    homeWinProbability: result.homeWinProbability,
    awayWinProbability: result.awayWinProbability,
    tieProbability: result.tieProb,
    avgHomeScore: Number(result.avgHomeScore.toFixed(2)),
    avgAwayScore: Number(result.avgAwayScore.toFixed(2)),
    avgTotalPoints: Number(result.avgTotalPoints.toFixed(2)),
    projectedMargin: Number(
      (result.avgHomeScore - result.avgAwayScore).toFixed(2),
    ),
    homeFairMoneyline: winProbToMoneyline(result.homeWinProbability),
    awayFairMoneyline: winProbToMoneyline(result.awayWinProbability),
    // Only report cover/over when the user actually supplied the line — a
    // null spread is passed to the simulator as 0, which would otherwise
    // produce a meaningless "cover vs pick'em" figure.
    coverProbability:
      input.spread === null ? null : (result.coverProbability ?? null),
    overProbability:
      input.total === null ? null : (result.overProbability ?? null),
    marketImpliedHomeWinProbability: marketImplied,
    edgeVsMarketPoints,
    marginHistogram,
    disclaimer: SIM_DISCLAIMER,
  };
}
