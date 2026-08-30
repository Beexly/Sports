/**
 * Opponent-adjusted team efficiency (a DVOA/SRS-family rating, our recipe).
 *
 * Raw per-game efficiency (e.g. EPA/play) is misleading because schedules differ.
 * This nets out opponent strength with the standard iterative adjustment: a
 * team's adjusted offense is its raw output minus the opponent defense's
 * contribution (relative to league average), and vice-versa for defense. We
 * iterate offense↔defense to convergence. Open methodology over public
 * play-by-play — no tracking, no charting, no licensed inputs.
 *
 * Convention: `offValue` higher = better offense; `defValue` is efficiency
 * ALLOWED, so lower = better defense. `overall = adjOff − adjDef`.
 */

export interface TeamGameEfficiency {
  readonly team: string;
  readonly opponent: string;
  readonly offValue: number; // team's offensive efficiency this game (e.g. EPA/play)
  readonly defValue: number; // efficiency the team ALLOWED this game (lower = better D)
}

export interface TeamRating {
  readonly team: string;
  readonly games: number;
  readonly rawOff: number;
  readonly rawDef: number;
  readonly adjOff: number; // opponent-adjusted offense (higher = better)
  readonly adjDef: number; // opponent-adjusted defense allowed (lower = better)
  readonly overall: number; // adjOff − adjDef (net efficiency vs an average schedule)
}

export interface OpponentAdjustOptions {
  readonly iterations?: number; // default 25 (well past convergence for a season)
}

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

export function opponentAdjustedRatings(
  games: readonly TeamGameEfficiency[],
  options: OpponentAdjustOptions = {},
): TeamRating[] {
  const iterations = options.iterations ?? 25;
  if (games.length === 0) return [];

  const leagueOff = mean(games.map((g) => g.offValue));
  const leagueDef = mean(games.map((g) => g.defValue));

  // Per-team game lists.
  const teams = new Set<string>();
  const byTeam = new Map<string, TeamGameEfficiency[]>();
  for (const g of games) {
    teams.add(g.team);
    const list = byTeam.get(g.team) ?? [];
    list.push(g);
    byTeam.set(g.team, list);
  }

  const adjOff = new Map<string, number>();
  const adjDef = new Map<string, number>();
  for (const t of teams) {
    const gs = byTeam.get(t)!;
    adjOff.set(t, mean(gs.map((g) => g.offValue)));
    adjDef.set(t, mean(gs.map((g) => g.defValue)));
  }

  for (let i = 0; i < iterations; i++) {
    const nextOff = new Map<string, number>();
    const nextDef = new Map<string, number>();
    for (const t of teams) {
      const gs = byTeam.get(t)!;
      // Remove the opponent defense's contribution (relative to average) from raw offense.
      nextOff.set(
        t,
        mean(gs.map((g) => g.offValue - ((adjDef.get(g.opponent) ?? leagueDef) - leagueDef))),
      );
      // Remove the opponent offense's contribution from raw defense allowed.
      nextDef.set(
        t,
        mean(gs.map((g) => g.defValue - ((adjOff.get(g.opponent) ?? leagueOff) - leagueOff))),
      );
    }
    for (const t of teams) {
      adjOff.set(t, nextOff.get(t)!);
      adjDef.set(t, nextDef.get(t)!);
    }
  }

  return [...teams]
    .map((t) => {
      const gs = byTeam.get(t)!;
      const ao = adjOff.get(t)!;
      const ad = adjDef.get(t)!;
      return {
        team: t,
        games: gs.length,
        rawOff: round3(mean(gs.map((g) => g.offValue))),
        rawDef: round3(mean(gs.map((g) => g.defValue))),
        adjOff: round3(ao),
        adjDef: round3(ad),
        overall: round3(ao - ad),
      };
    })
    .sort((a, b) => b.overall - a.overall);
}
