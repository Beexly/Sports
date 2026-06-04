/**
 * Trade Analyzer — value both sides, judge fairness, read the lean.
 *
 * A trade value blends Value Over Replacement, raw projection, trend, and injury
 * risk. We compare the two sides, score fairness, detect consolidation (the
 * 2-for-1 that helps a contender), and surface a win-now vs. depth lean. The
 * reasoning is shown, not just a number. Pure, illustrative.
 */

import { vor, type Player } from "./players";

/** A single player's trade value (higher = more valuable). */
export function tradeValue(p: Player): number {
  const base = p.proj * 0.45 + Math.max(0, vor(p)) * 0.85;
  const trend = p.trend === "up" ? 1.1 : p.trend === "down" ? 0.86 : 1;
  const inj = p.injury === "out" ? 0.6 : p.injury === "questionable" ? 0.88 : 1;
  return Math.round(base * trend * inj);
}

export type Fairness = "you win" | "fair" | "you lose";
export type Lean = "win-now" | "balanced" | "depth";

export type TradeEval = {
  readonly giveValue: number;
  readonly getValue: number;
  readonly delta: number; // get − give, from your perspective
  readonly ratio: number; // get / give
  readonly fairness: Fairness;
  readonly lean: Lean;
  readonly bestGet: Player | null; // the headliner you receive
  readonly reasons: readonly string[];
};

export function evaluateTrade(give: readonly Player[], get: readonly Player[]): TradeEval | null {
  if (give.length === 0 || get.length === 0) return null;

  const giveValue = give.reduce((s, p) => s + tradeValue(p), 0);
  const getValue = get.reduce((s, p) => s + tradeValue(p), 0);
  const delta = getValue - giveValue;
  const ratio = getValue / Math.max(1, giveValue);

  const fairness: Fairness = ratio >= 1.12 ? "you win" : ratio >= 0.89 ? "fair" : "you lose";

  // consolidation: giving more bodies than you get back, with a clear headliner
  const bestGet = [...get].sort((a, b) => tradeValue(b) - tradeValue(a))[0] ?? null;
  const bestGive = [...give].sort((a, b) => tradeValue(b) - tradeValue(a))[0] ?? null;
  const consolidating = get.length < give.length;
  const lean: Lean = consolidating ? "win-now" : get.length > give.length ? "depth" : "balanced";

  const reasons: string[] = [];
  reasons.push(
    fairness === "fair"
      ? `Within a fair band — values land ${Math.abs(delta)} apart (${(ratio * 100).toFixed(0)}%).`
      : fairness === "you win"
        ? `You come out ahead by ${delta} points of value.`
        : `You give up ${Math.abs(delta)} points of value — push for more.`,
  );
  if (consolidating && bestGet) reasons.push(`Consolidation: ${give.length}-for-${get.length} into ${bestGet.name} upgrades your starting lineup at the cost of depth.`);
  if (!consolidating && get.length > give.length) reasons.push("Adds bodies — useful for a bye-week crunch or an injury-thin bench.");
  if (bestGet && bestGive && tradeValue(bestGet) > tradeValue(bestGive)) reasons.push(`Wins the headliner: ${bestGet.name} is the best player in the deal.`);
  const riskIn = get.filter((p) => p.injury !== "healthy" || p.trend === "down");
  if (riskIn.length) reasons.push(`Buying risk: ${riskIn.map((p) => p.name).join(", ")} carry a tag or a cooling arrow — that's the discount.`);

  return { giveValue, getValue, delta, ratio, fairness, lean, bestGet, reasons };
}
