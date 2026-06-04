/**
 * Draft Assistant — a transparent (glass-box) pick-recommendation engine.
 *
 * Given who's on your roster and who's available, it scores every available
 * player on a blend of: value over replacement, your positional need, tier-cliff
 * scarcity, bye-week stacking risk, injury, and trend — and returns the reasons,
 * not just a number. Pure functions; illustrative data.
 */

import { POSITIONS, vor, tier, byPosition, type Player, type Pos } from "./players";

/** Standard 1-QB, 2-RB, 2-WR, 1-TE, 1-FLEX starting requirements. */
export const STARTERS: Record<Pos, number> = { QB: 1, RB: 2, WR: 2, TE: 1 };
const FLEX_FROM: Pos[] = ["RB", "WR", "TE"];

export type RosterNeed = { pos: Pos; have: number; need: number; starters: number };

export function rosterNeeds(roster: readonly Player[]): RosterNeed[] {
  return POSITIONS.map((pos) => {
    const have = roster.filter((p) => p.pos === pos).length;
    return { pos, have, need: Math.max(0, STARTERS[pos] - have), starters: STARTERS[pos] };
  });
}

/** Does this roster still owe a FLEX (one extra RB/WR/TE beyond the base starters)? */
function flexUnfilled(roster: readonly Player[]): boolean {
  const surplus = FLEX_FROM.reduce((s, pos) => s + Math.max(0, roster.filter((p) => p.pos === pos).length - STARTERS[pos]), 0);
  return surplus < 1;
}

function needMultiplier(pos: Pos, roster: readonly Player[]): number {
  const have = roster.filter((p) => p.pos === pos).length;
  const req = STARTERS[pos];
  if (have < req) return 1 + (req - have) * 0.28; // short of starters → boost
  if ((pos === "QB" || pos === "TE") && have >= 1) return 0.62; // one is enough early
  if (flexUnfilled(roster) && FLEX_FROM.includes(pos)) return 1.08; // FLEX still open
  return 0.86; // depth pick
}

/** Is this the last player in their position-tier among the available pool? (a cliff) */
function isTierCliff(player: Player, available: readonly Player[]): boolean {
  const samePos = available.filter((p) => p.pos === player.pos).sort((a, b) => vor(b) - vor(a));
  const idx = samePos.findIndex((p) => p.id === player.id);
  const next = samePos[idx + 1];
  return !next || tier(next) > tier(player);
}

function byeStackRisk(player: Player, roster: readonly Player[]): number {
  const sameBye = roster.filter((p) => p.bye === player.bye && (STARTERS[p.pos] ?? 0) > 0).length;
  return sameBye; // 0,1,2…
}

export type PickRec = {
  readonly player: Player;
  readonly score: number;
  readonly reasons: readonly string[];
};

export function recommend(available: readonly Player[], roster: readonly Player[], limit = 6): PickRec[] {
  const recs = available.map((player) => {
    const base = Math.max(8, vor(player) + 40); // shift so depth picks stay positive
    const need = needMultiplier(player.pos, roster);
    const cliff = isTierCliff(player, available) ? 1.22 : 1;
    const byeN = byeStackRisk(player, roster);
    const byePenalty = byeN >= 2 ? 0.86 : 1;
    const inj = player.injury === "out" ? 0.7 : player.injury === "questionable" ? 0.93 : 1;
    const trend = player.trend === "up" ? 1.05 : player.trend === "down" ? 0.95 : 1;
    const score = base * need * cliff * byePenalty * inj * trend;

    const reasons: string[] = [];
    const v = vor(player);
    if (need >= 1.2) reasons.push(`Fills your biggest need at ${player.pos}.`);
    else if (need <= 0.7) reasons.push(`Depth/luxury — you've covered ${player.pos}.`);
    if (cliff > 1) reasons.push(`Last player in Tier ${tier(player)} at ${player.pos} — a cliff after this.`);
    reasons.push(`Value over replacement: ${v >= 0 ? "+" : ""}${v}.`);
    if (byeN >= 2) reasons.push(`Bye stack risk — you'd have ${byeN + 1} starters on Week ${player.bye}.`);
    if (player.injury !== "healthy") reasons.push(`Injury flag: ${player.injury}.`);
    if (player.trend !== "flat") reasons.push(`Trend ${player.trend === "up" ? "↑" : "↓"} — ${player.role}.`);

    return { player, score, reasons };
  });

  return recs.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** A board snapshot grouped by position with tiers — for the draft UI. */
export function boardByPosition(taken: ReadonlySet<string>): Record<Pos, Player[]> {
  const out = {} as Record<Pos, Player[]>;
  for (const pos of POSITIONS) out[pos] = byPosition(pos).filter((p) => !taken.has(p.id));
  return out;
}
