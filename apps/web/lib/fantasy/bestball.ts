/**
 * Best Ball — draft-only roster-construction intelligence (glass-box, pure).
 *
 * Best ball has NO in-season management: you draft a deep roster and the optimal
 * lineup is auto-selected every week. So roster value tilts toward three axes the
 * season-long tools under-weight:
 *   1. CEILING / spike weeks  — the auto-lineup banks each player's best weeks.
 *   2. STACK correlation      — a QB's big week lifts his own pass-catchers.
 *   3. BYE / positional STRUCTURE — no waivers to patch a week you're thin.
 * This module scores those three axes and recommends the next pick, returning the
 * REASONS, not just a number.
 *
 * It reads the active `Player` shape — the illustrative pool by default, OR the
 * cleared live graded pool routed in via `activePlayerPool()`. It never fabricates
 * data; any derived draft rank is "market/usage rank", never scraped ADP. The QB
 * stack logic mirrors the DFS optimizer's (private) `qbStackCount` on the
 * season-long `Player` shape rather than importing it.
 */

import { PLAYERS, POSITIONS, vor, volatility, correlated, type Player, type Pos } from "./players";
import { valueVsAdp, type AdpValue } from "./draft";

/**
 * Underdog-style best ball: 18 roster spots; the weekly optimal lineup is
 * QB · RB · RB · WR · WR · WR · TE · FLEX(RB/WR/TE).
 */
export const BEST_BALL_ROSTER_SIZE = 18;
export const BEST_BALL_LINEUP: Record<Pos, number> = { QB: 1, RB: 2, WR: 3, TE: 1 };
export const BEST_BALL_FLEX = 1;
/** Target end-of-draft roster construction (the counts you draft toward). */
export const BEST_BALL_TARGETS: Record<Pos, number> = { QB: 2, RB: 5, WR: 8, TE: 2 };

// ── Roster strength (ceiling is the currency) ────────────────────────────────

export function rosterProjection(roster: readonly Player[]): number {
  return Math.round(roster.reduce((s, p) => s + p.proj, 0));
}

export function rosterCeiling(roster: readonly Player[]): number {
  return Math.round(roster.reduce((s, p) => s + p.ceiling, 0));
}

/** Upside above projection — best ball's currency (Σ max(0, ceiling − proj)). */
export function spikeScore(roster: readonly Player[]): number {
  return Math.round(roster.reduce((s, p) => s + Math.max(0, p.ceiling - p.proj), 0));
}

// ── Stacks (QB ↔ same-team pass-catcher correlation) ─────────────────────────

export type Stack = {
  readonly qb: Player;
  readonly catchers: readonly Player[];
  readonly size: number;
};

/** QB↔same-team WR/TE stacks on the roster — the correlation that wins best ball. */
export function stacks(roster: readonly Player[]): Stack[] {
  return roster
    .filter((p) => p.pos === "QB")
    .map((qb) => {
      const catchers = roster.filter((p) => (p.pos === "WR" || p.pos === "TE") && correlated(qb, p));
      return { qb, catchers, size: catchers.length };
    })
    .filter((s) => s.size > 0)
    .sort((a, b) => b.size - a.size);
}

/**
 * Stack score — convex in stack size, so a double-stack (QB + 2 catchers) is worth
 * more than two single stacks. Pure.
 */
export function stackScore(roster: readonly Player[]): number {
  return stacks(roster).reduce((s, st) => s + st.size * st.size, 0);
}

// ── Bye fragility (no waivers to cover a thin week) ───────────────────────────

export type ByeRisk = {
  readonly week: number;
  readonly pos: Pos;
  readonly rostered: number;
  readonly onBye: number;
  readonly available: number;
  readonly starters: number;
};

/**
 * Bye fragility — best ball can't stream a replacement, so a week where byes drop a
 * position below its lineup requirement is a dead slot. Flags each (week, pos) that
 * falls short and scores the total unfillable starter-slots. Pure.
 */
export function byeFragility(roster: readonly Player[]): { risks: ByeRisk[]; score: number } {
  const weeks = [...new Set(roster.map((p) => p.bye).filter((b) => b > 0))].sort((a, b) => a - b);
  const risks: ByeRisk[] = [];
  for (const week of weeks) {
    for (const pos of POSITIONS) {
      const rostered = roster.filter((p) => p.pos === pos).length;
      const onBye = roster.filter((p) => p.pos === pos && p.bye === week).length;
      const available = rostered - onBye;
      const starters = BEST_BALL_LINEUP[pos];
      if (onBye > 0 && available < starters) {
        risks.push({ week, pos, rostered, onBye, available, starters });
      }
    }
  }
  const score = risks.reduce((s, r) => s + (r.starters - r.available), 0);
  return { risks, score };
}

// ── Roster structure vs. targets ─────────────────────────────────────────────

export type StructureStatus = "short" | "on-target" | "heavy";
export type PositionStructure = {
  readonly pos: Pos;
  readonly have: number;
  readonly target: number;
  readonly status: StructureStatus;
};

export function rosterStructure(roster: readonly Player[]): PositionStructure[] {
  return POSITIONS.map((pos) => {
    const have = roster.filter((p) => p.pos === pos).length;
    const target = BEST_BALL_TARGETS[pos];
    const status: StructureStatus = have < target ? "short" : have > target ? "heavy" : "on-target";
    return { pos, have, target, status };
  });
}

/** Boost for positions still short of target; gentle taper once covered. */
function targetNeed(pos: Pos, roster: readonly Player[]): number {
  const have = roster.filter((p) => p.pos === pos).length;
  const target = BEST_BALL_TARGETS[pos];
  if (have >= target) return 0.7; // covered → depth/luxury
  return 1 + (target - have) * 0.16; // the further from target, the bigger the boost
}

// ── Next-pick recommendation (best-ball weighted) ────────────────────────────

export type BestBallRec = {
  readonly player: Player;
  readonly score: number;
  readonly reasons: readonly string[];
};

/**
 * "What this roster needs next" — scores every available player on VOR × target-need
 * × stack-building × spike upside × injury, tuned for best ball (ceiling and
 * correlation matter more than weekly floor). Returns the reasons. Pure.
 */
export function rosterNeedsNext(
  available: readonly Player[],
  roster: readonly Player[],
  limit = 6,
  universe: readonly Player[] = PLAYERS,
): BestBallRec[] {
  const qbTeams = new Set(roster.filter((p) => p.pos === "QB").map((p) => p.team));
  const catcherTeams = new Set(roster.filter((p) => p.pos === "WR" || p.pos === "TE").map((p) => p.team));

  const recs = available.map((player) => {
    const base = Math.max(8, vor(player, universe) + 40); // shift so depth picks stay positive
    const need = targetNeed(player.pos, roster);
    const buildsStack =
      ((player.pos === "WR" || player.pos === "TE") && qbTeams.has(player.team)) ||
      (player.pos === "QB" && catcherTeams.has(player.team));
    const stackBonus = buildsStack ? 1.18 : 1;
    const vol = volatility(player);
    const spikeBonus = 1 + vol * 0.2; // best ball rewards ceiling/variance
    const inj = player.injury === "out" ? 0.75 : player.injury === "questionable" ? 0.95 : 1;
    const score = base * need * stackBonus * spikeBonus * inj;

    const have = roster.filter((p) => p.pos === player.pos).length;
    const target = BEST_BALL_TARGETS[player.pos];
    const v = vor(player, universe);
    const reasons: string[] = [];
    if (have < target) reasons.push(`Adds to a thin ${player.pos} room (have ${have} of target ${target}).`);
    else reasons.push(`Depth/luxury — your ${player.pos} room is at target (${have}/${target}).`);
    if (buildsStack) reasons.push(`Builds a stack with your ${player.team} core — correlated spike weeks.`);
    reasons.push(`Value over replacement: ${v >= 0 ? "+" : ""}${v}.`);
    if (vol >= 0.5) reasons.push(`High-ceiling spike-week upside.`);
    if (player.injury !== "healthy") reasons.push(`Injury flag: ${player.injury}.`);

    return { player, score, reasons };
  });

  return recs.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── ADP overlay (legal path: user CSV, via the draft module) ─────────────────

/** Best-ball ADP value — thin wrapper over the draft module's user-CSV ADP compare. */
export function adpDeltaValue(player: Player, adp: Map<string, number>, currentPick: number): AdpValue {
  return valueVsAdp(player, adp, currentPick);
}

// ── Aggregate evaluation (for the board UI) ──────────────────────────────────

export type BestBallEvaluation = {
  readonly projection: number;
  readonly ceiling: number;
  readonly spike: number;
  readonly stackScore: number;
  readonly stacks: Stack[];
  readonly byeFragility: number;
  readonly byeRisks: ByeRisk[];
  readonly structure: PositionStructure[];
  readonly rosterSize: number;
  readonly full: boolean;
};

export function evaluateBestBallRoster(roster: readonly Player[]): BestBallEvaluation {
  const bf = byeFragility(roster);
  return {
    projection: rosterProjection(roster),
    ceiling: rosterCeiling(roster),
    spike: spikeScore(roster),
    stackScore: stackScore(roster),
    stacks: stacks(roster),
    byeFragility: bf.score,
    byeRisks: bf.risks,
    structure: rosterStructure(roster),
    rosterSize: roster.length,
    full: roster.length >= BEST_BALL_ROSTER_SIZE,
  };
}
