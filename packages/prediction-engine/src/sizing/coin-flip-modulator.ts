/**
 * Coin-flip game stake modulator (spread within +/-2.5).
 *
 * Descriptive finding turned into a staking rule: "coin-flip" NFL games
 * (spread within +/-2.5) are intrinsically low-signal classes - do not
 * over-allocate stake to them. Scales the Kelly stake by `factor` when
 * |spread| <= threshold (default 2.5); factor 0 is full abstention.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2403.16282v1 — The Evolution of Football Betting
 * (coin-flip abstention / stake-reduction rule).
 *
 * ACCEPTANCE GATE: ledger closes as guidance-only if EPA-family features
 * rank top-3 in the univariate screen; the staking rule ships regardless.
 */

export interface CoinFlipOptions {
  /** Spread magnitude at/below which a game counts as a coin flip. */
  readonly threshold?: number;
  /** Stake multiplier applied to coin-flip games (0 = abstain). */
  readonly factor?: number;
}

/** True when the game is a coin flip (|spread| <= threshold). */
export function isCoinFlip(spread: number, threshold = 2.5): boolean {
  if (!Number.isFinite(spread)) throw new Error("coin-flip-modulator: spread must be finite");
  if (!(threshold >= 0)) throw new Error("coin-flip-modulator: threshold must be >= 0");
  return Math.abs(spread) <= threshold;
}

/** Modulate a Kelly stake: scale by factor on coin-flip games. */
export function modulateStake(
  kellyStake: number,
  spread: number,
  opts: CoinFlipOptions = {},
): number {
  if (!(kellyStake >= 0)) throw new Error("coin-flip-modulator: stake must be >= 0");
  const threshold = opts.threshold ?? 2.5;
  const factor = opts.factor ?? 0.5;
  if (!(factor >= 0 && factor <= 1)) throw new Error("coin-flip-modulator: factor in [0,1]");
  return isCoinFlip(spread, threshold) ? kellyStake * factor : kellyStake;
}
