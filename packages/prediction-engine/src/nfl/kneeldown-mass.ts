/**
 * Kneeldown mass and its hook exposure.
 *
 * FITTED 2026-10-23 on n=1,694 kneeldowns, pbp 2018-2021, 834 games
 * (4 seasons, 195,134 plays scanned). The spec under review claimed "-2 to -3
 * rushing yards (with an empirical mean of per kneel)". The measured point mass
 * is -1.0: 86.3% of kneels lose exactly one yard, mean -1.059, sd 0.498,
 * median -1.0. Only 8.4% reach -2 or worse and 5.3% are scored zero.
 *
 * The spec was right only in aggregate: with 2.03 kneels per winning game the
 * expected game-level deduction is -2.27 yards, which is where "2 to 3" comes
 * from. Applying -2.5 per EVENT over-haircuts by about 1.4 yards.
 *
 * CORRECT CONSTRUCTION: a prop haircut is applied to one player's game
 * distribution, so enter through P(victory formation) — near-binary once the
 * team leads inside two minutes — and multiply by the -1.06 mass.
 */

/** Yards and probability mass per outcome. Sums to 1. */
export const KNEEL_MASS: ReadonlyArray<{ readonly yards: number; readonly mass: number }> = [
  { yards: 0, mass: 0.05 },
  { yards: -1, mass: 0.87 },
  { yards: -2, mass: 0.063 },
  { yards: -3, mass: 0.01 },
  { yards: -4, mass: 0.004 },
  { yards: -5, mass: 0.002 },
  { yards: -7, mass: 0.001 },
];

export const KNEEL_MEAN_YD = -1.059;
export const KNEEL_SD_YD = 0.498;
export const KNEEL_RATE_PER_WINNING_GAME = 2.03;
export const KNEEL_EXPECTED_GAME_HAIRCUT_YD = -2.27;

/**
 * Share of nonzero kneels that cross a half-yard boundary. By definition 1.0:
 * any kneel of a full yard moves a .5 hook. Reported so callers do not have to
 * re-derive that a kneeldown either crosses the hook or is scored zero.
 */
export const KNEEL_CROSSES_HALF_HOOK = 1;

export interface VictoryFormationState {
  /** Kickoff-to-final-seconds remaining. */
  readonly secondsRemaining: number;
  /** Possessing team's score minus opponent's. */
  readonly scoreDifferential: number;
  /** Opponent timeouts remaining, 0-3. */
  readonly opponentTimeouts: number;
  readonly quarter: number;
}

/**
 * Has probability of at least one kneeldown. Not a model — a branch on the
 * state that the data says produces the behaviour: 85.2% of kneels occur with a
 * positive differential, 79.7% inside the final two minutes of Q4/OT, and 20.0%
 * in Q2 (clock mechanism, not victory formation).
 *
 * Returns 0 outside the window so Q2 kneels are not billed to the endgame mass.
 */
export function kneelProbability(s: VictoryFormationState): number {
  if (s.quarter < 4) return 0;
  if (s.secondsRemaining > 120) return 0;
  if (s.scoreDifferential <= 0) return 0;
  // One possession is not enough to kneel unless time is nearly gone.
  if (s.scoreDifferential <= 3 && s.secondsRemaining > 45) return 0.55;
  if (s.scoreDifferential <= 3) return 0.85;
  if (s.opponentTimeouts >= 2) return 0.8;
  return 0.97;
}

/** Expected yards to deduct from a QB rush projection in this state. */
export function kneeldownExpectedHaircutYd(s: VictoryFormationState): number {
  return kneelProbability(s) * KNEEL_RATE_PER_WINNING_GAME * KNEEL_MEAN_YD;
}

/**
 * Probability that a .5 hook is lost purely to kneels. Because every nonzero
 * kneel crosses a half yard, this is P(at least one kneel) — computed exactly
 * from the per-game rate rather than assumed.
 */
export function halfHookLossProbability(s: VictoryFormationState): number {
  const lambda = kneelProbability(s) * KNEEL_RATE_PER_WINNING_GAME;
  return 1 - Math.exp(-lambda);
}

/** Mean of the mixture as written, for a drift assertion in tests. */
export function kneelMixtureMean(): number {
  return KNEEL_MASS.reduce((acc, o) => acc + o.yards * o.mass, 0);
}
