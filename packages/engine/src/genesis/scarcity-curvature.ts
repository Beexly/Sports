/**
 * GENESIS LAYER — Scarcity Curvature (Invention 51).
 *
 * Fantasy value is nonlinear: the gap between RB24 and RB30 is not the gap between RB4 and RB10. A
 * player is not "a good add" — he is a good add INSIDE a scarcity curve, which depends on position,
 * scoring format, roster/bench depth, waiver-pool quality, byes, and playoff context. ScarcityCurvature
 * is the second derivative of value with respect to available replacement quality: how sharply value
 * rises as replacements disappear. Pure + deterministic.
 */

export type ScarcityPosition = "QB" | "RB" | "WR" | "TE";
export type ScarcityFormat = "standard" | "ppr" | "superflex" | "te_premium" | "best_ball" | "dynasty" | "dfs";

export interface ScarcityInputs {
  readonly position: ScarcityPosition;
  readonly format: ScarcityFormat;
  readonly playerRank: number;       // positional rank (1 = best)
  readonly replacementRank: number;  // your realistic replacement's positional rank
  readonly benchDepth: number;       // bench slots
  readonly waiverPoolQuality: number;// 0..1 (1 = many good replacements available)
  readonly byeWeekPressure: number;  // 0..1
  readonly playoffContext: number;   // 0..1
}

export interface ScarcityCurveResult {
  readonly steepness: number;
  readonly replacementCliff: number; // value(player) − value(replacement)
  readonly curvature: number;        // local second difference (nonlinearity)
  readonly actionImpact: number;     // how much scarcity should swing the action
  readonly note: string;
}

function steepnessFor(position: ScarcityPosition, format: ScarcityFormat): number {
  let s = position === "RB" ? 0.14 : position === "TE" ? 0.16 : position === "QB" ? 0.08 : 0.1;
  if (format === "superflex" && position === "QB") s *= 2.2;
  if (format === "te_premium" && position === "TE") s *= 1.6;
  if (format === "best_ball") s *= 0.85;
  return s;
}

/** Marginal value at a positional rank under a given steepness (convex decline). */
export function valueAtRank(rank: number, steepness: number): number {
  return 1 / (1 + steepness * Math.max(0, rank - 1));
}

/** Sample the scarcity curve for ranks 1..n. */
export function scarcityCurve(steepness: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => Number(valueAtRank(i + 1, steepness).toFixed(4)));
}

/** Compute scarcity curvature and the action impact for a player in context. */
export function computeScarcityCurvature(i: ScarcityInputs): ScarcityCurveResult {
  const steepness = steepnessFor(i.position, i.format);
  const r = Math.max(2, i.playerRank);
  const curvature = Number((valueAtRank(r - 1, steepness) - 2 * valueAtRank(r, steepness) + valueAtRank(r + 1, steepness)).toFixed(5));
  // Relative cliff: a steeper curve compresses absolute tail gaps, so the value drop to replacement
  // is measured relative to the replacement's value (how much MORE the player is worth).
  const vPlayer = valueAtRank(i.playerRank, steepness);
  const vReplacement = valueAtRank(i.replacementRank, steepness);
  const replacementCliff = Number(((vPlayer - vReplacement) / Math.max(1e-6, vReplacement)).toFixed(4));
  const benchNorm = Math.min(1, i.benchDepth / 8);
  const contextAmp = (1 + 0.5 * i.byeWeekPressure + 0.5 * i.playoffContext) * (1 - 0.3 * benchNorm) * (0.5 + 0.5 * (1 - i.waiverPoolQuality));
  const actionImpact = Number(Math.max(0, Math.min(1, replacementCliff * contextAmp * 2)).toFixed(4));
  return {
    steepness: Number(steepness.toFixed(4)),
    replacementCliff,
    curvature,
    actionImpact,
    note: `${i.position}/${i.format}: cliff ${replacementCliff.toFixed(3)} to replacement; scarcity ${actionImpact >= 0.5 ? "materially swings" : "modestly affects"} the action.`,
  };
}
