/**
 * The League Twin — your roster as a navigable galaxy.
 *
 * Every node ENCODES a real roster metric, not decoration:
 *   • core brightness  ← projection (how much it scores)
 *   • core size        ← usage/role weight (how central it is)
 *   • halo radius      ← volatility (the boom/bust band)
 *   • colour           ← position
 *   • eclipse ring     ← bye week (your blackout exposure)
 *   • shock pulse      ← injury / sharp trend (a live impact event)
 *   • orbital ties     ← same-team correlation (your stacks)
 * Nobody renders a fantasy roster as a physics galaxy. This is the data layer;
 * the WebGL view and the accessible manifest both read from it. Pure, illustrative.
 */

import { DEFAULT_ROSTER_IDS } from "./lineup";
import { PLAYERS, POS_HEX, vor, volatility, playerById, correlated, type Player, type Pos } from "./players";

export type Shock = "none" | "positive" | "caution" | "critical";

export type TwinNode = {
  readonly player: Player;
  /** 0..1 normalized across the roster */
  readonly brightness: number;
  readonly size: number;
  readonly halo: number;
  readonly hex: string;
  readonly pos: Pos;
  readonly vor: number;
  /** bye blackout this illustrative week */
  readonly eclipsed: boolean;
  readonly shock: Shock;
  readonly shockNote: string;
  /** layout in the galaxy plane */
  readonly angle: number;
  readonly radius: number;
};

export type TwinTie = { readonly a: string; readonly b: string; readonly team: string };

export type LeagueTwin = {
  readonly illustrative: true;
  readonly currentWeek: number;
  readonly nodes: readonly TwinNode[];
  readonly ties: readonly TwinTie[];
  readonly totalProj: number;
  readonly byeExposure: number; // nodes eclipsed this week
  readonly riskCount: number; // nodes carrying a shock
  readonly stackCount: number;
};

const POS_BAND: Record<Pos, number> = { QB: 3.4, RB: 6.2, WR: 8.6, TE: 5.0 };

function shockFor(p: Player): { shock: Shock; note: string } {
  if (p.injury === "out") return { shock: "critical", note: "Ruled out — a dark star this week; cover the hole." };
  if (p.injury === "questionable") return { shock: "caution", note: "Questionable tag — queue a contingency before lock-time." };
  if (p.trend === "down") return { shock: "caution", note: "Role trending down — usage is leaking elsewhere." };
  if (p.trend === "up") return { shock: "positive", note: "Ascending — brightness climbing week over week." };
  return { shock: "none", note: "Stable." };
}

export function buildLeagueTwin(rosterIds: readonly string[] = DEFAULT_ROSTER_IDS): LeagueTwin {
  const roster = rosterIds.map(playerById).filter((p): p is Player => Boolean(p));

  const projs = roster.map((p) => p.proj);
  const maxProj = Math.max(...projs, 1);
  const minProj = Math.min(...projs, 0);
  const span = Math.max(1, maxProj - minProj);

  // Current week = the bye your roster is MOST exposed to (the eclipse that matters).
  const byeCounts = new Map<number, number>();
  for (const p of roster) byeCounts.set(p.bye, (byeCounts.get(p.bye) ?? 0) + 1);
  const currentWeek = [...byeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? roster[0]?.bye ?? 1;

  // position counters for even angular spacing within each band
  const posIndex = new Map<Pos, number>();
  const posTotal = new Map<Pos, number>();
  for (const p of roster) posTotal.set(p.pos, (posTotal.get(p.pos) ?? 0) + 1);

  const nodes: TwinNode[] = roster.map((player) => {
    const i = posIndex.get(player.pos) ?? 0;
    posIndex.set(player.pos, i + 1);
    const total = posTotal.get(player.pos) ?? 1;
    const { shock, note } = shockFor(player);
    const angle = (i / total) * Math.PI * 2 + POS_BAND[player.pos];
    return {
      player,
      brightness: (player.proj - minProj) / span,
      size: Math.max(0.2, Math.min(1, player.usage)),
      halo: volatility(player),
      hex: POS_HEX[player.pos],
      pos: player.pos,
      vor: vor(player),
      eclipsed: player.bye === currentWeek,
      shock,
      shockNote: note,
      angle,
      radius: POS_BAND[player.pos],
    };
  });

  // same-team correlation ties (your stacks)
  const ties: TwinTie[] = [];
  for (let i = 0; i < roster.length; i++) {
    for (let j = i + 1; j < roster.length; j++) {
      if (correlated(roster[i]!, roster[j]!)) ties.push({ a: roster[i]!.id, b: roster[j]!.id, team: roster[i]!.team });
    }
  }

  return {
    illustrative: true,
    currentWeek,
    nodes,
    ties,
    totalProj: Math.round(roster.reduce((s, p) => s + p.proj, 0)),
    byeExposure: nodes.filter((n) => n.eclipsed).length,
    riskCount: nodes.filter((n) => n.shock === "caution" || n.shock === "critical").length,
    stackCount: ties.length,
  };
}

export const SHOCK_HEX: Record<Shock, string> = {
  none: "#7b8794",
  positive: "#00E5FF",
  caution: "#E0A800",
  critical: "#FF2DD6",
};

export { PLAYERS };
