/**
 * Lineup Optimizer — optimal start/sit with transparent reasoning.
 *
 * Fills QB·RB·RB·WR·WR·TE·FLEX to maximise projection, then explains each call:
 * the projection, the floor/ceiling band, and the LEVERAGE (how much you'd lose
 * by starting the next-best bench option instead). Pure functions, illustrative.
 */

import { PLAYERS, volatility, type Player, type Pos } from "./players";

export type Slot = "QB" | "RB" | "WR" | "TE" | "FLEX";
export const SLOTS: readonly Slot[] = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX"];
const FLEX_POS: Pos[] = ["RB", "WR", "TE"];

/** A curated illustrative "your team" drawn from the player universe. */
export const DEFAULT_ROSTER_IDS: readonly string[] = [
  "qb-silas-hart", "qb-bo-finnegan",
  "rb-marcus-vale", "rb-deon-pryce", "rb-cole-mathis", "rb-andre-soto",
  "wr-julian-roe", "wr-deshawn-kemp", "wr-tobias-frey", "wr-amari-stokes", "wr-cy-merritt",
  "te-rocco-vance", "te-marco-pell",
];

export type StartCall = {
  readonly slot: Slot;
  readonly player: Player;
  /** projection points lost if you started the next-best bench option instead. */
  readonly leverage: number;
  readonly verdict: "anchor" | "start" | "close";
};

export type Optimized = {
  readonly starters: readonly StartCall[];
  readonly bench: readonly Player[];
  readonly total: number;
  readonly floor: number;
  readonly ceiling: number;
};

export function rosterFromIds(ids: readonly string[]): Player[] {
  const set = new Set(ids);
  return PLAYERS.filter((p) => set.has(p.id));
}

export function optimize(roster: readonly Player[]): Optimized {
  const used = new Set<string>();
  const pick = (poss: Pos[]): Player | undefined =>
    roster
      .filter((p) => poss.includes(p.pos) && !used.has(p.id) && p.injury !== "out")
      .sort((a, b) => b.proj - a.proj)[0];

  const seated: { slot: Slot; player: Player }[] = [];
  for (const slot of SLOTS) {
    const poss = slot === "FLEX" ? FLEX_POS : [slot as Pos];
    const p = pick(poss);
    if (!p) continue;
    used.add(p.id);
    seated.push({ slot, player: p });
  }

  // leverage: for each starter, the gap to the best benched player eligible for its slot
  const benchPool = roster.filter((p) => !used.has(p.id) && p.injury !== "out");
  const starters: StartCall[] = seated.map(({ slot, player }) => {
    const poss = slot === "FLEX" ? FLEX_POS : [slot as Pos];
    const alt = benchPool.filter((p) => poss.includes(p.pos)).sort((a, b) => b.proj - a.proj)[0];
    const lev = alt ? Math.round(player.proj - alt.proj) : Math.round(player.proj);
    const verdict: StartCall["verdict"] = lev >= 60 ? "anchor" : lev >= 22 ? "start" : "close";
    return { slot, player, leverage: lev, verdict };
  });

  const bench = roster.filter((p) => !used.has(p.id)).sort((a, b) => b.proj - a.proj);
  const total = Math.round(starters.reduce((s, c) => s + c.player.proj, 0));
  const floor = Math.round(starters.reduce((s, c) => s + c.player.floor, 0));
  const ceiling = Math.round(starters.reduce((s, c) => s + c.player.ceiling, 0));
  return { starters, bench, total, floor, ceiling };
}

export function startReason(call: StartCall): string {
  const v = volatility(call.player);
  const band = v > 0.5 ? "boom/bust" : v > 0.3 ? "balanced" : "steady";
  if (call.verdict === "anchor") return `Anchor — ${call.leverage} pts clear of your bench; ${band}.`;
  if (call.verdict === "start") return `Start — ${call.leverage} pts over the next option; ${band}.`;
  return `Close call — only ${call.leverage} pts over the bench. Lean ${band === "steady" ? "for the floor" : "for the ceiling"}.`;
}
