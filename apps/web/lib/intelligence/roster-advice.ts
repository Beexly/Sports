/**
 * Roster advice — turning the Player Intelligence model into decisions.
 *
 * The model (player-model.ts) grades every real player on process vs production.
 * This layer converts those grades into ACTIONS: who to add (high process,
 * buy-low, not already rostered), who to drop (low process / sell-high among the
 * players you hold), and how to read each player you already own. Join is by
 * normalized name so it composes directly with a synced Sleeper roster — real
 * roster + real grades → real, data-driven advice.
 *
 * Pure functions over the model's profiles — no I/O, fully testable. It moves
 * decisions, it doesn't invent data: every call carries the process grade and
 * the reason behind it.
 */

import type { PlayerProfile, ProcessSignal } from "./player-model";
import { normName } from "./qb-consensus";

export type RosterRead = "ride" | "sell-high" | "hold" | "buy-more";

export interface AddTarget {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly processGrade: number;
  readonly productionPct: number;
  readonly signal: ProcessSignal;
  readonly addScore: number;
  readonly reason: string;
}

export interface DropCandidate {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly processGrade: number;
  readonly signal: ProcessSignal;
  readonly reason: string;
}

export interface RosterPlayerRead {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly processGrade: number;
  readonly read: RosterRead;
  readonly reason: string;
}

const SIGNAL_BONUS: Record<ProcessSignal, number> = { "buy-low": 15, "in-line": 0, "sell-high": -12 };

/** A waiver/add value for a profile: process grade nudged by the buy/sell signal. */
export function addScore(p: PlayerProfile): number {
  return Math.round(p.processGrade + SIGNAL_BONUS[p.signal]);
}

/**
 * Top add targets: the highest-value available players the model likes, with
 * buy-lows surfaced first. `rostered` names (any format) are excluded by
 * normalized match so a synced roster's own players never show as adds.
 */
export function addTargets(
  profiles: readonly PlayerProfile[],
  { rostered = [], limit = 12, position }: { rostered?: readonly string[]; limit?: number; position?: string } = {},
): AddTarget[] {
  const owned = new Set(rostered.map(normName));
  return profiles
    .filter((p) => !owned.has(normName(p.name)) && (!position || p.position === position))
    .map((p): AddTarget => ({
      name: p.name,
      team: p.team,
      position: p.position,
      processGrade: p.processGrade,
      productionPct: p.productionPct,
      signal: p.signal,
      addScore: addScore(p),
      reason:
        p.signal === "buy-low"
          ? `Process grade ${p.processGrade} vs production ${p.productionPct} — the inputs say more is coming. Add before the room catches on.`
          : `Process grade ${p.processGrade}${p.signal === "sell-high" ? " — productive but running hot; add only if you need the floor now." : " — earned, startable role."}`,
    }))
    .sort((a, b) => b.addScore - a.addScore)
    .slice(0, limit);
}

/**
 * Drop candidates among the players you ROSTER: the weakest process grades,
 * with sell-highs (production over process) flagged for trade value first.
 */
export function dropCandidates(
  profiles: readonly PlayerProfile[],
  rostered: readonly string[],
  { limit = 6 }: { limit?: number } = {},
): DropCandidate[] {
  const owned = new Set(rostered.map(normName));
  return profiles
    .filter((p) => owned.has(normName(p.name)))
    .map((p): DropCandidate => ({
      name: p.name,
      team: p.team,
      position: p.position,
      processGrade: p.processGrade,
      signal: p.signal,
      reason:
        p.signal === "sell-high"
          ? `Production is outrunning a ${p.processGrade} process grade — sell the name while the value is high.`
          : `Weak process grade (${p.processGrade}) — a cut/upgrade candidate if you need the roster spot.`,
    }))
    // weakest first; sell-high gets a small nudge up the drop/trade list
    .sort((a, b) => (a.processGrade - SIGNAL_BONUS[a.signal] * -1) - (b.processGrade - SIGNAL_BONUS[b.signal] * -1))
    .slice(0, limit);
}

/** How to read each player you already roster. */
export function classifyRoster(profiles: readonly PlayerProfile[], rostered: readonly string[]): RosterPlayerRead[] {
  const byName = new Map(profiles.map((p) => [normName(p.name), p]));
  return rostered
    .map((raw): RosterPlayerRead | null => {
      const p = byName.get(normName(raw));
      if (!p) return null;
      const read: RosterRead =
        p.signal === "buy-low" ? "buy-more" : p.signal === "sell-high" ? "sell-high" : p.processGrade >= 55 ? "ride" : "hold";
      const reason =
        read === "buy-more" ? "Underowned relative to his process — buy more / start with confidence."
        : read === "sell-high" ? "Hot relative to his process — explore selling at peak value."
        : read === "ride" ? "Process and production aligned and strong — ride it."
        : "Fringe process grade — hold, but be ready to upgrade.";
      return { name: p.name, team: p.team, position: p.position, processGrade: p.processGrade, read, reason };
    })
    .filter((r): r is RosterPlayerRead => r !== null);
}
