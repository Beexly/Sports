/**
 * Adapters — one signal read, every surface.
 *
 * The spine answers "what does the world say about this player". These functions
 * translate that one answer into the shape each consumer already speaks, so the
 * DFS optimizer, the waiver board, the trade calculator, the weekly rankings and
 * the props engine all move in the same direction off the same fact instead of
 * four different directions off four different readings.
 *
 * Nothing here re-derives a signal. If a surface disagrees with another surface,
 * it is because their objectives differ, never because their inputs did.
 *
 * SCALE. `SignalRead.delta` is signed PER-GAME points. Per-game surfaces add it.
 * Season-long surfaces (draft, trade, waivers operate on season projections) use
 * `multiplier`, which is the same information expressed proportionally, so a
 * +3 point weekly boost does not become +3 points on a 280-point season line.
 */

import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";
import type { Player } from "@/lib/fantasy/players";
import type { Prop } from "@/lib/fantasy/props";
import {
  readSignals,
  type SignalContext,
  type SignalPos,
  type SignalRead,
  type SignalSubject,
} from "./spine";

const clampPos = (p: string): SignalPos =>
  p === "QB" || p === "RB" || p === "WR" || p === "TE" || p === "DST" || p === "K" ? p : "WR";

/* ------------------------------------------------------------------ *
 * DFS (per-game)                                                      *
 * ------------------------------------------------------------------ */

export const dfsSubject = (p: DfsPlayer): SignalSubject => ({
  name: p.name,
  pos: clampPos(p.pos),
  team: p.team,
  opp: p.opp,
});

/**
 * The penalty function `optimizeOne` and `generateLineups` already accept.
 *
 * The optimizer computes `objVal(p) - pen(p)`, so a NEGATIVE penalty is a boost.
 * Bidirectional signals therefore need no change to the solver at all: returning
 * `-delta` suppresses when delta is negative and promotes when it is positive.
 *
 * `ownershipAware` additionally cancels the contrarian credit `leverage` mode
 * grants. That is the L-1 rule from docs/dfs/LESSONS.md: low ownership is only
 * edge in a CLEAN environment.
 *
 * The clause fires on the PRESENCE and SIZE of negative effects, not on the net
 * read, and that distinction is the whole lesson. DK Metcalf on 2026-09-20 had a
 * genuine role upgrade (Pittman out, opposing CB1 out) against a genuinely bad
 * environment (Pittsburgh implied 18.0). Those nearly cancel, so a net-based
 * rule would have called his environment clean and handed him the full credit
 * for 1.3% ownership — rebuilding the exact lineup that lost. An environment
 * with a real suppressor in it is not clean just because something good is also
 * happening.
 *
 * Boosts are never inflated by low ownership, only protected from the clawback.
 */
export function dfsPenalty(
  ctx: SignalContext,
  opts: { readonly ownershipAware?: boolean; readonly leverageCredit?: (p: DfsPlayer) => number } = {},
): (p: DfsPlayer) => number {
  return (p: DfsPlayer): number => {
    const read = readSignals(dfsSubject(p), ctx);
    if (!read.effects.length) return 0;
    let pen = -read.delta; // negative delta -> positive penalty; positive delta -> boost
    if (opts.ownershipAware && opts.leverageCredit) {
      const drag = read.effects.reduce((s, e) => s + (e.weight < 0 ? -e.weight : 0), 0);
      if (drag > 0) pen += opts.leverageCredit(p) * Math.min(1, drag / 8);
    }
    return pen;
  };
}

/** A DFS player with the world folded into his projection band. */
export function applyToDfs(p: DfsPlayer, ctx: SignalContext): DfsPlayer {
  const read = readSignals(dfsSubject(p), ctx);
  if (!read.effects.length) return p;
  const proj = Math.max(0, p.proj + read.delta);
  return {
    ...p,
    proj,
    floor: Math.max(0, p.floor + read.delta * 0.8),
    // A boost widens the ceiling more than the floor; a suppression closes it.
    ceiling: Math.max(0, p.ceiling + read.delta * 1.25),
  };
}

/* ------------------------------------------------------------------ *
 * Season-long fantasy (draft, trade, waivers, rankings)               *
 * ------------------------------------------------------------------ */

/**
 * Season-long subjects have no fixed opponent, so game-environment effects do
 * not fire for them. What DOES carry across is usage: vacated share, airwave
 * consensus and thin-sample confidence are all season-relevant, and those are
 * exactly the signals that should move a waiver claim or a trade value.
 *
 * Pass `opp` explicitly when evaluating a specific week.
 */
export const fantasySubject = (p: Player, opp?: string): SignalSubject => ({
  name: p.name,
  pos: clampPos(p.pos),
  team: p.team,
  opp,
});

/** A season-long player with the world folded in, proportionally. */
export function applyToFantasy(p: Player, ctx: SignalContext, opp?: string): Player {
  const read = readSignals(fantasySubject(p, opp), ctx);
  if (!read.effects.length) return p;
  const m = read.multiplier;
  return {
    ...p,
    proj: Math.max(0, p.proj * m),
    floor: Math.max(0, p.floor * m),
    ceiling: Math.max(0, p.ceiling * m),
    // Vacated usage is a usage fact, so it moves the usage field directly.
    usage: Math.min(1, Math.max(0, p.usage * m)),
  };
}

/** Signal-adjusted view of a whole pool. Surfaces that rank call this first. */
export const applyToPool = (pool: readonly Player[], ctx: SignalContext, opp?: string): readonly Player[] =>
  pool.map((p) => applyToFantasy(p, ctx, opp));

/* ------------------------------------------------------------------ *
 * Props                                                               *
 * ------------------------------------------------------------------ */

/**
 * Props consume the read as a MEAN SHIFT, not a points delta, because a prop is
 * already a distribution over one stat rather than a fantasy score.
 *
 * The shift is proportional and damped: a signal worth +3 fantasy points is not
 * worth +3 receiving yards, and the same news moves a 60-yard line and a 4.5
 * reception line by very different absolute amounts. Sigma widens with the size
 * of the adjustment, because a projection we have just moved is a projection we
 * are less certain about — a shift that narrowed the distribution would make the
 * engine more confident precisely when it has least right to be.
 */
export function applyToProp(prop: Prop, ctx: SignalContext, opp?: string, pos: SignalPos = "WR"): Prop {
  const read = readSignals({ name: prop.player, pos, team: prop.team, opp }, ctx);
  if (!read.effects.length) return prop;
  const pct = read.multiplier - 1; // signed proportional move
  const mean = Math.max(0, prop.mean * (1 + pct * 0.6));
  const sigma = prop.sigma * (1 + Math.abs(pct) * 0.25);
  return { ...prop, mean, sigma };
}

/* ------------------------------------------------------------------ *
 * Shared read, for surfaces that want the reasons rather than a number *
 * ------------------------------------------------------------------ */

export const readFor = (s: SignalSubject, ctx: SignalContext): SignalRead => readSignals(s, ctx);
