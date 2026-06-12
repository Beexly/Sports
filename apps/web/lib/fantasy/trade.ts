/**
 * Trade Analyzer — value both sides, judge fairness, read the lean.
 *
 * A trade value blends Value Over Replacement, raw projection, trend, and injury
 * risk. We compare the two sides, score fairness, detect consolidation (the
 * 2-for-1 that helps a contender), and surface a win-now vs. depth lean. The
 * reasoning is shown, not just a number. Pure, illustrative.
 */

import { vor, type Player } from "./players";
import { activePlayerPool } from "@/lib/integrations/projections";

// ── Dynasty value ─────────────────────────────────────────────────────────────

/**
 * Dynasty-adjusted trade value: weights career trajectory signals — trending
 * role, usage momentum, and scheme fit — as proxies for career stage.
 * Without player age in the data model, trend + usage are the best available
 * signals for "ascending vs. declining" arc.
 *
 * Pure; pool-injectable.
 */
export function dynastyValue(p: Player, pool: readonly Player[] = activePlayerPool()): number {
  const base = tradeValue(p, pool);

  // Ascending career arc signals
  const trending = p.trend === "up" ? 1.3 : p.trend === "down" ? 0.7 : 1;
  const usageRising = p.usage > 0.6 ? 1.1 : p.usage < 0.3 ? 0.9 : 1;
  const schemeAligned = p.schemeFit > 0.75 ? 1.1 : p.schemeFit < 0.5 ? 0.9 : 1;

  // Role keywords that signal early/ascending arc
  const roleText = p.role.toLowerCase();
  const earlyArc = /rookie|rising|camp riser|ascending|breakout|upside|young/.test(roleText) ? 1.2 : 1;
  const lateArc = /aging|depth|veteran|late.career|backup/.test(roleText) ? 0.85 : 1;

  return Math.round(base * trending * usageRising * schemeAligned * earlyArc * lateArc);
}

/** A single player's trade value (higher = more valuable). VOR is computed
 *  against the active pool so values stay correct on a live feed. */
export function tradeValue(p: Player, pool: readonly Player[] = activePlayerPool()): number {
  const base = p.proj * 0.45 + Math.max(0, vor(p, pool)) * 0.85;
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

export function evaluateTrade(
  give: readonly Player[],
  get: readonly Player[],
  pool: readonly Player[] = activePlayerPool(),
  mode: "redraft" | "dynasty" = "redraft",
): TradeEval | null {
  if (give.length === 0 || get.length === 0) return null;

  const valueFn = mode === "dynasty" ? (p: Player) => dynastyValue(p, pool) : (p: Player) => tradeValue(p, pool);
  const giveValue = give.reduce((s, p) => s + valueFn(p), 0);
  const getValue = get.reduce((s, p) => s + valueFn(p), 0);
  const delta = getValue - giveValue;
  const ratio = getValue / Math.max(1, giveValue);

  const fairness: Fairness = ratio >= 1.12 ? "you win" : ratio >= 0.89 ? "fair" : "you lose";

  // consolidation: giving more bodies than you get back, with a clear headliner
  const bestGet = [...get].sort((a, b) => tradeValue(b, pool) - tradeValue(a, pool))[0] ?? null;
  const bestGive = [...give].sort((a, b) => tradeValue(b, pool) - tradeValue(a, pool))[0] ?? null;
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
  if (bestGet && bestGive && tradeValue(bestGet, pool) > tradeValue(bestGive, pool)) reasons.push(`Wins the headliner: ${bestGet.name} is the best player in the deal.`);
  const riskIn = get.filter((p) => p.injury !== "healthy" || p.trend === "down");
  if (riskIn.length) reasons.push(`Buying risk: ${riskIn.map((p) => p.name).join(", ")} carry a tag or a cooling arrow — that's the discount.`);

  return { giveValue, getValue, delta, ratio, fairness, lean, bestGet, reasons };
}
