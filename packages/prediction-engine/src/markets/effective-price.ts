/**
 * Effective-price accounting with shrouded-fee sign-flip detection.
 *
 * Posted prices lie when fees are shrouded. With a flat fee f per bet:
 *   effective stake  = stake + f
 *   effective payout = stake * odds - f        (win)
 *   effective EV     = p * (stake*odds - f) - (1-p) * (stake + f)
 * A pick flips when posted EV > 0 but effective EV <= 0. Per-book
 * posted-vs-effective margin gaps feed line selection (prefer slow-moving
 * high-gap books).
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2409.01493v1 — Shrouded Sin Taxes (effective-price
 * honesty infrastructure).
 *
 * ACCEPTANCE GATE: adopt effective-price accounting if sign flips occur on
 * >= 2% of positive-EV picks for any tracked book.
 */

export interface PricedPick {
  /** Model win probability. */
  readonly p: number;
  /** Posted decimal odds. */
  readonly odds: number;
  /** Stake in the same units as fee. */
  readonly stake: number;
  /** Shrouded flat fee per bet (0 if none). */
  readonly fee: number;
}

/** EV at posted prices (fee = 0). */
export function postedEv(pick: PricedPick): number {
  if (!(pick.p >= 0 && pick.p <= 1)) throw new Error("effective-price: p in [0,1]");
  if (!(pick.odds > 1)) throw new Error("effective-price: odds must exceed 1");
  if (!(pick.stake > 0)) throw new Error("effective-price: stake must be > 0");
  return pick.p * pick.stake * (pick.odds - 1) - (1 - pick.p) * pick.stake;
}

/** EV at effective prices (fee deducted from wins, added to stake). */
export function effectiveEv(pick: PricedPick): number {
  if (!(pick.fee >= 0)) throw new Error("effective-price: fee must be >= 0");
  const posted = postedEv(pick);
  // Fee is paid win or lose: it shifts EV down by exactly the fee.
  return posted - pick.fee;
}

/** True if the pick is +EV posted but -EV effective (the shrouded flip). */
export function isSignFlip(pick: PricedPick): boolean {
  return postedEv(pick) > 0 && effectiveEv(pick) <= 0;
}

/** Fraction of positive-posted-EV picks that flip (the adoption metric). */
export function signFlipRate(picks: readonly PricedPick[]): number {
  const positive = picks.filter((p) => {
    try {
      return postedEv(p) > 0;
    } catch {
      return false;
    }
  });
  if (positive.length === 0) return 0;
  return positive.filter(isSignFlip).length / positive.length;
}

/**
 * Posted-vs-effective margin gap per book: mean (postedEV - effectiveEV) =
 * mean fee, plus the flip share. Used as a line-selection feature.
 */
export function bookFeeGap(picks: readonly PricedPick[]): { meanFee: number; flipShare: number } {
  if (picks.length === 0) throw new Error("effective-price: need >= 1 pick");
  const meanFee = picks.reduce((s, p) => s + p.fee, 0) / picks.length;
  return { meanFee, flipShare: signFlipRate(picks) };
}
