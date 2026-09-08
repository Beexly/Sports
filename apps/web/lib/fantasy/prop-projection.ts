/**
 * Prop projection from real per-game history.
 *
 * props.ts does the DECISION math well - P(over) from a projection
 * distribution, side selection, edge against a de-vigged two-way quote, best
 * alt line by EV. What it has never had is a real projection to feed it: the
 * shipped slate is a frozen array of illustrative lines.
 *
 * This module is the missing half. It turns a player's actual per-game history
 * into the (mean, sigma) pair props.ts already knows how to reason about, with
 * the provenance attached.
 *
 * WHAT IT WILL NOT DO
 *   - Invent a sigma. Fewer than two games means no dispersion estimate, so
 *     there is no projection - not a guessed one.
 *   - Project from a basis the season gate refuses (C-213).
 *   - Claim an edge. Edge needs a market, and no player-prop market is
 *     ingested today (the odds table holds H2H, SPREADS and TOTALS only, which
 *     is measured, not assumed). A projection from this module is OUR NUMBER;
 *     whether it beats a line is a separate question this module never answers.
 *
 * The sigma is the sample standard deviation over the player's own games,
 * floored by a proportional term so a freak low-variance stretch cannot
 * manufacture false certainty. Both terms are reported so a reader can see
 * which one bound the estimate.
 */
import {
  evaluateProjectionBasis,
  type ProjectionBasis,
} from "../integrations/projection-basis";

/**
 * Fewer than this and the sample standard deviation is not worth reporting.
 *
 * Deliberately ABOVE the basis gate's MIN_GAMES_FOR_BASIS (4). Four games is
 * enough to say a player has a basis at all; it is not enough to estimate how
 * much he varies, and an n-1 sigma over four games is dominated by noise. Set
 * equal to the basis floor this constant would be dead code - the gate would
 * always refuse first - which is exactly what the first version of this module
 * did, and what its own fuzz caught.
 */
export const MIN_GAMES_FOR_SIGMA = 6;

/**
 * Sigma floor as a fraction of the mean. A player whose observed games happen
 * to cluster tightly is not genuinely more predictable than the sport allows;
 * without this, a 3-game cluster produces a sigma near zero and P(over)
 * collapses to 0 or 1, which the prop math would then report as certainty.
 */
export const SIGMA_FLOOR_FRACTION = 0.18;

/**
 * Below this per-game mean there is no prop worth posting. Guarding only on
 * `mean > 0` let a history of essentially zeros through: the mean was positive
 * by a denormal, the floored sigma rounded to 0.0, and props.ts would then have
 * reported P(over) as a certainty. Found by fuzz on [0, 0, 0, 1.5e-323].
 */
export const MIN_MEAN_FOR_PROP = 0.5;

export interface PropProjectionInput {
  readonly playerName: string;
  readonly market: string;
  /** The player's actual per-game values for this stat, one per game played. */
  readonly perGame: readonly number[];
  readonly targetSeason: number;
  readonly targetWeek: number;
  /** Season the per-game values come from. */
  readonly basisSeason: number;
}

export interface PropProjection {
  readonly ok: true;
  readonly playerName: string;
  readonly market: string;
  readonly mean: number;
  readonly sigma: number;
  /** Which term set the sigma, so the number can be read honestly. */
  readonly sigmaSource: "sample" | "floor";
  readonly games: number;
  readonly basisLabel: string;
  /** Never claimed here — no player-prop market is ingested. */
  readonly priced: false;
}

export interface PropProjectionRefusal {
  readonly ok: false;
  readonly playerName: string;
  readonly market: string;
  readonly reason: string;
}

export type PropProjectionResult = PropProjection | PropProjectionRefusal;

function mean(xs: readonly number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Sample standard deviation (n - 1). Returns 0 for n < 2. */
function sampleSigma(xs: readonly number[], mu: number): number {
  if (xs.length < 2) return 0;
  const ss = xs.reduce((s, x) => s + (x - mu) ** 2, 0);
  return Math.sqrt(ss / (xs.length - 1));
}

export function projectProp(input: PropProjectionInput): PropProjectionResult {
  const { playerName, market, perGame, targetSeason, targetWeek, basisSeason } = input;

  const clean = perGame.filter((v) => Number.isFinite(v));
  if (clean.length !== perGame.length) {
    return { ok: false, playerName, market, reason: "Per-game history contains non-finite values." };
  }
  if (clean.some((v) => v < 0)) {
    return { ok: false, playerName, market, reason: "Per-game history contains a negative value." };
  }

  const basis: ProjectionBasis = evaluateProjectionBasis({
    targetSeason,
    targetWeek,
    basisSeason,
    gamesBehind: clean.length,
  });
  if (!basis.ok) {
    return { ok: false, playerName, market, reason: basis.reason };
  }

  if (clean.length < MIN_GAMES_FOR_SIGMA) {
    return {
      ok: false, playerName, market,
      reason: `${clean.length} games is too few to estimate dispersion; ${MIN_GAMES_FOR_SIGMA} required.`,
    };
  }

  const mu = mean(clean);
  if (!(mu >= MIN_MEAN_FOR_PROP)) {
    return {
      ok: false, playerName, market,
      reason: `Mean of ${mu.toFixed(3)} per game is below ${MIN_MEAN_FOR_PROP} — nothing to project.`,
    };
  }

  const sample = sampleSigma(clean, mu);
  const floor = mu * SIGMA_FLOOR_FRACTION;
  const sigma = Math.max(sample, floor);

  // Post-rounding guard. The reported sigma is what props.ts consumes, so a
  // value that survives the floor but rounds to 0.0 is still a certainty
  // claim. Refuse rather than ship it.
  const roundedSigma = Math.round(sigma * 10) / 10;
  if (!(roundedSigma > 0)) {
    return {
      ok: false, playerName, market,
      reason: "Dispersion rounds to zero at display precision — refusing to imply certainty.",
    };
  }

  return {
    ok: true,
    playerName,
    market,
    mean: Math.round(mu * 10) / 10,
    sigma: roundedSigma,
    sigmaSource: sample >= floor ? "sample" : "floor",
    games: clean.length,
    basisLabel: basis.label,
    priced: false,
  };
}
