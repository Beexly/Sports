
/** EWMA volatility of score changes. */
export function ewmaVolatility(deltas: readonly number[], lambda = 0.94): number[] {
  if (!(lambda > 0 && lambda < 1)) throw new Error("in-game-volatility: lambda in (0,1) required");
  const out: number[] = [];
  let vol = 0;
  for (const d of deltas) {
    vol = lambda * vol + (1 - lambda) * Math.abs(d);
    out.push(vol);
  }
  return out;
}

/** Annualized-style scaling: expected remaining absolute movement over horizon. */
export function expectedMovement(currentVol: number, periodsRemaining: number): number {
  if (!(currentVol >= 0 && periodsRemaining >= 0)) throw new Error("in-game-volatility: nonnegative args required");
  return currentVol * Math.sqrt(Math.max(periodsRemaining, 0));
}

export interface VolInterval {
  readonly lower: number;
  readonly upper: number;
  readonly width: number;
}

/** Fair interval for the final margin given current margin and vol spec. */
export function inGameVolInterval(currentMargin: number, currentVol: number, periodsRemaining: number, z = 1.64): VolInterval {
  const move = expectedMovement(currentVol, periodsRemaining);
  return { lower: currentMargin - z * move, upper: currentMargin + z * move, width: 2 * z * move };
}
