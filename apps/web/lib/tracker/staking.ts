/**
 * Staking — the Kelly criterion, made safe and legible.
 *
 * Given your honest win probability and the price, Kelly gives the bankroll
 * fraction that maximizes long-run growth. Full Kelly is brutally high-variance,
 * so the sane default is a fraction of it. We also show the EV and the edge, and
 * we refuse to recommend a bet with no edge. Educational, not betting advice.
 */

import { americanToDecimal, impliedProb } from "./clv";

export type Staking = {
  /** your estimated win probability (0..1) */
  readonly winProb: number;
  /** the market's implied probability from the price */
  readonly marketProb: number;
  /** your edge in percentage points */
  readonly edgePp: number;
  /** EV per unit staked */
  readonly evPerUnit: number;
  readonly hasEdge: boolean;
  /** full-Kelly bankroll fraction (0..1, clamped at 0) */
  readonly fullKelly: number;
  /** the multiplier applied (e.g. 0.25 for quarter-Kelly) */
  readonly fraction: number;
  /** recommended bankroll fraction after applying the multiplier */
  readonly stakeFraction: number;
  /** recommended stake in your bankroll's units */
  readonly stakeAmount: number;
};

/**
 * @param winProb your estimated probability the bet wins (0..1)
 * @param americanOdds the price you're getting
 * @param bankroll total bankroll in units
 * @param fraction Kelly multiplier (default quarter-Kelly)
 */
export function staking(winProb: number, americanOdds: number, bankroll: number, fraction = 0.25): Staking {
  const p = Math.max(0, Math.min(1, winProb));
  const dec = americanToDecimal(americanOdds);
  const b = dec - 1; // net odds
  const q = 1 - p;

  const marketProb = impliedProb(americanOdds);
  const edgePp = Math.round((p - marketProb) * 1000) / 10;
  const evPerUnit = Math.round((p * b - q) * 1000) / 1000;
  const hasEdge = evPerUnit > 0;

  const rawKelly = b > 0 ? (b * p - q) / b : 0;
  const fullKelly = Math.max(0, Math.round(rawKelly * 1000) / 1000);
  const stakeFraction = Math.round(fullKelly * fraction * 1000) / 1000;
  const stakeAmount = Math.round(stakeFraction * bankroll * 100) / 100;

  return { winProb: p, marketProb, edgePp, evPerUnit, hasEdge, fullKelly, fraction, stakeFraction, stakeAmount };
}
