/**
 * Stack exposure — what our own portfolio actually bets on.
 *
 * WHY THIS EXISTS (wave4 intel, repos/nuke-dfs-hub): their portfolio analytics
 * report the structural bets a lineup set is really making — QB-anchored stack
 * rate, bring-back rate, and same-game concentration. GSE generated k-best
 * lineups and displayed them without ever answering "what am I actually exposed
 * to?" A 150-lineup portfolio that is 90% one QB is not diversified, it is one
 * bet with 150 receipts.
 *
 * Pure and glass-box: every metric is a count of what is in the lineups, and
 * the denominator travels with the number. Nothing is modelled here.
 *
 * HONESTY RULES:
 *  1. Every rate carries its denominator. A rate over zero lineups is `null`,
 *     not 0% — "no data" and "none happened" are different facts.
 *  2. Stack and bring-back are computed only over lineups that have a QB. A
 *     lineup without a QB is excluded from those rates and counted separately,
 *     so a DST-only or malformed lineup can never inflate a denominator.
 *  3. Same-game concentration is reported per lineup; we do not call a number
 *     "good" or "bad". Exposure is a fact about the portfolio, not a grade.
 */

import type { DfsPlayer } from "./dfs-slate";

/** Positions that count as pass-catchers for stack purposes. */
const CATCHERS = new Set(["WR", "TE"]);
/** Positions that count as bring-back candidates (any opposing skill player). */
const SKILL = new Set(["QB", "RB", "WR", "TE"]);

export type PlayerExposure = {
  readonly playerId: string;
  readonly name: string;
  readonly pos: string;
  readonly team: string;
  readonly count: number;
  /** Share of the portfolio, or null when the portfolio is empty. */
  readonly pct: number | null;
};

export type LineupStructure = {
  readonly index: number;
  readonly hasQb: boolean;
  readonly qbId: string | null;
  readonly qbTeam: string | null;
  /** Same-team pass-catchers stacked with the QB. */
  readonly stack: number;
  /** Opposing-team skill players (the classic bring-back). */
  readonly bringBack: number;
  /** Total players sharing the QB's game (team + opponent). */
  readonly sameGame: number;
};

export type StackReport = {
  readonly lineups: number;
  /** Lineups carrying a QB — the denominator for stack and bring-back. */
  readonly withQb: number;
  /** Share of QB lineups with at least one same-team pass-catcher. */
  readonly stackRate: number | null;
  /** Share of QB lineups bringing back at least one opposing skill player. */
  readonly bringBackRate: number | null;
  /** Mean stack size across QB lineups. */
  readonly meanStack: number | null;
  /** Largest stack observed, or null with no QB lineups. */
  readonly maxStack: number | null;
  /** Mean players sharing a game, across all lineups. */
  readonly meanSameGame: number | null;
  /** Largest single-game concentration observed. */
  readonly maxSameGame: number | null;
  readonly structure: readonly LineupStructure[];
  readonly note: string;
};

function pctOf(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

/** Structure of one lineup: what game, what stack, what bring-back. */
export function describeLineup(
  lineup: readonly DfsPlayer[],
  index: number,
): LineupStructure {
  const qb = lineup.find((p) => p.pos === "QB") ?? null;
  if (qb === null) {
    return {
      index,
      hasQb: false,
      qbId: null,
      qbTeam: null,
      stack: 0,
      bringBack: 0,
      sameGame: 0,
    };
  }
  const stack = lineup.filter((p) => p.team === qb.team && CATCHERS.has(p.pos)).length;
  const bringBack = lineup.filter(
    (p) => p.team === qb.opp && SKILL.has(p.pos) && p.id !== qb.id,
  ).length;
  // A player is in the QB's game if they are on either side of it.
  const sameGame = lineup.filter((p) => p.team === qb.team || p.team === qb.opp).length;
  return {
    index,
    hasQb: true,
    qbId: qb.id,
    qbTeam: qb.team,
    stack,
    bringBack,
    sameGame,
  };
}

/** Per-player exposure across a portfolio, most-exposed first. */
export function playerExposure(
  lineups: readonly (readonly DfsPlayer[])[],
): PlayerExposure[] {
  const seen = new Map<string, { p: DfsPlayer; count: number }>();
  for (const lu of lineups) {
    for (const p of lu) {
      const cur = seen.get(p.id);
      if (cur) cur.count += 1;
      else seen.set(p.id, { p, count: 1 });
    }
  }
  const n = lineups.length;
  return [...seen.values()]
    .map(({ p, count }) => ({
      playerId: p.id,
      name: p.name,
      pos: p.pos,
      team: p.team,
      count,
      pct: pctOf(count, n),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Structural summary of a generated portfolio. */
export function stackReport(lineups: readonly (readonly DfsPlayer[])[]): StackReport {
  const structure = lineups.map((lu, i) => describeLineup(lu, i));
  const qbRows = structure.filter((s) => s.hasQb);
  const withQb = qbRows.length;
  const stacked = qbRows.filter((s) => s.stack > 0).length;
  const broughtBack = qbRows.filter((s) => s.bringBack > 0).length;

  const meanOf = (xs: readonly number[]): number | null =>
    xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length;

  const stackSizes = qbRows.map((s) => s.stack);
  const sameGames = structure.map((s) => s.sameGame);

  const empty = structure.length === 0;
  const noQb = !empty && withQb === 0;

  return {
    lineups: structure.length,
    withQb,
    stackRate: pctOf(stacked, withQb),
    bringBackRate: pctOf(broughtBack, withQb),
    meanStack: meanOf(stackSizes),
    maxStack: stackSizes.length === 0 ? null : Math.max(...stackSizes),
    meanSameGame: meanOf(sameGames),
    maxSameGame: sameGames.length === 0 ? null : Math.max(...sameGames),
    structure,
    note: empty
      ? "No lineups supplied — every rate is null because the denominator is zero."
      : noQb
        ? `No lineup carries a QB (${structure.length} lineups): stack and bring-back rates are ` +
          `null, not zero, and those lineups are excluded from both denominators.`
        : `Stack/bring-back computed over ${withQb} of ${structure.length} lineups ` +
          `(${structure.length - withQb} without a QB excluded).`,
  };
}
