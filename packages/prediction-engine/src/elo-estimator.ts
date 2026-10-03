/**
 * Elo independent estimator — a structured, market-INDEPENDENT estimate of P(home
 * wins) from team ratings (it never looks at the sportsbook line). It becomes
 * another "referee" in the edge engine's independentFairValues: the engine only
 * surfaces a pick when independent estimators diverge from the book AND agree with
 * each other, so each extra honest estimator hardens the signal.
 *
 * Pure, no I/O. Ratings storage/seeding and wiring into the scorer are separate,
 * founder-gated steps. Reference: 538-style Elo (cf. WagerBrain).
 */
import type { IndependentMarketFairValue } from "@sports/types";

export interface EloOptions {
  /** Home-field advantage in rating points added to the home side. Default 65. */
  readonly homeAdvantage?: number;
  /** Logistic scale (the Elo divisor). Default 400. */
  readonly scale?: number;
}

/**
 * P(home wins) under the logistic Elo model, in the open interval (0, 1) — never
 * exactly 0 or 1. Inputs are Elo rating points (dimensionless strength scores).
 *
 * Market-independent: this reads only the two ratings and the home advantage, never
 * the sportsbook line. The probability is strictly monotonic in the effective rating
 * diff (homeRating − awayRating + homeAdvantage), so a larger home edge always maps
 * to a larger P(home wins).
 */
export function eloWinProbability(homeRating: number, awayRating: number, options: EloOptions = {}): number {
  const homeAdvantage = options.homeAdvantage ?? 65;
  const scale = options.scale ?? 400;
  const diff = homeRating - awayRating + homeAdvantage;
  return 1 / (1 + Math.pow(10, -diff / scale));
}

export interface EloUpdate {
  readonly home: number;
  readonly away: number;
}

/**
 * Zero-sum rating update after a settled game: the home side gains exactly what the
 * away side loses (home delta = −away delta), so the pool's total rating is conserved.
 *
 * `homeWon` is the observed outcome (win = 1, loss = 0); the delta is `k` times the
 * surprise (outcome − expected home win prob), so an upset moves ratings more than a
 * chalk result. `k` (default 20) sets the learning rate. Both outputs are rounded to
 * 2 dp. The expectation is home-advantage-aware via the shared `options`.
 */
export function updateEloRatings(
  homeRating: number,
  awayRating: number,
  homeWon: boolean,
  k = 20,
  options: EloOptions = {},
): EloUpdate {
  const expectedHome = eloWinProbability(homeRating, awayRating, options);
  const delta = k * ((homeWon ? 1 : 0) - expectedHome);
  return { home: round2(homeRating + delta), away: round2(awayRating - delta) };
}

/**
 * Bridge an Elo estimate into the engine's independent fair-value ("referee") shape.
 *
 * Returns `homeFairProb`/`awayFairProb` in (0, 1), each rounded to 4 dp; the two sum
 * to 1 up to that rounding. These are structured, market-independent probabilities —
 * `eloWinProbability` never reads the sportsbook line, which is what makes this a valid
 * independent cross-check in the edge engine.
 *
 * `capturedAt` is provenance only: an ISO-8601 timestamp recording when the estimate
 * was materialised. It never affects any probability.
 *
 * Determinism seam: `options.now` is the SOLE non-deterministic input to this otherwise
 * pure module. When omitted it defaults to an argless `new Date()`, reading the wall
 * clock at call time, so two calls with identical ratings emit different `capturedAt`
 * values. Deterministic/reproducible callers (and all tests) MUST inject `now`; the
 * default is a convenience escape hatch for ad-hoc use only, not for library/pipeline
 * paths that require byte-identical, replayable output.
 */
export function toEloFairValue(
  homeRating: number,
  awayRating: number,
  options: EloOptions & {
    /**
     * Clock supplying the provenance `capturedAt` stamp. Inject for determinism;
     * defaults to wall-clock time — see the determinism-seam note above.
     */
    readonly now?: () => Date;
  } = {},
): IndependentMarketFairValue {
  const homeFairProb = eloWinProbability(homeRating, awayRating, options);
  const now = (options.now ?? (() => new Date()))();
  return {
    source: "elo",
    homeFairProb: round4(homeFairProb),
    awayFairProb: round4(1 - homeFairProb),
    capturedAt: now.toISOString(),
  };
}

function round2(x: number): number {
  return Number(x.toFixed(2));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
