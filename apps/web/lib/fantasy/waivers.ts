/**
 * Waiver & FAAB Advisor — who to add, how much to bid, and who to drop.
 *
 * Ranks the available pool on UPSIDE (ceiling, trend, usage, scheme fit), then
 * recommends a FAAB bid as a % of your remaining budget scaled to the target's
 * tier — and surfaces the weakest rostered players as drop candidates. Pure +
 * illustrative.
 */

import { vor, type Player } from "./players";
import { activePlayerPool } from "@/lib/integrations/projections";

/** The studs assumed already rostered (top value), excluded from the waiver pool. */
const ROSTERED_COUNT = 14;

export function pickupScore(p: Player): number {
  const base = p.ceiling * 0.34 + p.proj * 0.18;
  const trend = p.trend === "up" ? 1.28 : p.trend === "down" ? 0.8 : 1;
  const usage = 1 + p.usage * 0.3;
  const scheme = 1 + p.schemeFit * 0.2;
  const inj = p.injury === "out" ? 0.6 : p.injury === "questionable" ? 0.9 : 1;
  return base * trend * usage * scheme * inj;
}

function rosteredIds(pool: readonly Player[]): Set<string> {
  return new Set([...pool].sort((a, b) => vor(b, pool) - vor(a, pool)).slice(0, ROSTERED_COUNT).map((p) => p.id));
}

export type FaabTier = "Priority" | "Target" | "Speculative" | "Dart";

export type WaiverRec = {
  readonly player: Player;
  readonly score: number;
  readonly tier: FaabTier;
  readonly bidPct: number;
  readonly reason: string;
};

const TIER_PCT: Record<FaabTier, number> = { Priority: 0.34, Target: 0.18, Speculative: 0.07, Dart: 0.02 };

export function waiverTargets(universe: readonly Player[] = activePlayerPool()): WaiverRec[] {
  const rostered = rosteredIds(universe);
  const pool = universe.filter((p) => !rostered.has(p.id));
  const scored = pool.map((p) => ({ p, s: pickupScore(p) })).sort((a, b) => b.s - a.s);
  const max = scored[0]?.s ?? 1;

  return scored.map(({ p, s }) => {
    const ratio = s / max;
    const tier: FaabTier = ratio > 0.85 ? "Priority" : ratio > 0.62 ? "Target" : ratio > 0.42 ? "Speculative" : "Dart";
    const reason =
      p.trend === "up" && p.usage > 0.4 ? "Role and usage both trending up: the highest-conviction add."
      : p.trend === "up" ? "Ascending arrow; get ahead of the breakout."
      : p.injury !== "healthy" ? `Upside add gated by a ${p.injury} tag.`
      : p.usage > 0.45 ? "Standalone snaps now; matchup-proof flex."
      : "Ceiling stash for a second-half role.";
    return { player: p, score: Math.round(s), tier, bidPct: TIER_PCT[tier], reason };
  });
}

export function bidDollars(rec: WaiverRec, budget: number): number {
  return Math.max(1, Math.round(rec.bidPct * budget));
}

/** Weakest rostered players — drop candidates to clear a roster spot. */
export function dropCandidates(universe: readonly Player[] = activePlayerPool()): Player[] {
  const rostered = rosteredIds(universe);
  return universe.filter((p) => rostered.has(p.id))
    .sort((a, b) => (vor(a, universe) - vor(b, universe)) + (a.trend === "down" ? -10 : 0) - (b.trend === "down" ? -10 : 0))
    .slice(0, 4);
}
